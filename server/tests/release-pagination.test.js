const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pagination,pageResult}=require('../services/list-pagination');
const {residentDirectory}=require('../services/resident-directory');
test('pagination rejects invalid types, limits size and clamps empty and far pages',()=>{
 for(const value of ['0','-1','1.5','abc','1e3',[],{},'9007199254740992'])assert.throws(()=>pagination({page:value}));
 for(const size of ['0','101','999999',{}])assert.throws(()=>pagination({page_size:size}));
 assert.deepEqual(pageResult(0,pagination({page:'50'})),{total:0,page:1,page_count:1,page_size:25,offset:0});
 assert.equal(pageResult(100001,pagination({page:'999999',page_size:'100'})).offset,100000);
});
test('resident SQL scopes count and page identically, escapes search, sorts ties by ID',async()=>{
 const calls=[],db={async execute(sql,p){calls.push({sql,p});return sql.startsWith('SELECT COUNT')?[[{total:25}]]:[[{id:13}]];}};
 const result=await residentDirectory(db,{role:'bhw',barangay_id:4},{page:'2',q:'A%_!',purok:' Zone 1 ',age_group:'adult'});
 assert.equal(result.page_count,3);assert.equal(result.data[0].id,13);assert.match(calls[1].sql,/ORDER BY r.last_name,r.first_name,r.id LIMIT 12 OFFSET 12$/);
 assert.deepEqual(calls[0].p,[4,'%A!%!_!!%','zone 1',18,59]);assert.deepEqual(calls[0].p,calls[1].p);
 for(const role of ['superadmin',undefined])await assert.rejects(()=>residentDirectory(db,{role},{}),e=>e.status===403);
 await assert.rejects(()=>residentDirectory(db,{role:'bhw',barangay_id:4},{barangay_id:'5'}),e=>e.status===403);
 await assert.rejects(()=>residentDirectory(db,{role:'bhw'},{}),e=>e.status===403);
 await assert.rejects(()=>residentDirectory(db,{role:'mho'},{age_group:'invalid'}));
});
test('MHO optional page size preserves default 25 and caps at 100',async()=>{
 const {createMhoPatients}=require('../services/mho-patients');let sql;
 const db={async execute(q){sql=q;return q.startsWith('SELECT COUNT')?[[{total:1000}]]:[[]];}};
 const list=createMhoPatients(db);assert.equal((await list.list({})).page_size,25);assert.match(sql,/LIMIT 25 OFFSET 0/);
 assert.equal((await list.list({page:'2',page_size:'100'})).page_count,10);assert.match(sql,/LIMIT 100 OFFSET 100/);
 await assert.rejects(()=>list.list({page_size:'101'}));
});
test('readiness reports failures safely, keeps liveness independent, times out and coalesces',async()=>{
 const {registerReadiness}=require('../services/readiness');let handler,calls=0;const app={get(route,fn){assert.equal(route,'/readyz');handler=fn;}};
 const response=()=>({set(){return this;},status(value){this.code=value;return this;},json(value){this.body=value;return this;}});
 registerReadiness(app,{rawDatabase:{query:async()=>{calls++;await new Promise(r=>setTimeout(r,5));}},schemaReady:async()=>true,execute:async()=>[[]]},{assets:()=>true});
 const a=response(),b=response();await Promise.all([handler({},a),handler({},b)]);assert.equal(calls,1);assert.equal(a.code,200);
 registerReadiness(app,{rawDatabase:{query:async()=>{throw Error('password patient-name private/path');}}},{assets:()=>true});const failed=response();await handler({},failed);assert.equal(failed.code,503);assert.doesNotMatch(JSON.stringify(failed.body),/password|patient|path/);
 registerReadiness(app,{rawDatabase:{query:()=>new Promise(()=>{})}},{timeout:5,assets:()=>false});const timeout=response();await handler({},timeout);assert.equal(timeout.code,503);
});
test('release manifest hashes bytes, blocks secret/traversal paths and flags Azure divergence',()=>{
 const {sha,manifest,safeFile}=require('../scripts/release-verification');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hi-release-'));
 try{const local=path.join(dir,'local'),azure=path.join(dir,'azure');for(const p of [local,azure])fs.mkdirSync(path.join(p,'server'),{recursive:true});fs.writeFileSync(path.join(local,'server/server.js'),'new');fs.writeFileSync(path.join(azure,'server/server.js'),'azure fix');
  assert.equal(manifest(local,['server/server.js'])[0].sha256,sha(Buffer.from('new')));
  assert.equal(manifest(local,['server/server.js'],{deployedRoot:azure})[0].status,'reconciliation-required');
  assert.equal(manifest(local,['server/server.js'],{deployedRoot:azure,previous:{'server/server.js':sha(Buffer.from('azure fix'))}})[0].status,'reviewed-baseline-change');
  for(const p of ['../server/server.js','server/.env','server/data/patients.json','server/package.json/../server.js'])assert.throws(()=>safeFile(local,p));
 }finally{assert.ok(path.basename(dir).startsWith('hi-release-'));fs.rmSync(dir,{recursive:true});}
});

test('canonical middleware denies anonymous and wrong-role lists and scopes BHW metadata',async()=>{
 const crypto=require('node:crypto'),jwt=require('jsonwebtoken'),{sessionVersion}=require('../config/security-config'),{createAccessControl}=require('../middleware/access-control'),{registerCaseRoutes}=require('../routes/case-routes');
 for(const role of ['bhw','mho','admin','superadmin']){
  const user={system_id:'FIXTURE',role,status:'approved',barangay_id:2,password_hash:'fixture'},secret=crypto.randomBytes(48).toString('hex'),calls=[];
  const db={async query(sql){assert.match(sql,/^SELECT/);return [[]];},async execute(sql,params=[]){calls.push({sql,params});if(sql.includes('FROM users'))return [[{...user}]];if(sql.includes('account_session_epochs')||sql.includes('revoked_api_sessions'))return [[]];if(sql.startsWith('SELECT COUNT'))return [[{total:0}]];return [[]];}};
  const handlers={},app={get(route,fn){handlers[route]=fn;},post(){},put(){}};registerCaseRoutes(app,db,{});
  const token=jwt.sign({system_id:user.system_id,role:'mho',password_version:sessionVersion(user.password_hash,secret)},secret,{expiresIn:'5m'}),access=createAccessControl(db,secret);
  async function request(route,query={},authenticated=true){const req={method:'GET',path:route,query,body:{},get:()=>authenticated?'Bearer '+token:undefined},res={statusCode:200,set(){return this;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};let allowed=false;await access(req,res,()=>{allowed=true;});if(allowed)await handlers['/api'+route](req,res);return res;}
  for(const route of ['/residents','/patients','/patients/archived']){
   assert.equal((await request(route,{page:'1'})).statusCode,['bhw','admin'].includes(role)?200:403);
   assert.equal((await request(route,{page:'1'},false)).statusCode,401);
   if(role==='bhw'){assert.equal((await request(route,{page:'1',barangay_id:'3'})).statusCode,403);const counts=calls.filter(c=>c.sql.startsWith('SELECT COUNT'));assert.ok(counts.every(c=>c.params.includes(2)));}
  }
 }
});

