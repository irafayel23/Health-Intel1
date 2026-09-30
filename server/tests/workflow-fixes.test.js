const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const mysql=require('mysql2/promise'),bcrypt=require('bcrypt'),jwt=require('jsonwebtoken');
const fixture=require('./firebase-fixture');
const {createFirebaseVerifier}=require('../firebase-verification');
const {createDatabaseDump}=require('../database-backup');
const {sessionVersion}=require('../security-config');
const source={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};
const name='health_intel_workflow_verify_'+process.pid,secret=crypto.randomBytes(32).toString('hex');
let root,db,server,appDb,dump,created=false,baseline,base,own,other,caseId,residentId,restoreFetch;const tokens={};
async function fingerprint(){const [tables]=await root.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME',[source.database]);const values=[];for(const t of tables){const [rows]=await root.query('SELECT * FROM `'+source.database+'`.`'+t.TABLE_NAME+'`');values.push([t.TABLE_NAME,rows.map(r=>JSON.stringify(r)).sort()]);}return crypto.createHash('sha256').update(JSON.stringify(values)).digest('hex');}
before(async()=>{
    root=await mysql.createConnection({...source,multipleStatements:true});baseline=await fingerprint();dump=await createDatabaseDump(source);await root.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4');created=true;await root.query('USE `'+name+'`');await root.query(fs.readFileSync(dump.filename,'utf8'));await dump.cleanup();dump=null;
    db=mysql.createPool({...source,database:name});const [barangays]=await db.query('SELECT id,name FROM barangays ORDER BY id LIMIT 2');own=barangays[0];other=barangays[1];const hash=await bcrypt.hash('Workflow-fixture-2026',10);
    for(const role of ['bhw','mho','admin','superadmin']){const id='WORKFLOW-'+role.toUpperCase();await db.execute("INSERT INTO users(system_id,first_name,last_name,role,barangay_id,password_hash,status,email) VALUES(?,'Workflow','Fixture',?,?,?,'approved',?)",[id,role,role==='bhw'?own.id:null,hash,'workflow-'+role+'@example.invalid']);tokens[role]=jwt.sign({system_id:id,password_version:sessionVersion(hash,secret)},secret,{expiresIn:'1h'});}
    await db.execute("INSERT INTO disease_registry(name,classification,category,status) VALUES('Workflow Disease A','Communicable','morbidity','Active'),('Workflow Disease B','Communicable','morbidity','Active'),('Workflow Archived Disease','Communicable','morbidity','Archived')");
    const [resident]=await db.execute("INSERT INTO residents(first_name,last_name,patient_name,birthdate,age,purok,barangay_id) VALUES('Disposable','Workflow','Disposable Workflow','2000-06-15',26,'QA Zone',?)",[own.id]);residentId=resident.insertId;
    const [row]=await db.execute("INSERT INTO health_cases(resident_id,first_name,last_name,patient_name,birthdate,age,purok,barangay_id,disease,date_recorded,severity,status,remarks,encoded_by) VALUES(?,'Disposable','Workflow','Disposable Workflow','2000-06-15',24,'QA Zone',?,'Workflow Disease A','2025-06-14','Mild','Active','Keep original notes','WORKFLOW-BHW')",[residentId,own.id]);caseId=row.insertId;
    restoreFetch=fixture.install();require('nodemailer').createTransport=()=>({sendMail:async()=>({})});process.env.DB_NAME=name;process.env.DB_HOST=source.host;process.env.JWT_SECRET=secret;const app=require('../server');appDb=app.db;server=app.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(appDb)await appDb.end();if(db)await db.end();if(dump)await dump.cleanup();if(root){try{if(created){assert.match(name,/^health_intel_workflow_verify_\d+$/);assert.notEqual(name,source.database);await root.query('DROP DATABASE `'+name+'`');}assert.equal(await fingerprint(),baseline,'Source data must remain unchanged');}finally{await root.end();}}restoreFetch?.();});
async function request(route,role,body,method){return fetch(base+route,{method:method||(body?'POST':'GET'),headers:{...(role?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function form(role='bhw',id=caseId){const response=await request('/api/patients/'+id+'/correction',role);assert.equal(response.status,200);return (await response.json()).data;}
const payload=data=>({date_recorded:data.date_recorded,disease:data.disease,severity:data.severity,version:data.version,reason:'Confirmed against the original source record'});
test('Google proof checks signatures, project, dates, provider, email verification and exact email ownership',async()=>{
    const verify=createFirebaseVerifier({getCertificates:async()=>({certificates:{'qa-trusted-key':fixture.publicKey},maxAge:3600})});const email='verified-fixture@example.invalid';assert.deepEqual(await verify(fixture.token(email),email),{uid:'disposable-firebase-fixture',email});
    const nearFuture=Math.floor(Date.now()/1000)+10;
    assert.deepEqual(await verify(fixture.token(email,{iat:nearFuture,auth_time:nearFuture}),email),{uid:'disposable-firebase-fixture',email});
    const time=Math.floor(Date.now()/1000);for(const claims of [{aud:'other-project'},{iss:'https://untrusted.example'},{exp:time-10},{iat:time+60},{auth_time:time+60},{email_verified:false},{firebase:{sign_in_provider:'password'}},{sub:''},{exp:undefined},{auth_time:undefined}])await assert.rejects(verify(fixture.token(email,claims),email),e=>e.status===401);
    await assert.rejects(verify(fixture.token(email),'someone-else@example.invalid'),e=>e.status===401);
    const attacker=crypto.generateKeyPairSync('rsa',{modulusLength:2048});await assert.rejects(verify(jwt.sign({email},attacker.privateKey,{algorithm:'RS256',keyid:'qa-trusted-key'}),email),e=>e.status===401);
    await assert.rejects(verify(jwt.sign({email},'wrong-key',{algorithm:'HS256',keyid:'qa-trusted-key'}),email),e=>e.status===401);
});
test('certificate cache expires, rotates keys and fails closed when Google is unavailable',async()=>{
    let calls=0,clock=Date.now(),fail=false,keys={'qa-trusted-key':fixture.publicKey};const verify=createFirebaseVerifier({now:()=>clock,getCertificates:async()=>{calls++;if(fail)throw Error('offline');return {certificates:keys,maxAge:10};}});const email='cache@example.invalid';
    await Promise.all([verify(fixture.token(email),email),verify(fixture.token(email),email)]);assert.equal(calls,1);await verify(fixture.token(email),email);assert.equal(calls,1);
    clock+=6000;keys={'rotated-key':fixture.publicKey};await verify(fixture.token(email,{}, {keyid:'rotated-key'}),email);assert.equal(calls,2);
    clock+=11000;fail=true;await assert.rejects(verify(fixture.token(email,{}, {keyid:'rotated-key'}),email),e=>e.status===503);assert.equal(calls,3);await assert.rejects(verify(fixture.token(email,{}, {keyid:'rotated-key'}),email),e=>e.status===503);assert.equal(calls,3);
});
test('registration and email checking refuse missing or mismatched Google proof; valid registration remains pending',async()=>{
    const data={role:'mho',first_name:'Google',last_name:'Fixture',employee_id:'QA',password:'Workflow-fixture-2026',email:'new-google-fixture@example.invalid'};
    for(const firebase_id_token of [undefined,'bad-token',fixture.token('wrong-email@example.invalid'),fixture.token(data.email,{email_verified:false})]){assert.equal((await request('/api/register',null,{...data,firebase_id_token})).status,401);assert.equal((await request('/api/check-email',null,{email:data.email,firebase_id_token})).status,401);}
    const response=await request('/api/register',null,{...data,firebase_id_token:fixture.token(data.email)});assert.equal(response.status,200);const registered=await response.json();const [[row]]=await db.query('SELECT status,email FROM users WHERE system_id=?',[registered.system_id]);assert.equal(row.status,'pending');assert.equal(row.email,data.email);
    const lookup=await request('/api/check-email',null,{email:data.email,firebase_id_token:fixture.token(data.email)});assert.deepEqual(await lookup.json(),{exists:true});
});
test('BHW corrections are barangay-limited, while MHO and Superadmin cannot edit clinical records',async()=>{
    const [row]=await db.execute("INSERT INTO health_cases(patient_name,barangay_id,disease,date_recorded,severity) VALUES('Other Disposable',?,'Workflow Disease A','2025-06-14','Mild')",[other.id]);for(const method of ['GET','PUT']){assert.equal((await request('/api/patients/'+row.insertId+'/correction','bhw',method==='PUT'?{}:undefined,method)).status,404);for(const role of ['mho','superadmin'])assert.equal((await request('/api/patients/'+caseId+'/correction',role,method==='PUT'?{}:undefined,method)).status,403);}
});
test('MHO can encode a walk-in into the resident barangay without gaining BHW editing access',async()=>{
    const options=await request('/api/mho/walk-in-options','mho');assert.equal(options.status,200);
    const choices=(await options.json()).data;
    assert.ok(choices.barangays.some(row=>row.id===other.id));
    assert.ok(choices.diseases.some(row=>row.name==='Workflow Disease A'));
    assert.ok(!choices.diseases.some(row=>row.name==='Workflow Archived Disease'));
    for(const role of ['bhw','admin','superadmin'])assert.equal((await request('/api/mho/walk-in-options',role)).status,403);
    const walkin={first_name:'Walkin',last_name:'Fixture',birthdate:'2001-05-10',date_recorded:'2025-08-12',barangay_id:other.id,purok:'MHO Zone',disease:'Workflow Disease A',severity:'Monitored',remarks:'Disposable walk-in fixture',status:'Active'};
    const saved=await request('/api/mho/walk-in-cases','mho',walkin);assert.equal(saved.status,201,JSON.stringify(await saved.clone().json()));
    const id=(await saved.json()).id;
    const [[row]]=await db.execute("SELECT encoded_by,barangay_id,resident_id,age,status FROM health_cases WHERE id=?",[id]);
    assert.equal(row.encoded_by,'WORKFLOW-MHO');assert.equal(row.barangay_id,other.id);assert.ok(row.resident_id);assert.equal(row.age,24);assert.equal(row.status,'Active');
    const [[resident]]=await db.execute('SELECT barangay_id,purok FROM residents WHERE id=?',[row.resident_id]);assert.equal(resident.barangay_id,other.id);assert.equal(resident.purok,'MHO Zone');
    const [[audit]]=await db.execute("SELECT role,action FROM system_audit_logs WHERE user_id='WORKFLOW-MHO' AND action='Walk-in Case Encoded' ORDER BY id DESC LIMIT 1");assert.equal(audit.role,'MHO');
    const recent=await request('/api/mho/walk-in-cases','mho');assert.equal(recent.status,200);const ownRows=(await recent.json()).data;assert.ok(ownRows.some(item=>item.id===id));assert.ok(!ownRows.some(item=>item.id===caseId));
    assert.equal((await request('/api/mho/walk-in-cases','bhw',walkin)).status,403);
    assert.equal((await request('/api/patients','mho',walkin)).status,403);
    assert.equal((await request('/api/mho/walk-in-cases',null,walkin)).status,401);
    assert.equal((await request('/api/mho/walk-in-cases','mho',walkin)).status,409);
    for(const change of [{barangay_id:999999},{barangay_id:''},{date_recorded:'2099-01-01'},{disease:'Workflow Archived Disease'}])assert.equal((await request('/api/mho/walk-in-cases','mho',{...walkin,...change})).status,400);
});
test('reviewed corrections recalculate case age, retain identity and notes, and log before/after/reason/actor',async()=>{
    const data=await form();const response=await request('/api/patients/'+caseId+'/correction','bhw',{...payload(data),date_recorded:'2025-06-16',disease:'Workflow Disease B',severity:'High Risk'},'PUT');assert.equal(response.status,200);
    const [[row]]=await db.query('SELECT age,disease,severity,remarks,resident_id FROM health_cases WHERE id=?',[caseId]);assert.equal(row.age,25);assert.equal(row.disease,'Workflow Disease B');assert.equal(row.severity,'High Risk');assert.equal(row.remarks,'Keep original notes');assert.equal(row.resident_id,residentId);
    const [[log]]=await db.query("SELECT user_id,role,details FROM system_audit_logs WHERE action='Case Corrected' ORDER BY id DESC LIMIT 1");assert.equal(log.user_id,'WORKFLOW-BHW');assert.equal(log.role,'BHW');const details=JSON.parse(log.details);assert.equal(details.before.date_recorded,'2025-06-14');assert.equal(details.after.date_recorded,'2025-06-16');assert.equal(details.before.age,24);assert.equal(details.after.age,25);assert.match(details.reason,/original source/);
});
test('correction refuses future/impossible/pre-birth dates, unknown/archived categories, missing reason and no-op',async()=>{
    const data=await form();for(const changed of [{date_recorded:'2099-01-01'},{date_recorded:'2025-02-30'},{date_recorded:'1999-01-01'},{date_recorded:null},{disease:'Unregistered Workflow Category'},{disease:'Workflow Archived Disease'},{severity:'Critical'},{severity:'Mild',reason:''},{}])assert.equal((await request('/api/patients/'+caseId+'/correction','bhw',{...payload(data),...changed},'PUT')).status,400);
});
test('two simultaneous editors have one winner and the second cannot overwrite the first',async()=>{
    const data=await form();const results=await Promise.all([request('/api/patients/'+caseId+'/correction','admin',{...payload(data),severity:'Mild'},'PUT'),request('/api/patients/'+caseId+'/correction','bhw',{...payload(data),severity:'Monitored'},'PUT')]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
});
test('correction cannot create a duplicate resident/disease/date case or bypass archive review',async()=>{
    await db.execute("INSERT INTO health_cases(resident_id,patient_name,barangay_id,disease,date_recorded,severity) VALUES(?,'Disposable Workflow',?,'Workflow Disease A','2025-06-18','Mild')",[residentId,own.id]);const data=await form();assert.equal((await request('/api/patients/'+caseId+'/correction','admin',{...payload(data),disease:'Workflow Disease A',date_recorded:'2025-06-18'},'PUT')).status,409);
    await db.execute("INSERT INTO health_cases(first_name,last_name,birthdate,patient_name,barangay_id,disease,date_recorded,severity) VALUES('Disposable','Workflow','2000-06-15','Disposable Workflow',?,'Workflow Disease A','2025-06-19','Mild')",[own.id]);
    assert.equal((await request('/api/patients/'+caseId+'/correction','admin',{...payload(data),disease:'Workflow Disease A',date_recorded:'2025-06-19'},'PUT')).status,409,'Unlinked historical records with matching identity also prevent duplicates');
    assert.equal((await request('/api/patients/'+caseId+'/archive','admin',{},'PUT')).status,200);assert.equal((await request('/api/patients/'+caseId+'/correction','admin')).status,409);assert.equal((await request('/api/patients/'+caseId+'/correction','admin',{...payload(data),severity:'High Risk'},'PUT')).status,409);assert.equal((await request('/api/patients/'+caseId+'/restore','admin',{},'PUT')).status,200);
});
test('failed correction audit rolls back all changed fields',async()=>{
    const data=await form();const [[beforeRow]]=await db.query('SELECT * FROM health_cases WHERE id=?',[caseId]);await db.query('RENAME TABLE system_audit_logs TO workflow_audit_hold');try{assert.equal((await request('/api/patients/'+caseId+'/correction','admin',{...payload(data),severity:data.severity==='Mild'?'Monitored':'Mild'},'PUT')).status,503);const [[afterRow]]=await db.query('SELECT * FROM health_cases WHERE id=?',[caseId]);assert.deepEqual(afterRow,beforeRow);}finally{await db.query('RENAME TABLE workflow_audit_hold TO system_audit_logs');}
});
test('legacy severity correction preserves missing dates/ages and cannot invent a person link',async()=>{
    const [row]=await db.execute("INSERT INTO health_cases(patient_name,barangay_id,disease,date_recorded,age,severity) VALUES('Legacy Disposable',?,'Workflow Disease A',NULL,40,'Mild')",[own.id]);const data=await form('admin',row.insertId);assert.equal(data.identity_ready,false);assert.equal((await request('/api/patients/'+row.insertId+'/correction','admin',{...payload(data),severity:'Monitored'},'PUT')).status,200);
    const [[saved]]=await db.query('SELECT resident_id,date_recorded,age FROM health_cases WHERE id=?',[row.insertId]);assert.equal(saved.resident_id,null);assert.equal(saved.date_recorded,null);assert.equal(saved.age,40);
    const fresh=await form('admin',row.insertId);assert.equal((await request('/api/patients/'+row.insertId+'/correction','admin',{...payload(fresh),date_recorded:'2025-06-14'},'PUT')).status,409);
});
test('four-role rehearsal covers login, approved/pending governance, case views, MHO reports and Superadmin health',async()=>{
    for(const role of ['bhw','mho','admin','superadmin']){const login=await request('/api/login',null,{system_id:'WORKFLOW-'+role.toUpperCase(),password:'Workflow-fixture-2026'});assert.equal(login.status,200);assert.equal((await request('/api/session',role)).status,200);}
    for(const [route,role] of [['/api/bhw/context','bhw'],['/api/residents','bhw'],['/api/patients','bhw'],['/api/admin/pending-users','admin'],['/api/admin/audit-logs','admin'],['/api/diseases','admin'],['/api/mho/stats','mho'],['/api/heatmap-data','mho'],['/api/superadmin/health','superadmin'],['/api/superadmin/users','superadmin']])assert.equal((await request(route,role)).status,200,route);
    const weekly=await request('/api/mho/reports/pidsr?week=24&year=2025','mho');assert.equal(weekly.status,200);assert.match(Buffer.from(await weekly.arrayBuffer()).toString('latin1',0,5),/%PDF/);
    const health=await (await request('/api/superadmin/health','superadmin')).json();const [[auditCount]]=await db.query('SELECT COUNT(*) AS count FROM system_audit_logs');assert.equal(health.data.total_logs,auditCount.count,'Total Logs counts audit entries rather than patient cases');
});

test('new BHW cases appear in resident directory and Admin sees their saved actions', async () => {
    const patient = { first_name:'AuditDirectory', last_name:'Fixture', birthdate:'2000-01-01', date_recorded:'2025-09-30', purok:'QA Zone', disease:'Workflow Disease A', severity:'Mild', remarks:'Disposable fixture' };
    const created = await request('/api/patients','bhw',patient);
    assert.equal(created.status,201);
    const id = (await created.json()).id;
    const patients = (await (await request('/api/patients','bhw')).json()).data;
    const saved = patients.find(row => row.id === id);
    assert.ok(saved.resident_id);
    const residents = (await (await request('/api/residents','bhw')).json()).data;
    assert.equal(residents.find(row => row.id === saved.resident_id).case_count,1);
    const dossier = await (await request(`/api/residents/${saved.resident_id}/dossier`,'bhw')).json();
    assert.ok(dossier.history.some(row => row.id === id));
    const september = await (await request('/api/patients?month=September&year=2025&include_archived=true','bhw')).json();
    const october = await (await request('/api/patients?month=October&year=2025&include_archived=true','bhw')).json();
    assert.ok(september.data.some(row => row.id === id));
    assert.ok(!october.data.some(row => row.id === id));
    assert.equal((await request(`/api/patients/${id}/status`,'bhw',{new_status:'Cleared',remarks:'Reviewed fixture'},'PUT')).status,200);
    assert.equal((await request(`/api/patients/${id}/archive`,'bhw',{},'PUT')).status,200);
    assert.equal((await request(`/api/patients/${id}/restore`,'bhw',{},'PUT')).status,200);
    const corrected = await form('bhw',id);
    assert.equal((await request(`/api/patients/${id}/correction`,'bhw',{...payload(corrected),severity:'Monitored'},'PUT')).status,200);
    const audit = await request('/api/admin/audit-logs','admin');
    assert.equal(audit.status,200);
    const logs = (await audit.json()).data.filter(row => row.user_id === 'WORKFLOW-BHW');
    assert.ok(logs.some(row => row.action === 'Patient Encoded' && row.case_id === id && row.details.includes(own.name)));
    for (const action of ['Status Updated','Record Archived','Record Restored','Case Corrected']) {
        assert.ok(logs.some(row => row.action === action && row.details.includes(String(id))), action);
        assert.ok(logs.some(row => row.action === action && row.case_id === id), action+' case reference');
    }
    const detail = await request(`/api/admin/cases/${id}`,'admin');
    assert.equal(detail.status,200);
    const tracked = await detail.json();
    assert.equal(tracked.case.id,id);
    assert.equal(tracked.case.resident_id,saved.resident_id);
    assert.ok(tracked.history.every(log=>log.case_id===id));
    for (const action of ['Patient Encoded','Status Updated','Record Archived','Record Restored','Case Corrected']) assert.ok(tracked.history.some(log=>log.action===action),action);
    assert.equal((await request(`/api/patients/${id}/archive`,'bhw',{},'PUT')).status,200);
    const archivedDetail = await (await request(`/api/admin/cases/${id}`,'admin')).json();
    assert.equal(archivedDetail.case.is_archived,1);
    assert.ok(archivedDetail.history.some(log=>log.action==='Patient Encoded'));
    assert.equal((await request('/api/admin/cases/999999999','admin')).status,404);
    assert.equal((await request('/api/admin/cases/0','admin')).status,400);
    assert.equal((await request(`/api/admin/cases/${id}`)).status,401);
    for (const role of ['bhw','mho','superadmin']) assert.equal((await request(`/api/admin/cases/${id}`,role)).status,403);
    assert.equal((await request('/api/admin/audit-logs','bhw')).status,403);
});
test('BHW rehearsal checks all seven barangay assignments and keeps patient lists local',async()=>{
    const [barangays]=await db.query('SELECT id,name FROM barangays ORDER BY id');assert.equal(barangays.length,7);
    const hash=await bcrypt.hash('Seven-barangay-fixture-2026',10);
    for(const barangay of barangays){
        const id='WORKFLOW-BHW-B'+barangay.id,role='bhw-'+barangay.id;
        await db.execute("INSERT INTO users(system_id,first_name,last_name,role,barangay_id,password_hash,status,email) VALUES(?,'Seven','Barangays','bhw',?,?,'approved',?)",[id,barangay.id,hash,'seven-'+barangay.id+'@example.invalid']);
        tokens[role]=jwt.sign({system_id:id,password_version:sessionVersion(hash,secret)},secret,{expiresIn:'1h'});
        await db.execute("INSERT INTO health_cases(patient_name,barangay_id,disease,date_recorded,severity,status,encoded_by) VALUES(?,?,'Workflow Disease A','2025-08-01','Mild','Active',?)",['Disposable barangay '+barangay.id,barangay.id,id]);
    }
    for(const barangay of barangays){
        const role='bhw-'+barangay.id;
        assert.equal((await request('/api/session',role)).status,200);
        const context=await request('/api/bhw/context',role);assert.equal(context.status,200);
        assert.equal((await context.json()).data.barangay_id,barangay.id);
        const patients=await request('/api/patients',role);assert.equal(patients.status,200);
        const rows=(await patients.json()).data;
        assert.ok(rows.length>0);
        assert.ok(rows.every(row=>row.barangay_id===barangay.id));
        assert.ok(rows.some(row=>row.patient_name==='Disposable barangay '+barangay.id));
        const other=barangays.find(row=>row.id!==barangay.id);
        assert.equal((await request('/api/patients?barangay_id='+other.id,role)).status,403);
        const residents=await request('/api/residents',role);assert.equal(residents.status,200);
        assert.ok((await residents.json()).data.every(row=>row.barangay_id===barangay.id));
        const map=await request('/api/heatmap-data',role);assert.equal(map.status,200);
        const points=(await map.json()).data;assert.equal(points.length,7);
        assert.ok(points.every(point=>!('patient_name' in point)));
    }
    const mhoWalkin=(await db.query("SELECT id,barangay_id FROM health_cases WHERE encoded_by='WORKFLOW-MHO' ORDER BY id DESC LIMIT 1"))[0][0];
    assert.ok(mhoWalkin);
    const localCases=(await (await request('/api/patients','bhw-'+mhoWalkin.barangay_id)).json()).data;
    assert.ok(localCases.some(row=>row.id===mhoWalkin.id),'MHO walk-in appears to the assigned barangay BHW');
});
test('shared correction and MHO walk-in scripts parse without changing existing page hooks',()=>{
    for(const file of ['case-corrections.js','mho-walkins.js'])new vm.Script(fs.readFileSync(path.join(__dirname,'../../assets/js',file),'utf8'),{filename:file});
    for(const file of ['bhw.html','admin.html','index.html','mho.html'])for(const script of fs.readFileSync(path.join(__dirname,'..','..',file),'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(script[1].trim())new vm.Script(script[1],{filename:file});
});
