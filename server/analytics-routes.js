const { spawn } = require('child_process');
const { analyticsFilters, caseWhere, sendAnalyticsError } = require('./mho-analytics');

function registerAnalyticsRoutes(app, db, qa, pythonExecutable) {
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


}

module.exports = { registerAnalyticsRoutes };
