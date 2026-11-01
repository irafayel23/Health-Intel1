// Actual access middleware + actual route/service, with a read-only synthetic DB double.
// No sockets, local credentials, real records, database migrations or writes.
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),jwt=require('jsonwebtoken');
const {createAccessControl}=require('../middleware/access-control');
const {registerCaseRoutes}=require('../routes/case-routes');
const {createCaseMapData}=require('../services/case-map-data');
const {sessionVersion}=require('../config/security-config');

function fixture(role='bhw',assignment=2){
 const secret=crypto.randomBytes(48).toString('hex'),calls=[];
 const user={system_id:'SYNTHETIC-MAP-USER',role,status:'approved',barangay_id:assignment,password_hash:'synthetic-password-hash-only'};
 const barangays=Array.from({length:7},(_,i)=>({barangay_id:i+1,barangay_name:'Fixture barangay '+(i+1),latitude:10+i/100,longitude:123,cases:i+2,mild:i+2,monitored:0,high_risk:0,pending_classification:0}));
 const db={async query(sql){assert.match(sql,/^SELECT/);return [[]];},async execute(sql,params){
  calls.push({sql,params:[...params]});assert.match(sql.trim(),/^SELECT/,'tests never write');
  if(sql.includes('FROM users'))return [[{...user}]];
  if(sql.includes('FROM account_session_epochs')||sql.includes('FROM revoked_api_sessions'))return [[]];
  if(sql.includes('FROM barangays b')){
   const scoped=/WHERE b\.id = \?/.test(sql);assert.equal(params.length,scoped?3:2);
   return [barangays.filter(b=>!scoped||b.barangay_id===params[2]).map(b=>({...b,...(params[0]&&params[0]!=='Cough'?{cases:0,mild:0}:{})}))];
  }
  if(sql.includes('FROM health_cases h')){
   const scoped=/AND h\.barangay_id = \?/.test(sql);assert.equal(params.length,scoped?3:2);
   return [barangays.filter(b=>(!scoped||b.barangay_id===params[2])&&(!params[0]||params[0]==='Cough')).map(b=>({barangay_id:b.barangay_id,severity:'Mild',disease:'Cough',cases:b.cases}))];
  }
  throw Error('Unexpected test SQL');
 }};
 const app={get(path,handler){if(path==='/api/heatmap-data')this.heatmap=handler;},post(){},put(){}};
 registerCaseRoutes(app,db,{});
 const access=createAccessControl(db,secret);
 // Even a forged MHO claim cannot override the canonical BHW database role.
 const token=jwt.sign({system_id:user.system_id,role:'mho',password_version:sessionVersion(user.password_hash,secret)},secret,{expiresIn:'5m'});
 async function request(query={},authenticated=true){
  const req={method:'GET',path:'/heatmap-data',query,body:{},get:()=>authenticated?'Bearer '+token:undefined};
  const res={statusCode:200,status(code){this.statusCode=code;return this;},set(){return this;},json(body){this.body=body;return this;}};
  let next=false;await access(req,res,()=>{next=true;});if(next)await app.heatmap(req,res);
  return {status:res.statusCode,body:res.body,query:req.query};
 }
 return {request,calls,db};
}
test('BHW map returns only canonical assigned barangay in both totals and disease-detail queries',async()=>{
 const f=fixture();const r=await f.request();assert.equal(r.status,200);assert.equal(r.body.data.length,1);assert.equal(r.body.data[0].id,2);
 assert.equal(r.body.data[0].cases,3);assert.deepEqual(r.body.data[0].diseases_by_severity.mild,[{disease:'Cough',cases:3}]);
 const maps=f.calls.filter(c=>c.sql.includes('FROM barangays b')||c.sql.includes('FROM health_cases h'));
 assert.equal(maps.length,2);assert.ok(maps.every(c=>c.params.at(-1)===2));
 assert.ok(r.body.data.every(b=>!('patient_name' in b)&&!('resident_id' in b)));
});
test('BHW cannot spoof another barangay or bypass scope with null/empty query filters',async()=>{
 for(const query of [{barangay_id:'3'},{barangay_id:['2','3']}]){
  const f=fixture();assert.equal((await f.request(query)).status,403);assert.ok(!f.calls.some(c=>c.sql.includes('FROM barangays')));
 }
 for(const query of [{barangay_id:'null'},{barangay_id:''},{barangay_id:'2'},{}]){
  const r=await fixture().request(query);assert.equal(r.status,200);assert.deepEqual(r.body.data.map(b=>b.id),[2]);
 }
});
test('missing or invalid BHW assignments fail closed without querying municipal totals',async()=>{
 for(const assignment of [null,0,'bad',-1,1.5]){
  const f=fixture('bhw',assignment),r=await f.request();assert.equal(r.status,403);assert.ok(!f.calls.some(c=>c.sql.includes('FROM barangays')));
 }
});
test('MHO municipal heatmap keeps all seven barangays and full aggregate totals',async()=>{
 const f=fixture('mho',null),r=await f.request();assert.equal(r.status,200);assert.equal(r.body.data.length,7);
 assert.equal(r.body.data.reduce((s,b)=>s+b.cases,0),35);
 assert.ok(f.calls.filter(c=>c.sql.includes('FROM barangays')||c.sql.includes('FROM health_cases')).every(c=>c.params.length===2));
});
test('disease filter, no-active-case state and authentication remain scoped',async()=>{
 const own=await fixture().request({disease:'Cough'});assert.equal(own.body.data.length,1);assert.equal(own.body.selected_disease,'Cough');
 const zero=await fixture().request({disease:'Other catalog disease'});assert.equal(zero.body.data.length,1);assert.equal(zero.body.data[0].cases,0);assert.deepEqual(zero.body.data[0].high_risk_diseases,[]);
 assert.equal((await fixture().request({disease:'<invalid>'})).status,400);
 const anon=fixture();assert.equal((await anon.request({},false)).status,401);assert.equal(anon.calls.length,0);
});
test('map service rejects invalid scope values rather than silently returning all barangays',async()=>{
 for(const id of [0,-1,'2',undefined,NaN]){
  if(id===undefined)continue; // Omitted scope deliberately means the authorized municipal call.
  await assert.rejects(createCaseMapData({execute(){throw Error('Must not query');}}).heatmap('',id),/valid assigned barangay/);
 }
});
