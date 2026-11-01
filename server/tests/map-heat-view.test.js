const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../../assets/js/shared/map-heat-view.js'),'utf8');
function setup(){
 const nodes=[];
 const node=()=>{const n={children:[],attrs:{},hidden:false,events:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},addEventListener(k,v){this.events[k]=v;},remove(){}};nodes.push(n);return n;};
 const layers=new Set(),map={hasLayer:l=>layers.has(l),removeLayer:l=>layers.delete(l)};
 const L={DomEvent:{disableClickPropagation(){},disableScrollPropagation(){}},heatLayer(points){return {points,setLatLngs(p){assert.ok(layers.has(this),'Leaflet.heat must be on the map before updating');this.points=p;},addTo(){layers.add(this);},redraw(){}};}};
 const ctx={window:{L},L,document:{createElement:node,head:node()}};
 vm.runInNewContext(code,ctx);return {api:ctx.window.HealthIntelHeatView,node,map,layers,ctx};
}
test('heat preparation uses only supplied centers and case weights, with no fabricated points',()=>{
 const {api}=setup();const r=api.prepare([{lat:10,lng:123,cases:10},{lat:11,lng:124,cases:5},{lat:12,lng:125,cases:0}]);
 assert.equal(r.max,10);assert.equal(r.total,15);assert.equal(r.omitted,0);assert.equal(JSON.stringify(r.points),'[[10,123,1],[11,124,0.5]]');
});
test('failed optional heat library leaves summary working and can be retried',async()=>{
 const f=setup(),native=f.ctx.L.heatLayer;delete f.ctx.L.heatLayer;
 f.ctx.document.head.append=script=>queueMicrotask(()=>script.onerror());
 const container=f.node();container.parentElement={querySelector:()=>null};
 const view=f.api.bind(f.map,container);view.update([{lat:10,lng:123,cases:8}]);
 const [controls,legend]=container.children,[summary,heat]=controls.children;
 await heat.events.click();assert.equal(summary.attrs['aria-pressed'],'true');assert.equal(f.layers.size,0);assert.match(legend.textContent,/could not load/);assert.equal(heat.disabled,false);
 f.ctx.L.heatLayer=native;await heat.events.click();assert.equal(heat.attrs['aria-pressed'],'true');assert.equal(f.layers.size,1);
});
test('zero counts give no heat and unavailable/invalid values are omitted explicitly',()=>{
 const {api}=setup();const zero=api.prepare([{lat:10,lng:123,cases:0}]);assert.equal(zero.points.length,0);assert.equal(zero.max,0);
 const r=api.prepare([{lat:10,lng:123,cases:null},{lat:null,lng:123,cases:3},{lat:91,lng:123,cases:3},{lat:10,lng:123,cases:-1},{lat:10,lng:123,cases:1.5}]);
 assert.equal(r.omitted,5);assert.equal(r.points.length,0);
});
test('summary is default, switching retains totals, refresh replaces heat points, and returning removes heat',async()=>{
 const f=setup(),container=f.node();container.parentElement={querySelector:()=>null};
 const changes=[];const view=f.api.bind(f.map,container,{onChange:mode=>changes.push(mode)});const [controls,legend]=container.children;const [summary,heat]=controls.children;
 assert.equal(summary.attrs['aria-pressed'],'true');assert.equal(legend.hidden,true);
 view.update([{lat:10,lng:123,cases:8}]);await heat.events.click();assert.equal(heat.attrs['aria-pressed'],'true');assert.equal(f.layers.size,1);
 const layer=[...f.layers][0];assert.equal(layer.points.length,1);view.update([{lat:10,lng:123,cases:0}]);assert.equal(layer.points.length,0);
 summary.events.click();assert.equal(f.layers.size,0);assert.equal(summary.attrs['aria-pressed'],'true');
 assert.deepEqual(changes,['heat','summary']);
 view.update([{lat:10,lng:123,cases:7}]);await heat.events.click();assert.equal(f.layers.size,1);assert.equal(layer.points[0][2],1);
});
