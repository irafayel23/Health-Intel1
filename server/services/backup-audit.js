function createBackupAudit(db) {
    return {
        async record(systemId) {
            await db.execute(
                'INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
                [
                    systemId,
                    'Superadmin',
                    'Database Backup Generated',
                    'Generated a complete AES-256 encrypted database dump.'
                ]
            );
        }
    };
}

module.exports = { createBackupAudit };
