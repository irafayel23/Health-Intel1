const PDFDocument = require('pdfkit');
const {caseFields} = require('../services/age-groups');
const {transaction} = require('../services/database-transaction');
const {createSystemAudit} = require('../services/system-audit');
const {invalid, respond} = require('../services/service-errors');

const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
    ? new Intl.DateTimeFormat('en-PH', {dateStyle:'medium', timeZone:'UTC'}).format(new Date(value + 'T00:00:00Z'))
    : 'Not recorded';

function caseSummaryPdf(record, visits, office) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({size:'A4', margin:44, bufferPages:true, info:{Title:'Health-Intel patient case summary'}});
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('error', reject);
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        const text = (value, size = 11, color = '#172b43', bold = false) => {
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color).text(String(value));
        };
        const section = heading => {
            if (doc.y > doc.page.height - 115) doc.addPage();
            doc.moveDown(.65);
            doc.moveTo(44,doc.y).lineTo(doc.page.width-44,doc.y).strokeColor('#ccdbe6').stroke();
            doc.y += 10;
            text(heading,13,'#075e66',true);
            doc.moveDown(.35);
        };
        const field = (label, value) => text(label + ': ' + (value ?? 'Not recorded'));
        try {
            text('HEALTH-INTEL  /  CASE RECORD',10,'#075e66',true);
            doc.moveDown(.5);
            text('Patient case summary',24,'#112a42',true);
            doc.moveDown(.3);
            text('REC-' + record.id + '  |  ' + office,11,'#41566f');
            text('Generated ' + new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'}).format(new Date()) + ' PHT',10,'#41566f');
            section('Patient details');
            text(record.patient_name || 'Not recorded',16,'#112a42',true);
            field('Age at case',record.age_at_case == null ? null : record.age_at_case + ' years');
            field('Barangay',record.barangay_name || null);
            field('Purok / zone',record.purok || null);
            section('Case details');
            const underReview = ['Pending','Clarification'].includes(record.disease_review_status);
            const reviewLabel = record.disease_review_status === 'Clarification' ? 'Clarification requested' : 'Needs review';
            field('Recorded condition',underReview ? (record.disease_reported || 'Unlisted condition') + ' (' + reviewLabel + ')' : record.disease || null);
            field('Case date',date(record.date_recorded));
            field('Status',(record.status === 'Deceased' ? 'Historical outcome' : record.status || 'Not recorded') + (record.is_archived ? ' (Archived)' : ''));
            field('Severity',record.severity || null);
            section('Consultation history');
            if (!visits.length) text('No consultations recorded for this case.',11,'#41566f');
            for (const visit of visits) {
                if (doc.y > doc.page.height - 105) doc.addPage();
                text(date(visit.consultation_date) + '  |  ' + (visit.nature_of_visit || 'Visit type not recorded'),11,'#112a42',true);
                field('Notes',visit.remarks || 'None recorded');
                doc.moveDown(.65);
            }
            const pages = doc.bufferedPageRange();
            for (let page = pages.start; page < pages.start + pages.count; page++) {
                doc.switchToPage(page);
                doc.font('Helvetica').fontSize(8).fillColor('#41566f')
                    .text('Confidential patient information  |  REC-' + record.id + '  |  Page ' + (page + 1) + ' of ' + pages.count,44,doc.page.height-35,{lineBreak:false});
            }
            doc.end();
        } catch (error) {
            doc.destroy();
            reject(error);
        }
    });
}

function registerPatientCaseSummary(app, db) {
    app.get('/api/patients/:id/case-summary.pdf', async (req, res) => {
        try {
            const {user} = req;
            if (!['bhw','mho'].includes(user?.role) || (user.role === 'bhw' && !user.barangay_id)) {
                throw invalid('You do not have access to this download.',403);
            }
            const id = Number(req.params.id);
            if (!Number.isSafeInteger(id) || id < 1) throw invalid('Case not found.',404);
            const pdf = await transaction(db, async connection => {
                const isBhw = user.role === 'bhw';
                const [[record]] = await connection.execute(
                    `SELECT h.id, h.patient_name, h.age, DATE_FORMAT(h.birthdate,'%Y-%m-%d') AS birthdate,
                     DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded, h.purok, b.name AS barangay_name,
                     h.status, h.severity, h.disease, h.disease_review_status, h.disease_reported, h.is_archived
                     FROM health_cases h JOIN residents r ON r.id=h.resident_id LEFT JOIN barangays b ON b.id=h.barangay_id
                     WHERE h.id=?${isBhw ? ' AND h.barangay_id=? AND r.barangay_id=?' : ''}`,
                    isBhw ? [id,user.barangay_id,user.barangay_id] : [id]
                );
                if (!record) throw invalid('Linked case not found or unavailable to your account.',404);
                const [visits] = await connection.execute(
                    `SELECT DATE_FORMAT(consultation_date,'%Y-%m-%d') AS consultation_date, nature_of_visit, remarks
                     FROM case_visits WHERE case_id=? ORDER BY consultation_date, consultation_time, id`,[id]
                );
                const office = isBhw ? 'Barangay Health Office - ' + (record.barangay_name || 'Assigned barangay') : 'Municipal Health Office';
                const document = await caseSummaryPdf(caseFields(record),visits,office);
                await createSystemAudit(connection).record(user,'Report Export Prepared',{
                    summary:'Individual patient case summary PDF prepared.',
                    target_type:'Case', target_id:'REC-' + id, outcome:'Prepared'
                });
                return document;
            });
            res.type('pdf').set('Cache-Control','no-store').attachment('Health-Intel-REC-' + id + '.pdf').send(pdf);
        } catch (error) {
            respond(res,error,'The case summary could not be prepared. Please try again.');
        }
    });
}

module.exports = {registerPatientCaseSummary, caseSummaryPdf};

