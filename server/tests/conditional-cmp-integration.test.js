'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createConditionalCmp,validateRow}=require('../services/conditional-pooled-cmp');
const {createLowCountSarimaDemo,BARANGAYS,DISEASES}=require('../services/seasonal6200-sarima-demo');
const {validate,percent,probabilityCalculation}=require('../../assets/js/mho/cmp-presentation');
const {registerBalancedSarimaRoutes,registerBhwSarimaRoutes}=require('../routes/balanced-sarima-routes');
const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/conditional-cmp-6200/results.json'))).rows;
const service=createLowCountSarimaDemo({environment:'test'}),env={NODE_ENV:'test',HOST:'127.0.0.1',ENABLE_EXPERIMENTAL_CMP:'true'},cmp=createConditionalCmp({env});
const forecast=(d,b)=>service.forecast({disease:d,barangay:b});
function routes(role,probability=cmp){const registered=new Map(),app={get(p,fn){registered.set(p,fn);}},db={async execute(_sql,args){return [[{name:BARANGAYS[args[0]-1]}]];}};if(role==='bhw')registerBhwSarimaRoutes(app,db,service,probability);else registerBalancedSarimaRoutes(app,service,probability);return registered;}
async function request(map,url,{role='mho',id=1,query={}}={}){let status=200,body;const res={set(){return this;},status(n){status=n;return this;},json(x){body=x;return this;}};await map.get(url)({user:{role,barangay_id:id},query},res);return {status,body};}
test('all 70 attachments preserve SARIMA fields and match private frozen conditional outputs',()=>{
 assert.equal(rows.length,70);
 for(const r of rows){const saved=forecast(r.disease,r.barangay),before=JSON.stringify(saved),result=cmp.augment(saved),p=result.experimental_probability;
  assert.equal(p.status,'available');assert.deepEqual(validate(result),p);assert.equal(JSON.stringify(saved),before);
  for(const key of ['mean','count','nu','exact','nearby','positive','range80','range95','probabilities'])assert.deepEqual(p[key],r[key]);
  const explanation=probabilityCalculation(p);
  assert.equal(explanation.exact,p.exact);
  assert.ok(Math.abs(explanation.total-p.nearby)<1e-12);
  assert.deepEqual(explanation.nearby.map(row=>row.count),Array.from({length:p.count===0?2:3},(_,i)=>Math.max(0,p.count-1)+i));
  assert.deepEqual(result.view,saved.view);assert.deepEqual(result.context,saved.context);assert.deepEqual(result.overall,saved.overall);
 }
 const c=cmp.augment(forecast('Cough','Salvacion')).experimental_probability;
 assert.equal(c.count,4);assert.equal(percent(c.exact),'32.27%');assert.equal(percent(c.nearby),'79.89%');assert.deepEqual(c.range80,[2,5]);assert.deepEqual(c.range95,[2,6]);
});
test('off, production and non-loopback flags preserve existing SARIMA contract',()=>{
 const saved=forecast('Cough','Salvacion');
 for(const changed of [{...env,ENABLE_EXPERIMENTAL_CMP:'false'},{...env,NODE_ENV:'production'},{...env,HOST:'0.0.0.0'},{...env,HOST:undefined}]){const c=createConditionalCmp({env:changed});assert.equal(c.enabled,false);assert.equal(c.augment(saved),saved);}
});
test('wrong date, mean, mode, model, source and scope never borrow probability evidence',()=>{
 const changes=[r=>r.context.cutoff='2026-10',r=>r.context.source_sha256='0'.repeat(64),r=>r.provenance.version='new',r=>r.provenance.mode='verified_operational_monthly_snapshot',r=>r.provenance.dataset_sha256='0'.repeat(64),r=>r.view.production['1'].target='2026-11',r=>r.view.production['1'].horizon=2,r=>r.view.production['1'].actual_model='AR1',r=>r.view.production['1'].prediction+=.01,r=>r.view.production['1'].prediction=null,r=>r.view.production['1'].prediction=-1,r=>r.view.production['1'].prediction=NaN,r=>r.view.barangay='Unknown',r=>r.view.disease='Unlisted'];
 for(const edit of changes){const r=structuredClone(forecast('Cough','Salvacion'));edit(r);const out=cmp.augment(r);assert.equal(out.experimental_probability.status,'unavailable');assert.equal(validate(out),null);assert.deepEqual(out.view,r.view);}
 const missing=createConditionalCmp({env,directory:path.join(__dirname,'missing-CMP-fixture')}).augment(forecast('Cough','Salvacion'));assert.equal(missing.experimental_probability.status,'unavailable');
});
test('client rejects tampered probabilities, intervals, original CMP variant and cross-selection data',()=>{
 const edits=[r=>r.experimental_probability.exact=.99,r=>r.experimental_probability.nearby=1,r=>r.experimental_probability.range95=[0,99],r=>r.experimental_probability.mean+=.1,r=>r.experimental_probability.barangay='Minoyan',r=>r.experimental_probability.policy='original-CMP',r=>r.experimental_probability.binding.target='2026-11',r=>r.experimental_probability.binding.manifest_sha256='invalid',r=>r.experimental_probability.probabilities[0]=NaN];
 for(const edit of edits){const r=cmp.augment(forecast('Cough','Salvacion'));edit(r);assert.equal(validate(r),null);}
 assert.equal(percent(.999999),'>99.99%');assert.equal(percent(.000001),'<0.01%');assert.equal(percent(1),'100%');assert.equal(percent(null),'Unavailable');
});
test('zero-mean consistency and impossible distributions are checked without inventing rates',()=>{
 const r={...rows[0],mean:0,count:0,nu:1,exact:1,nearby:1,positive:0,probabilities:[1],range80:[0,0],range95:[0,0]};assert.equal(validateRow(r),r);assert.throws(()=>validateRow({...r,probabilities:[]}));assert.throws(()=>validateRow({...r,mean:-1}));
});
test('MHO route returns matching attachments and rejects other roles',async()=>{
 const map=routes('mho');let r=await request(map,'/api/mho/sarima-demo/options');assert.equal(r.body.data.experimental_probability_enabled,true);
 for(const row of rows){r=await request(map,'/api/mho/sarima-demo',{query:{disease:row.disease,barangay:row.barangay}});assert.equal(r.status,200);assert.equal(validate(r.body.data).exact,row.exact);}
 assert.equal((await request(map,'/api/mho/sarima-demo',{role:'bhw'})).status,403);
});
test('seven BHW assignments expose exactly ten own scopes; tampered barangay inputs cannot cross scope',async()=>{
 const map=routes('bhw');
 for(let id=1;id<=7;id++){
  const opts=await request(map,'/api/bhw/sarima-demo/options',{role:'bhw',id});assert.equal(opts.body.data.barangay,BARANGAYS[id-1]);assert.deepEqual(opts.body.data.diseases,DISEASES);
  for(const disease of DISEASES){const r=await request(map,'/api/bhw/sarima-demo',{role:'bhw',id,query:{disease,barangay_id:'999'}});assert.equal(r.status,200);const a=validate(r.body.data);assert.equal(a.barangay,BARANGAYS[id-1]);assert.equal(Object.hasOwn(r.body.data,'overall'),false);}
  assert.equal((await request(map,'/api/bhw/sarima-demo',{role:'bhw',id,query:{disease:'Cough',barangay:'Salvacion'}})).status,400);
 }
 assert.equal((await request(map,'/api/bhw/sarima-demo',{role:'admin'})).status,403);assert.equal((await request(map,'/api/bhw/sarima-demo',{role:'bhw',id:null})).status,403);
});
test('unavailable historical outputs and selected denominators remain unchanged',()=>{const r=cmp.augment(forecast('Influenza','Caliban'));const m=r.view.protocols['80_20']['1'].metrics;assert.equal(m.available,5);assert.equal(m.unavailable,4);assert.equal(m.attempted,9);assert.equal(r.overall['80_20']['1'].available,626);assert.equal(r.overall['80_20']['1'].within_tolerance_hits,563);});

test('production opt-in preserves frozen means and attaches only matching probability and audited fallback rows',()=>{
 const production={NODE_ENV:'production',HOST:'127.0.0.1',ENABLE_SAVED_PREDICTION_EXTRAS:'true'};
 const frozen=createLowCountSarimaDemo({environment:'production',productionEnabled:true,extrasEnabled:false});
 const live=createLowCountSarimaDemo({environment:'production',productionEnabled:true,extrasEnabled:true});
 const probability=createConditionalCmp({env:production});
 assert.equal(createConditionalCmp({env:{...production,HOST:'0.0.0.0'}}).enabled,false);
 assert.equal(probability.enabled,true);
 for(const row of rows){
  const query={disease:row.disease,barangay:row.barangay};
  const result=probability.augment(live.forecast(query));
  const {seasonal_fallback:fallback,...view}=result.view;
  assert.deepEqual(view,frozen.forecast(query).view);
  assert.equal(validate(result).exact,row.exact);
  if(row.disease==='Influenza'&&row.barangay==='Caliban'){
   assert.equal(fallback.historical.sarima_available,5);
   assert.equal(fallback.historical.combined_available,9);
   assert.deepEqual(fallback.historical.rows.map(r=>r.prediction),[1,2,2,2]);
  }
 }
});

test('Admin prediction lookup reuses the verified demonstration and published probability results', async () => {
 const {registerAdminAnalyticsRoutes}=require('../routes/admin-analytics-routes');
 const registered=new Map();
 const app={get(url,handler){registered.set(url,handler);},post(){}};
 const key={disease:'Cough',barangay:'Salvacion'};
 const published={experimental_probability:{status:'unavailable',reason:'genuine_history_review_required'}};
 registerAdminAnalyticsRoutes(app,{}, {forecast:async()=>published},cmp);
 const demoUrl='/api/admin/analytics/predictions/demo';
 const response=await request(registered,demoUrl,{role:'admin',query:key});
 assert.equal(response.status,200);
 assert.equal(percent(validate(response.body.data).exact),'32.27%');
 assert.equal((await request(registered,demoUrl,{role:'mho',query:key})).status,403);
 const operational=await request(registered,'/api/admin/analytics/predictions/published',{role:'admin',query:key});
 assert.deepEqual(operational.body.data,published);
 registerAdminAnalyticsRoutes(app,{}, {},createConditionalCmp({env:{...env,ENABLE_EXPERIMENTAL_CMP:'false'}}));
 const disabled=await request(registered,demoUrl,{role:'admin',query:key});
 assert.equal(disabled.status,200);
 assert.equal(disabled.body.data.experimental_probability,undefined);
});
