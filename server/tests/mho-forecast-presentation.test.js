const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const P=require('../../assets/js/mho/sarima-presentation');
const {createBalancedSarimaDemo}=require('../services/balanced-sarima-demo');
const root=path.resolve(__dirname,'../..'),service=createBalancedSarimaDemo();
const snapshotPath=path.join(__dirname,'../data/balanced-sarima-demo/snapshot.json');
const snapshot=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
const response=v=>service.forecast({disease:v.disease,barangay:v.barangay,protocol:'80_20',horizon:'1'});
const clone=value=>JSON.parse(JSON.stringify(value));
test('all 70 pairs and 18 aggregates display the actual October h1 result and scope-specific primary score',()=>{
 const digest=crypto.createHash('sha256').update(fs.readFileSync(snapshotPath)).digest('hex');
 let pairs=0,aggregates=0;
 for(const v of Object.values(snapshot.views)){
  const r=response(v),d=P.derive(r),m=v.protocols['80_20']['1'].metrics;
  assert.equal(d.target,'2026-10');assert.equal(d.cutoff,'2026-09');assert.equal(d.prediction,v.production['1'].prediction);
  assert.equal(d.score,m.within_tolerance_pct);assert.equal(d.previous,v.history.at(-1));assert.equal(d.metrics.MAE,m.MAE);
  assert.equal(d.metrics.RMSE,m.RMSE);assert.equal(d.metrics.MAPE_positive_pct,m.MAPE_positive_pct);
  assert(!d.explanation.includes('November'));assert.equal(d.available,v.production['1'].prediction!==null);
  const rows=v.protocols['80_20']['1'].rows,produced=rows.filter(x=>x.prediction!==null);
  const hits=produced.filter(x=>Math.abs(x.prediction-x.actual)<=Math.max(1,.2*x.actual)+1e-12).length;
  assert.equal(d.score,produced.length?100*hits/produced.length:null);
  if(v.disease==='ALL'||v.barangay==='ALL'){aggregates++;assert.equal(d.rangeAvailable,false);}else pairs++;
 }
 assert.equal(pairs,70);assert.equal(aggregates,18);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(snapshotPath)).digest('hex'),digest);
});
test('Cough Salvacion uses 6/9 and October ~70, never pooled 86.17% or November ~65',()=>{
 const d=P.derive(service.forecast({disease:'Cough',barangay:'Salvacion'}));
 assert.equal(d.score,100*6/9);assert.equal(P.format(d.prediction,0),'70');assert.equal(d.forecast.horizon,1);
 assert.equal(P.format(d.forecast.lower,0),'47');assert.equal(P.format(d.forecast.upper,0),'93');
 assert.equal(d.metrics.within_tolerance_hits,6);assert.equal(d.metrics.available,9);
 assert(!d.explanation.includes('65 cases'));assert.notEqual(d.score,100*517/600);
});
test('all 18 aggregate backtests use complete component sums, never averaged scores or partial predictions',()=>{
 const views=Object.values(snapshot.views),near=(a,b)=>assert(Math.abs(a-b)<1e-7);
 for(const v of views.filter(v=>v.disease==='ALL'||v.barangay==='ALL')){
  const components=v.components.map(c=>views.find(x=>x.disease===c.disease&&x.barangay===c.barangay));assert(components.every(Boolean));
  for(const row of v.protocols['80_20']['1'].rows){
   const rr=components.map(c=>c.protocols['80_20']['1'].rows.find(x=>x.target===row.target));assert(rr.every(Boolean));
   near(row.actual,rr.reduce((sum,r)=>sum+r.actual,0));
   if(rr.every(r=>r.prediction!==null))near(row.prediction,rr.reduce((sum,r)=>sum+r.prediction,0));else assert.equal(row.prediction,null);
  }
 }
});
test('recommendations follow October even when frozen November points in the opposite direction',()=>{
 const r=service.forecast({disease:'Cough',barangay:'Salvacion'}),x=clone(r);
 x.view.production['1'].prediction=x.view.history.at(-1)+10;x.view.production['2'].prediction=0;
 x.view.narrative.recommendations=[{id:'R4',title:'November-only decrease',action:'must not leak into October'}];
 const d=P.derive(x);assert(d.recommendations.some(r=>r.id==='R3'));assert(!d.recommendations.some(r=>r.id==='R4'||r.id==='R8'));
 assert(d.change>0);assert.equal(d.target,'2026-10');
});
test('zero forecasts are available counts; percentage change from a zero observation is undefined',()=>{
 const x=clone(service.forecast({disease:'Cough',barangay:'Salvacion'}));x.view.history[x.view.history.length-1]=0;
 Object.assign(x.view.production['1'],{prediction:0,lower:0,upper:3});let d=P.derive(x);
 assert.equal(d.available,true);assert.equal(d.prediction,0);assert.equal(d.changePct,null);assert.equal(d.trend,'Approximately stable');
 assert(!d.changeText.includes('NaN')&&!d.changeText.includes('Infinity'));
 x.view.production['1'].prediction=2;d=P.derive(x);assert.equal(d.changePct,null);assert(d.recommendations.some(r=>r.id==='R5'));
});
test('unavailable totals stay unavailable and receive no forecast-dependent advice',()=>{
 const d=P.derive(service.forecast({disease:'ALL',barangay:'ALL'}));assert.equal(d.prediction,null);assert.equal(d.score,null);
 assert.equal(d.available,false);assert.deepEqual(d.recommendations.map(r=>r.id),['R7']);assert.equal(d.changePct,null);
 assert(d.explanation.includes('unavailable'));assert(!d.explanation.includes('0 cases'));
});
test('wrong forecast horizon, cutoff or incomplete history fails rather than relabeling a result',()=>{
 const r=service.forecast({disease:'Cough',barangay:'Salvacion'});
 for(const mutate of [x=>x.view.production['1'].target='2026-11',x=>x.view.production['1'].horizon=2,x=>x.view.production['1'].cutoff='2026-10',x=>x.view.history=[],x=>x.context.cutoff='bad']){const x=clone(r);mutate(x);assert.throws(()=>P.derive(x));}
 assert.equal(P.followingMonth('2026-12'),'2027-01');
});

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
test('real frontend renders all 70 individual choices with one October target, unchanged metrics and correct missing states',async()=>{
 const a=app();await settle();let count=0;
 for(const v of Object.values(snapshot.views).filter(v=>v.required_components===1)){
  a.select(v.disease,v.barangay);await a.run();const d=P.derive(response(v));
  assert.equal(a.els['sarima-main-estimate'].textContent,d.available?P.format(d.prediction,0):'Unavailable');
  assert.equal(a.els['sarima-score'].textContent,d.score===null?'Unavailable':P.format(d.score)+'%');
  assert.equal(a.els['sarima-mae'].textContent,P.format(d.metrics.MAE));assert.equal(a.els['sarima-main-month'].textContent,'October 2026 estimate');
  assert.equal(a.els['sarima-rmse'].textContent,P.format(d.metrics.RMSE));
  assert.equal(a.els['sarima-mape'].textContent,d.metrics.MAPE_positive_pct===null?'Unavailable':P.format(d.metrics.MAPE_positive_pct)+'%');
  assert.equal(a.els['predictive-insight-text'].textContent,d.explanation);
  assert.deepEqual(a.els['forecast-recommendations'].children.map(x=>x.dataset.rule),d.recommendations.map(x=>x.id));
  assert.equal(a.els['sarima-missing'].hidden,d.available);assert.equal(a.els['forecast-months'].hidden,false);
  const svg=a.els['sarima-chart'].children[0],nodes=allNodes(svg);assert.equal(svg.tagName,'svg');
  assert(!svg.textContent.includes('November 2026'));assert(!svg.textContent.includes('NaN'));assert(!svg.textContent.includes('Infinity'));
  const future=nodes.filter(n=>n.attributes['data-series']==='forecast');assert.equal(future.length,d.available?1:0);
  assert.equal(nodes.filter(n=>n.attributes['data-forecast-interval']).length,d.rangeAvailable?1:0);
  assert(nodes.some(n=>n.attributes['data-forecast-label']==='2026-10'));count++;
 }
 assert.equal(count,70);
});
test('chart sizing, keyboard/arrow inspection and native tooltip use the actual saved October values',async()=>{
 for(const width of [280,320,390,700,1000]){
  const a=app({width});await settle();a.select('Cough','Salvacion');await a.run();
  const svg=a.els['sarima-chart'].children[0],point=allNodes(svg).find(e=>e.attributes['data-month']==='2026-10');point.focus();
  assert(a.els['sarima-chart-readout'].textContent.includes('69.69 estimated cases'));assert(a.els['sarima-chart-readout'].textContent.includes('46.81–92.57'));
  a.els['sarima-previous-point'].dispatch('click');assert(a.els['sarima-chart-readout'].textContent.includes('September 2026'));
  a.els['sarima-next-point'].dispatch('click');assert(a.els['sarima-chart-readout'].textContent.includes('October 2026'));
  assert.equal(a.els['sarima-next-point'].disabled,true);assert.equal(a.els['run-forecast-button'].disabled,false);
 }
});
test('selection changes and failed requests clear stale predictions and leave retry available',async()=>{
 let fail=false;const a=app({fetcher:async url=>{if(fail&&!url.endsWith('/options'))throw Error('offline');}});await settle();a.select('Cough','Salvacion');await a.run();
 a.select('URTI','Salvacion');assert.equal(a.els['forecast-months'].hidden,true);assert.equal(a.els['forecast-recommendations'].hidden,true);
 fail=true;await a.run();assert.equal(a.els['forecast-months'].hidden,true);assert.equal(a.els['sarima-score'].textContent,'Unavailable');assert.equal(a.els['run-forecast-button'].disabled,false);
 assert(a.els['forecast-recommendation-status'].textContent.includes('unavailable'));
});
test('empty initial state and options failure do not fabricate a forecast',async()=>{
 const a=app({fetcher:async()=>{throw Error('offline');}});await settle();assert.equal(a.els['run-forecast-button'].textContent,'Retry loading');
 assert(a.els['sarima-state'].textContent.includes('Could not load'));assert(!a.els['sarima-chart'].children.some(n=>n.tagName==='svg'));
});
test('a delayed old response cannot replace a newer selected scope',async()=>{
 let release,hold=false;const a=app({fetcher:async url=>{if(hold&&url.includes('disease=Cough'))return new Promise(resolve=>{release=resolve;});}});await settle();
 a.select('Cough','Salvacion');hold=true;const first=a.run();await settle();a.select('URTI','Salvacion');await a.run();
 const expected=a.els['sarima-main-estimate'].textContent;release({ok:true,json:async()=>({success:true,data:service.forecast({disease:'Cough',barangay:'Salvacion'})})});await first;
 assert.equal(a.els['sarima-main-estimate'].textContent,expected);assert(a.els['sarima-scope'].textContent.includes('URTI'));
});


test('Predictions offers exactly ten diseases and seven barangays without aggregate choices',async()=>{
 const a=app();await settle();const options=service.options();
 for(const [id,expected]of [['predictive-disease-select',options.diseases],['predictive-brgy-select',options.barangays]]){
  assert.deepEqual(a.els[id].children.map(o=>o.value),expected);
  assert(!a.els[id].children.some(o=>o.value==='ALL'||/^All (Diseases|Barangays)$/.test(o.textContent)));
  assert.equal(a.els[id].value,expected[0]);assert.equal(a.els[id].disabled,false);
 }
 assert.equal(options.diseases.length,10);assert.equal(options.barangays.length,7);
 assert.equal(a.els['run-forecast-button'].disabled,false);
});

test('all four unavailable individuals explain failed checks, keep historical scores and never invent a future point',async()=>{
 const a=app();await settle();let missing=0;
 for(const v of Object.values(snapshot.views).filter(v=>v.required_components===1&&v.production['1'].prediction===null)){
  a.select(v.disease,v.barangay);await a.run();missing++;
  assert.equal(a.els['sarima-main-estimate'].textContent,'Unavailable');
  assert(a.els['sarima-missing-note'].textContent.includes('No SARIMA model passed all required checks'));
  assert(a.els['predictive-insight-text'].textContent.includes(v.disease));
  assert(a.els['predictive-insight-text'].textContent.includes(v.barangay));
  assert(a.els['sarima-chart-note'].textContent.includes('No accepted next-month'));
  assert(a.els['forecast-recommendations'].textContent.includes('no next-month estimate'));
  assert(!a.els['forecast-recommendations'].textContent.includes('combined estimate'));
  assert(!allNodes(a.els['sarima-chart']).some(n=>n.attributes['data-series']==='forecast'));
  const score=v.protocols['80_20']['1'].metrics.within_tolerance_pct; assert.equal(a.els['sarima-score'].textContent,score===null?'Unavailable':P.format(score)+'%');
 }
 assert.equal(missing,4);
});
