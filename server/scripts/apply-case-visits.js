// Add consultation storage after creating a private recovery dump. Existing rows are never rewritten.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const mysql=require('mysql2/promise');
const {migrateCaseVisits}=require('../services/case-visits');
async function main(){
    require('../config/security-config').loadEnvironment();
    const args=process.argv.slice(2);
    if(args.length!==2||args[0]!=='--backup')throw Error('Usage: node scripts/apply-case-visits.js --backup <new private SQL file>');
    const backup=path.resolve(args[1]);
    if(fs.existsSync(backup))throw Error('Choose a new backup filename. Existing backups are never overwritten.');
    const config={host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};
    const {createDatabaseDump}=require('../services/database-backup');
    const dump=await createDatabaseDump(config);
    try{fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(dump.filename,backup,fs.constants.COPYFILE_EXCL);}finally{await dump.cleanup();}
    const db=await mysql.createConnection(config);
    try{
        const [tableRows]=await db.query('SHOW TABLES');const snapshots=[];
        for(const tableRow of tableRows){const name=Object.values(tableRow)[0];if(!/^[a-zA-Z0-9_]+$/.test(name))throw Error('Unsupported table name.');const [columns]=await db.query('SHOW COLUMNS FROM `'+name+'`');snapshots.push({name,fields:columns.map(c=>'`'+c.Field+'`').join(',')});}
        const fingerprint=async()=>{const hashes=[];for(const table of snapshots){const [rows]=await db.query('SELECT '+table.fields+' FROM `'+table.name+'`');hashes.push([table.name,rows.map(row=>JSON.stringify(row)).sort()]);}return crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex');};
        const before=await fingerprint();await migrateCaseVisits(db);await migrateCaseVisits(db);
        if(await fingerprint()!==before)throw Error('An original field changed during verification. Keep the backup and check for concurrent saves.');
        console.log('Consultation schema installed and verified twice. Original rows and fields are unchanged; private recovery backup saved.');
    }finally{await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
