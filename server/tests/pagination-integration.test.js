const {test}=require('node:test'),assert=require('node:assert/strict');
require('../config/security-config').loadEnvironment();
test('disposable SQL pages filter and preserve case counts without reading live clinical tables',async()=>{
 const mysql=require('mysql2/promise');const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:+(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',connectTimeout:3000});
 const name='health_intel_release_verify_'+process.pid;assert.match(name,/^health_intel_release_verify_\d+$/);assert.notEqual(name,process.env.DB_NAME);
 let created=false;
 try{
  await db.query('CREATE DATABASE `'+name+'`');created=true;await db.query('USE `'+name+'`');
  await db.query('CREATE TABLE residents(id INT PRIMARY KEY,patient_name VARCHAR(100),first_name VARCHAR(50),last_name VARCHAR(50),suffix VARCHAR(10),birthdate DATE,age INT,purok VARCHAR(100),barangay_id INT)');
  await db.query('CREATE TABLE barangays(id INT PRIMARY KEY,name VARCHAR(100))');await db.query("INSERT INTO barangays VALUES(1,'Fixture A'),(2,'Fixture B')");
  await db.query('CREATE TABLE health_cases(id INT PRIMARY KEY,resident_id INT,patient_name VARCHAR(100),barangay_id INT,birthdate DATE,age INT,purok VARCHAR(100),disease VARCHAR(100),disease_reported VARCHAR(100),severity VARCHAR(20),status VARCHAR(20),date_recorded DATE,created_at TIMESTAMP,is_archived TINYINT)');
  await db.query('CREATE TABLE case_visits(id INT PRIMARY KEY,case_id INT,consultation_date DATE)');
  for(let id=1;id<=32;id++)await db.execute("INSERT INTO residents VALUES(?,?, 'Fixture','Resident','','1990-05-10',36,'Zone 1',?)",[id,'Fixture '+id,id%2?1:2]);
  await db.query("INSERT INTO health_cases VALUES(1,1,'Fixture 1',1,'1990-05-10',36,'Zone 1','Cough',NULL,'Mild','Active','2025-01-01','2025-01-01',0),(2,1,'Fixture 1',1,'1990-05-10',36,'Zone 1','Cough',NULL,'Mild','Cleared','2024-01-01','2024-01-01',1)");await db.query("INSERT INTO case_visits VALUES(1,1,'2025-01-02'),(2,1,'2025-01-03')");
  const {residentDirectory}=require('../services/resident-directory'),{caseDirectory}=require('../services/case-directory');const user={role:'bhw',barangay_id:1};
  const a=await residentDirectory(db,user,{page:'1',page_size:'10'}),b=await residentDirectory(db,user,{page:'2',page_size:'10'});
  assert.equal(a.total,16);assert.equal(a.data.length,10);assert.equal(b.data.length,6);assert.equal(new Set([...a.data,...b.data].map(r=>r.id)).size,16);assert.ok([...a.data,...b.data].every(r=>r.barangay_id===1));
  assert.equal((await residentDirectory(db,user,{purok:'zone 1',age_group:'adult'})).total,16);assert.equal((await residentDirectory(db,user,{q:'missing'})).total,0);
  for(const q of ['%','_','!'])assert.equal((await residentDirectory(db,user,{q})).total,0);
  const c=await caseDirectory(db,user,{year:'2025',month:'01',status:'Active'});assert.equal(c.total,1);assert.equal(c.data[0].last_consultation,'2025-01-03');assert.equal((await caseDirectory(db,user,{},true)).total,1);
  const [[count]]=await db.query('SELECT COUNT(*) AS total FROM health_cases');assert.equal(count.total,2);
  await assert.rejects(()=>caseDirectory(db,user,{barangay_id:'2'}));for(const role of ['mho','superadmin'])await assert.rejects(()=>caseDirectory(db,{role},{}));
 }finally{if(created){assert.match(name,/^health_intel_release_verify_\d+$/);await db.query('DROP DATABASE `'+name+'`');}await db.end();}
});
