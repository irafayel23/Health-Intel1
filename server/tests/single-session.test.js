const {test,before,beforeEach,afterEach,after}=require('node:test');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),mysql=require('mysql2/promise'),express=require('express'),bcrypt=require('bcrypt'),jwt=require('jsonwebtoken');
const {registerAuthRoutes}=require('../routes/auth-routes');
const {createAccessControl}=require('../middleware/access-control');
const {migrateSessionSecurity,tokenHash}=require('../services/session-security');
const {migrateLoginThrottle}=require('../services/login-throttle');
const {sessionVersion}=require('../config/security-config');
const name='health_intel_single_session_verify_'+process.pid+'_'+crypto.randomBytes(4).toString('hex');
const password='Disposable-session-only-2026',secret=crypto.randomBytes(48).toString('hex');
let root,db,server,base,passwordHash,writes,inFlight,entered,created=false;
before(async()=>{
 root=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''});
 await root.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4');created=true;
 db=mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:name,connectionLimit:6});
 await db.query('CREATE TABLE users(system_id VARCHAR(50) PRIMARY KEY,role VARCHAR(20),status VARCHAR(20),barangay_id INT,password_hash VARCHAR(100)) ENGINE=InnoDB');
 await db.query('CREATE TABLE system_audit_logs(id INT AUTO_INCREMENT PRIMARY KEY,user_id VARCHAR(50),role VARCHAR(30),action VARCHAR(50),details TEXT) ENGINE=InnoDB');
 passwordHash=await bcrypt.hash(password,10);
 for(const role of ['bhw','mho','admin','superadmin'])await db.execute("INSERT INTO users VALUES(?,?,'approved',1,?)",['SESSION-'+role.toUpperCase(),role,passwordHash]);
 await migrateSessionSecurity(db);await migrateSessionSecurity(db);await migrateLoginThrottle(db);
});
beforeEach(async()=>{
 for(const table of ['account_active_sessions','account_session_epochs','revoked_api_sessions','login_attempt_limits','system_audit_logs'])await db.query('DELETE FROM '+table);
 writes=0;inFlight=null;entered=null;
 const app=express();app.use(express.json());app.use('/api',createAccessControl(db,secret));
 app.get('/api/session',(req,res)=>res.json({success:true,user:req.user}));
 app.post('/api/patients',async(req,res)=>{if(entered)entered();if(inFlight)await inFlight;writes++;res.status(201).json({success:true});});
 registerAuthRoutes(app,db,secret);server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
afterEach(async()=>{if(server)await new Promise(r=>server.close(r));server=null;});
after(async()=>{if(db)await db.end();try{if(created){assert.match(name,/^health_intel_single_session_verify_\d+_[a-f0-9]{8}$/);await root.query('DROP DATABASE `'+name+'`');}}finally{if(root)await root.end();}});
async function login(extra={},token,role='bhw'){
 const headers={'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(base+'/api/login',{method:'POST',headers,body:JSON.stringify({system_id:'SESSION-'+role.toUpperCase(),password,...extra})});
 return {status:response.status,...await response.json()};
}
async function request(token,method='GET',url='/api/session'){
 const response=await fetch(base+url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});return {status:response.status,...await response.json()};
}
const confirm=challenge=>({replace_existing:true,takeover_token:challenge.takeover_token});

for(const role of ['bhw','mho','admin','superadmin'])test(role+': conflict needs verified consent; same-browser tabs reuse the session',async()=>{
 const a=await login({},null,role);assert.equal(a.status,200);
 const same=await login({},a.token,role);assert.equal(same.status,200);assert.ok(same.token===a.token);
 const conflict=await login({},null,role);assert.equal(conflict.status,409);assert.equal(conflict.code,'SESSION_CONFLICT');assert.ok(!conflict.token);
 assert.equal((await request(a.token)).status,200,'Cancel/inaction must leave original session usable');
 const b=await login(confirm(conflict),null,role);assert.equal(b.status,200);assert.ok(b.token!==a.token);
 assert.equal((await request(a.token)).status,401);assert.equal((await request(b.token)).status,200);
});
test('replaced BHW session cannot read or create a new patient; new session retains scope',async()=>{
 const a=await login(),challenge=await login(),b=await login(confirm(challenge));
 assert.equal((await request(a.token)).status,401);assert.equal((await request(a.token,'POST','/api/patients')).status,401);assert.equal(writes,0);
 const current=await request(b.token);assert.equal(current.user.barangay_id,1);assert.equal(current.user.system_id,'SESSION-BHW');
 assert.equal((await request(b.token,'POST','/api/patients')).status,201);assert.equal(writes,1);
});
test('wrong credentials reveal no conflict or challenge; forged consent cannot replace',async()=>{
 const a=await login();const wrong=await login({password:'Wrong-disposable-password'});assert.equal(wrong.status,401);assert.ok(!wrong.takeover_token);
 const forged=await login({replace_existing:true,takeover_token:'forged'});assert.equal(forged.status,409);assert.ok(!forged.token);assert.equal((await request(a.token)).status,200);
});
test('takeover challenge is not an API token, and cannot be transferred to another account',async()=>{
 const a=await login(),challenge=await login();assert.equal((await request(challenge.takeover_token)).status,401);
 const other=await login({},null,'mho');assert.equal(other.status,200);
 const wrong=await login(confirm(challenge),null,'mho');assert.equal(wrong.status,409);assert.ok(!wrong.token);assert.equal((await request(other.token)).status,200);assert.equal((await request(a.token)).status,200);
});
test('expired consent requires a new warning; active session survives',async()=>{
 const a=await login(),challenge=await login(),claims=jwt.decode(challenge.takeover_token);delete claims.iat;delete claims.exp;
 const expired=jwt.sign(claims,secret,{algorithm:'HS256',expiresIn:-1});
 const result=await login({replace_existing:true,takeover_token:expired});assert.equal(result.status,409);assert.ok(!result.token);assert.equal((await request(a.token)).status,200);
});
test('simultaneous initial sign-ins create only one active session',async()=>{
 const results=await Promise.all([login(),login()]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const [[count]]=await db.query('SELECT COUNT(*) n FROM account_active_sessions');assert.equal(count.n,1);
});
test('simultaneous confirmed takeovers cannot use consent for a newer session',async()=>{
 const a=await login(),c=await login();const results=await Promise.all([login(confirm(c)),login(confirm(c))]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const winner=results.find(r=>r.status===200);
 assert.equal((await request(a.token)).status,401);assert.equal((await request(winner.token)).status,200);
 assert.equal((await login(confirm(c))).status,409,'Replayed consent must not invalidate the winner');
});
test('sign-out frees the slot; an obsolete logout cannot sign out the replacement',async()=>{
 const a=await login(),c=await login(),b=await login(confirm(c));
 assert.equal((await request(a.token,'POST','/api/logout')).status,401);assert.equal((await request(b.token)).status,200);
 assert.equal((await request(b.token,'POST','/api/logout')).status,200);assert.equal((await request(b.token)).status,401);
 assert.equal((await login()).status,200);
});
test('expired registry entries do not block a new sign-in',async()=>{
 const a=await login();await db.execute('UPDATE account_active_sessions SET expires_at=UNIX_TIMESTAMP()-1 WHERE system_id=?',['SESSION-BHW']);
 const b=await login();assert.equal(b.status,200);assert.equal((await request(a.token)).status,401);assert.equal((await request(b.token)).status,200);
});
test('registry persists across a new access-control service and pool',async()=>{
 const a=await login(),c=await login(),b=await login(confirm(c));
 const second=mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:name});
 const app=express();app.use('/api',createAccessControl(second,secret));app.get('/api/session',(req,res)=>res.json({success:true}));const fresh=app.listen(0,'127.0.0.1');await new Promise(r=>fresh.once('listening',r));
 try{const url='http://127.0.0.1:'+fresh.address().port+'/api/session';assert.equal((await fetch(url,{headers:{Authorization:'Bearer '+a.token}})).status,401);assert.equal((await fetch(url,{headers:{Authorization:'Bearer '+b.token}})).status,200);}finally{await new Promise(r=>fresh.close(r));await second.end();}
});
test('audit failure rolls back the takeover and does not invalidate the old session',async()=>{
 const a=await login(),c=await login();await db.query('RENAME TABLE system_audit_logs TO session_audit_hold');
 try{const error=console.error;console.error=()=>{};try{const b=await login(confirm(c));assert.equal(b.status,500);assert.ok(!b.token);}finally{console.error=error;}
 assert.equal((await request(a.token)).status,200);}finally{await db.query('RENAME TABLE session_audit_hold TO system_audit_logs');}
});
test('audit and registry contain hashes/fixed metadata, never passwords, raw tokens or challenges',async()=>{
 const a=await login(),c=await login(),b=await login(confirm(c));const [rows]=await db.query('SELECT action,details FROM system_audit_logs');
 assert.ok(rows.some(r=>r.action==='Concurrent Sign-in Detected'));assert.ok(rows.some(r=>r.action==='Session Replaced'));
 const saved=JSON.stringify(rows);for(const sensitive of [password,a.token,b.token,c.takeover_token])assert.ok(!saved.includes(sensitive));
 const [[active]]=await db.query('SELECT token_hash FROM account_active_sessions');assert.equal(active.token_hash,tokenHash(b.token));
});
test('save authorized before takeover may finish once; subsequent old-session saves are blocked',async()=>{
 const a=await login();let release,start;inFlight=new Promise(r=>release=r);const started=new Promise(r=>start=r);entered=start;
 const saving=request(a.token,'POST','/api/patients');await started;
 const c=await login(),b=await login(confirm(c));assert.equal(b.status,200);release();assert.equal((await saving).status,201);
 inFlight=null;entered=null;assert.equal((await request(a.token,'POST','/api/patients')).status,401);assert.equal(writes,1);
});
test('first tracked sign-in retires older untracked tokens without changing patient information',async()=>{
 const legacy=jwt.sign({system_id:'SESSION-BHW',role:'bhw',session_epoch:0,password_version:sessionVersion(passwordHash,secret)},secret,{expiresIn:'8h'});
 assert.equal((await request(legacy)).status,200);const a=await login();assert.equal(a.status,200);assert.equal((await request(legacy)).status,401);
});

test('ended-session reason distinguishes a confirmed other sign-in from logout',async()=>{
 const a=await login(),c=await login(),b=await login(confirm(c));
 assert.equal((await request(a.token)).reason,'OTHER_SIGN_IN');
 await request(b.token,'POST','/api/logout');
 assert.equal((await request(b.token)).reason,undefined);
});


test('BHW and Admin accounts remain independent during sign-in and BHW takeover',async()=>{
 const bhw=await login({},null,'bhw'),admin=await login({},null,'admin');
 assert.equal(bhw.status,200);assert.equal(admin.status,200);
 assert.equal((await request(bhw.token)).status,200);assert.equal((await request(admin.token)).status,200);
 const conflict=await login({},null,'bhw');assert.equal(conflict.code,'SESSION_CONFLICT');
 const replacement=await login(confirm(conflict),null,'bhw');assert.equal(replacement.status,200);
 assert.equal((await request(bhw.token)).status,401);assert.equal((await request(replacement.token)).status,200);
 assert.equal((await request(admin.token)).status,200);
});

test('a revoked token left in the active registry does not trigger a conflict', async () => {
 const first=await login();assert.equal(first.status,200);
 await db.execute('INSERT INTO revoked_api_sessions(token_hash,expires_at) VALUES (?,?)',[tokenHash(first.token),jwt.decode(first.token).exp]);
 assert.equal((await request(first.token)).status,401);
 const next=await login({},first.token);assert.equal(next.status,200);
 assert.notEqual(next.token,first.token);
 assert.equal((await request(next.token)).status,200);
});
