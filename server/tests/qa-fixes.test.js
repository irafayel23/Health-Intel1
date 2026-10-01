// Regression checks use a disposable copy; email is mocked and source rows are fingerprinted.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),vm=require('node:vm');
const mysql=require('mysql2/promise'),bcrypt=require('bcrypt'),jwt=require('jsonwebtoken');
const {createDatabaseDump}=require('../services/database-backup');
const {applyConstraints}=require('../scripts/apply-qa-constraints');
const {sessionVersion}=require('../config/security-config');
const {monthlyPeriod,isoWeekPeriod}=require('../services/report-periods');
const firebaseFixture=require('./firebase-fixture');
const restoreFetch=firebaseFixture.install();
after(()=>restoreFetch());
const source={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};
const name='health_intel_qa_fixes_verify_'+process.pid,secret=crypto.randomBytes(32).toString('hex');
let root,db,server,appDb,dump,created=false,beforeHash,base,barangay,barangayName,caseId;const tokens={};
async function fingerprint(){const [tables]=await root.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME',[source.database]);const all=[];for(const t of tables){const [rows]=await root.query('SELECT * FROM `'+source.database+'`.`'+t.TABLE_NAME+'`');all.push([t.TABLE_NAME,rows.map(r=>JSON.stringify(r)).sort()]);}return crypto.createHash('sha256').update(JSON.stringify(all)).digest('hex');}
before(async()=>{
    root=await mysql.createConnection({...source,multipleStatements:true});beforeHash=await fingerprint();dump=await createDatabaseDump(source);
    await root.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4');created=true;await root.query('USE `'+name+'`');await root.query(fs.readFileSync(dump.filename,'utf8'));await dump.cleanup();dump=null;
    db=mysql.createPool({...source,database:name});await require('../services/disease-review').migrateDiseaseReview(db);await applyConstraints(db);await applyConstraints(db);
    const [[b]]=await db.query('SELECT id,name FROM barangays ORDER BY id LIMIT 1');barangay=b.id;barangayName=b.name;
    const hash=await bcrypt.hash('Regression-only-2026',10);
    for(const role of ['bhw','mho','admin','superadmin']){const id='QA-'+role.toUpperCase();await db.execute("INSERT INTO users(system_id,first_name,last_name,role,barangay_id,password_hash,status) VALUES(?,'QA','Fixture',?,?,?,'approved')",[id,role,role==='bhw'?barangay:null,hash]);tokens[role]=jwt.sign({system_id:id,password_version:sessionVersion(hash,secret)},secret,{expiresIn:'1h'});}
    // High numeric IDs expose the former string-sorting bug without modifying real accounts.
    for(const id of ['BHW-99999998','BHW-99999999'])await db.execute("INSERT INTO users(system_id,first_name,last_name,role,password_hash,status) VALUES(?,'QA','Number','bhw',?,'pending')",[id,hash]);
    process.env.DB_NAME=name;process.env.DB_HOST=source.host;process.env.JWT_SECRET=secret;
    require('nodemailer').createTransport=()=>({sendMail:async()=>({})});
    const app=require('../server');appDb=app.db;server=app.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(appDb)await appDb.end();if(db)await db.end();if(dump)await dump.cleanup();if(root){try{if(created){assert.match(name,/^health_intel_qa_fixes_verify_\d+$/);assert.notEqual(name,source.database);await root.query('DROP DATABASE `'+name+'`');}assert.equal(await fingerprint(),beforeHash,'Original database records must remain unchanged');}finally{await root.end();}}});
async function request(route,role,body,method){if(body&&['/api/register','/api/check-email'].includes(route))body={...body,firebase_id_token:firebaseFixture.token(body.email)};return fetch(base+route,{method:method||(body?'POST':'GET'),headers:{...(role?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
const registration={role:'bhw',first_name:'QA',last_name:'Registration',assigned_barangay:null,password:'Regression-only-2026',employee_id:'QA-EMP'};

test('Master Ledger records access outcomes without credentials or false attribution; Admin retains operational scope',async()=>{
    assert.equal((await request('/api/login',null,{system_id:'QA-BHW',password:'wrong-private-fixture'})).status,401);
    assert.equal((await request('/api/login',null,{system_id:{unsafe:true},password:'wrong-private-fixture'})).status,401);
    const success=await request('/api/login',null,{system_id:'QA-BHW',password:'Regression-only-2026'});
    assert.equal(success.status,200);const signed=await success.json();
    const master=await (await request('/api/superadmin/audit-logs','superadmin')).json();
    const failed=master.data.find(row=>row.action==='Login Failed' && row.target_id==='QA-BHW');
    assert.equal(failed.user_id,'Unauthenticated');assert.equal(failed.role,'Unauthenticated');assert.equal(failed.outcome,'Failed');
    assert.match(JSON.parse(failed.details).attribution,/not proof/);
    const logged=master.data.find(row=>row.action==='Login Succeeded' && row.user_id==='QA-BHW');assert.equal(logged.outcome,'Succeeded');
    const serialized=JSON.stringify(master.data);assert.ok(!serialized.includes('wrong-private-fixture'));assert.ok(!serialized.includes('Regression-only-2026'));assert.ok(!serialized.includes(signed.token));
    await db.query('RENAME TABLE system_audit_logs TO qa_login_audit_hold');
    try {
        const blocked=await request('/api/login',null,{system_id:'QA-BHW',password:'Regression-only-2026'});assert.equal(blocked.status,500);assert.ok(!(await blocked.json()).token);
    } finally {await db.query('RENAME TABLE qa_login_audit_hold TO system_audit_logs');}
    const admin=await (await request('/api/admin/audit-logs','admin')).json();assert.ok(!admin.data.some(row=>['Login Succeeded','Login Failed'].includes(row.action)));
    for(const role of ['bhw','mho','admin'])assert.equal((await request('/api/superadmin/audit-logs',role)).status,403);
    for(let i=0;i<8;i++)await request('/api/login',null,{system_id:'QA-BHW',password:'wrong-private-fixture'});
    const [limited]=await db.query("SELECT user_id,details FROM system_audit_logs WHERE action='Login Rate Limited'");assert.ok(limited.length);assert.equal(limited[0].user_id,'Unauthenticated');
});

test('password changes commit with redacted audit; missing audit storage rolls back the password',async()=>{
    const [[original]]=await db.query("SELECT password_hash FROM users WHERE system_id='QA-BHW'");
    await db.query('RENAME TABLE system_audit_logs TO qa_password_audit_hold');
    try {
        assert.equal((await request('/api/change-password','bhw',{current_password:'Regression-only-2026',new_password:'Changed-fixture-2026'})).status,500);
        const [[row]]=await db.query("SELECT password_hash FROM users WHERE system_id='QA-BHW'");assert.equal(row.password_hash,original.password_hash);
    } finally {await db.query('RENAME TABLE qa_password_audit_hold TO system_audit_logs');}
    try {
        assert.equal((await request('/api/change-password','bhw',{current_password:'Regression-only-2026',new_password:'Changed-fixture-2026'})).status,200);
        const [[log]]=await db.query("SELECT details FROM system_audit_logs WHERE action='Password Changed' AND user_id='QA-BHW' ORDER BY id DESC LIMIT 1");
        assert.equal(JSON.parse(log.details).target_id,'QA-BHW');assert.ok(!log.details.includes('Changed-fixture-2026'));assert.ok(!log.details.includes(original.password_hash));
        assert.equal((await request('/api/session','bhw')).status,401);
    } finally {await db.execute("UPDATE users SET password_hash=? WHERE system_id='QA-BHW'",[original.password_hash]);}
});

test('password reset and single-use code commit only with a credential-free audit entry',async()=>{
    const [[original]]=await db.query("SELECT password_hash,email FROM users WHERE system_id='QA-BHW'");
    const email='qa-ledger-reset@example.invalid',code='812345';
    await db.execute("UPDATE users SET email=? WHERE system_id='QA-BHW'",[email]);
    await db.execute("INSERT INTO password_resets(email,token,expires_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 15 MINUTE))",[email,`v1:${require('../services/password-recovery').codeHash(email,code,secret)}:0`]);
    try {
        await db.query('RENAME TABLE system_audit_logs TO qa_reset_audit_hold');
        try {
            assert.equal((await request('/api/reset-password',null,{email,token:code,new_password:'Reset-fixture-2026'})).status,503);
            const [[row]]=await db.query("SELECT password_hash FROM users WHERE system_id='QA-BHW'");assert.equal(row.password_hash,original.password_hash);
            const [codes]=await db.execute('SELECT id FROM password_resets WHERE email=?',[email]);assert.equal(codes.length,1);
        } finally {await db.query('RENAME TABLE qa_reset_audit_hold TO system_audit_logs');}
        assert.equal((await request('/api/reset-password',null,{email,token:code,new_password:'Reset-fixture-2026'})).status,200);
        const [[log]]=await db.query("SELECT details FROM system_audit_logs WHERE action='Password Reset' AND user_id='QA-BHW' ORDER BY id DESC LIMIT 1");
        assert.equal(JSON.parse(log.details).target_id,'QA-BHW');for(const sensitive of [email,code,'Reset-fixture-2026',original.password_hash])assert.ok(!log.details.includes(sensitive));
        assert.equal((await request('/api/reset-password',null,{email,token:code,new_password:'Reset-fixture-2026'})).status,400);
    } finally {await db.execute("UPDATE users SET password_hash=?,email=? WHERE system_id='QA-BHW'",[original.password_hash,original.email]);}
});

test('report exports are server-attributed, scoped and honest about browser delivery',async()=>{
    const exported=await request('/api/bhw/report-data?month=January&year=2090&type=SURVEILLANCE&purok=No%20such%20zone','bhw');
    assert.equal(exported.status,200);assert.deepEqual((await exported.json()).data,[]);
    assert.equal((await request('/api/bhw/report-data?month=January&year=2090&type=MONTHLY&barangay_id=999999','bhw')).status,403);
    assert.equal((await request('/api/bhw/report-data?month=Wrong&year=2090&type=MONTHLY','bhw')).status,400);
    for(const role of ['mho','admin','superadmin'])assert.equal((await request('/api/bhw/report-data?month=January&year=2090&type=MONTHLY',role)).status,403);
    const pdf=await request('/api/mho/reports/fhsis?month=January&year=2090','mho');assert.equal(pdf.status,200);await pdf.arrayBuffer();
    assert.equal((await request('/api/mho/reports/pidsr?week=0&year=2090','mho')).status,400);
    const master=await (await request('/api/superadmin/audit-logs','superadmin')).json();
    const data=JSON.parse(master.data.find(row=>row.action==='Report Data Exported'&&row.user_id==='QA-BHW').details);
    assert.equal(data.barangay_id,barangay);assert.equal(data.purok,'No such zone');assert.equal(data.record_count,0);assert.match(data.delivery,/not verified/);
    assert.ok(master.data.some(row=>row.action==='Report Export Prepared'&&row.user_id==='QA-MHO'&&row.outcome==='Prepared'));
    assert.ok(master.data.some(row=>row.action==='Report Export Failed'&&row.outcome==='Failed'));
    const admin=await (await request('/api/admin/audit-logs','admin')).json();assert.ok(!admin.data.some(row=>row.action.startsWith('Report Export')||row.action==='Report Data Exported'));
});
test('registration rejects markup and allocates numeric IDs atomically despite stale previews',async()=>{
    const data={...registration,assigned_barangay:barangayName,email:'qa-invalid@example.invalid',employee_id:'<b>unsafe</b>'};assert.equal((await request('/api/register',null,data)).status,400);
    const preview=await request('/api/get-next-id',null,{role:'bhw'});assert.equal((await preview.json()).next_id,'BHW-100000000');
    const outcomes=await Promise.all([request('/api/register',null,{...data,employee_id:'QA',email:'qa-one@example.invalid',system_id:'BHW-001'}),request('/api/register',null,{...data,employee_id:'QA',email:'qa-two@example.invalid',system_id:'BHW-001'})]);assert.deepEqual(outcomes.map(r=>r.status),[200,200]);const ids=await Promise.all(outcomes.map(async r=>(await r.json()).system_id));assert.deepEqual(ids.sort(),['BHW-100000000','BHW-100000001']);
});
test('simultaneous normalized duplicate emails have one winner and database uniqueness also applies',async()=>{
    const data={...registration,assigned_barangay:barangayName,email:'QA-DUPLICATE@Example.invalid'};const results=await Promise.all([request('/api/register',null,data),request('/api/register',null,{...data,email:' qa-duplicate@example.invalid '})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    await assert.rejects(db.query("UPDATE users SET email=' QA-DUPLICATE@EXAMPLE.INVALID ' WHERE system_id='QA-MHO'"),e=>e.code==='ER_DUP_ENTRY');
    const lookup=await request('/api/check-email',null,{email:'qa-duplicate@example.invalid'});assert.deepEqual(await lookup.json(),{exists:true});
});
test('registry rejects markup, concurrent duplicate names and duplicate archived categories',async()=>{
    const data={name:'QA Registry Disease',classification:'Communicable',category:'morbidity'};assert.equal((await request('/api/diseases','admin',{...data,name:'<b>QA</b>'})).status,400);
    const responses=await Promise.all([request('/api/diseases','admin',data),request('/api/diseases','admin',{...data,name:' qa registry disease '})]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
    const [[row]]=await db.query("SELECT id FROM disease_registry WHERE name='QA Registry Disease'");assert.equal((await request('/api/diseases/'+row.id+'/archive','admin',{},'PUT')).status,200);
    assert.equal((await request('/api/diseases','admin',data)).status,409);assert.equal((await request('/api/diseases/'+row.id+'/restore','admin',{},'PUT')).status,200);
    const [logs]=await db.query("SELECT action,role FROM system_audit_logs WHERE user_id='QA-ADMIN' AND action IN ('Disease Archived','Disease Restored') ORDER BY id");assert.deepEqual(logs.map(r=>r.action),['Disease Archived','Disease Restored']);assert.ok(logs.every(r=>r.role==='Admin'));
    await assert.rejects(db.query("INSERT INTO disease_registry(name,classification) VALUES(' QA REGISTRY DISEASE ','Communicable')"),e=>e.code==='ER_DUP_ENTRY');
});
async function fixture(disease,date,archived=false){const [r]=await db.execute("INSERT INTO health_cases(patient_name,barangay_id,disease,date_recorded,status,severity,remarks,is_archived,encoded_by) VALUES('QA Disposable',?,?,?,'Active','Mild','Original note',?,'QA-BHW')",[barangay,disease,date,archived]);return r.insertId;}
test('status updates append follow-up notes and do not erase existing remarks',async()=>{
    caseId=await fixture('QA Followup Disease','2025-01-02');assert.equal((await request('/api/patients/'+caseId+'/status','bhw',{new_status:'Cleared',remarks:'Follow-up observation'},'PUT')).status,200);
    const [[row]]=await db.query('SELECT remarks,status FROM health_cases WHERE id=?',[caseId]);assert.match(row.remarks,/Original note/);assert.match(row.remarks,/QA-BHW.*Cleared/);assert.match(row.remarks,/Follow-up observation/);assert.equal(row.status,'Cleared');
    assert.equal((await request('/api/patients/'+caseId+'/status','bhw',{new_status:'Active',remarks:''},'PUT')).status,200);const [[again]]=await db.query('SELECT remarks FROM health_cases WHERE id=?',[caseId]);assert.equal(again.remarks,row.remarks);
});
test('failed audit writes roll back patient edits; archive/restore records the real actor role',async()=>{
    const [[old]]=await db.query('SELECT status,remarks FROM health_cases WHERE id=?',[caseId]);await db.query('RENAME TABLE system_audit_logs TO qa_audit_hold');
    try{assert.equal((await request('/api/patients/'+caseId+'/status','bhw',{new_status:'Deceased',remarks:'Must not be saved'},'PUT')).status,503);const [[now]]=await db.query('SELECT status,remarks FROM health_cases WHERE id=?',[caseId]);assert.deepEqual(now,old);}finally{await db.query('RENAME TABLE qa_audit_hold TO system_audit_logs');}
    assert.equal((await request('/api/patients/'+caseId+'/archive','bhw',{},'PUT')).status,200);assert.equal((await request('/api/patients/'+caseId+'/status','bhw',{new_status:'Active'},'PUT')).status,404);assert.equal((await request('/api/patients/'+caseId+'/restore','admin',{},'PUT')).status,200);
    const [logs]=await db.query("SELECT action,role,details FROM system_audit_logs WHERE action IN ('Record Archived','Record Restored') ORDER BY id");const linked=logs.filter(log=>require('../services/case-audit').caseIdForAudit(log)===caseId);assert.deepEqual(linked.map(r=>[r.action,r.role]),[['Record Archived','BHW'],['Record Restored','Admin']]);
});
test('account actions and their audit entry commit together with accurate Superadmin attribution',async()=>{
    assert.equal((await request('/api/admin/suspend-user','superadmin',{system_id:'QA-MHO'})).status,200);const [[log]]=await db.query("SELECT role FROM system_audit_logs WHERE user_id='QA-SUPERADMIN' ORDER BY id DESC LIMIT 1");assert.equal(log.role,'Superadmin');
    await db.query('RENAME TABLE system_audit_logs TO qa_audit_hold');try{assert.equal((await request('/api/admin/restore-suspended','superadmin',{system_id:'QA-MHO'})).status,503);const [[row]]=await db.query("SELECT status FROM users WHERE system_id='QA-MHO'");assert.equal(row.status,'suspended');}finally{await db.query('RENAME TABLE qa_audit_hold TO system_audit_logs');}
    assert.equal((await request('/api/admin/restore-suspended','superadmin',{system_id:'QA-MHO'})).status,200);
});
test('BHW and MHO encoding roll back new residents and cases when their audit cannot be saved',async()=>{
    const [[category]]=await db.query("SELECT name FROM disease_registry WHERE status='Active' AND is_archived=0 ORDER BY name LIMIT 1");
    assert.ok(category,'An active condition is required for the encoding fixture');
    const [[beforeCounts]]=await db.query('SELECT (SELECT COUNT(*) FROM residents) AS residents,(SELECT COUNT(*) FROM health_cases) AS cases');
    for(const role of ['bhw','mho']){
        const body={first_name:'QA Atomic '+role,last_name:'Encoding',birthdate:'2000-01-01',date_recorded:'2025-01-02',purok:'QA Zone',disease:category.name,severity:'Mild',barangay_id:barangay};
        const route=role==='bhw'?'/api/patients':'/api/mho/walk-in-cases';
        await db.query('RENAME TABLE system_audit_logs TO qa_encoding_audit_hold');
        try{
            const response=await request(route,role,body);
            assert.equal(response.status,503);
            assert.match((await response.json()).error,/No partial record was kept/);
            const [[afterCounts]]=await db.query('SELECT (SELECT COUNT(*) FROM residents) AS residents,(SELECT COUNT(*) FROM health_cases) AS cases');
            assert.deepEqual(afterCounts,beforeCounts,'Neither an orphan resident nor a partial case may survive');
        }finally{await db.query('RENAME TABLE qa_encoding_audit_hold TO system_audit_logs');}
    }
});
test('monthly report inputs use case date, include requested archived history and exclude other months/years',async()=>{
    const january=await fixture('QA January','2090-01-31'),archived=await fixture('QA Archived January','2090-01-05',true);const feb=await fixture('QA February','2090-02-01'),otherYear=await fixture('QA Other Year','2089-01-05');
    const response=await request('/api/patients?month=January&year=2090&include_archived=true','bhw');assert.equal(response.status,200);const data=await response.json(),rows=Array.isArray(data)?data:data.data;assert.ok(rows.some(r=>r.id===january));assert.ok(rows.some(r=>r.id===archived));assert.ok(!rows.some(r=>r.id===feb||r.id===otherYear));
    const normal=await request('/api/patients?month=January&year=2090','bhw');const normalData=await normal.json();assert.ok(!(Array.isArray(normalData)?normalData:normalData.data).some(r=>r.id===archived));
    assert.equal((await request('/api/patients?month=Wrong&year=2090','bhw')).status,400);
});
function pdfText(buffer){const binary=buffer.toString('latin1');let result='';for(const match of binary.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)){let content;try{content=zlib.inflateSync(Buffer.from(match[1],'latin1')).toString('latin1');}catch{content=match[1];}for(const hex of content.matchAll(/<([0-9a-fA-F]+)>/g))result+=Buffer.from(hex[1],'hex').toString('latin1');}return result;}
test('monthly PDF contains the selected period and registry category rather than a hardcoded category',async()=>{
    await db.query("INSERT INTO disease_registry(name,classification,category) VALUES('QA Report Mortality','Non-communicable','mortality')");await fixture('QA Report Mortality','2090-01-07');const response=await request('/api/mho/reports/fhsis?month=January&year=2090','mho');assert.equal(response.status,200);const text=pdfText(Buffer.from(await response.arrayBuffer()));assert.match(text,/January 2090/);assert.match(text,/QA Report Mortality/);assert.match(text,/Mortality/);assert.doesNotMatch(text,/QA February|QA Other Year/);
    assert.equal((await request('/api/mho/reports/fhsis?month=Wrong&year=2090','mho')).status,400);
});
test('weekly PDF uses ISO week/year boundaries and does not label an empty dataset outbreak-free',async()=>{
    await fixture('QA Week Start','2024-12-30');await fixture('QA Week End','2025-01-05');await fixture('QA Outside Week','2025-01-06');await fixture('QA Wrong Year','2024-01-01');
    const period=isoWeekPeriod('2025-W01');assert.equal(period.start,'2024-12-30');assert.equal(period.end,'2025-01-06');
    const response=await request('/api/mho/reports/pidsr?week=2025-W01','mho');assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/PIDSR_2025_Week_1/);const text=pdfText(Buffer.from(await response.arrayBuffer()));assert.match(text,/Week 1, 2025/);assert.match(text,/QA Week Start/);assert.match(text,/QA Week End/);assert.doesNotMatch(text,/QA Outside Week|QA Wrong Year/);assert.match(text,/Mild/);
    const empty=await request('/api/mho/reports/pidsr?week=1&year=2080','mho');const emptyText=pdfText(Buffer.from(await empty.arrayBuffer()));assert.match(emptyText,/Reporting completeness is not established/);assert.doesNotMatch(emptyText,/CLEAR|no outbreak/i);
    assert.equal((await request('/api/mho/reports/pidsr?week=1','mho')).status,400);
});
test('date periods reject invalid weeks and years, and forecasting rejects unknown barangays before spawning',async()=>{
    assert.deepEqual(monthlyPeriod('December','2025'),{year:2025,month:'December',start:'2025-12-01',end:'2026-01-01'});assert.deepEqual(isoWeekPeriod('2025-W01'),{year:2025,week:1,start:'2024-12-30',end:'2025-01-06'});assert.throws(()=>isoWeekPeriod('53','2025'));assert.throws(()=>isoWeekPeriod('2025-W01','2024'));assert.throws(()=>monthlyPeriod('January','2025x'));
    assert.equal((await request('/api/predict?disease=Influenza&barangay=UNKNOWN_QA_BARANGAY','mho')).status,400);
});
test('safe text helper escapes HTML delimiters and shared JavaScript files parse',()=>{
    const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/js/shared/safe-text.js'),'utf8'),sandbox);assert.equal(sandbox.window.HealthIntelText.escape('<b>"QA" & \'x\'</b>'),'&lt;b&gt;&quot;QA&quot; &amp; &#39;x&#39;&lt;/b&gt;');
    const helper=sandbox.window.HealthIntelText;
    const entry={action:'Case Corrected',details:JSON.stringify({case_id:12,before:{disease:'Old',severity:'Mild'},after:{disease:'New',severity:'High Risk'},reason:'<b>Literal reason</b>'})};
    assert.match(helper.auditDetails(entry),/Disease: Old → New/);
    assert.match(helper.escape(helper.auditDetails(entry)),/&lt;b&gt;Literal reason&lt;\/b&gt;/);
    assert.equal(helper.auditDetails({action:'Case Corrected',details:'not JSON'}),'not JSON');
    for(const file of ['shared/safe-text.js','shared/health-map.js','mho/mho-insights.js','shared/api-session.js'])new vm.Script(fs.readFileSync(path.join(__dirname,'../../assets/js',file),'utf8'),{filename:file});
});
