// Read-only release preparation. This script never installs, restarts or deploys.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
function safeFile(base,file){
 if(typeof file!=='string'||file.includes('\\')||file.split('/').some(p=>!p||p==='.'||p==='..')||!(/^(assets\/(js|css)\/.*\.(js|css)|server\/(services|routes|middleware|config)\/.*\.js|server\/server\.js|server\/package(-lock)?\.json|(index|bhw|mho|admin|superadmin)\.html)$/).test(file))throw Error('Release path is not an allowed runtime file.');
 const target=path.join(base,file),resolved=fs.realpathSync(target);if(!resolved.startsWith(fs.realpathSync(base)+path.sep)||!fs.statSync(resolved).isFile())throw Error('Release target is outside the source tree.');return target;
}
function manifest(base,files,{deployedRoot,previous={}}={}){
 if(!Array.isArray(files)||!files.length||new Set(files).size!==files.length)throw Error('Provide a unique, explicit runtime file list.');
 return files.sort().map(file=>{
  const hash=sha(fs.readFileSync(safeFile(base,file)));let deployed_sha256=null,status='azure-unverified';
  if(deployedRoot){try{deployed_sha256=sha(fs.readFileSync(safeFile(deployedRoot,file)));}catch{status='missing-on-deployed-snapshot';}
   if(deployed_sha256)status=hash===deployed_sha256?'unchanged':previous[file]===deployed_sha256?'reviewed-baseline-change':'reconciliation-required';
  }
  return {file,sha256:hash,deployed_sha256,status};
 });
}
function changedRuntimeFiles(base){
 try{const entries=execFileSync('git',['status','--porcelain=v1','-z','--untracked-files=all'],{cwd:base,encoding:'utf8',timeout:15000,windowsHide:true}).split('\0'),files=[];
 for(let i=0;i<entries.length;i++){const entry=entries[i];if(!entry)continue;const file=entry.slice(3);if(/[RC]/.test(entry.slice(0,2)))i++;try{safeFile(base,file);files.push(file);}catch{}}
 return {status:'inspected',files:[...new Set(files)].sort()};}catch{return {status:'unverified',files:[]};}
}
async function main(){
 const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
 const list=option('--files'),output=option('--out');if(!list||!output)throw Error('Required: --files explicit-files.json --out NEW-directory [--deployed-root read-only-snapshot --previous baseline-hashes.json] [--database] [--tests tests/test.js,...]');
 const files=JSON.parse(fs.readFileSync(list,'utf8')),deployedRoot=option('--deployed-root'),previous=option('--previous')?JSON.parse(fs.readFileSync(option('--previous'),'utf8')):{};
 const entries=manifest(root,files,{deployedRoot,previous});fs.mkdirSync(output,{recursive:false});
 const checks=[];const check=(name,fn)=>{try{fn();checks.push({name,status:'passed'});}catch{checks.push({name,status:'failed'});}};
 check('Node 22 or newer',()=>{if(+process.versions.node.split('.')[0]<22)throw Error();});
 check('installed application dependencies',()=>{for(const dependency of Object.keys(require('../package.json').dependencies))require.resolve(dependency,{paths:[path.join(root,'server')]});});
 check('lockfile matches direct dependency specification',()=>{const p=require('../package.json'),l=require('../package-lock.json');if(!require('node:util').isDeepStrictEqual(p.dependencies,l.packages[''].dependencies))throw Error();});
 for(const entry of entries){if(entry.file.endsWith('.js'))check('syntax: '+entry.file,()=>execFileSync(process.execPath,['--check',safeFile(root,entry.file)],{stdio:'ignore',windowsHide:true,timeout:15000}));}
 if(deployedRoot){for(const e of entries){if(e.deployed_sha256){const target=path.join(output,'before',e.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(safeFile(deployedRoot,e.file),target);if(sha(fs.readFileSync(target))!==e.deployed_sha256)throw Error('Snapshot changed while copying originals.');}}}
 const testList=option('--tests');if(testList)check('requested regression tests',()=>{const tests=testList.split(',');if(tests.some(t=>!/^tests\/[a-z0-9-]+\.test\.js$/.test(t)))throw Error();execFileSync(process.execPath,['--test',...tests],{cwd:path.join(root,'server'),stdio:'ignore',windowsHide:true,timeout:180000});});
 let database={status:'unverified'},scientific={status:'unverified'};
 if(args.includes('--database')){
  require('../config/security-config').loadEnvironment();const mysql=require('mysql2/promise');let pool;
  try{require('../config/deployment-config').readDeploymentConfig();pool=mysql.createPool({host:process.env.DB_HOST||'localhost',port:+(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel',connectionLimit:1,connectTimeout:3000});const db=require('../services/normalized-schema').createDatabaseFacade(pool);
   await db.schemaReady();for(const sql of ['SELECT r.id,r.barangay_id,r.birthdate,r.purok FROM residents r LIMIT 0','SELECT h.id,h.resident_id,h.date_recorded,h.is_archived FROM health_cases h LIMIT 0','SELECT case_id,consultation_date FROM case_visits LIMIT 0'])await db.execute(sql);
   const [pointer]=await db.execute('SELECT run_id FROM prediction_publications WHERE id=1');if(pointer.length!==1)throw Error();
   let published='none';if(pointer[0].run_id){const id=pointer[0].run_id;if(!/^[a-f0-9-]{36}$/.test(id))throw Error();const [runs]=await db.execute('SELECT status,input_hash,output_hash FROM prediction_runs WHERE id=?',[id]);if(runs.length!==1||runs[0].status!=='published')throw Error();const dir=path.join(root,'server/data/operational-predictions',id);for(const [file,hash]of [['input.json',runs[0].input_hash],['output.json',runs[0].output_hash]]){const parsed=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));if(require('../services/monthly-data').hash(parsed)!==hash)throw Error();}published=sha(Buffer.from(id));}
   database={status:'passed',published_pointer_fingerprint:published};
  }catch{database={status:'failed'};}finally{if(pool)await pool.end();}
  const python=process.env.OPERATIONAL_SARIMA_PYTHON||process.env.PYTHON_PATH||path.join(root,'server/.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');const probe=await require('../services/monthly-predictions').probeWorker(python);scientific={status:probe.ready?'passed':'failed'};
 }
 const protectedHashes=[];for(const directory of ['server/data/seasonal-sarima-6200','server/data/conditional-cmp-6200','server/forecasting']){
  const walk=dir=>{for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){if(['__pycache__','.venv','venv'].includes(e.name))continue;const file=dir+'/'+e.name;if(e.isSymbolicLink())throw Error('Unexpected model symlink');if(e.isDirectory())walk(file);else protectedHashes.push({file,sha256:sha(fs.readFileSync(path.join(root,file)))});}};walk(directory);
 }
 const report={created_at:new Date().toISOString(),verifier_sha256:sha(fs.readFileSync(__filename)),node_version:process.versions.node,working_tree_changes:changedRuntimeFiles(root),files:entries,checks,database,scientific,protectedHashes,azure_ready:false,approval_required:true};
 fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(report,null,2));
 fs.writeFileSync(path.join(output,'ROLLBACK.md'),'# Rollback\n\nDo not deploy from this report alone. Obtain current Azure file/configuration comparison, signed-in checks and owner approval.\n\nBefore an approved deployment, capture exact Azure originals with owner/mode metadata and a verified encrypted database backup plus isolated restore receipt. This tool copies only originals supplied via --deployed-root. Verify each before-file against deployed_sha256.\n\nFor rollback, stop and obtain approval before service changes. Restore only this release’s originals, guarded by checking the current file still equals this manifest’s new sha256; absent-before files require reviewed removal. Preserve Azure-only fixes. Restore permissions/ownership from the host receipt. Restart only with approval, check /healthz and /readyz, signed-in MHO/BHW, dataset hashes and unchanged publication pointer. Do not restore the clinical database for a code-only rollback.\n');
 console.log(JSON.stringify({files:entries.length,checks,database,scientific,azure_ready:false,output}));if(checks.some(c=>c.status==='failed')||database.status==='failed'||scientific.status==='failed'||entries.some(e=>e.status==='reconciliation-required'))process.exitCode=1;
}
if(require.main===module)main().catch(()=>{console.error('Release verification failed; no deployment was attempted.');process.exitCode=1;});
module.exports={sha,safeFile,manifest};
