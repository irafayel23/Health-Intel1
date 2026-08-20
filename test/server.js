const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const mysql = require('mysql2/promise'); 
const bcrypt = require('bcrypt');        
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); // NEW: The Email Engine!
const app = express();

app.use(cors());
app.use(express.json()); 
// 1. DATABASE CONNECTION (The Vault)
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',      
    password: '',      
    database: 'health_intel'
});
// 2. API: AUTO-GENERATE UNIQUE ID
app.post('/api/get-next-id', async (req, res) => {
    const requestedRole = req.body.role;
    let prefix = '';

    if (requestedRole === 'bhw') prefix = 'BHW-';
    else if (requestedRole === 'mho') prefix = 'MHO-';
    else if (requestedRole === 'admin') prefix = 'ADM-'; // <--- THIS MUST SAY ADM-
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
// 3. API: ZERO-TRUST SECURE REGISTRATION
// --- REGISTRATION API ---
// 3. API: ZERO-TRUST SECURE REGISTRATION
// --- REGISTRATION API ---
app.post('/api/register', async (req, res) => {
    try {
        // 1. Extract the fields from the frontend request (Fixed employee_hr_id)
        const { 
            first_name, 
            last_name, 
            role, 
            system_id, 
            employee_hr_id, // FIXED: Matches frontend payload and DB
            password, 
            email, 
            assigned_barangay
        } = req.body;

        // 2. Validate: MHOs and Admins cover the whole municipality
        const finalBarangay = (role === 'bhw') ? assigned_barangay : 'Municipality';

        // 3. Hash the password
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Insert into MySQL (FIXED: employee_hr_id and account_status)
        const query = `
            INSERT INTO users 
            (first_name, last_name, email, role, system_id, employee_hr_id, password_hash, assigned_barangay, account_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `;
        
        await db.execute(query, [
            first_name, 
            last_name, 
            email, 
            role, 
            system_id, 
            employee_hr_id, // FIXED
            hashedPassword, 
            finalBarangay
        ]);

        res.json({ success: true, message: "Registration submitted for HR Approval." });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ success: false, error: "Database error during registration." });
    }
});
// 4. API: SECURE LOGIN
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
        res.json({ 
            success: true, 
            token: token, 
            role: user.role,
            redirect: `/${user.role}.html` 
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, error: "Internal server error." });
    }
});

// 5. API: ADMIN - GET PENDING USERS
// 5. API: ADMIN - GET PENDING USERS (Strictly BHW and MHO only)
app.get('/api/admin/pending-users', async (req, res) => {
    try {
        const query = `
            SELECT system_id, email, first_name, last_name, employee_hr_id, role, created_at 
            FROM users 
            WHERE account_status = 'pending' AND role IN ('bhw', 'mho')
            ORDER BY created_at DESC
        `;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Fetch Pending Users Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch pending requests." });
    }
});

// ==========================================
// SUPERADMIN: EXCLUSIVE API ROUTES
// ==========================================

// GET PENDING ADMINS (Only Superadmin sees this)
app.get('/api/superadmin/pending-admins', async (req, res) => {
    try {
        const query = `
            SELECT system_id, email, first_name, last_name, employee_hr_id, role, created_at 
            FROM users 
            WHERE account_status = 'pending' AND role = 'admin'
            ORDER BY created_at DESC
        `;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch pending admins." });
    }
});

// APPROVE LGU ADMIN
app.post('/api/superadmin/approve-admin', async (req, res) => {
    const { system_id } = req.body;
    try {
        // The ID is already generated beautifully (ADM-XXX), so we just flip the switch!
        await db.execute(`UPDATE users SET account_status = 'approved' WHERE system_id = ?`, [system_id]);
        console.log(`➔ SUPERADMIN ACTION: LGU Admin ${system_id} Approved.`);
        res.json({ success: true, message: `LGU Admin ${system_id} is now fully operational.` });
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error during approval." });
    }
});
// 6. API: ADMIN - APPROVE & ASSIGN ROLE (WITH GMAIL)
app.post('/api/admin/approve-user', async (req, res) => {
    const { temp_system_id, assigned_role } = req.body; 

let prefix = '';
if (assigned_role === 'bhw') prefix = 'BHW-';
else if (assigned_role === 'mho') prefix = 'MHO-';
else if (assigned_role === 'admin') prefix = 'ADM-'; // <-- CHANGED THIS LINE
else return res.status(400).json({ success: false, error: "Invalid role assigned." });

    try {
        const [rows] = await db.execute(
            `SELECT system_id FROM users WHERE system_id LIKE ? ORDER BY system_id DESC LIMIT 1`,
            [`${prefix}%`]
        );

        let finalId = prefix + '001'; 
        if (rows.length > 0) {
            const lastId = rows[0].system_id;
            const nextNumber = parseInt(lastId.split('-')[1]) + 1;
            finalId = prefix + nextNumber.toString().padStart(3, '0');
        }

        const updateQuery = `
            UPDATE users 
            SET system_id = ?, role = ?, account_status = 'approved' 
            WHERE system_id = ?
        `;
        await db.execute(updateQuery, [finalId, assigned_role, temp_system_id]);

        const [userRow] = await db.execute('SELECT email, first_name FROM users WHERE system_id = ?', [finalId]);
        const userEmail = userRow[0].email;
        const userName = userRow[0].first_name;

        // THE GMAIL DISPATCHER
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'yapjohnrichard@gmail.com',  
                pass: 'tdxeywhbxyhlywpc'           
            }
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
                    <br>
                    <p style="font-size: 0.8rem; color: #64748b;">This is an automated message from the Municipal Health Office.</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) console.log("Email Error: ", error);
            else console.log("Email sent successfully: " + info.response);
        });

        console.log(`➔ ADMIN ACTION: ${temp_system_id} upgraded to ${finalId} (${assigned_role})`);
        
        res.json({ 
            success: true, 
            message: `Account Approved! Official ID generated: ${finalId}. An email has been sent to ${userEmail}!` 
        });

    } catch (error) {
        console.error("Approval Error:", error);
        res.status(500).json({ success: false, error: "Database error during approval process." });
    }
});
// 6.1 API: ADMIN - DENY USER 
app.post('/api/admin/deny-user', async (req, res) => {
    const { temp_system_id } = req.body; 
    try {
        await db.execute(`UPDATE users SET account_status = 'denied' WHERE system_id = ?`, [temp_system_id]);
        console.log(`➔ ADMIN ACTION: User ${temp_system_id} DENIED.`);
        res.json({ success: true, message: `Account request denied.` });
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error during denial." });
    }
});
// 6.2 API: ADMIN - UNDO DENY USER 
app.post('/api/admin/undo-deny', async (req, res) => {
    const { temp_system_id } = req.body; 
    try {
        await db.execute(`UPDATE users SET account_status = 'pending' WHERE system_id = ?`, [temp_system_id]);
        console.log(`➔ ADMIN ACTION: User ${temp_system_id} moved back to PENDING.`);
        res.json({ success: true, message: `Account returned to pending status.` });
    } catch (error) {
        console.error("Undo Deny Error:", error);
        res.status(500).json({ success: false, error: "Database error during undo process." });
    }
});
// 7. API: ADMIN - GET DENIED USERS (Soft Deletes)
app.get('/api/admin/denied-users', async (req, res) => {
    try {
        const query = `
            SELECT system_id, first_name, last_name, employee_hr_id 
            FROM users 
            WHERE account_status = 'denied'
            ORDER BY created_at DESC
        `;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch denied requests." });
    }
});
// 8. API: PYTHON AI PREDICTIONS
app.get('/api/get-predictions', (req, res) => {
    // Grab the timeframe from the URL, default to monthly
    const timeframe = req.query.timeframe || 'monthly'; 
    const { spawn } = require('child_process');
    
    // Pass the timeframe to the Python script
    const pythonProcess = spawn('python', ['analytics.py', timeframe]); 

    let dataString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        try {
            const predictions = JSON.parse(dataString);
            if (predictions.error) {
                res.status(500).json({ success: false, error: predictions.error });
            } else {
                res.json({ success: true, data: predictions });
            }
        } catch (e) {
            console.error("Failed to parse Python output:", dataString);
            res.status(500).json({ success: false, error: 'Invalid response from AI engine' });
        }
    });
});

// GET LIVE DASHBOARD STATS
app.get('/api/bhw-stats', async (req, res) => {
    try {
        // Count everything that is not archived
        const [[total]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE deleted_at IS NULL`);
        
        // Count only the 'Active' ones
        const [[active]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status = 'Active' AND deleted_at IS NULL`);
        
        // Count only the 'Cleared' ones
        const [[cleared]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status = 'Cleared' AND deleted_at IS NULL`);

        res.json({
            success: true,
            total: total.count,
            active: active.count,
            cleared: cleared.count
        });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// 7.0 API: BHW PATIENT CRUD OPERATIONS
app.post('/api/patients', async (req, res) => {
    const { first_name, last_name, patient_name, age, purok, disease, remarks, status } = req.body;
    
    try {
        await db.execute(
            `INSERT INTO health_cases 
            (first_name, last_name, patient_name, age, purok, disease, remarks, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, patient_name, age, purok, disease, remarks, status || 'Active']
        );
        console.log(`➔ New patient added: ${patient_name} (${disease})`);
        res.json({ success: true, message: 'Patient recorded successfully!' });
    } catch (error) {
        console.error("Create Patient Error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// READ ACTIVE (Get only patients who are NOT archived)
app.get('/api/patients', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM health_cases WHERE deleted_at IS NULL ORDER BY created_at DESC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Read Patients Error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// UPDATE (Change status to Cleared/Recovered)
app.put('/api/patients/:id/status', async (req, res) => {
    const { new_status } = req.body;
    try {
        await db.execute(`UPDATE health_cases SET status = ? WHERE id = ?`, [new_status, req.params.id]);
        res.json({ success: true, message: 'Patient status updated!' });
    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ARCHIVE RECORD (Move to trash)
app.put('/api/patients/:id/archive', async (req, res) => {
    try {
        await db.execute(`UPDATE health_cases SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Record moved to archive.' });
    } catch (error) {
        console.error("Archive Patient Error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// READ ARCHIVED (Get only the trashed patients)
app.get('/api/patients/archived', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM health_cases WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Read Archived Error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// RESTORE RECORD (Remove from trash)
app.put('/api/patients/:id/restore', async (req, res) => {
    try {
        await db.execute(`UPDATE health_cases SET deleted_at = NULL WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Record restored successfully.' });
    } catch (error) {
        console.error("Restore Patient Error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
// NEW: MHO DASHBOARD STATS (100% Dynamic)
app.get('/api/mho-stats', async (req, res) => {
    try {
        // 1. Get Live Active Cases
        const [[activeResult]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status = 'Active' AND deleted_at IS NULL`);
        
        // 2. Get Total Recovered/Cleared Cases
        const [[recoveredResult]] = await db.execute(`SELECT COUNT(*) as count FROM health_cases WHERE status IN ('Recovered', 'Cleared') AND deleted_at IS NULL`);

        // 3. Get High Risk Cases (Active cases of severe diseases)
        const [[highRiskResult]] = await db.execute(`
            SELECT COUNT(*) as count FROM health_cases 
            WHERE status = 'Active' 
            AND disease IN ('Dengue', 'Pneumonia', 'Tuberculosis', 'Animal Bite', 'Animal Bite / Wound') 
            AND deleted_at IS NULL
        `);
        
        res.json({ 
            success: true, 
            data: {
                active: activeResult.count,
                recovered: recoveredResult.count, 
                high_risk: highRiskResult.count   
            } 
        });
    } catch (error) {
        console.error("MHO Stats Error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
// 9. API: MASTER DISEASE REGISTRY
app.post('/api/diseases', async (req, res) => {
    const { name, category, classification } = req.body;
    try {
        await db.execute(
            `INSERT INTO disease_registry (name, category, classification) VALUES (?, ?, ?)`,
            [name, category, classification]
        );
        res.json({ success: true, message: 'Disease added to registry!' });
    } catch (error) {
        console.error("Add Disease Error:", error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Get ACTIVE diseases
app.get('/api/diseases', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM disease_registry WHERE deleted_at IS NULL ORDER BY name ASC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Get ARCHIVED diseases
app.get('/api/diseases/archived', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM disease_registry WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Archive a disease (Soft Delete)
app.put('/api/diseases/:id/archive', async (req, res) => {
    try {
        await db.execute(`UPDATE disease_registry SET deleted_at = CURRENT_TIMESTAMP, status = 'Archived' WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Disease archived.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Restore a disease
app.put('/api/diseases/:id/restore', async (req, res) => {
    try {
        await db.execute(`UPDATE disease_registry SET deleted_at = NULL, status = 'Active' WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Disease restored.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
// Get ARCHIVED patients
app.get('/api/patients/archived', async (req, res) => {
    try {
        // Fetches patients that were soft-deleted or marked as Archived
        const [rows] = await db.execute(`SELECT * FROM health_cases WHERE status = 'Archived' OR deleted_at IS NOT NULL ORDER BY id DESC`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Restore an archived patient
app.put('/api/patients/:id/restore', async (req, res) => {
    try {
        await db.execute(`UPDATE health_cases SET status = 'Active', deleted_at = NULL WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Record restored successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// 10. SUPER ADMIN: SYSTEM HEALTH & AUDIT APIs
app.get('/api/superadmin/health', async (req, res) => {
    try {
        // Calculate rough database size and counts
        const [dbSize] = await db.execute(`SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS "size_mb" FROM information_schema.TABLES WHERE table_schema = "health_intel"`);
        const [userCount] = await db.execute(`SELECT COUNT(*) as count FROM users`);
        const [patientCount] = await db.execute(`SELECT COUNT(*) as count FROM health_cases`);

        res.json({
            success: true,
            data: {
                uptime: Math.floor(process.uptime()), // Server uptime in seconds
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

// Get Security Audit Logs
app.get('/api/superadmin/audit-logs', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM system_audit_logs ORDER BY created_at DESC LIMIT 50`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
// 11. BHW DATA ENTRY API (Saves to Database)
app.post('/api/patients', async (req, res) => {
    const { patient_name, age, disease, purok, sex } = req.body;
    
    try {
        // Save the patient to the master record
        await db.execute(
            `INSERT INTO health_cases (patient_name, age, disease, purok, sex, status) VALUES (?, ?, ?, ?, ?, 'Active')`,
            [patient_name, age, disease, purok, sex || 'Unknown']
        );
        
        await db.execute(
            `INSERT INTO system_audit_logs (user_id, role, action, details) VALUES (?, 'BHW', 'Patient Encoded', ?)`,
            ['BHW-Active-Session', `Encoded new case for ${disease} in ${purok}`]
        );
        
        res.json({ success: true, message: 'Patient record successfully encoded and synced.' });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ success: false, error: 'Failed to encode patient.' });
    }
});

// 12. MHO DESCRIPTIVE ANALYTICS API (Reads from Database)
app.get('/api/analytics/demographics', async (req, res) => {
    try {
        const [diseaseStats] = await db.execute(`
            SELECT disease, COUNT(*) as cases 
            FROM health_cases 
            WHERE status = 'Active' AND deleted_at IS NULL 
            GROUP BY disease 
            ORDER BY cases DESC
        `);
        
        res.json({ success: true, data: diseaseStats });
    } catch (error) {
        console.error("Aggregation Error:", error);
        res.status(500).json({ success: false, error: 'Database aggregation failed.' });
    }
});
// Start the Server
app.listen(3000, () => {
    console.log('HEALTH-INTEL Server running on http://localhost:3000');
});