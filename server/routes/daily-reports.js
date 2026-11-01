const {todayPeriod,dailyPeriod}=require('../services/report-periods');
const {dailyReportData,dailyReportPdf}=require('../services/daily-report');
const {createSystemAudit}=require('../services/system-audit');

function registerDailyReportRoutes(app,db) {
    const audit=createSystemAudit(db);
    for(const role of ['bhw','mho'])for(const kind of ['today','daily'])app.get(`/api/${role}/reports/${kind}`,async(req,res)=>{
        try {
            // Keep the existing today endpoint server-selected; daily validates a selected calendar date.
            const period=kind==='today'?todayPeriod():dailyPeriod(req.query.date),data=await dailyReportData(db,req.user,period);
            const pdf=await dailyReportPdf(data,period,role,{daily:kind==='daily'});
            await audit.record(req.user,'Report Export Prepared',{
                summary:`Prepared ${role.toUpperCase()} ${kind} report for ${period.start}: ${data.caseCount} cases and ${data.visitCount} consultations.`,
                outcome:'Prepared',target_type:'Report',target_id:`${role.toUpperCase()} ${kind==='today'?'Today':'Daily'}`,
                period:{start:period.start,end_exclusive:period.end,time_zone:period.timeZone},
                barangay_id:role==='bhw'?req.user.barangay_id:null,record_count:data.caseCount,visit_count:data.visitCount,
                delivery:'PDF response prepared; browser download and file saving are not verified.'
            });
            res.set('Content-Type','application/pdf').set('Content-Disposition',`attachment; filename="${role.toUpperCase()}_${kind==='today'?'Today':'Daily'}_${period.start}.pdf"`).send(pdf);
        } catch(error) {
            try {await audit.record(req.user,'Report Export Failed',{summary:`${role.toUpperCase()} ${kind} report could not be prepared.`,outcome:'Failed',target_type:'Report',target_id:`${role.toUpperCase()} ${kind==='today'?'Today':'Daily'}`});} catch {}
            res.status([400,403].includes(error.status)?error.status:503).json({success:false,error:error.status===400?error.message:'The daily report could not be prepared. Please try again.'});
        }
    });
}
module.exports={registerDailyReportRoutes};
