require('./security-config').loadEnvironment();
const PDFDocument = require('pdfkit');
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: { success: false, error: "Too many login attempts. Please wait 60 seconds." }
});

const mysql = require('mysql2/promise'); 
const bcrypt = require('bcrypt');
const crypto = require('crypto');
        
const jwt = require('jsonwebtoken');
const { normalizeEmail, validPassword, sessionVersion, escapeHtml, emailConfigured, sendEmail } = require('./security-config');
const { createPasswordRecovery } = require('./password-recovery');
const { validatePatient, ageOnDate, todayInManila } = require('./patient-validation');
const { createAccessControl, loadJwtSecret } = require('./access-control');
const { createDatabaseDump, sendEncryptedBackup } = require('./database-backup');
const { analyticsFilters, caseWhere, sendAnalyticsError } = require('./mho-analytics');
const { monthlyPeriod, isoWeekPeriod } = require('./report-periods');
const { handlers, respond, accountStatus } = require('./qa-fixes');
const { handlers: correctionHandlers } = require('./case-corrections');
const JWT_SECRET = loadJwtSecret();
const projectPython = path.join(__dirname, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const pythonExecutable = process.env.PYTHON_PATH || (fs.existsSync(projectPython) ? projectPython : 'python');
const app = express();

app.use(cors());
app.use(express.json()); 

// ==========================================
// 1. DATABASE CONNECTION (The Vault)
// ==========================================
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'health_intel'
};
const db = mysql.createPool(dbConfig);
const qa = handlers(db);
const corrections = correctionHandlers(db);
app.use('/api', createAccessControl(db, JWT_SECRET));
app.get('/api/session', (req, res) => res.json({ success: true, user: req.user }));

// ==========================================
// 2. SYSTEM ID GENERATOR
// ==========================================
const registrationLimiter = rateLimit({windowMs:15*60*1000,max:30,standardHeaders:true,legacyHeaders:false,message:{success:false,error:'Too many onboarding requests. Please try again later.'}});
app.post('/api/get-next-id', registrationLimiter, qa.previewId);
app.post('/api/check-email', registrationLimiter, qa.checkEmail);
app.post('/api/register', registrationLimiter, qa.register);

// ==========================================
// CHANGE PASSWORD
// ==========================================
app.post('/api/change-password', async (req, res) => {
    const system_id = req.user.system_id;
    const { current_password, new_password } = req.body;
    if (typeof current_password !== 'string' || !validPassword(new_password)) {
        return res.status(400).json({ success: false, error: 'Provide your current password and a new password of at least 8 characters (maximum 72 UTF-8 bytes).' });
    }
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE system_id = ?', [system_id]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: "User not found." });

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);
        
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: "Incorrect current password." });
        }

        const hashedNewPassword = await bcrypt.hash(new_password, 10);
        await db.execute('UPDATE users SET password_hash = ? WHERE system_id = ?', [hashedNewPassword, system_id]);
        
        res.json({ success: true, message: 'Password updated. Please sign in again.' });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ success: false, error: "Database error." });
    }
});


// ==========================================
// PASSWORD RESET SYSTEM
// ==========================================
const recoveryRequestLimiter = rateLimit({ windowMs:15*60*1000, max:10, standardHeaders:true, legacyHeaders:false,
    message:{ success:false, error:'Too many reset-code requests. Please wait 15 minutes.' } });
const recoveryEmailLimiter = rateLimit({ windowMs:15*60*1000, max:3, standardHeaders:true, legacyHeaders:false,
    keyGenerator:req=>normalizeEmail(req.body.email)||'invalid-address',
    message:{ success:false, error:'Too many reset-code requests for this address. Please wait 15 minutes.' } });
const resetAttemptLimiter = rateLimit({ windowMs:15*60*1000, max:10, standardHeaders:true, legacyHeaders:false,
    message:{ success:false, error:'Too many reset attempts. Please wait 15 minutes.' } });
const passwordRecovery = createPasswordRecovery(db,JWT_SECRET,sendEmail,emailConfigured);
app.post('/api/forgot-password', recoveryRequestLimiter, recoveryEmailLimiter, passwordRecovery.forgot);
app.post('/api/reset-password', resetAttemptLimiter, passwordRecovery.reset);

// ==========================================
// 4. SECURE LOGIN
// ==========================================
app.post('/api/login', loginLimiter, async (req, res) => {
    const { system_id, password } = req.body;

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE system_id = ?', [system_id]);
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: "Invalid System ID or Password." });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: "Invalid System ID or Password." });
        }
        if (user.status === 'pending') {
            return res.status(403).json({ success: false, error: "Account pending. Please wait for MHO Admin approval." });
        }
        if (user.status === 'denied') {
            return res.status(403).json({ success: false, error: "Account access denied by HR." });
        }
        if (user.status === 'suspended') {
            return res.status(403).json({ success: false, error: "Account suspended. Please contact MHO HR." });
        }

        const token = jwt.sign(
            { system_id: user.system_id, role: user.role, password_version: sessionVersion(user.password_hash, JWT_SECRET) },
            JWT_SECRET,
            { expiresIn: '8h', algorithm: 'HS256' }
        );

        console.log(`➔ LOGIN SUCCESS: ${user.system_id}`);
        res.json({ success: true, token: token, role: user.role, system_id: user.system_id, redirect: `/${user.role}.html` });    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, error: "Internal server error." });
    }
});

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
        const query = "SELECT id, user_id, action, timestamp as created_at, role, details FROM system_audit_logs WHERE role != 'SUPERADMIN' AND role != 'Superadmin' AND role != 'Super Admin' ORDER BY timestamp DESC";
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
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


// ==========================================
// 7. PATIENT RECORDS (DATA ENTRY & PROVENANCE)
// ==========================================

// CREATE NEW PATIENT
// BHW CONTEXT (NEW API for Dynamic UI)
app.get('/api/bhw/context', async (req, res) => {
    const system_id = req.user.system_id;
    try {
        const [rows] = await db.execute(`
            SELECT u.first_name, u.barangay_id, b.name as barangay_name 
            FROM users u 
            LEFT JOIN barangays b ON u.barangay_id = b.id 
            WHERE u.system_id = ?`, 
        [system_id]);
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// CREATE PATIENT
async function encodingChoices() {
    const [registered]=await db.execute("SELECT name,status,is_archived FROM disease_registry");
    const [historical]=await db.execute("SELECT DISTINCT disease as name FROM health_cases WHERE disease IS NOT NULL AND disease<>'' ORDER BY disease");
    const archived=new Set(registered.filter(row=>row.status==='Archived'||row.is_archived).map(row=>row.name));
    const active=new Set(registered.filter(row=>row.status==='Active'&&!row.is_archived).map(row=>row.name));
    const names=new Set([...active,...historical.filter(row=>!archived.has(row.name)).map(row=>row.name)]);
    return [...names].sort().map(name=>({name,registry_status:active.has(name)?'Active':'Historical name: review pending'}));
}
app.get('/api/bhw/encoding-options', async (req,res)=>{
    try { res.json({success:true,data:await encodingChoices()}); }
    catch { res.status(503).json({success:false,error:'Disease choices could not be loaded.'}); }
});
app.get('/api/mho/walk-in-options', async (req,res)=>{
    try {
        const [barangays]=await db.execute('SELECT id,name FROM barangays ORDER BY name');
        res.json({success:true,data:{barangays,diseases:await encodingChoices()}});
    } catch { res.status(503).json({success:false,error:'Walk-in form choices could not be loaded.'}); }
});
app.get('/api/mho/walk-in-cases', async (req,res)=>{
    try {
        const [rows]=await db.execute(`SELECT h.id,h.patient_name,h.purok,h.disease,h.severity,h.status,DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,b.name AS barangay_name
            FROM health_cases h JOIN barangays b ON b.id=h.barangay_id
            WHERE h.encoded_by=? AND h.is_archived=FALSE ORDER BY h.created_at DESC,h.id DESC LIMIT 25`,[req.user.system_id]);
        res.json({success:true,data:rows});
    } catch { res.status(503).json({success:false,error:'Walk-in cases could not be loaded.'}); }
});

app.get('/api/bhw/puroks', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT DISTINCT TRIM(purok) AS name FROM (
            SELECT purok FROM health_cases WHERE barangay_id=?
            UNION ALL SELECT purok FROM residents WHERE barangay_id=?
        ) AS local_puroks WHERE purok IS NOT NULL AND TRIM(purok)<>'' ORDER BY name`, [req.user.barangay_id, req.user.barangay_id]);
        res.json({ success:true, data: rows.map(row => row.name) });
    } catch { res.status(503).json({success:false,error:'Purok choices could not be loaded.'}); }
});

async function savePatientCase(req, res, brgy_id, actorRole) {
    let patient;
    try { patient=validatePatient(req.body); }
    catch(error) { return res.status(400).json({success:false,error:error.message}); }
    if (!Number.isSafeInteger(brgy_id) || brgy_id < 1) return res.status(400).json({success:false,error:'Select the resident’s barangay.'});
    let connection;
    try {
        connection=await db.getConnection();
        await connection.beginTransaction();
        const [selectedBarangays]=await connection.execute('SELECT id FROM barangays WHERE id=? FOR UPDATE',[brgy_id]);
        if (!selectedBarangays.length) {
            await connection.rollback();
            return res.status(400).json({success:false,error:'Select an existing barangay.'});
        }
        const [registry]=await connection.execute('SELECT name,status,is_archived FROM disease_registry WHERE name=?',[patient.disease]);
        if (registry.some(row=>row.status==='Archived'||row.is_archived)) {
            await connection.rollback();
            return res.status(400).json({success:false,error:'This disease category is archived. Ask the Admin to review it before encoding.'});
        }
        const [known]=await connection.execute('SELECT disease FROM health_cases WHERE disease=? LIMIT 1',[patient.disease]);
        if (!registry.some(row=>row.name===patient.disease && row.status==='Active') && !known.some(row=>row.disease===patient.disease)) {
            await connection.rollback();
            return res.status(400).json({success:false,error:'Select an existing disease name. Ask the Admin to register a new category.'});
        }
        const [duplicates]=await connection.execute('SELECT id FROM health_cases WHERE barangay_id=? AND first_name=? AND last_name=? AND birthdate=? AND disease=? AND date_recorded=? LIMIT 1',
            [brgy_id,patient.first_name,patient.last_name,patient.birthdate,patient.disease,patient.date_recorded]);
        if (duplicates.length) {
            await connection.rollback();
            return res.status(409).json({success:false,code:'POSSIBLE_DUPLICATE',error:'A matching case already exists for this person, disease and date. Review the existing record before encoding again.'});
        }
        const [residents]=await connection.execute('SELECT id FROM residents WHERE first_name=? AND last_name=? AND birthdate=? AND barangay_id=? AND purok=? LIMIT 2',
            [patient.first_name,patient.last_name,patient.birthdate,brgy_id,patient.purok]);
        if (residents.length>1) {
            await connection.rollback();
            return res.status(409).json({success:false,error:'Multiple matching resident profiles need review. Ask the Admin to check them before saving.'});
        }
        let resident_id=residents[0]?.id;
        if (!resident_id) {
            const [resident]=await connection.execute('INSERT INTO residents (first_name,last_name,patient_name,birthdate,age,purok,barangay_id) VALUES (?,?,?,?,?,?,?)',
                [patient.first_name,patient.last_name,patient.patient_name,patient.birthdate,ageOnDate(patient.birthdate,todayInManila()),patient.purok,brgy_id]);
            resident_id=resident.insertId;
        }
        const [result]=await connection.execute('INSERT INTO health_cases (resident_id,first_name,last_name,patient_name,birthdate,age,purok,disease,remarks,status,encoded_by,barangay_id,date_recorded,severity) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [resident_id,patient.first_name,patient.last_name,patient.patient_name,patient.birthdate,patient.age,patient.purok,patient.disease,patient.remarks,patient.status,req.user.system_id,brgy_id,patient.date_recorded,patient.severity]);
        await connection.execute('INSERT INTO system_audit_logs (user_id,role,action,details) VALUES (?,?,?,?)',
            [req.user.system_id,actorRole,actorRole==='MHO'?'Walk-in Case Encoded':'Patient Encoded',`Encoded ${patient.disease} case dated ${patient.date_recorded}; barangay #${brgy_id}; severity ${patient.severity}.`]);
        await connection.commit();
        res.status(201).json({success:true,message:'Patient case saved.',id:result.insertId});
    } catch {
        if(connection) await connection.rollback();
        res.status(503).json({success:false,error:'The case could not be saved. No partial record was kept. Please try again.'});
    } finally { if(connection) connection.release(); }
}
app.post('/api/patients', (req,res)=>savePatientCase(req,res,Number(req.user.barangay_id),'BHW'));
app.post('/api/mho/walk-in-cases', (req,res)=>savePatientCase(req,res,Number(req.body.barangay_id),'MHO'));

// READ ACTIVE (Filtered by Barangay)
app.get('/api/patients', async (req, res) => {
    const { barangay_id } = req.query;
    try {
        const period=(req.query.month!==undefined||req.query.year!==undefined)?monthlyPeriod(req.query.month,req.query.year):null;
        const historical=period && req.query.include_archived==='true';
        let query = `SELECT h.*, b.name as barangay_name FROM health_cases h LEFT JOIN barangays b ON h.barangay_id = b.id WHERE ${historical?'1=1':'h.is_archived = FALSE'}`;
        let params = [];
        if(period){query+=' AND h.date_recorded>=? AND h.date_recorded<?';params.push(period.start,period.end);}
        if (barangay_id && barangay_id !== 'null') {
            query += ` AND h.barangay_id = ?`;
            params.push(barangay_id);
        }
        query += ` ORDER BY created_at DESC`;
        
        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        respond(res,error,'Patient records could not be loaded.');
    }
});

app.get('/api/residents', async (req, res) => {
    const { barangay_id } = req.query;
    try {
        // Get residents + count of their health cases
        let query = `
            SELECT r.*, COUNT(h.id) as case_count 
            FROM residents r
            LEFT JOIN health_cases h ON r.id = h.resident_id
            WHERE 1=1
        `;
        let params = [];
        if (barangay_id && barangay_id !== 'null') {
            query += ` AND r.barangay_id = ?`;
            params.push(barangay_id);
        }
        query += ` GROUP BY r.id ORDER BY r.last_name ASC, r.first_name ASC`;
        
        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Residents error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/api/residents/:id/dossier', async (req, res) => {
    try {
        const residentId = req.params.id;
        // Fetch the resident details
        const [residentRows] = await db.execute("SELECT * FROM residents WHERE id = ?", [residentId]);
        if (residentRows.length === 0) return res.status(404).json({ success: false, error: 'Resident not found' });
        
        // Fetch their full health history from health_cases
        const historySql = 'SELECT * FROM health_cases WHERE resident_id = ?' +
            (req.user.role === 'bhw' ? ' AND barangay_id = ?' : '') + ' ORDER BY date_recorded DESC';
        const [historyRows] = await db.execute(historySql,
            req.user.role === 'bhw' ? [residentId, req.user.barangay_id] : [residentId]);
        
        res.json({ success: true, resident: residentRows[0], history: historyRows });
    } catch (error) {
        console.error("Dossier error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// READ ARCHIVED (Filtered by Barangay)
app.get('/api/patients/archived', async (req, res) => {
    const { barangay_id } = req.query;
    try {
        let query = `SELECT h.*, b.name as barangay_name FROM health_cases h LEFT JOIN barangays b ON h.barangay_id = b.id WHERE h.is_archived = TRUE`;
        let params = [];
        if (barangay_id && barangay_id !== 'null') {
            query += ` AND h.barangay_id = ?`;
            params.push(barangay_id);
        }
        query += ` ORDER BY deleted_at DESC`;
        
        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// UPDATE STATUS
app.put('/api/patients/:id/status', qa.status);
app.get('/api/patients/:id/correction', corrections.get);
app.put('/api/patients/:id/correction', corrections.save);

// ARCHIVE
app.put('/api/patients/:id/archive', qa.archiveCase);


// BHW TREND CHART DATA
app.get('/api/bhw-trend', async (req, res) => {
    const { barangay_id } = req.query;
    try {
        let baseFilter = `WHERE is_archived = FALSE AND YEAR(date_recorded) = YEAR(CURDATE())`;
        let params = [];
        if (barangay_id && barangay_id !== 'null') {
            baseFilter += ` AND barangay_id = ?`;
            params.push(barangay_id);
        }

        const query = `
            SELECT MONTH(date_recorded) as month, COUNT(*) as count 
            FROM health_cases 
            ${baseFilter}
            GROUP BY MONTH(date_recorded)
            ORDER BY month ASC
        `;
        const [rows] = await db.execute(query, params);
        
        // Initialize 12 months with 0
        let monthlyData = new Array(12).fill(0);
        rows.forEach(row => {
            monthlyData[row.month - 1] = row.count;
        });

        // Get the last 5 months based on current month, or just Jan-May if it's early in the year?
        // Let's just return the whole year and let frontend decide, or return Jan-May.
        // Actually, just returning the whole 12 months is standard.
        res.json({ success: true, data: monthlyData });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/api/heatmap-data', async (req, res) => {
    try {
        const disease = req.query.disease === undefined ? '' : req.query.disease;
        if (typeof disease !== 'string' || disease.length > 255 || /[<>\x00-\x1f\x7f]/.test(disease)) return res.status(400).json({success:false,error:'Select a valid disease filter.'});
        const query = `
            SELECT b.id as barangay_id, b.name as barangay_name, b.latitude, b.longitude,
                COUNT(h.id) as cases,
                SUM(CASE WHEN h.severity = 'Mild' THEN 1 ELSE 0 END) as mild,
                SUM(CASE WHEN h.severity = 'Monitored' THEN 1 ELSE 0 END) as monitored,
                SUM(CASE WHEN h.severity = 'High Risk' THEN 1 ELSE 0 END) as high_risk
            FROM barangays b
            LEFT JOIN health_cases h ON h.barangay_id = b.id AND h.status = 'Active' AND h.is_archived = FALSE AND (? = '' OR h.disease = ?)
            GROUP BY b.id, b.name, b.latitude, b.longitude
        `;
        const [rows] = await db.execute(query, [disease, disease]);
        const [highRiskRows] = await db.execute(`
            SELECT h.barangay_id,
                COALESCE(NULLIF(TRIM(h.disease), ''), 'Not recorded') AS disease,
                COUNT(*) AS cases
            FROM health_cases h
            WHERE h.status = 'Active' AND h.is_archived = FALSE AND h.severity = 'High Risk'
                AND (? = '' OR h.disease = ?)
            GROUP BY h.barangay_id, COALESCE(NULLIF(TRIM(h.disease), ''), 'Not recorded')
            ORDER BY h.barangay_id, cases DESC, disease ASC
        `, [disease, disease]);
        const highRiskByBarangay = new Map();
        for (const row of highRiskRows) {
            const key = String(row.barangay_id);
            if (!highRiskByBarangay.has(key)) highRiskByBarangay.set(key, []);
            highRiskByBarangay.get(key).push({ disease: row.disease, cases: Number(row.cases) });
        }
        const data = rows.map(r => {
            const cases = Number(r.cases);
            const severityCounts = {
                mild: Number(r.mild),
                monitored: Number(r.monitored),
                high_risk: Number(r.high_risk)
            };
            severityCounts.unknown = Math.max(0, cases - severityCounts.mild - severityCounts.monitored - severityCounts.high_risk);

            let risk = 'No active cases';
            let color = '#64748b';
            let colorReason = 'No active, non-archived cases are recorded.';
            if (severityCounts.high_risk > 0) {
                risk = 'High Risk';
                color = '#dc2626';
                colorReason = 'At least one active case is recorded as High Risk.';
            } else if (severityCounts.monitored > 0) {
                risk = 'Monitored';
                color = '#ea580c';
                colorReason = 'At least one active case is Monitored; none is recorded as High Risk.';
            } else if (severityCounts.unknown > 0) {
                risk = 'Severity incomplete';
                color = '#7c3aed';
                colorReason = 'Some active cases have missing or unrecognized severity.';
            } else if (cases > 0) {
                risk = 'Mild';
                color = '#16a34a';
                colorReason = 'All active cases are recorded as Mild.';
            }

            return {
                id: r.barangay_id,
                name: r.barangay_name,
                lat: parseFloat(r.latitude),
                lng: parseFloat(r.longitude),
                cases,
                severity_counts: severityCounts,
                high_risk_diseases: highRiskByBarangay.get(String(r.barangay_id)) || [],
                risk: risk,
                color: color,
                color_reason: colorReason
            };
        });

        res.json({ success: true, data, selected_disease: disease || null, fetched_at: new Date().toISOString() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// RESTORE
app.put('/api/patients/:id/restore', qa.restoreCase);

// ==========================================
// 8. DASHBOARD STATS & ANALYTICS
// ==========================================
app.get('/api/bhw-stats', async (req, res) => {
    const { barangay_id } = req.query;
    try {
        let baseFilter = `WHERE is_archived = FALSE`;
        let params = [];
        if (barangay_id && barangay_id !== 'null') {
            baseFilter += ` AND barangay_id = ?`;
            params.push(barangay_id);
        }

        const [[total]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases ${baseFilter}`, params);
        const [[active]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases ${baseFilter} AND status = 'Active'`, params);
        const [[cleared]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases ${baseFilter} AND status = 'Cleared'`, params);
        const [[mild]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases ${baseFilter} AND status = 'Active' AND severity = 'Mild'`, params);
        const [[monitored]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases ${baseFilter} AND status = 'Active' AND severity = 'Monitored'`, params);
        const [[high_risk]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases ${baseFilter} AND status = 'Active' AND severity = 'High Risk'`, params);

        res.json({ success: true, total: total.count, active: active.count, cleared: cleared.count, mild: mild.count, monitored: monitored.count, high_risk: high_risk.count });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/api/mho-stats', async (req, res) => {
    try {
        const [[activeResult]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status = 'Active' AND is_archived = FALSE`);
        const [[recoveredResult]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status IN ('Recovered', 'Cleared') AND is_archived = FALSE`);
        const [[highRiskResult]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status = 'Active' AND disease IN ('Dengue', 'Pneumonia', 'Tuberculosis', 'Animal Bite', 'Animal Bite / Wound') AND is_archived = FALSE`);
        
        res.json({ success: true, data: { active: activeResult.count, recovered: recoveredResult.count, high_risk: highRiskResult.count } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/api/analytics/demographics', async (req, res) => {
    try {
        const [diseaseStats] = await db.execute(`SELECT disease, COUNT(*) as cases FROM health_cases WHERE status = 'Active' AND is_archived = FALSE GROUP BY disease ORDER BY cases DESC`);
        res.json({ success: true, data: diseaseStats });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database aggregation failed.' });
    }
});

app.get('/api/get-predictions', (req, res) => {
    res.status(400).json({ success: false, error: 'Select a disease and barangay through /api/predict.' });
});

// ==========================================
// 9. MASTER DISEASE REGISTRY
// ==========================================
app.post('/api/diseases', qa.disease);

app.get('/api/diseases', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM disease_registry WHERE is_archived = FALSE ORDER BY name ASC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/api/diseases/archived', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM disease_registry WHERE is_archived = TRUE ORDER BY deleted_at DESC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.put('/api/diseases/:id/archive', qa.archiveDisease);

app.put('/api/diseases/:id/restore', qa.restoreDisease);

// ==========================================
// MHO DESCRIPTIVE STATS API
// ==========================================
app.get('/api/mho/stats', async (req, res) => {
    try {
        const filters = analyticsFilters(req.query);
        const where = caseWhere(filters, { deathsOnly: filters.category === 'mortality' });
        const [rows] = await db.execute(`SELECT disease, COUNT(*) as cases FROM health_cases WHERE ${where.sql} GROUP BY disease ORDER BY cases DESC, disease ASC`, where.params);
        const [[summary]] = await db.execute(`SELECT COUNT(*) as total_cases, COALESCE(SUM(age IS NULL OR age < 0 OR age > 130),0) as unknown_age_cases, DATE_FORMAT(MIN(date_recorded),'%Y-%m-%d') as first_recorded, DATE_FORMAT(MAX(date_recorded),'%Y-%m-%d') as last_recorded FROM health_cases WHERE ${where.sql}`, where.params);
        summary.leading_categories = rows.filter(row => row.cases === rows[0]?.cases).length;
        res.json({ success: true, data: rows.slice(0, 10), summary, filters });
    } catch (error) {
        if (!error.status) console.error("Stats Error:", error);
        sendAnalyticsError(res, error);
    }
});

// ==========================================
// DEMONSTRATION FORECAST API (AR(1), validation pending)
// ==========================================
app.get('/api/predict', async (req, res) => {
    const { disease, barangay } = req.query;
    if (typeof disease !== 'string' || typeof barangay !== 'string' || !disease || !barangay || disease.length > 255 || barangay.length > 255) {
        return res.status(400).json({ success: false, error: 'Select a disease and barangay.' });
    }
    try {
        const [places]=await db.execute('SELECT name FROM barangays WHERE name=?',[barangay]);
        const [categories]=await db.execute('SELECT disease FROM health_cases WHERE disease=? LIMIT 1',[disease]);
        if(!places.length||!categories.length)return res.status(400).json({success:false,error:'Select an existing barangay and disease with recorded history.'});
    } catch {return res.status(503).json({success:false,error:'Forecast selections could not be checked. Please try again.'});}
    let pythonProcess;
    try {
        pythonProcess = spawn(pythonExecutable, [__dirname + '/analytics.py', disease, barangay], { windowsHide: true });
    } catch {
        return res.status(503).json({ success: false, error: 'Forecast engine could not start. Check the Python installation.' });
    }
    let finished = false;
    const finish = (status, payload) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (!res.destroyed) res.status(status).json(payload);
    };
    const timer = setTimeout(() => {
        pythonProcess.kill();
        finish(504, { success: false, error: 'Forecast timed out. Please try again.' });
    }, 120000);
    res.on('close', () => { if (!finished) { finished = true; clearTimeout(timer); pythonProcess.kill(); } });
    pythonProcess.on('error', () => finish(503, { success: false, error: 'Forecast engine could not start. Check the Python installation.' }));
    
    let dataString = '';
    pythonProcess.stdout.on('data', (data) => { dataString += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { console.error(`Python Error: ${data}`); });
    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            return finish(503, { success: false, error: 'Forecast engine failed. Check its data and Python dependencies.' });
        }
        try {
            const predictions = JSON.parse(dataString);
            if (!predictions.success) return finish(422, { success: false, error: predictions.error || 'Not enough data to generate a forecast.' });
            finish(200, { success: true, data: predictions });
        } catch (e) {
            finish(502, { success: false, error: 'The forecast engine returned an invalid response.' });
        }
    });
});

// ==========================================
// MHO KPI STATS API
// ==========================================
app.get('/api/mho/kpi', async (req, res) => {
    try {
        const filters = analyticsFilters(req.query);
        const where = caseWhere(filters);
        const [[counts]] = await db.execute(`SELECT COUNT(*) as total,
            COALESCE(SUM(status = 'Active' AND is_archived = FALSE),0) as active,
            COALESCE(SUM(status IN ('Cleared','Recovered')),0) as recovered,
            COALESCE(SUM(status = 'Active' AND is_archived = FALSE AND severity = 'High Risk'),0) as highRisk
            FROM health_cases WHERE ${where.sql}`, where.params);
        res.json({ success: true, ...counts, filters });
    } catch (error) {
        if (!error.status) console.error("KPI Error:", error);
        sendAnalyticsError(res, error);
    }
});

// ==========================================
// MHO YOY MORBIDITY API
// ==========================================
app.get('/api/mho/yoy', async (req, res) => {
    try {
        const filters = analyticsFilters(req.query);
        const currentYear = filters.year === 'all' ? Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date())) : Number(filters.year);
        const previousYear = currentYear - 1;
        const where = caseWhere(filters, { includeYear: false });
        const [rows] = await db.execute(`SELECT disease,
            SUM(YEAR(date_recorded) = ?) as previous_cases,
            SUM(YEAR(date_recorded) = ?) as current_cases
            FROM health_cases WHERE ${where.sql} AND YEAR(date_recorded) IN (?,?)
            GROUP BY disease ORDER BY COUNT(*) DESC, disease ASC LIMIT 4`, [previousYear, currentYear, ...where.params, previousYear, currentYear]);
        res.json({ success: true, data: rows, previous_year: previousYear, current_year: currentYear, filters });
    } catch (error) {
        if (!error.status) console.error("YOY Error:", error);
        sendAnalyticsError(res, error);
    }
});

// ==========================================
// MHO LEADING MORTALITY API
// ==========================================
app.get('/api/mho/mortality', async (req, res) => {
    try {
        const filters = analyticsFilters(req.query);
        const where = caseWhere(filters, { deathsOnly: true });
        const [rows] = await db.execute(`SELECT disease, COUNT(*) as count FROM health_cases WHERE ${where.sql} GROUP BY disease ORDER BY count DESC, disease ASC LIMIT 5`, where.params);
        res.json({ success: true, data: rows, filters });
    } catch (error) {
        if (!error.status) console.error("Mortality Error:", error);
        sendAnalyticsError(res, error);
    }
});

// ==========================================
// MHO REPORTS: FHSIS PDF
// ==========================================
app.get('/api/mho/reports/fhsis', async (req, res) => {
    try {
        const { month, year } = req.query;
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const period = monthlyPeriod(month,year);
        
        const [rows] = await db.execute(
            "SELECT h.disease,h.status,d.category,COUNT(*) as count FROM health_cases h LEFT JOIN disease_registry d ON d.name=h.disease WHERE h.date_recorded>=? AND h.date_recorded<? GROUP BY h.disease,h.status,d.category ORDER BY count DESC",
             [period.start, period.end]
        );
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-disposition', "attachment; filename=FHSIS_Report_" + month + "_" + year + ".pdf");
        res.setHeader('Content-type', 'application/pdf');
        
        doc.pipe(res);
        
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('REPUBLIC OF THE PHILIPPINES', { align: 'center' });
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#0284c7').text('DEPARTMENT OF HEALTH', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#475569').text('Field Health Services Information System (FHSIS)', { align: 'center' });
        doc.fontSize(10).text('Municipal Health Office - Murcia, Negros Occidental', { align: 'center' });
        
        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1.5).strokeColor('#0284c7').stroke();
        doc.moveDown(1);
        
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text("MONTHLY CONSOLIDATION REPORT", { align: 'center' });
        doc.fontSize(11).font('Helvetica').fillColor('#64748b').text("Period: " + month + " " + year, { align: 'center' });
        doc.moveDown(2);
        
        if (rows.length === 0) {
            doc.fontSize(12).font('Helvetica-Oblique').fillColor('#94a3b8').text("No health records found for " + month + " " + year + ".", { align: 'center' });
        } else {
            let startY = doc.y;
            doc.rect(50, startY - 5, 495, 25).fill('#f1f5f9');
            
            doc.font('Helvetica-Bold').fillColor('#334155').fontSize(11);
            doc.text('No.', 60, startY);
            doc.text('Disease / Indicator', 110, startY);
            doc.text('Category', 300, startY);
            doc.text('Status', 390, startY);
            doc.text('Total Cases', 470, startY);
            
            doc.moveDown(1.5);
            let total = 0;
            
            doc.font('Helvetica').fillColor('#0f172a').fontSize(10);
            
            rows.forEach((r, index) => {
                let currentY = doc.y;
                doc.moveTo(50, currentY - 5).lineTo(545, currentY - 5).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
                
                doc.text((index + 1).toString(), 60, currentY);
                doc.font('Helvetica-Bold').fillColor('#0284c7').text(r.disease, 110, currentY);
                doc.font('Helvetica').fillColor('#475569').text(r.category ? (r.category==='mortality'?'Mortality':'Morbidity') : 'Unclassified', 300, currentY);
                doc.text(r.status, 390, currentY);
                doc.font('Helvetica-Bold').fillColor('#0f172a').text(r.count.toString(), 470, currentY);
                
                total += r.count;
                doc.moveDown(1.2);
            });
            
            let finalY = doc.y;
            doc.moveTo(50, finalY - 5).lineTo(545, finalY - 5).lineWidth(1.5).strokeColor('#0284c7').stroke();
            doc.rect(50, finalY, 495, 25).fill('#f8fafc');
            doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(11).text('GRAND TOTAL', 60, finalY + 7);
            doc.text(total.toString(), 470, finalY + 7);
        }
        
        doc.moveDown(6);
        doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(11).text('CERTIFICATION:', 50, doc.y);
        doc.moveDown(0.5);
        doc.font('Helvetica').fillColor('#475569').fontSize(10).text('I hereby certify that the above data is true and correct based on the consolidated reports submitted by the Barangay Health Stations.', 50, doc.y, { width: 495 });
        
        doc.moveDown(4);
        doc.moveTo(350, doc.y).lineTo(545, doc.y).lineWidth(1).strokeColor('#0f172a').stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fillColor('#0f172a').text('Municipal Health Officer', 350, doc.y, { align: 'center', width: 195 });
        doc.font('Helvetica').fillColor('#64748b').text('Signature over Printed Name', 350, doc.y, { align: 'center', width: 195 });
        
        doc.end();
        
    } catch (error) {
        if(!error.status) console.error("FHSIS Report Error:", error.code || error.name);
        respond(res,error,"Report generation failed.");
    }
});

// ==========================================
// MHO REPORTS: PIDSR PDF
// ==========================================
app.get('/api/mho/reports/pidsr', async (req, res) => {
    try {
        const period=isoWeekPeriod(req.query.week,req.query.year);
        const weekNum=period.week;
        
        const [rows] = await db.execute(
            "SELECT disease, barangay_id, status, severity, date_recorded FROM health_cases WHERE date_recorded>=? AND date_recorded<? ORDER BY date_recorded DESC",
             [period.start,period.end]
        );
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-disposition', "attachment; filename=PIDSR_" + period.year + "_Week_" + weekNum + "_Report.pdf");
        res.setHeader('Content-type', 'application/pdf');
        
        doc.pipe(res);
        
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('REPUBLIC OF THE PHILIPPINES', { align: 'center' });
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#ef4444').text('DEPARTMENT OF HEALTH', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#475569').text('Philippine Integrated Disease Surveillance and Response (PIDSR)', { align: 'center' });
        doc.fontSize(10).text('Municipal Health Office - Murcia, Negros Occidental', { align: 'center' });
        
        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1.5).strokeColor('#ef4444').stroke();
        doc.moveDown(1);
        
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text("WEEKLY SURVEILLANCE REPORT", { align: 'center' });
        doc.fontSize(11).font('Helvetica').fillColor('#64748b').text("Week " + weekNum + ", " + period.year + " (Monday-Sunday)", { align: 'center' });
        doc.moveDown(2);
        
        if (rows.length === 0) {
            doc.fontSize(12).font('Helvetica-Oblique').fillColor('#10b981').text("No case records found for the selected week. Reporting completeness is not established.", { align: 'center' });
        } else {
            let startY = doc.y;
            doc.rect(50, startY - 5, 495, 25).fill('#fef2f2');
            
            doc.font('Helvetica-Bold').fillColor('#7f1d1d').fontSize(11);
            doc.text('Date Recorded', 60, startY);
            doc.text('Target Disease', 180, startY);
            doc.text('Recorded Severity', 340, startY);
            doc.text('Status', 450, startY);
            
            doc.moveDown(1.5);
            
            doc.font('Helvetica').fillColor('#0f172a').fontSize(10);
            
            rows.forEach((r, index) => {
                let currentY = doc.y;
                doc.moveTo(50, currentY - 5).lineTo(545, currentY - 5).lineWidth(0.5).strokeColor('#fecaca').stroke();
                
                const dateStr = new Date(r.date_recorded).toLocaleDateString();
                doc.text(dateStr, 60, currentY);
                doc.font('Helvetica-Bold').fillColor('#ef4444').text(r.disease, 180, currentY);
                
                let actionLevel = r.severity || 'Not recorded';
                
                doc.font('Helvetica-Oblique').fillColor(actionLevel === 'High Risk' ? '#dc2626' : '#ea580c').text(actionLevel, 340, currentY);
                doc.font('Helvetica-Bold').fillColor('#ef4444').text(r.status, 450, currentY);
                
                doc.moveDown(1.2);
            });
            
            let finalY = doc.y;
            doc.moveTo(50, finalY - 5).lineTo(545, finalY - 5).lineWidth(1.5).strokeColor('#ef4444').stroke();
            doc.rect(50, finalY, 495, 25).fill('#fff1f2');
            doc.font('Helvetica-Bold').fillColor('#7f1d1d').fontSize(11).text('TOTAL RECORDED CASES', 60, finalY + 7);
            doc.text(rows.length.toString(), 450, finalY + 7);
        }
        
        doc.moveDown(6);
        doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(11).text('PREPARED BY:', 50, doc.y);
        doc.moveDown(2.5);
        doc.moveTo(50, doc.y).lineTo(245, doc.y).lineWidth(1).strokeColor('#0f172a').stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fillColor('#0f172a').text('Epidemiology Surveillance Officer', 50, doc.y, { align: 'center', width: 195 });
        
        doc.end();
        
    } catch (error) {
        if(!error.status) console.error("PIDSR Report Error:", error.code || error.name);
        respond(res,error,"Report generation failed.");
    }
});

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

if (require.main === module) {
    app.listen(Number(process.env.PORT || 3000), () => {
        console.log('HEALTH-INTEL server is ready.');
    });
}
module.exports = { app, db, dbConfig };
