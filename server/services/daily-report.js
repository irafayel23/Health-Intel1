const path = require('node:path');
const PDFDocument = require('pdfkit');
const {caseAgeSql,visitAgeSql,ageGroupSql}=require('./age-groups');

const facilitySeal = path.join(__dirname, '../../assets/img/murcia-main-primary-care.png');

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
        h.status, h.severity, ${ageGroupSql(caseAgeSql('h'))} AS age_group, COUNT(*) AS count FROM health_cases h JOIN barangays b ON b.id=h.barangay_id
        WHERE h.date_recorded>=? AND h.date_recorded<?${scope}
        GROUP BY b.id,b.name,condition_label,h.status,h.severity,age_group ORDER BY b.name,condition_label,h.status,h.severity,age_group`, params);
    const [visits] = await db.execute(`SELECT b.name AS barangay, ${condition} AS condition_label,
        v.nature_of_visit, v.transaction_mode, ${ageGroupSql(visitAgeSql())} AS age_group, COUNT(*) AS count
        FROM case_visits v JOIN health_cases h ON h.id=v.case_id JOIN barangays b ON b.id=h.barangay_id
        WHERE v.consultation_date>=? AND v.consultation_date<?${scope}
        GROUP BY b.id,b.name,condition_label,v.nature_of_visit,v.transaction_mode,age_group
        ORDER BY b.name,condition_label,v.nature_of_visit,v.transaction_mode,age_group`, params);
    let scopeLabel = 'All barangays';
    if (scoped) {
        const [rows] = await db.execute('SELECT name FROM barangays WHERE id=?', [user.barangay_id]);
        scopeLabel = rows[0]?.name || 'Assigned barangay';
    }
    const total = rows => rows.reduce((sum, row) => sum + Number(row.count), 0);
    return {cases, visits, scopeLabel, caseCount:total(cases), visitCount:total(visits)};
}

function renderReportHeading(doc, title, subtitle) {
    const left=doc.page.margins.left, width=doc.page.width-left-doc.page.margins.right;
    const ink="#163546", muted="#425c6a", teal="#126259";
    doc.image(facilitySeal,left,49,{fit:[50,50]});
    doc.font('Helvetica-Bold').fontSize(9).fillColor(teal)
        .text('MURCIA MAIN  /  PRIMARY CARE FACILITY',left+63,49,{width:width-63});
    doc.fontSize(20).fillColor(ink)
        .text(title,left+63,64,{width:width-63});
    doc.font('Helvetica').fontSize(10).fillColor(muted)
        .text(subtitle,left+63,91,{width:width-63});
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#9a3412')
        .text('ACADEMIC SAMPLE - NOT FOR OFFICIAL SUBMISSION',left,114,{width});
    doc.moveTo(left,131).lineTo(left+width,131).lineWidth(1).strokeColor('#cadbd9').stroke();
    doc.y=140;
}

function renderDailyReport(doc, data, period, role, options={}) {
    const day=options.daily?'the selected date':'today';
    const left=42, width=511, bottom=()=>doc.page.height-doc.page.margins.bottom;
    const date=new Date(period.start+'T00:00:00Z').toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
    const ink='#163546', muted='#425c6a', teal='#126259';
    const pageHeading = (continued=false) => renderReportHeading(doc,
        `${role.toUpperCase()} ${options.daily?'Daily':'Today'} Report${continued?' (continued)':''}`,
        `${date}  |  ${data.scopeLabel}  |  Philippine time`);
    pageHeading();
    const cardWidth=(width-12)/2;
    for(const [index,label,total] of [[0,'Recorded disease cases',data.caseCount],[1,'Consultations',data.visitCount]]){
        const x=left+index*(cardWidth+12);
        doc.roundedRect(x,145,cardWidth,60,7).fill('#eaf4f2');
        doc.font('Helvetica-Bold').fontSize(10).fillColor(teal).text(label,x+13,157,{width:cardWidth-26});
        doc.fontSize(23).fillColor(ink).text(String(total),x+13,173,{width:cardWidth-26});
    }
    doc.y=218;
    function table(title, columns, rows, empty) {
        const heading=()=>{
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(title,left,doc.y+8,{width});
            doc.fontSize(9);
            const y=doc.y+10, height=Math.max(...columns.map(c=>doc.heightOfString(c.label,{width:c.width-12})))+16;
            doc.rect(left,y,width,height).fill('#e1eeec');
            let x=left;
            for(const c of columns){doc.fillColor(ink).text(c.label,x+6,y+8,{width:c.width-12});x+=c.width;}
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
    table(`1. Disease cases dated ${day}`,[
        {label:'Barangay',key:'barangay',width:85},{label:'Recorded condition',key:'condition_label',width:145},
        {label:'Case status',key:'status',width:70},{label:'Severity',key:'severity',width:70},{label:'Age group',key:'age_group',width:85},{label:'Cases',key:'count',width:56}
    ],data.cases,`No disease cases are dated ${day} in this scope.`);
    table(`2. Consultations dated ${day}`,[
        {label:'Barangay',key:'barangay',width:80},{label:'Recorded condition',key:'condition_label',width:125},
        {label:'Nature of visit',key:'nature_of_visit',width:95},{label:'Transaction',key:'transaction_mode',width:75},{label:'Age group',key:'age_group',width:80},{label:'Visits',key:'count',width:56}
    ],data.visits,`No structured consultations are dated ${day} in this scope.`);

    if(doc.y+120>bottom()){doc.addPage();pageHeading(true);}
    doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text('How counts are calculated',left,doc.y+12,{width});
    doc.font('Helvetica').fontSize(9).fillColor(muted);
    doc.text('Cases use the recorded case date and include archived cases. Consultations use the visit date. Follow-ups and admissions for existing cases count as consultations. Older cases without visit details appear in the case table.',left,doc.y+5,{width});
    doc.text('The report uses current classifications and case statuses. Generate it again after saving corrections or late entries.',left,doc.y+5,{width});
    doc.text('Age groups (years) are 0-5, 6-12, 13-17, 18-59 and 60+. Age is based on the case or visit date. Unavailable ages appear as Not recorded.',left,doc.y+5,{width});
}

function dailyReportPdf(data, period, role, options={}) {
    return new Promise((resolve,reject)=>{
        const doc=new PDFDocument({size:'A4',margin:42}),chunks=[];
        doc.on('data',chunk=>chunks.push(chunk));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
        try {renderDailyReport(doc,data,period,role,options);doc.end();} catch(error) {doc.destroy();reject(error);}
    });
}
module.exports={dailyReportData,renderDailyReport,dailyReportPdf,renderReportHeading};
