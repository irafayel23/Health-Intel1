const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const age=require('../services/age-groups');
const {createFixture}=require('./helpers/directory-session-fixture');
const {withConsultation}=require('./helpers/consultation-fixture');
const {dailyReportData,dailyReportPdf}=require('../services/daily-report');
const {createReportData}=require('../services/report-data');
let f;const tokens={};
async function api(role,route,body){const r=await fetch(f.base+'/api'+route,{method:body?'POST':'GET',headers:{...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
before(async()=>{f=await createFixture();for(const role of ['bhw','mho']){const login=await api(role,'/login',{system_id:f.users[role],password:f.password});assert.equal(login.status,200);tokens[role]=login.token;}await f.db.execute("INSERT INTO disease_registry(name,status,is_archived) VALUES('Synthetic Age Disease','Active',0)");});
after(async()=>{await f?.close();});

test('age groups include infants and every boundary; missing and invalid values never become zero',()=>{
 for(const [n,group] of [[0,'0-5'],[5,'0-5'],[6,'6-12'],[12,'6-12'],[13,'13-17'],[17,'13-17'],[18,'18-59'],[59,'18-59'],[60,'60+'],[130,'60+']])assert.equal(age.group(n),group);
 for(const n of [null,undefined,'',' ',false,true,-1,131,2.5,'unknown'])assert.equal(age.group(n),'Not recorded');
 assert.equal(age.ageOnDate('2020-10-17','2026-10-16'),5);assert.equal(age.ageOnDate('2020-10-17','2026-10-17'),6);
 assert.equal(age.ageOnDate('2024-02-29','2025-02-28'),0);assert.equal(age.ageOnDate('2024-02-29','2025-03-01'),1);
 assert.equal(age.ageOnDate('2024-02-30','2025-03-01'),null);assert.equal(age.ageOnDate('2026-10-18','2026-10-17'),null);
 assert.equal(age.caseFields({birthdate:null,age:0}).age_group,'0-5');assert.equal(age.visitFields({birthdate:null,age:5,consultation_date:'2026-10-17'}).age_group,'Not recorded');
});

test('birthday between case and follow-up changes visit group while preserving original case group across BHW/MHO histories and reports',async()=>{
 const body=withConsultation({first_name:'AgeQA',last_name:'Birthday',birthdate:'2020-10-17',purok:'Synthetic Zone',disease:'Synthetic Age Disease',severity:'Mild',date_recorded:'2026-10-16'});
 const saved=await api('bhw','/patients',body);assert.equal(saved.status,201,JSON.stringify(saved));
 const returned=await api('bhw','/patients',{...body,date_recorded:'2026-10-17',visit:{...body.visit,nature_of_visit:'Follow-up visit',case_id:saved.id}});assert.equal(returned.status,201,JSON.stringify(returned));
 const patient=(await api('bhw','/patients')).data.find(row=>row.id===saved.id);assert.equal(patient.age_at_case,5);assert.equal(patient.age_group,'0-5');
 const histories=[await api('bhw','/residents/'+patient.resident_id+'/dossier'),await api('mho','/mho/patients/resident/'+patient.resident_id)];
 for(const dossier of histories){assert.equal(dossier.status,200);const record=dossier.history.find(row=>row.id===saved.id);assert.equal(record.age_group,'0-5');const visits=dossier.visits.filter(row=>row.case_id===saved.id);assert.equal(visits.length,2);assert.equal(visits.find(row=>row.consultation_date==='2026-10-16').age_group,'0-5');assert.equal(visits.find(row=>row.consultation_date==='2026-10-17').age_group,'6-12');}
 const visits=await api('bhw','/patients/'+saved.id+'/visits');assert.equal(visits.data[0].age_at_visit,6);assert.equal(visits.data[0].age_group,'6-12');
 const user={role:'bhw',barangay_id:f.own};
 const daily=await dailyReportData(f.db,user,{start:'2026-10-17',end:'2026-10-18'});assert.equal(daily.caseCount,0);assert.equal(daily.visitCount,1);assert.equal(daily.visits[0].age_group,'6-12');
 const monthly=await createReportData(f.db).monthly({start:'2026-10-01',end:'2026-11-01'});assert.equal(monthly.find(row=>row.disease===body.disease).age_group,'0-5');
 const weekly=await createReportData(f.db).weekly({start:'2026-10-12',end:'2026-10-19'});assert.equal(weekly.find(row=>row.disease===body.disease).age_group,'0-5');
 // Existing stale age must not override the birthdate/case-date calculation.
 await f.db.execute('UPDATE health_cases SET age=99 WHERE id=?',[saved.id]);
 const stats=await api('mho','/mho/stats?year=2026&age=0-5&barangay='+encodeURIComponent('Synthetic Barangay A'));assert.equal(stats.status,200);assert.equal(stats.data.find(row=>row.disease===body.disease).cases,1);
 const senior=await api('mho','/mho/stats?year=2026&age=60%2B&barangay='+encodeURIComponent('Synthetic Barangay A'));assert.ok(!senior.data.some(row=>row.disease===body.disease));
 const exportRows=await api('bhw','/bhw/report-data?type=MONTHLY&month=October&year=2026');assert.equal(exportRows.status,200);assert.equal(exportRows.data.find(row=>row.id===saved.id).age_group,'0-5');
});

test('legacy unknown ages stay visible as Not recorded in grouped exports instead of being counted as infants',async()=>{
 await f.db.execute("INSERT INTO health_cases(patient_name,barangay_id,disease,date_recorded,status,severity,age,birthdate,encoded_by) VALUES('Synthetic Unknown Age',?,'Synthetic Age Unknown','2026-10-17','Active','Mild',NULL,NULL,?)",[f.own,f.users.bhw]);
 const rows=(await api('bhw','/patients')).data,unknown=rows.find(row=>row.disease==='Synthetic Age Unknown');assert.equal(unknown.age_at_case,null);assert.equal(unknown.age_group,'Not recorded');
 const daily=await dailyReportData(f.db,{role:'bhw',barangay_id:f.own},{start:'2026-10-17',end:'2026-10-18'});assert.equal(daily.cases.find(row=>row.condition_label==='Synthetic Age Unknown').age_group,'Not recorded');
 const monthly=await createReportData(f.db).monthly({start:'2026-10-01',end:'2026-11-01'});assert.equal(monthly.find(row=>row.disease==='Synthetic Age Unknown').age_group,'Not recorded');
 const sqlResult=(await f.db.execute(`SELECT ${age.ageGroupSql(age.caseAgeSql('h'))} AS age_group FROM health_cases h WHERE h.id=?`,[unknown.id]))[0][0];assert.equal(sqlResult.age_group,'Not recorded');
});
