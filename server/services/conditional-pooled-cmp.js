'use strict';
// Read-only frozen probability attachment. No fitting, patient access or SARIMA changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const EXPECTED_MANIFEST='a75a4debd1dad79dc0eb7976b07572ea670dc374ebd8fc34c0f8aa0dc9a213a1';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function validateRow(r){
 if(!r||!finite(r.mean)||r.mean<0||!finite(r.nu)||r.nu<=0||r.count!==Math.floor(r.mean+.5))throw Error('Invalid mean/count');
 const p=r.probabilities;if(!Array.isArray(p)||!p.length||p.length>8193||p.some(x=>!finite(x)||x<0||x>1))throw Error('Invalid probability mass');
 const near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<1e-8;
 if(!near(p.reduce((a,b)=>a+b,0),1)||!near(p.reduce((a,b,k)=>a+k*b,0),r.mean)||!near(p[r.count]||0,r.exact)||!near(p.slice(Math.max(0,r.count-1),r.count+2).reduce((a,b)=>a+b,0),r.nearby)||!near(1-p[0],r.positive))throw Error('Inconsistent distribution');
 for(const [key,level]of [['range80',.8],['range95',.95]]){
  let sum=0;const interval=[];for(let k=0;k<p.length;k++){sum+=p[k];if(!interval.length&&sum>=(1-level)/2)interval.push(k);if(sum>=(1+level)/2){interval.push(k);break;}}
  if(JSON.stringify(interval)!==JSON.stringify(r[key]))throw Error('Interval mismatch');
 }
 return r;
}
function createConditionalCmp({env=process.env,directory=path.join(__dirname,'../data/conditional-cmp-6200'),sourceDirectory=path.join(__dirname,'../data/seasonal-sarima-6200'),policyPath=path.join(__dirname,'../forecasting/policy-a/policy.json')}={}){
 const loopback=['127.0.0.1','::1','localhost'].includes(env.HOST);
 const enabled=loopback&&(env.NODE_ENV==='production'
  ? env.ENABLE_SAVED_PREDICTION_EXTRAS==='true'
  : env.ENABLE_EXPERIMENTAL_CMP==='true');
 const unavailable=code=>({schema:1,status:'unavailable',experimental:true,policy:'conditional-pooled-CMP',reason:code});
 function augment(result){
  if(!enabled)return result;
  let attachment;
  try{
   const raw=fs.readFileSync(path.join(directory,'manifest.json'));if(hash(raw)!==EXPECTED_MANIFEST)throw Error('manifest');
   const manifest=JSON.parse(raw),binding=manifest.binding;
   const bytes=fs.readFileSync(path.join(directory,'results.json'));if(hash(bytes)!==manifest.results_sha256)throw Error('results');
   const sm=JSON.parse(fs.readFileSync(path.join(sourceDirectory,'manifest.json')));
   if(sm.dataset_sha256!==binding.dataset_sha256||sm.snapshot_sha256!==binding.snapshot_sha256||hash(fs.readFileSync(path.join(sourceDirectory,'snapshot.json')))!==binding.snapshot_sha256||hash(fs.readFileSync(path.join(sourceDirectory,'SYNTHETIC_monthly.csv')))!==binding.dataset_sha256||hash(fs.readFileSync(policyPath))!==binding.sarima_policy_sha256)throw Error('source');
   const {context:c,view:v,provenance:p}=result,forecast=v?.production?.['1'];
   if(p?.mode!==binding.mode||p.version!==binding.sarima_version||p.dataset_sha256!==binding.dataset_sha256||c?.source_sha256!==binding.dataset_sha256||c.cutoff!==binding.cutoff||forecast?.cutoff!==binding.cutoff||forecast.target!==binding.target||forecast.horizon!==1||forecast.actual_model!=='SARIMA'||!finite(forecast.prediction)||forecast.prediction<0)throw Error('binding');
   const all=JSON.parse(bytes);if(all.schema!==1||all.policy!==binding.cmp_policy||all.rows.length!==70||new Set(all.rows.map(r=>r.disease+'\0'+r.barangay)).size!==70)throw Error('scope');
   const row=validateRow(all.rows.find(r=>r.disease===v.disease&&r.barangay===v.barangay));
   if(Math.abs(row.mean-forecast.prediction)>1e-10||row.count!==Math.floor(forecast.prediction+.5))throw Error('mean');
   attachment={schema:1,status:'available',experimental:true,policy:binding.cmp_policy,binding:{...binding,manifest_sha256:EXPECTED_MANIFEST,results_sha256:manifest.results_sha256},...row};
  }catch{attachment=unavailable('PROBABILITY_EVIDENCE_UNAVAILABLE_OR_MISMATCHED');}
  return {...result,experimental_probability:attachment};
 }
 return {enabled,augment};
}
module.exports={createConditionalCmp,validateRow,EXPECTED_MANIFEST};
