const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const {createFixture}=require('./helpers/directory-session-fixture');
const {todayInManila}=require('../services/patient-validation');
let f,caseId,residentId,original;const tokens={},today=todayInManila();
const day=offset=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
const patient={first_name:'Workflow',last_name:'Rehearsal',suffix:'',birthdate:'1990-05-10',purok:'QA Zone',disease:'Synthetic Rehearsal Disease',date_recorded:day(-1),severity:'Mild',remarks:'Disposable synthetic workflow only'};
const visit={transaction_mode:'Walk-in',nature_of_visit:'New consultation/case',consultation_time:'09:00',blood_pressure:'120/80',temperature_c:'36.5',height_cm:'165',weight_kg:'60',next_followup_date:today,followup_instructions:'Synthetic initial return advice.'};
async function api(role,path,body){const r=await fetch(f.base+'/api'+path,{method:body?'POST':'GET',headers:{...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const result=await r.json();assert.ok(r.ok,role+' workflow step failed');return result;}
before(async()=>{f=await createFixture();for(const role of ['bhw','mho'])tokens[role]=(await api(role,'/login',{system_id:f.users[role],password:f.password})).token;await f.db.execute("INSERT INTO disease_registry(name,status,is_archived) VALUES('Synthetic Rehearsal Disease','Active',0)");});
after(async()=>{await f?.close();});
test('rehearsal: BHW creates one case with an initial plan; both roles see the same due-today plan',async()=>{
    const saved=await api('bhw','/patients',{...patient,visit});assert.equal(saved.new_case,true);caseId=saved.id;
    [[original]]=await f.db.execute('SELECT * FROM health_cases WHERE id=?',[caseId]);residentId=original.resident_id;assert.ok(residentId);
    for(const role of ['bhw','mho']){const row=(await api(role,'/'+role+'/followups?q=REC-'+caseId)).data.find(v=>v.case_id===caseId);assert.ok(row);assert.equal(row.next_followup_date,today);assert.equal(row.visit_id,saved.visit_id);assert.equal(row.can_record,true);}
});
test('rehearsal: MHO records a return on the same case, replacing the initial plan with a future review',async()=>{
    const saved=await api('mho','/mho/walk-in-cases',{...patient,barangay_id:f.own,date_recorded:today,visit:{...visit,case_id:caseId,nature_of_visit:'Follow-up visit',consultation_time:'10:00',next_followup_date:day(7),followup_instructions:'Synthetic new review advice.'}});assert.equal(saved.new_case,false);assert.equal(saved.id,caseId);
    for(const role of ['bhw','mho']){assert.equal((await api(role,'/'+role+'/followups?q=REC-'+caseId)).data.length,0);const rows=(await api(role,'/'+role+'/followups?bucket=upcoming&q=REC-'+caseId)).data;assert.equal(rows.length,1);assert.equal(rows[0].visit_id,saved.visit_id);}
    const bhw=await api('bhw','/residents/'+residentId+'/dossier'),mho=await api('mho','/mho/patients/resident/'+residentId);
    for(const dossier of [bhw,mho]){assert.equal(dossier.history.length,1);assert.equal(dossier.visits.length,2);assert.ok(dossier.visits.some(v=>v.next_followup_date===today&&v.followup_instructions===visit.followup_instructions));assert.ok(dossier.visits.some(v=>v.next_followup_date===day(7)&&v.encoded_by===f.users.mho));}
    assert.deepEqual((await f.db.execute('SELECT * FROM health_cases WHERE id=?',[caseId]))[0][0],original);
});
test('rehearsal: another recorded consultation without a new date ends pending tracking and preserves all three visits',async()=>{
    const saved=await api('bhw','/patients',{...patient,date_recorded:today,visit:{...visit,case_id:caseId,nature_of_visit:'New admission',consultation_time:'11:00',next_followup_date:null,followup_instructions:''}});assert.equal(saved.new_case,false);assert.equal(saved.id,caseId);
    for(const role of ['bhw','mho'])for(const bucket of ['today','upcoming','past'])assert.equal((await api(role,'/'+role+'/followups?bucket='+bucket+'&q=REC-'+caseId)).data.length,0);
    const dossier=await api('mho','/mho/patients/resident/'+residentId);assert.equal(dossier.history.length,1);assert.equal(dossier.visits.length,3);assert.equal(dossier.visits.filter(v=>v.next_followup_date).length,2);
    const [[counts]]=await f.db.execute('SELECT COUNT(*) cases,COUNT(DISTINCT resident_id) residents FROM health_cases WHERE resident_id=?',[residentId]);assert.equal(counts.cases,1);assert.equal(counts.residents,1);assert.deepEqual((await f.db.execute('SELECT * FROM health_cases WHERE id=?',[caseId]))[0][0],original);
});
