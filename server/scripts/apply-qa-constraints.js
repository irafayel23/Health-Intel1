// Explicit, additive migration. Never deletes or renames accounts/diseases.
const fs=require('node:fs'),path=require('node:path');
async function applyConstraints(db){
    const definitions=[{table:'users',field:'email',key:'qa_email_key',index:'uq_users_email_key'},{table:'disease_registry',field:'name',key:'qa_name_key',index:'uq_registry_name_key'}];
    for(const d of definitions){const [duplicates]=await db.query(`SELECT COUNT(*) AS n FROM ${d.table} WHERE ${d.field} IS NOT NULL AND TRIM(${d.field})<>'' GROUP BY LOWER(TRIM(${d.field})) HAVING COUNT(*)>1`);if(duplicates.length)throw new Error('Existing duplicate '+d.field+' values in '+d.table+' require review. Nothing was deleted or merged.');}
    for(const d of definitions){const [columns]=await db.query(`SHOW COLUMNS FROM ${d.table} LIKE ?`,[d.key]);if(!columns.length)await db.query(`ALTER TABLE ${d.table} ADD COLUMN ${d.key} VARCHAR(255) GENERATED ALWAYS AS (NULLIF(LOWER(TRIM(${d.field})),'')) STORED`);const [indexes]=await db.query(`SHOW INDEX FROM ${d.table} WHERE Key_name=?`,[d.index]);if(!indexes.length)await db.query(`ALTER TABLE ${d.table} ADD UNIQUE INDEX ${d.index} (${d.key})`);}
}
async function main(){require('../config/security-config').loadEnvironment();const config={host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};const mysql=require('mysql2/promise'),db=await mysql.createConnection(config);try{
    const backup=process.argv[process.argv.indexOf('--backup')+1];if(!process.argv.includes('--backup')||!backup)throw Error('Pass --backup with a private, new SQL backup path.');
    const {createDatabaseDump}=require('../services/database-backup');const dump=await createDatabaseDump(config);try{fs.mkdirSync(path.dirname(path.resolve(backup)),{recursive:true});fs.copyFileSync(dump.filename,path.resolve(backup),fs.constants.COPYFILE_EXCL);}finally{await dump.cleanup();}
    await applyConstraints(db);console.log('Unique email and disease-name constraints installed. Existing values preserved; private SQL backup saved.');
}finally{await db.end();}}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={applyConstraints};
