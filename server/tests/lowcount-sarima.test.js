const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
const P=require('../../assets/js/mho/sarima-presentation');
const {createLowCountSarimaDemo,resolveSavedForecast,metrics}=require('../services/lowcount-sarima-demo');
const root=path.resolve(__dirname,'../..'),service=createLowCountSarimaDemo({environment:'test'});
const directory=path.join(__dirname,'../data/lowcount-sarima-5500');
const snapshot=JSON.parse(fs.readFileSync(path.join(directory,'snapshot.json'),'utf8'));
const clone=x=>structuredClone(x);
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
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
function app({width=700,fetcher}={}){
 const html=fs.readFileSync(path.join(root,'mho.html'),'utf8'),els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 els['sarima-window'].value='24';els['sarima-chart'].clientWidth=width;
 els['sarima-score-info'].append(new Element('summary'));
 const docRoot=new Element('html'),document={readyState:'complete',documentElement:docRoot,getElementById:id=>els[id]||null,createElement:tag=>new Element(tag),createElementNS:(_ns,tag)=>new Element(tag),addEventListener(){},querySelector:()=>new Element('button')};
 let requestCount=0;
 const fetch=async url=>{
  requestCount++;if(fetcher){const handled=await fetcher(url,requestCount);if(handled)return handled;}
  const u=new URL(url),data=u.pathname.endsWith('/options')?service.options():service.forecast(Object.fromEntries(u.searchParams));
  return {ok:true,json:async()=>({success:true,data})};
 };
 const context={window:{HealthIntelSarimaPresentation:P,HealthIntel:{apiOrigin:'http://localhost:3000'}},document,fetch,URLSearchParams,AbortController,setTimeout,clearTimeout,requestAnimationFrame:f=>f(),console};
 vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/mho/mho-forecast.js'),'utf8'),context);
 return {els,context,docRoot,run:()=>context.window.runPredictiveModel(),select:(d,b)=>{els['predictive-disease-select'].value=d;els['predictive-brgy-select'].value=b;els['predictive-disease-select'].dispatch('change');}};
}
const allNodes=root=>[root,...root.children.flatMap(allNodes)];

test('new frozen data: 70 histories, 3150 counts, 5500 cases, 70 accepted current SARIMA fits',()=>{
 assert.equal(snapshot.scopes.length,70);assert.equal(snapshot.scopes.flatMap(s=>s.history).length,3150);
 assert.equal(snapshot.scopes.flatMap(s=>s.history).reduce((a,b)=>a+b,0),5500);
 let seasonal=0;
 for(const s of snapshot.scopes){
  const r=service.forecast(safeQuery(s)),native=s.outputs.at(-1).sarima,d=P.derive(r);
  assert.equal(d.method,'SARIMA');near(d.prediction,native.prediction);near(d.forecast.lower,native.lower);near(d.forecast.upper,native.upper);
  assert.equal(d.target,'2026-10');assert.equal(d.forecast.training_months,45);assert(native.converged);assert(native.covariance_condition<=1e12);
  assert.equal(native.seasonal_order[3],12);assert(Object.keys(native.estimated_seasonal_parameters).length>0);
  assert.equal(r.view.weak_components,native.annual.supported?0:1);if(native.annual.supported)seasonal++;
 }
 assert.equal(seasonal,6);
});
function safeQuery(s){return {disease:s.disease,barangay:s.barangay};}
test('all 70 selected primary/secondary metrics are recomputed from actual saved targets, including the single historical fallback',()=>{
 let fallbacks=0;const all=[];
 for(const s of snapshot.scopes){
  const r=service.forecast(safeQuery(s));
  for(const [protocol,start]of [['80_20',36],['70_30',31]]){
   const expected=s.outputs.filter(o=>o.n>=start&&o.n<45).map(o=>({actual:s.history[o.n],prediction:o.sarima.usable?o.sarima.prediction:s.history[o.n-12]}));
   const e=r.view.protocols[protocol]['1'],n=expected.length;
   expected.forEach((x,i)=>{near(e.rows[i].prediction,x.prediction);assert.equal(e.rows[i].actual,x.actual);});
   const errors=expected.map(x=>Math.abs(x.prediction-x.actual)),positive=expected.filter(x=>x.actual>0);
   near(e.metrics.MAE,errors.reduce((a,b)=>a+b,0)/n);near(e.metrics.RMSE,Math.sqrt(errors.reduce((a,b)=>a+b*b,0)/n));
   near(e.metrics.MAPE_positive_pct,positive.reduce((a,x)=>a+Math.abs(x.prediction-x.actual)/x.actual,0)/positive.length*100);
   near(e.metrics.within_tolerance_pct,100*expected.filter((x,i)=>errors[i]<=Math.max(1,.2*x.actual)).length/n);
   assert.equal(e.metrics.available,n);assert.equal(e.metrics.MAPE_zero_actual_excluded,n-positive.length);
   if(protocol==='80_20')all.push(...e.rows);else fallbacks+=e.metrics.fallback_count;
  }
 }
 assert.equal(fallbacks,1);const m=metrics(all);assert.equal(m.available,630);assert.equal(m.within_tolerance_hits,350);assert.equal(m.fallback_count,0);
 assert.equal(m.MAPE_positive_n,510);assert.equal(m.MAPE_zero_actual_excluded,120);
 near(m.MAE,1.1421240356055855);near(m.RMSE,1.500087071739884);near(m.MAPE_positive_pct,52.28983843332548);
});
test('fallback uses lag12 only on unavailable fits, keeps zero, and never invents intervals',()=>{
 const y=Array.from({length:24},(_,i)=>i),f=resolveSavedForecast({usable:false,reason:'rejected'},y);
 assert.equal(f.actual_model,'Seasonal Naive');assert.equal(f.prediction,12);assert.equal(f.lower,null);assert.equal(f.upper,null);
 assert.equal(resolveSavedForecast({usable:false},Array(12).fill(0)).prediction,0);
 assert.equal(resolveSavedForecast({usable:false},[1,0]).prediction,null);
 const native=clone(snapshot.scopes[0].outputs.at(-1).sarima);native.converged=false;
 assert.throws(()=>resolveSavedForecast(native,y),/failed validation/);
});
test('zero MAPE targets excluded, zero forecasts available, and tolerance uses unrounded errors',()=>{
 const m=metrics([{actual:0,prediction:0},{actual:0,prediction:1.0001},{actual:5,prediction:6},{actual:5,prediction:null}]);
 assert.equal(m.available,3);assert.equal(m.within_tolerance_hits,2);assert.equal(m.MAPE_positive_n,1);assert.equal(m.MAPE_zero_actual_excluded,2);near(m.MAPE_positive_pct,20);
});
test('wrong scopes, horizons and production activation rejected; corrupt evidence fails closed',()=>{
 for(const q of [{disease:'ALL',barangay:'ALL'},{disease:'Cough',barangay:'Salvacion',horizon:'2'},{disease:['Cough'],barangay:'Salvacion'}])assert.throws(()=>service.forecast(q),e=>e.status===400);
 assert.throws(()=>createLowCountSarimaDemo({environment:'production'}).options(),e=>e.status===404);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'lowcount-integrity-'));
 try{for(const f of ['manifest.json','snapshot.json','SYNTHETIC_monthly.csv'])fs.copyFileSync(path.join(directory,f),path.join(tmp,f));fs.appendFileSync(path.join(tmp,'snapshot.json'),' ');assert.throws(()=>createLowCountSarimaDemo({directory:tmp}).options(),e=>e.status===503);}
 finally{fs.rmSync(tmp,{recursive:true,force:true});}
 const r=service.forecast(safeQuery(snapshot.scopes[0]));r.view.history[0]=999999;assert.notEqual(service.forecast(safeQuery(snapshot.scopes[0])).view.history[0],999999);
});
test('all 70 real frontend selections: estimate, own score/errors, method, warning, graph, summary and recommendation rules',async()=>{
 for(const width of [320,1000]){
  const a=app({width});await settle();assert.equal(a.els['predictive-disease-select'].children.length,10);assert.equal(a.els['predictive-brgy-select'].children.length,7);
  for(const s of snapshot.scopes){
   a.select(s.disease,s.barangay);await a.run();const d=P.derive(service.forecast(safeQuery(s)));
   assert.equal(a.els['sarima-method'].textContent,'SARIMA');assert.equal(a.els['sarima-main-estimate'].textContent,P.format(d.prediction,0));
   assert.equal(a.els['sarima-score'].textContent,P.format(d.score)+'%');assert.equal(a.els['sarima-mae'].textContent,P.format(d.metrics.MAE));assert.equal(a.els['sarima-rmse'].textContent,P.format(d.metrics.RMSE));assert.equal(a.els['sarima-mape'].textContent,P.format(d.metrics.MAPE_positive_pct)+'%');
   assert.equal(a.els['sarima-seasonality-note'].hidden,!d.view.weak_components);assert.equal(a.els['predictive-insight-text'].textContent,d.explanation);
   assert.deepEqual(a.els['forecast-recommendations'].children.map(x=>x.dataset.rule),d.recommendations.map(x=>x.id));
   const nodes=allNodes(a.els['sarima-chart']);assert.equal(nodes.filter(n=>n.attributes['data-series']==='forecast').length,1);
   assert.equal(nodes.filter(n=>n.attributes['data-forecast-interval']).length,1);assert(!a.els['sarima-chart'].textContent.includes('NaN'));
   nodes.find(n=>n.attributes['data-month']==='2026-10').focus();assert(a.els['sarima-chart-readout'].textContent.includes(P.format(d.prediction)+' estimated cases'));
  }
 }
});
test('fallback UI fixture states actual method and no calibrated interval; unavailable fixture keeps honest state',async()=>{
 const response=service.forecast(safeQuery(snapshot.scopes[0]));Object.assign(response.view.production['1'],resolveSavedForecast({usable:false,reason:'test rejection'},response.view.history));
 response.view.weak_components=0;const a=app({fetcher:async url=>url.endsWith('/options')?null:{ok:true,json:async()=>({success:true,data:response})}});await settle();a.select('Cough','Salvacion');await a.run();
 assert.equal(a.els['sarima-method'].textContent,'Seasonal Naive');assert(a.els['predictive-insight-text'].textContent.includes('Seasonal Naive'));assert(a.els['sarima-chart-note'].textContent.includes('no calibrated prediction interval'));
 assert(!allNodes(a.els['sarima-chart']).some(n=>n.attributes['data-forecast-interval']));
 Object.assign(response.view.production['1'],{prediction:null,lower:null,upper:null,actual_model:'Unavailable'});await a.run();
 assert.equal(a.els['sarima-main-estimate'].textContent,'Unavailable');assert(!allNodes(a.els['sarima-chart']).some(n=>n.attributes['data-series']==='forecast'));
});
test('route default uses new data and denies non-MHO access without any database queries',()=>{
 const routes={};require('../routes/balanced-sarima-routes').registerBalancedSarimaRoutes({get:(p,h)=>routes[p]=h});
 for(const role of [null,'bhw','admin','superadmin','mho']){
  let body,status=200;const res={set(){return this;},status(x){status=x;return this;},json(x){body=x;return this;}};
  routes['/api/mho/sarima-demo/options']({user:role?{role}:null},res);
  if(role==='mho'){assert.equal(status,200);assert.equal(body.data.context.cases,5592);}else assert.equal(status,403);
 }
});
