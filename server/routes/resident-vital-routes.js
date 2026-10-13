const {createResidentVital}=require('../services/resident-vital');
const {respond}=require('../services/service-errors');
const {createSystemAudit}=require('../services/system-audit');
const PDFDocument=require('pdfkit');
function residentDeathsPdf(rows) {
    return new Promise((resolve,reject)=>{
        const doc=new PDFDocument({size:'A4',margin:45}),chunks=[];
        doc.on('data',chunk=>chunks.push(chunk));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
        const heading=()=>{doc.font('Helvetica-Bold').fontSize(9).fillColor('#9a3412').text('ACADEMIC SAMPLE - NOT FOR OFFICIAL SUBMISSION');doc.moveDown();doc.fontSize(17).fillColor('#0f172a').text('Confirmed deceased residents');doc.font('Helvetica').fontSize(10).text('One entry per resident. This is not a cause-of-death report.');doc.moveDown();};
        try {
            heading();doc.text(`Total confirmed deceased residents in selected scope: ${rows.length}`);doc.moveDown();
            if(!rows.length)doc.text('No confirmed deceased residents in this scope.');
            for(const row of rows){
                const text=`Resident #${row.resident_id} - ${row.patient_name}\nBarangay: ${row.barangay_name}\nDeath date: ${row.death_date||'Unknown'} | Confirmed: ${row.confirmed_date||'Not recorded'}`;
                const height=doc.heightOfString(text,{width:505})+22;
                if(doc.y+height>doc.page.height-45){doc.addPage();heading();}
                doc.font('Helvetica').fontSize(10).fillColor('#334155').text(text,{width:505});doc.moveDown();
            }
            doc.end();
        }catch(error){doc.destroy();reject(error);}
    });
}
function registerResidentVitalRoutes(app,db) {
    const vital=createResidentVital(db);
    const route=(path,method,action)=>app[method](path,async(req,res)=>{try{res.json({success:true,...await action(req)});}catch(error){respond(res,error,'Resident status could not be saved or loaded. Please try again.');}});
    route('/api/residents/:id/death-report','post',req=>vital.report(req.user,Number(req.params.id),req.body||{}));
    route('/api/mho/resident-status','get',req=>vital.list(req.query));
    route('/api/mho/death-reports/:id/review','put',req=>vital.review(req.user,Number(req.params.id),req.body||{}));
    route('/api/mho/residents/:id/vital-status','put',req=>vital.correct(req.user,Number(req.params.id),req.body||{}));
    app.get('/api/mho/reports/deceased-residents',async(req,res)=>{
        try {
            const result=await vital.list({...req.query,view:'deceased'},true),pdf=await residentDeathsPdf(result.data);
            await createSystemAudit(db).record(req.user,'Report Export Prepared',{summary:'Confirmed deceased residents registry PDF prepared; one row per resident.',outcome:'Prepared',target_type:'Report',target_id:'Confirmed deceased residents',record_count:result.total,delivery:'PDF prepared; browser file saving is not verified.'});
            res.type('pdf').set('Content-Disposition','attachment; filename="Confirmed_Deceased_Residents.pdf"').send(pdf);
        }catch(error){respond(res,error,'The confirmed-resident report could not be prepared.');}
    });
}
module.exports={registerResidentVitalRoutes,residentDeathsPdf};
