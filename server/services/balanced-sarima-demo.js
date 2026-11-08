// Saved synthetic evidence only. No DB, Python process, model fitting or operational records.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const DEFAULT_DIRECTORY=path.join(__dirname,'../data/balanced-sarima-demo');
const DISEASES=['Cough','URTI','Infection all types','ARI','Fever unknown origin','Hypertension','Influenza','Acute Gastroenteritis','Vertigo','All types of skin disease'];
const BARANGAYS=['Salvacion','Alegria','Blumentritt','Caliban','Cansilayan','Sta. Rosa','Minoyan'];
function fail(status,message,code){return Object.assign(new Error(message),{status,code});}
function createBalancedSarimaDemo({directory=DEFAULT_DIRECTORY,environment=process.env.NODE_ENV,allowProduction=process.env.ENABLE_SARIMA_DEMO==='true'}={}){
 let cached;
 function evidence(){
  if(environment==='production'&&allowProduction!==true)throw fail(404,'The saved synthetic SARIMA demonstration is not enabled for this deployment.','LOCAL_DEMO_ONLY');
  if(cached)return cached;
  try{
   const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
   const read=(name,digest)=>{const bytes=fs.readFileSync(path.join(directory,name));if(crypto.createHash('sha256').update(bytes).digest('hex')!==digest)throw Error('Integrity check failed');return bytes;};
   const data=JSON.parse(read('snapshot.json',manifest.snapshot_sha256));read('SYNTHETIC_BALANCED_monthly.csv',manifest.dataset_sha256);
   const causes=JSON.parse(read('unavailable-causes.json',manifest.unavailable_causes_sha256));
   if(JSON.stringify(data.diseases)!==JSON.stringify(DISEASES)||JSON.stringify(data.barangays)!==JSON.stringify(BARANGAYS)||Object.keys(data.views).length!==88||data.context.source_sha256!==manifest.dataset_sha256)throw Error('Unexpected evidence scope');
   const m=data.pooled['80_20']['1'].sarima;if(m.attempted!==630||m.available!==600||m.within_tolerance_hits!==517)throw Error('Unexpected primary benchmark');
   cached={data,causes,manifest};return cached;
  }catch{throw fail(503,'The saved SARIMA evidence could not be verified. Ask the local maintainer to check the demonstration snapshot.','DEMO_EVIDENCE_UNAVAILABLE');}
 }
 function options(){const {data,manifest}=evidence();return {diseases:DISEASES,barangays:BARANGAYS,context:data.context,policy:data.accuracy_acceptance_rule,rules:data.rules,overall:Object.fromEntries(Object.entries(data.pooled).map(([p,hs])=>[p,Object.fromEntries(Object.entries(hs).map(([h,v])=>[h,v.sarima]))])),provenance:{synthetic:true,mode:'saved_verified_synthetic_results',retraining:false,dataset_sha256:manifest.dataset_sha256,evidence_sha256:manifest.frozen_evidence_archive_sha256,validation:'Real-world Validation Pending'}};}
 function forecast(query={}){
  if(Object.keys(query).some(k=>!['disease','barangay','protocol','horizon'].includes(k)))throw fail(400,'Unsupported forecast selection.','INVALID_DEMO_SELECTION');
  const {data,causes}=evidence();const {disease,barangay,protocol='80_20',horizon='1'}=query;
  if(typeof disease!=='string'||typeof barangay!=='string'||!['ALL',...DISEASES].includes(disease)||!['ALL',...BARANGAYS].includes(barangay)||!['80_20','70_30'].includes(protocol)||!['1','2'].includes(horizon))throw fail(400,'Choose one of the ten study diseases and seven barangays, or their aggregate selections.','INVALID_DEMO_SELECTION');
  const view=data.views[`${disease==='ALL'?0:DISEASES.indexOf(disease)+1}-${barangay==='ALL'?0:BARANGAYS.indexOf(barangay)+1}`];
  const missing=view.components.filter(c=>!c.usable).map(c=>({...c,native_rejections:causes.find(x=>x.disease===c.disease&&x.barangay===c.barangay)?.rejections||{}}));
  return {context:data.context,view,selection:{disease,barangay,protocol,horizon},overall:options().overall,policy:data.accuracy_acceptance_rule,formulas:data.accuracy_explanation.formulas,missing_components:missing,provenance:options().provenance,loaded_saved_results:true,retrained:false};
 }
 return {options,forecast};
}
module.exports={createBalancedSarimaDemo,DISEASES,BARANGAYS};
