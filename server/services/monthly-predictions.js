'use strict';
const {reportingExcluded}=require('./case-reporting');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,execFile}=require('node:child_process');
const CMP=require('./operational-cmp');
const H=require('./forecast-horizons');
const {displayRows,probabilityOf}=require('./forecast-overview');
const {loadDataset,SOURCE_HASH}=require('./dataset-analytics');
const {readSavedDataset}=require('./admin-analytics');
const D=require('./monthly-data'),{createSystemAudit}=require('./system-audit');
const DIRECTORY=path.join(__dirname,'../data/operational-predictions'),ENGINE=path.join(__dirname,'../forecasting/policy-a');
const PORTABLE=path.join(__dirname,'../forecasting/policy-a-portable');
function probeWorker(python,runner=PORTABLE){return new Promise(resolve=>execFile(python,['-X','utf8','-B',path.join(runner,'preflight.py')],{cwd:runner,windowsHide:true,timeout:15000,maxBuffer:32768,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}},(error,stdout)=>{try{const v=JSON.parse(stdout);resolve(v.ready===true&&!error?v:{ready:false,message:v.message||'Worker preflight failed'});}catch{resolve({ready:false,message:error?.code==='ENOENT'?'Configured Python executable was not found.':'Worker preflight failed or timed out. Check the pinned environment and delegated memory controller.'});}}));}
async function migrateMonthlyPredictions(db){
 await db.query(`CREATE TABLE IF NOT EXISTS prediction_month_reports (month CHAR(7) NOT NULL,barangay VARCHAR(100) NOT NULL,digest CHAR(64) NOT NULL,confirmed_by VARCHAR(50) NOT NULL,confirmed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(month,barangay)) ENGINE=InnoDB`);
 await db.query(`CREATE TABLE IF NOT EXISTS prediction_runs (id CHAR(36) PRIMARY KEY,start_month CHAR(7) NOT NULL,cutoff CHAR(7) NOT NULL,status VARCHAR(20) NOT NULL,input_hash CHAR(64) NOT NULL,output_hash CHAR(64),created_by VARCHAR(50) NOT NULL,worker_pid INT,first_published_epoch BIGINT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,error VARCHAR(255)) ENGINE=InnoDB`);
 await db.query(`CREATE TABLE IF NOT EXISTS prediction_publications (id INT PRIMARY KEY,run_id CHAR(36),published_by VARCHAR(50),published_at TIMESTAMP NULL) ENGINE=InnoDB`);
 await db.execute('INSERT IGNORE INTO prediction_publications(id) VALUES(1)');
}
function createMonthlyPredictions(db,{directory=DIRECTORY,engine=ENGINE,python=process.env.OPERATIONAL_SARIMA_PYTHON||process.env.PYTHON_PATH||path.join(__dirname,'../.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python'),launch=spawn,probe=probeWorker,calculateProbability=CMP.calculate,now=()=>new Date()}={}){
 const activeRuns=new Set();
 let probabilityJob=null;
 const audit=createSystemAudit(db),frozen=JSON.parse(fs.readFileSync(path.join(engine,'source-manifest.json'),'utf8'));
 const policyHash=D.hash(frozen);
 const id=value=>{if(typeof value!=='string'||!/^[a-f0-9-]{36}$/.test(value))throw D.fail('Invalid prediction version.');return value;};
 const file=(run,name)=>path.join(directory,id(run),name);
 const read=(run,name)=>JSON.parse(fs.readFileSync(file(run,name),'utf8'));
 const write=(run,name,data)=>{const dest=file(run,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest+'.tmp',JSON.stringify(data));fs.renameSync(dest+'.tmp',dest);};
 function verifyEngine(){const runtime=JSON.parse(fs.readFileSync(path.join(PORTABLE,'runtime-manifest.json'),'utf8'));for(const [name,digest]of Object.entries(runtime)){if(crypto.createHash('sha256').update(fs.readFileSync(path.join(PORTABLE,name))).digest('hex')!==digest)throw D.fail('The portable runtime failed verification.',503);}for(const [name,digest] of Object.entries(frozen)){if(crypto.createHash('sha256').update(fs.readFileSync(path.join(engine,name))).digest('hex')!==digest)throw D.fail('The operational SARIMA policy files failed verification.',503);}}
 async function locked(work){const c=await db.getConnection();try{const [[r]]=await c.query("SELECT GET_LOCK('health_intel_monthly_predictions',0) AS acquired");if(!r.acquired)throw D.fail('Another monthly update is being prepared. Try again shortly.',409);try{return await work(c);}finally{await c.query("SELECT RELEASE_LOCK('health_intel_monthly_predictions')");}}finally{c.release();}}
 async function monthRows(value,c=db){D.month(value);const [rows]=await c.execute(`SELECT h.id,DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,COALESCE(d.name,h.disease) AS disease,h.disease_review_status,b.name AS barangay FROM health_cases h JOIN barangays b ON b.id=h.barangay_id LEFT JOIN disease_registry d ON d.id=h.disease_id WHERE h.date_recorded>=? AND h.date_recorded<? AND NOT ${reportingExcluded('h.id')} ORDER BY h.id`,[value+'-01',D.next(value)+'-01']);return rows;}
 async function recorded(value){const rows=await monthRows(value);return D.BARANGAYS.map(barangay=>D.summarize(rows,barangay));}
 async function reports(value,c=db){const rows=await monthRows(value,c),[saved]=await c.execute('SELECT barangay,digest,confirmed_by,confirmed_at FROM prediction_month_reports WHERE month=?',[value]);return D.BARANGAYS.map(b=>{const current=D.summarize(rows,b),record=saved.find(r=>r.barangay===b);return {...current,confirmed:!!record&&record.digest===current.digest,stale:!!record&&record.digest!==current.digest,confirmed_by:record?.confirmed_by||null,confirmed_at:record?.confirmed_at||null};});}
 async function uploadedInput(start,cutoff,version){
  if(start<D.DATASET_START)throw D.fail('Choose a month from January 2023 onward.');
  const dates=D.months(start,cutoff);
  if(dates.length<45)throw D.fail('A saved CSV needs at least 45 consecutive complete months.');
  const {rows}=await readSavedDataset(version,path.join(directory,'admin-analytics'));
  const counts=new Map(rows.map(row=>[[row.Date,row.Barangay,row.Disease].join('|'),row.Cases]));
  const scopes=D.DISEASES.flatMap(disease=>D.BARANGAYS.map(barangay=>({
   disease,barangay,history:dates.map(period=>{
    const value=counts.get([period,barangay,disease].join('|'));
    if(value===undefined)throw D.fail(`The saved CSV is missing ${period} / ${barangay} / ${disease}. Select a complete range or upload the missing rows.`,409);
    return value;
   })
  })));
  const input={mode:D.MIXED,start,cutoff,target:D.next(cutoff),policy_sha256:policyHash,forecast_format:H.FORMAT,
   uploaded_dataset_sha256:version,report_digests:[],scopes};
  D.validateInput(input);
  return input;
 }

 async function inputFor(start,cutoff,c=db,mode='operational',datasetId){
  D.closed(cutoff,now());
  if(!['operational',D.MIXED].includes(mode))throw D.fail('Choose a valid training history source.');
  const mixed=mode===D.MIXED;
  if(datasetId!==undefined){
   if(!mixed)throw D.fail('Choose saved CSV preview mode to train on an upload.');
   return uploadedInput(start,cutoff,datasetId);
  }
  if(mixed&&(start!==D.DATASET_START||cutoff<D.FIRST_REPORT_MONTH))throw D.fail('Use the dataset from January 2023 and at least one confirmed report month from October 2026 onward.');
  const dates=D.months(start,cutoff);
  if(dates.length<45)throw D.fail('At least 45 consecutive confirmed operational months are required.');
  const historical=mixed?new Map(loadDataset().map(row=>[[row.Date,row.Barangay,row.Disease].join('|'),row.Cases])):null;
  const liveReports=new Map();
  for(const month of dates.filter(month=>!mixed||month>=D.FIRST_REPORT_MONTH)){
   const rows=await reports(month,c);
   if(rows.some(row=>!row.confirmed||row.pending))throw D.fail(`Reporting is incomplete or changed for ${month}. Confirm every pilot barangay, including genuinely zero-case reports.`,409);
   liveReports.set(month,rows);
  }
  const input={mode,start,cutoff,target:D.next(cutoff),policy_sha256:policyHash,forecast_format:H.FORMAT,
   ...(mixed?{historical_dataset_sha256:SOURCE_HASH}:{}),
   report_digests:[...liveReports].map(([month,rows])=>({month,barangays:rows.map(({barangay,digest})=>({barangay,digest}))})),
   scopes:D.DISEASES.flatMap(disease=>D.BARANGAYS.map(barangay=>({disease,barangay,history:dates.map(month=>
    mixed&&month<D.FIRST_REPORT_MONTH?historical.get([month,barangay,disease].join('|')):
    liveReports.get(month).find(row=>row.barangay===barangay).counts[disease])})))
  };
  D.validateInput(input);return input;
 }
 async function getRun(run,c=db){const [[r]]=await c.execute('SELECT * FROM prediction_runs WHERE id=?',[id(run)]);if(!r)throw D.fail('Prediction version was not found.',404);return r;}
 function verified(row){const input=read(row.id,'input.json');if(D.hash(input)!==row.input_hash||input.policy_sha256!==policyHash)throw D.fail('Frozen input integrity check failed.',409);const output=read(row.id,'output.json');if(row.output_hash&&D.hash(output)!==row.output_hash)throw D.fail('Frozen output integrity check failed.',409);const result=D.validateOutput(input,output);return {input,output,result:input.forecast_format===H.FORMAT?H.extend(input,output,result):result};}
 async function finishRun(run, succeeded, connection=db){
  const row=await getRun(run,connection);
  if(!['running','queued'].includes(row.status))return row;
  let outputHash;
  if(succeeded){
   try{
    if(read(run,'progress.json').state!=='complete')throw Error('Incomplete worker output');
    outputHash=D.hash(verified(row).output);
   }catch{ /* Invalid or incomplete output is never marked ready. */ }
  }
  if(outputHash){
   await connection.execute("UPDATE prediction_runs SET status='ready',output_hash=?,worker_pid=NULL WHERE id=? AND status IN ('running','queued')",[outputHash,run]);
  }else{
   await connection.execute("UPDATE prediction_runs SET status='failed',error='Training ended without verified completed results',worker_pid=NULL WHERE id=? AND status IN ('running','queued')",[run]);
  }
  return getRun(run,connection);
 }
 async function reconcile(row, connection){
  if(!['running','queued'].includes(row.status))return row;
  if(row.status==='queued'&&!connection){
   try{
    return await locked(async connection=>{
     const current=await getRun(row.id,connection);
     return current.status==='queued' ? reconcile(current,connection) : current;
    });
   }catch(error){
    if(error.status===409)return row;
    throw error;
   }
  }
  if(row.worker_pid){
   try{process.kill(row.worker_pid,0);return row;}catch(error){if(error.code==='EPERM')return row;}
  }
  if(activeRuns.has(row.id))return row;
  return finishRun(row.id,false,connection);
 }
 async function freshness(input,c=db){try{const current=await inputFor(input.start,input.cutoff,c,input.mode,input.uploaded_dataset_sha256);if(!input.forecast_format)delete current.forecast_format;return D.hash(current)===D.hash(input);}catch{return false;}}
 async function list(){const readiness=await probe(python);const [rows]=await db.query('SELECT * FROM prediction_runs ORDER BY created_at DESC LIMIT 30');const result=[];for(const row of rows){const r=await reconcile(row);let progress=null;try{progress=read(row.id,'progress.json');}catch{}let mode,dataset_id;try{const input=read(row.id,'input.json');mode=input.mode;dataset_id=input.uploaded_dataset_sha256;}catch{}result.push({...r,progress,mode,dataset_id});}const [[publication]]=await db.query('SELECT * FROM prediction_publications WHERE id=1');return {runs:result,publication,minimum_months:45,source:'Operational database cases only',dataset_history:{start:D.DATASET_START,last_month:'2026-09',first_report_month:D.FIRST_REPORT_MONTH},worker_platform:process.platform==='win32'?'Windows bounded worker':process.platform==='linux'?'Linux cgroup-v2 bounded worker':'Unsupported worker platform',worker_ready:readiness.ready,worker_message:readiness.message||null,python_configured:readiness.ready,diseases:D.DISEASES,barangays:D.BARANGAYS};}
 async function confirm({month,barangay,complete},user){D.closed(month,now());if(typeof complete!=='boolean'||!D.BARANGAYS.includes(barangay))throw D.fail('Choose a pilot barangay and an explicit completeness decision.');return locked(async c=>{await c.beginTransaction();try{const summary=D.summarize(await monthRows(month,c),barangay);if(complete&&summary.pending)throw D.fail('Resolve pending disease classifications before confirming this report.',409);if(complete)await c.execute('INSERT INTO prediction_month_reports(month,barangay,digest,confirmed_by) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE digest=VALUES(digest),confirmed_by=VALUES(confirmed_by),confirmed_at=CURRENT_TIMESTAMP',[month,barangay,summary.digest,user.system_id]);else await c.execute('DELETE FROM prediction_month_reports WHERE month=? AND barangay=?',[month,barangay]);await createSystemAudit(c).record(user,'Monthly Report Reviewed',{summary:complete?'Completed operational monthly report confirmed':'Operational monthly report reopened',target_type:'Monthly report',target_id:month+' / '+barangay,outcome:'Succeeded'});await c.commit();return {month,barangay,complete};}catch(e){await c.rollback();throw e;}});}
 async function start({start,cutoff,mode,dataset_id},user){verifyEngine();const readiness=await probe(python);if(!readiness.ready)throw D.fail(readiness.message||'Scientific worker is not ready.',503);return locked(async c=>{const [pending]=await c.query("SELECT * FROM prediction_runs WHERE status IN ('running','queued')");for(const row of pending){const updated=await reconcile(row,c);if(['running','queued'].includes(updated.status))throw D.fail('A monthly fitting run is already active. Wait for it to finish.',409);}await c.beginTransaction();let run;try{const input=await inputFor(start,cutoff,c,mode,dataset_id);const [existing]=await c.execute("SELECT * FROM prediction_runs WHERE input_hash=? AND status IN ('ready','published') ORDER BY created_at DESC LIMIT 1",[D.hash(input)]);if(existing.length){verified(existing[0]);await c.commit();return existing[0];}run=crypto.randomUUID();write(run,'input.json',input);await c.execute("INSERT INTO prediction_runs(id,start_month,cutoff,status,input_hash,created_by) VALUES(?,?,?,'queued',?,?)",[run,start,cutoff,D.hash(input),user.system_id]);await createSystemAudit(c).record(user,'Prediction Update Prepared',{summary:input.uploaded_dataset_sha256?'Saved CSV preview prepared for SARIMA':input.mode===D.MIXED?'Dataset-backed preview prepared for SARIMA':'Frozen operational monthly totals prepared for SARIMA',target_type:'Prediction version',target_id:run,outcome:'Prepared'});await c.commit();}catch(e){await c.rollback();throw e;}
  activeRuns.add(run);
  try{
   const log=fs.openSync(file(run,'worker.log'),'a');
   let child;
   let completion;
   try{
    child=launch(python,['-X','utf8','-B',path.join(PORTABLE,'monthly-runner.py'),file(run,'input.json'),file(run,'output.json'),file(run,'progress.json'),policyHash],{cwd:PORTABLE,windowsHide:true,env:{...process.env,HEALTH_INTEL_RUNTIME_DIR:path.dirname(file(run,'progress.json')),PYTHONDONTWRITEBYTECODE:'1'},stdio:['ignore',log,log]});
    completion=new Promise(resolve=>{
     child.once('error',()=>resolve(false));
     child.once('exit',(code,signal)=>resolve(code===0&&!signal));
     if(child.exitCode!=null||child.signalCode)resolve(child.exitCode===0&&!child.signalCode);
    });
   }finally{fs.closeSync(log);}
   await c.execute("UPDATE prediction_runs SET status='running',worker_pid=? WHERE id=?",[child.pid||null,run]);
   const finishing=completion.then(succeeded=>finishRun(run,succeeded)).finally(()=>activeRuns.delete(run));
   if(child.exitCode!=null||child.signalCode)return await finishing;
   finishing.catch(()=>console.error('Could not finalize the monthly prediction run.'));
   return getRun(run,c);
  }catch{
   activeRuns.delete(run);
   await c.execute("UPDATE prediction_runs SET status='failed',error='Worker could not start' WHERE id=? AND status IN ('running','queued')",[run]);
   throw D.fail('The scientific worker could not start; current published predictions were preserved.',503);
  }
 });}
 function probabilityPacket(row, v){
  try {
   return CMP.validatePacket(read(row.id,'experimental-probability.json'),row.id,v);
  } catch(error) {
   if(error.code==='ENOENT')return null;
   throw D.fail('The prepared experimental probability failed verification.',409);
  }
 }
 async function prepareProbability(run,{genuine_history_reviewed,outcomes_unknown},user){
  if(genuine_history_reviewed!==true||outcomes_unknown!==true)throw D.fail('Confirm genuine reporting history and that final target-month outcomes are still unknown.');
  if(probabilityJob?.status==='calculating')throw D.fail('Experimental probabilities are already being prepared. Try again after it finishes.',409);
   verifyEngine();
   const row=await getRun(run);
   if(row.status!=='ready'||!row.output_hash)throw D.fail('Prepare probabilities for a completed, unpublished SARIMA version.',409);
   const v=verified(row);
   if(v.input.mode!=='operational')throw D.fail('Operational probabilities require genuine reported history throughout.',409);
   if(D.currentMonth(now())!==v.input.target)throw D.fail('Prepare experimental probabilities during the target month, before final outcomes are known.',409);
   if(!v.result.available||!await freshness(v.input))throw D.fail('Use current confirmed reports and a version with accepted SARIMA estimates.',409);
   const existing=probabilityPacket(row,v);
   if(existing)return CMP.summary(existing);

   // Freshness uses asynchronous database reads, so check again before taking the calculator slot.
   if(probabilityJob?.status==='calculating')throw D.fail('Experimental probabilities are already being prepared. Try again after it finishes.',409);
   probabilityJob={run,status:'calculating'};
   const review={genuine_history_reviewed:true,outcomes_unknown:true,reviewed_by:user.system_id,reviewed_at:now().toISOString()};
   finishProbability(row,v,review).then(()=>{
    probabilityJob=null;
   },()=>{
    probabilityJob={run,status:'failed'};
    console.error('Operational COM-Poisson preparation did not complete.');
   });
   return {status:'calculating'};
 }
 async function finishProbability(row,v,review){
   const run=row.id;
   const packet={
    schema:v.input.forecast_format===H.FORMAT?2:1,binding:CMP.binding(run,v),review,
    rows:await calculateProbability(python,CMP.earlierPairs(v)),
   };
   return locked(async c=>{
    const current=await getRun(run,c);
    if(current.status!=='ready'||current.input_hash!==row.input_hash||current.output_hash!==row.output_hash||
       D.currentMonth(now())!==v.input.target||!await freshness(v.input,c)){
     throw D.fail('The prediction version or confirmed reports changed during probability preparation.',409);
    }
    const previous=probabilityPacket(current,v);
    if(previous)return CMP.summary(previous);
    try{CMP.validatePacket(packet,run,v);}catch{throw D.fail('The experimental probability output failed verification.',503);}
    write(run,'experimental-probability.json',packet);
    return CMP.summary(packet);
   });
 }
 async function publishedProbability(v,view){
  if(view.production['1'].prediction===null)return CMP.unavailable('SARIMA_unavailable');
  try{
   const packet=probabilityPacket(v.row,v);
   if(!packet)return CMP.unavailable('genuine_history_review_required');
   const digest=await CMP.publishedDigest(db,v.row.id);
   if(D.hash(packet)!==digest)return CMP.unavailable('probability_evidence_mismatch');
   const selected=packet.rows.find(r=>r.disease===view.disease&&r.barangay===view.barangay&&(r.horizon??1)===1);
   if(selected.reason)return CMP.unavailable(selected.reason);
   return {schema:1,status:'available',experimental:true,policy:packet.binding.cmp_policy,
    binding:{...packet.binding,probability_sha256:digest},...selected};
  }catch{return CMP.unavailable('probability_evidence_mismatch');}
 }
 async function probabilityReview(row,v){
  try{
   const packet=probabilityPacket(row,v);
   if(!packet)return row.status==='ready'&&probabilityJob?.run===row.id?{status:probabilityJob.status}:CMP.summary(null);
   if(row.status==='published'&&D.hash(packet)!==await CMP.publishedDigest(db,row.id))return CMP.summary(null);
   return CMP.summary(packet);
  }catch{return {status:'invalid'};}
 }
 async function review(run){const row=await reconcile(await getRun(run));if(!['ready','published'].includes(row.status))return {run:row};verifyEngine();const v=verified(row);return {run:row,mode:v.input.mode,dataset_id:v.input.uploaded_dataset_sha256,current_data_matches:await freshness(v.input),context:v.result.context,available:v.result.available,probability:v.input.mode===D.MIXED?null:await probabilityReview(row,v),overall:v.result.overall,scopes:Object.values(v.result.views).map(s=>({disease:s.disease,barangay:s.barangay,prediction:s.production['1'].prediction,reason:s.production['1'].reason,metrics:s.protocols['80_20']['1'].metrics,annual_supported:!s.weak_components,configuration:s.configurations[0]}))};}
 async function publish({run_id,acknowledged,probability_sha256=null},user){if(acknowledged!==true)throw D.fail('Review the candidate limitations and explicitly approve publication.');return locked(async c=>{await c.beginTransaction();try{verifyEngine();const row=await getRun(run_id,c);if(!['ready','published'].includes(row.status)||!row.output_hash||(row.status==='ready'&&read(row.id,'progress.json').state!=='complete'))throw D.fail('Only a verified completed version can be published.',409);const v=verified(row);if(v.input.mode!=='operational')throw D.fail('A dataset-backed preview cannot be published as an operational forecast.',409);if(row.status==='ready'&&v.input.target<D.currentMonth(now()))throw D.fail('This target month has already ended. Prepare a current update before publishing.',409);if(!v.result.available)throw D.fail('No accepted SARIMA prediction is available in this version.',409);if(!await freshness(v.input,c))throw D.fail('Monthly records changed. Reconfirm the affected reports and prepare a new version.',409);const packet=row.status==='ready'?probabilityPacket(row,v):null;const digest=packet?D.hash(packet):null;if(digest&&D.currentMonth(now())!==v.input.target)throw D.fail('The target month changed. Prepare a current version before publishing probabilities.',409);if(row.status==='ready'&&digest!==probability_sha256)throw D.fail('Experimental probability preparation changed. Review the candidate again before publishing.',409);const [[prior]]=await c.query('SELECT run_id FROM prediction_publications WHERE id=1 FOR UPDATE');await c.execute('UPDATE prediction_publications SET run_id=?,published_by=?,published_at=CURRENT_TIMESTAMP WHERE id=1',[row.id,user.system_id]);await c.execute("UPDATE prediction_runs SET status='published',first_published_epoch=COALESCE(first_published_epoch,?) WHERE id=?",[Math.floor(now().getTime()/1000),row.id]);await createSystemAudit(c).record(user,'Predictions Published',{summary:'Verified operational prediction version selected',target_type:'Prediction version',target_id:row.id,previous_run_id:prior.run_id,...(digest?{probability_sha256:digest}:{}),outcome:'Succeeded'});await c.commit();return {run_id:row.id,previous_run_id:prior.run_id};}catch(e){await c.rollback();throw e;}});}
 async function published(){const [[p]]=await db.query('SELECT * FROM prediction_publications WHERE id=1');if(!p?.run_id)throw Object.assign(D.fail('No operational prediction version is published. Complete and confirm operational reporting history first. The demonstration remains separate.',409),{code:'OPERATIONAL_PREDICTIONS_UNPUBLISHED'});const row=await getRun(p.run_id);if(row.status!=='published'||!row.output_hash)throw D.fail('The selected publication is unavailable.',503);verifyEngine();const v=verified(row);if(v.input.mode!=='operational')throw D.fail('The selected publication is unavailable.',503);return {...v,row,publication:p};}
 async function options(){const v=await published();return {diseases:D.DISEASES,barangays:D.BARANGAYS,context:v.result.context,overall:v.result.overall,provenance:{mode:'verified_operational_monthly_snapshot',synthetic:false,retraining:false,version:v.row.id,dataset_sha256:v.row.input_hash},current_data_matches:await freshness(v.input)};}
 async function forecast(query){if(!D.DISEASES.includes(query.disease)||!D.BARANGAYS.includes(query.barangay)||!['80_20','70_30',undefined].includes(query.protocol)||!['1',undefined].includes(query.horizon))throw D.fail('Choose one pilot disease and barangay for a one-month prediction.');const v=await published(),view=v.result.views[query.disease+'\0'+query.barangay];return {context:v.result.context,view,experimental_probability:await publishedProbability(v,view),selection:{disease:query.disease,barangay:query.barangay,protocol:query.protocol||'80_20',horizon:'1'},overall:v.result.overall,provenance:{mode:'verified_operational_monthly_snapshot',synthetic:false,version:v.row.id,dataset_sha256:v.row.input_hash,sarima_output_sha256:v.row.output_hash,sarima_policy_sha256:v.input.policy_sha256},loaded_saved_results:true,retrained:false,current_data_matches:await freshness(v.input)};}
 async function outcomes(run){const row=await getRun(run);if(row.status!=='published')throw D.fail('Only predictions published before outcomes were available can be assessed.',409);const v=verified(row),target=v.input.target;D.closed(target,now());if(!row.first_published_epoch||Number(row.first_published_epoch)>=Date.parse(D.next(target)+'-01T00:00:00+08:00')/1000)throw D.fail('This version was not published before the target month ended. It cannot be reported as a forward-issued prediction.',409);const actual=await reports(target);if(actual.some(x=>!x.confirmed||x.pending))throw D.fail('Confirm the target month reporting before assessing prediction errors.',409);const rows=Object.values(v.result.views).map(s=>({disease:s.disease,barangay:s.barangay,actual:actual.find(x=>x.barangay===s.barangay).counts[s.disease],prediction:s.production['1'].prediction,actual_model:s.production['1'].actual_model}));return {target,run_id:row.id,evaluation_type:Number(row.first_published_epoch)<Date.parse(target+'-01T00:00:00+08:00')/1000?'issued_before_target_month':'issued_during_target_month_not_full_month_independent_validation',metrics:require('./seasonal6200-sarima-demo').metrics(rows),rows};}
 async function overview(barangay, version){
  let v;
  if(version){
   const row=await getRun(version);
   if(!['ready','published'].includes(row.status)||!row.output_hash)throw D.fail('This version is not ready to review.',409);
   v={...verified(row),row};
  }else v=await published();
  const targets=H.windowFrom(v.input.cutoff,v.input.target);
  const currentMonth=D.currentMonth(now()),closedMonth=H.shift(currentMonth,-1);
  let nextUpdate=null;
  if(!version&&closedMonth>v.input.cutoff){
   let status='pending';
   try{
    const monthReports=await reports(closedMonth);
    status=monthReports.every(row=>row.confirmed&&!row.pending)?'awaiting_publication':'awaiting_confirmation';
   }catch{
    // A reporting status failure must not hide an already-issued prediction.
   }
   nextUpdate={reporting_month:closedMonth,status};
  }
  const issued=v.row.first_published_epoch?new Date(Number(v.row.first_published_epoch)*1000).toISOString():null;
  const probabilities=new Map();
  if(v.input.mode==='operational'){
   try{
    const packet=probabilityPacket(v.row,v);
    if(packet&&(v.row.status==='ready'||D.hash(packet)===await CMP.publishedDigest(db,v.row.id))){
     for(const row of packet.rows)probabilities.set(H.keyFor(row.disease,row.barangay)+'\0'+(row.horizon??1),row);
    }
   }catch{ /* Unverified probability evidence remains unavailable. */ }
  }
  const views=Object.values(v.result.views).filter(view=>!barangay||view.barangay===barangay);
  return {source:v.input.mode==='operational'?'operational':v.input.uploaded_dataset_sha256?'uploaded preview':'dataset-backed preview',
   status:v.row.status==='published'?'published':'draft',cutoff:v.input.cutoff,reference:v.input.target,targets,issued,
   expired:targets.at(-1).target<currentMonth,next_update:nextUpdate,dataset_version:v.input.uploaded_dataset_sha256||v.row.input_hash,model_version:v.row.id,
   barangay:barangay??null,rows:displayRows(views,targets,(view,h)=>probabilityOf(probabilities.get(H.keyFor(view.disease,view.barangay)+'\0'+h)))};
 }
 async function publicationVersions(){
  const [rows]=await db.query("SELECT id,cutoff,status,created_at,first_published_epoch FROM prediction_runs WHERE status IN ('ready','published') AND output_hash IS NOT NULL ORDER BY created_at DESC LIMIT 30");
  const {publication}=await publicationStatus();
  return {active:publication?.run_id??null,versions:rows.map(({id,cutoff,status,created_at,first_published_epoch})=>({id,cutoff,status,created_at,issued:first_published_epoch?new Date(Number(first_published_epoch)*1000).toISOString():null}))};
 }
 async function compareIssued(run){
  const row=await getRun(run);
  if(row.status!=='published'||!row.first_published_epoch||!row.output_hash)throw D.fail('Choose an issued operational prediction version.',409);
  const v=verified(row);
  if(v.input.mode!=='operational')throw D.fail('Choose an issued operational prediction version.',409);
  const issued=new Date(Number(row.first_published_epoch)*1000).toISOString();
  const version={issued,model_version:row.id,dataset_version:row.input_hash};
  const targets=[];
  for(const {target,horizon} of H.windowFrom(v.input.cutoff,v.input.target)){
   if(horizon>1&&!v.result.context.horizons){targets.push({target,horizon,status:'unavailable',rows:[]});continue;}
   if(target>=D.currentMonth(now())){targets.push({target,horizon,status:'month_open',rows:[]});continue;}
   const forecast=Object.values(v.result.views).map(view=>({disease:view.disease,barangay:view.barangay,horizon,prediction:view.production[horizon]?.prediction??null}));
   targets.push({horizon,...H.outcomesFor(target,forecast,await reports(target),issued)});
  }
  return {...version,targets};
 }


 async function publicationStatus(){const [[p]]=await db.query('SELECT run_id FROM prediction_publications WHERE id=1');return {publication:p?.run_id?{run_id:p.run_id}:null};}
 return {reports,recorded,confirm,start,list,review,prepareProbability,publish,options,forecast,outcomes,publicationStatus,overview,publicationVersions,compareIssued};
}
module.exports={migrateMonthlyPredictions,createMonthlyPredictions,probeWorker};
