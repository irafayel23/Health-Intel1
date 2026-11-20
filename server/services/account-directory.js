const {registrationHistory}=require('./registration-history');
const { MASTER_ONLY_ACTIONS } = require('./system-audit');
function auditDate(createdEpoch) {
    return createdEpoch == null ? null : new Date(Number(createdEpoch) * 1000).toISOString();
}

function auditCreatedAt({created_epoch, ...row}) {
    return {...row, created_at:auditDate(created_epoch)};
}

function createAccountDirectory(db) {
    return {
        async pendingUsers() {
            const query = `SELECT system_id, email, first_name, last_name, employee_id, role, created_at FROM users WHERE status = 'pending' AND role IN ('bhw', 'mho') ORDER BY created_at DESC`;
            const [rows] = await db.execute(query);
            return registrationHistory(db,rows);
        },

        async activeUsers() {
            const query = `SELECT u.system_id, u.email, u.first_name, u.last_name, u.employee_id, u.role, b.name AS assigned_barangay, u.created_at FROM users u LEFT JOIN barangays b ON u.barangay_id = b.id WHERE u.status = 'approved' AND u.role IN ('bhw', 'mho') ORDER BY u.created_at DESC`;
            const [rows] = await db.execute(query);
            return rows;
        },

        async deniedUsers() {
            const query = `SELECT u.system_id, u.first_name, u.last_name, u.employee_id, u.status,
                CASE WHEN u.status = 'suspended' THEN (
<<<<<<< HEAD
                    SELECT CASE WHEN a.action = 'User Suspended' THEN UNIX_TIMESTAMP(a.timestamp) END
=======
                    SELECT CASE WHEN a.action = 'User Suspended' THEN a.timestamp END
>>>>>>> 77e33a469de54a41ddaeb994c2f5451c516ee426
                    FROM system_audit_logs a
                    WHERE a.action IN ('User Suspended', 'Access Restored')
                        AND ((JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(a.details), a.details, '{}'), '$.target_type')) = 'Account'
                            AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(a.details), a.details, '{}'), '$.target_id')) = u.system_id
                            AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(a.details), a.details, '{}'), '$.outcome')) = 'Succeeded')
                        OR a.details = CONCAT(a.action, ': ', u.system_id, '.'))
                    ORDER BY a.timestamp DESC, a.id DESC LIMIT 1
<<<<<<< HEAD
                ) END AS suspended_epoch
=======
                ) END AS suspended_at
>>>>>>> 77e33a469de54a41ddaeb994c2f5451c516ee426
                FROM users u WHERE u.status IN ('denied', 'suspended') AND u.role IN ('bhw', 'mho')
                ORDER BY u.created_at DESC`;
            const [rows] = await db.execute(query);
            return rows.map(({suspended_epoch, ...row}) => ({...row, suspended_at:auditDate(suspended_epoch)}));
        },

        async pendingAdmins() {
            const query = `SELECT system_id, email, first_name, last_name, employee_id, role, created_at FROM users WHERE status = 'pending' AND role = 'admin' ORDER BY created_at DESC`;
            const [rows] = await db.execute(query);
            return registrationHistory(db,rows);
        },

        async users() {
            const query = `SELECT u.system_id, u.email, u.first_name, u.last_name, u.employee_id, u.role, u.status, u.created_at, b.name AS assigned_barangay
                FROM users u LEFT JOIN barangays b ON u.barangay_id = b.id
                WHERE u.role IN ('bhw', 'mho', 'admin') ORDER BY u.created_at DESC`;
            const [rows] = await db.execute(query);
            return registrationHistory(db,rows);
        },

        async adminHistory(id) {
            const [accounts] = await db.execute('SELECT system_id,first_name,last_name,email,employee_id,status,created_at FROM users WHERE system_id=? AND role=\'admin\'', [id]);
            if (!accounts.length) return null;
            const account = accounts[0];
            // Only explicit Account references or exact legacy access-change messages.
            // A matching actor alone does not establish which account was affected.
            const [events] = await db.execute(`SELECT id,user_id,role,action,details,UNIX_TIMESTAMP(timestamp) AS created_epoch FROM system_audit_logs
                WHERE (JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(details),details,'{}'),'$.target_type'))='Account'
                    AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(details),details,'{}'),'$.target_id'))=?)
                OR (action IN ('Admin Approved','User Approved','User Suspended','Access Restored','User Request Denied','Denial Undone')
                    AND details=CONCAT(action,': ',?,'.'))
                ORDER BY timestamp DESC,id DESC LIMIT 101`, [account.system_id,account.system_id]);
            return {account,events:events.slice(0,100).map(auditCreatedAt),has_more:events.length>100};
        },

        async adminAudit() {
            const query =
                `SELECT id, user_id, action, UNIX_TIMESTAMP(timestamp) AS created_epoch, role, details FROM system_audit_logs WHERE role != 'SUPERADMIN' AND role != 'Superadmin' AND role != 'Super Admin' AND action NOT IN (${MASTER_ONLY_ACTIONS.map(()=>'?').join(',')}) ORDER BY timestamp DESC,id DESC`;
            const [rows] = await db.execute(query, MASTER_ONLY_ACTIONS);
            return rows.map(auditCreatedAt);
        },

        async masterAudit() {
            const query =
                'SELECT id, user_id, action, UNIX_TIMESTAMP(timestamp) AS created_epoch, role, details FROM system_audit_logs ORDER BY timestamp DESC,id DESC';
            const [rows] = await db.execute(query);
            return rows.map(auditCreatedAt);
        },

        async healthCounts(database) {
            const [dbSize] = await db.execute(
                `SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS "size_mb" FROM information_schema.TABLES WHERE table_schema = ?`,
                [database]
            );
            const [userCount] = await db.execute(`SELECT COUNT(*) as count FROM users`);
            const [patientCount] = await db.execute(`SELECT COUNT(*) as count FROM health_cases`);
            const [auditCount] = await db.execute('SELECT COUNT(*) as count FROM system_audit_logs');
            return { dbSize, userCount, patientCount, auditCount };
        }
    };
}

module.exports = { createAccountDirectory };
