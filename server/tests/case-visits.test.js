const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const mysql=require('mysql2/promise'),bcrypt=require('bcrypt'),jwt=require('jsonwebtoken');
const {migrateCaseVisits,validateVisit}=require('../services/case-visits');
const {validatePatient}=require('../services/patient-validation');
const {sessionVersion}=require('../config/security-config');
const source={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};
const name='health_intel_visit_verify_'+process.pid,secret=crypto.randomBytes(32).toString('hex'),tokens={};
let root,db,appDb,server,base,own,other,caseId,originalFingerprint;
async function fingerprint(){const [tables]=await root.query('SHOW TABLES FROM `'+source.database+'`');const values=[];for(const table of tables){const t=Object.values(table)[0];const [rows]=await root.query('SELECT * FROM `'+source.database+'`.`'+t+'`');values.push([t,rows.map(row=>JSON.stringify(row)).sort()]);}return crypto.createHash('sha256').update(JSON.stringify(values)).digest('hex');}
before(async()=>{
    root=await mysql.createConnection(source);originalFingerprint=await fingerprint();
    await root.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4');await root.query('USE `'+name+'`');await root.query('SET FOREIGN_KEY_CHECKS=0');
    const [tables]=await root.query('SHOW TABLES FROM `'+source.database+'`');
    for(const table of tables){const t=Object.values(table)[0];const [[ddl]]=await root.query('SHOW CREATE TABLE `'+source.database+'`.`'+t+'`');await root.query(ddl['Create Table']);}
    await root.query('SET FOREIGN_KEY_CHECKS=1');db=mysql.createPool({...source,database:name});await migrateCaseVisits(db);await migrateCaseVisits(db);
    const [b]=await db.execute("INSERT INTO barangays(name,latitude,longitude) VALUES('Visit Fixture A',10,123),('Visit Fixture B',11,123)");own=b.insertId;other=own+1;
    const hash=await bcrypt.hash('Disposable-visit-2026',10);
    for(const role of ['bhw','admin','mho','superadmin']){const id='VISIT-'+role.toUpperCase();await db.execute("INSERT INTO users(system_id,first_name,last_name,role,barangay_id,password_hash,status) VALUES(?,'Synthetic','Visits',?,?,?,'approved')",[id,role,role==='bhw'?own:null,hash]);tokens[role]=jwt.sign({system_id:id,password_version:sessionVersion(hash,secret)},secret,{expiresIn:'1h'});}
    await db.execute("INSERT INTO disease_registry(name,status,is_archived) VALUES('Synthetic Disease','Active',0)");
    process.env.DB_NAME=name;process.env.DB_HOST=source.host;process.env.JWT_SECRET=secret;
    require('nodemailer').createTransport=()=>({sendMail:async()=>({})});
    const app=require('../server');appDb=app.db;server=app.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(appDb)await appDb.end();if(db)await db.end();if(root){try{assert.equal(await fingerprint(),originalFingerprint,'Original database rows were changed');assert.match(name,/^health_intel_visit_verify_\d+$/);assert.notEqual(name,source.database);await root.query('DROP DATABASE `'+name+'`');}finally{await root.end();}}});
async function request(route,role='bhw',body){const response=await fetch(base+'/api'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+tokens[role],...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,result:await response.json()};}
const visit=(nature='New consultation/case')=>({transaction_mode:'Walk-in',nature_of_visit:nature,consultation_time:'13:05',blood_pressure:'120/80',temperature_c:'36.50',height_cm:'165',weight_kg:'60.25',...(nature!=='New consultation/case'?{case_id:caseId}:{})});
const patient=()=>({first_name:'Synthetic',last_name:'Patient',suffix:'Jr.',birthdate:'2000-01-02',date_recorded:'2026-10-01',purok:'QA Zone',severity:'Mild',disease:'Synthetic Disease',remarks:'Synthetic visit only',visit:visit()});
test('numeric storage, referral requirements and malformed types are validated without diagnosing measurements',()=>{
    assert.equal(validateVisit(undefined),null);
    const parsed=validateVisit(visit());assert.equal(parsed.temperature_c,36.5);assert.equal(parsed.weight_kg,60.25);
    for(const change of [{transaction_mode:''},{nature_of_visit:'General'},{transaction_mode:'Referral',referral_reason:''},{consultation_time:'13:05 PM'},{consultation_time:0},{blood_pressure:0},{blood_pressure:'120 letters'},{weight_kg:-1},{height_cm:{}},{temperature_c:'36.555'}])assert.throws(()=>validateVisit({...visit(),...change}));
    const referral=validateVisit({...visit(),transaction_mode:'Referral',referral_reason:'Synthetic facility transfer',referred_by:'QA Provider'});assert.equal(referral.referral_reason,'Synthetic facility transfer');
    for(const [key,value] of [['temperature_c',''],['height_cm',null],['weight_kg',undefined],['blood_pressure','']])assert.throws(()=>validateVisit({...visit(),[key]:value}),/Enter/);
    assert.equal(validatePatient(patient()).patient_name,'Synthetic Patient Jr.');
});

test('follow-up plans accept independent optional fields, multiline instructions and future dates; reject invalid dates and unsafe values',()=>{
    const empty=validateVisit(visit(),'2026-10-01');assert.equal(empty.next_followup_date,null);assert.equal(empty.followup_instructions,'');
    const instructions='Return for the advised review.\nBring the previous consultation record.';
    assert.equal(validateVisit({...visit(),followup_instructions:instructions},'2026-10-01').followup_instructions,instructions);
    for(const date of ['2026-10-01','2026-11-02'])assert.equal(validateVisit({...visit(),next_followup_date:date},'2026-10-01').next_followup_date,date);
    for(const change of [{next_followup_date:'2026-02-30'},{next_followup_date:'10/02/2026'},{next_followup_date:42},{next_followup_date:'2026-09-30'},{followup_instructions:{}},{followup_instructions:'x'.repeat(2001)},{followup_instructions:'<script>bad</script>'},{followup_instructions:'bad\u0000text'}])assert.throws(()=>validateVisit({...visit(),...change},'2026-10-01'));
});
test('new disease case atomically saves consultation, suffix and resident identity',async()=>{
    const response=await request('/patients','bhw',{...patient(),visit:{...visit(),next_followup_date:'2026-10-08',followup_instructions:'Synthetic initial consultation advice.'}});assert.equal(response.status,201,JSON.stringify(response.result));caseId=response.result.id;assert.equal(response.result.new_case,true);assert.ok(response.result.visit_id);
    const [[c]]=await db.query('SELECT * FROM health_cases WHERE id=?',[caseId]),[[r]]=await db.query('SELECT * FROM residents WHERE id=?',[c.resident_id]);assert.equal(c.suffix,'Jr.');assert.equal(r.suffix,'Jr.');assert.equal(c.patient_name,'Synthetic Patient Jr.');
    const rows=(await request('/patients/'+caseId+'/visits')).result.data;assert.equal(rows.length,1);assert.equal(rows[0].consultation_time,'13:05');assert.equal(rows[0].nature_of_visit,'New consultation/case');
    assert.equal(rows[0].next_followup_date,'2026-10-08');assert.equal(rows[0].followup_instructions,'Synthetic initial consultation advice.');
});
test('follow-up and admission keep original case, resident, disease date, severity and report counts',async()=>{
    const [[original]]=await db.query('SELECT * FROM health_cases WHERE id=?',[caseId]);
    for(const [i,nature] of ['Follow-up visit','New admission'].entries()){
        const response=await request('/patients','bhw',{...patient(),date_recorded:'2026-10-0'+(i+2),severity:'Monitored',remarks:'Synthetic return',visit:visit(nature)});assert.equal(response.status,201,JSON.stringify(response.result));assert.equal(response.result.id,caseId);assert.equal(response.result.new_case,false);
    }
    const [[current]]=await db.query('SELECT * FROM health_cases WHERE id=?',[caseId]);assert.deepEqual(current,original);
    const [[c]]=await db.query('SELECT COUNT(*) n FROM health_cases'),[[r]]=await db.query('SELECT COUNT(*) n FROM residents');assert.equal(c.n,1);assert.equal(r.n,1);
    const visits=(await request('/patients/'+caseId+'/visits')).result.data;assert.equal(visits.length,3);assert.equal(visits[0].severity,'Monitored');assert.equal(visits[0].nature_of_visit,'New admission');
    const dossier=(await request('/residents/'+original.resident_id+'/dossier')).result;assert.equal(dossier.history.length,1);assert.equal(dossier.visits.length,3);assert.equal(dossier.visits[0].nature_of_visit,'New admission');assert.equal(dossier.visits[1].nature_of_visit,'Follow-up visit');
    const stats=(await request('/bhw-stats')).result;assert.equal(stats.total,1);assert.equal(stats.active,1);
    const reports=(await request('/bhw/report-data?month=October&year=2026&type=MONTHLY&purok=All%20Puroks')).result;assert.equal(reports.data.length,1);
    const audit=(await request('/admin/cases/'+caseId,'admin')).result.history;assert.equal(audit.filter(r=>r.action==='Case Visit Recorded').length,2);
});
test('missing required measurements are refused before saving any visit or case',async()=>{
    const [[before]]=await db.query('SELECT COUNT(*) n FROM case_visits');
    const incomplete=patient();delete incomplete.visit;assert.equal((await request('/patients','bhw',incomplete)).status,400);
    for(const field of ['blood_pressure','temperature_c','height_cm','weight_kg']){
        const data={...patient(),date_recorded:'2026-10-09',visit:{...visit('Follow-up visit'),[field]:''}};
        assert.equal((await request('/patients','bhw',data)).status,400);
    }
    const [[after]]=await db.query('SELECT COUNT(*) n FROM case_visits');assert.equal(after.n,before.n);
});
test('referral stores its source and reason; switching away from referral clears unused referral inputs',async()=>{
    const response=await request('/patients','bhw',{...patient(),date_recorded:'2026-10-04',visit:{...visit('Follow-up visit'),transaction_mode:'Referral',referral_reason:'Synthetic further assessment',referred_by:'QA Provider'}});assert.equal(response.status,201);
    const v=(await request('/patients/'+caseId+'/visits')).result.data[0];assert.equal(v.referred_by,'QA Provider');assert.equal(v.referral_reason,'Synthetic further assessment');
    assert.equal(validateVisit({...visit(),referred_by:'stale',referral_reason:'stale'}).referral_reason,'');
});
test('returning visits reject mismatched identities, other barangays, missing cases and earlier dates',async()=>{
    for(const change of [{first_name:'Different'},{suffix:'Sr.'},{birthdate:'2000-01-03'},{date_recorded:'2026-09-01'},{visit:{...visit('Follow-up visit'),case_id:999999}}]){
        const response=await request('/patients','bhw',{...patient(),date_recorded:'2026-10-05',visit:visit('Follow-up visit'),...change});assert.ok([400,404,409].includes(response.status),JSON.stringify(response.result));
    }
    await db.query('UPDATE users SET barangay_id=? WHERE system_id=?',[other,'VISIT-BHW']);
    assert.equal((await request('/patients/'+caseId+'/visits')).status,404);
    assert.equal((await request('/patients','bhw',{...patient(),date_recorded:'2026-10-05',visit:visit('Follow-up visit')})).status,404);
    await db.query('UPDATE users SET barangay_id=? WHERE system_id=?',[own,'VISIT-BHW']);
    for(const role of ['mho','superadmin'])assert.equal((await request('/patients/'+caseId+'/visits',role)).status,403);
    assert.equal((await request('/patients/'+caseId+'/visits','admin')).status,200);
});
test('duplicate concurrent visits have one winner and failed audit writes roll back the whole visit',async()=>{
    const data={...patient(),date_recorded:'2026-10-06',visit:visit('Follow-up visit')};
    const results=await Promise.all([request('/patients','bhw',data),request('/patients','bhw',data)]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
    const [[before]]=await db.query('SELECT COUNT(*) n FROM case_visits');
    await db.query("CREATE TRIGGER visit_qa_audit_failure BEFORE INSERT ON system_audit_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'");
    try{assert.equal((await request('/patients','bhw',{...data,date_recorded:'2026-10-07'})).status,503);}finally{await db.query('DROP TRIGGER visit_qa_audit_failure');}
    const [[after]]=await db.query('SELECT COUNT(*) n FROM case_visits');assert.equal(after.n,before.n);
});
test('suffix distinguishes otherwise identical profiles and duplicate detection still blocks the same case',async()=>{
    const senior={...patient(),suffix:'Sr.'};const response=await request('/patients','bhw',senior);assert.equal(response.status,201,JSON.stringify(response.result));assert.notEqual(response.result.id,caseId);
    const [[count]]=await db.query('SELECT COUNT(*) n FROM residents');assert.equal(count.n,2);
    assert.equal((await request('/patients','bhw',senior)).status,409);
});

test('MHO saves structured consultations and exact identity lookup preserves barangay and suffix boundaries',async()=>{
    const original=(await db.query('SELECT * FROM health_cases WHERE id=?',[caseId]))[0][0];
    const identity={first_name:'Synthetic',last_name:'Patient',suffix:'Jr.',birthdate:'2000-01-02',barangay_id:String(own)};
    const lookup=await request('/mho/walk-in-matches','mho',identity);assert.equal(lookup.status,200);assert.ok(lookup.result.data.some(row=>row.id===caseId));
    assert.ok(lookup.result.data.every(row=>!Object.hasOwn(row,'patient_name')&&!Object.hasOwn(row,'remarks')));
    for(const change of [{barangay_id:String(other)},{suffix:''},{first_name:'Unmatched'},{birthdate:'2000-01-03'}])assert.equal((await request('/mho/walk-in-matches','mho',{...identity,...change})).result.data.length,0);
    for(const change of [{first_name:''},{birthdate:'2000-02-30'},{barangay_id:{}},{suffix:['Jr.']},{last_name:'<bad>'}])assert.equal((await request('/mho/walk-in-matches','mho',{...identity,...change})).status,400);
    for(const role of ['bhw','admin','superadmin'])assert.equal((await request('/mho/walk-in-matches',role,identity)).status,403);
    const created=await request('/mho/walk-in-cases','mho',{...patient(),first_name:'Municipal',barangay_id:other});assert.equal(created.status,201,JSON.stringify(created.result));assert.ok(created.result.visit_id);
    const incomplete={...patient(),first_name:'Missing',barangay_id:other};delete incomplete.visit;assert.equal((await request('/mho/walk-in-cases','mho',incomplete)).status,400);
    for(const key of ['blood_pressure','temperature_c','height_cm','weight_kg'])assert.equal((await request('/mho/walk-in-cases','mho',{...incomplete,visit:{...visit(),[key]:''}})).status,400);
    for(const [i,nature] of ['Follow-up visit','New admission'].entries()){
        const saved=await request('/mho/walk-in-cases','mho',{...patient(),barangay_id:own,date_recorded:'2026-10-0'+(8+i),severity:'High Risk',remarks:'Synthetic municipal return',visit:{...visit(nature),transaction_mode:'Referral',referral_reason:'Synthetic assessment',referred_by:'QA MHO Provider'}});
        assert.equal(saved.status,201,JSON.stringify(saved.result));assert.equal(saved.result.new_case,false);assert.equal(saved.result.id,caseId);
    }
    assert.deepEqual((await db.query('SELECT * FROM health_cases WHERE id=?',[caseId]))[0][0],original,'MHO return visits must retain the original disease case');
    const dossier=(await request('/residents/'+original.resident_id+'/dossier')).result;
    assert.equal(dossier.history.length,1);assert.ok(dossier.visits.some(row=>row.encoded_by==='VISIT-MHO'&&row.nature_of_visit==='New admission'));
    const recent=(await request('/mho/walk-in-cases','mho')).result;
    assert.ok(recent.data.some(row=>row.id===created.result.id&&row.has_visits));
    assert.equal(recent.visits.length,3);assert.ok(recent.visits.every(row=>[created.result.id,caseId].includes(row.case_id)));
    assert.ok(recent.visits.some(row=>row.nature_of_visit==='Follow-up visit'&&row.case_id===caseId),'MHO must see visits added to BHW-created cases');
    const [audits]=await db.query("SELECT role FROM system_audit_logs WHERE user_id='VISIT-MHO' AND action='Case Visit Recorded'");assert.equal(audits.length,2);assert.ok(audits.every(row=>row.role==='MHO'));
    const spoof=await request('/mho/walk-in-cases','mho',{...patient(),barangay_id:other,date_recorded:'2026-10-10',visit:visit('Follow-up visit')});assert.equal(spoof.status,404);
    await db.query('UPDATE health_cases SET is_archived=1 WHERE id=?',[created.result.id]);
    assert.equal((await request('/mho/walk-in-matches','mho',{...identity,first_name:'Municipal',barangay_id:String(other)})).result.data.length,0);
});

test('today reports isolate dates and barangays, include returns to older cases, and enforce roles',async()=>{
    const {todayPeriod}=require('../services/report-periods'),{dailyReportData}=require('../services/daily-report');
    const period=todayPeriod(),prior=new Date(period.start+'T00:00:00Z');prior.setUTCDate(prior.getUTCDate()-1);
    const yesterday=prior.toISOString().slice(0,10);
    const [[senior]]=await db.query("SELECT id FROM health_cases WHERE suffix='Sr.'");
    await db.query('UPDATE health_cases SET barangay_id=?,date_recorded=? WHERE id=?',[other,period.start,senior.id]);
    for(const nature of ['Follow-up visit','New admission'])assert.equal((await request('/patients','bhw',{...patient(),date_recorded:period.start,visit:visit(nature)})).status,201);
    assert.equal((await request('/patients','bhw',{...patient(),first_name:'Today',suffix:'',date_recorded:period.start})).status,201);
    const future=await request('/patients','bhw',{...patient(),first_name:'Tomorrow',suffix:'',date_recorded:yesterday});assert.equal(future.status,201);
    await db.query('UPDATE health_cases SET date_recorded=? WHERE id=?',[period.end,future.result.id]);
    await db.query('UPDATE case_visits SET consultation_date=? WHERE case_id=?',[period.end,future.result.id]);
    await db.query(`INSERT INTO case_visits(case_id,consultation_date,transaction_mode,nature_of_visit,severity,encoded_by)
        VALUES(?,?,'Walk-in','Follow-up visit','Mild','VISIT-BHW')`,[senior.id,period.start]);
    await db.query('UPDATE health_cases SET is_archived=1 WHERE id=?',[caseId]);
    const bhw=await dailyReportData(db,{role:'bhw',barangay_id:own},period),mho=await dailyReportData(db,{role:'mho'},period);
    assert.equal(bhw.caseCount,1);assert.equal(bhw.visitCount,3);
    assert.equal(mho.caseCount,2);assert.equal(mho.visitCount,4);
    assert.equal(bhw.scopeLabel,'Visit Fixture A');assert.ok(bhw.cases.every(r=>r.barangay==='Visit Fixture A'));
    assert.ok(bhw.visits.some(r=>r.nature_of_visit==='New admission'));assert.ok(bhw.visits.some(r=>r.nature_of_visit==='Follow-up visit'));
    assert.ok(!Object.hasOwn(bhw.cases[0],'patient_name'),'Summary must not disclose resident identities');
    for(const role of ['bhw','mho']){
        const response=await fetch(base+'/api/'+role+'/reports/today?start=1900-01-01&end=9999-01-01',{headers:{Authorization:'Bearer '+tokens[role]}});
        assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),new RegExp(period.start));
        assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
    }
    for(const role of ['admin','superadmin','mho'])assert.equal((await request('/bhw/reports/today',role)).status,403);
    assert.equal((await request('/mho/reports/today','bhw')).status,403);
    assert.equal((await request('/bhw/reports/today?barangay_id='+other)).status,403);
    assert.equal((await fetch(base+'/api/mho/reports/today')).status,401);
    const [audits]=await db.query("SELECT details FROM system_audit_logs WHERE action='Report Export Prepared'");
    const ownAudit=audits.map(r=>JSON.parse(r.details)).find(r=>r.target_id==='BHW Today');
    assert.equal(ownAudit.record_count,1);assert.equal(ownAudit.visit_count,3);assert.equal(ownAudit.period.start,period.start);
});

test('BHW and MHO plans persist per visit in both dossiers without replacing previous plans or increasing disease counts',async()=>{
    const {createMhoPatients}=require('../services/mho-patients');
    await db.query('UPDATE health_cases SET is_archived=0 WHERE id=?',[caseId]);
    const [[original]]=await db.query('SELECT * FROM health_cases WHERE id=?',[caseId]);
    const [[counts]]=await db.query('SELECT (SELECT COUNT(*) FROM health_cases) cases,(SELECT COUNT(*) FROM residents) residents');
    const firstPlan={next_followup_date:'2026-11-01',followup_instructions:'Synthetic review instructions.\nBring the previous record.'};
    for(const [role,nature,date,plan] of [['bhw','Follow-up visit','2026-10-11',firstPlan],['mho','New admission','2026-10-12',{next_followup_date:'2026-11-02',followup_instructions:'Synthetic second visit advice.'}],['bhw','Follow-up visit','2026-10-13',{}]]){
        const response=await request(role==='mho'?'/mho/walk-in-cases':'/patients',role,{...patient(),barangay_id:own,date_recorded:date,visit:{...visit(nature),...plan}});
        assert.equal(response.status,201,JSON.stringify(response.result));assert.equal(response.result.id,caseId);assert.equal(response.result.new_case,false);
    }
    const bhw=(await request('/residents/'+original.resident_id+'/dossier')).result;
    const mho=await createMhoPatients(db).dossier('resident',original.resident_id);
    const perCase=(await request('/patients/'+caseId+'/visits')).result.data;
    for(const rows of [bhw.visits,mho.visits,perCase]){
        const first=rows.find(v=>v.consultation_date==='2026-10-11');assert.equal(first.next_followup_date,firstPlan.next_followup_date);assert.equal(first.followup_instructions,firstPlan.followup_instructions);
        assert.equal(rows.find(v=>v.consultation_date==='2026-10-12').next_followup_date,'2026-11-02');
        const blank=rows.find(v=>v.consultation_date==='2026-10-13');assert.equal(blank.next_followup_date,null);assert.equal(blank.followup_instructions,null);
    }
    assert.deepEqual((await db.query('SELECT * FROM health_cases WHERE id=?',[caseId]))[0][0],original);
    assert.deepEqual((await db.query('SELECT (SELECT COUNT(*) FROM health_cases) cases,(SELECT COUNT(*) FROM residents) residents'))[0][0],counts);
    const [[before]]=await db.query('SELECT COUNT(*) n FROM case_visits');
    for(const role of ['bhw','mho']){
        const response=await request(role==='mho'?'/mho/walk-in-cases':'/patients',role,{...patient(),barangay_id:own,date_recorded:'2026-10-14',visit:{...visit('Follow-up visit'),next_followup_date:'2026-10-13'}});
        assert.equal(response.status,400);assert.match(response.result.error,/on or after/);
    }
    assert.equal((await db.query('SELECT COUNT(*) n FROM case_visits'))[0][0].n,before.n);
    await migrateCaseVisits(db);await migrateCaseVisits(db);
    assert.equal((await request('/patients/'+caseId+'/visits')).result.data.find(v=>v.consultation_date==='2026-10-11').followup_instructions,firstPlan.followup_instructions);
});
