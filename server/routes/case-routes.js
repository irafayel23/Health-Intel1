const { createCaseEncoding } = require('../services/case-encoding');
const { createCaseMapData } = require('../services/case-map-data');
const { createCaseRecords } = require('../services/case-records');
const { validatePatient } = require('../services/patient-validation');
const { respond } = require('../services/service-errors');
const { createCaseLifecycleHandlers } = require('../services/case-lifecycle');
const { createReportExport } = require('../services/report-export');

function registerCaseRoutes(app, db, corrections) {
    const encoding = createCaseEncoding(db);
    const mapData = createCaseMapData(db);
    const records = createCaseRecords(db);
    const cases = createCaseLifecycleHandlers(db);
    const exports = createReportExport(db);
    app.get('/api/bhw/report-data', async (req,res) => {
        try { const rows = await exports.bhw(req.user,req.query); res.json({success:true,data:rows}); }
        catch(error) {
            try { await exports.failed(req.user,'BHW report',error); } catch { console.error('BHW report audit unavailable.'); }
            respond(res,error,'Report data could not be exported.');
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
            const rows = await records.context(system_id);
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
    app.get('/api/bhw/encoding-options', async (req, res) => {
        try {
            res.json({ success: true, data: await records.encodingChoices() });
        } catch {
            res.status(503).json({ success: false, error: 'Disease choices could not be loaded.' });
        }
    });
    app.get('/api/mho/walk-in-options', async (req, res) => {
        try {
            const barangays = await records.barangays();
            res.json({ success: true, data: { barangays, diseases: await records.encodingChoices() } });
        } catch {
            res.status(503).json({ success: false, error: 'Walk-in form choices could not be loaded.' });
        }
    });
    app.get('/api/mho/walk-in-cases', async (req, res) => {
        try {
            const rows = await records.recentWalkIns(req.user.system_id);
            res.json({ success: true, data: rows });
        } catch {
            res.status(503).json({ success: false, error: 'Walk-in cases could not be loaded.' });
        }
    });

    app.get('/api/bhw/puroks', async (req, res) => {
        try {
            const rows = await records.puroks(req.user.barangay_id);
            res.json({ success: true, data: rows.map((row) => row.name) });
        } catch {
            res.status(503).json({ success: false, error: 'Purok choices could not be loaded.' });
        }
    });

    async function savePatientCase(req, res, brgy_id, actorRole) {
        let patient;
        try {
            patient = validatePatient(req.body);
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        if (!Number.isSafeInteger(brgy_id) || brgy_id < 1)
            return res.status(400).json({ success: false, error: 'Select the resident’s barangay.' });
        try {
            const result = await encoding.save(patient, req.body, brgy_id, req.user.system_id, actorRole);
            res.status(201).json({ success: true, message: 'Patient case saved.', ...result });
        } catch (error) {
            if (error.code === 'POSSIBLE_DUPLICATE')
                return res.status(409).json({ success: false, code: error.code, error: error.message });
            if (error.status) return respond(res, error, 'The case could not be saved.');
            res.status(503).json({
                success: false,
                error: 'The case could not be saved. No partial record was kept. Please try again.'
            });
        }
    }
    app.post('/api/patients', (req, res) => savePatientCase(req, res, Number(req.user.barangay_id), 'BHW'));
    app.post('/api/mho/walk-in-cases', (req, res) =>
        savePatientCase(req, res, Number(req.body.barangay_id), 'MHO')
    );

    app.get('/api/admin/cases/:id', async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1)
            return res.status(400).json({ success: false, error: 'Select a valid case ID.' });
        try {
            const cases = await records.caseById(id);
            if (!cases.length)
                return res
                    .status(404)
                    .json({ success: false, error: 'Case not found. The record may no longer exist.' });
            const history = await records.caseHistory(id);
            res.json({ success: true, case: cases[0], history });
        } catch {
            res.status(503).json({
                success: false,
                error: 'The case and its recorded history could not be loaded.'
            });
        }
    });

    // READ ACTIVE (Filtered by Barangay)
    app.get('/api/patients', async (req, res) => {
        try {
            const rows = await records.patients(req.query);
            res.json({ success: true, data: rows });
        } catch (error) {
            respond(res, error, 'Patient records could not be loaded.');
        }
    });

    app.get('/api/residents', async (req, res) => {
        const { barangay_id } = req.query;
        try {
            const rows = await records.residents(barangay_id);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Residents error:', error);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.get('/api/residents/:id/dossier', async (req, res) => {
        try {
            const residentId = req.params.id;
            // Fetch the resident details
            const residentRows = await records.residentById(residentId);
            if (residentRows.length === 0)
                return res.status(404).json({ success: false, error: 'Resident not found' });

            // Fetch their full health history from health_cases
            const historyRows = await records.residentHistory(residentId, req.user);
            res.json({ success: true, resident: residentRows[0], history: historyRows });
        } catch (error) {
            console.error('Dossier error:', error);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    // READ ARCHIVED (Filtered by Barangay)
    app.get('/api/patients/archived', async (req, res) => {
        const { barangay_id } = req.query;
        try {
            const rows = await records.archivedPatients(barangay_id);
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    // UPDATE STATUS
    app.put('/api/patients/:id/status', cases.status);
    app.get('/api/patients/:id/correction', corrections.get);
    app.put('/api/patients/:id/correction', corrections.save);

    // ARCHIVE
    app.put('/api/patients/:id/archive', cases.archiveCase);

    // BHW TREND CHART DATA
    app.get('/api/bhw-trend', async (req, res) => {
        const { barangay_id } = req.query;
        try {
            const monthlyData = await mapData.trend(barangay_id);
            res.json({ success: true, data: monthlyData });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.get('/api/heatmap-data', async (req, res) => {
        try {
            const disease = req.query.disease === undefined ? '' : req.query.disease;
            if (typeof disease !== 'string' || disease.length > 255 || /[<>\x00-\x1f\x7f]/.test(disease))
                return res.status(400).json({ success: false, error: 'Select a valid disease filter.' });
            const data = await mapData.heatmap(disease);
            res.json({
                success: true,
                data,
                selected_disease: disease || null,
                fetched_at: new Date().toISOString()
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    // RESTORE
    app.put('/api/patients/:id/restore', cases.restoreCase);
}

module.exports = { registerCaseRoutes };
