const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),crypto=require('crypto');
const mysql=require('mysql2/promise'),bcrypt=require('bcrypt'),jwt=require('jsonwebtoken');
const {sessionVersion}=require('../config/security-config');
const {migrateDiseaseReview,PENDING_DISEASE}=require('../services/disease-review');
const source={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};
const name='health_intel_disease_verify_'+process.pid,secret=crypto.randomBytes(32).toString('hex'),tokens={};
let root,db,appDb,server,base,own,other,diseaseId;
before(async()=>{
    root=await mysql.createConnection(source);
    await root.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4');
    await root.query('USE `'+name+'`');await root.query('SET FOREIGN_KEY_CHECKS=0');
    const [tables]=await root.query('SHOW TABLES FROM `'+source.database+'`');
    for(const table of tables){const t=Object.values(table)[0];const [[ddl]]=await root.query('SHOW CREATE TABLE `'+source.database+'`.`'+t+'`');await root.query(ddl['Create Table']);}
    await root.query('SET FOREIGN_KEY_CHECKS=1');db=mysql.createPool({...source,database:name});
    await migrateDiseaseReview(db);await migrateDiseaseReview(db);
    const [b]=await db.execute("INSERT INTO barangays(name,latitude,longitude) VALUES('Review Fixture A',10,123),('Review Fixture B',11,123)");own=b.insertId;other=own+1;
    const hash=await bcrypt.hash('Disposable-review-2026',10);
    for(const role of ['bhw','mho','admin','superadmin']){const id='REVIEW-'+role.toUpperCase();await db.execute("INSERT INTO users(system_id,first_name,last_name,role,barangay_id,password_hash,status) VALUES(?,'Disposable','Review',?,?,?,'approved')",[id,role,role==='bhw'?own:null,hash]);tokens[role]=jwt.sign({system_id:id,password_version:sessionVersion(hash,secret)},secret,{expiresIn:'1h'});}
    const [d]=await db.execute("INSERT INTO disease_registry(name,status,is_archived) VALUES('Review Known Disease','Active',0),('Review Archived Disease','Archived',1)");diseaseId=d.insertId;
    process.env.DB_NAME=name;process.env.DB_HOST=source.host;process.env.JWT_SECRET=secret;require('nodemailer').createTransport=()=>({sendMail:async()=>({})});
    const app=require('../server');appDb=app.db;server=app.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(appDb)await appDb.end();if(db)await db.end();if(root){try{assert.match(name,/^health_intel_disease_verify_\d+$/);assert.notEqual(name,source.database);await root.query('DROP DATABASE `'+name+'`');}finally{await root.end();}}});
async function request(route,role='mho',body,method){const response=await fetch(base+'/api'+route,{method:method||(body?'PUT':'GET'),headers:{Authorization:'Bearer '+tokens[role],...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,result:await response.json()};}
const patient=(last='One')=>({first_name:'Disposable',last_name:last,birthdate:'2000-01-01',date_recorded:'2025-09-01',purok:'Fixture Zone',severity:'Mild',condition_not_listed:true,reported_condition:'Unlisted fixture condition',condition_source:'Synthetic clinic referral'});
async function save(data=patient(),role='bhw'){const response=await request(role==='mho'?'/mho/walk-in-cases':'/patients',role,{...data,...(role==='mho'?{barangay_id:own}:{})},'POST');assert.equal(response.status,201,JSON.stringify(response.result));return response.result.id;}
async function queue(id){return (await request('/mho/disease-reviews')).result.data.find(row=>row.id===id);}
async function review(id,body){const current=await queue(id);return request('/mho/disease-reviews/'+id,'mho',{version:current.version,note:'Checked the synthetic source information',...body});}
test('unlisted encoding requires a source, saves a stable ID/resident/audit, and stays visible in totals and maps',async()=>{
    for(const change of [{condition_source:''},{reported_condition:''},{reported_condition:'<script>'}])assert.equal((await request('/patients','bhw',{...patient(),...change},'POST')).status,400);
    const id=await save();const [[row]]=await db.query('SELECT * FROM health_cases WHERE id=?',[id]);assert.equal(row.disease,PENDING_DISEASE);assert.equal(row.disease_review_status,'Pending');assert.ok(row.resident_id);assert.equal(row.disease_id,null);
    assert.equal((await request('/patients','bhw')).result.data[0].id,id);
    const map=(await request('/heatmap-data','bhw')).result.data.find(b=>b.id===own);assert.equal(map.cases,1);assert.equal(map.pending_classification,1);assert.deepEqual(map.diseases_by_severity.mild,[{disease:PENDING_DISEASE,cases:1}]);
    assert.equal((await request('/patients','bhw',patient(),'POST')).status,409);
    await save({...patient(),reported_condition:'Different unlisted condition'});
    assert.equal((await request('/predict?disease=Pending%20classification&barangay=Review%20Fixture%20A')).status,400);
    const walkin=await save(patient('Unlisted Walkin'),'mho');assert.equal((await queue(walkin)).disease_review_status,'Pending');
    const edit=(await request('/patients/'+id+'/correction','bhw')).result.data;
    assert.equal((await request('/patients/'+id+'/correction','bhw',{version:edit.version,date_recorded:edit.date_recorded,disease:PENDING_DISEASE,severity:'Monitored',reason:'Synthetic severity source checked'})).status,200);
    const [[corrected]]=await db.query('SELECT severity,disease_review_status FROM health_cases WHERE id=?',[id]);assert.equal(corrected.severity,'Monitored');assert.equal(corrected.disease_review_status,'Pending');
});
test('approved selection uses a stable registry ID; historical-only or archived choices cannot seed new cases',async()=>{
    const id=await save({...patient('Known'),condition_not_listed:false,disease:'Review Known Disease'});const [[row]]=await db.query('SELECT disease_id,disease_review_status FROM health_cases WHERE id=?',[id]);assert.equal(row.disease_id,diseaseId);assert.equal(row.disease_review_status,'Recorded');
    for(const disease of ['Never registered','Review Archived Disease',PENDING_DISEASE])assert.equal((await request('/patients','bhw',{...patient('Bad'),condition_not_listed:false,disease},'POST')).status,400);
    const options=(await request('/bhw/encoding-options','bhw')).result.data;assert.deepEqual(options.map(o=>o.name),['Review Known Disease']);
});
test('MHO classification retains identity/source/status/severity, updates the same case and links its Admin audit history',async()=>{
    const id=await save(patient('Resolve'));const [[before]]=await db.query('SELECT * FROM health_cases WHERE id=?',[id]);const response=await review(id,{action:'existing',disease_id:diseaseId});assert.equal(response.status,200,JSON.stringify(response.result));
    const [[after]]=await db.query('SELECT * FROM health_cases WHERE id=?',[id]);for(const field of ['id','resident_id','status','severity','disease_reported','condition_source'])assert.equal(after[field],before[field]);assert.equal(after.disease,'Review Known Disease');assert.equal(after.disease_review_status,'Reviewed');assert.equal(after.disease_id,diseaseId);assert.ok(!(await queue(id)));
    const detail=(await request('/admin/cases/'+id,'admin')).result;assert.ok(detail.history.some(log=>log.action==='Disease Classification Reviewed'&&log.case_id===id));
    for(const role of ['bhw','admin','superadmin']){assert.equal((await request('/mho/disease-reviews',role)).status,403);assert.equal((await request('/mho/disease-reviews/'+id,role,{action:'new'})).status,403);}
});
test('new category approval is atomic, prevents duplicates, becomes selectable, and cannot silently resolve another pending case',async()=>{
    const id=await save(patient('New'));const name='Review Newly Approved';assert.equal((await review(id,{action:'new',name})).status,200);const options=(await request('/bhw/encoding-options','bhw')).result.data;assert.ok(options.some(d=>d.name===name));
    const next=await save(patient('Still Pending'));assert.equal((await review(next,{action:'new',name:name.toLowerCase()})).status,409);assert.equal((await queue(next)).disease_review_status,'Pending');
    assert.equal((await review(next,{action:'new',name:PENDING_DISEASE})).status,400);
});
test('clarification returns to the same BHW case; other barangays and stale reviewers cannot overwrite it',async()=>{
    const id=await save(patient('Clarify')),stale=await queue(id);assert.equal((await review(id,{action:'clarification',note:'Please identify the source of the reported condition'})).status,200);
    await db.query('UPDATE users SET barangay_id=? WHERE system_id=?',[other,'REVIEW-BHW']);assert.equal((await request('/patients/'+id+'/condition-clarification','bhw',{reported_condition:'Updated condition',condition_source:'Synthetic source'})).status,404);
    await db.query('UPDATE users SET barangay_id=? WHERE system_id=?',[own,'REVIEW-BHW']);assert.equal((await request('/patients/'+id+'/condition-clarification','bhw',{reported_condition:'Updated condition',condition_source:'Synthetic source'})).status,200);assert.equal((await queue(id)).disease_review_status,'Pending');
    assert.equal((await request('/mho/disease-reviews/'+id,'mho',{version:stale.version,action:'existing',disease_id:diseaseId,note:'Stale reviewer decision'})).status,409);
    assert.equal((await review(id,{action:'existing',disease_id:diseaseId})).status,200);
});
test('concurrent reviewers have one winner; duplicate or archived cases cannot be resolved and partial registry additions roll back',async()=>{
    const id=await save(patient('Concurrent')),row=await queue(id),body={version:row.version,action:'existing',disease_id:diseaseId,note:'Checked original fixture information'};
    const results=await Promise.all([request('/mho/disease-reviews/'+id,'mho',body),request('/mho/disease-reviews/'+id,'mho',body)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    const duplicate=await save({...patient('Concurrent'),reported_condition:'Possible duplicate condition'});assert.equal((await review(duplicate,{action:'existing',disease_id:diseaseId})).status,409);
    const archived=await save(patient('Archived'));await request('/patients/'+archived+'/archive','bhw',{},'PUT');assert.equal((await review(archived,{action:'new',name:'Must not survive archive refusal'})).status,409);const [[count]]=await db.query("SELECT COUNT(*) n FROM disease_registry WHERE name='Must not survive archive refusal'");assert.equal(count.n,0);
    const collision=await save(patient('Collision'));
    await db.query("INSERT INTO health_cases(patient_name,first_name,last_name,birthdate,resident_id,barangay_id,purok,disease,date_recorded,severity,status,encoded_by) SELECT patient_name,first_name,last_name,birthdate,resident_id,barangay_id,purok,'Collision category',date_recorded,severity,status,encoded_by FROM health_cases WHERE id=?",[collision]);
    assert.equal((await review(collision,{action:'new',name:'Collision category'})).status,409);
    const [[rolledBack]]=await db.query("SELECT COUNT(*) n FROM disease_registry WHERE name='Collision category'");assert.equal(rolledBack.n,0);assert.equal((await queue(collision)).disease_review_status,'Pending');
});
