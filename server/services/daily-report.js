const PDFDocument = require('pdfkit');

// Summaries contain no resident names or identifiers. A return visit is counted
// in the visit section, not again as a newly recorded disease case.
async function dailyReportData(db, user, period) {
    const scoped = user.role === 'bhw';
    if (scoped && !user.barangay_id) throw Object.assign(new Error('An assigned barangay is required.'), {status:403});
    const scope = scoped ? ' AND h.barangay_id=?' : '';
    const params = [period.start, period.end, ...(scoped ? [user.barangay_id] : [])];
    const condition = `CASE WHEN h.disease_review_status IN ('Pending','Clarification')
        THEN CONCAT(COALESCE(NULLIF(h.disease_reported,''),'Unlisted condition'),' (',h.disease_review_status,')')
        ELSE COALESCE(h.disease,'Not recorded') END`;
    const [cases] = await db.execute(`SELECT b.name AS barangay, ${condition} AS condition_label,
        h.status, h.severity, COUNT(*) AS count FROM health_cases h JOIN barangays b ON b.id=h.barangay_id
        WHERE h.date_recorded>=? AND h.date_recorded<?${scope}
        GROUP BY b.id,b.name,condition_label,h.status,h.severity ORDER BY b.name,condition_label,h.status,h.severity`, params);
    const [visits] = await db.execute(`SELECT b.name AS barangay, ${condition} AS condition_label,
        v.nature_of_visit, v.transaction_mode, COUNT(*) AS count
        FROM case_visits v JOIN health_cases h ON h.id=v.case_id JOIN barangays b ON b.id=h.barangay_id
        WHERE v.consultation_date>=? AND v.consultation_date<?${scope}
        GROUP BY b.id,b.name,condition_label,v.nature_of_visit,v.transaction_mode
        ORDER BY b.name,condition_label,v.nature_of_visit,v.transaction_mode`, params);
    let scopeLabel = 'All barangays';
    if (scoped) {
        const [rows] = await db.execute('SELECT name FROM barangays WHERE id=?', [user.barangay_id]);
        scopeLabel = rows[0]?.name || 'Assigned barangay';
    }
    const total = rows => rows.reduce((sum, row) => sum + Number(row.count), 0);
    return {cases, visits, scopeLabel, caseCount:total(cases), visitCount:total(visits)};
}

function renderDailyReport(doc, data, period, role) {
    const left=42, width=511, bottom=()=>doc.page.height-doc.page.margins.bottom;
    const date=new Date(period.start+'T00:00:00Z').toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
    function pageHeading(continued=false) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#9a3412').text('ACADEMIC SAMPLE - NOT FOR OFFICIAL SUBMISSION',left,42,{width,align:'center'});
        doc.fontSize(18).fillColor('#0f172a').text(`${role.toUpperCase()} - Today report${continued?' (continued)':''}`,left,62,{width});
        doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`${date} | Asia/Manila | ${data.scopeLabel}`,left,doc.y+8,{width});
        doc.moveDown();
    }
    pageHeading();
    doc.fontSize(11).fillColor('#0f172a').text(`Recorded disease cases: ${data.caseCount}    |    Consultations: ${data.visitCount}`,left,doc.y,{width});
    doc.fontSize(9).fillColor('#475569').text('Cases use the recorded case date; consultations use the visit date. Follow-ups and admissions under an existing case do not add a disease case. Includes archived records dated today; classification and case status are current.',left,doc.y+10,{width});
    doc.text('Older records without structured visit details appear only in the case section. This report covers today so far and can change as records are saved.',left,doc.y+6,{width});
    doc.moveDown();
    function table(title, columns, rows, empty) {
        const heading=()=>{
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(title,left,doc.y+8,{width});
            doc.fontSize(9);
            const y=doc.y+10, height=Math.max(...columns.map(c=>doc.heightOfString(c.label,{width:c.width-12})))+16;
            doc.rect(left,y,width,height).fill('#e2e8f0');
            let x=left;
            for(const c of columns){doc.fillColor('#334155').text(c.label,x+6,y+8,{width:c.width-12});x+=c.width;}
            doc.y=y+height;
        };
        const newPage=()=>{doc.addPage();pageHeading(true);heading();};
        if(doc.y+100>bottom()) {doc.addPage();pageHeading(true);}
        heading();
        if(!rows.length){doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(empty,left+6,doc.y+12,{width:width-12});doc.moveDown();return;}
        rows.forEach((row,index)=>{
            doc.font('Helvetica').fontSize(9);
            const height=Math.max(...columns.map(c=>doc.heightOfString(String(row[c.key]??'Not recorded'),{width:c.width-12})))+18;
            if(doc.y+height>bottom())newPage();
            doc.font('Helvetica').fontSize(9);
            const y=doc.y;doc.rect(left,y,width,height).fill(index%2?'#f8fafc':'#ffffff');
            let x=left;
            for(const c of columns){doc.fillColor('#334155').text(String(row[c.key]??'Not recorded'),x+6,y+9,{width:c.width-12});x+=c.width;}
            doc.y=y+height;
        });
        doc.y+=12;
    }
    table('1. Disease cases dated today',[
        {label:'Barangay',key:'barangay',width:110},{label:'Recorded condition',key:'condition_label',width:181},
        {label:'Case status',key:'status',width:78},{label:'Severity',key:'severity',width:84},{label:'Cases',key:'count',width:58}
    ],data.cases,'No disease cases are dated today in this scope.');
    table('2. Consultations dated today',[
        {label:'Barangay',key:'barangay',width:100},{label:'Recorded condition',key:'condition_label',width:155},
        {label:'Nature of visit',key:'nature_of_visit',width:116},{label:'Transaction',key:'transaction_mode',width:82},{label:'Visits',key:'count',width:58}
    ],data.visits,'No structured consultations are dated today in this scope.');
}

function dailyReportPdf(data, period, role) {
    return new Promise((resolve,reject)=>{
        const doc=new PDFDocument({size:'A4',margin:42}),chunks=[];
        doc.on('data',chunk=>chunks.push(chunk));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
        try {renderDailyReport(doc,data,period,role);doc.end();} catch(error) {doc.destroy();reject(error);}
    });
}
module.exports={dailyReportData,renderDailyReport,dailyReportPdf};
