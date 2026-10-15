const mysql=require('mysql2/promise'),crypto=require('node:crypto'),bcrypt=require('bcrypt');
const {migrateSessionSecurity}=require('../../services/session-security');
const {migrateResidentVital}=require('../../services/resident-vital');
const {migrateCaseVisits}=require('../../services/case-visits');
async function createFixture(port=0){
    const source={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};
    const name='health_intel_directory_sessions_verify_'+process.pid,root=await mysql.createConnection(source);
    let server,appDb,db,created=false;
    const quote=value=>'`'+value.replace(/`/g,'``')+'`';
    async function fingerprint(){
        const [tables]=await root.query('SHOW TABLES FROM '+quote(source.database)),result=[];
        for(const t of tables){const table=Object.values(t)[0],[rows]=await root.query('SELECT * FROM '+quote(source.database)+'.'+quote(table));result.push([table,rows.map(row=>JSON.stringify(row)).sort()]);}
        return crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
    }
    const baseline=await fingerprint();
    async function close(){
        if(server)await new Promise(resolve=>server.close(resolve));if(appDb)await appDb.end();if(db)await db.end();
        try{
            if(created){if(!/^health_intel_directory_sessions_verify_\d+$/.test(name)||name===source.database)throw Error('Unsafe temporary database target');await root.query('DROP DATABASE '+quote(name));}
            if(await fingerprint()!==baseline)throw Error('Original database preservation check failed');
        }finally{await root.end();}
    }
    try{
        await root.query('CREATE DATABASE '+quote(name)+' CHARACTER SET utf8mb4');created=true;await root.query('USE '+quote(name));await root.query('SET FOREIGN_KEY_CHECKS=0');
        const [tables]=await root.query('SHOW TABLES FROM '+quote(source.database));
        for(const t of tables){const [[ddl]]=await root.query('SHOW CREATE TABLE '+quote(source.database)+'.'+quote(Object.values(t)[0]));await root.query(ddl['Create Table']);}
        await root.query('SET FOREIGN_KEY_CHECKS=1');db=mysql.createPool({...source,database:name});
        await migrateSessionSecurity(db);await migrateSessionSecurity(db);await migrateResidentVital(db);await migrateCaseVisits(db);
        const [barangays]=await db.query("INSERT INTO barangays(name,latitude,longitude) VALUES('Synthetic Barangay A',10.6,123.1),('Synthetic Barangay B',10.7,123.2)");const own=barangays.insertId,other=own+1;
        const password=crypto.randomBytes(20).toString('base64url'),hash=await bcrypt.hash(password,10),secret=crypto.randomBytes(48).toString('hex');
        const users={bhw:'QA-DIRECTORY-BHW',mho:'QA-DIRECTORY-MHO',admin:'QA-DIRECTORY-ADMIN',superadmin:'QA-DIRECTORY-SUPERADMIN'};
        for(const [role,id] of Object.entries(users))await db.execute("INSERT INTO users(system_id,first_name,last_name,role,barangay_id,password_hash,status,email) VALUES(?,'Synthetic','Tester',?,?,?,'approved',?)",[id,role,role==='bhw'?own:null,hash,role+'-directory@example.invalid']);
        const residents=[];
        for(let i=0;i<32;i++){
            const first=i===0?'Elena':i===1?'Antonio':'Synthetic '+String(i+1).padStart(2,'0'),last=i===0?'Cruz':i===1?'Ramos':'Resident';
            const [r]=await db.execute("INSERT INTO residents(first_name,last_name,suffix,patient_name,birthdate,age,purok,barangay_id) VALUES(?,?,?,?,'1990-05-10',36,?,?)",[first,last,i===0?'Jr.':'',[first,last,i===0?'Jr.':''].filter(Boolean).join(' '),'Purok '+(i%3+1),i%2?other:own]);residents.push(r.insertId);
        }
        await db.execute("INSERT INTO resident_vital_status(resident_id,is_deceased,death_date,confirmed_by,version) VALUES(?,1,'2025-06-01',?,1)",[residents[1],users.mho]);
        const cases=[];
        for(const [date,disease,status,archived] of [['2025-01-01','Synthetic Disease A','Active',0],['2024-01-01','Synthetic Disease B','Cleared',1]]){
            const [r]=await db.execute("INSERT INTO health_cases(resident_id,first_name,last_name,suffix,patient_name,birthdate,age,purok,barangay_id,disease,date_recorded,status,severity,is_archived,remarks,encoded_by) VALUES(?,'Elena','Cruz','Jr.','Elena Cruz Jr.','1990-05-10',34,'Purok 1',?,?,?,?, 'Mild',?,'Synthetic QA record only',?)",[residents[0],own,disease,date,status,archived,users.bhw]);cases.push(r.insertId);
        }
        for(let i=1;i<=12;i++)await db.execute(`INSERT INTO case_visits(case_id,consultation_date,consultation_time,transaction_mode,nature_of_visit,blood_pressure,temperature_c,height_cm,weight_kg,severity,remarks,encoded_by)
            VALUES(?,?,'09:30:00','Walk-in',?,'120/80',36.5,165,60,'Mild','Synthetic consultation only',?)`,[cases[0],'2025-01-'+String(i).padStart(2,'0'),i===1?'New consultation/case':i===2?'New admission':'Follow-up visit',i%2?users.bhw:users.mho]);
        const legacy=[];
        for(const archived of [0,1]){const [r]=await db.execute("INSERT INTO health_cases(patient_name,barangay_id,disease,date_recorded,status,severity,is_archived,remarks,encoded_by) VALUES('Historical Same Name',?,'Synthetic Legacy Disease','2024-06-01','Cleared','Mild',?,'No resident link; synthetic only',?)",[other,archived,users.bhw]);legacy.push(r.insertId);}
        process.env.DB_HOST=source.host;process.env.DB_NAME=name;process.env.JWT_SECRET=secret;process.env.SERVE_FRONTEND='true';
        require('nodemailer').createTransport=()=>({sendMail:async()=>({})});
        const application=require('../../server');appDb=application.db;
        let preview=application.app;
        if(port){
            preview=require('express')();
            preview.get(['/','/index.html','/mho.html','/bhw.html'],(_req,res)=>{
                const file=_req.path.endsWith('.html')?_req.path.slice(1):'index.html';
                const html=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../../..',file),'utf8');
                res.set('Cache-Control','no-store').type('html').send(html.replace('<head>','<head><script>window.HEALTH_INTEL_API_ORIGIN=window.location.origin;</script>'));
            });
            preview.use(application.app);
        }
        server=preview.listen(port,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
        const base='http://127.0.0.1:'+server.address().port;
        return {db,base,users,password,secret,residents,cases,legacy,own,other,name,close,app:application.app};
    }catch(error){await close();throw error;}
}
module.exports={createFixture};
