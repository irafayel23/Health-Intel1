'use strict';
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { parse } = require('csv-parse/sync');
const PDFDocument = require('pdfkit');
const { BARANGAYS, DISEASES } = require('./seasonal6200-sarima-demo');
const { renderReportHeading } = require('./daily-report');
const { months } = require('./report-periods');
const { respond } = require('./service-errors');

const datasetPath = path.join(__dirname, '../../datasets/combined_historical_cases.csv');
const source = 'Demonstration Dataset - Synthetic Historical Data';

function reportData(bytes, query, barangay) {
    const rows = parse(bytes, { columns: true, bom: true, skip_empty_lines: true });
    const seen = new Set();
    for (const row of rows) {
        const key = [row.Date, row.Barangay, row.Disease].join('|');
        if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(row.Date) || !BARANGAYS.includes(row.Barangay) ||
            !DISEASES.includes(row.Disease) || !/^\d+$/.test(row.Cases) ||
            !Number.isSafeInteger(Number(row.Cases)) || seen.has(key)) {
            throw new Error('Invalid historical report dataset.');
        }
        seen.add(key);
        row.Cases = Number(row.Cases);
    }
    const scoped = barangay ? rows.filter(row => row.Barangay === barangay) : rows;
    const periods = [...new Set(scoped.map(row => row.Date))].sort().reverse();
    if (!periods.length) throw new Error('No historical reporting periods.');
    const year = query.year ?? periods[0].slice(0, 4);
    const month = query.month ?? periods.find(period => period.startsWith(year))?.slice(5);
    const available = periods.filter(period => period.startsWith(year));
    if (!available.length || (month !== 'all' && !available.includes(year + '-' + month))) {
        throw Object.assign(new Error('Choose a month and year covered by the historical dataset.'), { status: 400 });
    }
    const selected = scoped.filter(row => month === 'all' ? row.Date.startsWith(year) : row.Date === year + '-' + month);
    let total = 0;
    const monthly = new Map();
    const breakdown = new Map();
    for (const { Date: period, Barangay: place, Disease: disease, Cases: cases } of selected) {
        total += cases;
        monthly.set(period, (monthly.get(period) ?? 0) + cases);
        const group = place + '|' + disease;
        breakdown.set(group, (breakdown.get(group) ?? 0) + cases);
    }
    if (!Number.isSafeInteger(total)) throw new Error('Invalid historical case total.');
    return {
        source, year, month, periods, scope: barangay ?? 'All seven barangays', total,
        monthly: [...monthly].sort().map(([period, cases]) => ({ period, cases })),
        breakdown: [...breakdown].sort().map(([key, cases]) => {
            const [barangay, disease] = key.split('|');
            return { barangay, disease, cases };
        })
    };
}

function renderHistoricalPdf(res, data) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const label = data.month === 'all' ? data.year + ' annual totals' : months[Number(data.month) - 1] + ' ' + data.year;
    const dateLabel = period => months[Number(period.slice(5)) - 1] + ' ' + period.slice(0, 4);
    const text = (value, bold = false) => doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(10).fillColor('#163546').text(value, doc.page.margins.left);
    res.attachment('Historical_Case_Counts_' + data.year + '_' + data.month + '.pdf');
    doc.pipe(res);
    renderReportHeading(doc, 'Historical Case Counts', label + ' | ' + data.scope);
    text(data.source);
    text('Monthly counts only. Patient records and case statuses are unavailable.');
    doc.moveDown();
    text('Total for months covered: ' + data.total, true);
    for (const row of data.monthly) text(dateLabel(row.period) + ': ' + row.cases);
    doc.moveDown();
    for (const row of data.breakdown) text(row.barangay + ' | ' + row.disease + ': ' + row.cases);
    doc.end();
}

function registerHistoricalReports(app, db) {
    for (const role of ['mho', 'bhw']) {
        app.get('/api/' + role + '/reports/historical-counts', async (req, res) => {
            if (req.user?.role !== role) return res.status(403).json({ success: false, error: 'Report access denied.' });
            try {
                let barangay;
                if (role === 'bhw') {
                    if (!req.user.barangay_id) return res.status(403).json({ success: false, error: 'Assigned study barangay required.' });
                    const [places] = await db.execute('SELECT name FROM barangays WHERE id=?', [req.user.barangay_id]);
                    barangay = places[0]?.name;
                    if (!BARANGAYS.includes(barangay)) return res.status(403).json({ success: false, error: 'Assigned study barangay required.' });
                }
                const { year, month, format } = req.query;
                if ((year !== undefined && (typeof year !== 'string' || !/^[1-9]\d{3}$/.test(year))) ||
                    (month !== undefined && (typeof month !== 'string' || !/^(all|0[1-9]|1[0-2])$/.test(month))) ||
                    (format !== undefined && format !== 'pdf')) {
                    return res.status(400).json({ success: false, error: 'Choose a valid historical report period.' });
                }
                const data = reportData(await readFile(datasetPath), { year, month }, barangay);
                res.set('Cache-Control', 'no-store');
                if (format === 'pdf') return renderHistoricalPdf(res, data);
                res.json({ success: true, ...data });
            } catch (error) {
                if (!error.status) console.error('Historical report unavailable:', error.code || error.name);
                respond(res, error.status ? error : { status: 503, message: 'Historical dataset unavailable. Try again later.' });
            }
        });
    }
}

module.exports = { registerHistoricalReports, reportData };
