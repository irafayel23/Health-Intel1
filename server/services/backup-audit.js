function createBackupAudit(db) {
    return {
        async record(systemId) {
            await db.execute(
                'INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
                [
                    systemId,
                    'Superadmin',
                    'Database Backup Generated',
                    JSON.stringify({summary:'Generated a complete AES-256 encrypted database dump.',target_type:'Backup',target_id:'Database dump',outcome:'Succeeded',delivery:'Backup prepared on the server; file saving is not verified.'})
                ]
            );
        }
    };
}

module.exports = { createBackupAudit };
