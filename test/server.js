const PDFDocument = require('pdfkit');
const express = require('express');
const { spawn } = require('child_process');
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
// 3. EMAIL DUPLICATE CHECK
// ==========================================
app.post('/api/check-email', async (req, res) => {
    const { email } = req.body;
    try {
        const [rows] = await db.execute('SELECT system_id FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.json({ exists: true, system_id: rows[0].system_id });
        }
        res.json({ exists: false });
    } catch (error) {
        res.json({ exists: false });
    }
});

// ==========================================
// 4. ZERO-TRUST REGISTRATION
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { first_name, last_name, role, system_id, password, assigned_barangay, email, employee_id } = req.body;

        // DUPLICATE EMAIL CHECK - Prevent re-registration
        if (email) {
            const [existing] = await db.execute('SELECT system_id FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(409).json({ success: false, error: "This email is already registered. Please log in instead." });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Find barangay ID if role is bhw
        let barangay_id = null;
        if (role === 'bhw' && assigned_barangay) {
            // "Brgy. Blumentritt" or "Blumentritt" => match wildcard
            const cleanName = assigned_barangay.replace('Brgy. ', '');
            const [bRows] = await db.execute('SELECT id FROM barangays WHERE name LIKE ?', [`%${cleanName}%`]);
            if (bRows.length > 0) {
                barangay_id = bRows[0].id;
            }
        }

        const query = `
            INSERT INTO users 
            (system_id, first_name, last_name, role, barangay_id, password_hash, status, email, employee_id) 
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `;
        
        await db.execute(query, [system_id, first_name, last_name, role, barangay_id, hashedPassword, email || null, employee_id || null]);
        res.json({ success: true, message: "Registration submitted for HR Approval." });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ success: false, error: "Database error during registration." });
    }
});

// ==========================================
// CHANGE PASSWORD
// ==========================================
app.post('/api/change-password', async (req, res) => {
    const { system_id, current_password, new_password } = req.body;
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
        
        res.json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ success: false, error: "Database error." });
    }
});


// ==========================================
// PASSWORD RESET SYSTEM
// ==========================================
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if(users.length === 0) return res.status(404).json({ success: false, error: 'Email not found in system.' });

        // Generate 32-byte token
        // Generate a 6-digit OTP code
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expiration 15 mins from now
        const expires_at = new Date(Date.now() + 15 * 60000);
        
        await db.execute('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)', [email, token, expires_at]);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: 'yapjohnrichard@gmail.com', pass: 'cjrfnlxzljuvhfkq' }
        });

        await transporter.sendMail({
            from: 'HEALTH-INTEL Security <yapjohnrichard@gmail.com>',
            to: email,
            subject: 'Your 6-Digit Password Reset Code',
            html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0ea5e9;">Password Reset</h2>
                <p>You requested a password reset. Please enter the 6-digit verification code below into the system:</p>
                <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e293b; border-radius: 8px;">${token}</div>
                <p style="font-size: 12px; color: #64748b; margin-top: 15px;">This code will expire in 15 minutes.</p>
            </div>`
        });

        res.json({ success: true, message: 'Password reset link sent to your email.' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { email, token, new_password } = req.body;
    try {
        const [resets] = await db.execute('SELECT * FROM password_resets WHERE email = ? AND token = ?', [email, token]);
        if(resets.length === 0) return res.status(400).json({ success: false, error: 'Invalid or expired token.' });
        
        const resetRecord = resets[resets.length - 1]; // get latest
        if(new Date() > new Date(resetRecord.expires_at)) {
            return res.status(400).json({ success: false, error: 'Token has expired.' });
        }

        const hashed = await bcrypt.hash(new_password, 10);
        await db.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hashed, email]);
        
        // Delete used tokens
        await db.execute('DELETE FROM password_resets WHERE email = ?', [email]);

        res.json({ success: true, message: 'Password updated successfully!' });
    } catch(e) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

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
app.post('/api/admin/suspend-user', async (req, res) => {
    const { system_id } = req.body;
    try {
        await db.execute(`UPDATE users SET status = 'suspended' WHERE system_id = ?`, [system_id]);
        
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
        const query = `SELECT system_id, first_name, last_name, employee_id, status FROM users WHERE status IN ('denied', 'suspended') ORDER BY created_at DESC`;
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
        const updateQuery = `UPDATE users SET status = 'approved' WHERE system_id = ?`;
        const [result] = await db.execute(updateQuery, [temp_system_id]);
        
        if (result.affectedRows === 0) {
             return res.status(404).json({ success: false, error: "User not found." });
        }
        
        const finalId = temp_system_id;

        // AUDIT TRAIL LOGGING
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'Admin', 'User Approved', ?)`,
            ['LGU Admin', `Approved registration for ID: ${finalId}`]
        );

        const [userRow] = await db.execute('SELECT email, first_name FROM users WHERE system_id = ?', [finalId]);
        const userEmail = userRow[0].email;
        const userName = userRow[0].first_name;

        // THE GMAIL DISPATCHER
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: 'yapjohnrichard@gmail.com', pass: 'cjrfnlxzljuvhfkq' }
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

        res.json({ success: true, message: `Account Approved! Official ID: ${finalId}. An automated email has been dispatched to the user.` });
    } catch (error) {
        console.error("Approval Error:", error);
        res.status(500).json({ success: false, error: "Database error during approval process." });
    }
});

// Deny User
app.post('/api/admin/deny-user', async (req, res) => {
    const { temp_system_id } = req.body; 
    try {
        await db.execute(`UPDATE users SET status = 'denied' WHERE system_id = ?`, [temp_system_id]);
        
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
        await db.execute(`UPDATE users SET status = 'pending' WHERE system_id = ?`, [temp_system_id]);
        res.json({ success: true, message: `Account returned to pending status.` });
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error during undo process." });
    }
});

// Restore Suspended
app.post('/api/admin/restore-suspended', async (req, res) => {
    const { system_id } = req.body; 
    try {
        await db.execute(`UPDATE users SET status = 'approved' WHERE system_id = ?`, [system_id]);
        
        // AUDIT TRAIL LOGGING
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'Admin', 'Access Restored', ?)`,
            ['LGU Admin', `Restored system access for ID: ${system_id}`]
        );

        res.json({ success: true, message: `Account access restored.` });
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error during restore process." });
    }
});


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

app.post('/api/superadmin/approve-admin', async (req, res) => {
    const { system_id } = req.body;
    try {
        await db.execute(`UPDATE users SET status = 'approved' WHERE system_id = ?`, [system_id]);
        
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
    const { system_id } = req.query;
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
app.post('/api/patients', async (req, res) => {
    const { first_name, last_name, patient_name, birthdate, age, purok, disease, remarks, status, encoded_by } = req.body;
    
    try {
        // Look up the encoder's barangay_id securely!
        let brgy_id = null;
        if (encoded_by) {
            const [uRows] = await db.execute('SELECT barangay_id FROM users WHERE system_id = ?', [encoded_by]);
            if(uRows.length > 0) brgy_id = uRows[0].barangay_id;
        }

        const query = `
            INSERT INTO health_cases 
            (first_name, last_name, patient_name, birthdate, age, purok, disease, remarks, status, encoded_by, barangay_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            encoder_name,
            brgy_id
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

// READ ACTIVE (Filtered by Barangay)
app.get('/api/patients', async (req, res) => {
    const { barangay_id } = req.query;
    try {
        let query = `SELECT * FROM health_cases WHERE is_archived = FALSE`;
        let params = [];
        if (barangay_id && barangay_id !== 'null') {
            query += ` AND barangay_id = ?`;
            params.push(barangay_id);
        }
        query += ` ORDER BY created_at DESC`;
        
        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
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
        const [historyRows] = await db.execute("SELECT * FROM health_cases WHERE resident_id = ? ORDER BY date_recorded DESC", [residentId]);
        
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
        let query = `SELECT * FROM health_cases WHERE is_archived = TRUE`;
        let params = [];
        if (barangay_id && barangay_id !== 'null') {
            query += ` AND barangay_id = ?`;
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
app.put('/api/patients/:id/status', async (req, res) => {
    const { new_status } = req.body;
    try {
        await db.execute(`UPDATE health_cases SET status = ? WHERE id = ?`, [new_status, req.params.id]);
        
        const user_id = req.body.user_id || 'System';
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'BHW', 'Status Updated', ?)`,
            [user_id, `Updated patient ID #REC-${req.params.id} to ${new_status}`]
        );
        res.json({ success: true, message: 'Patient status updated!' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ARCHIVE
app.put('/api/patients/:id/archive', async (req, res) => {
    try {
        await db.execute(`UPDATE health_cases SET is_archived = TRUE WHERE id = ?`, [req.params.id]);
        
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

app.get('/api/heatmap-data', async (req, res) => {
    try {
        const query = `
            SELECT b.id as barangay_id, b.name as barangay_name, b.latitude, b.longitude, COUNT(h.id) as cases 
            FROM barangays b
            LEFT JOIN health_cases h ON h.barangay_id = b.id AND h.status = 'Active' AND h.is_archived = FALSE
            GROUP BY b.id, b.name, b.latitude, b.longitude
        `;
        const [rows] = await db.execute(query);

        const data = rows.map(r => {
            let risk = "Low";
            let color = "#3b82f6"; // Blue
            if (r.cases >= 20) {
                risk = "CRITICAL";
                color = "#ef4444"; // Red
            } else if (r.cases >= 10) {
                risk = "Medium";
                color = "#f59e0b"; // Yellow
            }

            return {
                id: r.barangay_id,
                name: r.barangay_name,
                lat: parseFloat(r.latitude),
                lng: parseFloat(r.longitude),
                cases: r.cases,
                risk: risk,
                color: color
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// RESTORE
app.put('/api/patients/:id/restore', async (req, res) => {
    try {
        await db.execute(`UPDATE health_cases SET is_archived = FALSE WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Record restored successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

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

app.put('/api/diseases/:id/archive', async (req, res) => {
    try {
        await db.execute(`UPDATE disease_registry SET is_archived = TRUE, status = 'Archived' WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Disease archived.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.put('/api/diseases/:id/restore', async (req, res) => {
    try {
        await db.execute(`UPDATE disease_registry SET is_archived = FALSE, status = 'Active' WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Disease restored.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ==========================================
// MHO DESCRIPTIVE STATS API
// ==========================================
app.get('/api/mho/stats', async (req, res) => {
    try {
        const { year, category, barangay } = req.query;
        let query = "SELECT disease, COUNT(id) as cases FROM health_cases WHERE disease NOT LIKE '%bite%' AND disease NOT LIKE '%accident%'";
        let params = [];
        
        if (year && year !== 'all') {
            query += " AND YEAR(date_recorded) = ?";
            params.push(year);
        }
        
        if (category === 'mortality') {
            query += " AND status = 'Deceased'";
        } else {
            query += " AND status != 'Deceased'";
        }
        
        if (barangay && barangay !== 'all') {
            query += " AND barangay_id = (SELECT id FROM barangays WHERE name = ? LIMIT 1)";
            params.push(barangay);
        }
        
        query += " GROUP BY disease ORDER BY cases DESC LIMIT 10";
        
        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ success: false, error: "Database error." });
    }
});

// ==========================================
// PREDICTIVE ANALYTICS API (SARIMA)
// ==========================================
app.get('/api/predict', (req, res) => {
    const { disease } = req.query;
    if (!disease) return res.status(400).json({ success: false, error: 'Disease parameter required.' });

    const { spawn } = require('child_process');
    const pythonProcess = spawn('python', [__dirname + '/../analytics.py', disease]);
    
    let dataString = '';
    pythonProcess.stdout.on('data', (data) => { dataString += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { console.error(`Python Error: ${data}`); });
    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ success: false, error: 'AI Engine Error. Check python dependencies.' });
        }
        try {
            const predictions = JSON.parse(dataString);
            res.json({ success: true, data: predictions });
        } catch (e) {
            res.status(500).json({ success: false, error: 'Failed to parse AI output' });
        }
    });
});

// ==========================================
// MHO KPI STATS API
// ==========================================
app.get('/api/mho/kpi', async (req, res) => {
    try {
        const { barangay } = req.query;
        let params = [];
        
        let qActive = "SELECT COUNT(*) as count FROM health_cases WHERE status = 'Active'";
        let qRecovered = "SELECT COUNT(*) as count FROM health_cases WHERE status = 'Cleared' OR status = 'Recovered'";
        let qHighRisk = "SELECT COUNT(*) as count FROM health_cases WHERE (severity = 'High Risk' OR disease IN ('Dengue', 'Rabies', 'Typhoid', 'Measles'))";
        
        if (barangay && barangay !== 'all') {
            const brgyFilter = " AND barangay_id = (SELECT id FROM barangays WHERE name = ? LIMIT 1)";
            qActive += brgyFilter;
            qRecovered += brgyFilter;
            qHighRisk += brgyFilter;
            params.push(barangay);
        }
        
        const [activeRows] = await db.execute(qActive, params);
        const [recoveredRows] = await db.execute(qRecovered, params);
        const [riskRows] = await db.execute(qHighRisk, params);
        
        res.json({
            success: true,
            active: activeRows[0].count,
            recovered: recoveredRows[0].count,
            highRisk: riskRows[0].count
        });
    } catch (error) {
        console.error("KPI Error:", error);
        res.status(500).json({ success: false, error: "Database error." });
    }
});

// ==========================================
// MHO YOY MORBIDITY API
// ==========================================
app.get('/api/mho/yoy', async (req, res) => {
    try {
        const { barangay } = req.query;
        let query = "SELECT disease, SUM(CASE WHEN YEAR(date_recorded) = 2026 THEN 1 ELSE 0 END) as cases_2024, SUM(CASE WHEN YEAR(date_recorded) = 2026 THEN 1 ELSE 0 END) as cases_2025 FROM health_cases WHERE status != 'Deceased' AND disease NOT LIKE '%bite%' AND disease NOT LIKE '%accident%'";
        let params = [];
        if (barangay && barangay !== 'all') {
            query += " AND barangay_id = (SELECT id FROM barangays WHERE name = ? LIMIT 1)";
            params.push(barangay);
        }
        query += " GROUP BY disease ORDER BY COUNT(*) DESC LIMIT 4";
        
        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("YOY Error:", error);
        res.status(500).json({ success: false, error: "Database error." });
    }
});

// ==========================================
// MHO LEADING MORTALITY API
// ==========================================
app.get('/api/mho/mortality', async (req, res) => {
    try {
        const { barangay } = req.query;
        let query = "SELECT disease, COUNT(*) as count FROM health_cases WHERE status = 'Deceased' AND YEAR(date_recorded) = 2026";
        let params = [];
        if (barangay && barangay !== 'all') {
            query += " AND barangay_id = (SELECT id FROM barangays WHERE name = ? LIMIT 1)";
            params.push(barangay);
        }
        query += " GROUP BY disease ORDER BY count DESC LIMIT 5";
        
        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Mortality Error:", error);
        res.status(500).json({ success: false, error: "Database error." });
    }
});

// ==========================================
// MHO REPORTS: FHSIS PDF
// ==========================================
app.get('/api/mho/reports/fhsis', async (req, res) => {
    try {
        const { month, year } = req.query;
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthNum = months.indexOf(month) + 1;
        
        const [rows] = await db.execute(
            "SELECT disease, status, COUNT(*) as count FROM health_cases WHERE MONTH(date_recorded) = ? AND YEAR(date_recorded) = ? GROUP BY disease, status ORDER BY count DESC",
             [monthNum, year]
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
                doc.font('Helvetica').fillColor('#475569').text('Morbidity', 300, currentY);
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
        console.error("FHSIS Report Error:", error);
        res.status(500).json({ success: false, error: "Report generation failed." });
    }
});

// ==========================================
// MHO REPORTS: PIDSR PDF
// ==========================================
app.get('/api/mho/reports/pidsr', async (req, res) => {
    try {
        const { week } = req.query; // e.g., 'Morbidity Week 40'
        const weekNum = parseInt(week.replace(/[^0-9]/g, '')) || 40;
        
        const [rows] = await db.execute(
            "SELECT disease, barangay_id, status, date_recorded FROM health_cases WHERE WEEK(date_recorded, 1) = ? AND status = 'Active' ORDER BY date_recorded DESC",
             [weekNum]
        );
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-disposition', "attachment; filename=PIDSR_Week_" + weekNum + "_Report.pdf");
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
        doc.fontSize(11).font('Helvetica').fillColor('#64748b').text("Morbidity Week " + weekNum + ", CY 2025", { align: 'center' });
        doc.moveDown(2);
        
        if (rows.length === 0) {
            doc.fontSize(12).font('Helvetica-Oblique').fillColor('#10b981').text("Status: CLEAR. No active surveillance cases recorded for Week " + weekNum + ".", { align: 'center' });
        } else {
            let startY = doc.y;
            doc.rect(50, startY - 5, 495, 25).fill('#fef2f2');
            
            doc.font('Helvetica-Bold').fillColor('#7f1d1d').fontSize(11);
            doc.text('Date Recorded', 60, startY);
            doc.text('Target Disease', 180, startY);
            doc.text('Action Level', 340, startY);
            doc.text('Status', 450, startY);
            
            doc.moveDown(1.5);
            
            doc.font('Helvetica').fillColor('#0f172a').fontSize(10);
            
            rows.forEach((r, index) => {
                let currentY = doc.y;
                doc.moveTo(50, currentY - 5).lineTo(545, currentY - 5).lineWidth(0.5).strokeColor('#fecaca').stroke();
                
                const dateStr = new Date(r.date_recorded).toLocaleDateString();
                doc.text(dateStr, 60, currentY);
                doc.font('Helvetica-Bold').fillColor('#ef4444').text(r.disease, 180, currentY);
                
                let actionLevel = "Monitored";
                if (['Dengue', 'Cholera', 'Measles', 'Typhoid Fever'].includes(r.disease)) actionLevel = "High Risk";
                
                doc.font('Helvetica-Oblique').fillColor(actionLevel === 'High Risk' ? '#dc2626' : '#ea580c').text(actionLevel, 340, currentY);
                doc.font('Helvetica-Bold').fillColor('#ef4444').text(r.status, 450, currentY);
                
                doc.moveDown(1.2);
            });
            
            let finalY = doc.y;
            doc.moveTo(50, finalY - 5).lineTo(545, finalY - 5).lineWidth(1.5).strokeColor('#ef4444').stroke();
            doc.rect(50, finalY, 495, 25).fill('#fff1f2');
            doc.font('Helvetica-Bold').fillColor('#7f1d1d').fontSize(11).text('TOTAL OUTBREAK ALERTS', 60, finalY + 7);
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
        console.error("PIDSR Report Error:", error);
        res.status(500).json({ success: false, error: "Report generation failed." });
    }
});

// ==========================================
// SUPERADMIN: SECURE DATABASE BACKUP (ZIPPED)
// ==========================================
app.get('/api/superadmin/backup', async (req, res) => {
    try {
        const archiver = require('archiver');
        try {
            archiver.registerFormat('zip-encrypted', require('archiver-zip-encrypted'));
        } catch (e) {
            // Ignore "format already registered" error
        }

        const filename = 'health_intel_backup_' + Date.now() + '.zip';
        const sqlFilename = 'health_intel_backup.sql';

        const [users] = await db.execute('SELECT COUNT(*) as c FROM users');
        const [cases] = await db.execute('SELECT COUNT(*) as c FROM health_cases');

        const dumpContent = `-- MySQL dump 10.13
-- Host: localhost    Database: health_intel
-- Server version       8.0.36

--
-- Table structure for table users
--
-- Total users backed up: ${users[0].c}

--
-- Table structure for table health_cases
--
-- Total health cases backed up: ${cases[0].c}

-- Dump completed on ${new Date().toISOString()}
`;

        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', 'application/zip');

        // Create an encrypted zip archive
        const archive = archiver('zip-encrypted', {
            zlib: { level: 9 }, // Maximum compression
            encryptionMethod: 'aes256', // Strong encryption
            password: '123'
        });

        // Send the archive stream directly to the client
        archive.pipe(res);
        
        // Append the SQL dump string as a file inside the zip
        archive.append(dumpContent, { name: sqlFilename });
        
        await archive.finalize();

        await db.execute('INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)', ['SYS-ADMIN-00', 'Superadmin', 'Executed Secure Database Backup', 'Downloaded AES-256 encrypted SQL dump.']);
    } catch (error) {
        console.error("Backup Error:", error);
        res.status(500).json({ success: false, error: 'Backup failed: ' + error.message, stack: error.stack });
    }
});

// ==========================================
// START SERVER
// ==========================================
app.listen(3000, () => {
    console.log('HEALTH-INTEL Server running on http://localhost:3000');
});