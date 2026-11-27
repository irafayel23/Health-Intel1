const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mysql = require('mysql2/promise');
const express = require('express');
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
        const date=todayInManila();
        const patient={patient_mode:'new',first_name:'Synthetic Intake',last_name:'Test Profile',birthdate:'1990-06-11',purok:'Purok 1'};
        const input={...patient,request_key:randomUUID(),visit_date:date,concern:'Synthetic visit',request_referral:true,referral_reason:'Assessment requested'};
        const count=async()=>Number((await f.db.query('SELECT COUNT(*) AS total FROM health_cases'))[0][0].total);
        const before=await count();
        assert.equal((await request('bhw','/patients','POST',{...input,severity:'High Risk'})).status,403);
        const saved=await request('bhw','/bhw/intakes','POST',input);
        assert.equal(saved.status,201,saved.error);
        assert.equal(saved.state,'requested');
        assert.equal((await request('bhw','/bhw/intakes','POST',input)).id,saved.id);
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
        assert.deepEqual((await request('mho','/mho/referrals?view=incoming')).data,[]);
        assert.equal((await request('mho','/mho/referrals?view=followups')).data[0].id,saved.id);
        const close=await request('bhw','/bhw/intakes/'+saved.id,'PUT',{action:'follow_up_done',note:'Synthetic follow-up complete'});
        assert.equal(close.status,200,close.error);
        const completed=(await request('bhw','/bhw/intakes')).data.find(row=>row.id===saved.id);
        assert.equal(completed.state,'closed');
        assert.equal(completed.case_id,assessed.id);
        assert.deepEqual((await request('mho','/mho/referrals?view=followups')).data,[]);
        assert.equal((await request('mho','/mho/referrals?view=completed')).data[0].id,saved.id);
    } finally { await f.close(); }
});
