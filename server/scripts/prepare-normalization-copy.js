const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),mysql=require('mysql2/promise');
const {normalizeClinicalSchema}=require('../services/normalize-clinical-schema');
const {createDatabaseDump}=require('../services/database-backup');
const quote=value=>'`'+value.replace(/`/g,'``')+'`';
async function main(){
 require('../config/security-config').loadEnvironment();
 const config={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'};
 if(!['localhost','127.0.0.1','::1'].includes(config.host))throw Error('This preparation command is local only.');
 const probe=await mysql.createConnection(config);
 try{
  const [[marker]]=await probe.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='normalization_migrations'");
  if(marker.n)throw Error('The selected database already has normalization metadata. Use its retained source for a new preparation, or verify the existing migration.');
 }finally{await probe.end();}
 const name='health_intel_normalized_'+new Date().toISOString().replace(/\D/g,'').slice(0,14);
 const privateDir=path.resolve(__dirname,'../../private-backups/normalization');fs.mkdirSync(privateDir,{recursive:true});
 const dump=await createDatabaseDump(config);
 const backup=path.join(privateDir,name+'.sql');
 try{fs.copyFileSync(dump.filename,backup,fs.constants.COPYFILE_EXCL);}finally{await dump.cleanup();}
 const backupSha256=crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex');
 const root=await mysql.createConnection(config);let target;
 try{
  const [tables]=await root.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",[config.database]);
  async function fingerprint(database){
   const result=[];for(const row of tables){const [data]=await root.query('SELECT * FROM '+quote(database)+'.'+quote(row.TABLE_NAME));result.push([row.TABLE_NAME,data.map(v=>JSON.stringify(v)).sort()]);}
   return crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
  }
  const sourceBefore=await fingerprint(config.database);
  await root.query('CREATE DATABASE '+quote(name)+' CHARACTER SET utf8mb4');
  await root.query('USE '+quote(name));await root.query('SET FOREIGN_KEY_CHECKS=0');
  for(const row of tables){const [[ddl]]=await root.query('SHOW CREATE TABLE '+quote(config.database)+'.'+quote(row.TABLE_NAME));await root.query(ddl['Create Table']);}
  await root.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  for(const row of tables){
   const [columns]=await root.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND EXTRA NOT LIKE '%GENERATED%' ORDER BY ORDINAL_POSITION",[config.database,row.TABLE_NAME]);
   const names=columns.map(c=>quote(c.COLUMN_NAME)).join(',');
   await root.query(`INSERT INTO ${quote(name)}.${quote(row.TABLE_NAME)} (${names}) SELECT ${names} FROM ${quote(config.database)}.${quote(row.TABLE_NAME)}`);
  }
  await root.commit();await root.query('SET FOREIGN_KEY_CHECKS=1');
  if(await fingerprint(name)!==sourceBefore)throw Error('Clone content verification failed; source database remains unchanged.');
  target=await mysql.createConnection({...config,database:name});
  const result=await normalizeClinicalSchema(target);
  if(await fingerprint(config.database)!==sourceBefore)throw Error('Source changed during preparation; verify concurrent local saves.');
  const report={prepared_at:new Date().toISOString(),source_database:config.database,target_database:name,backup,backup_sha256:backupSha256,source_unchanged:true,...result};
  const out=path.resolve(__dirname,'../../analysis/normalization-20261019/local-copy.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
 }finally{if(target)await target.end();await root.end();}
}
main().catch(error=>{console.error('Normalization copy failed: '+(error.code||error.message)+'. Source database was not selected for migration.');process.exitCode=1;});
