const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const mysql = require('mysql2/promise'); 
const bcrypt = require('bcrypt');        
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); 
const app = express();

app.use(cors());
app.use(express.json()); 

// ==========================================
// 1. DATABASE CONNECTION (The Vault)
// ==========================================
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',      
    password: '',      
    database: 'health_intel'
});

// ==========================================
// 2. SYSTEM ID GENERATOR
// ==========================================
app.post('/api/get-next-id', async (req, res) => {
    const requestedRole = req.body.role;
    let prefix = '';

    if (requestedRole === 'bhw') prefix = 'BHW-';
    else if (requestedRole === 'mho') prefix = 'MHO-';
    else if (requestedRole === 'admin') prefix = 'ADM-'; 
    else return res.status(400).json({ success: false, error: "Invalid role" });

    try {
        const [rows] = await db.execute(
            `SELECT system_id FROM users WHERE system_id LIKE ? ORDER BY system_id DESC LIMIT 1`,
            [`${prefix}%`]
        );

        if (rows.length === 0) {
            return res.json({ success: true, next_id: prefix + '001' });
        }

        const lastId = rows[0].system_id;
        const nextNumber = parseInt(lastId.split('-')[1]) + 1;
        const finalId = prefix + nextNumber.toString().padStart(3, '0');

        res.json({ success: true, next_id: finalId });
    } catch (error) {
        console.error("ID Generation Error:", error);
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// ==========================================
// 3. ZERO-TRUST REGISTRATION
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { first_name, last_name, role, system_id, employee_hr_id, password, email, assigned_barangay } = req.body;
        const finalBarangay = (role === 'bhw') ? assigned_barangay : 'Municipality';
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO users 
            (first_name, last_name, email, role, system_id, employee_hr_id, password_hash, assigned_barangay, account_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `;
        
        await db.execute(query, [first_name, last_name, email, role, system_id, employee_hr_id, hashedPassword, finalBarangay]);
        res.json({ success: true, message: "Registration submitted for HR Approval." });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ success: false, error: "Database error during registration." });
    }
});

// ==========================================
// 4. SECURE LOGIN
// ==========================================
app.post('/api/login', async (req, res) => {
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
        if (user.account_status === 'pending') {
            return res.status(403).json({ success: false, error: "Account pending. Please wait for MHO Admin approval." });
        }
        if (user.account_status === 'denied') {
            return res.status(403).json({ success: false, error: "Account access denied by HR." });
        }

        const token = jwt.sign(
            { system_id: user.system_id, role: user.role }, 
            'your_super_secret_key', 
            { expiresIn: '8h' } 
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
        const query = `SELECT system_id, email, first_name, last_name, employee_hr_id, role, created_at FROM users WHERE account_status = 'pending' AND role IN ('bhw', 'mho') ORDER BY created_at DESC`;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch pending requests." });
    }
});

// Get Active Personnel Directory (NEW)
app.get('/api/admin/active-users', async (req, res) => {
    try {
        const query = `SELECT system_id, email, first_name, last_name, employee_hr_id, role, assigned_barangay, created_at FROM users WHERE account_status = 'approved' AND role IN ('bhw', 'mho') ORDER BY created_at DESC`;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch active users." });
    }
});

// Suspend Active User (NEW)
app.post('/api/admin/suspend-user', async (req, res) => {
    const { system_id } = req.body;
    try {
        await db.execute(`UPDATE users SET account_status = 'denied' WHERE system_id = ?`, [system_id]);
        
        // AUDIT TRAIL LOGGING
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'Admin', 'User Suspended', ?)`,
            ['LGU Admin', `Suspended system access for ID: ${system_id}`]
        );

        res.json({ success: true, message: "User suspended." });
    } catch(error) {
        res.status(500).json({ success: false, error: "Failed to suspend." });
    }
});

// Get Denied/Archived
app.get('/api/admin/denied-users', async (req, res) => {
    try {
        const query = `SELECT system_id, first_name, last_name, employee_hr_id FROM users WHERE account_status = 'denied' ORDER BY created_at DESC`;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch denied requests." });
    }
});

// Approve User (Sends Email)
app.post('/api/admin/approve-user', async (req, res) => {
    const { temp_system_id, assigned_role } = req.body; 

    let prefix = '';
    if (assigned_role === 'bhw') prefix = 'BHW-';
    else if (assigned_role === 'mho') prefix = 'MHO-';
    else if (assigned_role === 'admin') prefix = 'ADM-'; 
    else return res.status(400).json({ success: false, error: "Invalid role assigned." });

    try {
        const [rows] = await db.execute(`SELECT system_id FROM users WHERE system_id LIKE ? ORDER BY system_id DESC LIMIT 1`, [`${prefix}%`]);

        let finalId = prefix + '001'; 
        if (rows.length > 0) {
            const lastId = rows[0].system_id;
            const nextNumber = parseInt(lastId.split('-')[1]) + 1;
            finalId = prefix + nextNumber.toString().padStart(3, '0');
        }

        const updateQuery = `UPDATE users SET system_id = ?, role = ?, account_status = 'approved' WHERE system_id = ?`;
        await db.execute(updateQuery, [finalId, assigned_role, temp_system_id]);

        // AUDIT TRAIL LOGGING
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'Admin', 'User Approved', ?)`,
            ['LGU Admin', `Approved and assigned ID: ${finalId} to role: ${assigned_role}`]
        );

        const [userRow] = await db.execute('SELECT email, first_name FROM users WHERE system_id = ?', [finalId]);
        const userEmail = userRow[0].email;
        const userName = userRow[0].first_name;

        // THE GMAIL DISPATCHER
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: 'yapjohnrichard@gmail.com', pass: 'tdxeywhbxyhlywpc' }
        });

        const mailOptions = {
            from: 'LGU Health Intelligence <yapjohnrichard@gmail.com>', 
            to: userEmail, 
            subject: 'LGU Access Approved: Your Official System ID',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #004b87;">Account Approved</h2>
                    <p>Hello ${userName},</p>
                    <p>Your access request for the HEALTH-INTEL LGU Portal has been approved by Human Resources.</p>
                    <p>Your official System Login ID is: <strong><span style="font-size: 1.2rem; color: #10b981;">${finalId}</span></strong></p>
                    <p>Please use this ID and the password you created to log in.</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) console.log("Email Error: ", error);
        });

        res.json({ success: true, message: `Account Approved! Official ID: ${finalId}.` });
    } catch (error) {
        console.error("Approval Error:", error);
        res.status(500).json({ success: false, error: "Database error during approval process." });
    }
});

// Deny User
app.post('/api/admin/deny-user', async (req, res) => {
    const { temp_system_id } = req.body; 
    try {
        await db.execute(`UPDATE users SET account_status = 'denied' WHERE system_id = ?`, [temp_system_id]);
        
        // AUDIT TRAIL LOGGING
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'Admin', 'User Request Denied', ?)`,
            ['LGU Admin', `Denied registration request for ID: ${temp_system_id}`]
        );

        res.json({ success: true, message: `Account request denied.` });
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error during denial." });
    }
});

// Undo Deny
app.post('/api/admin/undo-deny', async (req, res) => {
    const { temp_system_id } = req.body; 
    try {
        await db.execute(`UPDATE users SET account_status = 'pending' WHERE system_id = ?`, [temp_system_id]);
        res.json({ success: true, message: `Account returned to pending status.` });
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error during undo process." });
    }
});


// ==========================================
// 6. SUPERADMIN EXCLUSIVE APIs
// ==========================================
app.get('/api/superadmin/pending-admins', async (req, res) => {
    try {
        const query = `SELECT system_id, email, first_name, last_name, employee_hr_id, role, created_at FROM users WHERE account_status = 'pending' AND role = 'admin' ORDER BY created_at DESC`;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch pending admins." });
    }
});

app.post('/api/superadmin/approve-admin', async (req, res) => {
    const { system_id } = req.body;
    try {
        await db.execute(`UPDATE users SET account_status = 'approved' WHERE system_id = ?`, [system_id]);
        
        // AUDIT TRAIL LOGGING
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'Super Admin', 'Admin Approved', ?)`,
            ['SYS-ROOT', `Authorized LGU Admin privileges for ID: ${system_id}`]
        );

        res.json({ success: true, message: `LGU Admin ${system_id} is now fully operational.` });
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error during approval." });
    }
});

app.get('/api/superadmin/health', async (req, res) => {
    try {
        const [dbSize] = await db.execute(`SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS "size_mb" FROM information_schema.TABLES WHERE table_schema = "health_intel"`);
        const [userCount] = await db.execute(`SELECT COUNT(*) as count FROM users`);
        const [patientCount] = await db.execute(`SELECT COUNT(*) as count FROM health_cases`);

        res.json({
            success: true,
            data: {
                uptime: Math.floor(process.uptime()), 
                db_size: dbSize[0].size_mb || 1.5,
                total_users: userCount[0].count,
                total_records: patientCount[0].count,
                status: 'OPTIMAL'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/api/superadmin/audit-logs', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM system_audit_logs ORDER BY created_at DESC LIMIT 50`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});


// ==========================================
// 7. PATIENT RECORDS (DATA ENTRY & PROVENANCE)
// ==========================================

// CREATE NEW PATIENT
app.post('/api/patients', async (req, res) => {
    const { first_name, last_name, patient_name, birthdate, age, purok, disease, remarks, status, encoded_by } = req.body;
    
    try {
        const query = `
            INSERT INTO health_cases 
            (first_name, last_name, patient_name, birthdate, age, purok, disease, remarks, status, encoded_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const encoder_name = encoded_by || "System"; 

        const [result] = await db.execute(query, [
            first_name || '', 
            last_name || '', 
            patient_name, 
            birthdate || null, 
            age, 
            purok, 
            disease, 
            remarks || '', 
            status || 'Active', 
            encoder_name
        ]);
        
        // Log to immutable audit trail
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'BHW', 'Patient Encoded', ?)`,
            [encoder_name, `Encoded new case for ${disease} in ${purok}`]
        );

        res.json({ success: true, message: "Patient saved", id: result.insertId });
    } catch (error) {
        console.error("Patient DB Error:", error);
        res.status(500).json({ success: false, error: "Database error." });
    }
});

// READ ACTIVE
app.get('/api/patients', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM health_cases WHERE deleted_at IS NULL ORDER BY created_at DESC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// READ ARCHIVED
app.get('/api/patients/archived', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM health_cases WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// UPDATE STATUS
app.put('/api/patients/:id/status', async (req, res) => {
    const { new_status } = req.body;
    try {
        await db.execute(`UPDATE health_cases SET status = ? WHERE id = ?`, [new_status, req.params.id]);
        res.json({ success: true, message: 'Patient status updated!' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ARCHIVE
app.put('/api/patients/:id/archive', async (req, res) => {
    try {
        await db.execute(`UPDATE health_cases SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);
        
        // AUDIT TRAIL LOGGING
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'Admin', 'Record Archived', ?)`,
            ['System User', `Archived patient record ID: #REC-${req.params.id}`]
        );

        res.json({ success: true, message: 'Record moved to archive.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// RESTORE
app.put('/api/patients/:id/restore', async (req, res) => {
    try {
        await db.execute(`UPDATE health_cases SET deleted_at = NULL WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Record restored successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ==========================================
// 8. DASHBOARD STATS & ANALYTICS
// ==========================================
app.get('/api/bhw-stats', async (req, res) => {
    try {
        const [[total]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE deleted_at IS NULL`);
        const [[active]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status = 'Active' AND deleted_at IS NULL`);
        const [[cleared]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status = 'Cleared' AND deleted_at IS NULL`);

        res.json({ success: true, total: total.count, active: active.count, cleared: cleared.count });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/api/mho-stats', async (req, res) => {
    try {
        const [[activeResult]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status = 'Active' AND deleted_at IS NULL`);
        const [[recoveredResult]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status IN ('Recovered', 'Cleared') AND deleted_at IS NULL`);
        const [[highRiskResult]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status = 'Active' AND disease IN ('Dengue', 'Pneumonia', 'Tuberculosis', 'Animal Bite', 'Animal Bite / Wound') AND deleted_at IS NULL`);
        
        res.json({ success: true, data: { active: activeResult.count, recovered: recoveredResult.count, high_risk: highRiskResult.count } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/api/analytics/demographics', async (req, res) => {
    try {
        const [diseaseStats] = await db.execute(`SELECT disease, COUNT(*) as cases FROM health_cases WHERE status = 'Active' AND deleted_at IS NULL GROUP BY disease ORDER BY cases DESC`);
        res.json({ success: true, data: diseaseStats });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database aggregation failed.' });
    }
});

app.get('/api/get-predictions', (req, res) => {
    const timeframe = req.query.timeframe || 'monthly'; 
    const pythonProcess = spawn('python', ['analytics.py', timeframe]); 
    let dataString = '';

    pythonProcess.stdout.on('data', (data) => { dataString += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { console.error(`Python Error: ${data}`); });
    pythonProcess.on('close', (code) => {
        try {
            const predictions = JSON.parse(dataString);
            if (predictions.error) res.status(500).json({ success: false, error: predictions.error });
            else res.json({ success: true, data: predictions });
        } catch (e) {
            res.status(500).json({ success: false, error: 'Invalid response from AI engine' });
        }
    });
});

// ==========================================
// 9. MASTER DISEASE REGISTRY
// ==========================================
app.post('/api/diseases', async (req, res) => {
    const { name, category, classification } = req.body;
    try {
        await db.execute(`INSERT INTO disease_registry (name, category, classification) VALUES (?, ?, ?)`, [name, category, classification]);
        
        // AUDIT TRAIL LOGGING
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'Admin', 'Registry Updated', ?)`,
            ['LGU Admin', `Added new disease: ${name} (${classification})`]
        );

        res.json({ success: true, message: 'Disease added to registry!' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/api/diseases', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM disease_registry WHERE deleted_at IS NULL ORDER BY name ASC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/api/diseases/archived', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM disease_registry WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.put('/api/diseases/:id/archive', async (req, res) => {
    try {
        await db.execute(`UPDATE disease_registry SET deleted_at = CURRENT_TIMESTAMP, status = 'Archived' WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Disease archived.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.put('/api/diseases/:id/restore', async (req, res) => {
    try {
        await db.execute(`UPDATE disease_registry SET deleted_at = NULL, status = 'Active' WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Disease restored.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ==========================================
// START SERVER
// ==========================================
app.listen(3000, () => {
    console.log('HEALTH-INTEL Server running on http://localhost:3000');
});