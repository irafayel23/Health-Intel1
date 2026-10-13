const {todayPeriod}=require('../services/report-periods');
const {dailyReportData,dailyReportPdf}=require('../services/daily-report');
const {createSystemAudit}=require('../services/system-audit');

function registerDailyReportRoutes(app,db) {
    const audit=createSystemAudit(db);
    for(const role of ['bhw','mho'])app.get(`/api/${role}/reports/today`,async(req,res)=>{
        try {
            // The server clock selects today, regardless of client query values.
            const period=todayPeriod(),data=await dailyReportData(db,req.user,period);
            const pdf=await dailyReportPdf(data,period,role);
            await audit.record(req.user,'Report Export Prepared',{
                summary:`Prepared ${role.toUpperCase()} today report: ${data.caseCount} cases and ${data.visitCount} consultations.`,
                outcome:'Prepared',target_type:'Report',target_id:`${role.toUpperCase()} Today`,
                period:{start:period.start,end_exclusive:period.end,time_zone:period.timeZone},
                barangay_id:role==='bhw'?req.user.barangay_id:null,record_count:data.caseCount,visit_count:data.visitCount,
                delivery:'PDF response prepared; browser download and file saving are not verified.'
            });
            res.set('Content-Type','application/pdf').set('Content-Disposition',`attachment; filename="${role.toUpperCase()}_Today_${period.start}.pdf"`).send(pdf);
        } catch(error) {
            try {await audit.record(req.user,'Report Export Failed',{summary:`${role.toUpperCase()} today report could not be prepared.`,outcome:'Failed',target_type:'Report',target_id:`${role.toUpperCase()} Today`});} catch {}
            res.status(error.status===403?403:503).json({success:false,error:'Today’s report could not be prepared. Please try again.'});
        }
    });
}
module.exports={registerDailyReportRoutes};
