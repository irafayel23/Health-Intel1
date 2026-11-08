// Versioned saved synthetic evidence; no database connection, fitting or network request.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const DISEASES=['Cough','URTI','Infection all types','ARI','Fever unknown origin','Hypertension','Influenza','Acute Gastroenteritis','Vertigo','All types of skin disease'];
const BARANGAYS=['Salvacion','Alegria','Blumentritt','Caliban','Cansilayan','Sta. Rosa','Minoyan'];
const SOURCE_HASH='49b4ca92eff35bc574b61f46cde982a35b4d843b84d71228158e1941829c84e7';
const DIRECTORY=path.join(__dirname,'../data/seasonal-sarima-6200');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const fail=(status,message,code)=>Object.assign(new Error(message),{status,code});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const date=i=>`${2023+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`;
function resolveSavedForecast(r,history){
 if(!Array.isArray(history)||history.some(x=>!Number.isInteger(x)||x<0))throw Error('Invalid history');
 if(r.usable){
  if(!finite(r.prediction)||r.prediction<0||r.actual_model!=='SARIMA'||!r.converged||!finite(r.covariance_condition)||r.covariance_condition>1e12||r.seasonal_order?.[3]!==12||!Object.keys(r.estimated_seasonal_parameters||{}).length||!r.ljung_box?.length||r.ljung_box.some(x=>!finite(x.pvalue)||x.pvalue<.01)||r.minimum_finite_root!==null&&(!finite(r.minimum_finite_root)||r.minimum_finite_root<=1.0001))throw Error('Accepted SARIMA evidence failed validation');
  if(!finite(r.lower)||!finite(r.upper)||r.lower<0||r.lower>r.prediction||r.upper<r.prediction)throw Error('Invalid saved interval');
  return {prediction:r.prediction,lower:r.lower,upper:r.upper,actual_model:'SARIMA',fallback:false,reason:r.reason,interval_note:r.interval_method,annual_supported:!!r.annual?.supported};
 }
 return {prediction:null,lower:null,upper:null,actual_model:'Unavailable',fallback:false,reason:r.reason||'No accepted SARIMA forecast',interval_note:'No forecast range',annual_supported:false};
}
function metrics(rows){
 const g=rows.filter(x=>finite(x.prediction)),p=g.filter(x=>x.actual>0),n=g.length,A=rows.length;
 const errors=g.map(x=>Math.abs(x.prediction-x.actual)),hits=g.filter((x,i)=>errors[i]<=Math.max(1,.2*x.actual)).length;
 return {attempted:A,available:n,unavailable:A-n,availability_pct:A?100*n/A:null,MAE:n?errors.reduce((a,b)=>a+b,0)/n:null,RMSE:n?Math.sqrt(errors.reduce((a,b)=>a+b*b,0)/n):null,MAPE_positive_pct:p.length?100*p.reduce((a,x)=>a+Math.abs(x.prediction-x.actual)/x.actual,0)/p.length:null,MAPE_positive_n:p.length,MAPE_zero_actual_excluded:n-p.length,mean_bias:n?g.reduce((a,x)=>a+x.prediction-x.actual,0)/n:null,within_tolerance_hits:hits,within_tolerance_n:n,within_tolerance_pct:n?100*hits/n:null,within_tolerance_all_requests_pct:A?100*hits/A:null,SARIMA_count:g.filter(x=>x.actual_model==='SARIMA').length,fallback_count:g.filter(x=>x.fallback).length};
}
function createLowCountSarimaDemo({directory=DIRECTORY,environment=process.env.NODE_ENV,productionEnabled=process.env.ENABLE_SARIMA_DEMO==='true'}={}){
 let cached;
 function evidence(){
  // Production requires the explicitly authorized opt-in; existing MHO access checks remain in the route.
  if(environment==='production'&&!productionEnabled)throw fail(404,'The saved SARIMA demonstration is disabled in production.','LOCAL_DEMO_ONLY');
  if(cached)return cached;
  try{
   const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
   const verified=(file,digest)=>{const b=fs.readFileSync(path.join(directory,file));if(hash(b)!==digest)throw Error('Integrity failure');return b;};
   const data=JSON.parse(verified('snapshot.json',manifest.snapshot_sha256));verified('SYNTHETIC_monthly.csv',manifest.dataset_sha256);
   if(manifest.dataset_sha256!==SOURCE_HASH||data.context.source_sha256!==SOURCE_HASH||data.context.cases!==6200||data.context.records!==3150||data.context.cutoff!=='2026-09'||data.context.main_target!=='2026-10'||data.version!=='seasonal6200-policyA-SARIMA-v1'||JSON.stringify(data.diseases)!==JSON.stringify(DISEASES)||JSON.stringify(data.barangays)!==JSON.stringify(BARANGAYS)||data.scopes.length!==70||JSON.stringify(data.dates)!==JSON.stringify(Array.from({length:45},(_,i)=>date(i))))throw Error('Invalid evidence scope');
   const views={},seen=new Set(),pooled={'80_20':[],'70_30':[]};let total=0;
   for(const s of data.scopes){
    const key=`${s.disease}\0${s.barangay}`;if(seen.has(key)||!DISEASES.includes(s.disease)||!BARANGAYS.includes(s.barangay)||s.history.length!==45||s.history.some(x=>!Number.isInteger(x)||x<0)||s.outputs.length!==15)throw Error('Invalid series');seen.add(key);total+=s.history.reduce((a,b)=>a+b,0);
    const records=s.outputs.map((o,i)=>{
     const n=31+i;if(o.n!==n||o.target!==date(n)||o.actual!==(n<45?s.history[n]:null)||o.training_digest!==hash(Buffer.from(JSON.stringify(s.history.slice(0,n)))))throw Error('Invalid chronological origin');
     const chosen=resolveSavedForecast(o.sarima,s.history.slice(0,n));const err=n<45&&finite(chosen.prediction)?Math.abs(chosen.prediction-o.actual):null;
     return {...chosen,training_months:n,target:o.target,cutoff:date(n-1),horizon:1,actual:o.actual,available_components:finite(chosen.prediction)?1:0,required_components:1,absolute_error:err,squared_error:err===null?null:err*err,allowed_tolerance:n<45?Math.max(1,.2*o.actual):null,passed_tolerance:err===null?null:err<=Math.max(1,.2*o.actual),configuration:chosen.actual_model==='SARIMA'?`SARIMA(${o.sarima.order.join(',')})(${o.sarima.seasonal_order.join(',')})`:'Seasonal Naive (lag 12)',diagnostics:o.sarima};
    });
    const current=records.at(-1),native=s.outputs.at(-1).sarima,protocols={};
    for(const [protocol,start]of [['80_20',36],['70_30',31]]){const rows=records.filter(x=>x.training_months>=start&&x.training_months<45);protocols[protocol]={'1':{rows,metrics:metrics(rows)}};pooled[protocol].push(...rows);}
    views[key]={id:s.index,disease:s.disease,barangay:s.barangay,label:`${s.disease} / ${s.barangay}`,required_components:1,history:s.history,dates:data.dates,production:{'1':current},protocols,components:[{pair:s.index,disease:s.disease,barangay:s.barangay,usable:finite(current.prediction),configuration:current.configuration,reason:current.reason,actual_model:current.actual_model,seasonal_evidence:native.annual?.grade||'weak_or_uncertain',selection_status:native.selection_status,forecast_1:current.prediction}],configurations:[current.configuration],weak_components:current.actual_model==='SARIMA'&&!native.annual?.supported?1:0,AICc_only_components:native.selection_status==='training_AICc_inner_validation_unavailable'?1:0};
   }
   if(total!==6200)throw Error('Wrong case total');
   const overall=Object.fromEntries(Object.entries(pooled).map(([p,rows])=>[p,{'1':metrics(rows)}]));
   if(overall['80_20']['1'].available!==626||overall['80_20']['1'].within_tolerance_hits!==563)throw Error('Primary evidence mismatch');
   cached={data,manifest,views,overall};return cached;
  }catch{throw fail(503,'The saved low-count forecast evidence could not be verified. Ask the local maintainer to check the bundle.','DEMO_EVIDENCE_UNAVAILABLE');}
 }
 function options(){const {data,manifest,overall}=evidence();return {diseases:DISEASES,barangays:BARANGAYS,context:data.context,overall,policy:{hit_rule:'abs(unrounded prediction-actual)<=max(1,0.20*actual)',measure_approval:'Proposed tolerance; panel acceptance pending',fallback:'None in this saved SARIMA-only bundle; unavailable fits excluded and counted'},provenance:{synthetic:true,mode:'saved_verified_mixed_demonstration_results',retraining:false,dataset_sha256:SOURCE_HASH,evidence_sha256:manifest.evidence_archive_sha256,validation:'Validation pending',version:data.version}};}
 function forecast(query={}){
  if(Object.keys(query).some(k=>!['disease','barangay','protocol','horizon'].includes(k)))throw fail(400,'Unsupported forecast selection.','INVALID_DEMO_SELECTION');
  const {disease,barangay,protocol='80_20',horizon='1'}=query;
  if(typeof disease!=='string'||typeof barangay!=='string'||!DISEASES.includes(disease)||!BARANGAYS.includes(barangay)||!['80_20','70_30'].includes(protocol)||horizon!=='1')throw fail(400,'Choose one study disease and one barangay for a one-month forecast.','INVALID_DEMO_SELECTION');
  const {views,data,overall}=evidence();const view=views[`${disease}\0${barangay}`];const opts=options();
  return {context:data.context,view:structuredClone(view),selection:{disease,barangay,protocol,horizon},overall,policy:opts.policy,missing_components:view.production['1'].prediction===null?view.components:[],provenance:opts.provenance,loaded_saved_results:true,retrained:false};
 }
 return {options,forecast};
}
module.exports={createLowCountSarimaDemo,resolveSavedForecast,metrics,DISEASES,BARANGAYS};
