require('../config/security-config').loadEnvironment();
const mysql=require('mysql2/promise'),crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
const {migrateResidentVital}=require('../services/resident-vital');
(async()=>{
    const db=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'});
    try {
        const [tables]=await db.query('SHOW TABLES'),before=[];
        const hash=async table=>{const [rows]=await db.query('SELECT * FROM `'+table+'`');return {count:rows.length,hash:crypto.createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex')};};
        for(const table of tables){const name=Object.values(table)[0];const [[ddl]]=await db.query('SHOW CREATE TABLE `'+name+'`');before.push({table:name,ddl:ddl['Create Table'],...await hash(name)});}
        const output=path.join(__dirname,'../../analysis/resident-vital-20261014');await fs.mkdir(output,{recursive:true});
        // Schema and fingerprints only. No patient/account content is written or printed.
        await fs.writeFile(path.join(output,'pre-migration-schema.json'),JSON.stringify(before,null,2));
        await migrateResidentVital(db);
        for(const row of before){const after=await hash(row.table);if(after.hash!==row.hash)throw Error('Existing rows changed while the migration ran; review before continuing.');}
        console.log('Resident vital-status schema ready. Existing table rows unchanged.');
    }finally{await db.end();}
})().catch(error=>{console.error(JSON.stringify({error:'Resident vital-status migration failed',code:error.code||error.name,errno:error.errno,sqlState:error.sqlState}));process.exitCode=1;});
