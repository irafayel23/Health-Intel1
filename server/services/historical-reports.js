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
    const datesByPlace = new Map();
    for (const row of scoped) {
        if (!datesByPlace.has(row.Barangay)) datesByPlace.set(row.Barangay, new Set());
        datesByPlace.get(row.Barangay).add(row.Date);
    }
    const barangayPeriods = Object.fromEntries([...datesByPlace].sort(([left], [right]) => left.localeCompare(right))
        .map(([place, dates]) => [place, [...dates].sort().reverse()]));
    const periods = [...new Set(Object.values(barangayPeriods).flat())].sort().reverse();
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
        source, year, month, periods, barangayPeriods, scope: barangay ?? 'All seven barangays', total,
        monthly: [...monthly].sort().map(([period, cases]) => ({ period, cases })),
        breakdown: [...breakdown].sort().map(([key, cases]) => {
            const [barangay, disease] = key.split('|');
            return { barangay, disease, cases };
        })
    };
}

function renderHistoricalPdf(res, data, barangayReport = false) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const label = data.month === 'all' ? data.year + ' annual totals' : months[Number(data.month) - 1] + ' ' + data.year;
    const dateLabel = period => months[Number(period.slice(5)) - 1] + ' ' + period.slice(0, 4);
    const left = doc.page.margins.left;
    const width = doc.page.width - 2 * left;
    const count = value => value.toLocaleString('en-PH');
    const heading = title => doc.font('Helvetica-Bold').fontSize(11).fillColor('#163546')
        .text(title, left, doc.y, { width });
    function table(headers, rows, widths, hasTotal = false) {
        const rowHeight = 22;
        let index = 0;
        for (const cells of [headers, ...rows]) {
            const y = doc.y;
            const emphasized = index === 0 || (hasTotal && index === rows.length);
            const fill = index === 0 ? '#126259' : emphasized ? '#d9efeb' : index % 2 ? '#f1f6f7' : '#ffffff';
            doc.rect(left, y, width, rowHeight).fill(fill);
            let x = left;
            cells.forEach((cell, column) => {
                doc.font(emphasized ? 'Helvetica-Bold' : 'Helvetica').fontSize(index === 0 && widths[column] < 60 ? 7 : 9)
                    .fillColor(index === 0 ? '#ffffff' : '#163546')
                    .text(cell, x + 5, y + 6, { width: widths[column] - 7, align: column ? 'right' : 'left', lineBreak: false });
                x += widths[column];
            });
            doc.y = y + rowHeight;
            index++;
        }
        doc.moveDown();
    }

    const filenameMonth = data.month === 'all' ? 'Annual' : months[Number(data.month) - 1];
    const filename = barangayReport
        ? 'Barangay_Case_Report_' + data.scope.replace(/[^a-z0-9]+/gi, '_') + '_' + filenameMonth + '_' + data.year + '.pdf'
        : 'FHSIS_Report_' + filenameMonth + '_' + data.year + '.pdf';
    res.attachment(filename);
    doc.pipe(res);
    renderReportHeading(doc, barangayReport ? 'Barangay Case Report' : 'Historical Case Counts', label + ' | ' + data.scope);
    doc.font('Helvetica').fontSize(9).fillColor('#536973').text('Historical cases', left, doc.y, { width });
    doc.moveDown(0.6);
    heading(count(data.total) + ' total cases');
    doc.moveDown(0.5);

    const barangays = [...new Set(data.breakdown.map(row => row.barangay))];
    const diseases = [...new Set(data.breakdown.map(row => row.disease))];
    const byPlace = new Map(data.breakdown.map(row => [row.barangay + '|' + row.disease, row.cases]));
    const municipal = barangays.length > 1;
    const value = (place, disease) => byPlace.get(place + '|' + disease);
    const total = values => count(values.reduce((sum, item) => sum + (item ?? 0), 0));
    const headers = municipal ? ['Disease', ...barangays, 'Total'] : ['Disease', 'Cases'];
    const rows = diseases.map(disease => {
        const values = barangays.map(place => value(place, disease));
        return [disease, ...values.map(item => item === undefined ? '-' : count(item)), ...(municipal ? [total(values)] : [])];
    });
    rows.push(['Total', ...barangays.map(place => total(diseases.map(disease => value(place, disease)))), ...(municipal ? [count(data.total)] : [])]);
    heading('Cases by disease');
    doc.moveDown(0.4);
    const diseaseWidth = municipal ? 108 : 345;
    table(headers, rows, [diseaseWidth, ...Array(headers.length - 1).fill((width - diseaseWidth) / (headers.length - 1))], true);

    if (data.month === 'all') {
        doc.addPage();
        renderReportHeading(doc, 'Historical Case Counts', label + ' | ' + data.scope);
        heading('Cases by month');
        doc.moveDown(0.4);
        table(['Month', 'Cases'], data.monthly.map(row => [dateLabel(row.period), count(row.cases)]), [345, width - 345]);
    }
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
                const { year, month, format, barangay: requestedBarangay } = req.query;
                if (requestedBarangay !== undefined) {
                    if (role !== 'mho' || !BARANGAYS.includes(requestedBarangay) || !year || !month || month === 'all') {
                        return res.status(400).json({ success: false, error: 'Choose a study barangay and a single covered month.' });
                    }
                    barangay = requestedBarangay;
                }
                if ((year !== undefined && (typeof year !== 'string' || !/^[1-9]\d{3}$/.test(year))) ||
                    (month !== undefined && (typeof month !== 'string' || !/^(all|0[1-9]|1[0-2])$/.test(month))) ||
                    (format !== undefined && format !== 'pdf')) {
                    return res.status(400).json({ success: false, error: 'Choose a valid historical report period.' });
                }
                const data = reportData(await readFile(datasetPath), { year, month }, barangay);
                res.set('Cache-Control', 'no-store');
                if (format === 'pdf') return renderHistoricalPdf(res, data, requestedBarangay !== undefined);
                res.json({ success: true, ...data });
            } catch (error) {
                if (!error.status) console.error('Historical report unavailable:', error.code || error.name);
                respond(res, error.status ? error : { status: 503, message: 'Historical dataset unavailable. Try again later.' });
            }
        });
    }
}

module.exports = { registerHistoricalReports, reportData };
