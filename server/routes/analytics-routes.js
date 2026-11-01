const { createDashboardData } = require('../services/dashboard-data');
const { spawn } = require('child_process');
const { createForecastCapacity } = require('../services/forecast-capacity');
const { createDiseaseRegistryHandlers, createDiseaseRegistryData } = require('../services/disease-registry');
const { analyticsFilters, caseWhere, comparisonSelection, sendAnalyticsError } = require('../services/mho-analytics');
const {sampleAnalytics}=require('../services/analytics-sample');

function registerAnalyticsRoutes(app, db, pythonExecutable) {
    const forecastCapacity = createForecastCapacity(Number(process.env.FORECAST_MAX_CONCURRENT || 1));
    const dashboard = createDashboardData(db);
    const registry = createDiseaseRegistryHandlers(db);
    const catalog = createDiseaseRegistryData(db);
    // Auth/role middleware runs before these display-only sample responses.
    app.get(['/api/mho/stats','/api/mho/kpi','/api/mho/trend','/api/mho/year-comparison','/api/mho/analytics-options','/api/mho/mortality','/api/mho/breakdown'],async(req,res,next)=>{
        if(req.query.sample===undefined)return next();
        if(req.query.sample!=='1')return res.status(400).json({success:false,error:'Invalid sample-data selection.'});
        try{res.json(sampleAnalytics(req.path.split('/').at(-1),req.query,await dashboard.analyticsBarangays()));}
        catch(error){sendAnalyticsError(res,error);}
    });
    // ==========================================
    // 8. DASHBOARD STATS & ANALYTICS
    // ==========================================
    app.get('/api/bhw-stats', async (req, res) => {
        const { barangay_id } = req.query;
        try {
            const { total, active, cleared, mild, monitored, high_risk } =
                await dashboard.bhwStats(barangay_id);
            res.json({
                success: true,
                total: total.count,
                active: active.count,
                cleared: cleared.count,
                mild: mild.count,
                monitored: monitored.count,
                high_risk: high_risk.count
            });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.get('/api/mho-stats', async (req, res) => {
        try {
            const { activeResult, recoveredResult, highRiskResult } = await dashboard.legacyMhoStats();
            res.json({
                success: true,
                data: {
                    active: activeResult.count,
                    recovered: recoveredResult.count,
                    high_risk: highRiskResult.count
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.get('/api/analytics/demographics', async (req, res) => {
        try {
            const diseaseStats = await dashboard.demographics();
            res.json({ success: true, data: diseaseStats });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Database aggregation failed.' });
        }
    });

    app.get('/api/get-predictions', (req, res) => {
        res.status(400).json({
            success: false,
            error: 'Select a disease and barangay through /api/predict.'
        });
    });

    // ==========================================
    // 9. MASTER DISEASE REGISTRY
    // ==========================================
    app.post('/api/diseases', registry.disease);

    app.get('/api/diseases', async (req, res) => {
        try {
            const rows = await catalog.activeDiseases();
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.get('/api/diseases/archived', async (req, res) => {
        try {
            const rows = await catalog.archivedDiseases();
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.put('/api/diseases/:id/archive', registry.archiveDisease);

    app.put('/api/diseases/:id/restore', registry.restoreDisease);

    // ==========================================
    // MHO DESCRIPTIVE STATS API
    // ==========================================
    app.get('/api/mho/stats', async (req, res) => {
        try {
            const filters = analyticsFilters(req.query);
            const where = caseWhere(filters, { deathsOnly: filters.category === 'mortality' });
            const { rows, summary } = await dashboard.diseaseSummary(where);
            summary.leading_categories = rows.filter((row) => row.cases === rows[0]?.cases).length;
            res.json({ success: true, data: rows.slice(0, 10), summary, filters });
        } catch (error) {
            if (!error.status) console.error('Stats Error:', error);
            sendAnalyticsError(res, error);
        }
    });

    // ==========================================
    // DEMONSTRATION FORECAST API (AR(1), validation pending)
    // ==========================================
    app.get('/api/predict', async (req, res) => {
        const { disease, barangay } = req.query;
        if (typeof disease === 'string' && disease.trim().toLowerCase() === 'pending classification') {
            return res
                .status(400)
                .json({
                    success: false,
                    error: 'Conditions awaiting MHO classification cannot be forecast.'
                });
        }
        if (
            typeof disease !== 'string' ||
            typeof barangay !== 'string' ||
            !disease ||
            !barangay ||
            disease.length > 255 ||
            barangay.length > 255
        ) {
            return res.status(400).json({ success: false, error: 'Select a disease and barangay.' });
        }
        try {
            const { places, categories } = await dashboard.forecastSelections(barangay, disease);
            if (!places.length || !categories.length)
                return res
                    .status(400)
                    .json({
                        success: false,
                        error: 'Select an existing barangay and disease with recorded history.'
                    });
        } catch {
            return res
                .status(503)
                .json({
                    success: false,
                    error: 'Forecast selections could not be checked. Please try again.'
                });
        }
        const releaseCapacity = forecastCapacity.acquire();
        if (!releaseCapacity) {
            return res.set('Retry-After', '5').status(503).json({
                success: false,
                code: 'FORECAST_BUSY',
                error: 'Another forecast is running. Please try again shortly.'
            });
        }
        let pythonProcess;
        try {
            pythonProcess = spawn(pythonExecutable, [__dirname + '/../analytics.py', disease, barangay], {
                windowsHide: true
            });
        } catch {
            releaseCapacity();
            return res
                .status(503)
                .json({
                    success: false,
                    error: 'Forecast engine could not start. Check the Python installation.'
                });
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
        res.on('close', () => {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                pythonProcess.kill();
            }
        });
        pythonProcess.on('error', () =>
            finish(503, {
                success: false,
                error: 'Forecast engine could not start. Check the Python installation.'
            })
        );

        let dataString = '';
        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });
        pythonProcess.on('close', (code) => {
            // Hold the slot until the worker actually exits, even after a timeout or disconnect.
            releaseCapacity();
            if (code !== 0) {
                return finish(503, {
                    success: false,
                    error: 'Forecast engine failed. Check its data and Python dependencies.'
                });
            }
            try {
                const predictions = JSON.parse(dataString);
                if (!predictions.success)
                    return finish(422, {
                        success: false,
                        error: predictions.error || 'Not enough data to generate a forecast.'
                    });
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
            const counts = await dashboard.kpi(where);
            res.json({ success: true, ...counts, filters });
        } catch (error) {
            if (!error.status) console.error('KPI Error:', error);
            sendAnalyticsError(res, error);
        }
    });

    // ==========================================
    // MHO YOY MORBIDITY API
    // ==========================================
    app.get('/api/mho/analytics-options', async (_req, res) => {
        try { res.json({ success: true, ...await dashboard.analyticsOptions() }); }
        catch (error) { sendAnalyticsError(res, error); }
    });

    app.get('/api/mho/breakdown',async(req,res)=>{
        try{const filters=analyticsFilters(req.query);const data=await dashboard.breakdown(caseWhere(filters,{deathsOnly:filters.category==='mortality'}),filters);res.json({success:true,...data,filters});}
        catch(error){sendAnalyticsError(res,error);}
    });

    app.get('/api/mho/trend', async (req, res) => {
        try {
            const filters = analyticsFilters(req.query);
            const disease = req.query.disease;
            if (disease !== undefined && (typeof disease !== 'string' || !disease.trim() || disease.length > 255)) {
                return res.status(400).json({ success: false, error: 'Invalid disease filter.' });
            }
            const rows = await dashboard.trend(caseWhere(filters), filters.year, disease);
            const currentYear = Number(new Intl.DateTimeFormat('en', {timeZone:'Asia/Manila',year:'numeric'}).format(new Date()));
            res.json({ success: true, data: rows, granularity: filters.year === 'all' ? 'annual' : 'monthly', current_year: currentYear, filters });
        } catch (error) { sendAnalyticsError(res, error); }
    });

    app.get('/api/mho/year-comparison', async (req, res) => {
        try {
            const filters = analyticsFilters(req.query);
            const selection = comparisonSelection(req.query, filters);
            const where = caseWhere(filters, { includeYear: false });
            where.sql += ' AND date_recorded <= ?';
            where.params.push(selection.through);
            if (selection.years) {
                where.sql += ' AND YEAR(date_recorded) IN ('+selection.years.map(()=>'?').join(',')+')';
                where.params.push(...selection.years);
            }
            const availableYears = !selection.years && selection.period==='same'
                ? (await dashboard.trend(where,'all')).map(row=>Number(row.period)) : null;
            if (selection.period==='same') {
                where.sql += " AND DATE_FORMAT(date_recorded, '%m-%d') <= ?";
                where.params.push(selection.through.slice(5));
            }
            const rows = await dashboard.diseaseYearComparison(where);
            const totals = new Map();
            for (const row of rows) totals.set(row.disease, (totals.get(row.disease) || 0) + Number(row.cases));
            const diseases = [...totals].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0,4).map(([name]) => name);
            const years = selection.years || availableYears || [...new Set(rows.map(row => Number(row.year)))].sort((a,b) => a-b);
            res.json({success:true, data:rows.filter(row => diseases.includes(row.disease)), diseases, years,
                current_year:selection.currentYear, period:selection.period, through:selection.through, filters});
        } catch (error) { sendAnalyticsError(res,error); }
    });

    app.get('/api/mho/yoy', async (req, res) => {
        try {
            const filters = analyticsFilters(req.query);
            const currentYear =
                filters.year === 'all'
                    ? Number(
                          new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(
                              new Date()
                          )
                      )
                    : Number(filters.year);
            const previousYear = currentYear - 1;
            const where = caseWhere(filters, { includeYear: false });
            const rows = await dashboard.yearComparison(where, previousYear, currentYear);
            res.json({
                success: true,
                data: rows,
                previous_year: previousYear,
                current_year: currentYear,
                filters
            });
        } catch (error) {
            if (!error.status) console.error('YOY Error:', error);
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
            const rows = await dashboard.mortality(where);
            res.json({ success: true, data: rows, filters });
        } catch (error) {
            if (!error.status) console.error('Mortality Error:', error);
            sendAnalyticsError(res, error);
        }
    });
}

module.exports = { registerAnalyticsRoutes };
