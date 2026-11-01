const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const PDFDocument=require('pdfkit');
const {createFixture}=require('./helpers/directory-session-fixture');
const {withConsultation}=require('./helpers/consultation-fixture');
let f;const tokens={};
async function api(role,url,body){return fetch(f.base+'/api'+url,{method:body?'POST':'GET',headers:{...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
before(async()=>{f=await createFixture();for(const role of ['bhw','mho','admin']){const r=await api(role,'/login',{system_id:f.users[role],password:f.password});assert.equal(r.status,200);tokens[role]=(await r.json()).token;}await f.db.execute("INSERT INTO disease_registry(name,status,is_archived) VALUES('Synthetic Daily Date Disease','Active',0)");});
after(async()=>{await f?.close();});
test('selected daily exports retrieve backdated cases and return visits by encounter date with enforced role/barangay scope',async()=>{
 const body=withConsultation({first_name:'DailyQA',last_name:'LateEntry',birthdate:'1990-01-01',purok:'Synthetic Zone',disease:'Synthetic Daily Date Disease',severity:'Mild',date_recorded:'2026-10-16'});
 const r=await api('bhw','/patients',body);assert.equal(r.status,201);const id=(await r.json()).id;
 assert.equal((await api('bhw','/patients',{...body,date_recorded:'2026-10-17',visit:{...body.visit,nature_of_visit:'Follow-up visit',case_id:id}})).status,201);
 await f.db.execute("INSERT INTO health_cases(patient_name,barangay_id,disease,date_recorded,status,severity,encoded_by) VALUES('Other synthetic barangay',?,'Synthetic Daily Date Disease','2026-10-16','Active','Mild',?)",[f.other,f.users.mho]);
 const original=PDFDocument.prototype.text,events=[];
 PDFDocument.prototype.text=function(value,...args){events.push(String(value));return original.call(this,value,...args);};
 try{
  for(const [role,date,cases,visits] of [['bhw','2026-10-16',1,1],['bhw','2026-10-17',0,1],['mho','2026-10-16',2,1],['bhw','2000-01-01',0,0]]){
   events.length=0;const response=await api(role,'/'+role+'/reports/daily?date='+date);assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),new RegExp(role.toUpperCase()+'_Daily_'+date));const pdf=Buffer.from(await response.arrayBuffer());assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
   assert.ok(events.includes('Recorded disease cases: '+cases+'    |    Consultations: '+visits));assert.ok(events.includes(role.toUpperCase()+' - Daily report'));assert.ok(events.some(t=>t.includes('not a frozen copy')));
  }
 }finally{PDFDocument.prototype.text=original;}
 for(const date of ['','2026-02-30','2999-01-01']){const response=await api('bhw','/bhw/reports/daily?date='+date);assert.equal(response.status,400);assert.equal((await response.json()).success,false);}
 assert.equal((await api('bhw','/bhw/reports/daily?date=2026-10-16&barangay_id='+f.other)).status,403);
 assert.equal((await api('bhw','/mho/reports/daily?date=2026-10-16')).status,403);
 assert.equal((await api('mho','/bhw/reports/daily?date=2026-10-16')).status,403);
 assert.equal((await api('admin','/bhw/reports/daily?date=2026-10-16')).status,403);
 const [[audit]]=await f.db.execute("SELECT details FROM system_audit_logs WHERE action='Report Export Prepared' AND user_id=? ORDER BY id DESC LIMIT 1",[f.users.bhw]);assert.equal(JSON.parse(audit.details).period.start,'2000-01-01');
});
