const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createFixture}=require('./helpers/directory-session-fixture');
const {todayInManila}=require('../services/patient-validation');
const {listFollowups}=require('../services/followup-tracking');
let f,today,ownCase,ownResident;const tokens={};
const day=offset=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
async function request(role,route,body){const r=await fetch(f.base+'/api'+route,{method:body?'POST':'GET',headers:{...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};}
async function seed(name,barangay,due,{status='Active',archived=0,deceased=false}={}){
    const [r]=await f.db.execute("INSERT INTO residents(first_name,last_name,suffix,patient_name,birthdate,age,purok,barangay_id) VALUES(?,'Tracking','','Synthetic tracking patient','1990-05-10',36,'QA Zone',?)",[name,barangay]);
    await f.db.execute('UPDATE residents SET patient_name=? WHERE id=?',[name+' Tracking',r.insertId]);
    const [c]=await f.db.execute("INSERT INTO health_cases(resident_id,first_name,last_name,suffix,patient_name,birthdate,age,purok,barangay_id,disease,date_recorded,status,severity,is_archived,encoded_by) VALUES(?,?,'Tracking','',?,'1990-05-10',36,'QA Zone',?,'Synthetic Disease A',?,?,'Mild',?,?)",[r.insertId,name,name+' Tracking',barangay,day(-14),status,archived,f.users.bhw]);
    const v=await addVisit(c.insertId,day(-7),due);
    if(deceased)await f.db.execute('INSERT INTO resident_vital_status(resident_id,is_deceased,death_date,confirmed_by,version) VALUES(?,1,?,?,1)',[r.insertId,day(-1),f.users.mho]);
    return {caseId:c.insertId,residentId:r.insertId,visitId:v};
}
async function addVisit(caseId,date,due,time=null){const [v]=await f.db.execute("INSERT INTO case_visits(case_id,consultation_date,consultation_time,transaction_mode,nature_of_visit,next_followup_date,followup_instructions,severity,encoded_by) VALUES(?,?,?,'Walk-in','Follow-up visit',?,'Synthetic instructions only','Mild',?)",[caseId,date,time,due,f.users.bhw]);return v.insertId;}
before(async()=>{
    f=await createFixture();today=todayInManila();
    for(const role of ['bhw','mho','admin','superadmin']){const r=await request(role,'/login',{system_id:f.users[role],password:f.password});assert.equal(r.status,200);tokens[role]=r.body.token;}
    await f.db.execute("INSERT INTO disease_registry(name,status,is_archived) VALUES('Synthetic Disease A','Active',0)");
    const primary=await seed('Due',f.own,today);ownCase=primary.caseId;ownResident=primary.residentId;
    await seed('Upcoming',f.own,day(7));await seed('Past',f.own,day(-1));await seed('Other',f.other,today);
    await seed('Archived',f.own,today,{archived:1});await seed('Resident deceased',f.own,today,{deceased:true});await seed('Case deceased',f.own,today,{status:'Deceased'});await seed('Cleared review',f.own,day(7),{status:'Cleared'});
});
after(async()=>{await f?.close();});

test('tracking uses the Philippines date, one latest plan per case, and scoped counts across all buckets',async()=>{
    const result=await request('bhw','/bhw/followups');assert.equal(result.status,200);assert.equal(result.body.today,today);assert.deepEqual(result.body.counts,{today:1,upcoming:2,past:1});assert.equal(result.body.data.length,1);
    const row=result.body.data[0];assert.equal(row.case_id,ownCase);assert.equal(row.next_followup_date,today);assert.equal(row.can_record,true);assert.equal(row.followup_instructions,'Synthetic instructions only');assert.ok(!Object.hasOwn(row,'rb')&&!Object.hasOwn(row,'birthdate'));
    for(const [bucket,count] of [['today',1],['upcoming',2],['past',1]]){const r=await request('bhw','/bhw/followups?bucket='+bucket);assert.equal(r.body.total,count);assert.equal(new Set(r.body.data.map(v=>v.case_id)).size,count);assert.ok(r.body.data.every(v=>v.barangay_id===f.own));}
    const mho=await request('mho','/mho/followups');assert.equal(mho.body.counts.today,2);
    assert.equal((await request('mho','/mho/followups?barangay_id='+f.other)).body.total,1);
});
test('anonymous, cross-role and cross-barangay requests are denied; malformed filters cannot widen the query',async()=>{
    assert.equal((await request('anonymous','/bhw/followups')).status,401);
    for(const role of ['admin','superadmin'])for(const scope of ['bhw','mho'])assert.equal((await request(role,'/'+scope+'/followups')).status,403);
    assert.equal((await request('mho','/bhw/followups')).status,403);assert.equal((await request('bhw','/mho/followups')).status,403);
    assert.equal((await request('bhw','/bhw/followups?barangay_id='+f.other)).status,403);
    for(const query of ['bucket=unknown','page=-1','page=1.5','q=a&q=b','q='+('x'.repeat(101))])assert.equal((await request('bhw','/bhw/followups?'+query)).status,400);
    assert.equal((await request('mho','/mho/followups?barangay_id=bad')).status,400);
    const direct=await listFollowups(f.db,{role:'bhw',barangay_id:f.own},{barangay_id:f.other});assert.equal(direct.total,1);assert.ok(direct.data.every(v=>v.barangay_id===f.own));
});
test('recorded returns clear or replace pending plans without changing original cases, residents, reports or previous advice',async()=>{
    const [[original]]=await f.db.execute('SELECT * FROM health_cases WHERE id=?',[ownCase]),[[counts]]=await f.db.query('SELECT (SELECT COUNT(*) FROM health_cases) cases,(SELECT COUNT(*) FROM residents) residents');
    const patient={first_name:'Due',last_name:'Tracking',suffix:'',birthdate:'1990-05-10',purok:'QA Zone',date_recorded:today,disease:'Synthetic Disease A',severity:'Mild',remarks:'Synthetic return only'};
    const visit={case_id:ownCase,transaction_mode:'Walk-in',nature_of_visit:'Follow-up visit',consultation_time:'10:00',blood_pressure:'120/80',temperature_c:'36.5',height_cm:'165',weight_kg:'60'};
    const saved=await request('bhw','/patients',{...patient,visit});assert.equal(saved.status,201);assert.equal(saved.body.new_case,false);assert.equal((await request('bhw','/bhw/followups')).body.total,0);
    const next=await request('mho','/mho/walk-in-cases',{...patient,barangay_id:f.own,visit:{...visit,consultation_time:'11:00',next_followup_date:day(8),followup_instructions:'Synthetic new plan'}});assert.equal(next.status,201);
    const pending=(await request('bhw','/bhw/followups?bucket=upcoming')).body.data.filter(v=>v.case_id===ownCase);assert.equal(pending.length,1);assert.equal(pending[0].next_followup_date,day(8));assert.equal(pending[0].visit_id,next.body.visit_id);
    const history=(await request('bhw','/residents/'+ownResident+'/dossier')).body;assert.ok(history.visits.some(v=>v.case_id===ownCase&&v.next_followup_date===today&&v.followup_instructions==='Synthetic instructions only'));
    assert.deepEqual((await f.db.execute('SELECT * FROM health_cases WHERE id=?',[ownCase]))[0][0],original);assert.deepEqual((await f.db.query('SELECT (SELECT COUNT(*) FROM health_cases) cases,(SELECT COUNT(*) FROM residents) residents'))[0][0],counts);
});
test('backdated entries cannot reactivate an old plan, and same-day unknown-time returns supersede the previous saved plan',async()=>{
    const old=await addVisit(ownCase,day(-3),day(2),'23:59');
    assert.ok(!(await request('bhw','/bhw/followups?bucket=upcoming')).body.data.some(v=>v.case_id===ownCase&&v.visit_id===old));
    await addVisit(ownCase,today,null);assert.ok(!(await request('bhw','/bhw/followups?bucket=upcoming')).body.data.some(v=>v.case_id===ownCase));
});
test('each case keeps its own plan; unlinked or conflicting identities are visible for review but cannot use the return shortcut',async()=>{
    const another=await seed('Due',f.own,day(3));await f.db.execute('UPDATE health_cases SET resident_id=? WHERE id=?',[ownResident,another.caseId]);
    await addVisit(ownCase,today,day(4));
    const ownPlans=(await request('bhw','/bhw/followups?bucket=upcoming')).body.data.filter(v=>v.resident_id===ownResident);assert.equal(ownPlans.length,2);assert.equal(new Set(ownPlans.map(v=>v.case_id)).size,2);assert.ok(ownPlans.every(v=>v.can_record));
    await f.db.execute("UPDATE health_cases SET first_name='Different' WHERE id=?",[another.caseId]);
    const row=(await request('bhw','/bhw/followups?bucket=upcoming')).body.data.find(v=>v.case_id===another.caseId);assert.equal(row.can_record,false);assert.match(row.blocked_reason,/identity/);
    await f.db.execute('UPDATE health_cases SET resident_id=NULL WHERE id=?',[another.caseId]);const legacy=(await request('mho','/mho/followups?bucket=upcoming')).body.data.find(v=>v.case_id===another.caseId);assert.equal(legacy.can_record,false);
});
test('filtered queues paginate on the server, clamp stale pages and escape SQL search wildcards',async()=>{
    for(let i=0;i<25;i++)await seed('Page '+String(i+1).padStart(2,'0'),f.own,today);
    const one=(await request('bhw','/bhw/followups?q=Page')).body,two=(await request('bhw','/bhw/followups?q=Page&page=2')).body,last=(await request('bhw','/bhw/followups?q=Page&page=999')).body;
    assert.equal(one.total,25);assert.equal(one.data.length,12);assert.equal(one.page_count,3);assert.equal(two.data.length,12);assert.equal(last.data.length,1);assert.equal(last.page,3);assert.ok(!one.data.some(a=>two.data.some(b=>a.case_id===b.case_id)));assert.equal(one.counts.today,25);
    for(const query of ['%','_','!'])assert.equal((await request('bhw','/bhw/followups?q='+encodeURIComponent(query))).body.total,0);
});
test('frontend chronology uses the same date and saved-visit tie rule as the API without mutating history',()=>{
    const context={document:{addEventListener(){}},HealthIntelEncoding:{escape:String}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../assets/js/shared/followup-tracking.js'),'utf8'),context);
    const rows=[{case_id:1,id:3,consultation_date:'2026-10-10'},{case_id:1,id:2,consultation_date:'2026-10-12'},{case_id:1,id:4,consultation_date:'2026-10-12'},{case_id:2,id:5,consultation_date:'2026-10-14'}],before=JSON.stringify(rows);
    assert.equal(context.HealthIntelFollowups.latestVisit(rows,1).id,4);assert.equal(JSON.stringify(rows),before);
});
