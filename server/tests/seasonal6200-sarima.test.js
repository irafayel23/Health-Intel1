const {test}=require('node:test');const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');const root=path.resolve(__dirname,'../..');const P=require('../../assets/js/mho/sarima-presentation');const {createLowCountSarimaDemo,metrics,resolveSavedForecast,resolveSeasonalFallback}=require('../services/seasonal6200-sarima-demo');const service=createLowCountSarimaDemo({environment:'test'});const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/seasonal-sarima-6200/snapshot.json')));const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);const safeQuery=s=>({disease:s.disease,barangay:s.barangay});
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.listeners={};this.hidden=false;this.disabled=false;this.value='';this.open=false;this._text='';this.clientWidth=700;this.dataset={};this.className='';this.classes=new Set();this.classList={contains:s=>this.classes.has(s),toggle:(s,on)=>{if(on===undefined)on=!this.classes.has(s);on?this.classes.add(s):this.classes.delete(s);return on;},add:s=>this.classes.add(s),remove:s=>this.classes.delete(s)};}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 set textContent(t){this._text=String(t);this.children=[];}
 append(...items){this.children.push(...items);}
 appendChild(item){this.append(item);return item;}
 replaceChildren(...items){this.children=items;this._text='';}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
 dispatch(k,event={}){for(const f of this.listeners[k]||[])f({preventDefault(){},...event});}
 getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:420};}
 contains(target){return target===this||this.children.some(c=>c.contains(target));}
 querySelector(tag){return this.children.find(c=>c.tagName===tag)||null;}
 focus(){this.dispatch('focus');}
}
const settle=async()=>{await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));};
function app({width=700,fetcher,role='mho'}={}){
 const html=fs.readFileSync(path.join(root,role+'.html'),'utf8'),els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 if(role==='bhw')els['view-predictive'].dataset.assignedBarangay='true';
 els['sarima-window'].value='24';els['sarima-chart'].clientWidth=width;
 els['sarima-score-info'].append(new Element('summary'));
 const docRoot=new Element('html'),document={readyState:'complete',documentElement:docRoot,getElementById:id=>els[id]||null,createElement:tag=>new Element(tag),createElementNS:(_ns,tag)=>new Element(tag),addEventListener(){},querySelector:()=>new Element('button')};
 let requestCount=0;
 const fetch=async url=>{
  requestCount++;if(fetcher){const handled=await fetcher(url,requestCount);if(handled)return handled;}
  const u=new URL(url),data=/operational-predictions\/(publication|status)$/.test(u.pathname)?{publication:null}:u.pathname.endsWith('/options')?service.options():service.forecast(Object.fromEntries(u.searchParams));
  return {ok:true,json:async()=>({success:true,data})};
 };
 const context={window:{HealthIntelSarimaPresentation:P,HealthIntel:{apiOrigin:'http://localhost:3000'}},document,fetch,URLSearchParams,AbortController,setTimeout,clearTimeout,requestAnimationFrame:f=>f(),console};
 vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/mho/mho-forecast.js'),'utf8'),context);
 return {els,context,docRoot,run:()=>context.window.runPredictiveModel(),select:(d,b)=>{els['predictive-disease-select'].value=d;els['predictive-brgy-select'].value=b;els['predictive-disease-select'].dispatch('change');}};
}
const allNodes=root=>[root,...root.children.flatMap(allNodes)];

test('all 70 real frontend selections: estimate, own score/errors, method, warning, graph, summary and recommendation rules',async()=>{
 for(const width of [300,700,1000,1250]){
  const a=app({width});await settle();assert.equal(a.els['predictive-disease-select'].children.length,10);assert.equal(a.els['predictive-brgy-select'].children.length,7);
  for(const s of snapshot.scopes){
   a.select(s.disease,s.barangay);await a.run();const d=P.derive(service.forecast(safeQuery(s)));
   assert.equal(a.els['sarima-method'].textContent,'SARIMA');assert.equal(a.els['sarima-main-estimate'].textContent,P.format(d.prediction,0));
   assert.equal(a.els['sarima-score'].textContent,P.format(d.score)+'%');assert.equal(a.els['sarima-mae'].textContent,P.format(d.metrics.MAE));assert.equal(a.els['sarima-rmse'].textContent,P.format(d.metrics.RMSE));assert.equal(a.els['sarima-mape'].textContent,P.format(d.metrics.MAPE_positive_pct)+'%');
   assert.equal(a.els['sarima-seasonality-note'].hidden,!d.view.weak_components);assert.equal(a.els['predictive-insight-text'].textContent,d.explanation);
   assert.deepEqual(a.els['forecast-recommendations'].children.map(x=>x.dataset.rule),d.recommendations.map(x=>x.id));
   const nodes=allNodes(a.els['sarima-chart']);assert.equal(nodes.filter(n=>n.attributes['data-series']==='forecast').length,1);
   assert.equal(nodes.filter(n=>n.attributes['data-forecast-interval']).length,1);assert(!a.els['sarima-chart'].textContent.includes('NaN'));
   nodes.find(n=>n.attributes['data-month']==='2026-10').focus();assert(a.els['sarima-chart-readout'].textContent.includes(P.format(d.prediction,0)+' estimated cases'));
  }
 }
});

test('missing historical SARIMA fits stay missing on card and chart, not fallback or zero',async()=>{
 const a=app();await settle();a.select('Influenza','Caliban');await a.run();
 assert.match(a.els['sarima-score-note'].textContent,/5 of 9 historical predictions available; 4 unavailable/);
 const d=service.forecast({disease:'Influenza',barangay:'Caliban'});
 assert.equal(d.view.protocols['80_20']['1'].rows.filter(r=>r.prediction===null).length,4);
 assert.equal(d.view.protocols['80_20']['1'].metrics.fallback_count,0);
 assert(!allNodes(a.els['sarima-chart']).some(n=>Object.values(n.attributes).some(v=>/NaN|undefined/.test(v))));
});

test('local fallback fills only documented gaps and leaves original SARIMA scores and October intact',async()=>{
 const query={disease:'Influenza',barangay:'Caliban'};
 const local=service.forecast(query);
 const production=createLowCountSarimaDemo({environment:'production',productionEnabled:true}).forecast(query);
 const {seasonal_fallback:fallback,...original}=local.view;
 assert.deepEqual(original,production.view);
 assert.equal(fallback.current,null);
 assert.deepEqual(fallback.historical.rows.map(r=>[r.target,r.source_month,r.prediction,r.actual,r.absolute_error]),[
  ['2026-01','2025-01',1,1,0],['2026-05','2025-05',2,2,0],
  ['2026-07','2025-07',2,2,0],['2026-08','2025-08',2,4,2],
 ]);
 assert.deepEqual([fallback.historical.sarima_available,fallback.historical.combined_available,fallback.historical.attempted],[5,9,9]);
 for (const role of ['mho','bhw']) {
  const a=app({role,fetcher:async url=>url.endsWith('/operational-predictions/status')?{ok:true,json:async()=>({success:true,data:{publication:null}})}:role==='bhw' ? {ok:true,json:async()=>({
   success:true,data:url.endsWith('/options')?{barangay:'Caliban',diseases:service.options().diseases}:service.forecast({disease:new URL(url).searchParams.get('disease'),barangay:'Caliban'}),
  })} : null});
  await settle();a.select(query.disease,query.barangay);await a.run();
  assert.equal(a.els['sarima-fallback'].hidden,false);
  assert.equal(a.els['sarima-fallback-rows'].children.length,4);
  assert.match(a.els['sarima-fallback-coverage'].textContent,/SARIMA 5 of 9 · With fallback 9 of 9/);
  assert.match(a.els['sarima-fallback-rows'].children[3].textContent,/August 2026 · 2 cases.*Fallback estimate — previous year's same month.*August 2025.*Historical actual: 4/);
  assert.doesNotMatch(a.els['sarima-fallback-rows'].textContent,/Poisson|probabilit|%/i);
  assert.equal(a.els['sarima-method'].textContent,'SARIMA');
  a.select('Cough','Caliban');await a.run();
  assert.equal(a.els['sarima-fallback'].hidden,true);
  assert.equal(a.els['sarima-fallback-rows'].children.length,0);
 }
});

test('fallback preserves a recorded zero and requires all nine audited rejection reasons',()=>{
 const query={disease:'Influenza',barangay:'Caliban'};
 const view=service.forecast(query).view;
 const row=view.protocols['80_20']['1'].rows[0];
 const counts=view.history.slice();
 counts[row.training_months-12]=0;
 assert.equal(resolveSeasonalFallback(row,counts).prediction,0);
 delete counts[row.training_months-12];
 assert.equal(resolveSeasonalFallback(row,counts),null);
 const bad=structuredClone(row);
 bad.diagnostics.selection_log[0].failure_stage='resource_control';
 assert.equal(resolveSeasonalFallback(bad,view.history),null);
 bad.diagnostics.selection_log.pop();
 assert.equal(resolveSeasonalFallback(bad,view.history),null);
 assert.equal(resolveSeasonalFallback(view.production['1'],view.history),null);
});

test('zero-count arithmetic, unavailable outputs and weak seasonal evidence remain honest',async()=>{
 const m=metrics([{actual:0,prediction:0},{actual:0,prediction:null},{actual:2,prediction:2.9}]);
 assert.equal(m.available,2);assert.equal(m.within_tolerance_hits,2);assert.equal(m.MAPE_positive_n,1);assert.equal(m.MAPE_zero_actual_excluded,1);
 assert.equal(resolveSavedForecast({usable:false,reason:'Rejected'},Array(45).fill(0)).prediction,null);
 const response=service.forecast({disease:'Cough',barangay:'Salvacion'});
 Object.assign(response.view.production['1'],{prediction:null,lower:null,upper:null,actual_model:'Unavailable'});
 const a=app({fetcher:async url=>url.endsWith('/options')||url.endsWith('/publication')?null:{ok:true,json:async()=>({success:true,data:response})}});await settle();await a.run();
 assert.equal(a.els['sarima-main-estimate'].textContent,'Unavailable');
 assert(!allNodes(a.els['sarima-chart']).some(n=>n.attributes['data-series']==='forecast'));
 assert.deepEqual(a.els['forecast-recommendations'].children.map(x=>x.dataset.rule),['R7']);
});
test('invalid scope and tampered copied evidence rejected',()=>{
 assert.throws(()=>service.forecast({disease:'ALL',barangay:'ALL'}),e=>e.status===400);
 const os=require('node:os'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'preview6200-'));
 for(const f of ['snapshot.json','manifest.json','SYNTHETIC_monthly.csv'])fs.copyFileSync(path.join(__dirname,'../data/seasonal-sarima-6200',f),path.join(tmp,f));
 fs.appendFileSync(path.join(tmp,'SYNTHETIC_monthly.csv'),'tamper');
 assert.throws(()=>createLowCountSarimaDemo({directory:tmp,environment:'test'}).options(),e=>e.status===503);
 // Temporary evidence is retained; no research or application artifacts deleted.
});
test('network failure and selection change clear stale graph/results',async()=>{
 let fail=false;const a=app({fetcher:async url=>fail&&!url.endsWith('/options')?{ok:false,json:async()=>({success:false,error:'Unavailable'})}:null});
 await settle();await a.run();a.select('Cough','Caliban');assert.equal(a.els['sarima-mae'].textContent,'—');
 fail=true;await a.run();assert.equal(a.els['sarima-main-estimate'].textContent==='Unavailable',false);
 assert.equal(a.els['forecast-months'].hidden,true);assert.match(a.els['predictive-insight-text'].textContent,/unavailable/i);
});


test('BHW renders the shared chart and summary with ten diseases and a locked barangay',async()=>{
 const barangay='Blumentritt';
 const requests=[];
 const a=app({role:'bhw',fetcher:async url=>{
  const u=new URL(url);requests.push(u);
  if(u.pathname==='/api/bhw/operational-predictions/status')return {ok:true,json:async()=>({success:true,data:{publication:null}})};
  assert.match(u.pathname,/^\/api\/bhw\/sarima-demo(?:\/options)?$/);
  const data=u.pathname.endsWith('/options')?{barangay,diseases:service.options().diseases}:service.forecast({barangay,disease:u.searchParams.get('disease')});
  return {ok:true,json:async()=>({success:true,data})};
 }});
 await settle();
 assert.equal(a.els['predictive-disease-select'].children.length,10);
 assert.equal(a.els['predictive-brgy-select'].children.length,1);
 assert.equal(a.els['predictive-brgy-select'].value,barangay);
 assert.equal(a.els['predictive-brgy-select'].disabled,true);
 a.select('URTI','Salvacion');await a.run();
 assert.deepEqual([...requests.at(-1).searchParams], [['disease','URTI']]);
 assert.equal(a.els['sarima-summary-scope'].textContent,'URTI · Blumentritt');
 assert.equal(a.els['sarima-method'].textContent,'SARIMA');
 assert(allNodes(a.els['sarima-chart']).some(n=>n.attributes['data-series']==='forecast'));
 assert.match(a.els['sarima-score-count'].textContent,/past predictions/);
});
