const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { sessionVersion } = require('./security-config');

const publicEndpoints = new Set([
    'POST /login', 'POST /register', 'POST /get-next-id', 'POST /check-email',
    'POST /forgot-password', 'POST /reset-password'
]);
const rules = [
    ['GET', /^\/session$/, ['bhw', 'mho', 'admin', 'superadmin']],
    ['POST', /^\/change-password$/, ['bhw', 'mho', 'admin', 'superadmin']],
    ['GET', /^\/admin\/(pending-users|active-users|denied-users|audit-logs)$/, ['admin', 'superadmin']],
    ['POST', /^\/admin\/(approve-user|deny-user|undo-deny|suspend-user|restore-suspended)$/, ['admin', 'superadmin']],
    ['GET', /^\/superadmin\/(pending-admins|health|users|audit-logs)$/, ['superadmin']],
    ['POST', /^\/superadmin\/(approve-admin|backup)$/, ['superadmin']],
    ['GET', /^\/bhw\/context$/, ['bhw']],
    ['GET', /^\/bhw\/(encoding-options|puroks)$/, ['bhw']],
    ['GET', /^\/mho\/walk-in-(options|cases)$/, ['mho']],
    ['POST', /^\/mho\/walk-in-cases$/, ['mho']],
    ['GET', /^\/(patients(?:\/archived)?|residents(?:\/\d+\/dossier)?|bhw-trend|bhw-stats)$/, ['bhw', 'admin']],
    ['POST', /^\/patients$/, ['bhw']],
    ['PUT', /^\/patients\/\d+\/status$/, ['bhw']],
    ['GET', /^\/patients\/\d+\/correction$/, ['bhw', 'admin']],
    ['PUT', /^\/patients\/\d+\/correction$/, ['bhw', 'admin']],
    ['PUT', /^\/patients\/\d+\/(archive|restore)$/, ['bhw', 'admin']],
    ['GET', /^\/heatmap-data$/, ['bhw', 'mho', 'admin']],
    ['GET', /^\/diseases$/, ['bhw', 'mho', 'admin']],
    ['GET', /^\/diseases\/archived$/, ['admin']],
    ['POST', /^\/diseases$/, ['admin']],
    ['PUT', /^\/diseases\/\d+\/(archive|restore)$/, ['admin']],
    ['GET', /^\/(mho-stats|analytics\/demographics|get-predictions|predict)$/, ['mho']],
    ['GET', /^\/mho\/(stats|kpi|yoy|mortality|reports\/(fhsis|pidsr))$/, ['mho']]
];

function loadJwtSecret() {
    if (process.env.JWT_SECRET) {
        if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
        return process.env.JWT_SECRET;
    }
    if (process.env.NODE_ENV === 'production') throw new Error('Set JWT_SECRET before running in production.');
    const filename = path.join(__dirname, '.local-jwt-secret');
    try {
        fs.writeFileSync(filename, crypto.randomBytes(64).toString('hex'), { flag: 'wx', mode: 0o600 });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
    const secret = fs.readFileSync(filename, 'utf8').trim();
    if (secret.length < 32) throw new Error('The local JWT secret is invalid.');
    return secret;
}

function createAccessControl(db, secret) {
    const deny = (res, status, error, code) => res.status(status).json({ success: false, error, code });
    return async (req, res, next) => {
        if (publicEndpoints.has(`${req.method} ${req.path}`)) return next();
        const bearer = /^Bearer ([^\s]+)$/i.exec(req.get('Authorization') || '');
        if (!bearer) return deny(res, 401, 'Please sign in to continue.', 'AUTH_REQUIRED');
        let claims;
        try {
            claims = jwt.verify(bearer[1], secret, { algorithms: ['HS256'] });
            if (typeof claims.system_id !== 'string') throw new Error('Invalid identity');
        } catch {
            return deny(res, 401, 'Your session has expired. Please sign in again.', 'SESSION_INVALID');
        }
        try {
            const [users] = await db.execute(
                'SELECT system_id, role, status, barangay_id, password_hash FROM users WHERE system_id = ?', [claims.system_id]
            );
            const user = users[0];
            if (!user || user.status !== 'approved') {
                return deny(res, 401, 'This account is no longer approved for access.', 'ACCOUNT_INACTIVE');
            }
            if (claims.password_version !== sessionVersion(user.password_hash, secret)) {
                return deny(res, 401, 'Please sign in again with your current password.', 'SESSION_INVALID');
            }
            delete user.password_hash;
            req.user = user;
            const rule = rules.find(([method, pattern]) => method === req.method && pattern.test(req.path));
            if (!rule || !rule[2].includes(user.role)) {
                return deny(res, 403, 'Your role does not have access to this action.', 'ACCESS_DENIED');
            }
            if (req.path === '/change-password' && req.body.system_id && req.body.system_id !== user.system_id) {
                return deny(res, 403, 'You can only change your own password.', 'ACCESS_DENIED');
            }
            if (req.method === 'POST' && (/^\/admin\//.test(req.path) || req.path === '/superadmin/approve-admin')) {
                const targetId = req.body.temp_system_id || req.body.system_id;
                if (!targetId) return deny(res, 400, 'A target account is required.', 'INVALID_INPUT');
                const [targets] = await db.execute('SELECT role FROM users WHERE system_id = ?', [targetId]);
                if (!targets.length) return deny(res, 404, 'Account not found.', 'NOT_FOUND');
                const allowedTargets = req.path === '/superadmin/approve-admin' ? ['admin'] :
                    user.role === 'superadmin' ? ['bhw', 'mho', 'admin'] : ['bhw', 'mho'];
                if (!allowedTargets.includes(targets[0].role)) {
                    return deny(res, 403, 'You cannot manage this account role.', 'ACCESS_DENIED');
                }
            }
            if (user.role === 'bhw' && !['/session', '/change-password', '/diseases'].includes(req.path)) {
                if (!user.barangay_id) return deny(res, 403, 'Your account needs an assigned barangay.', 'ACCESS_DENIED');
                const requestedBarangay = req.query.barangay_id;
                if (requestedBarangay && requestedBarangay !== 'null' && String(requestedBarangay) !== String(user.barangay_id)) {
                    return deny(res, 403, 'You can only access your assigned barangay.', 'ACCESS_DENIED');
                }
                // Express 5 exposes query as a getter; replace it to retain the enforced scope in both versions.
                Object.defineProperty(req, 'query', {
                    value: { ...req.query, barangay_id: String(user.barangay_id) }, writable: true, configurable: true
                });
                if (req.path === '/bhw/context' && req.query.system_id && req.query.system_id !== user.system_id) {
                    return deny(res, 403, 'You can only access your own account context.', 'ACCESS_DENIED');
                }
                if (req.method === 'POST' && req.path === '/patients' && req.body.encoded_by && req.body.encoded_by !== user.system_id) {
                    return deny(res, 403, 'The encoder must be the signed-in health worker.', 'ACCESS_DENIED');
                }
                const caseMatch = /^\/patients\/(\d+)\/(status|archive|restore|correction)$/.exec(req.path);
                const residentMatch = /^\/residents\/(\d+)\/dossier$/.exec(req.path);
                if (caseMatch || residentMatch) {
                    const table = caseMatch ? 'health_cases' : 'residents';
                    const [records] = await db.execute(`SELECT barangay_id FROM ${table} WHERE id = ?`, [(caseMatch || residentMatch)[1]]);
                    if (!records.length || String(records[0].barangay_id) !== String(user.barangay_id)) {
                        return deny(res, 404, 'Record not found in your assigned barangay.', 'NOT_FOUND');
                    }
                }
            }
            res.set('Cache-Control', 'no-store');
            next();
        } catch (error) {
            console.error('Access check failed:', error.code || error.name);
            deny(res, 503, 'Unable to verify access. Please try again shortly.', 'ACCESS_UNAVAILABLE');
        }
    };
}

module.exports = { createAccessControl, loadJwtSecret, publicEndpoints, rules };
