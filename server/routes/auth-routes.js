const { createAccountCredentials } = require('../services/account-credentials');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
    normalizeEmail,
    validPassword,
    sessionVersion,
    emailConfigured,
    sendEmail
} = require('../config/security-config');
const { createPasswordRecovery } = require('../services/password-recovery');
const { createRegistrationHandlers } = require('../services/registration');
const { createSystemAudit } = require('../services/system-audit');

function registerAuthRoutes(app, db, JWT_SECRET) {
    const credentials = createAccountCredentials(db);
    const audit = createSystemAudit(db);
    const attemptedId = req => typeof req.body?.system_id==='string' && /^[A-Za-z0-9_-]{1,64}$/.test(req.body.system_id) ? req.body.system_id : null;
    const failedLogin = (req, reason, user=null, action='Login Failed') => audit.record(user, action, {
        summary:reason, outcome:'Failed', target_type:'Account', target_id:attemptedId(req),
        attribution:user?'Credentials verified; access refused':'Unverified account identifier; not proof the account owner made this attempt'
    });
    const registration = createRegistrationHandlers(db);
    const loginLimiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 10,
        message: { success: false, error: 'Too many login attempts. Please wait 60 seconds.' },
        handler: async (req,res) => {
            try { await failedLogin(req,'Login attempt blocked by rate limit.',null,'Login Rate Limited');
                res.status(429).json({success:false,error:'Too many login attempts. Please wait 60 seconds.'});
            } catch { console.error('Login audit unavailable.'); res.status(503).json({success:false,error:'Unable to record the login attempt. Please try again later.'}); }
        }
    });

    // ==========================================
    // 2. SYSTEM ID GENERATOR
    // ==========================================
    const registrationLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: 'Too many onboarding requests. Please try again later.' }
    });
    app.post('/api/get-next-id', registrationLimiter, registration.previewId);
    app.post('/api/check-email', registrationLimiter, registration.checkEmail);
    app.post('/api/register', registrationLimiter, registration.register);

    // ==========================================
    // CHANGE PASSWORD
    // ==========================================
    app.post('/api/change-password', async (req, res) => {
        const system_id = req.user.system_id;
        const { current_password, new_password } = req.body;
        if (typeof current_password !== 'string' || !validPassword(new_password)) {
            return res
                .status(400)
                .json({
                    success: false,
                    error: 'Provide your current password and a new password of at least 8 characters (maximum 72 UTF-8 bytes).'
                });
        }
        try {
            const rows = await credentials.find(system_id);
            if (rows.length === 0) return res.status(404).json({ success: false, error: 'User not found.' });

            const user = rows[0];
            const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);

            if (!isPasswordValid) {
                return res.status(401).json({ success: false, error: 'Incorrect current password.' });
            }

            const hashedNewPassword = await bcrypt.hash(new_password, 10);
            await credentials.updatePassword(system_id, hashedNewPassword, req.user);

            res.json({ success: true, message: 'Password updated. Please sign in again.' });
        } catch (error) {
            console.error('Change Password Error:', error);
            res.status(500).json({ success: false, error: 'Database error.' });
        }
    });

    // ==========================================
    // PASSWORD RESET SYSTEM
    // ==========================================
    const recoveryRequestLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: 'Too many reset-code requests. Please wait 15 minutes.' }
    });
    const recoveryEmailLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 3,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => normalizeEmail(req.body.email) || 'invalid-address',
        message: {
            success: false,
            error: 'Too many reset-code requests for this address. Please wait 15 minutes.'
        }
    });
    const resetAttemptLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: 'Too many reset attempts. Please wait 15 minutes.' }
    });
    const passwordRecovery = createPasswordRecovery(db, JWT_SECRET, sendEmail, emailConfigured);
    app.post('/api/forgot-password', recoveryRequestLimiter, recoveryEmailLimiter, passwordRecovery.forgot);
    app.post('/api/reset-password', resetAttemptLimiter, passwordRecovery.reset);

    // ==========================================
    // 4. SECURE LOGIN
    // ==========================================
    app.post('/api/login', loginLimiter, async (req, res) => {
        const { system_id, password } = req.body || {};

        try {
            if(!attemptedId(req) || typeof password!=='string' || Buffer.byteLength(password,'utf8')>72) {
                await failedLogin(req,'Login rejected: invalid credentials.');
                return res.status(401).json({success:false,error:'Invalid System ID or Password.'});
            }
            const rows = await credentials.find(system_id);

            if (rows.length === 0) {
                await failedLogin(req,'Login rejected: invalid credentials.');
                return res.status(401).json({ success: false, error: 'Invalid System ID or Password.' });
            }

            const user = rows[0];
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                await failedLogin(req,'Login rejected: invalid credentials.');
                return res.status(401).json({ success: false, error: 'Invalid System ID or Password.' });
            }
            if (user.status === 'pending') {
                await failedLogin(req,'Login rejected: account pending approval.',user);
                return res
                    .status(403)
                    .json({ success: false, error: 'Account pending. Please wait for MHO Admin approval.' });
            }
            if (user.status === 'denied') {
                await failedLogin(req,'Login rejected: account denied.',user);
                return res.status(403).json({ success: false, error: 'Account access denied by HR.' });
            }
            if (user.status === 'suspended') {
                await failedLogin(req,'Login rejected: account suspended.',user);
                return res
                    .status(403)
                    .json({ success: false, error: 'Account suspended. Please contact MHO HR.' });
            }

            const token = jwt.sign(
                {
                    system_id: user.system_id,
                    role: user.role,
                    password_version: sessionVersion(user.password_hash, JWT_SECRET)
                },
                JWT_SECRET,
                { expiresIn: '8h', algorithm: 'HS256' }
            );

            await audit.record(user,'Login Succeeded',{summary:`Signed in as ${user.system_id}.`,target_type:'Account',target_id:user.system_id,outcome:'Succeeded'});
            console.log(`➔ LOGIN SUCCESS: ${user.system_id}`);
            res.json({
                success: true,
                token: token,
                role: user.role,
                system_id: user.system_id,
                redirect: `/${user.role}.html`
            });
        } catch (error) {
            console.error('Login Error:', error);
            res.status(500).json({ success: false, error: 'Internal server error.' });
        }
    });
}

module.exports = { registerAuthRoutes };
