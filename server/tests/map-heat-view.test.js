const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../../assets/js/shared/map-heat-view.js'),'utf8');
function setup(){
 const node=()=>({children:[],attrs:{},hidden:false,events:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},addEventListener(k,v){this.events[k]=v;}});
 const layers=new Set(),map={hasLayer:l=>layers.has(l),removeLayer:l=>layers.delete(l)};
 const L={DomEvent:{disableClickPropagation(){},disableScrollPropagation(){}},circleMarker(point,options){return {point,options};},layerGroup(points){return {points,addTo(){layers.add(this);return this;}};}};
 const ctx={window:{L},L,document:{createElement:node}};vm.runInNewContext(code,ctx);return {api:ctx.window.HealthIntelHeatView,node,map,layers};
}
function row(cases,extra={}){return {lat:10,lng:123,cases:999,activity:{status:'assessed',method:'fixed-case-volume',observed_cases:cases,tone:cases===0?'none':cases<=10?'mild':cases<=20?'monitored':'high_risk'},...extra};}
test('monthly heat colors match exact boundaries and ignore active-case count or relative maximum',()=>{
 const {api}=setup();const r=api.prepare([1,10,11,20,21,1000].map(n=>row(n)));
 assert.equal(r.points.map(p=>p.color).join(','),'#16a34a,#16a34a,#d97706,#d97706,#dc2626,#dc2626');
 assert.equal(r.total,1063);assert.equal(r.omitted,0);assert.equal(api.prepare([row(1)]).points[0].color,'#16a34a');
});
test('zero and unavailable monthly assessments draw no positive halo; invalid coordinates are omitted',()=>{
 const {api}=setup();assert.equal(api.prepare([row(0)]).points.length,0);
 const bad=api.prepare([row(1,{activity:null}),row(1,{lat:null}),row(1,{lat:91}),row(1,{activity:{status:'unavailable'}}),row(1,{activity:{status:'assessed',method:'fixed-case-volume',observed_cases:-1}})]);
 assert.equal(bad.omitted,5);assert.equal(bad.points.length,0);
});
test('neighboring Mild barangays remain independent green halos with no additive weights',()=>{
 const f=setup(),container=f.node();container.parentElement={querySelector:()=>null};const view=f.api.bind(f.map,container);
 view.update([row(10),row(10,{lng:123.001})]);container.children[0].children[1].events.click();
 const group=[...f.layers][0];assert.equal(group.points.length,2);
 for(const marker of group.points){assert.equal(marker.options.fillColor,'#16a34a');assert.equal(marker.options.interactive,false);assert.ok(!('weight' in marker.options));}
 const text=JSON.stringify(container.children[1]);assert.match(text,/Monthly case-volume bands/);assert.match(text,/11–20/);assert.doesNotMatch(text,/Fewer|highest barangay|active cases/);
});
test('summary is default, refresh replaces halos, resize retains one layer and summary removes it',()=>{
 const f=setup(),container=f.node();const pageLegend={hidden:false};container.parentElement={querySelector:()=>pageLegend};
 const changes=[],view=f.api.bind(f.map,container,{onChange:mode=>changes.push(mode)});const [controls,legend]=container.children,[summary,heat]=controls.children;
 assert.equal(summary.attrs['aria-pressed'],'true');assert.equal(heat.disabled,true);assert.equal(legend.hidden,true);
 view.update([row(1)]);heat.events.click();assert.equal(f.layers.size,1);assert.equal(pageLegend.hidden,true);
 view.update([row(21)]);assert.equal(f.layers.size,1);assert.equal([...f.layers][0].points[0].options.fillColor,'#dc2626');
 view.resize();assert.equal(f.layers.size,1);summary.events.click();assert.equal(f.layers.size,0);assert.equal(pageLegend.hidden,false);assert.deepEqual(changes,['heat','summary']);
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
