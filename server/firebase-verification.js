// Firebase's documented RS256 checks, using the existing JWT library.
// No service-account private key is needed; only Google's fixed public certificate URL is fetched.
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { normalizeEmail } = require('./security-config');
const CERTIFICATE_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
// Firebase and the local server may differ by a few seconds at sign-in.
const CLOCK_SKEW_SECONDS = 30;
function failure(message, status = 401) { const error = new Error(message); error.status = status; return error; }
async function fetchCertificates() {
    const response = await fetch(CERTIFICATE_URL, { signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!response.ok) throw new Error('Certificate service unavailable');
    const content = await response.text();
    if (content.length > 100000) throw new Error('Invalid certificate response');
    const certificates = JSON.parse(content);
    const maxAge = Number(/(?:^|,)\s*max-age=(\d+)/i.exec(response.headers.get('cache-control') || '')?.[1] || 300);
    return { certificates, maxAge };
}
function createFirebaseVerifier({ projectId = process.env.FIREBASE_PROJECT_ID || 'health-intel-2a0ed', getCertificates = fetchCertificates, now = Date.now } = {}) {
    if (!/^[a-z][a-z0-9-]{4,62}$/.test(projectId)) throw new Error('Invalid Firebase project ID configuration.');
    let keys = new Map(), expires = 0, retryAfter = 0, refreshing;
    async function refresh() {
        if (refreshing) return refreshing;
        if (now() < retryAfter) throw failure('Google verification is temporarily unavailable. Please try again shortly.', 503);
        retryAfter = now() + 5000;
        refreshing = (async () => {
            try {
                const { certificates, maxAge } = await getCertificates();
                if (!certificates || Array.isArray(certificates) || Object.keys(certificates).length === 0 || Object.keys(certificates).length > 20) throw new Error('Invalid certificates');
                const next = new Map();
                for (const [kid, pem] of Object.entries(certificates)) {
                    if (typeof pem !== 'string' || pem.length > 16000) throw new Error('Invalid certificate');
                    const key = crypto.createPublicKey(pem);
                    if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) throw new Error('Invalid signing key');
                    next.set(kid, key);
                }
                keys = next;
                expires = now() + Math.max(1, Math.min(Number.isFinite(maxAge) ? maxAge : 300, 86400)) * 1000;
            } catch {
                console.warn('Firebase verification unavailable: public certificates could not be loaded.');
                throw failure('Google verification is temporarily unavailable. Please try again shortly.', 503);
            }
        })();
        try { await refreshing; } finally { refreshing = null; }
    }
    return async function verify(token, submittedEmail) {
        const denied = reason => {
            console.warn('Firebase verification rejected:', reason);
            return failure('Google verification failed or expired. Sign in with Google again before registering.');
        };
        if (typeof token !== 'string' || token.length > 8192) throw denied('missing_or_oversized_token');
        let decoded;
        try { decoded = jwt.decode(token, { complete: true }); } catch { throw denied('unreadable_token'); }
        if (!decoded || decoded.header.alg !== 'RS256' || typeof decoded.header.kid !== 'string' || !decoded.header.kid || decoded.header.kid.length > 128) throw denied('unexpected_token_header');
        if (now() >= expires) await refresh();
        // Refresh on key rotation, but unknown key IDs cannot generate unlimited outgoing requests.
        if (!keys.has(decoded.header.kid) && now() >= retryAfter) await refresh();
        const key = keys.get(decoded.header.kid);
        if (!key) throw denied('unknown_signing_key');
        let claims;
        try { claims = jwt.verify(token, key, { algorithms: ['RS256'], audience: projectId, issuer: 'https://securetoken.google.com/' + projectId, clockTimestamp: Math.floor(now() / 1000) }); }
        catch (error) { throw denied('signature_or_project_claim_' + error.name); }
        const time = Math.floor(now() / 1000);
        const email = normalizeEmail(claims.email);
        if (claims.aud !== projectId || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) throw denied('project_or_subject_claim');
        if (!Number.isInteger(claims.exp) || claims.exp <= time || !Number.isInteger(claims.iat) || claims.iat > time + CLOCK_SKEW_SECONDS || claims.iat < 0 ||
            !Number.isInteger(claims.auth_time) || claims.auth_time > time + CLOCK_SKEW_SECONDS || claims.auth_time < 0 || claims.auth_time > claims.iat) throw denied('token_time_claim');
        if (claims.email_verified !== true) throw denied('email_not_verified');
        if (claims.firebase?.sign_in_provider !== 'google.com') throw denied('unexpected_sign_in_provider');
        if (!email || email !== normalizeEmail(submittedEmail)) throw denied('email_mismatch');
        return { uid: claims.sub, email };
    };
}
module.exports = { createFirebaseVerifier, CERTIFICATE_URL, fetchCertificates };
