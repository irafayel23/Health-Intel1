const { validatePatient, ageOnDate, todayInManila } = require('../services/patient-validation');
const { monthlyPeriod } = require('../services/report-periods');
const { respond } = require('../services/qa-fixes');
const { CASE_ACTIONS, withCaseReference, caseAuditDetails } = require('../services/case-audit');

function registerCaseRoutes(app, db, qa, corrections) {
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
        const [selectedBarangays]=await connection.execute('SELECT id,name FROM barangays WHERE id=? FOR UPDATE',[brgy_id]);
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
            [req.user.system_id,actorRole,actorRole==='MHO'?'Walk-in Case Encoded':'Patient Encoded',caseAuditDetails(result.insertId, `Created case #REC-${result.insertId} · ${selectedBarangays[0].name} · Case date: ${patient.date_recorded} · Saved.`, { barangay_id:brgy_id })]);
        await connection.commit();
        res.status(201).json({success:true,message:'Patient case saved.',id:result.insertId});
    } catch {
        if(connection) await connection.rollback();
        res.status(503).json({success:false,error:'The case could not be saved. No partial record was kept. Please try again.'});
    } finally { if(connection) connection.release(); }
}
app.post('/api/patients', (req,res)=>savePatientCase(req,res,Number(req.user.barangay_id),'BHW'));
app.post('/api/mho/walk-in-cases', (req,res)=>savePatientCase(req,res,Number(req.body.barangay_id),'MHO'));

app.get('/api/admin/cases/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success:false, error:'Select a valid case ID.' });
    try {
        const [cases] = await db.execute(`SELECT h.*, b.name AS barangay_name,
            DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,
            DATE_FORMAT(h.birthdate,'%Y-%m-%d') AS birthdate
            FROM health_cases h LEFT JOIN barangays b ON b.id=h.barangay_id WHERE h.id=?`, [id]);
        if (!cases.length) return res.status(404).json({ success:false, error:'Case not found. The record may no longer exist.' });
        const [logs] = await db.execute(`SELECT id,user_id,role,action,details,timestamp AS created_at
            FROM system_audit_logs WHERE action IN (${CASE_ACTIONS.map(()=>'?').join(',')}) ORDER BY timestamp DESC,id DESC`, CASE_ACTIONS);
        const history = logs.map(withCaseReference).filter(log=>log.case_id===id);
        res.json({ success:true, case:cases[0], history });
    } catch { res.status(503).json({ success:false, error:'The case and its recorded history could not be loaded.' }); }
});

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
        const [diseaseRows] = await db.execute(`
            SELECT h.barangay_id, h.severity,
                COALESCE(NULLIF(TRIM(h.disease), ''), 'Not recorded') AS disease,
                COUNT(*) AS cases
            FROM health_cases h
            WHERE h.status = 'Active' AND h.is_archived = FALSE
                AND h.severity IN ('Mild', 'Monitored', 'High Risk')
                AND (? = '' OR h.disease = ?)
            GROUP BY h.barangay_id, h.severity, COALESCE(NULLIF(TRIM(h.disease), ''), 'Not recorded')
            ORDER BY h.barangay_id, h.severity, cases DESC, disease ASC
        `, [disease, disease]);
        const diseasesByBarangay = new Map();
        const severityKeys = { Mild: 'mild', Monitored: 'monitored', 'High Risk': 'high_risk' };
        for (const row of diseaseRows) {
            const key = String(row.barangay_id);
            if (!diseasesByBarangay.has(key)) diseasesByBarangay.set(key, { mild: [], monitored: [], high_risk: [] });
            diseasesByBarangay.get(key)[severityKeys[row.severity]].push({ disease: row.disease, cases: Number(row.cases) });
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
                diseases_by_severity: diseasesByBarangay.get(String(r.barangay_id)) || { mild: [], monitored: [], high_risk: [] },
                high_risk_diseases: diseasesByBarangay.get(String(r.barangay_id))?.high_risk || [],
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


}

module.exports = { registerCaseRoutes };
