const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createFixture}=require('./helpers/directory-session-fixture');
let fixture,token,caseId,residentId;
const patient={first_name:'Matching',last_name:'Fixture',suffix:'',birthdate:'1975-04-10',purok:'QA Zone',disease:'Synthetic Matching A',severity:'Mild',date_recorded:'2026-10-01',remarks:'Synthetic regression only'};
const visit=(nature='New consultation/case',case_id=null)=>({transaction_mode:'Walk-in',nature_of_visit:nature,case_id,consultation_time:'09:15',blood_pressure:'120/80',temperature_c:'36.5',height_cm:'165',weight_kg:'60'});
async function request(route,body){const r=await fetch(fixture.base+'/api'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
before(async()=>{
    fixture=await createFixture();
    const login=await fetch(fixture.base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system_id:fixture.users.bhw,password:fixture.password})});assert.equal(login.status,200);token=(await login.json()).token;
    await fixture.db.execute("INSERT INTO disease_registry(name,status,is_archived) VALUES('Synthetic Matching A','Active',0),('Synthetic Matching B','Active',0)");
    const created=await request('/patients',{...patient,visit:visit()});assert.equal(created.status,201);caseId=created.data.id;residentId=(await fixture.db.execute('SELECT resident_id FROM health_cases WHERE id=?',[caseId]))[0][0].resident_id;
});
after(async()=>{await fixture?.close();});
// Execute the current production matching code with actual synthetic API responses.
async function frontend(rows,nature,changes={},returnVisit=null){
    const fields=new Map(),field=id=>{if(!fields.has(id))fields.set(id,{value:'',disabled:false,hidden:false,options:[],handlers:{},_hiSelect:{refresh(){}},addEventListener(key,callback){(this.handlers[key]??=[]).push(callback);},replaceChildren(...options){this.options=options;this.value=options[0]?.value||'';},add(option){this.options.push(option);}});return fields.get(id);};
    const values={'swal-fname':patient.first_name,'swal-lname':patient.last_name,'swal-suffix':'','swal-birthdate':'04/10/1975','swal-case-date':'2026-10-14','swal-nature':nature,'swal-transaction':'Walk-in','swal-bp':'120/80','swal-temperature':'36.5','swal-height':'165','swal-weight':'60',...changes};for(const [id,value] of Object.entries(values))field(id).value=value;
    const requests=[];
    const context={AbortController,Intl,Date,document:{getElementById:field},Option:class{constructor(text,value){this.text=text;this.textContent=text;this.value=value;this.dataset={};}},HealthIntelText:{escape:String},fetch:async url=>{requests.push(url);return {ok:true,json:async()=>returnVisit?({success:true,history:rows,resident:{is_deceased:0,death_date:null}}):({success:true,data:rows})};}};context.window=context;vm.createContext(context);
    for(const file of ['date-format.js','encoding-controls.js','patient-visits.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../assets/js/shared',file),'utf8'),context,{filename:file});
    context.HealthIntelEncoding.enhanceSelect=()=>({destroy(){}});
    const control=context.HealthIntelVisits.bind([],returnVisit);await new Promise(setImmediate);
    return {field,control,context,requests,choices:()=>field('swal-existing-case').options.filter(o=>o.value).map(o=>Number(o.value)),change(id,value){field(id).value=value;for(const fn of field(id).handlers.change||[])fn();}};
}
test('BHW patient and resident APIs preserve date-only birthday and original case date',async()=>{
    const rows=(await request('/patients')).data.data,row=rows.find(r=>r.id===caseId);assert.equal(row.birthdate,patient.birthdate);assert.equal(row.date_recorded,patient.date_recorded);
    const people=(await request('/residents')).data.data;assert.equal(people.find(r=>r.id===residentId).birthdate,patient.birthdate);
});
test('real BHW response matches original case for follow-up and admission without changing the entered birthday',async()=>{
    const rows=(await request('/patients')).data.data;
    for(const nature of ['Follow-up visit','New admission']){const form=await frontend(rows,nature);try{assert.ok(form.choices().includes(caseId));assert.equal(form.field('swal-existing-case').disabled,false);form.field('swal-existing-case').value=String(caseId);assert.equal(form.control.consultation().case_id,caseId);}finally{form.control.destroy();}}
});
test('BHW dropdown excludes earlier dates, wrong identities, archives and dates after confirmed death; date edits clear selection',async()=>{
    const row=(await request('/patients')).data.data.find(r=>r.id===caseId);
    for(const [rows,changes] of [[[row],{'swal-case-date':'2026-09-30'}],[[row],{'swal-birthdate':'04/11/1975'}],[[row],{'swal-suffix':'Jr.'}],[[{...row,is_archived:1}],{}],[[{...row,is_deceased:1,death_date:'2026-10-10'}],{}],[[{...row,is_deceased:1,death_date:null}],{}]]){
        const form=await frontend(rows,'Follow-up visit',changes);try{assert.deepEqual(form.choices(),[]);assert.equal(form.field('swal-existing-case').disabled,true);assert.throws(()=>form.control.consultation(),/eligible original disease case/);}finally{form.control.destroy();}
    }
    const eligible=await frontend([{...row,is_deceased:1,death_date:'2026-10-10'}],'New admission',{'swal-case-date':'2026-10-10'});assert.ok(eligible.choices().includes(caseId));eligible.control.destroy();
    const form=await frontend([row],'New admission',{'swal-case-date':patient.date_recorded});try{assert.ok(form.choices().includes(caseId));form.field('swal-existing-case').value=String(caseId);form.change('swal-case-date','2026-09-30');assert.equal(form.field('swal-existing-case').value,'');assert.deepEqual(form.choices(),[]);assert.match(form.field('swal-existing-case-note').textContent,/on or after/);}finally{form.control.destroy();}
});
test('BHW return shortcut loads only the selected resident and pins the original case across date and nature changes',async()=>{
    const rows=(await request('/patients')).data.data,row=rows.find(r=>r.id===caseId);
    const form=await frontend([row,{...row,id:caseId+999}],'',{}, {caseId,residentId});
    try{
        assert.deepEqual(form.requests,['http://localhost:3000/api/residents/'+residentId+'/dossier']);
        assert.deepEqual(form.choices(),[caseId]);assert.equal(form.field('swal-existing-case').value,String(caseId));
        assert.throws(()=>form.control.consultation(),/nature of visit/);
        form.change('swal-nature','New consultation/case');assert.throws(()=>form.control.consultation(),/admission or Follow-up/);
        form.change('swal-nature','Follow-up visit');assert.equal(form.control.consultation().case_id,caseId);
        form.change('swal-case-date','2026-09-30');assert.deepEqual(form.choices(),[]);assert.throws(()=>form.control.consultation(),/eligible original/);
        form.change('swal-case-date','2026-10-14');assert.equal(form.control.consultation().case_id,caseId);
    }finally{form.control.destroy();}
    const stale=await frontend([{...row,resident_id:residentId+999}],'Follow-up visit',{}, {caseId,residentId});
    try{assert.deepEqual(stale.choices(),[]);assert.throws(()=>stale.control.consultation(),/eligible original/);}finally{stale.control.destroy();}
});
test('BHW history shortcut refuses archives, deceased residents and conflicting or incomplete identities',async()=>{
    const {resident:person,history}= (await request('/residents/'+residentId+'/dossier')).data,row=history.find(r=>r.id===caseId);
    const form=await frontend([],'Follow-up visit');
    try{
        vm.runInContext(fs.readFileSync(path.join(__dirname,'../../assets/js/bhw/bhw-residents.js'),'utf8'),form.context);
        const reason=form.context.bhwReturnVisitReason;assert.equal(reason(person,row),'');
        for(const [p,c] of [[person,{...row,is_archived:1}],[{...person,is_deceased:1},row],[{...person,first_name:''},row],[person,{...row,birthdate:'1975-04-11'}],[person,{...row,resident_id:null}],[person,{...row,barangay_id:fixture.other}],[person,{...row,date_recorded:null}]])assert.notEqual(reason(p,c),'');
    }finally{form.control.destroy();}
});
test('BHW shortcut admission and follow-up save visits without changing original cases or resident counts',async()=>{
    const [[before]]=await fixture.db.execute('SELECT COUNT(*) AS total FROM residents');
    const [original]=await fixture.db.execute('SELECT * FROM health_cases ORDER BY id');
    for(const nature of ['Follow-up visit','New admission']){
        const saved=await request('/patients',{...patient,date_recorded:'2026-10-05',visit:visit(nature,caseId)});
        assert.equal(saved.status,201);assert.equal(saved.data.new_case,false);assert.equal(saved.data.id,caseId);
    }
    const [current]=await fixture.db.execute('SELECT * FROM health_cases ORDER BY id');assert.deepEqual(current,original);
    const [[after]]=await fixture.db.execute('SELECT COUNT(*) AS total FROM residents');assert.equal(after.total,before.total);
    const dossier=(await request('/residents/'+residentId+'/dossier')).data;
    assert.equal(dossier.visits.filter(v=>v.nature_of_visit==='Follow-up visit').length,1);assert.equal(dossier.visits.filter(v=>v.nature_of_visit==='New admission').length,1);
});
test('extra spaces in new or historical purok text reuse one resident and save normalized new addresses',async()=>{
    await fixture.db.execute("UPDATE residents SET purok='  QA  Zone  ' WHERE id=?",[residentId]);
    const saved=await request('/patients',{...patient,date_recorded:'2026-10-02',purok:' QA   Zone ',visit:visit()});assert.equal(saved.status,201);
    const [[row]]=await fixture.db.execute('SELECT resident_id,purok FROM health_cases WHERE id=?',[saved.data.id]);assert.equal(row.resident_id,residentId);assert.equal(row.purok,'QA Zone');
    const [[count]]=await fixture.db.execute('SELECT COUNT(*) AS total FROM residents WHERE first_name=? AND last_name=?',[patient.first_name,patient.last_name]);assert.equal(count.total,1);
});
test('multiple cases show explicit dates, status and last consultation without choosing a case automatically',async()=>{
    const rows=(await request('/patients')).data.data,own=rows.filter(r=>r.resident_id===residentId),first=own.find(r=>r.id===caseId);
    assert.equal(first.last_consultation,'2026-10-05');
    const dossier=(await request('/residents/'+residentId+'/dossier')).data;assert.equal(dossier.history.find(r=>r.id===caseId).last_consultation,'2026-10-05');
    const form=await frontend(rows,'Follow-up visit');
    try{
        assert.equal(form.choices().length,2);assert.equal(form.field('swal-existing-case').value,'');assert.match(form.field('swal-existing-case-note').textContent,/2 cases.*does not choose automatically/);
        const original=form.field('swal-existing-case').options.find(o=>o.value===String(caseId));assert.match(original.text,/Active.*Case ID: REC-.*Original case: Oct 1, 2026.*Last consultation: Oct 5, 2026/);
        form.change('swal-existing-case',String(caseId));assert.match(form.field('swal-existing-case-note').textContent,new RegExp('follow-up visit.*REC-'+caseId));assert.equal(form.control.consultation().case_id,caseId);
        const choice=form.context.HealthIntelEncoding.caseChoice({...first,last_consultation:null});assert.match(choice.detail,/Last consultation: Not recorded/);
    }finally{form.control.destroy();}
    const records=require('../services/case-records').createCaseRecords(fixture.db);
    const identity={first_name:patient.first_name,last_name:patient.last_name,suffix:patient.suffix,birthdate:patient.birthdate,barangay_id:String(fixture.own),consultation_date:'2026-10-01'};
    const matches=await records.matchingWalkIns(identity);assert.deepEqual(matches.map(r=>r.id),[caseId]);assert.equal(matches[0].last_consultation,'2026-10-05');
    assert.deepEqual(await records.matchingWalkIns({...identity,consultation_date:'2026-09-30'}),[]);
});
test('distinct suffixes, birthdays and genuinely different addresses remain separate',async()=>{
    for(const changes of [{suffix:'Jr.'},{birthdate:'1975-04-11'},{purok:'Other Zone'}]){
        const saved=await request('/patients',{...patient,...changes,disease:'Synthetic Matching B',date_recorded:'2026-10-03',visit:visit()});assert.equal(saved.status,201);
        const [[row]]=await fixture.db.execute('SELECT resident_id FROM health_cases WHERE id=?',[saved.data.id]);assert.notEqual(row.resident_id,residentId);
    }
});
test('ambiguous pre-existing profiles are refused for review instead of being silently merged',async()=>{
    await fixture.db.execute("INSERT INTO residents(first_name,last_name,suffix,patient_name,birthdate,age,purok,barangay_id) VALUES(?,?,?,'Synthetic duplicate profile',?,51,'QA  Zone',?)",[patient.first_name,patient.last_name,patient.suffix,patient.birthdate,fixture.own]);
    const [[before]]=await fixture.db.execute('SELECT COUNT(*) AS total FROM health_cases');
    const saved=await request('/patients',{...patient,disease:'Synthetic Matching B',date_recorded:'2026-10-04',visit:visit()});assert.equal(saved.status,409);assert.match(saved.data.error,/Multiple matching resident profiles/);
    const [[after]]=await fixture.db.execute('SELECT COUNT(*) AS total FROM health_cases');assert.equal(after.total,before.total);
});
