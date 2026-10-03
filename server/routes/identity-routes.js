const { createAccountDirectory } = require('../services/account-directory');
const { normalizeEmail, escapeHtml, emailConfigured, sendEmail } = require('../config/security-config');
const { respond } = require('../services/service-errors');
const { accountStatus } = require('../services/account-status');
const { withCaseReference } = require('../services/case-audit');
const { auditMetadata } = require('../services/system-audit');

function registerIdentityRoutes(app, db, dbConfig) {
    const directory = createAccountDirectory(db);
    // ==========================================
    // 5. IAM (IDENTITY & ACCESS MANAGEMENT)
    // ==========================================

    // Get Pending
    app.get('/api/admin/pending-users', async (req, res) => {
        try {
            const rows = await directory.pendingUsers();
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to fetch pending requests.' });
        }
    });

    // Get Active Personnel Directory (NEW)
    app.get('/api/admin/active-users', async (req, res) => {
        try {
            const rows = await directory.activeUsers();
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to fetch active users.' });
        }
    });

    // Suspend Active User (NEW)
    app.post('/api/admin/suspend-user', async (req, res) => {
        try {
            await accountStatus(db, req, 'suspended', 'User Suspended');
            res.json({ success: true, message: 'User Suspended.' });
        } catch (error) {
            respond(res, error, 'The account could not be updated.');
        }
    });

    // Get Denied/Archived
    app.get('/api/admin/denied-users', async (req, res) => {
        try {
            const rows = await directory.deniedUsers();
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to fetch denied requests.' });
        }
    });

    // Approve User (Sends Email)
    app.post('/api/admin/approve-user', async (req, res) => {
        const { temp_system_id } = req.body;

        try {
            const finalId = temp_system_id;
            const approved = await accountStatus(db, req, 'approved', 'User Approved');
            const userRow = [approved];
            const userEmail = userRow[0].email;
            const userName = userRow[0].first_name;

            let email_delivery = 'not_configured';
            if (emailConfigured() && normalizeEmail(userEmail)) {
                try {
                    await sendEmail({
                        to: normalizeEmail(userEmail),
                        subject: 'LGU access approved: your official system ID',
                        html: `<h2>Account approved</h2><p>Hello ${escapeHtml(userName || '')},</p><p>Your HEALTH-INTEL access request has been approved.</p><p>Your system ID is <strong>${escapeHtml(finalId)}</strong>. Sign in using the password you created.</p>`
                    });
                    email_delivery = 'sent';
                } catch {
                    email_delivery = 'failed';
                }
            }
            const notice =
                email_delivery === 'sent'
                    ? ' The approval email was sent.'
                    : ' The approval email was not sent; check the email configuration and notify the user securely.';
            res.json({
                success: true,
                email_delivery,
                system_id: finalId,
                message: `Account approved. Official ID: ${finalId}.${notice}`
            });
        } catch (error) {
            console.error('Approval Error:', error);
            res.status(500).json({ success: false, error: 'Database error during approval process.' });
        }
    });

    // Deny User
    app.post('/api/admin/deny-user', async (req, res) => {
        try {
            await accountStatus(db, req, 'denied', 'User Request Denied');
            res.json({ success: true, message: 'User Request Denied.' });
        } catch (error) {
            respond(res, error, 'The account could not be updated.');
        }
    });

    // Undo Deny
    app.post('/api/admin/undo-deny', async (req, res) => {
        try {
            await accountStatus(db, req, 'pending', 'Denial Undone');
            res.json({ success: true, message: 'Denial Undone.' });
        } catch (error) {
            respond(res, error, 'The account could not be updated.');
        }
    });

    // Restore Suspended
    app.post('/api/admin/restore-suspended', async (req, res) => {
        try {
            await accountStatus(db, req, 'approved', 'Access Restored');
            res.json({ success: true, message: 'Access Restored.' });
        } catch (error) {
            respond(res, error, 'The account could not be updated.');
        }
    });

    // ==========================================
    // 6. SUPERADMIN EXCLUSIVE APIs
    // ==========================================
    app.get('/api/superadmin/pending-admins', async (req, res) => {
        try {
            const rows = await directory.pendingAdmins();
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to fetch pending admins.' });
        }
    });

    app.post('/api/superadmin/approve-admin', async (req, res) => {
        try {
            await accountStatus(db, req, 'approved', 'Admin Approved');
            res.json({ success: true, message: 'Admin Approved.' });
        } catch (error) {
            respond(res, error, 'The account could not be updated.');
        }
    });

    app.get('/api/superadmin/health', async (req, res) => {
        try {
            const { dbSize, userCount, patientCount, auditCount } = await directory.healthCounts(
                dbConfig.database
            );

            res.json({
                success: true,
                data: {
                    uptime: Math.floor(process.uptime()),
                    db_size: dbSize[0].size_mb ?? 0,
                    total_users: userCount[0].count,
                    total_records: patientCount[0].count,
                    total_logs: auditCount[0].count,
                    status: 'OPTIMAL'
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    // Get ALL users for Superadmin
    app.get('/api/superadmin/users', async (req, res) => {
        try {
            const rows = await directory.users();
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to fetch all users.' });
        }
    });

    app.get('/api/superadmin/admins/:id/history', async (req, res) => {
        try {
            const history = await directory.adminHistory(req.params.id);
            if (!history) return res.status(404).json({success:false,error:'Admin account not found.'});
            res.json({success:true,data:{...history,events:history.events.map(auditMetadata)}});
        } catch (error) {
            res.status(503).json({success:false,error:'Account history could not be loaded. Please try again.'});
        }
    });

    app.get('/api/admin/audit-logs', async (req, res) => {
        try {
            const rows = await directory.adminAudit();
            res.json({ success: true, data: rows.map(withCaseReference) });
        } catch (error) {
            console.error('Audit Error:', error);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.get('/api/superadmin/audit-logs', async (req, res) => {
        try {
            const rows = await directory.masterAudit();

            res.json({ success: true, data: rows.map(auditMetadata) });
        } catch (error) {
            console.error('Audit Error:', error);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });
}

module.exports = { registerIdentityRoutes };
