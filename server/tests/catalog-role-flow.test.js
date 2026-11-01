// Exercise real local HTTP endpoints with disposable accounts and synthetic records only.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {createFixture}=require('./helpers/directory-session-fixture');
const {withConsultation}=require('./helpers/consultation-fixture');
const {PENDING_DISEASE}=require('../services/disease-review');
let f,catalogId;
const tokens={};
async function api(role,route,body,method=body?'POST':'GET'){
    const response=await fetch(f.base+'/api'+route,{method,headers:{...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,...await response.json()};
}
function patient(last,condition){return withConsultation({first_name:'CatalogQA',last_name:last,suffix:'',birthdate:'1995-02-03',purok:'Synthetic Test Zone',date_recorded:'2026-10-17',severity:'Monitored',remarks:'Synthetic role-flow rehearsal only',...condition});}
async function bhwCase(id){const result=await api('bhw','/patients');assert.equal(result.status,200);return result.data.find(row=>row.id===id);}
async function mhoHistory(last,id){
    const directory=await api('mho','/mho/patients?q='+encodeURIComponent('CatalogQA '+last));assert.equal(directory.status,200);
    const person=directory.data.find(row=>row.kind==='resident'&&row.last_name===last);assert.ok(person,'MHO must find the resident in Patient Directory');
    const dossier=await api('mho','/mho/patients/resident/'+person.id);assert.equal(dossier.status,200);
    assert.ok(dossier.history.some(row=>row.id===id),'MHO history must contain the same BHW case');
    return dossier;
}
before(async()=>{
    f=await createFixture();
    for(const role of ['admin','bhw','mho']){const login=await api(role,'/login',{system_id:f.users[role],password:f.password});assert.equal(login.status,200);tokens[role]=login.token;}
});
after(async()=>{if(f)await f.close();});

test('Admin adds name → BHW selects it and saves consultation → MHO finds the same case and visit',async()=>{
    const disease='Synthetic Catalog Role Flow';
    assert.equal((await api('admin','/diseases',{name:disease})).status,200);
    const options=await api('bhw','/bhw/encoding-options');assert.equal(options.status,200);
    const choice=options.data.find(row=>row.name===disease);assert.ok(choice);
    const [[catalog]]=await f.db.execute('SELECT id FROM disease_registry WHERE name=?',[disease]);catalogId=catalog.id;
    const saved=await api('bhw','/patients',patient('Listed',{disease,condition_not_listed:false}));assert.equal(saved.status,201,JSON.stringify(saved));
    const original=await bhwCase(saved.id);assert.equal(original.disease,disease);assert.equal(original.disease_review_status,'Recorded');
    const dossier=await mhoHistory('Listed',saved.id),record=dossier.history.find(row=>row.id===saved.id);
    assert.equal(record.disease,disease);assert.equal(record.severity,'Monitored');assert.equal(record.status,'Active');
    const visits=dossier.visits.filter(row=>row.case_id===saved.id);assert.equal(visits.length,1);assert.equal(visits[0].nature_of_visit,'New consultation/case');
    const queue=await api('mho','/mho/disease-reviews');assert.ok(!queue.data.some(row=>row.id===saved.id),'Listed cases do not need classification approval');
});

test('BHW unlisted wording → MHO links existing disease → both histories update without another case or visit',async()=>{
    const wording='Synthetic alternate wording',source='Disposable clinic reference';
    const saved=await api('bhw','/patients',patient('Unlisted',{condition_not_listed:true,reported_condition:wording,condition_source:source}));assert.equal(saved.status,201);
    const pending=await bhwCase(saved.id);assert.equal(pending.disease,PENDING_DISEASE);assert.equal(pending.disease_review_status,'Pending');assert.equal(pending.disease_reported,wording);
    const before=await mhoHistory('Unlisted',saved.id);assert.equal(before.history.find(row=>row.id===saved.id).disease_review_status,'Pending');
    const [[counts]]=await f.db.execute('SELECT (SELECT COUNT(*) FROM health_cases) cases,(SELECT COUNT(*) FROM case_visits) visits');
    const queue=await api('mho','/mho/disease-reviews'),row=queue.data.find(row=>row.id===saved.id);assert.ok(row);assert.equal(row.condition_source,source);
    assert.equal((await api('bhw','/mho/disease-reviews/'+saved.id,{version:row.version,action:'existing',disease_id:catalogId,note:'Unauthorized fixture attempt'},'PUT')).status,403);
    const reviewed=await api('mho','/mho/disease-reviews/'+saved.id,{version:row.version,action:'existing',disease_id:catalogId,note:'Synthetic source checked; equivalent catalog label selected.'},'PUT');assert.equal(reviewed.status,200,JSON.stringify(reviewed));
    const updated=await bhwCase(saved.id);assert.equal(updated.disease,'Synthetic Catalog Role Flow');assert.equal(updated.disease_review_status,'Reviewed');
    for(const key of ['id','resident_id','birthdate','status','severity','disease_reported','condition_source'])assert.equal(updated[key],pending[key]);
    const dossier=await mhoHistory('Unlisted',saved.id);assert.equal(dossier.history.find(row=>row.id===saved.id).disease,updated.disease);
    const [[afterCounts]]=await f.db.execute('SELECT (SELECT COUNT(*) FROM health_cases) cases,(SELECT COUNT(*) FROM case_visits) visits');assert.deepEqual(afterCounts,counts);
    assert.equal(dossier.visits.filter(row=>row.case_id===saved.id).length,1);
    assert.ok(!(await api('mho','/mho/disease-reviews')).data.some(row=>row.id===saved.id));
});

test('MHO approves a new unlisted disease → Admin catalog and BHW/MHO choices share the reviewed name',async()=>{
    const disease='Synthetic New Reviewed Catalog Name';
    const saved=await api('bhw','/patients',patient('NewReviewed',{condition_not_listed:true,reported_condition:disease,condition_source:'Synthetic referring clinic'}));assert.equal(saved.status,201);
    const row=(await api('mho','/mho/disease-reviews')).data.find(row=>row.id===saved.id);assert.ok(row);
    const response=await api('mho','/mho/disease-reviews/'+saved.id,{version:row.version,action:'new',name:disease,note:'Synthetic new catalog label reviewed.'},'PUT');assert.equal(response.status,200,JSON.stringify(response));
    assert.ok((await api('admin','/diseases')).data.some(row=>row.name===disease));
    assert.ok((await api('bhw','/bhw/encoding-options')).data.some(row=>row.name===disease));
    assert.ok((await api('mho','/mho/walk-in-options')).data.diseases.some(row=>row.name===disease));
    const dossier=await mhoHistory('NewReviewed',saved.id);assert.equal(dossier.history.find(row=>row.id===saved.id).disease,disease);
    const updated=await bhwCase(saved.id);assert.equal(updated.disease_review_status,'Reviewed');assert.equal(updated.severity,'Monitored');
});
