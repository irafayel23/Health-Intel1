const { createHash, randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const { normalizeEmail, validPassword } = require('../config/security-config');
const { transaction } = require('./database-transaction');
const { createSystemAudit } = require('./system-audit');
const { revokeAccountSessions } = require('./session-security');
const { invalid, plain, respond } = require('./service-errors');

const roles = new Set(['bhw', 'mho', 'admin']);
const resetMinutes = 30;
const hashCode = code => createHash('sha256').update(code).digest('hex');
const employeeKey = value => plain(value, 'employee ID', 50).toUpperCase();
const staffId = value => plain(value, 'System ID', 50).toUpperCase();
const readId = req => staffId(req.body?.system_id);
const adminBootstrapAction = 'First Admin Exception Approved';

function createStaffAccess(db) {
    let storage;
    function initialize() {
        return storage ||= (async () => {
            const tables = {
                staff_roster: `employee_id VARCHAR(50) PRIMARY KEY, first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) NOT NULL, role VARCHAR(12) NOT NULL, barangay_id INT NULL,
                    email VARCHAR(255) NULL`,
                staff_admin_reviews: `employee_id VARCHAR(50) PRIMARY KEY, requester VARCHAR(50) NOT NULL,
                    reviewer VARCHAR(50) NULL, system_id VARCHAR(50) NULL`,
                staff_access_resets: `system_id VARCHAR(50) PRIMARY KEY, code_hash CHAR(64) NOT NULL,
                    expires_at BIGINT UNSIGNED NOT NULL, session_epoch BIGINT UNSIGNED NOT NULL`
            };
            for (const [name, columns] of Object.entries(tables)) {
                try {
                    await db.query('SELECT 1 FROM ' + name + ' LIMIT 0');
                } catch (error) {
                    if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
                    await db.query('CREATE TABLE IF NOT EXISTS ' + name + ' (' + columns + ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
                }
            }
        })().catch(error => { storage = null; throw error; });
    }

    function reply(action, fallback) {
        return async (req, res) => {
            try {
                await initialize();
                const data = await action(req);
                res.set('Cache-Control', 'no-store').json({success: true, data});
            } catch (error) {
                respond(res, error, fallback);
            }
        };
    }

    function verified(req) {
        if (req.body?.identity_checked !== true) throw invalid('Confirm the in-person identity and assignment check.');
    }

    async function checkActor(connection, user, allowed) {
        const [[current]] = await connection.execute('SELECT role,status FROM users WHERE system_id=? FOR UPDATE', [user.system_id]);
        if (current?.status !== 'approved' || current.role !== user.role || !allowed.includes(current.role)) {
            throw invalid('This account no longer has permission to perform that action.', 403);
        }
    }

    function log(connection, user, action, targetType, id, summary, values = {}) {
        return createSystemAudit(connection).record(user, action, {
            summary, target_type: targetType, target_id: id, outcome: 'Succeeded', ...values
        });
    }

    async function barangayFor(connection, value) {
        const id = Number(value);
        if (!Number.isSafeInteger(id) || id < 1) throw invalid('Select a valid barangay.');
        const [[row]] = await connection.execute('SELECT id FROM barangays WHERE id=?', [id]);
        if (!row) throw invalid('The selected barangay was not found.');
        return id;
    }

    const rosterList = reply(async () => {
        const [rows] = await db.execute(`SELECT r.employee_id,r.first_name,r.last_name,r.role,r.barangay_id,r.email,b.name AS barangay,
            CASE WHEN a.system_id IS NOT NULL THEN 'issued' WHEN a.reviewer IS NOT NULL THEN 'approved'
                WHEN a.employee_id IS NOT NULL THEN 'pending' END AS admin_review
            FROM staff_roster r LEFT JOIN barangays b ON b.id=r.barangay_id
            LEFT JOIN staff_admin_reviews a ON a.employee_id=r.employee_id ORDER BY r.last_name,r.first_name,r.employee_id`);
        return rows;
    }, 'Staff roster is unavailable.');

    const rosterAdd = reply(req => {
        verified(req);
        const {role} = req.body;
        if (!roles.has(role)) throw invalid('Select BHW, MHO, or Admin.');
        const id = employeeKey(req.body.employee_id);
        const first = plain(req.body.first_name, 'first name', 100);
        const last = plain(req.body.last_name, 'last name', 100);
        const email = role !== 'admin' && req.body.email ? normalizeEmail(req.body.email) : null;
        if (req.body.email && !email) throw invalid('Use a valid roster email for BHW or MHO only.');
        return transaction(db, async connection => {
            await checkActor(connection, req.user, ['superadmin']);
            const [[existing]] = await connection.execute('SELECT employee_id FROM staff_roster WHERE employee_id=?', [id]);
            if (existing) throw invalid('This employee already has a roster entry.', 409);
            const assignment = role === 'bhw' ? await barangayFor(connection, req.body.barangay_id) : null;
            await connection.execute('INSERT INTO staff_roster(employee_id,first_name,last_name,role,barangay_id,email) VALUES(?,?,?,?,?,?)',
                [id, first, last, role, assignment, email]);
            await log(connection, req.user, 'Staff Roster Entry Added', 'Staff roster', id, 'Added an employee verified against the HRIS roster.');
        }, 'registration');
    }, 'The employee could not be added to the roster.');

    async function requireIssuance(connection, user, record, method, email) {
        await checkActor(connection, user, ['superadmin']);
        const id = employeeKey(record.employee);
        const [[roster]] = await connection.execute('SELECT * FROM staff_roster WHERE employee_id=? FOR UPDATE', [id]);
        if (!roster || roster.role !== record.role || roster.barangay_id !== record.barangay ||
            roster.first_name !== record.first || roster.last_name !== record.last) {
            throw invalid('Select the employee and assignment from the verified HRIS roster.', 409);
        }
        if (record.role === 'admin' && method !== 'manual') throw invalid('Admin activation details must be handed over in person.');
        if (method === 'email' && (!email || email !== roster.email)) {
            throw invalid('Email delivery requires the verified address already on the HRIS roster.', 409);
        }
        if (record.role !== 'admin') return;
        const [[review]] = await connection.execute(
            'SELECT reviewer,system_id FROM staff_admin_reviews WHERE employee_id=? FOR UPDATE', [id]);
        if (!review?.reviewer || (review.system_id && review.system_id !== record.systemId)) {
            throw invalid('An approved Admin access review is required before issuing this account.', 409);
        }
        if (!review.system_id) {
            await connection.execute('UPDATE staff_admin_reviews SET system_id=? WHERE employee_id=?', [record.systemId, id]);
        }
    }

    const requestReview = reply(req => {
        const id = employeeKey(req.body?.employee_id);
        return transaction(db, async connection => {
            await checkActor(connection, req.user, ['superadmin']);
            const [[roster]] = await connection.execute('SELECT role FROM staff_roster WHERE employee_id=? FOR UPDATE', [id]);
            if (roster?.role !== 'admin') throw invalid('Select an Admin from the verified staff roster.');
            const [[previous]] = await connection.execute('SELECT requester,reviewer FROM staff_admin_reviews WHERE employee_id=? FOR UPDATE', [id]);
            if (previous) throw invalid('This employee already has an Admin access review.', 409);
            await connection.execute('INSERT INTO staff_admin_reviews(employee_id,requester) VALUES(?,?)', [id, req.user.system_id]);
            await log(connection, req.user, 'Admin Access Review Requested', 'Staff roster', id, 'Requested a separate review for Admin access.');
        }, 'registration');
    }, 'The Admin review could not be requested.');

    const listReviews = reply(async () => {
        const [rows] = await db.execute(`SELECT r.employee_id,r.first_name,r.last_name,a.requester FROM staff_admin_reviews a
            JOIN staff_roster r ON a.employee_id=r.employee_id WHERE a.reviewer IS NULL ORDER BY r.last_name,r.first_name`);
        return rows;
    }, 'The Admin review queue is unavailable.');

    async function canBootstrap(connection, user, review) {
        if (user.role !== 'superadmin' || user.system_id !== 'SUPER-001' || review.requester !== user.system_id) return false;
        const [[used]] = await connection.execute('SELECT id FROM system_audit_logs WHERE action=? LIMIT 1', [adminBootstrapAction]);
        const [[other]] = await connection.execute(
            "SELECT system_id FROM users WHERE status='approved' AND role IN ('admin','superadmin') AND system_id<>? LIMIT 1", [user.system_id]);
        return !used && !other;
    }

    const review = reply(req => {
        verified(req);
        const id = employeeKey(req.body?.employee_id);
        return transaction(db, async connection => {
            await checkActor(connection, req.user, ['admin','superadmin']);
            const [[pending]] = await connection.execute(
                'SELECT requester,reviewer FROM staff_admin_reviews WHERE employee_id=? FOR UPDATE', [id]);
            if (!pending || pending.reviewer) throw invalid('This request is no longer awaiting review.', 409);
            const ownRequest = pending.requester === req.user.system_id;
            if (ownRequest && (req.body.bootstrap !== true || !await canBootstrap(connection, req.user, pending))) {
                throw invalid('A different active Admin or Superadmin must review this request.', 403);
            }
            await connection.execute('UPDATE staff_admin_reviews SET reviewer=? WHERE employee_id=?', [req.user.system_id, id]);
            await log(connection, req.user, ownRequest ? adminBootstrapAction : 'Admin Access Approved',
                'Staff roster', id, ownRequest ? 'Used the one-time first Admin exception.' : 'A different reviewer approved Admin access.',
                {requested_by: pending.requester});
        }, 'registration');
    }, 'Admin access review could not be saved.');

    async function requireActivation(connection, pending) {
        if (pending.role !== 'admin') return;
        const [[review]] = await connection.execute(
            'SELECT reviewer FROM staff_admin_reviews WHERE employee_id=? AND system_id=? FOR UPDATE',
            [employeeKey(pending.employee_id), pending.system_id]);
        if (!review?.reviewer) throw invalid('This Admin account needs an in-person activation code issued after review. Contact HRIS.', 403);
    }

    const issueReset = reply(req => {
        verified(req);
        const id = readId(req);
        return transaction(db, async connection => {
            await checkActor(connection, req.user, ['superadmin']);
            const [[staff]] = await connection.execute('SELECT role,status FROM users WHERE system_id=? FOR UPDATE', [id]);
            if (!roles.has(staff?.role) || staff.status !== 'approved') throw invalid('Select an active staff account.');
            const code = randomBytes(16).toString('hex').toUpperCase();
            const expires = Math.floor(Date.now() / 1000) + resetMinutes * 60;

            await connection.execute('UPDATE users SET password_hash=? WHERE system_id=?',
                [await bcrypt.hash(randomBytes(32).toString('hex'),10),id]);
            await revokeAccountSessions(connection,id);
            const [[{epoch}]] = await connection.execute('SELECT epoch FROM account_session_epochs WHERE system_id=?', [id]);
            await connection.execute(`INSERT INTO staff_access_resets(system_id,code_hash,expires_at,session_epoch) VALUES(?,?,?,?)
                ON DUPLICATE KEY UPDATE code_hash=VALUES(code_hash),expires_at=VALUES(expires_at),session_epoch=VALUES(session_epoch)`,
                [id,hashCode(code),expires,epoch]);
            await log(connection,req.user,'Staff Reset Code Issued','Account',id,'Issued an in-person reset code, retired the old password and ended active sessions.');
            return {system_id:id,code:code.match(/.{8}/g).join('-'),expires_at:new Date(expires * 1000).toISOString()};
        },'registration');
    }, 'Could not generate a staff reset code.');

    const redeemReset = reply(async req => {
        const id = readId(req);
        const code = typeof req.body?.code === 'string' ? req.body.code.replace(/[\s-]/g,'').toUpperCase() : '';
        const {password, confirm_password} = req.body;
        if (!/^[A-F0-9]{32}$/.test(code)) throw invalid('The System ID or reset code is invalid or expired.', 403);
        if (!validPassword(password) || password !== confirm_password) throw invalid('Enter matching passwords with at least 8 characters and at most 72 UTF-8 bytes.');
        return transaction(db, async connection => {
            const [[staff]] = await connection.execute('SELECT system_id,role,status FROM users WHERE system_id=? FOR UPDATE',[id]);
            const [[saved]] = await connection.execute(
                `SELECT system_id FROM staff_access_resets WHERE system_id=? AND code_hash=? AND expires_at>UNIX_TIMESTAMP()
                 AND session_epoch=(SELECT epoch FROM account_session_epochs WHERE system_id=?) FOR UPDATE`,
                [id, hashCode(code), id]);
            if (!saved || !roles.has(staff?.role) || staff.status !== 'approved') throw invalid('The System ID or reset code is invalid or expired.',403);
            await connection.execute('UPDATE users SET password_hash=? WHERE system_id=?',[await bcrypt.hash(password,10),id]);
            await connection.execute('DELETE FROM staff_access_resets WHERE system_id=?',[id]);
            await revokeAccountSessions(connection,id);
            await log(connection,staff,'Staff Password Reset','Account',id,'Redeemed the in-person staff reset code.');
            return {system_id:id};
        },'registration');
    }, 'Staff password reset is unavailable.');

    const transfer = reply(req => {
        verified(req);
        const id = readId(req);
        const reason = plain(req.body.reason,'transfer reason',300);
        return transaction(db, async connection => {
            await checkActor(connection,req.user,['superadmin']);
            const [[staff]] = await connection.execute('SELECT role,status,employee_id,barangay_id FROM users WHERE system_id=? FOR UPDATE',[id]);
            if (staff?.role !== 'bhw' || staff.status !== 'approved') throw invalid('Select an active BHW account.');
            const barangay = await barangayFor(connection,req.body.barangay_id);
            if (staff.barangay_id === barangay) throw invalid('Select a different barangay.');
            await connection.execute('UPDATE users SET barangay_id=? WHERE system_id=?',[barangay,id]);
            if (staff.employee_id) await connection.execute(
                "UPDATE staff_roster SET barangay_id=? WHERE employee_id=? AND role='bhw'",
                [barangay,employeeKey(staff.employee_id)]);
            await revokeAccountSessions(connection,id);
            await log(connection,req.user,'Staff Barangay Changed','Account',id,'Changed the assigned barangay and ended active sessions.',
                {reason,before:{barangay_id:staff.barangay_id},after:{barangay_id:barangay}});
        },'registration');
    }, 'Could not change the barangay assignment.');

    return {initialize, rosterList, rosterAdd, requireIssuance, requireActivation, requestReview, listReviews, review, issueReset, redeemReset, transfer};
}
module.exports = {createStaffAccess};
