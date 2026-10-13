const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),mysql=require('mysql2/promise'),bcrypt=require('bcrypt'),jwt=require('jsonwebtoken');
const {sessionVersion}=require('../config/security-config');
const {migrateResidentVital}=require('../services/resident-vital');
const source={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};
const name='health_intel_vital_verify_'+process.pid,secret=crypto.randomBytes(32).toString('hex'),tokens={};
let root,db,appDb,server,base,own,other,residentId,foreignId,caseId,reportId,baseline;
async function fingerprint(){const [tables]=await root.query('SHOW TABLES FROM `'+source.database+'`'),values=[];for(const table of tables){const t=Object.values(table)[0], [rows]=await root.query('SELECT * FROM `'+source.database+'`.`'+t+'`');values.push([t,rows.map(r=>JSON.stringify(r)).sort()]);}return crypto.createHash('sha256').update(JSON.stringify(values)).digest('hex');}
before(async()=>{
    root=await mysql.createConnection(source);baseline=await fingerprint();await root.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4');await root.query('USE `'+name+'`');await root.query('SET FOREIGN_KEY_CHECKS=0');
    const [tables]=await root.query('SHOW TABLES FROM `'+source.database+'`');for(const table of tables){const t=Object.values(table)[0],[[ddl]]=await root.query('SHOW CREATE TABLE `'+source.database+'`.`'+t+'`');await root.query(ddl['Create Table']);}await root.query('SET FOREIGN_KEY_CHECKS=1');
    db=mysql.createPool({...source,database:name});await migrateResidentVital(db);await migrateResidentVital(db);
    const [b]=await db.query("INSERT INTO barangays(name,latitude,longitude) VALUES('Vital Fixture A',10,123),('Vital Fixture B',11,123)");own=b.insertId;other=own+1;
    const hash=await bcrypt.hash('Disposable-vital-2026',10);
    for(const role of ['bhw','mho','admin','superadmin']){const id='VITAL-'+role.toUpperCase();await db.execute("INSERT INTO users(system_id,first_name,last_name,role,barangay_id,password_hash,status) VALUES(?,'Synthetic','Vital',?,?,?,'approved')",[id,role,role==='bhw'?own:null,hash]);tokens[role]=jwt.sign({system_id:id,password_version:sessionVersion(hash,secret)},secret,{expiresIn:'1h'});}
    await db.query("INSERT INTO disease_registry(name,status,is_archived) VALUES('Vital Disease','Active',0)");
    const [r]=await db.execute("INSERT INTO residents(first_name,last_name,patient_name,birthdate,age,purok,barangay_id) VALUES('Foreign','Resident','Foreign Resident','2000-01-01',26,'QA',?)",[other]);foreignId=r.insertId;
    process.env.DB_NAME=name;process.env.DB_HOST=source.host;process.env.JWT_SECRET=secret;require('nodemailer').createTransport=()=>({sendMail:async()=>({})});const app=require('../server');appDb=app.db;server=app.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(appDb)await appDb.end();if(db)await db.end();if(root){try{assert.equal(await fingerprint(),baseline,'Original rows changed');assert.match(name,/^health_intel_vital_verify_\d+$/);assert.notEqual(name,source.database);await root.query('DROP DATABASE `'+name+'`');}finally{await root.end();}}});
async function request(route,role='bhw',body,method){const response=await fetch(base+'/api'+route,{method:method||(body?'POST':'GET'),headers:{...(role?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();return {status:response.status,result};}
const patient=(date='2024-01-01',nature='New consultation/case')=>({first_name:'Synthetic',last_name:'Vital',suffix:'Jr.',birthdate:'2000-01-01',purok:'QA',date_recorded:date,disease:'Vital Disease',severity:'Mild',remarks:'Synthetic only',visit:{transaction_mode:'Walk-in',nature_of_visit:nature,consultation_time:'13:05',blood_pressure:'120/80',temperature_c:'36.5',height_cm:'165',weight_kg:'60',case_id:nature==='New consultation/case'?null:caseId}});
const report=()=>({death_date:'2025-01-01',source:'Synthetic source checked by MHO',note:'Synthetic only',reported_by:'SPOOFED'});

test('case-level Deceased labels do not auto-confirm a resident; multiple cases remain one profile',async()=>{
    for(const date of ['2024-01-01','2024-01-02','2024-01-03']){const saved=await request('/patients','bhw',patient(date));assert.equal(saved.status,201,JSON.stringify(saved.result));caseId ||=saved.result.id;}
    const [[row]]=await db.query('SELECT resident_id FROM health_cases WHERE id=?',[caseId]);residentId=row.resident_id;
    await db.query("UPDATE health_cases SET status='Deceased'");
    const directory=(await request('/residents')).result.data;assert.equal(directory.length,1);assert.equal(directory[0].case_count,3);assert.equal(directory[0].is_deceased,0);
    const list=(await request('/mho/resident-status?view=deceased','mho')).result;assert.equal(list.total,0);
});
test('death reports validate source, dates, roles and barangay; concurrent duplicates have one winner',async()=>{
    for(const change of [{source:''},{death_date:'2099-01-01'},{death_date:'1999-01-01'},{death_date:'2025-02-30'},{source:{}}])assert.equal((await request('/residents/'+residentId+'/death-report','bhw',{...report(),...change})).status,400);
    assert.equal((await request('/residents/'+foreignId+'/death-report','bhw',report())).status,404);
    for(const role of ['mho','admin','superadmin',null])assert.ok([401,403].includes((await request('/residents/'+residentId+'/death-report',role,report())).status));
    const attempts=await Promise.all([request('/residents/'+residentId+'/death-report','bhw',report()),request('/residents/'+residentId+'/death-report','bhw',report())]);assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);reportId=attempts.find(r=>r.status===200).result.id;
    const [[row]]=await db.query('SELECT reported_by FROM resident_death_reports WHERE id=?',[reportId]);assert.equal(row.reported_by,'VITAL-BHW');
    const dossier=(await request('/residents/'+residentId+'/dossier')).result;assert.equal(dossier.resident.is_deceased,0);assert.equal(dossier.resident.death_report_status,'Pending');assert.equal(dossier.history.length,3);
});
test('only MHO confirms; duplicate review fails and the registry counts a resident once',async()=>{
    for(const role of ['bhw','admin','superadmin',null])assert.ok([401,403].includes((await request('/mho/death-reports/'+reportId+'/review',role,{action:'confirm',reason:'Synthetic verification'},'PUT')).status));
    assert.equal((await request('/mho/death-reports/'+reportId+'/review','mho',{action:'confirm',reason:'tiny'},'PUT')).status,400);
    const results=await Promise.all([1,2].map(()=>request('/mho/death-reports/'+reportId+'/review','mho',{action:'confirm',reason:'Synthetic verification'},'PUT')));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    const dossier=(await request('/residents/'+residentId+'/dossier')).result;assert.equal(dossier.resident.is_deceased,1);assert.equal(dossier.resident.death_date,'2025-01-01');assert.equal(dossier.history.length,3);assert.equal(dossier.visits.length,3);
    const list=(await request('/mho/resident-status?view=deceased','mho')).result;assert.equal(list.total,1);assert.equal(list.confirmed_total,1);assert.equal(list.data[0].resident_id,residentId);
    const response=await fetch(base+'/api/mho/reports/deceased-residents',{headers:{Authorization:'Bearer '+tokens.mho}});assert.equal(response.status,200);assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
    const [[audit]]=await db.query("SELECT details FROM system_audit_logs WHERE action='Report Export Prepared' ORDER BY id DESC LIMIT 1");assert.equal(JSON.parse(audit.details).record_count,1);
});
test('known death dates block new cases and returns for both roles, including a changed purok; backdated entries remain possible',async()=>{
    const [[before]]=await db.query('SELECT (SELECT COUNT(*) FROM residents) r,(SELECT COUNT(*) FROM health_cases) c,(SELECT COUNT(*) FROM case_visits) v');
    for(const role of ['bhw','mho'])for(const nature of ['New consultation/case','Follow-up visit','New admission']){
        const body={...patient('2025-01-02',nature),purok:'Different zone',...(role==='mho'?{barangay_id:own}:{})};const saved=await request(role==='bhw'?'/patients':'/mho/walk-in-cases',role,body);assert.equal(saved.status,409,JSON.stringify(saved.result));
    }
    const [[after]]=await db.query('SELECT (SELECT COUNT(*) FROM residents) r,(SELECT COUNT(*) FROM health_cases) c,(SELECT COUNT(*) FROM case_visits) v');assert.deepEqual(after,before);
    assert.equal((await request('/patients','bhw',patient('2024-12-31','Follow-up visit'))).status,201);
    const identity={first_name:'Synthetic',last_name:'Vital',suffix:'Jr.',birthdate:'2000-01-01',barangay_id:String(own)};
    assert.equal((await request('/mho/walk-in-matches','mho',identity)).result.data.length,0);
    assert.equal((await request('/mho/walk-in-matches','mho',{...identity,consultation_date:'2024-12-31'})).result.data.length,3);
    const form=(await request('/patients/'+caseId+'/correction')).result.data;
    const correction={date_recorded:'2025-01-02',disease:form.disease,severity:form.severity,version:form.version,reason:'Synthetic date correction'};
    assert.equal((await request('/patients/'+caseId+'/correction','bhw',correction,'PUT')).status,409);
});
test('corrections require MHO, version and reason; date corrections and clearing preserve clinical history',async()=>{
    let row=(await request('/mho/resident-status?view=deceased','mho')).result.data[0];
    const action={action:'correct-date',death_date:'2025-01-03',version:row.version,reason:'Synthetic corrected source date'};
    assert.equal((await request('/mho/residents/'+residentId+'/vital-status','bhw',action,'PUT')).status,403);
    assert.equal((await request('/mho/residents/'+residentId+'/vital-status','mho',{...action,reason:''},'PUT')).status,400);
    assert.equal((await request('/mho/residents/'+residentId+'/vital-status','mho',action,'PUT')).status,200);
    assert.equal((await request('/mho/residents/'+residentId+'/vital-status','mho',action,'PUT')).status,409);
    row=(await request('/mho/resident-status?view=deceased','mho')).result.data[0];
    assert.equal((await request('/mho/residents/'+residentId+'/vital-status','mho',{action:'clear-deceased',version:row.version,reason:'Synthetic erroneous confirmation corrected'},'PUT')).status,200);
    const dossier=(await request('/residents/'+residentId+'/dossier')).result;assert.equal(dossier.resident.is_deceased,0);assert.equal(dossier.resident.death_report_status,'Corrected');assert.equal(dossier.history.length,3);assert.equal(dossier.visits.length,4);assert.ok(dossier.history.every(h=>h.status==='Deceased'));
    const [audits]=await db.query("SELECT details FROM system_audit_logs WHERE action='Resident Death Status Corrected'");assert.equal(audits.length,2);assert.ok(audits.every(r=>JSON.parse(r.details).reason));
});
test('rejection permits corrected resubmission; unknown death date blocks visits until dated; failed audit rolls back confirmation',async()=>{
    let saved=await request('/residents/'+residentId+'/death-report','bhw',{...report(),death_date:''});const id=saved.result.id;
    assert.equal((await request('/mho/death-reports/'+id+'/review','mho',{action:'reject',reason:'Synthetic source needs clarification'},'PUT')).status,200);
    saved=await request('/residents/'+residentId+'/death-report','bhw',{...report(),death_date:''});const next=saved.result.id;assert.equal(saved.status,200);
    await db.query("CREATE TRIGGER vital_qa_audit_failure BEFORE INSERT ON system_audit_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'");
    try{assert.equal((await request('/mho/death-reports/'+next+'/review','mho',{action:'confirm',reason:'Synthetic reviewed unknown date'},'PUT')).status,503);}finally{await db.query('DROP TRIGGER vital_qa_audit_failure');}
    assert.equal((await request('/residents/'+residentId+'/dossier')).result.resident.is_deceased,0);
    assert.equal((await request('/mho/death-reports/'+next+'/review','mho',{action:'confirm',reason:'Synthetic reviewed unknown date'},'PUT')).status,200);
    assert.equal((await request('/patients','bhw',patient('2024-12-30','Follow-up visit'))).status,409);
    const row=(await request('/mho/resident-status?view=deceased','mho')).result.data[0];assert.equal(row.death_date,null);
    assert.equal((await request('/mho/residents/'+residentId+'/vital-status','mho',{action:'correct-date',version:row.version,death_date:'2025-01-01',reason:'Synthetic date now established'},'PUT')).status,200);
    assert.equal((await request('/patients','bhw',patient('2024-12-30','Follow-up visit'))).status,201);
});
