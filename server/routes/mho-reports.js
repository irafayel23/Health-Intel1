const { createReportData } = require('../services/report-data');
const PDFDocument = require('pdfkit');
const { monthlyPeriod, isoWeekPeriod } = require('../services/report-periods');
const { respond } = require('../services/service-errors');
const { createReportExport } = require('../services/report-export');

function reviewNotice(doc) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#9a3412')
        .text('ACADEMIC SAMPLE - NOT FOR OFFICIAL SUBMISSION', { width: 495, align: 'center' });
}

function renderMonthlyCases(doc, rows, period) {
    const bottom = () => doc.page.height - doc.page.margins.bottom;
    const columns = [
        { label: 'No.', x: 60, width: 30 },
        { label: 'Recorded condition', x: 100, width: 175 },
        { label: 'Registry category', x: 285, width: 85 },
        { label: 'Case status', x: 380, width: 70 },
        { label: 'Entries', x: 465, width: 70 }
    ];
    const header = () => {
        doc.font('Helvetica-Bold').fontSize(10);
        const height = Math.max(...columns.map(c => doc.heightOfString(c.label, { width: c.width }))) + 12;
        const y = doc.y;
        doc.rect(50, y - 5, 495, height).fill('#f1f5f9');
        for (const c of columns) doc.fillColor('#334155').text(c.label, c.x, y, { width: c.width });
        doc.y = y + height + 5;
    };
    const nextPage = () => {
        doc.addPage();
        reviewNotice(doc);
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
            .text(`Monthly recorded-case summary - ${period.month} ${period.year} (continued)`, 50, doc.y + 10, { width: 495 });
        doc.moveDown();
        header();
    };
    header();
    let total = 0;
    rows.forEach((row, index) => {
        const category = row.category === 'mortality' ? 'Mortality' : row.category === 'morbidity' ? 'Morbidity' : 'Unclassified';
        const values = [String(index + 1), row.disease, category, row.status || 'Not recorded', String(row.count)];
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
    doc.rect(50, y, 495, 25).fill('#f1f5f9');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('TOTAL RECORDED ENTRIES', 60, y + 7, { width: 380 });
    doc.text(String(total), 465, y + 7, { width: 70 });
    doc.y = y + 35;
}

function renderMonthlyReview(doc) {
    if (doc.y + 110 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        reviewNotice(doc);
    }
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('MHO REVIEW', 50, doc.y, { width: 495 });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor('#475569')
        .text('For review of recorded entries only. Registry category and case status are not verified diagnoses, official morbidity/mortality classifications, or reporting eligibility. This copy does not certify completeness or accuracy.', { width: 495 });
    doc.moveDown();
    doc.text('Reviewed by: __________________________    Date: ______________', { width: 495 });
}

function renderWeeklyCases(doc, rows, period) {
    const bottom = () => doc.page.height - doc.page.margins.bottom;
    const columns = [
        { label: 'Date Recorded', x: 60, width: 110, font: 'Helvetica', color: '#0f172a' },
        { label: 'Recorded condition', x: 180, width: 150, font: 'Helvetica-Bold', color: '#ef4444' },
        { label: 'Recorded Severity', x: 340, width: 100, font: 'Helvetica-Oblique', color: '#ea580c' },
        { label: 'Status', x: 450, width: 85, font: 'Helvetica-Bold', color: '#ef4444' }
    ];
    const header = () => {
        const y = doc.y;
        doc.rect(50, y - 5, 495, 25).fill('#fef2f2');
        doc.font('Helvetica-Bold').fillColor('#7f1d1d').fontSize(11);
        for (const column of columns) doc.text(column.label, column.x, y, { width: column.width });
        doc.y = y + 30;
    };
    const nextPage = () => {
        doc.addPage();
        reviewNotice(doc);
        doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(11)
            .text(`Weekly recorded-case summary - Week ${period.week}, ${period.year} (continued)`, 50, doc.y + 10, { width: 495 });
        doc.moveDown();
        header();
    };
    header();
    for (const row of rows) {
        const severity = row.severity || 'Not recorded';
        const values = [new Date(row.date_recorded).toLocaleDateString(), row.disease, severity, row.status];
        const height = Math.max(...columns.map((column, index) => {
            doc.font(column.font).fontSize(10);
            return doc.heightOfString(values[index], { width: column.width });
        })) + 12;
        if (doc.y + height > bottom() - 5) nextPage();
        const y = doc.y;
        doc.moveTo(50, y - 5).lineTo(545, y - 5).lineWidth(0.5).strokeColor('#fecaca').stroke();
        columns.forEach((column, index) => {
            doc.font(column.font).fontSize(10)
                .fillColor(index === 2 && severity === 'High Risk' ? '#dc2626' : column.color)
                .text(values[index], column.x, y, { width: column.width });
        });
        doc.y = y + height;
    }
    if (doc.y + 32 > bottom()) nextPage();
    const y = doc.y;
    doc.moveTo(50, y - 5).lineTo(545, y - 5).lineWidth(1.5).strokeColor('#ef4444').stroke();
    doc.rect(50, y, 495, 25).fill('#fff1f2');
    doc.font('Helvetica-Bold').fillColor('#7f1d1d').fontSize(11)
        .text('TOTAL RECORDED CASES', 60, y + 7, { width: 370 });
    doc.text(rows.length.toString(), 450, y + 7, { width: 85 });
    doc.y = y + 32;
}

function renderWeeklySignature(doc) {
    doc.font('Helvetica-Bold').fontSize(11);
    const caption = 'Epidemiology Surveillance Officer';
    const height = 56 + doc.heightOfString(caption, { width: 195 });
    const bottom = doc.page.height - doc.page.margins.bottom;
    let gap = 60;
    if (doc.y + gap + height > bottom) gap = 20;
    if (doc.y + gap + height > bottom) {
        doc.addPage();
        reviewNotice(doc);
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
            const months = [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December'
            ];
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

            doc.fontSize(16)
                .font('Helvetica-Bold')
                .fillColor('#0f172a')
                .text('HEALTH-INTEL', { align: 'center' });
            reviewNotice(doc);
            doc.moveDown(0.5);
            doc.fontSize(11)
                .font('Helvetica')
                .fillColor('#475569')
                .text('Monthly recorded-case summary for MHO review', { align: 'center' });
            doc.fontSize(10).text('Municipal Health Office - Murcia, Negros Occidental', { align: 'center' });

            doc.moveDown(1.5);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1.5).strokeColor('#0284c7').stroke();
            doc.moveDown(1);

            doc.fontSize(14)
                .font('Helvetica-Bold')
                .fillColor('#0f172a')
                .text('MONTHLY RECORDED-CASE SUMMARY', { align: 'center' });
            doc.fontSize(11)
                .font('Helvetica')
                .fillColor('#64748b')
                .text('Period: ' + month + ' ' + year, { align: 'center' });
            doc.moveDown(2);
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
                renderMonthlyCases(doc, rows, { month, year });
            }
            renderMonthlyReview(doc);

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
            await exports.prepared(req.user,'PIDSR',period,rows.length);
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            res.setHeader(
                'Content-disposition',
                'attachment; filename=PIDSR_' + period.year + '_Week_' + weekNum + '_Report.pdf'
            );
            res.setHeader('Content-type', 'application/pdf');

            doc.pipe(res);

            doc.fontSize(16)
                .font('Helvetica-Bold')
                .fillColor('#0f172a')
                .text('HEALTH-INTEL', { align: 'center' });
            reviewNotice(doc);
            doc.moveDown(0.5);
            doc.fontSize(11)
                .font('Helvetica')
                .fillColor('#475569')
                .text('Weekly recorded-case summary for MHO review', { align: 'center' });
            doc.fontSize(10).text('Municipal Health Office - Murcia, Negros Occidental', { align: 'center' });

            doc.moveDown(1.5);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1.5).strokeColor('#ef4444').stroke();
            doc.moveDown(1);

            doc.fontSize(14)
                .font('Helvetica-Bold')
                .fillColor('#0f172a')
                .text('WEEKLY RECORDED-CASE SUMMARY', { align: 'center' });
            doc.fontSize(11)
                .font('Helvetica')
                .fillColor('#64748b')
                .text('Week ' + weekNum + ', ' + period.year + ' (Monday-Sunday)', { align: 'center' });
            const lastDay = new Date(period.end + 'T00:00:00Z');
            lastDay.setUTCDate(lastDay.getUTCDate() - 1);
            const reportDate = value => new Intl.DateTimeFormat('en-PH', {
                timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric'
            }).format(new Date(value + 'T00:00:00Z'));
            doc.fontSize(10).text(`Recorded dates: ${reportDate(period.start)} to ${reportDate(lastDay.toISOString().slice(0, 10))}`, { align: 'center' });
            doc.moveDown(2);
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
                renderWeeklyCases(doc, rows, period);
            }

            renderWeeklySignature(doc);

            doc.end();
        } catch (error) {
            try { await exports.failed(req.user,'PIDSR',error); } catch { console.error('PIDSR report audit unavailable.'); }
            if (!error.status) console.error('PIDSR Report Error:', error.code || error.name);
            respond(res, error, 'Report generation failed.');
        }
    });
}

module.exports = { registerMhoReportRoutes };
