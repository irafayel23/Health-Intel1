const { MASTER_ONLY_ACTIONS } = require('./system-audit');
function createAccountDirectory(db) {
    return {
        async pendingUsers() {
            const query = `SELECT system_id, email, first_name, last_name, employee_id, role, created_at FROM users WHERE status = 'pending' AND role IN ('bhw', 'mho') ORDER BY created_at DESC`;
            const [rows] = await db.execute(query);
            return rows;
        },

        async activeUsers() {
            const query = `SELECT u.system_id, u.email, u.first_name, u.last_name, u.employee_id, u.role, b.name AS assigned_barangay, u.created_at FROM users u LEFT JOIN barangays b ON u.barangay_id = b.id WHERE u.status = 'approved' AND u.role IN ('bhw', 'mho') ORDER BY u.created_at DESC`;
            const [rows] = await db.execute(query);
            return rows;
        },

        async deniedUsers() {
            const query = `SELECT system_id, first_name, last_name, employee_id, status FROM users WHERE status IN ('denied', 'suspended') AND role IN ('bhw', 'mho') ORDER BY created_at DESC`;
            const [rows] = await db.execute(query);
            return rows;
        },

        async pendingAdmins() {
            const query = `SELECT system_id, email, first_name, last_name, employee_id, role, created_at FROM users WHERE status = 'pending' AND role = 'admin' ORDER BY created_at DESC`;
            const [rows] = await db.execute(query);
            return rows;
        },

        async users() {
            const query = `SELECT system_id, email, first_name, last_name, employee_id, role, status, created_at FROM users WHERE role != 'superadmin' ORDER BY created_at DESC`;
            const [rows] = await db.execute(query);
            return rows;
        },

        async adminHistory(id) {
            const [accounts] = await db.execute('SELECT system_id,first_name,last_name,email,employee_id,status,created_at FROM users WHERE system_id=? AND role=\'admin\'', [id]);
            if (!accounts.length) return null;
            const account = accounts[0];
            // Only explicit Account references or exact legacy access-change messages.
            // A matching actor alone does not establish which account was affected.
            const [events] = await db.execute(`SELECT id,user_id,role,action,details,timestamp AS created_at FROM system_audit_logs
                WHERE (JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(details),details,'{}'),'$.target_type'))='Account'
                    AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(details),details,'{}'),'$.target_id'))=?)
                OR (action IN ('Admin Approved','User Approved','User Suspended','Access Restored','User Request Denied','Denial Undone')
                    AND details=CONCAT(action,': ',?,'.'))
                ORDER BY timestamp DESC,id DESC LIMIT 101`, [account.system_id,account.system_id]);
            return {account,events:events.slice(0,100),has_more:events.length>100};
        },

        async adminAudit() {
            const query =
                `SELECT id, user_id, action, timestamp as created_at, role, details FROM system_audit_logs WHERE role != 'SUPERADMIN' AND role != 'Superadmin' AND role != 'Super Admin' AND action NOT IN (${MASTER_ONLY_ACTIONS.map(()=>'?').join(',')}) ORDER BY timestamp DESC,id DESC`;
            const [rows] = await db.execute(query, MASTER_ONLY_ACTIONS);
            return rows;
        },

        async masterAudit() {
            const query =
                'SELECT id, user_id, action, timestamp as created_at, role, details FROM system_audit_logs ORDER BY timestamp DESC,id DESC';
            const [rows] = await db.execute(query);
            return rows;
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
