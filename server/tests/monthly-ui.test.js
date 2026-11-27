const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),P=require('../../assets/js/mho/sarima-presentation');
class Element{
 constructor(tag='div'){Object.assign(this,{tagName:tag,children:[],parentElement:null,attributes:{},listeners:{},value:'',_text:'',disabled:false,hidden:false,open:false,clientWidth:700,dataset:{},classList:{contains:()=>false,toggle(){},add(){},remove(){}}});}
 set textContent(v){this._text=String(v);this.children=[];} get textContent(){return this._text+this.children.map(e=>e.textContent).join('');}
 append(...elements){for(const e of elements){if(e.parentElement)e.parentElement.children=e.parentElement.children.filter(c=>c!==e);e.parentElement=this;this.children.push(e);}}
 createTHead(){const head=new Element('thead');this.append(head);return head;}
 createTBody(){const body=new Element('tbody');this.append(body);return body;}
 insertRow(){const row=new Element('tr');this.append(row);return row;}
 before(e){const p=this.parentElement;p.children.splice(p.children.indexOf(this),0,e);e.parentElement=p;}
 after(e){const p=this.parentElement;p.children.splice(p.children.indexOf(this)+1,0,e);e.parentElement=p;}
 replaceChildren(...e){this.children=[];this.append(...e);this._text='';} setAttribute(k,v){this.attributes[k]=String(v);} addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
 async fire(k,e={}){for(const f of this.listeners[k]||[])await f({preventDefault(){},...e});} get lastElementChild(){return this.children.at(-1);} querySelector(t){return this.children.find(e=>e.tagName===t);} contains(e){return e===this;} focus(){} getBoundingClientRect(){return {left:0,width:700};}
}
const settle=async()=>{await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));};
function app(handler, role='mho', includeProbability=false, Clock=Date){
 const html=role==='admin'?fs.readFileSync(path.join(root,role+'.html'),'utf8'):require('./helpers/legacy-forecast-markup')(role),els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));if(role==='admin')els['monthly-history-source'].value='operational';else if(els['prediction-source'])els['prediction-source'].value='demonstration';else els['view-predictive'].dataset.assignedBarangay='true';if(role!=='admin'){els['sarima-window'].value='24';els['sarima-score-info'].append(new Element('summary'));}
 if(includeProbability){
  const dash=els['sarima-dashboard'],history=new Element('aside'),summary=els['sarima-summary'];
  history.append(new Element('h2'),new Element('svg'));dash.append(history,summary);
  const root=new Element();root.append(dash);
  const months=els['forecast-months'];summary.append(months);
  months.append(new Element('dl'));
  const evaluation=new Element();evaluation.append(els['sarima-evaluation-summary']);summary.append(evaluation);
 }
 const calls=[],document={readyState:'complete',documentElement:new Element('html'),getElementById:id=>{
  if(els[id])return els[id];
  function find(e){if(e.id===id)return e;for(const c of e.children){const hit=find(c);if(hit)return hit;}}
  return els['sarima-dashboard']?find(els['sarima-dashboard'].parentElement||els['sarima-dashboard']):undefined;
 },createElement:t=>new Element(t),createElementNS:(_n,t)=>new Element(t),addEventListener(){},querySelector:()=>new Element('button')};
 const events={};
 const context={document,window:{HealthIntelSarimaPresentation:P,HealthIntel:{apiOrigin:'http://localhost:3000'},confirm:()=>true,addEventListener:(name,handler)=>{events[name]=handler;}},fetch:async(url,options)=>{calls.push({url,options});return handler(url,options);},URLSearchParams,AbortController,Intl,Date:Clock,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame:f=>f(),console};
 context.window.document=document;
 const scripts=role==='admin'?['admin/operational-monthly.js']:[...(includeProbability?['mho/cmp-presentation.js']:[]),'mho/mho-forecast.js'];
 for(const file of scripts)vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js',file),'utf8'),context);
 return {els,calls,context,events};
}
function trainingApp(handler, instant){
 if(!instant)return app(handler,'admin');
 class FixedDate extends Date {
  constructor(...args){super(...(args.length?args:[instant]));}
  static now(){return Date.parse(instant);}
 }
 return app(handler,'admin',false,FixedDate);
}
const ok=data=>({ok:true,json:async()=>({success:true,data})}),error=message=>({ok:false,json:async()=>({success:false,error:message})});
const options={diseases:['Cough'],barangays:['Salvacion'],context:{cutoff:'2026-09'},provenance:{version:'fixture-version'}};
test('a published operational version is selected on startup, never assigned the demonstration score',async()=>{
 const a=app(async url=>(url.endsWith('/status')||url.endsWith('/publication'))?ok({publication:{run_id:'fixture-version'}}):ok(options));await settle();assert.equal(a.els['prediction-source'].value,'operational');assert(a.calls.some(c=>c.url.includes('/operational-predictions/options')));assert(!a.calls.some(c=>c.url.includes('/sarima-demo')));assert(a.els['sarima-provenance'].textContent.includes('confirmed operational'));assert.equal(a.els['sarima-score'].textContent,'Unavailable');assert.equal(a.calls.filter(c=>c.options?.method==='POST').length,0);
});
test('an explicit source choice wins over delayed startup status; a source failure cannot retain old results',async()=>{
 let release;const a=app(async url=>url.endsWith('/publication')?(release?ok({publication:{run_id:'fixture-version'}}):new Promise(r=>release=r)):url.includes('operational-predictions')?error('No operational version is published.'):ok(options));
 a.els['prediction-source'].value='demonstration';await a.els['prediction-source'].fire('change');release(ok({publication:{run_id:'fixture-version'}}));await settle();assert.equal(a.els['prediction-source'].value,'demonstration');assert(a.els['sarima-provenance'].textContent.includes('generated monthly'));
 a.els['prediction-source'].value='operational';await a.els['prediction-source'].fire('change');await settle();assert(a.els['sarima-state'].textContent.includes('No operational version'));assert(a.els['sarima-provenance'].textContent.includes('No demonstration records have been substituted'));assert.equal(a.els['forecast-months'].hidden,true);assert.equal(a.els['predictive-disease-select'].disabled,true);assert.equal(a.els['run-forecast-button'].textContent,'Retry loading');
});
test('Admin training is read-only until an eligible prediction is approved',async()=>{
 const expired={id:'expired-version',cutoff:'2026-09',status:'ready'};
 const current={id:'current-version',cutoff:'2026-10',status:'ready'};
 const state={publication:null,runs:[expired,current],minimum_months:45,python_configured:true};
 const overall={'80_20':{'1':{within_tolerance_hits:7,available:9,attempted:9,MAE:1,RMSE:2,MAPE_positive_pct:3,within_tolerance_pct:100*7/9}}};
 const a=trainingApp(async url=>{
  if(url.endsWith('/status')||url.endsWith('/publication'))return ok(state);
  if(url.endsWith('/publish')){
   state.publication={run_id:current.id};
   return ok(state.publication);
  }
  const run=state.runs.find(item=>url.endsWith('/runs/'+item.id));
  if(run){
   const main_target=run===expired?'2026-10':'2026-11';
   return ok({run,overall,context:{main_target,cutoff:run.cutoff},available:1,current_data_matches:true,scopes:[]});
  }
  return ok(options);
 },'2026-11-27T03:00:00Z');
 await settle();
 assert.equal(a.calls.length,0);
 await a.context.window.HealthIntelMonthlyUpdates.setActive(true);
 const posts=()=>a.calls.filter(call=>call.options?.method==='POST');
 assert.equal(posts().length,0);

 const review=a.els['monthly-review'];
 const publishButton=()=>review.children.find(e=>e.textContent==='Review and publish this version');
 const runRows=a.els['monthly-runs'].children;
 await runRows.find(row=>row.textContent.includes('October 2026 forecast')).children[1].fire('click');
 assert.match(review.textContent,/first prediction month has ended/);
 assert.equal(publishButton(),undefined);
 assert.equal(posts().length,0);

 await runRows.find(row=>row.textContent.includes('November 2026 forecast')).children[1].fire('click');
 let approve=false;
 a.context.window.confirm=()=>approve;
 const publish=publishButton();
 assert.ok(publish);
 await publish.fire('click');
 assert.equal(posts().length,0);
 approve=true;
 await publish.fire('click');
 assert.equal(posts().length,1);
 assert.match(posts()[0].url,/\/publish$/);
 assert.deepEqual(JSON.parse(posts()[0].options.body),{run_id:current.id,acknowledged:true,probability_sha256:null});
 assert.match(a.els['monthly-message'].textContent,/published/);
});
test('actual operational routes deny other roles and sanitize unexpected errors without leaking internals',async()=>{
 const express=require('express'),{registerMonthlyPredictionRoutes}=require('../routes/monthly-prediction-routes');const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={role:req.headers['x-fixture-role']};next();});let calls=0;registerMonthlyPredictionRoutes(app,null,{list:async()=>{calls++;throw Error('private diagnostic detail');}});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));try{const url='http://127.0.0.1:'+server.address().port+'/api/admin/operational-predictions/status';for(const role of ['bhw','mho','superadmin']){const r=await fetch(url,{headers:{'x-fixture-role':role}});assert.equal(r.status,403);}assert.equal(calls,0);const r=await fetch(url,{headers:{'x-fixture-role':'admin'}});assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');assert(!(await r.text()).includes('private diagnostic detail'));}finally{await new Promise(r=>server.close(r));}
});

test('restored monthly reports explain missing confirmations and block a known incomplete month',async()=>{
 const barangays=['Alegria','Blumentritt','Caliban','Cansilayan','Minoyan','Salvacion','Sta. Rosa'];
 const reports=barangays.map((barangay,index)=>({barangay,total:0,pending:index===6?1:0,other:0,confirmed:index<6,stale:false}));
 const state={runs:[],publication:null,python_configured:true,worker_platform:'Windows bounded worker'};
 const a=trainingApp(async url=>(url.endsWith('/status')||url.endsWith('/publication'))?ok(state):url.includes('/reports?')?ok(reports):ok(options));
 await settle();
 await a.context.window.HealthIntelMonthlyUpdates.setActive(true);
 await a.els['monthly-load-reports'].fire('click');
 assert.match(a.els['monthly-report-summary'].textContent,/6 of 7 barangays confirmed/);
 assert.equal(a.els['monthly-step-report-status'].textContent,'6 of 7 confirmed');
 assert.equal(a.els['monthly-step-reports'].attributes['aria-current'],'step');
 assert.equal(a.els['monthly-reports'].children.at(-1).children[1].disabled,true);
 a.els['monthly-start'].value='2020-01';
 await a.els['monthly-create'].fire('click');
 assert.match(a.els['monthly-prepare-message'].textContent,/Finish confirming all seven/);
 assert.equal(a.calls.filter(c=>c.options?.method==='POST').length,0);
 a.els['monthly-report-month'].value='2020-02';
 await a.els['monthly-report-month'].fire('change');
 assert.equal(a.els['monthly-reports'].children.length,0);
});

test('both open portals switch from demonstration to the current publication, and label the result version even if it changes after status', async()=>{
 const {createLowCountSarimaDemo}=require('../services/seasonal6200-sarima-demo');
 const demo=createLowCountSarimaDemo({environment:'test'});
 let version=null, served='v2', failStatus=false;
 const fixture=demo.forecast({disease:'Cough',barangay:'Salvacion'});
 for(const role of ['mho','bhw']){
  version=null;failStatus=false;
  const a=app(async url=>{
   if(/operational-predictions\/(status|publication)$/.test(url))return failStatus?error('Unavailable'):ok({publication:version?{run_id:version}:null});
   if(url.endsWith('/options'))return ok({...options,barangay:'Salvacion',provenance:{version}});
   const result=structuredClone(fixture);
   Object.assign(result.view.production['1'],{prediction:null,lower:null,upper:null});
   result.view.production['1'].actual_model='SARIMA forecast unavailable';
   result.view.production['1'].reason='Fixture rejection';
   result.provenance={mode:'verified_operational_monthly_snapshot',version:served};
   return ok(result);
  },role);
  await settle();
  assert(a.calls.some(c=>c.url.includes('/sarima-demo/options')));
  version='v1';
  await a.context.window.runPredictiveModel();
  assert.match(a.calls.at(-1).url,/operational-predictions\/prediction/);
  assert.match(a.els['sarima-provenance'].textContent,/Published version v2/);
  assert.match(a.els['sarima-state'].textContent,/Published October 2026 prediction/);
  assert.equal(a.els['sarima-main-estimate'].textContent,'Unavailable');
  const before=a.calls.length;failStatus=true;
  await a.context.window.runPredictiveModel();
  assert.equal(a.calls.length,before+1);
  assert.match(a.els['sarima-state'].textContent,/Publication status unavailable/);
  assert.equal(a.els['forecast-months'].hidden,true);
 }
});

test('operational probabilities render in both portals and mismatches keep the SARIMA result visible',async()=>{
 const CMP=require('../services/operational-cmp'),D=require('../services/monthly-data');
 const demo=require('../services/seasonal6200-sarima-demo').createLowCountSarimaDemo({environment:'test'});
 const saved=demo.forecast({disease:'Cough',barangay:'Salvacion'});
 const hashes='a'.repeat(64), run='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 const v={input:{cutoff:'2026-09',target:'2026-10',policy_sha256:hashes},output:{}};
 const binding={...CMP.binding(run,v),probability_sha256:hashes};
 Object.assign(saved.provenance,{mode:binding.mode,version:run,dataset_sha256:binding.dataset_sha256,sarima_output_sha256:D.hash(v.output),sarima_policy_sha256:hashes});
 const row=require('../data/conditional-cmp-6200/results.json').rows.find(r=>r.disease==='Cough'&&r.barangay==='Salvacion');
 saved.experimental_probability={schema:1,status:'available',experimental:true,policy:binding.cmp_policy,binding,...row};
 for(const role of ['mho','bhw']){
  let result=structuredClone(saved);
  const a=app(async url=>/\/(status|publication)$/.test(url)?ok({publication:{run_id:run}})
   :url.endsWith('/options')?ok({...options,barangay:'Salvacion'}):ok(result),role,true);
  await settle();
  const predict=()=>role==='mho'?a.context.window.runPredictiveModel():a.els['run-forecast-button'].fire('click');
  await predict();
  const document=a.context.document;
  const chart=a.els['sarima-chart'].children[0];
  const march=chart.children.find(point=>point.attributes['data-backtest-month']==='2026-03');
  assert.ok(march);
  await march.fire('click');
  await chart.fire('pointermove',{target:march,pointerType:'mouse',clientX:690});
  assert.match(a.els['sarima-chart-readout'].textContent,/March 2026 · Past prediction: 4\.99 cases · Recorded: 3 cases/);
  const recorded=chart.children.find(point=>point.attributes['data-month']==='2026-03');
  const marker=chart.children.find(point=>point.tagName==='circle'&&point.attributes.cx===march.attributes.cx&&point.attributes.cy===march.attributes.cy);
  assert.equal(marker.attributes.r,'2.5');
  await recorded.fire('click');
  assert.match(a.els['sarima-chart-readout'].textContent,/March 2026 · Recorded: 3 cases · Past prediction: 4\.99 cases/);
  const september=chart.children.find(point=>point.attributes['data-backtest-month']==='2026-09');
  await september.fire('keydown',{key:'Enter'});
  assert.match(a.els['sarima-chart-readout'].textContent,/September 2026 · Past prediction: 3\.88 cases · Recorded: 5 cases/);
  assert.equal(document.getElementById('cmp-exact').textContent,'32.27%');
  assert.equal(document.getElementById('cmp-distribution').children.length,1);
  assert.ok(document.getElementById('cmp-history-score'));
  for(const id of ['cmp-history-table','cmp-secondary','cmp-probability-table'])assert.equal(document.getElementById(id),undefined);
  assert.equal(a.els['sarima-main-estimate'].textContent,'4');
  {
   assert.equal(a.els['mho-estimate-model'].textContent,'SARIMA case estimate');
   assert.match(a.els['mho-estimate-unrounded'].textContent,/Unrounded expected count: 3\.7853/);
   assert.equal(document.getElementById('cmp-probability-title').textContent,'COM-Poisson probabilities');
   assert.match(document.getElementById('cmp-intervals').textContent,/COM-Poisson intervals/);
  }
  assert.match(document.getElementById('cmp-count-probabilities').textContent,/COM-Poisson · Estimated probability/);
  result.experimental_probability.binding.sarima_version='another-run';
  await predict();
  assert.match(document.getElementById('cmp-status').textContent,/Experimental probability unavailable/);
  assert.equal(document.getElementById('cmp-distribution').children.length,0);
  assert.equal(a.els['sarima-main-estimate'].textContent,'4');
  result=structuredClone(saved);
  result.experimental_probability=CMP.unavailable('insufficient_prior_prediction_pairs');
  await predict();
  assert.match(document.getElementById('cmp-status').textContent,/too few usable earlier SARIMA predictions/);
  if(role==='mho'){
   result.view.production['1'].actual_model='Seasonal Naive';
   await predict();
   assert.equal(a.els['mho-estimate-model'].textContent,'Seasonal Naive case estimate');
   assert.equal(document.getElementById('cmp-exact').textContent,'Unavailable');
  }
 }
});


test('monthly dates show the inclusive 45-month range and the next forecast month',async()=>{
 const a=trainingApp(async url=>url.endsWith('/status')||url.endsWith('/publication')?ok({runs:[],publication:null}):ok(options));
 await settle();
 const cutoff=a.els['monthly-cutoff'], start=a.els['monthly-start'];
 cutoff.value='2025-10';await cutoff.fire('input');
 assert.equal(start.max,'2022-02');assert.equal(start.min,'2015-11');
 await a.els['monthly-use-range'].fire('click');
 assert.equal(start.value,'2022-02');
 assert.match(a.els['monthly-range-help'].textContent,/45 months selected/);
 assert.equal(a.els['monthly-forecast-month'].textContent,'Prediction period · November 2025 – January 2026');
 cutoff.value='2025-11';await cutoff.fire('input');
 assert.match(a.els['monthly-range-help'].textContent,/46 months selected.*March 2022/);
 assert.equal(a.els['monthly-forecast-month'].textContent,'Prediction period · December 2025 – February 2026');
});

test('disease review reloads an open monthly report without stale classifications',async()=>{
 const barangays=['Alegria','Blumentritt','Caliban','Cansilayan','Minoyan','Salvacion','Sta. Rosa'];
 let pending=1;
 const a=trainingApp(async url=>{
  if(url.endsWith('/status')||url.endsWith('/publication'))return ok({runs:[],publication:null});
  if(url.includes('/reports?'))return ok(barangays.map((barangay,i)=>({barangay,total:0,other:0,pending:i===0?pending:0,confirmed:i!==0})));
  return ok(options);
 });
 await settle();await a.context.window.HealthIntelMonthlyUpdates.setActive(true);
 await a.els['monthly-load-reports'].fire('click');
 assert.equal(a.els['monthly-reports'].children[0].children[1].disabled,true);
 pending=0;a.events['health-intel:classification-reviewed']();await settle();
 assert.equal(a.els['monthly-reports'].children[0].children[1].disabled,false);
 assert.match(a.els['monthly-reports'].textContent,/0 pending classifications/);
 assert(a.calls.filter(call=>call.url.includes('/reports?')).every(call=>call.options.cache==='no-store'));
});

test('show actual worker progress when Monthly Updates is opened',async()=>{
 const a=trainingApp(async url=>url.endsWith('/status')||url.endsWith('/publication')
  ?ok({runs:[{id:'run-fixture',cutoff:'2025-10',status:'running',created_at:new Date(Date.now()-125000).toISOString(),progress:{completed:24}},{id:'queued-fixture',cutoff:'2025-10',status:'queued'},{id:'failed-fixture',cutoff:'2025-10',status:'failed',progress:{state:'failed',message:'Resource control stopped training: host_memory_pressure'}}],publication:null}):ok(options));
 await settle();
 try{
  await a.context.window.HealthIntelMonthlyUpdates.setActive(true);
  const progress=a.els['monthly-runs'].children[0].children[0].children.find(child=>child.tagName==='progress');
  assert.equal(progress.value,24);assert.equal(progress.max,70);
  a.els['monthly-cutoff'].value='2025-10';
  await a.els['monthly-cutoff'].fire('input');
  assert.equal(a.els['monthly-step-train'].attributes['aria-current'],'step');
  assert.equal(a.els['monthly-step-report-status'].textContent,'Confirmed for run');
  assert.match(a.els['monthly-runs'].textContent,/November 2025 forecast.*24 of 70 combinations processed/);
  assert.doesNotMatch(a.els['monthly-runs'].textContent,/available memory/);
  const past=a.els['monthly-past-attempts'],pastRows=a.els['monthly-past-runs'];
  assert.equal(past.hidden,false);assert.equal(past.open,false);
  assert.match(pastRows.textContent,/available memory/);
  past.open=true;const row=pastRows.children[0];
  await a.els['monthly-refresh'].fire('click');
  assert.equal(past.open,true);assert.equal(pastRows.children[0],row);
  assert.match(a.els['monthly-runs'].children[0].textContent,/Elapsed since queued: 0:02:[0-5][0-9]/);
  const waiting=a.els['monthly-runs'].children[1].children[0].children.find(child=>child.tagName==='progress');
  assert.equal(waiting.value,'');
  assert.match(waiting.attributes['aria-label'],/Waiting for the worker/);
  assert.equal(a.els['monthly-load-test'],undefined);
  assert(!a.calls.some(call=>call.options?.method==='POST'));
 }finally{a.context.window.HealthIntelMonthlyUpdates.setActive(false);}
});

test('Disease Review ignores an older queue response after a newer refresh',async()=>{
 const fields=Object.fromEntries(['disease-review-refresh','disease-review-body','disease-review-status','disease-review-count'].map(id=>[id,new Element()]));
 const requests=[],events={};
 const document={getElementById:id=>fields[id],addEventListener:(name,handler)=>{events[name]=handler;},querySelector:()=>null};
 vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/mho/mho-disease-review.js'),'utf8'),{
  document,window:{addEventListener:(name,handler)=>{events[name]=handler;}},HealthIntelEncoding:{escape:String},
  fetch:(_url,options)=>new Promise(resolve=>requests.push({options,resolve}))
 });
 events.DOMContentLoaded();events['health-intel:cases-changed']();
 assert.equal(fields['disease-review-refresh'].disabled,true);
 requests[1].resolve({ok:true,json:async()=>({success:true,data:[]})});await settle();
 requests[0].resolve({ok:true,json:async()=>({success:true,data:[{id:1}]})});await settle();
 assert.equal(fields['disease-review-status'].textContent,'0 cases need classification review.');
 assert.match(fields['disease-review-body'].innerHTML,/No cases are awaiting/);
 assert.equal(fields['disease-review-refresh'].disabled,false);
 assert(requests.every(request=>request.options.cache==='no-store'));
});


test('training status shows a plain-language blocker and a technical disclosure, then clears both after rechecking',async()=>{
 let ready=false;
 const diagnostic='Scientific environment version mismatch: pandas';
 const a=trainingApp(async url=>url.endsWith('/status')||url.endsWith('/publication')
   ?ok({runs:[],publication:null,worker_ready:ready,python_configured:ready,worker_message:ready?null:diagnostic})
   :ok(options));
 await settle();await a.context.window.HealthIntelMonthlyUpdates.setActive(true);
 assert.equal(a.els['monthly-worker-title'].textContent,'Training unavailable');
 assert.match(a.els['monthly-worker-message'].textContent,/still confirm/);
 assert.equal(a.els['monthly-worker-diagnostic'].textContent,diagnostic);
 assert.equal(a.els['monthly-worker-details'].hidden,false);
 assert.equal(a.els['monthly-create'].disabled,true);
 ready=true;await a.els['monthly-check-worker'].fire('click');
 assert.equal(a.els['monthly-worker-title'].textContent,'Training worker ready');
 assert.equal(a.els['monthly-worker-details'].hidden,true);
 assert.equal(a.els['monthly-check-worker'].hidden,true);
 assert.equal(a.els['monthly-create'].disabled,false);
});


test('dataset mode submits an updated preview after the latest month closes and reports are confirmed',async()=>{
 const barangays=['Alegria','Blumentritt','Caliban','Cansilayan','Minoyan','Salvacion','Sta. Rosa'];
 const reports=barangays.map(barangay=>({barangay,total:0,pending:0,other:0,confirmed:true,stale:false}));
 const a=trainingApp(async url=>{
  if(url.endsWith('/status')||url.endsWith('/publication'))return ok({runs:[],publication:null,worker_ready:true,python_configured:true});
  if(url.endsWith('/reports?month=2026-11'))return ok(reports);
  if(url.endsWith('/runs'))return ok({status:'ready'});
  return ok(options);
 },'2026-11-30T16:00:00Z');
 const source=a.els['monthly-history-source'];
 source.value='dataset_plus_reports';
 await source.fire('change');
 await a.context.window.HealthIntelMonthlyUpdates.setActive(true);
 await settle();
 assert.equal(a.els['monthly-start'].readOnly,true);
 assert.equal(a.els['monthly-start'].value,'2023-01');
 assert.equal(a.els['monthly-report-month'].min,'2026-10');
 assert.equal(a.els['monthly-use-range'].hidden,true);
 assert.equal(a.els['monthly-cutoff'].max,'2026-11');
 assert.equal(a.els['monthly-cutoff'].value,'2026-11');
 assert.match(a.els['monthly-report-summary'].textContent,/7 of 7 barangays confirmed/);
 assert.equal(a.els['monthly-forecast-month'].textContent,'Prediction period · December 2026 – February 2027');
 await a.els['monthly-create'].fire('click');
 const posted=a.calls.find(call=>call.url.endsWith('/runs')&&call.options?.method==='POST');
 assert.ok(posted,a.els['monthly-prepare-message'].textContent);
 assert.deepEqual(JSON.parse(posted.options.body),{start:'2023-01',cutoff:'2026-11',mode:'dataset_plus_reports'});
});

test('Admin selects an eligible saved CSV and submits its immutable version for preview training',async()=>{
 const id='a'.repeat(64);
 const a=trainingApp(async(url,options)=>url.endsWith('/runs')&&options?.method==='POST'
  ?ok({id:'preview-run',status:'ready'}):ok({runs:[],publication:null,worker_ready:true,python_configured:true}));
 const source=a.els['monthly-history-source'];
 source.options=[{value:'operational'},{value:'dataset_plus_reports'}];
 source.add=option=>source.options.push(option);
 a.context.Option=function(text,value){return {text,value,remove(){source.options=source.options.filter(option=>option.value!==value);}};};
 await a.context.window.HealthIntelMonthlyUpdates.setActive(true);
 a.context.window.HealthIntelMonthlyUpdates.setDatasets([
  {id,label:'Upload aaaaaaaa',trainingRange:{start:'2023-01',cutoff:'2026-09',months:45}},
  {id:'b'.repeat(64),label:'Incomplete',trainingRange:null}
 ]);
 assert.equal(source.options.length,3);
 source.value='upload:'+id;
 await source.fire('change');
 assert.equal(a.els['monthly-start'].value,'2023-01');
 assert.equal(a.els['monthly-cutoff'].value,'2026-09');
 assert.equal(a.els['monthly-report-card'].hidden,true);
 assert.equal(a.els['monthly-step-review-label'].textContent,'Review results');
 await a.els['monthly-create'].fire('click');
 const posted=a.calls.find(call=>call.url.endsWith('/runs')&&call.options?.method==='POST');
 assert.deepEqual(JSON.parse(posted.options.body),{start:'2023-01',cutoff:'2026-09',mode:'dataset_plus_reports',dataset_id:id});
 await a.context.window.HealthIntelMonthlyUpdates.setActive(false);
});
