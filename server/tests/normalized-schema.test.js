const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const {createFixture}=require('./helpers/directory-session-fixture');
const {readSql,parseInsert,parseUpdate}=require('../services/normalized-schema');
const {todayInManila}=require('../services/patient-validation');
let f,caseId,residentId,diseaseId,pendingId;
const tokens={},today=todayInManila();
const visit={transaction_mode:'Walk-in',nature_of_visit:'New consultation/case',consultation_time:'09:00',blood_pressure:'120/80',temperature_c:'36.5',height_cm:'165',weight_kg:'60',next_followup_date:today,followup_instructions:'Synthetic return advice.'};
const patient={first_name:'Normalized',last_name:'Workflow',suffix:'Jr.',birthdate:'1995-02-03',purok:'Synthetic Zone',disease:'Synthetic Normalized Disease',date_recorded:today,severity:'Mild',remarks:'Disposable normalization test'};
async function api(role,route,body,method=body?'POST':'GET'){
 const r=await fetch(f.base+'/api'+route,{method,headers:{...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const result=await r.json();return {...result,status:r.status};
}
before(async()=>{f=await createFixture(0,{normalized:true,databaseCollation:'utf8mb4_bin'});for(const role of ['bhw','mho','admin']){const r=await api(role,'/login',{system_id:f.users[role],password:f.password});assert.equal(r.status,200);tokens[role]=r.token;}});
after(async()=>{await f?.close();});

test('physical clinical schema separates facts and migration is idempotent',async()=>{
 const [columns]=await f.db.query('SHOW COLUMNS FROM health_cases');
 for(const field of ['first_name','last_name','patient_name','birthdate','age','purok','barangay_id','disease','disease_review_status'])assert.ok(!columns.some(c=>c.Field===field),field);
 assert.equal(columns.length,12);
 const [settings]=await f.db.rawDatabase.query("SELECT COLUMN_NAME,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('case_source_records','case_records') AND COLUMN_NAME='first_name'");
 const [[original]]=await f.db.rawDatabase.query("SELECT COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='residents' AND COLUMN_NAME='first_name'");
 assert.equal(settings.length,2);for(const column of settings)assert.equal(column.COLLATION_NAME,original.COLLATION_NAME,'Moved text and read views retain source comparison rules even when the database default differs');
 const [residentColumns]=await f.db.query('SHOW COLUMNS FROM residents');assert.ok(!residentColumns.some(c=>['age','patient_name'].includes(c.Field)));
 assert.equal((await require('../services/normalize-clinical-schema').normalizeClinicalSchema(f.db.rawDatabase)).alreadyApplied,true);
 const [[counts]]=await f.db.execute('SELECT COUNT(*) AS cases_count FROM health_cases');assert.equal(counts.cases_count,4);
 const dossier=await api('mho','/mho/patients/resident/'+f.residents[0]);assert.equal(dossier.status,200);assert.equal(dossier.history.length,2);assert.equal(dossier.visits.length,12);
 const legacy=await api('mho','/mho/patients/legacy/'+f.legacy[0]);assert.equal(legacy.status,200);assert.equal(legacy.history[0].patient_name,'Historical Same Name');
});
test('normalized BHW creation derives identity and disease through references',async()=>{
 assert.equal((await api('admin','/diseases',{name:patient.disease})).status,200);
 [[{id:diseaseId}]]=await f.db.execute('SELECT id FROM disease_registry WHERE name=?',[patient.disease]);
 const saved=await api('bhw','/patients',{...patient,visit});assert.equal(saved.status,201,JSON.stringify(saved));assert.equal(saved.new_case,true);caseId=saved.id;
 const [[row]]=await f.db.execute('SELECT * FROM health_cases WHERE id=?',[caseId]);residentId=row.resident_id;
 assert.equal(row.patient_name,'Normalized Workflow Jr.');assert.equal(row.disease,patient.disease);assert.equal(row.disease_id,diseaseId);assert.equal(row.age,31);
 const [[physical]]=await f.db.rawDatabase.execute('SELECT * FROM health_cases WHERE id=?',[caseId]);assert.equal(physical.disease,undefined);assert.equal(physical.first_name,undefined);
 const [[source]]=await f.db.rawDatabase.execute('SELECT COUNT(*) AS n FROM case_source_records WHERE case_id=?',[caseId]);assert.equal(source.n,0,'New catalog cases do not copy identity or catalog labels');
});
test('follow-up and admission add visits, preserve original case and keep barangay checks',async()=>{
 const before=(await f.db.execute('SELECT * FROM health_cases WHERE id=?',[caseId]))[0][0];
 for(const [nature,time] of [['Follow-up visit','10:00'],['New admission','11:00']]){
  const saved=await api('bhw','/patients',{...patient,visit:{...visit,nature_of_visit:nature,consultation_time:time,case_id:caseId}});assert.equal(saved.status,201,JSON.stringify(saved));assert.equal(saved.new_case,false);assert.equal(saved.id,caseId);
 }
 const dossier=await api('mho','/mho/patients/resident/'+residentId);assert.equal(dossier.history.length,1);assert.equal(dossier.visits.length,3);
 assert.deepEqual((await f.db.execute('SELECT * FROM health_cases WHERE id=?',[caseId]))[0][0],before);
 const matches=await api('mho','/mho/walk-in-matches',{first_name:patient.first_name,last_name:patient.last_name,suffix:patient.suffix,birthdate:patient.birthdate,barangay_id:String(f.own),consultation_date:today});assert.equal(matches.status,200);assert.ok(matches.data.some(row=>row.id===caseId));
 const mismatch=await api('bhw','/patients',{...patient,birthdate:'1994-02-03',visit:{...visit,nature_of_visit:'Follow-up visit',case_id:caseId}});assert.equal(mismatch.status,409);
});
test('unlisted review, clarification and classification operate on separated review records',async()=>{
 const saved=await api('bhw','/patients',{...patient,last_name:'Unlisted',condition_not_listed:true,reported_condition:'Synthetic source wording',condition_source:'Synthetic clinic source',visit});
 assert.equal(saved.status,201,JSON.stringify(saved));pendingId=saved.id;
 let queue=await api('mho','/mho/disease-reviews');assert.equal(queue.status,200);let row=queue.data.find(v=>v.id===pendingId);assert.ok(row);
 let result=await api('mho','/mho/disease-reviews/'+pendingId,{action:'clarification',note:'Confirm synthetic source wording.',version:row.version},'PUT');assert.equal(result.status,200,JSON.stringify(result));
 result=await api('bhw','/patients/'+pendingId+'/condition-clarification',{reported_condition:'Synthetic clarified wording',condition_source:'Synthetic corrected clinic source'},'PUT');assert.equal(result.status,200,JSON.stringify(result));
 queue=await api('mho','/mho/disease-reviews');row=queue.data.find(v=>v.id===pendingId);
 result=await api('mho','/mho/disease-reviews/'+pendingId,{action:'existing',disease_id:diseaseId,note:'Synthetic reviewed classification.',version:row.version},'PUT');assert.equal(result.status,200,JSON.stringify(result));
 const [[record]]=await f.db.execute('SELECT disease,disease_review_status,disease_reported FROM health_cases WHERE id=?',[pendingId]);assert.equal(record.disease,patient.disease);assert.equal(record.disease_review_status,'Reviewed');assert.equal(record.disease_reported,'Synthetic clarified wording');
});
test('correction, archive, restore, analytics and follow-up reads retain the API contract',async()=>{
 const form=await api('bhw','/patients/'+caseId+'/correction');assert.equal(form.status,200);
 const corrected=await api('bhw','/patients/'+caseId+'/correction',{date_recorded:today,disease:patient.disease,severity:'Monitored',reason:'Synthetic normalization correction.',version:form.data.version},'PUT');assert.equal(corrected.status,200,JSON.stringify(corrected));
 for(const action of ['archive','restore'])assert.equal((await api('bhw','/patients/'+caseId+'/'+action,{},'PUT')).status,200);
 for(const route of ['/mho/stats','/mho/trend','/mho/year-comparison','/mho/breakdown','/heatmap-data','/mho/followups','/bhw/followups']){
  const role=route.startsWith('/bhw')?'bhw':'mho';const result=await api(role,route);assert.equal(result.status,200,route+' '+JSON.stringify(result));
 }
 for(const action of ['archive','restore'])assert.equal((await api('admin','/diseases/'+diseaseId+'/'+action,{},'PUT')).status,200);
});
test('normalized daily, weekly and monthly report endpoints generate downloadable PDFs',async()=>{
 for(const [role,route] of [['bhw','/bhw/reports/daily?date='+today],['mho','/mho/reports/daily?date='+today],['mho','/mho/reports/fhsis?month=October&year=2026'],['mho','/mho/reports/pidsr?week=43&year=2026']]){
  const r=await fetch(f.base+'/api'+route,{headers:{Authorization:'Bearer '+tokens[role]}});assert.equal(r.status,200,route);assert.match(r.headers.get('content-type'),/pdf/);assert.ok((await r.arrayBuffer()).byteLength>1000);
 }
});
test('query compatibility rewrites read sources only and rejects unparameterized clinical inserts',()=>{
 assert.equal(readSql('SELECT h.id FROM health_cases h JOIN residents r ON r.id=h.resident_id'),'SELECT h.id FROM case_records h JOIN resident_records r ON r.id=h.resident_id');
 assert.equal(readSql('UPDATE health_cases SET status=? WHERE id=?'),'UPDATE health_cases SET status=? WHERE id=?');
 assert.equal(readSql('SELECT * FROM `health_cases` WHERE id=?'),'SELECT * FROM case_records WHERE id=?');
 assert.throws(()=>parseInsert("INSERT INTO residents(first_name) VALUES('unsafe')",[]));
 assert.deepEqual(parseUpdate("UPDATE health_cases SET status=?,deleted_at=NOW() WHERE id=?",['Cleared',9]).params,[9]);
});
test('MHO can approve a new catalog condition; archive status is derived rather than independently writable',async()=>{
 const saved=await api('bhw','/patients',{...patient,last_name:'NewReviewed',condition_not_listed:true,reported_condition:'Synthetic newly reviewed condition',condition_source:'Synthetic clinic source',visit});assert.equal(saved.status,201);
 const row=(await api('mho','/mho/disease-reviews')).data.find(v=>v.id===saved.id);
 const reviewed=await api('mho','/mho/disease-reviews/'+saved.id,{action:'new',name:'Synthetic New Normalized Catalog',note:'Synthetic source reviewed.',version:row.version},'PUT');assert.equal(reviewed.status,200,JSON.stringify(reviewed));
 const [[record]]=await f.db.execute('SELECT disease,disease_review_status FROM health_cases WHERE id=?',[saved.id]);assert.equal(record.disease,'Synthetic New Normalized Catalog');assert.equal(record.disease_review_status,'Reviewed');
 const [columns]=await f.db.query('SHOW COLUMNS FROM disease_registry');assert.match(columns.find(c=>c.Field==='is_archived').Extra,/GENERATED/);
});
test('twenty simultaneous normalized saves keep one case and one initial visit per request',async()=>{
 const start=Date.now();
 const results=await Promise.all(Array.from({length:20},(_,i)=>api('bhw','/patients',{...patient,last_name:'Concurrent '+i,visit})));
 for(const result of results)assert.equal(result.status,201,JSON.stringify(result));
 const ids=results.map(r=>r.id),marks=ids.map(()=>'?').join(',');
 const [[counts]]=await f.db.execute(`SELECT COUNT(*) AS n FROM health_cases WHERE id IN (${marks})`,ids);assert.equal(counts.n,20);
 const [[visits]]=await f.db.execute(`SELECT COUNT(*) AS n FROM case_visits WHERE case_id IN (${marks})`,ids);assert.equal(visits.n,20);
 assert.ok(Date.now()-start<30000,'Concurrent workflow should complete within 30 seconds locally');
});
test('infant age zero is derived without storing a duplicated age field',async()=>{
 const saved=await api('bhw','/patients',{...patient,last_name:'Infant',birthdate:today,visit});assert.equal(saved.status,201);
 const [[row]]=await f.db.execute('SELECT age,birthdate FROM health_cases WHERE id=?',[saved.id]);assert.equal(row.age,0);
 const [[physical]]=await f.db.rawDatabase.execute('SELECT * FROM health_cases WHERE id=?',[saved.id]);assert.equal(physical.age,undefined);
});
test('normalized resident death review stays separate from case outcome and preserves history',async()=>{
 const status=await api('bhw','/patients/'+caseId+'/status',{new_status:'Deceased',remarks:'Synthetic outcome only.'},'PUT');assert.equal(status.status,200,JSON.stringify(status));
 let dossier=await api('bhw','/residents/'+residentId+'/dossier');assert.equal(dossier.resident.is_deceased,0);
 const reported=await api('bhw','/residents/'+residentId+'/death-report',{death_date:today,source:'Synthetic verified source',note:'Synthetic review only.'});assert.equal(reported.status,200,JSON.stringify(reported));
 const reviewed=await api('mho','/mho/death-reports/'+reported.id+'/review',{action:'confirm',reason:'Synthetic source verification.'},'PUT');assert.equal(reviewed.status,200,JSON.stringify(reviewed));
 dossier=await api('mho','/mho/patients/resident/'+residentId);assert.equal(dossier.resident.is_deceased,1);assert.equal(dossier.history.length,1);assert.equal(dossier.visits.length,3);
});
