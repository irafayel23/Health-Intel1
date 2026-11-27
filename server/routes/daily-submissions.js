const {dailyPeriod}=require('../services/report-periods');
const {dailyReportData,dailyReportPdf}=require('../services/daily-report');

function registerDailySubmissions(app,db) {
    let schema;
    const ready=()=>schema??=(async()=>{
        const [reportTables]=await db.query("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='daily_report_submissions'");
        if(!reportTables.length) await db.query(`CREATE TABLE IF NOT EXISTS daily_report_submissions (
        report_date DATE NOT NULL, barangay_id INT NOT NULL,
        case_count INT UNSIGNED NOT NULL, consultation_count INT UNSIGNED NOT NULL,
        first_submitted_at DATETIME NOT NULL, submitted_at DATETIME NOT NULL,
        submitted_by VARCHAR(50) NOT NULL,
        report_snapshot JSON NULL,
        withdrawn_at DATETIME NULL,
        PRIMARY KEY (report_date,barangay_id)
    ) ENGINE=InnoDB`);
        const [columns]=await db.query("SHOW COLUMNS FROM daily_report_submissions");
        for(const [name,type] of [['report_snapshot','JSON'],['withdrawn_at','DATETIME']]) {
            if(columns.some(column=>column.Field===name))continue;
            try { await db.query('ALTER TABLE daily_report_submissions ADD COLUMN '+name+' '+type+' NULL'); }
            catch(error) { if(error.code!=='ER_DUP_FIELDNAME')throw error; }
        }
    })().catch(error=>{schema=undefined;throw error;});
    const readColumns=`s.case_count,s.consultation_count,
        DATE_FORMAT(s.first_submitted_at,'%Y-%m-%dT%H:%i:%sZ') AS first_submitted_at,
        DATE_FORMAT(s.submitted_at,'%Y-%m-%dT%H:%i:%sZ') AS submitted_at,
        DATE_FORMAT(s.withdrawn_at,'%Y-%m-%dT%H:%i:%sZ') AS withdrawn_at`;
    const bhw='/api/bhw/reports/daily-submission';
    const route=handler=>async(req,res)=>{
        try { await handler(req,res); }
        catch(error) {
            const status=[400,403,404,409].includes(error.status)?error.status:503;
            res.status(status).json({success:false,error:status===503?'Daily report tracking is temporarily unavailable.':error.message});
        }
    };
    async function readSaved(date,barangay) {
        const [rows]=await db.execute(`SELECT ${readColumns} FROM daily_report_submissions s
            WHERE s.report_date=? AND s.barangay_id=?`,[date,barangay]);
        return rows[0]??null;
    }
    app.get(bhw,route(async(req,res)=>{
        const period=dailyPeriod(req.query.date);
        const data=await dailyReportData(db,req.user,period);
        await ready();
        res.json({date:period.start,case_count:data.caseCount,consultation_count:data.visitCount,
            submission:await readSaved(period.start,req.user.barangay_id)});
    }));
    app.post(bhw,route(async(req,res)=>{
        const {date,case_count,consultation_count}=req.body??{};
        if(typeof date!=='string')return res.status(400).json({error:'Choose a report date.'});
        const period=dailyPeriod(date);
        const data=await dailyReportData(db,req.user,period);
        if(case_count!==data.caseCount||consultation_count!==data.visitCount)
            return res.status(409).json({error:'The totals changed. Review the refreshed counts before submitting again.'});
        await ready();
        // Preserve the initial receipt and avoid moving its timestamp on identical retries.
        await db.execute(`INSERT INTO daily_report_submissions
            (report_date,barangay_id,case_count,consultation_count,first_submitted_at,submitted_at,submitted_by,report_snapshot)
            VALUES (?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP(),?,?)
            ON DUPLICATE KEY UPDATE
              submitted_at=IF(withdrawn_at IS NOT NULL OR case_count<>VALUES(case_count) OR consultation_count<>VALUES(consultation_count),UTC_TIMESTAMP(),submitted_at),
              submitted_by=IF(withdrawn_at IS NOT NULL OR case_count<>VALUES(case_count) OR consultation_count<>VALUES(consultation_count),VALUES(submitted_by),submitted_by),
              report_snapshot=IF(withdrawn_at IS NOT NULL OR case_count<>VALUES(case_count) OR consultation_count<>VALUES(consultation_count),VALUES(report_snapshot),report_snapshot),
              case_count=VALUES(case_count),consultation_count=VALUES(consultation_count),withdrawn_at=NULL`,
            [period.start,req.user.barangay_id,data.caseCount,data.visitCount,req.user.system_id,JSON.stringify(data)]);
        res.json({submission:await readSaved(period.start,req.user.barangay_id)});
    }));
    app.post(bhw+'/withdraw',route(async(req,res)=>{
        const {date,submitted_at}=req.body??{};
        if(typeof date!=='string'||typeof submitted_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(submitted_at))
            return res.status(400).json({error:'Choose a saved report to withdraw.'});
        const period=dailyPeriod(date);
        await ready();
        const [result]=await db.execute(`UPDATE daily_report_submissions SET withdrawn_at=UTC_TIMESTAMP()
            WHERE report_date=? AND barangay_id=? AND withdrawn_at IS NULL
              AND DATE_FORMAT(submitted_at,'%Y-%m-%dT%H:%i:%sZ')=?`,
            [period.start,req.user.barangay_id,submitted_at]);
        if(!result.affectedRows)return res.status(409).json({error:'This report has changed. Review its current status before withdrawing.'});
        res.json({success:true});
    }));
    app.get('/api/admin/reports/daily-submissions/pdf',route(async(req,res)=>{
        const period=dailyPeriod(req.query.date);
        const barangay=Number(req.query.barangay_id);
        if(typeof req.query.date!=='string'||!Number.isSafeInteger(barangay)||barangay<=0)
            return res.status(400).json({error:'Choose a report date and barangay.'});
        await ready();
        const [rows]=await db.execute('SELECT report_snapshot FROM daily_report_submissions WHERE report_date=? AND barangay_id=? AND withdrawn_at IS NULL',
            [period.start,barangay]);
        const snapshot=rows[0]?.report_snapshot;
        if(!snapshot)return res.status(404).json({error:'This submission has no saved report PDF.'});
        const data=typeof snapshot==='string'?JSON.parse(snapshot):snapshot;
        const pdf=await dailyReportPdf(data,period,'bhw',{daily:true});
        res.set('Content-Type','application/pdf')
            .set('Content-Disposition',`attachment; filename="Barangay_${barangay}_Daily_${period.start}.pdf"`)
            .set('Cache-Control','no-store').send(pdf);
    }));
    app.get('/api/admin/reports/daily-submissions',route(async(req,res)=>{
        const period=dailyPeriod(req.query.date);
        await ready();
        const [data]=await db.execute(`SELECT b.id,b.name,(s.report_snapshot IS NOT NULL AND s.withdrawn_at IS NULL) AS has_pdf,${readColumns}
            FROM barangays b LEFT JOIN daily_report_submissions s ON s.barangay_id=b.id AND s.report_date=?
            ORDER BY b.name`,[period.start]);
        res.json({date:period.start,data});
    }));
}
module.exports={registerDailySubmissions};
