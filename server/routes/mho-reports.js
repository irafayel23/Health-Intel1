const { createReportData } = require('../services/report-data');
const PDFDocument = require('pdfkit');
const { renderReportHeading } = require('../services/daily-report');
const { monthlyPeriod, isoWeekPeriod } = require('../services/report-periods');
const { respond } = require('../services/service-errors');
const { createReportExport } = require('../services/report-export');

function renderMonthlyCases(doc, rows, heading) {
    const bottom = () => doc.page.height - doc.page.margins.bottom;
    const columns = [
        { label: 'No.', x: 60, width: 25 },
        { label: 'Recorded condition', x: 90, width: 140 },
        { label: 'Registry category', x: 240, width: 80 },
        { label: 'Age group', x: 330, width: 65 },
        { label: 'Case status', x: 405, width: 65 },
        { label: 'Entries', x: 480, width: 55 }
    ];
    const header = () => {
        doc.font('Helvetica-Bold').fontSize(10);
        const height = Math.max(...columns.map(c => doc.heightOfString(c.label, { width: c.width }))) + 12;
        const y = doc.y;
        doc.rect(50, y - 5, 495, height).fill('#e1eeec');
        for (const c of columns) doc.fillColor('#334155').text(c.label, c.x, y, { width: c.width });
        doc.y = y + height + 5;
    };
    const nextPage = () => {
        doc.addPage();
        heading(true);
        header();
    };
    header();
    let total = 0;
    rows.forEach((row, index) => {
        const category = row.category === 'mortality' ? 'Mortality' : row.category === 'morbidity' ? 'Morbidity' : 'Unclassified';
        const values = [String(index + 1), row.disease, category, row.age_group || 'Not recorded', row.status || 'Not recorded', String(row.count)];
        doc.font('Helvetica').fontSize(10);
        const height = Math.max(...columns.map((c, i) => doc.heightOfString(values[i], { width: c.width }))) + 12;
        if (doc.y + height > bottom() - 5) nextPage();
        const y = doc.y;
        doc.moveTo(50, y - 5).lineTo(545, y - 5).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
        columns.forEach((c, i) => doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(values[i], c.x, y, { width: c.width }));
        doc.y = y + height;
        total += Number(row.count);
    });
    if (doc.y + 32 > bottom()) nextPage();
    const y = doc.y;
    doc.rect(50, y, 495, 25).fill('#e1eeec');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('TOTAL RECORDED ENTRIES', 60, y + 7, { width: 380 });
    doc.text(String(total), 465, y + 7, { width: 70 });
    doc.y = y + 35;
}

function renderMonthlyReview(doc, heading) {
    if (doc.y + 110 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        heading(true);
    }
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('MHO REVIEW', 50, doc.y, { width: 495 });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor('#475569')
        .text('For review of recorded entries only. Registry category and case status are not verified diagnoses, official morbidity/mortality classifications, or reporting eligibility. This copy does not certify completeness or accuracy.', { width: 495 });
    doc.moveDown();
    doc.text('Reviewed by: __________________________    Date: ______________', { width: 495 });
}

function renderWeeklyCases(doc, rows, heading) {
    const bottom = () => doc.page.height - doc.page.margins.bottom;
    const columns = [
        { label: 'Date Recorded', x: 60, width: 100, font: 'Helvetica', color: '#0f172a' },
        { label: 'Recorded condition', x: 170, width: 135, font: 'Helvetica-Bold', color: '#163546' },
        { label: 'Age group', x: 315, width: 65, font: 'Helvetica', color: '#0f172a' },
        { label: 'Recorded Severity', x: 390, width: 80, font: 'Helvetica', color: '#425c6a' },
        { label: 'Status', x: 480, width: 55, font: 'Helvetica-Bold', color: '#163546' }
    ];
    const header = () => {
        const y = doc.y;
        doc.rect(50, y - 5, 495, 25).fill('#e1eeec');
        doc.font('Helvetica-Bold').fillColor('#163546').fontSize(11);
        for (const column of columns) doc.text(column.label, column.x, y, { width: column.width });
        doc.y = y + 30;
    };
    const nextPage = () => {
        doc.addPage();
        heading(true);
        header();
    };
    header();
    for (const row of rows) {
        const severity = row.severity || 'Not recorded';
        const values = [new Date(row.date_recorded).toLocaleDateString(), row.disease, row.age_group || 'Not recorded', severity, row.status];
        const height = Math.max(...columns.map((column, index) => {
            doc.font(column.font).fontSize(10);
            return doc.heightOfString(values[index], { width: column.width });
        })) + 12;
        if (doc.y + height > bottom() - 5) nextPage();
        const y = doc.y;
        doc.moveTo(50, y - 5).lineTo(545, y - 5).lineWidth(0.5).strokeColor('#cadbd9').stroke();
        columns.forEach((column, index) => {
            doc.font(column.font).fontSize(10)
                .fillColor(index === 3 && severity === 'High Risk' ? '#dc2626' : column.color)
                .text(values[index], column.x, y, { width: column.width });
        });
        doc.y = y + height;
    }
    if (doc.y + 32 > bottom()) nextPage();
    const y = doc.y;
    doc.moveTo(50, y - 5).lineTo(545, y - 5).lineWidth(1.5).strokeColor('#126259').stroke();
    doc.rect(50, y, 495, 25).fill('#eaf4f2');
    doc.font('Helvetica-Bold').fillColor('#163546').fontSize(11)
        .text('TOTAL RECORDED CASES', 60, y + 7, { width: 370 });
    doc.text(rows.length.toString(), 450, y + 7, { width: 85 });
    doc.y = y + 32;
}

function renderWeeklySignature(doc, heading) {
    doc.font('Helvetica-Bold').fontSize(11);
    const caption = 'Epidemiology Surveillance Officer';
    const height = 56 + doc.heightOfString(caption, { width: 195 });
    const bottom = doc.page.height - doc.page.margins.bottom;
    let gap = 60;
    if (doc.y + gap + height > bottom) gap = 20;
    if (doc.y + gap + height > bottom) {
        doc.addPage();
        heading(true);
        gap = 0;
    }
    const y = doc.y + gap;
    doc.fillColor('#0f172a').text('PREPARED FOR REVIEW BY:', 50, y, { width: 245 });
    doc.moveTo(50, y + 50).lineTo(245, y + 50).lineWidth(1).strokeColor('#0f172a').stroke();
    doc.text(caption, 50, y + 56, { align: 'center', width: 195 });
}

function registerMhoReportRoutes(app, db) {
    const reports = createReportData(db);
    const exports = createReportExport(db);
    // ==========================================
    // MHO REPORTS: FHSIS PDF
    // ==========================================
    app.get('/api/mho/reports/fhsis', async (req, res) => {
        try {
            const { month, year } = req.query;
            const period = monthlyPeriod(month, year);

            const rows = await reports.monthly(period);
            await exports.prepared(req.user,'FHSIS',period,rows.reduce((sum,row)=>sum+Number(row.count),0));
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            res.setHeader(
                'Content-disposition',
                'attachment; filename=FHSIS_Report_' + month + '_' + year + '.pdf'
            );
            res.setHeader('Content-type', 'application/pdf');

            doc.pipe(res);

            const heading = (continued=false) => renderReportHeading(doc,
                `MHO Monthly Case Summary${continued?' (continued)':''}`,
                `${month} ${year}  |  All barangays  |  Philippine time`);
            heading();
            doc.x = doc.page.margins.left;

            doc.fontSize(9)
                .font('Helvetica')
                .fillColor('#64748b')
                .text(
                    'Pending classification entries need MHO review. Inclusion does not confirm a diagnosis or official reporting eligibility.'
                );
            doc.moveDown();

            if (rows.length === 0) {
                doc.fontSize(12)
                    .font('Helvetica-Oblique')
                    .fillColor('#94a3b8')
                    .text('No health records found for ' + month + ' ' + year + '.', { align: 'center' });
            } else {
                renderMonthlyCases(doc, rows, heading);
            }
            renderMonthlyReview(doc, heading);

            doc.end();
        } catch (error) {
            try { await exports.failed(req.user,'FHSIS',error); } catch { console.error('FHSIS report audit unavailable.'); }
            if (!error.status) console.error('FHSIS Report Error:', error.code || error.name);
            respond(res, error, 'Report generation failed.');
        }
    });

    // ==========================================
    // MHO REPORTS: PIDSR PDF
    // ==========================================
    app.get('/api/mho/reports/pidsr', async (req, res) => {
        try {
            const period = isoWeekPeriod(req.query.week, req.query.year);
            const weekNum = period.week;

            const rows = await reports.weekly(period);
            if (req.query.format === 'summary') {
                const counts = new Map();
                for (const row of rows) counts.set(row.disease, (counts.get(row.disease) ?? 0) + 1);
                const sunday = new Date(period.end + 'T00:00:00Z');
                sunday.setUTCDate(sunday.getUTCDate() - 1);
                res.set('Cache-Control', 'no-store');
                return res.json({
                    success: true, start: period.start, end: sunday.toISOString().slice(0, 10),
                    total: rows.length, counts: Array.from(counts, ([disease, cases]) => ({ disease, cases }))
                });
            }
            await exports.prepared(req.user,'PIDSR',period,rows.length);
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            res.setHeader(
                'Content-disposition',
                'attachment; filename=PIDSR_' + period.year + '_Week_' + weekNum + '_Report.pdf'
            );
            res.setHeader('Content-type', 'application/pdf');

            doc.pipe(res);

            const heading = (continued=false) => renderReportHeading(doc,
                `MHO Weekly Case Summary${continued?' (continued)':''}`,
                `Week ${weekNum}, ${period.year} (Monday-Sunday)  |  All barangays`);
            heading();
            doc.x = doc.page.margins.left;

            const lastDay = new Date(period.end + 'T00:00:00Z');
            lastDay.setUTCDate(lastDay.getUTCDate() - 1);
            const reportDate = value => new Intl.DateTimeFormat('en-PH', {
                timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric'
            }).format(new Date(value + 'T00:00:00Z'));
            doc.font('Helvetica').fontSize(10).fillColor('#425c6a').text(`Recorded dates: ${reportDate(period.start)} to ${reportDate(lastDay.toISOString().slice(0, 10))}`, { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(9)
                .font('Helvetica')
                .fillColor('#64748b')
                .text(
                    'Pending classification entries need MHO review. Inclusion does not confirm a diagnosis or official reporting eligibility.'
                );
            doc.moveDown();

            if (rows.length === 0) {
                doc.fontSize(12)
                    .font('Helvetica-Oblique')
                    .fillColor('#10b981')
                    .text(
                        'No case records found for the selected week. Reporting completeness is not established.',
                        { align: 'center' }
                    );
            } else {
                renderWeeklyCases(doc, rows, heading);
            }

            renderWeeklySignature(doc, heading);

            doc.end();
        } catch (error) {
            try { await exports.failed(req.user,'PIDSR',error); } catch { console.error('PIDSR report audit unavailable.'); }
            if (!error.status) console.error('PIDSR Report Error:', error.code || error.name);
            respond(res, error, 'Report generation failed.');
        }
    });
}

module.exports = { registerMhoReportRoutes };
