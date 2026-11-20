'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse } = require('csv-parse/sync');
const { DISEASES, BARANGAYS } = require('./seasonal6200-sarima-demo');
const LABEL = 'Demonstration Dataset — Synthetic Historical Data';
const SOURCE_HASH = '49b4ca92eff35bc574b61f46cde982a35b4d843b84d71228158e1941829c84e7';
const FIRST_LIVE_CASE_DATE = '2026-10-01';
const DATASET = path.join(__dirname, '../data/seasonal-sarima-6200/SYNTHETIC_monthly.csv');

function loadDataset(file = DATASET) {
    const bytes = fs.readFileSync(file);
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== SOURCE_HASH) throw new Error('Historical dataset hash mismatch.');
    const rows = parse(bytes, { columns: true, skip_empty_lines: true, bom: true });
    const keys = new Set();
    for (const row of rows) {
        const key = [row.Date, row.Barangay, row.Disease].join('|');
        if (!/^202[3-6]-(0[1-9]|1[0-2])$/.test(row.Date) || row.Date >= FIRST_LIVE_CASE_DATE.slice(0,7) || !BARANGAYS.includes(row.Barangay) ||
            !DISEASES.includes(row.Disease) || !/^\d+$/.test(row.Cases) || !Number.isSafeInteger(Number(row.Cases)) || keys.has(key)) throw new Error('Invalid historical dataset.');
        keys.add(key);
        row.Cases = Number(row.Cases);
    }
    if (rows.length !== 3150 || rows.reduce((sum, row) => sum + row.Cases, 0) !== 6200) throw new Error('Historical dataset totals mismatch.');
    return rows;
}

function aggregateDataset(rows, query = {}, assignedBarangay) {
    const fail = message => { const error = new Error(message); error.status = 400; throw error; };
    if (Object.keys(query).some(key => !['year', 'month', 'disease', 'barangay'].includes(key))) fail('Unsupported dataset filter.');
    const month = query.month ?? 'all';
    const year = query.year ?? 'all', disease = query.disease ?? 'all', barangay = assignedBarangay ?? query.barangay ?? 'all';
    if (!['all', '2023', '2024', '2025', '2026'].includes(year) || (month !== 'all' && (typeof month !== 'string' || !/^(0[1-9]|1[0-2])$/.test(month))) ||
        (disease !== 'all' && !DISEASES.includes(disease)) ||
        (barangay !== 'all' && !BARANGAYS.includes(barangay))) fail('Choose a valid dataset year, month, disease and barangay.');
    if (assignedBarangay && query.barangay !== undefined && query.barangay !== assignedBarangay) fail('Only your assigned barangay is available.');
    const selected = rows.filter(row => (year === 'all' || row.Date.startsWith(year)) && (month === 'all' || row.Date.slice(5) === month) && (disease === 'all' || row.Disease === disease) && (barangay === 'all' || row.Barangay === barangay));
    const sum = subset => subset.reduce((total, row) => total + row.Cases, 0);
    const grouped = (labels, field) => labels.map(label => ({ label, cases: sum(selected.filter(row => row[field] === label)) }));
    const months = [...new Set(selected.map(row => row.Date))].sort();
    const places = barangay === 'all' ? BARANGAYS : [barangay];
    return {
        success: true, source: 'demonstration_dataset', source_label: LABEL, dataset_sha256: SOURCE_HASH,
        dataset_version: 'seasonal6200-20261102', filters: { year, ...(month === 'all' ? {} : { month }), disease, barangay },
        coverage: { first_month: months[0], last_month: months.at(-1), months: months.length, monthly_rows: selected.length },
        total: sum(selected), diseases: grouped(disease === 'all' ? DISEASES : [disease], 'Disease'),
        barangays: grouped(places, 'Barangay'), months: grouped(months, 'Date'),
        years: [...new Set(months.map(month => month.slice(0, 4)))].map(label => ({ label, cases: sum(selected.filter(row => row.Date.startsWith(label))) })),
        options: { years: ['2023', '2024', '2025', '2026'], diseases: DISEASES, barangays: places },
        unavailable_dimensions: ['patient identity', 'age', 'severity', 'active status', 'case outcomes', 'consultations']
    };
}

function registerDatasetAnalytics(app, db) {
    // Read only on demand so an unavailable dataset cannot stop operational reporting.
    for (const role of ['mho', 'bhw']) app.get('/api/' + role + '/dataset-analytics', async (req, res) => {
        if (req.user?.role !== role) return res.status(403).json({ success: false, error: 'This analytics view is not authorized.' });
        try {
            let assigned;
            if (role === 'bhw') {
                if (!req.user.barangay_id) return res.status(403).json({ success: false, error: 'Assigned barangay required.' });
                const [places] = await db.execute('SELECT name FROM barangays WHERE id=?', [req.user.barangay_id]);
                assigned = places[0]?.name;
                if (!BARANGAYS.includes(assigned)) return res.status(403).json({ success: false, error: 'Assigned study barangay required.' });
            }
            let query = req.query;
            if (role === 'bhw') {
                // Access control injects this ID; authorize it without treating it as a CSV filter.
                const { barangay_id, ...filters } = query;
                if (barangay_id !== undefined && String(barangay_id) !== String(req.user.barangay_id)) return res.status(403).json({ success: false, error: 'Only your assigned barangay is available.' });
                query = filters;
            }
            res.set('Cache-Control', 'no-store');
            res.json(aggregateDataset(loadDataset(), query, assigned));
        } catch (error) {
            res.status(error.status || 503).json({ success: false, error: error.status ? error.message : 'Historical dataset unavailable. Operational reporting remains separate.' });
        }
    });
}
module.exports = { loadDataset, aggregateDataset, registerDatasetAnalytics, LABEL, SOURCE_HASH, FIRST_LIVE_CASE_DATE };
