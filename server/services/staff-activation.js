const { createHash, randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const path = require('node:path');
const sharp = require('sharp');
const { validPassword, normalizeEmail, escapeHtml } = require('../config/security-config');
const { nextId } = require('./registration');
const { transaction } = require('./database-transaction');
const { createSystemAudit } = require('./system-audit');
const { invalid, plain, respond } = require('./service-errors');

const prefixes = { bhw: 'BHW', mho: 'MHO', admin: 'ADM' };
const codeHash = code => createHash('sha256').update(code).digest('hex');
const hours = 24;
const staffIdPattern = /^(BHW|MHO|ADM)-(?:[0-9]{3,9}|S[A-F0-9]{12})$/;

function createStaffActivation(db, { publicOrigin, sendEmail, emailConfigured } = {}) {
    let logoPromise;
    function emailLogo() {
        return logoPromise ||= sharp(path.join(__dirname, '../../assets/img/login-logo.webp'))
            .resize(128, 128).png().toBuffer().catch(() => null);
    }

    async function deliver(email, activation) {
        if (!email) return 'manual';
        if (!publicOrigin || !emailConfigured?.()) return 'not_configured';
        try {
            const url = new URL('/', publicOrigin);
            const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
            const portalText = local ? 'Open the Health-Intel sign-in page provided by HRIS' : `Open ${url.href}`;
            const portalHtml = local ? portalText : `<a href="${escapeHtml(url.href)}" style="color:#007d82;font-weight:bold">Open Health-Intel</a>`;
            const { system_id, code } = activation;
            const logo = await emailLogo();
            const delivery = await sendEmail({
                to: email,
                subject: 'Activate your Health-Intel staff account',
                text: `System ID: ${system_id}\nActivation code: ${code}\n\n${portalText} and select Activate staff account to create your sign-in password. The code expires after 24 hours and can be used once.`,
                html: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#eaf2f8" style="background:#eaf2f8;font-family:Arial,sans-serif;color:#122d45">
                <tr><td align="center" style="padding:24px 12px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #cbdce8;border-radius:16px;background:#ffffff">
                <tr><td bgcolor="#123658" style="padding:18px 22px;background:#123658;color:#ffffff;border-radius:15px 15px 0 0">
                  ${logo ? '<img src="cid:health-intel-activation-logo" width="48" height="48" alt="Health-Intel logo" style="vertical-align:middle;background:#ffffff;border-radius:10px;margin-right:12px">' : ''}
                  <span style="vertical-align:middle;color:#ffffff;font-size:17px;font-weight:bold;letter-spacing:.6px">HEALTH-INTEL</span>
                </td></tr>
                <tr><td style="padding:24px 22px">
                  <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#122d45">Activate your staff account</h1>
                  <p style="margin:0 0 16px;line-height:1.5">Use the System ID and activation code below to set your password.</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#dff5ef" style="background:#dff5ef;border-radius:10px;color:#0d534b">
                    <tr><td style="padding:14px 16px">
                      <p style="margin:0 0 10px;font-size:13px">System ID<br><strong style="font-size:16px">${escapeHtml(system_id)}</strong></p>
                      <p style="margin:0;font-size:13px">One-time activation code<br><strong style="font:700 15px/1.65 Consolas,monospace;overflow-wrap:anywhere">${escapeHtml(code)}</strong></p>
                    </td></tr>
                  </table>
                  <p style="margin:16px 0 0;line-height:1.5">${portalHtml} and select <strong>Activate staff account</strong>.</p>
                </td></tr>
                <tr><td bgcolor="#edf5fb" style="padding:14px 22px;background:#edf5fb;color:#29475e;font-size:13px;line-height:1.5;border-radius:0 0 15px 15px">This code expires in 24 hours and can be used once.</td></tr>
                </table></td></tr></table>`,
                attachments: logo ? [{filename:'health-intel-logo.png',content:logo,contentType:'image/png',cid:'health-intel-activation-logo'}] : []
            });
            return delivery?.accepted?.some(address => normalizeEmail(address) === email) ? 'sent' : 'recipient_rejected';
        } catch (error) {
            if (error.code === 'EAUTH') return 'auth_failed';
            if (error.code === 'EENVELOPE') return 'recipient_rejected';
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') return 'smtp_unavailable';
            return 'failed';
        }
    }

    let ready;
    function initialize() {
        return ready ||= db.query('SELECT system_id, activation_hash, expires_at FROM staff_activations LIMIT 0').catch(error => {
            if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
            return db.query(`CREATE TABLE IF NOT EXISTS staff_activations (
                system_id VARCHAR(50) PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                employee_id VARCHAR(50) NOT NULL UNIQUE,
                role VARCHAR(12) NOT NULL,
                barangay_id INT NULL,
                activation_hash CHAR(64) NOT NULL,
                expires_at BIGINT UNSIGNED NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
        }).then(() => db.query('SELECT system_id, email, last_delivery FROM staff_activation_emails LIMIT 0').catch(error => {
            if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
            return db.query(`CREATE TABLE IF NOT EXISTS staff_activation_emails (
                system_id VARCHAR(50) PRIMARY KEY,
                email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE,
                last_delivery VARCHAR(20) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
        })).catch(error => {
            ready = null;
            throw error;
        });
    }

    async function issue(req, res) {
        try {
            const { role, barangay_id, identity_checked } = req.body || {};
            if (!Object.hasOwn(prefixes, role)) throw invalid('Select BHW, MHO, or Admin.');
            if (identity_checked !== true) throw invalid('Confirm the in-person ID and assignment check.');
            const method = req.body.delivery_method ?? (req.body.delivery_email ? 'email' : 'manual');
            if (method !== 'manual' && method !== 'email') throw invalid('Select a valid delivery method.');
            const requestedEmail = normalizeEmail(req.body.delivery_email);
            if (method === 'email' && req.body.delivery_email && !requestedEmail) {
                throw invalid('Enter the employee’s confirmed email address.');
            }
            const first = plain(req.body.first_name, 'first name', 100);
            const last = plain(req.body.last_name, 'last name', 100);
            const employee = plain(req.body.employee_id, 'employee ID', 50);
            const barangay = role === 'bhw' ? Number(barangay_id) : null;
            if (role === 'bhw' && (!Number.isSafeInteger(barangay) || barangay < 1)) throw invalid('Select the assigned barangay.');
            await initialize();
            const { email, ...result } = await transaction(db, async connection => {
                const [[existing]] = await connection.execute(
                    "SELECT system_id FROM users WHERE UPPER(TRIM(employee_id))=UPPER(?) LIMIT 1", [employee]);
                if (existing) throw invalid('This employee ID already has a system account or registration.', 409);
                if (barangay) {
                    const [[assignment]] = await connection.execute('SELECT id FROM barangays WHERE id=?', [barangay]);
                    if (!assignment) throw invalid('Select a valid barangay.');
                }
                const [[pending]] = await connection.execute(
                    'SELECT * FROM staff_activations WHERE UPPER(employee_id)=UPPER(?) FOR UPDATE', [employee]);
                if (req.body.reissue_system_id && pending?.system_id !== req.body.reissue_system_id) {
                    throw invalid('This account is no longer awaiting activation. Refresh Staff Accounts.', 409);
                }
                if (pending && (pending.first_name !== first || pending.last_name !== last ||
                    pending.role !== role || pending.barangay_id !== barangay)) {
                    throw invalid('This employee ID has a pending issuance with different details. Review the account directory.', 409);
                }
                const systemId = pending?.system_id || await nextId(connection, role);
                const [[saved]] = await connection.execute(
                    'SELECT email FROM staff_activation_emails WHERE system_id=? FOR UPDATE', [systemId]);
                if (method === 'email' && saved && requestedEmail && saved.email !== requestedEmail) {
                    throw invalid('Reissue can only use the email address saved for this account.', 409);
                }
                const email = method === 'email' ? saved?.email || requestedEmail : null;
                if (method === 'email' && !email) throw invalid('Enter the employee’s confirmed email address.');
                if (email) {
                    const [[existingUser]] = await connection.execute(
                        'SELECT system_id FROM users WHERE LOWER(TRIM(email))=? LIMIT 1', [email]);
                    const [[existingStaff]] = await connection.execute(
                        'SELECT system_id FROM staff_activation_emails WHERE email=?', [email]);
                    if (existingUser || (existingStaff && existingStaff.system_id !== systemId)) {
                        throw invalid('This email address is already assigned to another account.', 409);
                    }
                    if (saved) {
                        await connection.execute("UPDATE staff_activation_emails SET last_delivery='sending' WHERE system_id=?", [systemId]);
                    } else {
                        await connection.execute(
                            "INSERT INTO staff_activation_emails(system_id,email,last_delivery) VALUES(?,?,'sending')", [systemId, email]);
                    }
                }
                const code = randomBytes(16).toString('hex').toUpperCase();
                const expires = Math.floor(Date.now() / 1000) + hours * 3600;
                if (pending) {
                    await connection.execute('UPDATE staff_activations SET activation_hash=?, expires_at=? WHERE system_id=?',
                        [codeHash(code), expires, systemId]);
                } else {
                    await connection.execute(`INSERT INTO staff_activations
                        (system_id,first_name,last_name,employee_id,role,barangay_id,activation_hash,expires_at)
                        VALUES (?,?,?,?,?,?,?,?)`, [systemId, first, last, employee, role, barangay, codeHash(code), expires]);
                }
                await createSystemAudit(connection).record(req.user, pending ? 'Staff Activation Code Reissued' : 'Staff Account Issued', {
                    summary: pending ? 'Issued a replacement activation code after an in-person check.' : 'Issued a staff account after an in-person check.',
                    target_type: 'Account', target_id: systemId, outcome: 'Succeeded'
                });
                return { email, system_id: systemId, code: code.match(/.{8}/g).join('-'), expires_at: new Date(expires * 1000).toISOString() };
            }, 'registration');
            const email_delivery = await deliver(email, result);
            if (email) {
                try {
                    await db.execute(`UPDATE staff_activation_emails SET last_delivery=?
                        WHERE system_id=? AND EXISTS (SELECT 1 FROM staff_activations
                            WHERE system_id=? AND activation_hash=?)`,
                    [email_delivery, result.system_id, result.system_id, codeHash(result.code.replaceAll('-', ''))]);
                } catch {
                    console.error('Staff activation email delivery status could not be saved.');
                }
            }
            res.set('Cache-Control', 'no-store').status(201).json({ success: true, ...result, email_delivery, delivery_recipient: email });
        } catch (error) {
            respond(res, error, 'Staff account issuance is unavailable. Try again.');
        }
    }

    async function cancel(req, res) {
        try {
            const systemId = req.body?.system_id;
            if (typeof systemId !== 'string' || !staffIdPattern.test(systemId)) throw invalid('Provide a valid staff System ID.');
            await initialize();
            await transaction(db, async connection => {
                const [[pending]] = await connection.execute(
                    'SELECT system_id FROM staff_activations WHERE system_id=? FOR UPDATE', [systemId]);
                if (!pending) throw invalid('This account is no longer awaiting activation. Refresh Staff Accounts.', 409);
                await connection.execute('DELETE FROM staff_activation_emails WHERE system_id=?', [systemId]);
                await connection.execute('DELETE FROM staff_activations WHERE system_id=?', [systemId]);
                await createSystemAudit(connection).record(req.user, 'Staff Account Canceled', {
                    summary: 'Canceled a pending staff account and invalidated its activation code.',
                    target_type: 'Account', target_id: systemId, outcome: 'Succeeded'
                });
            }, 'registration');
            res.json({ success: true });
        } catch (error) {
            respond(res, error, 'Staff account cancellation is unavailable. Try again.');
        }
    }

    async function activate(req, res) {
        try {
            const { password, confirm_password } = req.body || {};
            const id = String(req.body?.system_id || '').trim().toUpperCase();
            const code = String(req.body?.code || '').trim().replace(/[\s-]/g, '').toUpperCase();
            const rejectCode = () => invalid('The System ID or activation code is invalid or expired.', 403);
            if (!staffIdPattern.test(id) || !/^[A-F0-9]{32}$/.test(code)) throw rejectCode();
            if (!validPassword(password)) throw invalid('Use at least 8 characters and at most 72 UTF-8 bytes.');
            if (password !== confirm_password) throw invalid('Passwords do not match.');
            await transaction(db, async connection => {
                const [[staff]] = await connection.execute(
                    'SELECT * FROM staff_activations WHERE system_id=? AND activation_hash=? AND expires_at>UNIX_TIMESTAMP() FOR UPDATE',
                    [id, codeHash(code)]);
                if (!staff) throw rejectCode();
                const [[existing]] = await connection.execute(
                    'SELECT system_id FROM users WHERE UPPER(TRIM(employee_id))=UPPER(?) LIMIT 1', [staff.employee_id]);
                if (existing) throw invalid('This employee ID already has a registration. Contact HRIS.', 409);
                const hash = await bcrypt.hash(password, 10);
                await connection.execute(`INSERT INTO users
                    (system_id,first_name,last_name,employee_id,role,barangay_id,password_hash,status,email)
                    VALUES (?,?,?,?,?,?,?,'approved',NULL)`,
                    [id, staff.first_name, staff.last_name, staff.employee_id, staff.role, staff.barangay_id, hash]);
                await connection.execute('DELETE FROM staff_activations WHERE system_id=?', [id]);
                await createSystemAudit(connection).record({ system_id: id, role: staff.role }, 'Staff Account Activated', {
                    summary: 'Staff account activated and password set.', target_type: 'Account', target_id: id, outcome: 'Succeeded'
                });
            }, 'registration');
            res.json({ success: true, system_id: id });
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') return respond(res, invalid('The System ID or activation code is invalid or expired.', 403));
            respond(res, error, 'Staff activation is unavailable. Try again.');
        }
    }
    return { initialize, issue, cancel, activate };
}

module.exports = { createStaffActivation };
