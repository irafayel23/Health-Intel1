'use strict';
const crypto=require('node:crypto');
const {DISEASES,BARANGAYS,metrics,resolveSavedForecast}=require('./seasonal6200-sarima-demo');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(message,status=400)=>Object.assign(Error(message),{status,code:'MONTHLY_PREDICTION_CHECK'});
function month(value){if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)||value<'1900-01'||value>'2199-12')throw fail('Choose a valid reporting month.');return value;}
function next(value){month(value);const [y,m]=value.split('-').map(Number);return `${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,'0')}`;}
function currentMonth(now=new Date()){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit'}).formatToParts(now);return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value;}
function closed(value,now){month(value);if(value>=currentMonth(now))throw fail('Only completed Philippine calendar months can be confirmed.');return value;}
function months(start,end){month(start);month(end);if(start>end)throw fail('The first month must not follow the last month.');const result=[];for(let value=start;value<=end;value=next(value)){result.push(value);if(result.length>120)throw fail('Choose no more than 120 consecutive monthly reports.');}return result;}
function summarize(rows,barangay){
 if(!BARANGAYS.includes(barangay))throw fail('Choose one of the seven pilot barangays.');
 const records=rows.filter(r=>r.barangay===barangay).map(r=>[Number(r.id),r.date_recorded,r.disease??null,r.disease_review_status??null,!!r.is_archived,r.deleted_at??null]).sort((a,b)=>a[0]-b[0]);
 const counts=Object.fromEntries(DISEASES.map(d=>[d,0]));let pending=0,other=0;
 for(const [,date,disease,review,archived,deleted] of records){
  if(archived||deleted)continue;
  if(['Pending','Clarification'].includes(review)){pending++;continue;}
  if(Object.hasOwn(counts,disease))counts[disease]++;else other++;
 }
 return {barangay,digest:hash(records),counts,total:Object.values(counts).reduce((a,b)=>a+b,0),pending,other};
}
function validateInput(input){
 const dates=months(input.start,input.cutoff);if(dates.length<45)throw fail('At least 45 consecutive, confirmed operational months are required for the primary and secondary historical evaluations.');
 if(input.mode!=='operational'||input.target!==next(input.cutoff)||input.scopes.length!==70)throw fail('Invalid operational input.');
 const keys=new Set();for(const s of input.scopes){const key=s.disease+'\0'+s.barangay;if(!DISEASES.includes(s.disease)||!BARANGAYS.includes(s.barangay)||keys.has(key)||s.history.length!==dates.length||s.history.some(v=>!Number.isSafeInteger(v)||v<0))throw fail('Operational histories must contain all 70 unique selections and confirmed monthly integer counts.');keys.add(key);}
 return dates;
}
function validateOutput(input,output){
 const dates=validateInput(input),N=dates.length;
 if(output.input_sha256!==hash(input)||output.policy_sha256!==input.policy_sha256||!Array.isArray(output.scopes)||output.scopes.length!==70)throw fail('The candidate output does not match the frozen operational input.',409);
 const views={},pooled={'80_20':[],'70_30':[]};
 for(let i=0;i<70;i++){
  const s=input.scopes[i],o=output.scopes[i];if(o.disease!==s.disease||o.barangay!==s.barangay||JSON.stringify(o.history)!==JSON.stringify(s.history)||o.outputs.length!==N-30)throw fail('Candidate selection or history mismatch.',409);
  const records=o.outputs.map((r,j)=>{const n=31+j,target=n===N?input.target:dates[n];if(r.n!==n||r.target!==target||r.actual!==(n===N?null:s.history[n])||r.training_digest!==hash(s.history.slice(0,n)))throw fail('Candidate dates or training prefixes do not match.',409);if(r.sarima.usable&&(r.sarima.input_n!==n||r.sarima.variant!=='optimized'))throw fail('The fitted configuration does not match the registered training prefix.',409);const selected=resolveSavedForecast(r.sarima,s.history.slice(0,n));const error=n===N||selected.prediction===null?null:Math.abs(selected.prediction-r.actual);return {...selected,training_months:n,target,cutoff:dates[n-1],horizon:1,actual:r.actual,absolute_error:error,squared_error:error===null?null:error*error,allowed_tolerance:n===N?null:Math.max(1,.2*r.actual),passed_tolerance:error===null?null:error<=Math.max(1,.2*r.actual),configuration:selected.prediction===null?'Unavailable':`SARIMA(${r.sarima.order.join(',')})(${r.sarima.seasonal_order.join(',')})`,diagnostics:r.sarima,required_components:1,available_components:selected.prediction===null?0:1};});
  const protocols={};for(const [name,fraction] of [['80_20',.8],['70_30',.7]]){const start=Math.floor(fraction*N);if(start<31)throw fail('Too little initial training history.');const rows=records.filter(r=>r.training_months>=start&&r.training_months<N);protocols[name]={'1':{rows,metrics:metrics(rows)}};pooled[name].push(...rows);}
  const current=records.at(-1),native=o.outputs.at(-1).sarima,key=s.disease+'\0'+s.barangay;
  views[key]={id:i,disease:s.disease,barangay:s.barangay,label:s.disease+' / '+s.barangay,required_components:1,history:s.history,dates,production:{'1':current},protocols,components:[{pair:i,disease:s.disease,barangay:s.barangay,usable:current.prediction!==null,actual_model:current.actual_model,configuration:current.configuration,reason:current.reason,forecast_1:current.prediction,seasonal_evidence:native.annual?.grade||'weak_or_uncertain'}],configurations:[current.configuration],weak_components:current.prediction!==null&&!native.annual?.supported?1:0,AICc_only_components:native.selection_status==='training_AICc_inner_validation_unavailable'?1:0};
 }
 return {views,overall:Object.fromEntries(Object.entries(pooled).map(([p,r])=>[p,{'1':metrics(r)}])),context:{cutoff:input.cutoff,main_target:input.target,records:N*70,cases:input.scopes.reduce((a,s)=>a+s.history.reduce((b,v)=>b+v,0),0)},available:Object.values(views).filter(v=>v.production['1'].prediction!==null).length};
}
module.exports={DISEASES,BARANGAYS,hash,fail,month,next,currentMonth,closed,months,summarize,validateInput,validateOutput};
