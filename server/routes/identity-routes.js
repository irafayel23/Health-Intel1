const { normalizeEmail, escapeHtml, emailConfigured, sendEmail } = require('../config/security-config');
const { respond, accountStatus } = require('../services/qa-fixes');
const { withCaseReference } = require('../services/case-audit');

function registerIdentityRoutes(app, db, dbConfig) {
// ==========================================
// 5. IAM (IDENTITY & ACCESS MANAGEMENT)
// ==========================================

// Get Pending
app.get('/api/admin/pending-users', async (req, res) => {
    try {
        const query = `SELECT system_id, email, first_name, last_name, employee_id, role, created_at FROM users WHERE status = 'pending' AND role IN ('bhw', 'mho') ORDER BY created_at DESC`;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch pending requests." });
    }
});

// Get Active Personnel Directory (NEW)
app.get('/api/admin/active-users', async (req, res) => {
    try {
        const query = `SELECT u.system_id, u.email, u.first_name, u.last_name, u.employee_id, u.role, b.name AS assigned_barangay, u.created_at FROM users u LEFT JOIN barangays b ON u.barangay_id = b.id WHERE u.status = 'approved' AND u.role IN ('bhw', 'mho') ORDER BY u.created_at DESC`;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch active users." });
    }
});

// Suspend Active User (NEW)
app.post('/api/admin/suspend-user', async(req,res)=>{try{await accountStatus(db,req,'suspended','User Suspended');res.json({success:true,message:'User Suspended.'});}catch(error){respond(res,error,'The account could not be updated.');}});

// Get Denied/Archived
app.get('/api/admin/denied-users', async (req, res) => {
    try {
        const query = `SELECT system_id, first_name, last_name, employee_id, status FROM users WHERE status IN ('denied', 'suspended') AND role IN ('bhw', 'mho') ORDER BY created_at DESC`;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch denied requests." });
    }
});

// Approve User (Sends Email)
app.post('/api/admin/approve-user', async (req, res) => {
    const { temp_system_id } = req.body; 

    try {
        const finalId=temp_system_id;
        const approved=await accountStatus(db,req,'approved','User Approved');
        const userRow=[approved];
        const userEmail = userRow[0].email;
        const userName = userRow[0].first_name;

        let email_delivery = 'not_configured';
        if (emailConfigured() && normalizeEmail(userEmail)) {
            try {
                await sendEmail({ to:normalizeEmail(userEmail), subject:'LGU access approved: your official system ID',
                    html:`<h2>Account approved</h2><p>Hello ${escapeHtml(userName || '')},</p><p>Your HEALTH-INTEL access request has been approved.</p><p>Your system ID is <strong>${escapeHtml(finalId)}</strong>. Sign in using the password you created.</p>` });
                email_delivery = 'sent';
            } catch { email_delivery = 'failed'; }
        }
        const notice = email_delivery === 'sent' ? ' The approval email was sent.' : ' The approval email was not sent; check the email configuration and notify the user securely.';
        res.json({ success:true, email_delivery, system_id:finalId, message:`Account approved. Official ID: ${finalId}.${notice}` });
    } catch (error) {
        console.error("Approval Error:", error);
        res.status(500).json({ success: false, error: "Database error during approval process." });
    }
});

// Deny User
app.post('/api/admin/deny-user', async(req,res)=>{try{await accountStatus(db,req,'denied','User Request Denied');res.json({success:true,message:'User Request Denied.'});}catch(error){respond(res,error,'The account could not be updated.');}});

// Undo Deny
app.post('/api/admin/undo-deny', async(req,res)=>{try{await accountStatus(db,req,'pending','Denial Undone');res.json({success:true,message:'Denial Undone.'});}catch(error){respond(res,error,'The account could not be updated.');}});

// Restore Suspended
app.post('/api/admin/restore-suspended', async(req,res)=>{try{await accountStatus(db,req,'approved','Access Restored');res.json({success:true,message:'Access Restored.'});}catch(error){respond(res,error,'The account could not be updated.');}});


// ==========================================
// 6. SUPERADMIN EXCLUSIVE APIs
// ==========================================
app.get('/api/superadmin/pending-admins', async (req, res) => {
    try {
        const query = `SELECT system_id, email, first_name, last_name, employee_id, role, created_at FROM users WHERE status = 'pending' AND role = 'admin' ORDER BY created_at DESC`;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch pending admins." });
    }
});

app.post('/api/superadmin/approve-admin', async(req,res)=>{try{await accountStatus(db,req,'approved','Admin Approved');res.json({success:true,message:'Admin Approved.'});}catch(error){respond(res,error,'The account could not be updated.');}});

app.get('/api/superadmin/health', async (req, res) => {
    try {
        const [dbSize] = await db.execute(`SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS "size_mb" FROM information_schema.TABLES WHERE table_schema = ?`, [dbConfig.database]);
        const [userCount] = await db.execute(`SELECT COUNT(*) as count FROM users`);
        const [patientCount] = await db.execute(`SELECT COUNT(*) as count FROM health_cases`);
        const [auditCount] = await db.execute('SELECT COUNT(*) as count FROM system_audit_logs');

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
        const query = `SELECT system_id, email, first_name, last_name, employee_id, role, status, created_at FROM users WHERE role != 'superadmin' ORDER BY created_at DESC`;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch all users." });
    }
});

app.get('/api/admin/audit-logs', async (req, res) => {
    try {
        const query = "SELECT id, user_id, action, timestamp as created_at, role, details FROM system_audit_logs WHERE role != 'SUPERADMIN' AND role != 'Superadmin' AND role != 'Super Admin' ORDER BY timestamp DESC,id DESC";
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows.map(withCaseReference) });
    } catch (error) {
        console.error("Audit Error:", error);
        res.status(500).json({ success: false, error: "Database error" });
    }
});

app.get('/api/superadmin/audit-logs', async (req, res) => {
    try {
        const query = "SELECT id, user_id, action, timestamp as created_at, role, details FROM system_audit_logs ORDER BY timestamp DESC";
        const [rows] = await db.execute(query);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Audit Error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});



}

module.exports = { registerIdentityRoutes };
