const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { normalizeEmail, validPassword } = require('../config/security-config');
const genericMessage = 'If this email belongs to an approved account, check its inbox for a reset code. If no code arrives, contact the administrator.';

function codeHash(email, code, secret) {
    return crypto.createHmac('sha256', secret).update(email + '\0' + code).digest('hex');
}
function createPasswordRecovery(db, secret, sendEmail, emailConfigured) {
    return {
        async forgot(req, res) {
            const email = normalizeEmail(req.body.email);
            if (!email) return res.status(400).json({ success:false, error:'Enter a valid email address.' });
            if (!emailConfigured()) return res.status(503).json({ success:false, error:'Password-recovery email is not configured. Contact the administrator.' });
            let connection, resetId;
            try {
                connection = await db.getConnection();
                await connection.beginTransaction();
                const [users] = await connection.execute('SELECT system_id,status FROM users WHERE LOWER(email)=? FOR UPDATE', [email]);
                if (users.length !== 1 || users[0].status !== 'approved') {
                    await connection.rollback();
                    return res.json({ success:true, message:genericMessage });
                }
                const code = crypto.randomInt(100000, 1000000).toString();
                await connection.execute('DELETE FROM password_resets WHERE LOWER(email)=?', [email]);
                const [result] = await connection.execute('INSERT INTO password_resets (email,token,expires_at) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 15 MINUTE))', [email, 'v1:' + codeHash(email, code, secret) + ':0']);
                resetId = result.insertId;
                await connection.commit();
                try {
                    await sendEmail({ to:email, subject:'Your HEALTH-INTEL password reset code',
                        text:`Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, ignore this message.` });
                } catch {
                    await connection.execute('DELETE FROM password_resets WHERE id=? AND email=?', [resetId,email]);
                    // Do not disclose whether the account exists or log the recipient/code.
                    console.warn('Password-recovery email delivery failed. Check the private SMTP configuration.');
                }
                res.json({ success:true, message:genericMessage });
            } catch {
                if (connection) await connection.rollback();
                res.status(503).json({ success:false, error:'Password recovery is temporarily unavailable. Please try again later.' });
            } finally { if (connection) connection.release(); }
        },
        async reset(req, res) {
            const email = normalizeEmail(req.body.email);
            const code = req.body.token;
            if (!email || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
                return res.status(400).json({ success:false, error:'Enter a valid email address and six-digit code.' });
            }
            if (!validPassword(req.body.new_password)) {
                return res.status(400).json({ success:false, error:'Use a password of at least 8 characters and no more than 72 UTF-8 bytes.' });
            }
            let connection;
            try {
                connection = await db.getConnection();
                await connection.beginTransaction();
                const [users] = await connection.execute('SELECT system_id,status FROM users WHERE LOWER(email)=? FOR UPDATE', [email]);
                const [records] = await connection.execute('SELECT id,token,(expires_at>NOW()) as valid FROM password_resets WHERE LOWER(email)=? ORDER BY id DESC LIMIT 1 FOR UPDATE', [email]);
                const record = records[0];
                const stored = record && /^v1:([a-f0-9]{64}):([0-5])$/.exec(record.token);
                if (users.length !== 1 || users[0].status !== 'approved' || !stored || !record.valid || Number(stored[2]) >= 5) {
                    await connection.rollback();
                    return res.status(400).json({ success:false, error:'The code is invalid or expired. Request a new code.' });
                }
                const matches = crypto.timingSafeEqual(Buffer.from(stored[1],'hex'), Buffer.from(codeHash(email,code,secret),'hex'));
                if (!matches) {
                    const attempts = Number(stored[2]) + 1;
                    if (attempts >= 5) await connection.execute('DELETE FROM password_resets WHERE LOWER(email)=?', [email]);
                    else await connection.execute('UPDATE password_resets SET token=? WHERE id=?', [`v1:${stored[1]}:${attempts}`,record.id]);
                    await connection.commit();
                    return res.status(400).json({ success:false, error:'The code is invalid or expired. Request a new code if needed.' });
                }
                const hash = await bcrypt.hash(req.body.new_password,10);
                await connection.execute('UPDATE users SET password_hash=? WHERE system_id=?', [hash,users[0].system_id]);
                await connection.execute('DELETE FROM password_resets WHERE LOWER(email)=?', [email]);
                await connection.commit();
                res.json({ success:true, message:'Password updated. Sign in with your new password.' });
            } catch {
                if (connection) await connection.rollback();
                res.status(503).json({ success:false, error:'Password recovery is temporarily unavailable. Please try again later.' });
            } finally { if (connection) connection.release(); }
        }
    };
}
module.exports = { createPasswordRecovery, codeHash };
