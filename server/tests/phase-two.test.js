const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const mysql=require('mysql2/promise');
const fs=require('node:fs');
const crypto=require('node:crypto');
const bcrypt=require('bcrypt');
const {createDatabaseDump}=require('../database-backup');
const {createPasswordRecovery}=require('../password-recovery');
const {normalizeEmail,validPassword}=require('../security-config');
const {validatePatient}=require('../patient-validation');
const {prepare,csv}=require('../prepare-forecast-data');
const source={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};
const name='health_intel_phase2_verify_'+process.pid;
const secret=crypto.randomBytes(32).toString('hex');
const email='phase2-fixture@example.invalid';
let db,root,server,appDb,base,token,barangay,hashBefore,created=false,original;
let sent=[],failMail=false;
async function fingerprint(){ const [tables]=await root.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME',[source.database]); const all=[]; for(const t of tables){const [rows]=await root.query('SELECT * FROM `'+source.database+'`.`'+t.TABLE_NAME+'`');all.push([t.TABLE_NAME,rows.map(r=>JSON.stringify(r)).sort()]);}return crypto.createHash('sha256').update(JSON.stringify(all)).digest('hex'); }
before(async()=>{
    root=await mysql.createConnection({...source,multipleStatements:true});hashBefore=await fingerprint();
    original=await createDatabaseDump(source);
    await root.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4');created=true;
    await root.query('USE `'+name+'`');await root.query(fs.readFileSync(original.filename,'utf8'));await original.cleanup();original=null;
    db=mysql.createPool({...source,database:name});
    const [[b]]=await db.query('SELECT id FROM barangays ORDER BY id LIMIT 1');barangay=b.id;
    await db.execute("INSERT INTO users(system_id,first_name,last_name,role,barangay_id,password_hash,status,email) VALUES('PHASE2-BHW','Fixture','Only','bhw',?,?,'approved',?)",[barangay,await bcrypt.hash('Original-fixture-2026',10),email]);
    await db.execute("INSERT INTO disease_registry(name,classification,status) VALUES('Phase2 Test Disease','morbidity','Active')");
    process.env.DB_NAME=name;process.env.JWT_SECRET=secret;process.env.SMTP_SERVICE='gmail';process.env.SMTP_USER='fixture@example.invalid';process.env.SMTP_PASSWORD='not-a-real-password';
    require('nodemailer').createTransport=()=>({sendMail:async message=>{sent.push(message);if(failMail)throw new Error('mock delivery failure');return {};}});
    const app=require('../server');appDb=app.db;server=app.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
    const response=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system_id:'PHASE2-BHW',password:'Original-fixture-2026'})});assert.equal(response.status,200);token=(await response.json()).token;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(appDb)await appDb.end();if(db)await db.end();if(original)await original.cleanup();if(root){try{if(created){assert.match(name,/^health_intel_phase2_verify_\d+$/);assert.notEqual(name,source.database);await root.query('DROP DATABASE `'+name+'`');}assert.equal(await fingerprint(),hashBefore,'Production records must remain unchanged');}finally{await root.end();}}});
async function request(route,body,auth=true){return fetch(base+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function invoke(fn,body){let status=200,data;const res={status(s){status=s;return this;},json(d){data=d;return this;}};await fn({body},res);return {status,data};}
function recovery(){return createPasswordRecovery(db,secret,async m=>{sent.push(m);if(failMail)throw new Error('mock');},()=>true);}
async function issue(){await invoke(recovery().forgot,{email});return /code is (\d{6})/.exec(sent.at(-1).text)[1];}
const patient={first_name:'Disposable',last_name:'PhaseTwo',birthdate:'2000-10-01',date_recorded:'2025-09-20',purok:'Zone Test',disease:'Phase2 Test Disease',severity:'Monitored',remarks:'Literal <img src=x onerror=alert(1)> test text',age:99};

test('patient encoding stores explicit date, severity, computed age and resident link; duplicates are blocked',async()=>{
    const response=await request('/api/patients',patient);assert.equal(response.status,201,JSON.stringify(await response.clone().json()));
    const [[row]]=await db.query("SELECT *,DATE_FORMAT(date_recorded,'%Y-%m-%d') AS case_day FROM health_cases WHERE disease='Phase2 Test Disease' ORDER BY id DESC LIMIT 1");
    assert.equal(row.age,24);assert.equal(row.severity,'Monitored');assert.equal(row.case_day,'2025-09-20');assert.ok(row.resident_id);assert.equal(row.encoded_by,'PHASE2-BHW');
    assert.equal((await request('/api/patients',patient)).status,409);
    const concurrent=await Promise.all([request('/api/patients',{...patient,date_recorded:'2025-09-21'}),request('/api/patients',{...patient,date_recorded:'2025-09-21'})]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);
    const [[count]]=await db.query('SELECT COUNT(*) AS n FROM residents WHERE id=?',[row.resident_id]);assert.equal(count.n,1);
});
test('invalid dates, missing severity, archived and unknown disease names cannot become cases',async()=>{
    for(const changes of [{date_recorded:'2099-01-01'},{date_recorded:'2025-02-30'},{severity:''},{birthdate:'2026-01-01'},{disease:'Unregistered New Category'}]) assert.equal((await request('/api/patients',{...patient,...changes})).status,400);
    await db.query("UPDATE disease_registry SET status='Archived' WHERE name='Phase2 Test Disease'");
    assert.equal((await request('/api/patients',{...patient,date_recorded:'2025-09-22'})).status,400);
    const options=await request('/api/bhw/encoding-options');assert.equal(options.status,200);assert.ok(!JSON.stringify(await options.json()).includes('Phase2 Test Disease'));
    await db.query("UPDATE disease_registry SET status='Active' WHERE name='Phase2 Test Disease'");
});
test('reset codes are hashed, generic responses hide account existence, bad attempts survive new handler instances',async()=>{
    const code=await issue();const [[stored]]=await db.query('SELECT token FROM password_resets WHERE email=?',[email]);assert.match(stored.token,/^v1:[a-f0-9]{64}:0$/);assert.ok(!stored.token.includes(code));
    const missing=await invoke(recovery().forgot,{email:'nonexistent-fixture@example.invalid'});const found=await invoke(recovery().forgot,{email});assert.deepEqual(missing,found);
    const latest=/code is (\d{6})/.exec(sent.at(-1).text)[1];const wrong=latest==='111111'?'222222':'111111';
    for(let i=0;i<5;i++)assert.equal((await invoke(recovery().reset,{email,token:wrong,new_password:'New-fixture-pass-2026'})).status,400);
    assert.equal((await invoke(recovery().reset,{email,token:latest,new_password:'New-fixture-pass-2026'})).status,400);
    const [[remaining]]=await db.query('SELECT COUNT(*) AS n FROM password_resets WHERE email=?',[email]);assert.equal(remaining.n,0);
});
test('expired and superseded codes fail; weak passwords fail; concurrent correct resets have one winner',async()=>{
    const old=await issue();await db.query('UPDATE password_resets SET expires_at=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE email=?',[email]);assert.equal((await invoke(recovery().reset,{email,token:old,new_password:'New-fixture-pass-2026'})).status,400);
    const replacement=await issue();assert.notEqual(replacement.length,0);
    assert.equal((await invoke(recovery().reset,{email,token:replacement,new_password:'short'})).status,400);
    const outcomes=await Promise.all([invoke(recovery().reset,{email,token:replacement,new_password:'New-fixture-pass-2026'}),invoke(recovery().reset,{email,token:replacement,new_password:'New-fixture-pass-2026'})]);assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,400]);
    assert.equal((await request('/api/session')).status,401,'Old login must be revoked');
    const fresh=await request('/api/login',{system_id:'PHASE2-BHW',password:'New-fixture-pass-2026'},false);assert.equal(fresh.status,200);token=(await fresh.json()).token;assert.equal((await request('/api/session')).status,200);
});
test('public recovery routes use mock mail, single-use codes and per-address request limits',async()=>{
    sent=[];const forgot=await request('/api/forgot-password',{email},false);assert.equal(forgot.status,200);const code=/code is (\d{6})/.exec(sent.at(-1).text)[1];
    const result=await request('/api/reset-password',{email,token:code,new_password:'HTTP-fixture-pass-2026'},false);assert.equal(result.status,200);assert.equal((await request('/api/reset-password',{email,token:code,new_password:'HTTP-fixture-pass-2026'},false)).status,400);
    for(let i=0;i<3;i++)assert.equal((await request('/api/forgot-password',{email:'limit-fixture@example.invalid'},false)).status,200);
    assert.equal((await request('/api/forgot-password',{email:'limit-fixture@example.invalid'},false)).status,429);
});
test('failed email delivery removes its new code without claiming an email was sent',async()=>{
    failMail=true;try{const result=await invoke(recovery().forgot,{email});assert.equal(result.status,200);assert.match(result.data.message,/If this email/);const [[remaining]]=await db.query('SELECT COUNT(*) AS n FROM password_resets WHERE email=?',[email]);assert.equal(remaining.n,0);}finally{failMail=false;}
});
test('email injection and bcrypt truncation are rejected; age validation handles birthdays',()=>{
    assert.equal(normalizeEmail('  NAME@Example.com '),'name@example.com');for(const invalid of ['one@example.com,two@example.com','a\r\nBcc:x@example.com','a@-bad.example'])assert.equal(normalizeEmail(invalid),null);
    assert.ok(validPassword('12345678'));assert.ok(!validPassword('é'.repeat(37)));assert.equal(validatePatient(patient).age,24);assert.throws(()=>validatePatient({...patient,birthdate:'2025-09-21'}),/Birthdate/);
});
test('CSV preparation keeps provenance and missing reports, holds duplicates and unmapped diseases, excludes injuries',()=>{
    const opts={barangays:['Blumentritt'],registry:[{name:'Dengue Fever',status:'Active'}],sourceType:'synthetic',sourceReference:'fixture batch',today:'2026-09-27'};
    const row={Date:'2023-01',Barangay:'Blumentritt',Disease:'Dengue Fever',Cases:'3',ReportingStatus:'complete'};
    const result=prepare([row,{...row,Date:'2023-03',Cases:'0'},{...row,Date:'2023-04',Disease:'Dog bite'},{...row,Date:'2023-05',Disease:'Dengue'}],opts);
    assert.equal(result.prepared.length,2);assert.equal(result.coverage[1].Cases,'');assert.equal(result.coverage[2].Cases,0);assert.equal(result.review.length,2);assert.equal(result.metadata.eligibleForRealDataEvaluation,false);
    assert.equal(prepare([row,row],opts).prepared.length,0);
    assert.throws(()=>prepare([row],{...opts,sourceType:''}),/Specify/);
    const aliases=[{OriginalName:'Dengue',CanonicalName:'Dengue Fever',Decision:'approved',Reviewer:'MHO reviewer',ReviewDate:'2026-09-01'}];
    assert.equal(prepare([{...row,Disease:'Dengue'}],{...opts,aliases}).prepared[0].Disease,'Dengue Fever');assert.throws(()=>prepare([row],{...opts,aliases:[{...aliases[0],Reviewer:''}]}),/reviewer/);
    assert.match(csv([{Disease:'=HYPERLINK("bad")'}],['Disease']),/\'=HYPERLINK/);
});
