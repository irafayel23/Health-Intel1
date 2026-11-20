const fs=require('node:fs'),path=require('node:path');
function registerReadiness(app,db,{timeout=2000,assets=()=>['policy-a/policy.json','policy-a/source-manifest.json','policy-a-portable/preflight.py'].every(f=>fs.existsSync(path.join(__dirname,'../forecasting',f)))}={}){
 let pending,databaseProbe;
 async function inspect(){let timer;try{
  const check=()=>databaseProbe||(databaseProbe=(async()=>{await db.rawDatabase.query({sql:'SELECT 1 AS available',timeout});await db.schemaReady();for(const sql of ['SELECT system_id FROM users LIMIT 0','SELECT id FROM barangays LIMIT 0','SELECT r.id,r.barangay_id FROM residents r LIMIT 0','SELECT h.id,h.resident_id FROM health_cases h LIMIT 0','SELECT case_id FROM case_visits LIMIT 0'])await db.execute(sql);return true;})().finally(()=>{databaseProbe=null;}));
  const database=await Promise.race([check(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('unavailable')),timeout);})]);
  return {database,forecast_assets:Boolean(assets())};
 }catch{return {database:false,forecast_assets:Boolean(assets())};}finally{clearTimeout(timer);}}
 app.get('/readyz',async(_req,res)=>{if(!pending)pending=inspect().finally(()=>{pending=null;});let checks;try{checks=await pending;}catch{checks={database:false,forecast_assets:false};}const ready=Object.values(checks).every(Boolean);res.set('Cache-Control','no-store').status(ready?200:503).json({status:ready?'ready':'unavailable',checks});});
}
module.exports={registerReadiness};

