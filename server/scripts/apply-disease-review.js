const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const mysql=require('mysql2/promise');
require('../config/security-config').loadEnvironment();
const {createDatabaseDump}=require('../services/database-backup');
const {migrateDiseaseReview}=require('../services/disease-review');

async function main(){
    const args=process.argv.slice(2);
    if(args.length!==2||args[0]!=='--backup')throw Error('Usage: node scripts/apply-disease-review.js --backup <new private SQL file>');
    const backup=path.resolve(args[1]);
    if(fs.existsSync(backup))throw Error('Choose a new backup filename; existing backups are never overwritten.');
    const config={host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};
    let dump,db;
    try{
        dump=await createDatabaseDump(config);
        fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(dump.filename,backup,fs.constants.COPYFILE_EXCL);
        console.log('Private recovery backup saved.');
        db=await mysql.createConnection(config);
        const [columns]=await db.query('SHOW COLUMNS FROM health_cases');
        const fields=columns.map(column=>'`'+column.Field+'`').join(',');
        const fingerprint=async()=>{const [rows]=await db.query('SELECT '+fields+' FROM health_cases ORDER BY id');return {count:rows.length,hash:crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')};};
        const before=await fingerprint();await migrateDiseaseReview(db);const after=await fingerprint();
        if(before.hash!==after.hash)throw Error('Case data changed during migration verification. Keep the backup and investigate concurrent writes before continuing.');
        console.log('Disease-review schema ready; '+after.count+' existing cases and their original fields are unchanged.');
    }finally{if(db)await db.end();if(dump)await dump.cleanup();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
