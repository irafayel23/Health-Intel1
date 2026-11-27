const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mysql = require('mysql2/promise');
const express = require('express');
const { registerDailyReportRoutes } = require('../routes/daily-reports');
const { registerCaseRoutes } = require('../routes/case-routes');
const { registerPatientIntakeRoutes } = require('../routes/patient-intake-routes');
const { registerFollowupTracking } = require('../routes/followup-tracking');
const { rules } = require('../middleware/access-control');
const { migrateCaseVisits } = require('../services/case-visits');
const { migrateResidentVital } = require('../services/resident-vital');
const { todayInManila } = require('../services/patient-validation');
require('../config/security-config').loadEnvironment();

async function createFixture() {
    const config={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),
        user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''};
    const name='health_intel_intake_verify_'+process.pid;
    const root=await mysql.createConnection(config);
    let db,server,created=false;
    const close=async()=>{
        if(server)await new Promise(resolve=>server.close(resolve));
        if(db)await db.end();
        try {
            if(created && /^health_intel_intake_verify_\d+$/.test(name) && name!==process.env.DB_NAME)
                await root.query('DROP DATABASE `'+name+'`');
        }finally{await root.end();}
    };
    try {
        assert.notEqual(name,process.env.DB_NAME);
        await root.query('CREATE DATABASE `'+name+'`');created=true;
        db=mysql.createPool({...config,database:name});
        await db.query('CREATE TABLE barangays (id INT PRIMARY KEY,name VARCHAR(100))');
        await db.query("INSERT INTO barangays VALUES (1,'Synthetic one'),(2,'Synthetic two')");
        await db.query('CREATE TABLE residents (id INT AUTO_INCREMENT PRIMARY KEY,first_name VARCHAR(100),last_name VARCHAR(100),patient_name VARCHAR(255),birthdate DATE,age INT,purok VARCHAR(100),barangay_id INT,suffix VARCHAR(20))');
        await db.query('CREATE TABLE disease_registry (id INT PRIMARY KEY,name VARCHAR(100),status VARCHAR(20),is_archived BOOLEAN)');
        await db.query("INSERT INTO disease_registry VALUES (1,'Synthetic disease','Active',0)");
        await db.query(`CREATE TABLE health_cases (id INT AUTO_INCREMENT PRIMARY KEY,resident_id INT,first_name VARCHAR(100),last_name VARCHAR(100),patient_name VARCHAR(255),birthdate DATE,age INT,purok VARCHAR(100),disease VARCHAR(255),remarks TEXT,status VARCHAR(20),encoded_by VARCHAR(50),barangay_id INT,date_recorded DATE,severity VARCHAR(20),disease_id INT,disease_review_status VARCHAR(30),disease_reported VARCHAR(255),condition_source VARCHAR(500),suffix VARCHAR(20),is_archived BOOLEAN DEFAULT 0)`);
        await db.query('CREATE TABLE system_audit_logs (user_id VARCHAR(50),role VARCHAR(30),action VARCHAR(100),details TEXT)');
        await migrateResidentVital(db);
        await migrateCaseVisits(db);
        const app=express();
        app.use(express.json());
        app.use('/api',(req,res,next)=>{
            const role=req.get('X-Test-Role');
            const rule=rules.find(([method,regex])=>req.method===method&&regex.test(req.path));
            if(!rule?.[2].includes(role))return res.status(403).json({error:'Access denied'});
            req.user={role,system_id:'QA-'+role,barangay_id:req.get('X-Test-Scope')==='other'?2:1};
            next();
        });
        registerCaseRoutes(app,db,{get(){},save(){}});
        registerPatientIntakeRoutes(app,db);
        registerFollowupTracking(app,db);
        registerDailyReportRoutes(app,db);
        server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});
        return {db,base:'http://127.0.0.1:'+server.address().port,own:1,close};
    }catch(error){await close();throw error;}
}

test('BHW intake, MHO assessment and barangay follow-up share a single referral', async () => {
    const f = await createFixture();
    try {
        async function request(role, path, method='GET', body) {
            const response=await fetch(f.base+'/api'+path,{method,headers:{
                'X-Test-Role':role==='other-bhw'?'bhw':role,
                ...(role==='other-bhw'?{'X-Test-Scope':'other'}:{}),
                ...(body?{'Content-Type':'application/json'}:{})
            },body:body?JSON.stringify(body):undefined});
            return {status:response.status,...await response.json()};
        }
        const summary=async(role='bhw')=>(await request(role,'/bhw/intakes/summary')).counts;
        assert.deepEqual(await summary(),{open_referrals:0,assigned_followups:0,due_today:0,past_due:0});
        assert.equal((await request('mho','/bhw/intakes/summary')).status,403);
        const date=todayInManila();
        const activity=async(role='bhw',query='')=>(await request(role,'/bhw/intakes/activity'+query)).days;
        assert.equal((await request('mho','/bhw/intakes/activity')).status,403);
        const empty=await activity();
        assert.equal(empty.length,14);
        assert.equal(empty.at(-1).date,date);
        assert.ok(empty.every(day=>day.visits===0));
        const patient={patient_mode:'new',first_name:'Synthetic Intake',last_name:'Test Profile',birthdate:'1990-06-11',purok:'Purok 1'};
        const input={...patient,request_key:randomUUID(),visit_date:date,concern:'Synthetic visit',request_referral:true,referral_reason:'Assessment requested'};
        const count=async()=>Number((await f.db.query('SELECT COUNT(*) AS total FROM health_cases'))[0][0].total);
        const before=await count();
        assert.equal((await request('bhw','/patients','POST',{...input,severity:'High Risk'})).status,403);
        const saved=await request('bhw','/bhw/intakes','POST',input);
        assert.equal(saved.status,201,saved.error);
        assert.equal(saved.state,'requested');
        assert.deepEqual(await summary(),{open_referrals:1,assigned_followups:0,due_today:0,past_due:0});
        assert.deepEqual(await summary('other-bhw'),{open_referrals:0,assigned_followups:0,due_today:0,past_due:0});
        assert.equal((await request('bhw','/bhw/intakes','POST',input)).id,saved.id);
        const search=async(query,role='bhw')=>(await request(role,'/bhw/intakes?'+query)).data.map(row=>row.id);
        assert.deepEqual(await search('q=Test+Profile&status=open'),[saved.id]);
        assert.deepEqual(await search('q=INT-'+saved.id),[saved.id]);
        assert.deepEqual(await search('q=%25'),[]);
        assert.deepEqual(await search('q=INT-'+saved.id+'&barangay_id=1','other-bhw'),[]);
        assert.equal((await request('bhw','/bhw/intakes?status=invalid')).status,400);
        assert.equal((await request('bhw','/bhw/intakes?q=one&q=two')).status,400);
        const invalidAge=await request('bhw','/bhw/intakes','POST',{...input,birthdate:'1900-01-01',visit_date:'2031-01-01'});
        assert.equal(invalidAge.status,400);
        const reversed=await request('bhw','/bhw/intakes','POST',{...input,visit_date:'1989-12-31'});
        assert.equal(reversed.status,400);assert.match(reversed.error,/on or after the patient/);
        assert.deepEqual((await activity()).at(-1),{date,visits:1});
        assert.deepEqual(await activity('other-bhw','?barangay_id=1'),empty);
        await f.db.execute('UPDATE patient_intakes SET visit_date=DATE_SUB(?, INTERVAL 14 DAY) WHERE id=?',[date,saved.id]);
        assert.deepEqual(await activity(),empty);
        await f.db.execute('UPDATE patient_intakes SET visit_date=? WHERE id=?',[date,saved.id]);
        assert.equal(await count(),before);
        assert.equal((await request('bhw','/mho/referrals')).status,403);
        assert.equal((await request('bhw','/mho/referrals/summary')).status,403);
        assert.equal((await request('mho','/bhw/intakes')).status,403);
        assert.deepEqual((await request('other-bhw','/bhw/intakes')).data,[]);
        assert.equal((await request('other-bhw','/bhw/intakes/'+saved.id,'PUT',{action:'request',note:'Cross-barangay'})).status,404);
        const queue=await request('mho','/mho/referrals?view=incoming&barangay_id=1');
        const record=queue.data.find(row=>row.id===saved.id);
        assert.ok(record);
        assert.equal(record.barangay_id,f.own);
        const profilePath='/bhw/intakes?resident_id='+record.resident_id;
        const profile=await request('bhw',profilePath);
        assert.deepEqual(profile.data.map(row=>row.id),[saved.id]);
        assert.equal(profile.current_referral.state,'requested');
        const other=await request('other-bhw',profilePath);
        assert.deepEqual(other.data,[]);
        assert.equal(other.current_referral,null);
        assert.equal((await request('bhw','/bhw/intakes?resident_id=invalid')).status,400);
        assert.deepEqual((await request('mho','/mho/referrals?view=incoming&barangay_id=2')).data,[]);
        assert.equal((await request('mho','/mho/referrals?view=invalid')).status,400);
        const counts=async()=> (await request('mho','/mho/referrals/summary')).counts;
        assert.deepEqual(await counts(),{to_issue:1,to_acknowledge:0,to_assess:0,to_complete:0});
        const receive=action=>request('mho','/mho/referrals/'+saved.id,'PUT',{action});
        assert.equal((await receive('arrive')).status,409);
        assert.equal((await receive('issue')).status,200);
        assert.equal((await counts()).to_acknowledge,1);
        assert.equal((await receive('acknowledge')).status,200);
        assert.deepEqual(await counts(),{to_issue:0,to_acknowledge:0,to_assess:0,to_complete:0});
        assert.equal((await receive('arrive')).status,200);
        assert.equal((await counts()).to_assess,1);
        const assessment={...patient,patient_mode:'existing',resident_id:record.resident_id,barangay_id:f.own,
            intake_id:saved.id,date_recorded:date,disease:'Synthetic disease',
            severity:'Mild',visit:{transaction_mode:'Referral',nature_of_visit:'New consultation/case',referral_reason:input.referral_reason,
                consultation_time:'10:00',blood_pressure:'120/80',temperature_c:'36.5',height_cm:'160',weight_kg:'55'}};
        const assessed=await request('mho','/mho/walk-in-cases','POST',assessment);
        assert.equal(assessed.status,201,assessed.error);
        assert.equal((await request('mho','/mho/walk-in-cases','POST',assessment)).status,409);
        assert.equal(await count(),before+1);
        assert.equal((await counts()).to_complete,1);
        // A walk-in can schedule a return without creating a referral or barangay task.
        const {intake_id, ...walkIn}=assessment;
        const scheduled=await request('mho','/mho/walk-in-cases','POST',{
            ...walkIn,patient_mode:'new',resident_id:undefined,first_name:'Synthetic Walk-in',
            last_name:'Return Test',birthdate:'1991-06-11',
            visit:{...walkIn.visit,transaction_mode:'Walk-in',next_followup_date:date}
        });
        assert.equal(scheduled.status,201,scheduled.error);
        const clinic=await request('mho','/mho/followups?bucket=today');
        assert.equal(clinic.data[0].case_id,scheduled.id);
        assert.deepEqual((await request('mho','/mho/referrals?view=followups')).data,[]);
        const follow=await request('mho','/mho/referrals/'+saved.id,'PUT',{action:'follow_up',note:'Synthetic follow-up',due_date:date});
        assert.equal(follow.status,200,follow.error);
        assert.deepEqual(await summary(),{open_referrals:0,assigned_followups:1,due_today:1,past_due:0});
        assert.deepEqual((await request('mho','/mho/referrals?view=incoming')).data,[]);
        assert.equal((await request('mho','/mho/referrals?view=followups')).data[0].id,saved.id);
        assert.deepEqual(await search('status=today'),[saved.id]);
        assert.deepEqual(await search('status=past'),[]);
        await f.db.execute('UPDATE patient_intakes SET follow_up_due=DATE_SUB(?,INTERVAL 1 DAY) WHERE id=?',[date,saved.id]);
        assert.deepEqual(await summary(),{open_referrals:0,assigned_followups:1,due_today:0,past_due:1});
        assert.deepEqual(await search('status=past'),[saved.id]);
        assert.deepEqual(await search('status=past','other-bhw'),[]);
        const close=await request('bhw','/bhw/intakes/'+saved.id,'PUT',{action:'follow_up_done',note:'Synthetic follow-up complete'});
        assert.equal(close.status,200,close.error);
        assert.deepEqual(await summary(),{open_referrals:0,assigned_followups:0,due_today:0,past_due:0});
        const completed=(await request('bhw','/bhw/intakes')).data.find(row=>row.id===saved.id);
        assert.equal(completed.state,'closed');
        assert.equal(completed.case_id,assessed.id);
        const closedProfile=await request('bhw',profilePath);
        assert.equal(closedProfile.current_referral.state,'closed');
        assert.equal(closedProfile.data[0].follow_up_result,'Synthetic follow-up complete');
        const laterVisit=await request('bhw','/bhw/intakes','POST',{
            ...input,patient_mode:'existing',resident_id:record.resident_id,request_key:randomUUID(),request_referral:false
        });
        assert.equal(laterVisit.status,201,laterVisit.error);
        const differentPatient=await request('bhw','/bhw/intakes','POST',{
            ...input,first_name:'Another Synthetic',birthdate:'1996-01-15',request_key:randomUUID()
        });
        assert.equal(differentPatient.status,201,differentPatient.error);
        const latestProfile=await request('bhw',profilePath);
        assert.deepEqual(latestProfile.data.map(row=>row.id),[laterVisit.id,saved.id]);
        assert.equal(latestProfile.current_referral.state,'closed');
        assert.deepEqual((await request('mho','/mho/referrals?view=followups')).data,[]);
        assert.equal((await request('mho','/mho/referrals?view=completed')).data[0].id,saved.id);
    } finally { await f.close(); }
});

test('BHW report counts, same-count revisions and Admin PDF use the saved daily snapshot',async()=>{
    const f=await createFixture();
    const date=todayInManila();
    const report='/bhw/reports/daily-submission';
    const admin='/admin/reports/daily-submissions';
    async function request(role,path,body,other=false) {
        const response=await fetch(f.base+'/api'+path,{method:body?'POST':'GET',headers:{
            'X-Test-Role':role,'X-Test-Scope':other?'other':'own','Content-Type':'application/json'
        },body:body?JSON.stringify(body):undefined});
        return [response.status,response.headers.get('content-type')?.includes('application/pdf')
            ? Buffer.from(await response.arrayBuffer()) : await response.json()];
    }
    try {
        const visit={patient_mode:'new',first_name:'Synthetic',last_name:'Report Test',birthdate:'1990-06-11',
            purok:'Purok 1',request_key:randomUUID(),visit_date:date,concern:'Synthetic report fixture'};
        assert.equal((await request('bhw','/bhw/intakes',visit))[0],201);
        const [,zero]=await request('bhw',report+'?date='+date,undefined,true);
        assert.equal(zero.bhw_visit_count,0);
        await f.db.execute("INSERT INTO health_cases(barangay_id,date_recorded,disease,status,severity) VALUES(?,?,'Synthetic condition','Active','Mild')",[f.own,date]);
        const saved=async body=>request('bhw',report,body);
        const [,before]=await request('bhw',report+'?date='+date);
        assert.deepEqual([before.bhw_visit_count,before.consultation_count,before.case_count],[1,0,1]);
        const [status,first]=await saved({date,fingerprint:before.fingerprint});
        assert.equal(status,200,first.error);
        await f.db.execute("UPDATE daily_report_submissions SET submitted_at='2020-01-01 00:00:00' WHERE report_date=?",[date]);
        const [,retry]=await saved({date,fingerprint:before.fingerprint});
        assert.equal(retry.submission.submitted_at,'2020-01-01T00:00:00Z');
        const [,adminBefore]=await request('admin',admin+'?date='+date);
        assert.equal(adminBefore.data.find(row=>row.id===f.own).bhw_visit_count,1);
        const pdfPath=admin+'/pdf?date='+date+'&barangay_id='+f.own;
        const [pdfStatus,pdf]=await request('admin',pdfPath);
        assert.equal(pdfStatus,200);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
        assert.equal((await request('bhw',pdfPath))[0],403);
        await f.db.execute("UPDATE health_cases SET severity='Monitored' WHERE barangay_id=? AND date_recorded=?",[f.own,date]);
        const [,after]=await request('bhw',report+'?date='+date);
        assert.deepEqual([after.bhw_visit_count,after.consultation_count,after.case_count],[1,0,1]);
        assert.notEqual(after.fingerprint,before.fingerprint);
        assert.equal(after.submission.fingerprint,before.fingerprint);
        assert.equal((await saved({date,fingerprint:before.fingerprint}))[0],409);
        const [updatedStatus,updated]=await saved({date,fingerprint:after.fingerprint});
        assert.equal(updatedStatus,200,updated.error);
        assert.equal(updated.submission.first_submitted_at,first.submission.first_submitted_at);
        assert.equal(updated.submission.fingerprint,after.fingerprint);
        const [[row]]=await f.db.execute('SELECT report_snapshot FROM daily_report_submissions WHERE report_date=? AND barangay_id=?',[date,f.own]);
        const snapshot=typeof row.report_snapshot==='string'?JSON.parse(row.report_snapshot):row.report_snapshot;
        assert.equal(snapshot.cases[0].severity,'Monitored');
        assert.equal((await request('bhw',report+'/withdraw',{date,submitted_at:updated.submission.submitted_at,fingerprint:before.fingerprint}))[0],409);
        assert.equal((await request('bhw',report+'/withdraw',{date,submitted_at:updated.submission.submitted_at,fingerprint:after.fingerprint}))[0],200);
        assert.equal((await request('admin',pdfPath))[0],404);
        assert.equal((await saved({date,fingerprint:after.fingerprint}))[0],200);
    } finally {await f.close();}
});
