const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../../assets/js/shared/map-heat-view.js'),'utf8');
function setup(){
 const node=()=>({children:[],attrs:{},hidden:false,events:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},addEventListener(k,v){this.events[k]=v;}});
 const layers=new Set(),map={hasLayer:l=>layers.has(l),removeLayer:l=>layers.delete(l)};
 const L={DomEvent:{disableClickPropagation(){},disableScrollPropagation(){}},circleMarker(point,options){return {point,options};},layerGroup(points){return {points,addTo(){layers.add(this);return this;}};}};
 const ctx={window:{L},L,document:{createElement:node}};vm.runInNewContext(code,ctx);return {api:ctx.window.HealthIntelHeatView,node,map,layers};
}
function row(cases,extra={}){return {lat:10,lng:123,cases:999,activity:{status:'assessed',method:'fixed-case-volume',observed_cases:cases,tone:cases===0?'none':cases<=10?'mild':cases<=20?'monitored':'high_risk'},...extra};}
test('halo sizes follow monthly counts with one color and ignore recorded severity', () => {
 const {api}=setup();
 const points=api.prepare([row(1),row(10),row(21),row(0),row(1000,{lat:null}),row(3,{activity:null}),
  row(999,{activity:null,cases:18,historical:{period:'April 2024'}})]);
 assert.deepEqual(Array.from(points,p=>p.cases),[1,10,21,18]);
 assert.ok(points[0].radius<points[1].radius && points[1].radius<points[3].radius && points[3].radius<points[2].radius);
});
test('heat halos remain separate, update on refresh and use a count-only legend', () => {
 const f=setup(),container=f.node();container.parentElement={querySelector:()=>null};
 const view=f.api.bind(f.map,container);
 const [controls,legend]=container.children,[summary,heat]=controls.children;
 assert.equal(summary.attrs['aria-pressed'],'true');
 assert.equal(heat.disabled,true);
 view.update([row(10),row(10,{lng:123.001})]);
 heat.events.click();
 const group=[...f.layers][0];
 assert.equal(group.points.length,2);
 for(const marker of group.points){
  assert.equal(marker.options.fillColor,'#2dd4bf');
  assert.equal(marker.options.interactive,false);
  assert.ok(!('weight' in marker.options));
 }
 const text=JSON.stringify(legend);
 assert.match(text,/Cases this month/);
 assert.doesNotMatch(text,/Mild|Monitored|High Risk/);
 view.update([row(21)]);
 assert.equal(f.layers.size,1);
 assert.ok([...f.layers][0].points[0].options.radius>group.points[0].options.radius);
 view.resize();
 assert.equal(f.layers.size,1);
 summary.events.click();
 assert.equal(f.layers.size,0);
 assert.equal(legend.hidden,true);
});

test('historical map filters by CSV coverage and reconciles every barangay with the monthly report',async()=>{
 const {reportData}=require('../services/historical-reports');
 const bytes=fs.readFileSync(path.join(__dirname,'../../datasets/combined_historical_cases.csv'));
 const elements=Object.fromEntries(['source','year','month'].map(name=>[name,{
  value:name==='source'?'live':'',disabled:false,options:[],events:{},
  replaceChildren(...options){this.options=options;},
  addEventListener(event,handler){this.events[event]=handler;}
 }]));
 const requests=[];
 const ctx={window:{},Intl,AbortSignal,URLSearchParams,Option:function(label,value){this.label=label;this.value=value;},
  HealthIntel:{apiOrigin:'http://localhost:3000'},
  document:{getElementById:id=>elements[id.replace('mho-map-','')]},
  fetch:async url=>{
   requests.push(url);
   const query=Object.fromEntries(new URL(url).searchParams);
   return {ok:true,json:async()=>({success:true,...reportData(bytes,query)})};
  }};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/js/mho/mho-map-history.js'),'utf8'),ctx);
 const changes=[];
 const history=ctx.window.HealthIntelMapHistory.bind(()=>changes.push(history.selection()));
 assert.equal(history.selection(),'live');
 elements.source.value='historical';elements.source.events.change();
 assert.equal(history.selection(),'historical');
 const latest=await history.read(history.selection());
 assert.equal(latest.period,'2026-09');assert.equal(latest.total,149);
 assert.deepEqual(Array.from(elements.month.options,o=>o.value),['01','02','03','04','05','06','07','08','09']);
 elements.year.value='2024';elements.year.events.change();
 elements.month.value='04';elements.month.events.change();
 const april=await history.read(history.selection());
 assert.equal(april.total,139);assert.equal(april.rows.length,7);
 assert.equal(april.rows.find(r=>r.name==='Salvacion').cases,18);
 assert.ok(april.rows.every(r=>r.historical.diseases.length===10 && r.severity_counts===undefined));
 assert.match(requests.at(-1),/year=2024&month=04$/);
 elements.source.value='live';elements.source.events.change();
 assert.equal(elements.month.disabled,true);
 elements.source.value='historical';elements.source.events.change();
 assert.equal(history.selection(),'2024-04');
 assert.deepEqual(changes,['historical','2024-09','2024-04','live','2024-04']);
});

test('BHW Map view lazily loads summary dependencies without a heat option',async()=>{
 const scripts=[];
 const section={classList:{contains:()=>false},querySelector:()=>({})};
 const status={textContent:''};
 const ctx={window:{L:{}},MutationObserver:class{observe(){}},
  document:{getElementById:id=>id==='view-heatmap'?section:status,
   createElement:()=>({remove(){}}),head:{append(script){scripts.push(script.src);queueMicrotask(()=>script.onload());}}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/js/shared/lazy-heatmap.js'),'utf8'),ctx);
 await new Promise(resolve=>setImmediate(resolve));
 assert(scripts.some(src=>src.includes('health-map.js')));
 assert(!scripts.some(src=>src.includes('map-heat-view.js')));
 assert(!scripts.some(src=>src.includes('map-case-breakdown.js')));
 const html=fs.readFileSync(path.join(__dirname,'../../bhw.html'),'utf8');
 assert.match(html,/data-map-mode="summary"/);
 assert.match(html,/>Map view<\/span>/);
});
