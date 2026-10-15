require('../config/security-config').loadEnvironment();
const mysql=require('mysql2/promise'),crypto=require('node:crypto');
const {migrateSessionSecurity}=require('../services/session-security');
(async()=>{
    const db=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'});
    try{
        const quote=value=>db.escapeId(value),[tables]=await db.query('SHOW TABLES');
        const hash=async table=>{const [rows]=await db.query('SELECT * FROM '+quote(table));return crypto.createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');};
        const before=[];for(const t of tables){const table=Object.values(t)[0];before.push([table,await hash(table)]);}
        await migrateSessionSecurity(db);await migrateSessionSecurity(db);
        for(const [table,digest] of before)if(await hash(table)!==digest)throw Error('Source data preservation check failed');
        console.log('Session security storage ready. Existing rows unchanged; no accounts or passwords modified.');
    }finally{await db.end();}
})().catch(error=>{console.error(JSON.stringify({error:'Session-security migration failed',code:error.code||error.name}));process.exitCode=1;});
