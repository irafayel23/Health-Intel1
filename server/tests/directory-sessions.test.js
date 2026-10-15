const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),jwt=require('jsonwebtoken');
const {createFixture}=require('./helpers/directory-session-fixture');
let fixture;const tokens={};
async function request(route,role='mho',body,method){return fetch(fixture.base+'/api'+route,{method:method||(body?'POST':'GET'),headers:{...(role?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function login(role){const r=await request('/login',null,{system_id:fixture.users[role],password:fixture.password});assert.equal(r.status,200);return (await r.json()).token;}
before(async()=>{fixture=await createFixture();for(const role of Object.keys(fixture.users))tokens[role]=await login(role);});
after(async()=>{await fixture?.close();});
test('session checks tolerate different collations on users and session epochs',async()=>{
    const [[column]]=await fixture.db.query("SHOW FULL COLUMNS FROM users WHERE Field='system_id'");
    const alternate=column.Collation==='utf8mb4_unicode_ci'?'utf8mb4_general_ci':'utf8mb4_unicode_ci';
    await fixture.db.query('ALTER TABLE account_session_epochs MODIFY system_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE '+alternate+' NOT NULL');
    for(const id of Object.values(fixture.users))await fixture.db.execute('INSERT INTO account_session_epochs(system_id,epoch) VALUES(?,0)',[id]);
    for(const role of Object.keys(fixture.users))assert.equal((await request('/session',role)).status,200);
});
test('municipal directory is MHO-only, paged, and includes other barangays and archived legacy entries',async()=>{
    for(const role of ['bhw','admin','superadmin',null])for(const route of ['/mho/patients','/mho/patients/resident/'+fixture.residents[0],'/mho/patients/legacy/'+fixture.legacy[0]])assert.equal((await request(route,role)).status,role?403:401);
    const first=await (await request('/mho/patients')).json(),second=await (await request('/mho/patients?page=2')).json();assert.equal(first.total,34);assert.equal(first.data.length,25);assert.equal(second.data.length,9);assert.equal(first.page_count,2);
    const all=[...first.data,...second.data];assert.equal(new Set(all.map(r=>r.kind+':'+r.id)).size,34);assert.equal(all.filter(r=>r.kind==='legacy').length,2);
    const person=all.find(r=>r.kind==='resident'&&r.id===fixture.residents[0]);assert.equal(person.case_count,2);assert.equal(person.active_count,1);assert.equal(person.archived_count,1);assert.equal(person.last_consultation,'2025-01-12');
    const filtered=await (await request('/mho/patients?barangay_id='+fixture.other)).json();assert.equal(filtered.total,18);assert.ok(filtered.data.every(r=>r.barangay_id===fixture.other));
});
test('directory searches treat wildcard characters literally and validate filters',async()=>{
    for(const q of ['%','_','!'])assert.equal((await (await request('/mho/patients?q='+encodeURIComponent(q))).json()).total,0);
    const found=await (await request('/mho/patients?q=Cruz')).json();assert.equal(found.total,1);assert.equal(found.data[0].suffix,'Jr.');
    assert.equal((await (await request('/mho/patients?q=RES-'+fixture.residents[0])).json()).total,1);
    for(const query of ['page=0','page=-1','page=1.5','barangay_id=oops','vital=deleted','q='+('x'.repeat(101))])assert.equal((await request('/mho/patients?'+query)).status,400);
    const deceased=await (await request('/mho/patients?vital=deceased')).json();assert.equal(deceased.total,1);assert.equal(deceased.data[0].death_date,'2025-06-01');
    const living=await (await request('/mho/patients?vital=living')).json();assert.equal(living.total,31);assert.ok(living.data.every(r=>r.kind==='resident'&&!r.is_deceased));
});
test('MHO patient history retains archived cases and all visits without merging unlinked names',async()=>{
    const profile=await (await request('/mho/patients/resident/'+fixture.residents[0])).json();assert.equal(profile.history.length,2);assert.ok(profile.history.some(r=>r.is_archived));assert.equal(profile.visits.length,12);assert.ok(profile.visits.some(r=>r.nature_of_visit==='New admission'));assert.ok(profile.visits.some(r=>r.nature_of_visit==='Follow-up visit'));assert.equal(profile.visits[0].blood_pressure,'120/80');
    const legacy=await (await request('/mho/patients/legacy/'+fixture.legacy[0])).json();assert.equal(legacy.history.length,1);assert.equal(legacy.history[0].id,fixture.legacy[0]);assert.equal(legacy.resident.is_deceased,null);
    const empty=await (await request('/mho/patients/resident/'+fixture.residents[2])).json();assert.deepEqual(empty.history,[]);assert.deepEqual(empty.visits,[]);
    assert.equal((await request('/mho/patients/legacy/'+fixture.cases[0])).status,404);assert.equal((await request('/mho/patients/resident/999999999')).status,404);
});
test('directory return-visit target is rechecked even beyond the latest 50 cases and saves only a visit',async()=>{
    const identity={first_name:'Elena',last_name:'Cruz',suffix:'Jr.',birthdate:'1990-05-10',barangay_id:String(fixture.own),consultation_date:'2025-02-01'};
    const extras=[];
    try{
        for(let i=0;i<51;i++){
            const [r]=await fixture.db.execute("INSERT INTO health_cases(resident_id,first_name,last_name,suffix,patient_name,birthdate,age,purok,barangay_id,disease,date_recorded,status,severity,is_archived,encoded_by) VALUES(?,'Elena','Cruz','Jr.','Elena Cruz Jr.','1990-05-10',34,'Purok 1',?,'Synthetic extra case','2025-01-31','Active','Mild',0,?)",[fixture.residents[0],fixture.own,fixture.users.bhw]);extras.push(r.insertId);
        }
        const ordinary=await (await request('/mho/walk-in-matches','mho',identity)).json();assert.equal(ordinary.data.length,50);assert.ok(!ordinary.data.some(r=>r.id===fixture.cases[0]));
        const targeted={...identity,case_id:fixture.cases[0]};
        assert.deepEqual((await (await request('/mho/walk-in-matches','mho',targeted)).json()).data.map(r=>r.id),[fixture.cases[0]]);
        for(const altered of [{first_name:'Another'},{case_id:fixture.cases[1]},{case_id:fixture.legacy[0]}])assert.equal((await (await request('/mho/walk-in-matches','mho',{...targeted,...altered})).json()).data.length,0);
        assert.equal((await request('/mho/walk-in-matches','mho',{...identity,case_id:'1'})).status,400);
        assert.equal((await request('/mho/walk-in-matches','bhw',targeted)).status,403);
        const [[before]]=await fixture.db.execute('SELECT COUNT(*) AS total FROM health_cases');
        const payload={...identity,barangay_id:fixture.own,date_recorded:identity.consultation_date,purok:'Purok 1',disease:'Synthetic Disease A',severity:'Monitored',remarks:'Synthetic new visit only',status:'Active',visit:{case_id:fixture.cases[0],nature_of_visit:'Follow-up visit',transaction_mode:'Walk-in',consultation_time:'14:15',blood_pressure:'125/85',temperature_c:'37',height_cm:'165',weight_kg:'61'}};
        assert.equal((await request('/mho/walk-in-cases','mho',{...payload,visit:{...payload.visit,blood_pressure:''}})).status,400);
        const saved=await request('/mho/walk-in-cases','mho',payload);assert.equal(saved.status,201);const result=await saved.json();assert.equal(result.new_case,false);assert.equal(result.id,fixture.cases[0]);
        assert.equal((await request('/mho/walk-in-cases','mho',payload)).status,409);
        const admitted=await request('/mho/walk-in-cases','mho',{...payload,visit:{...payload.visit,nature_of_visit:'New admission'}});assert.equal(admitted.status,201);assert.equal((await admitted.json()).new_case,false);
        const [[after]]=await fixture.db.execute('SELECT COUNT(*) AS total FROM health_cases');assert.equal(after.total,before.total);
        const profile=await (await request('/mho/patients/resident/'+fixture.residents[0])).json();assert.equal(profile.visits.length,14);assert.ok(profile.visits.some(v=>v.nature_of_visit==='Follow-up visit'&&v.blood_pressure==='125/85'));
        const original=profile.history.find(h=>h.id===fixture.cases[0]);assert.equal(original.severity,'Mild');assert.equal(original.date_recorded,'2025-01-01');assert.equal(original.status,'Active');
    }finally{if(extras.length)await fixture.db.execute('DELETE FROM health_cases WHERE id IN ('+extras.map(()=>'?').join(',')+')',extras);}
});
test('logout persists server revocation, cannot be replayed, and keeps a separate login active',async()=>{
    const old=tokens.mho,other=await login('mho');assert.notEqual(old,other,'Each login has its own token');
    assert.equal((await request('/logout','mho',{},'POST')).status,200);assert.equal((await request('/session','mho')).status,401);
    const {createAccessControl}=require('../middleware/access-control');const app=require('express')();app.use('/api',createAccessControl(fixture.db,fixture.secret));app.get('/api/session',(_,res)=>res.json({success:true}));const fresh=app.listen(0,'127.0.0.1');await new Promise(r=>fresh.once('listening',r));
    try{assert.equal((await fetch('http://127.0.0.1:'+fresh.address().port+'/api/session',{headers:{Authorization:'Bearer '+old}})).status,401,'Revocation survives a new access-control instance');}finally{await new Promise(r=>fresh.close(r));}
    tokens.mho=other;assert.equal((await request('/session')).status,200);
    const [revocations]=await fixture.db.query('SELECT token_hash,expires_at FROM revoked_api_sessions');assert.ok(revocations.length);assert.ok(revocations.every(row=>/^[a-f0-9]{64}$/.test(row.token_hash)&&row.token_hash!==old),'Raw tokens must not be stored');
});
test('suspend and restore invalidate all older sessions, but a new login works',async()=>{
    const old=tokens.bhw,other=await login('bhw');
    assert.equal((await request('/admin/suspend-user','admin',{system_id:fixture.users.bhw})).status,200);assert.equal((await request('/session','bhw')).status,401);
    assert.equal((await request('/admin/restore-suspended','admin',{system_id:fixture.users.bhw})).status,200);assert.equal((await request('/session','bhw')).status,401);
    tokens.bhw=other;assert.equal((await request('/session','bhw')).status,401);tokens.bhw=await login('bhw');assert.equal((await request('/session','bhw')).status,200);assert.notEqual(tokens.bhw,old);
});
test('failed status audit rolls back the epoch together with status',async()=>{
    const [[before]]=await fixture.db.execute('SELECT epoch FROM account_session_epochs WHERE system_id=?',[fixture.users.bhw]);
    await fixture.db.query('RENAME TABLE system_audit_logs TO directory_audit_hold');
    try{assert.equal((await request('/admin/suspend-user','admin',{system_id:fixture.users.bhw})).status,503);const [[after]]=await fixture.db.execute('SELECT epoch FROM account_session_epochs WHERE system_id=?',[fixture.users.bhw]);assert.equal(after.epoch,before.epoch);assert.equal((await request('/session','bhw')).status,200);}finally{await fixture.db.query('RENAME TABLE directory_audit_hold TO system_audit_logs');}
});
test('session tokens require an expiry and invalid epochs fail closed',async()=>{
    const valid=jwt.verify(tokens.mho,fixture.secret);delete valid.exp;delete valid.iat;
    for(const token of [jwt.sign(valid,fixture.secret),jwt.sign({...valid,session_epoch:-1},fixture.secret,{expiresIn:'1h'}),jwt.sign({...valid,session_epoch:'0'},fixture.secret,{expiresIn:'1h'})]){
        const r=await fetch(fixture.base+'/api/session',{headers:{Authorization:'Bearer '+token}});assert.equal(r.status,401);
    }
});
