const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { sessionVersion } = require('../config/security-config');
const { revokeAccountSessions, tokenHash } = require('./session-security');
const { createSystemAudit } = require('./system-audit');

// Called only AFTER password/status verification, inside the user-row transaction.
async function singleSessionLogin(connection, user, secret, sessions, request) {
    const epoch = await sessions.epoch(connection, user.system_id);
    const version = sessionVersion(user.password_hash, secret);
    const saved = await sessions.active(connection, user.system_id);
    const active = saved && Number(saved.session_epoch) === epoch && saved.password_version === version ? saved : null;
    const audit = createSystemAudit(connection);
    const metadata = summary => ({summary, target_type:'Account', target_id:user.system_id, outcome:'Succeeded'});
    const bearer = /^Bearer ([^\s]{1,8192})$/i.exec(request.get('Authorization') || '')?.[1];
    if (active && bearer && tokenHash(bearer) === active.token_hash) {
        await audit.record(user, 'Login Succeeded', metadata(`Continued the existing browser session for ${user.system_id}.`));
        return {status:200, body:{success:true, token:bearer, role:user.role, system_id:user.system_id, redirect:`/${user.role}.html`}};
    }
    if (active) {
        let consent;
        if (request.body.replace_existing === true && typeof request.body.takeover_token === 'string' && request.body.takeover_token.length <= 4096) {
            try {
                consent = jwt.verify(request.body.takeover_token, secret, {algorithms:['HS256'], audience:'health-intel-session-takeover'});
            } catch { /* Expired/invalid consent must never end an existing session. */ }
        }
        const confirmed = consent?.purpose === 'session-takeover' && consent.system_id === user.system_id &&
            consent.session_epoch === epoch && consent.active_hash === active.token_hash && consent.password_version === version;
        if (!confirmed) {
            const challenge = jwt.sign({purpose:'session-takeover', system_id:user.system_id, session_epoch:epoch,
                active_hash:active.token_hash, password_version:version, nonce:crypto.randomUUID()}, secret,
                {algorithm:'HS256', expiresIn:'2m', audience:'health-intel-session-takeover'});
            await audit.record(user, 'Concurrent Sign-in Detected', metadata('Verified credentials; another browser session is active. Replacement requires confirmation.'));
            return {status:409, body:{success:false, code:'SESSION_CONFLICT',
                error:'This account is already signed in elsewhere. Continuing will sign out the previous session. Unsaved entries there may be lost.', takeover_token:challenge}};
        }
    } else if (request.body.replace_existing === true) {
        // The consent referred to a session which ended or changed. Start afresh;
        // never silently create a new login from stale confirmation.
        return {status:409, body:{success:false, code:'SESSION_CHANGED', error:'The other session has changed or ended. Please sign in again.'}};
    }
    // Also retire older, untracked tokens issued before this protection existed.
    await revokeAccountSessions(connection, user.system_id);
    const nextEpoch = await sessions.epoch(connection, user.system_id);
    const token = jwt.sign({system_id:user.system_id, role:user.role, jti:crypto.randomUUID(),
        session_mode:'single', session_epoch:nextEpoch, password_version:version}, secret, {expiresIn:'8h', algorithm:'HS256'});
    await sessions.setActive(connection, user.system_id, token, nextEpoch, version, jwt.decode(token).exp);
    if (active) await audit.record(user, 'Session Replaced', metadata('Confirmed sign-in replaced the previous browser session; previous credentials can no longer authorize new requests.'));
    await audit.record(user, 'Login Succeeded', metadata(`Signed in as ${user.system_id}.`));
    return {status:200, body:{success:true, token, role:user.role, system_id:user.system_id, redirect:`/${user.role}.html`}};
}
module.exports = { singleSessionLogin };
