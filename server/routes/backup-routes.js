const { createDatabaseDump, sendEncryptedBackup } = require('../services/database-backup');

function registerBackupRoutes(app, db, dbConfig) {
// ==========================================
// SUPERADMIN: SECURE DATABASE BACKUP (ZIPPED)
// ==========================================
let backupInProgress = false;
app.post('/api/superadmin/backup', async (req, res) => {
    const password = req.body.password;
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
        return res.status(400).json({ success: false, error: 'Choose a backup password between 12 and 128 characters.' });
    }
    if (backupInProgress) return res.status(409).json({ success: false, error: 'A backup is already being generated. Please wait.' });
    backupInProgress = true;
    let dump;
    const cancellation = new AbortController();
    res.on('close', () => { if (!res.writableEnded) cancellation.abort(); });
    try {
        dump = await createDatabaseDump(dbConfig, { signal: cancellation.signal });
        await db.execute('INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
            [req.user.system_id, 'Superadmin', 'Database Backup Generated', 'Generated a complete AES-256 encrypted database dump.']);
        res.setHeader('Content-Disposition', 'attachment; filename="health_intel_backup_' + Date.now() + '.zip"');
        res.setHeader('Content-Type', 'application/zip');
        await sendEncryptedBackup(res, dump.filename, password);
    } catch (error) {
        console.error('Backup failed:', error.code || error.message);
        if (!res.headersSent && !res.destroyed) res.status(500).json({ success: false, error: 'Backup failed. Check the MySQL dump utility and database connection.' });
        else if (!res.destroyed) res.destroy();
    } finally {
        try { if (dump) await dump.cleanup(); } finally { backupInProgress = false; }
    }
});


}

module.exports = { registerBackupRoutes };
