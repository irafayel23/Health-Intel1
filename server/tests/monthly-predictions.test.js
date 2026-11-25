// Disposable integration fixtures only. Saved demonstration outputs below test adapters, not new measured fits.
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),mysql=require('mysql2/promise'),{EventEmitter}=require('node:events');
const D=require('../services/monthly-data'),{migrateMonthlyPredictions,createMonthlyPredictions}=require('../services/monthly-predictions');
const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/seasonal-sarima-6200/snapshot.json'))),engine=path.join(__dirname,'../forecasting/policy-a');
const policyHash=D.hash(JSON.parse(fs.readFileSync(path.join(engine,'source-manifest.json'))));
function input(){return {mode:'operational',start:'2023-01',cutoff:'2026-09',target:'2026-10',policy_sha256:policyHash,scopes:snapshot.scopes.map(s=>({disease:s.disease,barangay:s.barangay,history:s.history}))};}
function output(i){return {input_sha256:D.hash(i),policy_sha256:policyHash,scopes:snapshot.scopes.map(s=>({disease:s.disease,barangay:s.barangay,history:s.history,outputs:s.outputs}))};}
test('Philippine month boundary, closed months and range limits are explicit',()=>{assert.equal(D.currentMonth(new Date('2026-10-31T16:00:00Z')),'2026-11');assert.equal(D.next('2026-12'),'2027-01');assert.throws(()=>D.closed('2026-11',new Date('2026-11-05')),/completed/);assert.throws(()=>D.months('2020-01','2031-01'),/120/);assert.throws(()=>D.month('2026-00'));});
test('monthly counts ignore archive state and use explicit reporting exclusions',()=>{
 const cases=[{id:1,barangay:'Salvacion',disease:'Cough',date_recorded:'2026-09-01'},{id:2,barangay:'Salvacion',disease:'Cough',date_recorded:'2026-09-02',is_archived:1,deleted_at:'2026-10-01'},{id:3,barangay:'Salvacion',disease:'Cough',reporting_excluded:1},{id:4,barangay:'Salvacion',disease:'Cough',disease_review_status:'Pending'}];
 const summary=D.summarize(cases,'Salvacion');
 assert.equal(summary.counts.Cough,2);
 assert.equal(summary.pending,1);
 assert.equal(summary.digest,D.summarize(cases.map(c=>({...c,is_archived:0,deleted_at:null})),'Salvacion').digest);
 assert.notEqual(summary.digest,D.summarize(cases.map(c=>({...c,reporting_excluded:0})),'Salvacion').digest);
});
test('frozen-output adapter independently recalculates all70 metrics and preserves missing attempts',()=>{const i=input(),v=D.validateOutput(i,output(i));assert.equal(v.available,70);assert.equal(v.overall['80_20']['1'].within_tolerance_hits,563);assert.equal(v.overall['80_20']['1'].available,626);assert.equal(v.overall['80_20']['1'].attempted,630);assert.equal(v.overall['70_30']['1'].attempted,980);assert.equal(Object.keys(v.views).length,70);});
test('changed input, target dates, training prefixes, seasonal diagnostics and duplicate histories fail closed',()=>{for(const mutate of [o=>o.input_sha256='bad',o=>o.scopes[0].outputs[0].target='2026-11',o=>o.scopes[0].outputs[0].training_digest='bad',o=>{const r=o.scopes.flatMap(s=>s.outputs).find(r=>r.sarima.usable);r.sarima.minimum_finite_root=.99;}]){const i=input(),o=structuredClone(output(i));mutate(o);assert.throws(()=>D.validateOutput(i,o));}const i=input();i.scopes[0]=i.scopes[1];assert.throws(()=>D.validateInput(i));});
test('prediction management belongs to Admin and published predictions stay available to MHO',()=>{const {rules}=require('../middleware/access-control');for(const [method,url,role]of [['GET','/admin/operational-predictions/status','admin'],['POST','/admin/operational-predictions/reports','admin'],['POST','/admin/operational-predictions/publish','admin'],['POST','/admin/operational-predictions/runs/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/probability','admin'],['GET','/mho/operational-predictions/prediction','mho']]){const r=rules.find(([m,re])=>method===m&&re.test(url));assert.deepEqual(r[2],[role]);}});
const name='health_intel_monthly_verify_'+process.pid+'_'+crypto.randomBytes(4).toString('hex'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'health-intel-monthly-'));let admin,db,created=false,clock=new Date('2026-10-02T00:00:00Z');
before(async()=>{admin=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''});await admin.query('CREATE DATABASE `'+name+'`');created=true;db=mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:name,connectionLimit:4});await db.query('CREATE TABLE barangays(id INT PRIMARY KEY,name VARCHAR(100))');await db.query('CREATE TABLE disease_registry(id INT PRIMARY KEY,name VARCHAR(100))');await db.query('CREATE TABLE health_cases(id INT AUTO_INCREMENT PRIMARY KEY,date_recorded DATE,disease VARCHAR(100),disease_id INT,barangay_id INT,disease_review_status VARCHAR(30),is_archived BOOLEAN DEFAULT FALSE,deleted_at DATETIME NULL)');await db.query('CREATE TABLE case_visits(id INT PRIMARY KEY,case_id INT)');await db.query('CREATE TABLE system_audit_logs(id INT AUTO_INCREMENT PRIMARY KEY,user_id VARCHAR(50),role VARCHAR(30),action VARCHAR(100),details TEXT)');await db.query('CREATE INDEX qa_audit_action ON system_audit_logs(action)');await db.query('CREATE INDEX qa_case_period ON health_cases(date_recorded,barangay_id)');await migrateMonthlyPredictions(db);await migrateMonthlyPredictions(db);for(let i=0;i<7;i++)await db.execute('INSERT INTO barangays VALUES(?,?)',[i+1,D.BARANGAYS[i]]);for(let i=0;i<10;i++)await db.execute('INSERT INTO disease_registry VALUES(?,?)',[i+1,D.DISEASES[i]]);const values=[];for(const s of snapshot.scopes)for(let m=0;m<45;m++)for(let n=0;n<s.history[m];n++)values.push([snapshot.dates[m]+'-15',s.disease,D.DISEASES.indexOf(s.disease)+1,D.BARANGAYS.indexOf(s.barangay)+1,'Recorded']);await db.query('INSERT INTO health_cases(date_recorded,disease,disease_id,barangay_id,disease_review_status) VALUES ?',[values]);await db.query('INSERT INTO case_visits VALUES(1,1),(2,1)');});
after(async()=>{if(db)await db.end();if(admin){if(created){assert.match(name,/^health_intel_monthly_verify_\d+_[a-f0-9]{8}$/);await admin.query('DROP DATABASE `'+name+'`');}await admin.end();}assert.ok(directory.startsWith(os.tmpdir()));fs.rmSync(directory,{recursive:true,force:true});});
test('dataset-backed forecast reads October confirmations and preserves the operational publication',async()=>{
 const user={system_id:'MHO-FIXTURE',role:'mho'};
 let inputRead;
 const service=createMonthlyPredictions(db,{directory,python:process.execPath,now:()=>new Date('2026-11-03T00:00:00Z'),probe:async()=>({ready:true}),launch:(_python,args)=>{
  inputRead=JSON.parse(fs.readFileSync(args[4]));
  const scopes=inputRead.scopes.map((scope,index)=>{
   const old=snapshot.scopes[index].outputs,latest=old.at(-1);
   return {...scope,outputs:[
    ...old.slice(0,-1),{...latest,actual:scope.history[45]},
    {...latest,n:46,target:'2026-11',actual:null,training_digest:D.hash(scope.history),sarima:{...latest.sarima,input_n:46}}
   ]};
  });
  fs.writeFileSync(args[5],JSON.stringify({input_sha256:D.hash(inputRead),policy_sha256:policyHash,scopes}));
  fs.writeFileSync(args[6],JSON.stringify({state:'complete',completed:70}));
  const child=new EventEmitter();child.pid=process.pid;child.exitCode=0;return child;
 }});
 const range={mode:D.MIXED,start:'2023-01',cutoff:'2026-10'};
 await assert.rejects(service.start(range,user),/for 2026-10/);
 assert.equal(inputRead,undefined);
 try{
  for(const barangay of D.BARANGAYS)await service.confirm({month:'2026-10',barangay,complete:true},user);
  const run=await service.start(range,user);
  assert.equal(inputRead.target,'2026-11');
  assert.deepEqual(inputRead.report_digests.map(row=>row.month),['2026-10']);
  for(let index=0;index<70;index++){
   assert.deepEqual(inputRead.scopes[index].history.slice(0,45),snapshot.scopes[index].history);
   assert.equal(inputRead.scopes[index].history[45],0);
  }
  assert((await service.reports('2023-03')).every(row=>!row.confirmed));
  const review=await service.review(run.id);
  assert.equal(review.mode,D.MIXED);assert.equal(review.current_data_matches,true);
  assert.equal(review.context.main_target,'2026-11');assert.equal(review.context.records,46*70);
  assert.equal(review.scopes.length,70);
  await assert.rejects(service.publish({run_id:run.id,acknowledged:true},user),/cannot be published/);
  await assert.rejects(service.prepareProbability(run.id,{genuine_history_reviewed:true,outcomes_unknown:true},user),/genuine reported history/);
  assert.equal((await service.publicationStatus()).publication,null);
 }finally{
  for(const barangay of D.BARANGAYS)await service.confirm({month:'2026-10',barangay,complete:false},user);
 }
});

test('operational workflow: completeness, frozen run, honest publication, outcome scoring and correction invalidation',async t=>{
 let launches=0;const user={system_id:'MHO-FIXTURE',role:'mho'};
 const launch=(_python,args)=>{launches++;const i=JSON.parse(fs.readFileSync(args[4]));fs.writeFileSync(args[5],JSON.stringify(output(i)));fs.writeFileSync(args[6],JSON.stringify({state:'complete'}));const child=new EventEmitter();child.pid=process.pid;child.exitCode=0;return child;};
 const s=createMonthlyPredictions(db,{directory,python:process.execPath,probe:async()=>({ready:true}),launch,now:()=>clock});
 await assert.rejects(s.options(),/No operational/);await assert.rejects(s.start({start:'2023-01',cutoff:'2026-09'},user),/incomplete/);assert.equal(launches,0);
 const reports=await s.reports('2026-09');assert.ok(reports.every(r=>!r.confirmed));assert.equal(reports.reduce((a,r)=>a+r.total,0),snapshot.scopes.reduce((a,r)=>a+r.history[44],0),'Consultation visits do not increment disease counts');
 await assert.rejects(s.confirm({month:'2026-10',barangay:'Salvacion',complete:true},user),/completed/);
 for(const m of snapshot.dates)for(const b of D.BARANGAYS)await s.confirm({month:m,barangay:b,complete:true},user);
 let worker;
 const dormant=createMonthlyPredictions(db,{directory,python:process.execPath,probe:async()=>({ready:true}),now:()=>clock,launch:()=>{const child=new EventEmitter();child.pid=process.pid;child.exitCode=null;worker=child;return child;}});
 const waiting=await dormant.start({start:'2023-01',cutoff:'2026-09'},user);await assert.rejects(s.start({start:'2023-01',cutoff:'2026-09'},user),/already active/);const waitingDir=path.join(directory,waiting.id);
 const waitingInput=JSON.parse(fs.readFileSync(path.join(waitingDir,'input.json')));
 fs.writeFileSync(path.join(waitingDir,'output.json'),JSON.stringify(output(waitingInput)));
 fs.writeFileSync(path.join(waitingDir,'progress.json'),JSON.stringify({state:'complete'}));
 assert.equal((await dormant.review(waiting.id)).run.status,'running','Artifacts cannot make a live worker publishable');
 await assert.rejects(dormant.publish({run_id:waiting.id,acknowledged:true},user),/Only a verified/);
 worker.exitCode=1;worker.emit('exit',1,null);
 let failed;
 for(let i=0;i<100;i++){
  failed=await dormant.review(waiting.id);
  if(failed.run.status==='failed')break;
  await new Promise(resolve=>setTimeout(resolve,10));
 }
 assert.equal(failed.run.status,'failed','Nonzero exit rejects even complete-looking artifacts');
 assert.equal((await s.publicationStatus()).publication,null);
 await assert.rejects(s.options(),/No operational/);
 const run=await s.start({start:'2023-01',cutoff:'2026-09'},user);assert.equal(launches,1);const review=await s.review(run.id);assert.equal(review.available,70);assert.equal(review.current_data_matches,true);assert.equal(review.overall['80_20']['1'].available,626);
 await assert.rejects(s.publish({run_id:run.id,acknowledged:false},user),/explicitly/);await s.publish({run_id:run.id,acknowledged:true},user);const reused=await s.start({start:'2023-01',cutoff:'2026-09'},user);assert.equal(reused.id,run.id);assert.equal(launches,1,'Unchanged inputs reuse a verified version rather than retrain');
 const express=require('express');
 const {registerMonthlyPredictionRoutes}=require('../routes/monthly-prediction-routes');
 const app=express();
 const barangay='Salvacion',barangay_id=D.BARANGAYS.indexOf(barangay)+1;
 app.use((req,_res,next)=>{req.user={role:req.get('X-QA-Role'),barangay_id};next();});
 registerMonthlyPredictionRoutes(app,db,s);
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(()=>new Promise(r=>server.close(r)));
 async function request(role,route){
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+role+'/operational-predictions/'+route,{headers:{'X-QA-Role':role}});
  return {status:response.status,...await response.json()};
 }
 async function expectPublication(version){
  const m=await request('mho','prediction?disease=Cough&barangay=Salvacion');
  const b=await request('bhw','prediction?disease=Cough');
  for(const r of [m,b]){
   assert.equal(r.status,200);assert.equal(r.data.provenance.version,version);
   assert.equal(r.data.context.main_target,'2026-10');
   assert.equal(r.data.experimental_probability.status,version===alternate?'available':'unavailable');
   if(version===alternate)assert.equal(r.data.experimental_probability.binding.sarima_version,alternate);
  }
  assert.deepEqual(b.data.view,m.data.view);
  assert.deepEqual(b.data.experimental_probability,m.data.experimental_probability);
  assert.equal((await request('bhw','prediction?disease=Cough&barangay=Caliban')).status,400);
  assert.equal((await request('bhw','prediction?disease=Cough&run_id='+waiting.id)).status,400);
 }
 const alternate=crypto.randomUUID();
 await expectPublication(run.id);
 const options=await s.options();assert.equal(options.provenance.synthetic,false);assert.equal(options.context.cases,6200);assert.equal(options.context.cutoff,'2026-09');
 for(const item of snapshot.scopes){const result=await s.forecast({disease:item.disease,barangay:item.barangay});assert.equal(result.view.production['1'].prediction,item.outputs.at(-1).sarima.prediction);}
 const outputPath=path.join(directory,run.id,'output.json'),frozenOutput=fs.readFileSync(outputPath);const tampered=JSON.parse(frozenOutput);tampered.scopes[0].outputs.at(-1).sarima.prediction+=100;fs.writeFileSync(outputPath,JSON.stringify(tampered));await assert.rejects(s.forecast({disease:'Cough',barangay:'Salvacion'}),/integrity/);fs.writeFileSync(outputPath,frozenOutput);

 // Separate fixture version proves atomic selection/rollback; this is adapter QA, not a fitted challenger.
 fs.mkdirSync(path.join(directory,alternate));for(const f of ['input.json','output.json','progress.json'])fs.copyFileSync(path.join(directory,run.id,f),path.join(directory,alternate,f));
 await db.execute("INSERT INTO prediction_runs(id,start_month,cutoff,status,input_hash,output_hash,created_by) VALUES(?,?,?,'ready',?,?,?)",[alternate,'2023-01','2026-09',run.input_hash,D.hash(JSON.parse(frozenOutput)),user.system_id]);
 const {calculate}=require('../services/operational-cmp');
 const enginePython=process.env.HEALTH_INTEL_QA_CMP_PYTHON;
 assert.ok(enginePython,'Set HEALTH_INTEL_QA_CMP_PYTHON to the pinned scientific Python for this integration test');
 const params={genuine_history_reviewed:true,outcomes_unknown:true};
 const failedCalculator=createMonthlyPredictions(db,{directory,now:()=>clock,calculateProbability:async()=>{throw Error('Private failure');}});
 await assert.rejects(s.prepareProbability(alternate,{},user),/Confirm genuine/);
 await assert.rejects(s.prepareProbability(waiting.id,params,user),/completed, unpublished/);
 async function waitForProbability(service){
  const deadline=Date.now()+300000;
  do{
   const state=(await service.review(alternate)).probability;
   if(state.status!=='calculating')return state;
   await new Promise(resolve=>setTimeout(resolve,1000));
  }while(Date.now()<deadline);
  throw Error('Timed out waiting for fixture probability preparation');
 }
 assert.equal((await failedCalculator.prepareProbability(alternate,params,user)).status,'calculating');
 assert.equal((await waitForProbability(failedCalculator)).status,'failed');
 await expectPublication(run.id);

 const probabilityService=createMonthlyPredictions(db,{directory,python:enginePython,now:()=>clock,calculateProbability:(python,scopes)=>{
  assert.equal(scopes.length,280);
  assert.deepEqual([...new Set(scopes.map(scope=>scope.horizon))],[1,2,3,4]);
  assert(scopes.every(s=>s.prior_pairs.every(p=>p.j>=31&&p.j<45)));
  assert.equal(scopes.find(s=>s.disease==='Influenza'&&s.barangay==='Caliban'&&s.horizon===1).prior_pairs.length,9);
  return calculate(python,scopes);
 }});
 assert.equal((await probabilityService.prepareProbability(alternate,params,user)).status,'calculating');
 const prepared=await waitForProbability(probabilityService);
 assert.equal(prepared.by_horizon[1],70,'Frozen H1 calculator on isolated replay fixture');
 assert.equal(prepared.by_horizon[3],0,'Legacy archived worker has no H3 fit output');
 assert.equal(prepared.by_horizon[4],0,'Legacy archived worker has no H4 fit output');
 assert.match(prepared.sha256,/^[a-f0-9]{64}$/);
 await assert.rejects(s.publish({run_id:alternate,acknowledged:true},user),/Review the candidate again/);
 await expectPublication(run.id);
 const approval={run_id:alternate,acknowledged:true,probability_sha256:prepared.sha256};
 await db.query('RENAME TABLE system_audit_logs TO qa_publication_audit_hold');
 try{
  await assert.rejects(s.publish(approval,user));
  assert.equal((await s.publicationStatus()).publication.run_id,run.id);
  assert.equal((await s.review(alternate)).run.status,'ready');
  await expectPublication(run.id);
 }finally{await db.query('RENAME TABLE qa_publication_audit_hold TO system_audit_logs');}
 await s.publish(approval,user);
 assert.equal((await s.list()).publication.run_id,alternate);
 await expectPublication(alternate);
 const attachment=(await s.forecast({disease:'Cough',barangay:'Salvacion'})).experimental_probability;
 assert.equal(attachment.binding.probability_sha256,prepared.sha256);
 assert.equal((100*attachment.exact).toFixed(2),'32.27');
 assert.equal((100*attachment.nearby).toFixed(2),'79.89');
 const probabilityPath=path.join(directory,alternate,'experimental-probability.json');
 const packet=JSON.parse(fs.readFileSync(probabilityPath,'utf8'));
 fs.writeFileSync(probabilityPath,JSON.stringify({...packet,review:{...packet.review,reviewed_by:'QA-TAMPERED'}}));
 const tamperedProbability=await s.forecast({disease:'Cough',barangay:'Salvacion'});
 assert.equal(tamperedProbability.experimental_probability.status,'unavailable');
 assert.equal(tamperedProbability.view.production['1'].prediction,attachment.mean);
 fs.writeFileSync(probabilityPath,JSON.stringify(packet));
 const rollback=await s.publish({run_id:run.id,acknowledged:true},user);assert.equal(rollback.previous_run_id,alternate);assert.equal((await s.list()).publication.run_id,run.id);
 await s.publish(approval,user);
 await expectPublication(alternate);
 await s.publish({run_id:run.id,acknowledged:true},user);
 await db.execute("UPDATE prediction_runs SET status='ready' WHERE id=?",[alternate]);
 clock=new Date('2026-11-02T00:00:00Z');await assert.rejects(s.publish({run_id:alternate,acknowledged:true},user),/already ended/);await assert.rejects(s.outcomes(alternate),/published/);
 const stopped=crypto.randomUUID();await db.execute("INSERT INTO prediction_runs(id,start_month,cutoff,status,input_hash,created_by) VALUES(?,?,?,'running',?,?)",[stopped,'2023-01','2026-09',run.input_hash,user.system_id]);assert.equal((await s.review(stopped)).run.status,'failed');await assert.rejects(s.publish({run_id:stopped,acknowledged:true},user),/Only a verified/);assert.equal((await s.publicationStatus()).publication.run_id,run.id,'A failed candidate cannot replace the published version');
 clock=new Date('2026-11-02T00:00:00Z');for(const b of D.BARANGAYS)await s.confirm({month:'2026-10',barangay:b,complete:true},user);const compared=await s.compareIssued(run.id);assert.equal(compared.targets[0].status,'issued_during_target');assert.equal(compared.targets[0].rows.length,70);assert.ok(compared.targets[0].rows.every(r=>r.actual===0));assert.equal(compared.targets[1].status,'month_open');const outcome=await s.outcomes(run.id);assert.equal(outcome.metrics.attempted,70);assert.ok(outcome.rows.every(r=>r.actual===0));assert.equal(outcome.evaluation_type,'issued_during_target_month_not_full_month_independent_validation');
 await db.execute("UPDATE health_cases SET disease_review_status='Pending' WHERE id=1");const changed=await s.reports('2023-01');assert.ok(changed.some(r=>r.stale));await assert.rejects(s.publish({run_id:run.id,acknowledged:true},user),/changed/);await assert.rejects(s.confirm({month:'2023-01',barangay:'Salvacion',complete:true},user),/pending/);
 assert.equal((await s.forecast({disease:'Cough',barangay:'Salvacion'})).current_data_matches,false,'Published history remains frozen and explicitly stale');
});
