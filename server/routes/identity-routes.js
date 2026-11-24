const { createAccountDirectory } = require('../services/account-directory');
const { normalizeEmail, escapeHtml, emailConfigured, sendEmail } = require('../config/security-config');
const { respond } = require('../services/service-errors');
const {store}=require('../services/registration-evidence');
const {registrationEmail}=require('../services/registration-email');
const {registrationHistory}=require('../services/registration-history');
const { accountStatus } = require('../services/account-status');
const { withCaseReference } = require('../services/case-audit');
const { auditMetadata } = require('../services/system-audit');

function registerIdentityRoutes(app, db, dbConfig, {notify=sendEmail,mailReady=emailConfigured,changeStatus=accountStatus}={}) {
    const directory = createAccountDirectory(db);
    app.get('/api/admin/registration-evidence/:id',async(req,res)=>{
        res.set('Cache-Control','no-store');
        try{const [rows]=await db.execute('SELECT role,created_at FROM users WHERE system_id=?',[req.params.id]);if(!rows.length)return res.status(404).json({success:false,error:'Account not found.'});if(!['admin','superadmin'].includes(req.user.role)||(rows[0].role==='admin'&&req.user.role!=='superadmin'))return res.status(403).json({success:false,error:'Not authorized.'});const e=store.read(req.params.id);const [metadata]=await registrationHistory(db,[{system_id:req.params.id,created_at:rows[0].created_at}]);res.json({success:true,data:e?{employee_photo:e.employee_photo,selfie_photo:e.selfie_photo,submitted_at:e.submitted_at,submission:e.submission,submission_count:metadata.submission_count,last_submitted_at:metadata.last_submitted_at,previous_rejection_reason:metadata.previous_rejection_reason,registration_history:metadata.registration_history}:null});}catch{res.status(503).json({success:false,error:'Registration evidence unavailable.'});}
    });
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
            const approved = await changeStatus(db, req, 'approved', 'User Approved');
            const userRow = [approved];
            const userEmail = userRow[0].email;
            const userName = userRow[0].first_name;

            let email_delivery = 'not_configured';
            if (mailReady() && normalizeEmail(userEmail)) {
                try {
                    await notify({to:normalizeEmail(userEmail),...registrationEmail('approved',approved)});
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
            respond(res, error, 'The account could not be approved. Please try again.');
        }
    });

    // Deny User
    app.post('/api/admin/deny-user', async (req, res) => {
        try {
            const account=await changeStatus(db, req, 'denied', 'User Request Denied');
            let email_delivery='not_configured';
            if(mailReady()&&normalizeEmail(account.email)){try{await notify({to:normalizeEmail(account.email),...registrationEmail('denied',account)});email_delivery='sent';}catch{email_delivery='failed';}}
            res.json({success:true,email_delivery,message:'Registration declined.'+(email_delivery==='sent'?' Notification email sent.':' Notification email was not sent; notify the applicant securely.')});
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
