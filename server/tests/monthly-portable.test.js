const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=process.env.HEALTH_INTEL_QA_REPO||path.resolve(__dirname,'../..');
const D=require(path.join(root,'server/services/monthly-data'));
const {createMonthlyPredictions,probeWorker}=require(path.join(root,'server/services/monthly-predictions'));
const {registerMonthlyPredictionRoutes}=require(path.join(root,'server/routes/monthly-prediction-routes'));
const snapshot=require(path.join(root,'server/data/seasonal-sarima-6200/snapshot.json'));
const frozen=require(path.join(root,'server/forecasting/policy-a/source-manifest.json'));
const {createConditionalCmp}=require(path.join(root,'server/services/conditional-pooled-cmp'));
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hi-monthly-publication-QA-')),id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',bad='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 const input={mode:'operational',start:'2023-01',cutoff:'2026-09',target:'2026-10',policy_sha256:D.hash(frozen),scopes:snapshot.scopes.map(s=>({disease:s.disease,barangay:s.barangay,history:s.history}))};
 const output={input_sha256:D.hash(input),policy_sha256:D.hash(frozen),scopes:snapshot.scopes};
 const row={id,status:'published',input_hash:D.hash(input),output_hash:D.hash(output)},failed={id:bad,status:'running',worker_pid:null};
 fs.mkdirSync(path.join(dir,id));fs.writeFileSync(path.join(dir,id,'input.json'),JSON.stringify(input));fs.writeFileSync(path.join(dir,id,'output.json'),JSON.stringify(output));
 fs.mkdirSync(path.join(dir,bad));fs.writeFileSync(path.join(dir,bad,'progress.json'),JSON.stringify({state:'failed'}));
 const writes=[],db={async query(sql){if(sql.includes('prediction_publications'))return [[{run_id:id}]];if(sql.includes('prediction_runs'))return [[row,failed]];throw Error('Unexpected query');},async execute(sql,args){if(sql.startsWith('SELECT * FROM prediction_runs'))return [[args[0]===id?row:failed]];if(sql.startsWith('SELECT name FROM barangays'))return [[{name:'Salvacion'}]];if(sql.startsWith('UPDATE prediction_runs')){writes.push(sql);failed.status='failed';return [];}throw Error('Unconfirmed reports unavailable');}};
 const s=createMonthlyPredictions(db,{directory:dir,probe:async()=>({ready:true}),now:()=>new Date('2026-11-12')});
 return {dir,id,bad,db,s,row,writes,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('failed preparation and incomplete worker cannot replace published pointer',async()=>{const f=fixture();try{assert.equal((await f.s.review(f.bad)).run.status,'failed');await assert.rejects(f.s.publish({run_id:f.bad,acknowledged:false},{}),/approve/);assert.equal((await f.s.publicationStatus()).publication.run_id,f.id);assert(f.writes.every(s=>!s.includes('prediction_publications')));}finally{f.cleanup();}});
test('preflight failure returns actionable error before touching database',async()=>{const s=createMonthlyPredictions({},{probe:async()=>({ready:false,message:'Insufficient available memory: need at least 1024 MiB'})});await assert.rejects(s.start({},{}),/1024/);});
test('missing executable is detected without a shell or database access',async()=>{const r=await probeWorker(path.join(os.tmpdir(),'missing-health-intel-python-QA'));assert.equal(r.ready,false);assert.match(r.message,/not found/);});
test('operational result cannot acquire frozen demonstration COM-Poisson attachment',async()=>{const f=fixture();try{const result=await f.s.forecast({disease:'Cough',barangay:'Salvacion'}),cmp=createConditionalCmp({env:{HOST:'127.0.0.1',NODE_ENV:'test',ENABLE_EXPERIMENTAL_CMP:'true'}});assert.equal(cmp.augment(result).experimental_probability.status,'unavailable');assert.equal(result.provenance.version,f.id);}finally{f.cleanup();}});
test('MHO and BHW read identical version and mean; BHW cannot select another barangay',async()=>{const f=fixture();try{const routes=new Map();registerMonthlyPredictionRoutes({get:(p,h)=>routes.set(p,h),post(){}},f.db,f.s);async function request(url,role,query={}){let status=200,body;await routes.get(url)({user:{role,barangay_id:1},query},{set(){return this;},status(s){status=s;return this;},json(b){body=b;return this;}});return {status,body};}
 const b=await request('/api/bhw/operational-predictions/prediction','bhw',{disease:'Cough'}),m=await f.s.forecast({disease:'Cough',barangay:'Salvacion'});assert.equal(b.status,200);assert.equal(b.body.data.provenance.version,m.provenance.version);assert.equal(b.body.data.view.production['1'].prediction,m.view.production['1'].prediction);
 assert.equal((await request('/api/bhw/operational-predictions/prediction','bhw',{disease:'Cough',barangay:'Caliban'})).status,400);
 for(const role of ['mho','admin','superadmin'])assert.equal((await request('/api/bhw/operational-predictions/options',role)).status,403);
 const o=await request('/api/bhw/operational-predictions/options','bhw');assert.deepEqual(o.body.data.barangays,['Salvacion']);assert.equal(o.body.data.experimental_probability_enabled,undefined);assert.equal(o.body.data.overall,undefined);assert.equal(o.body.data.context.cases,undefined);assert.equal(b.body.data.overall,undefined);assert.equal(b.body.data.context.cases,undefined);
 }finally{f.cleanup();}});

test('ordinary prediction reads reject an unpublished or failed row even if referenced by the publication pointer',async()=>{
 const f=fixture();
 try{
  for(const status of ['ready','running','failed']){
   f.row.status=status;
   await assert.rejects(f.s.options(),/publication is unavailable/);
   await assert.rejects(f.s.forecast({disease:'Cough',barangay:'Salvacion'}),/publication is unavailable/);
  }
 }finally{f.cleanup();}
});
