const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/js/shared/map-case-breakdown.js'),'utf8'),context);
const {prepare,render}=context.window.HealthIntelMapBreakdown;
const row=(cases,mild=[],extra={})=>({cases,severity_counts:{mild:cases},diseases_by_severity:{mild},...extra});
test('same disease across severities and barangays combines once and shares reconcile to map totals',()=>{
 const d=prepare([row(10,[{disease:'Cough',cases:6}],{severity_counts:{mild:6,monitored:4},diseases_by_severity:{mild:[{disease:'Cough',cases:6}],monitored:[{disease:'Cough',cases:2},{disease:'ARI',cases:2}]}}),row(5,[{disease:'ARI',cases:5}])]);
 assert.equal(d.total,15);assert.equal(d.missing,0);assert.equal(d.barangays,2);
 assert.equal(d.items.find(x=>x.name==='Cough').cases,8);assert.equal(d.items.find(x=>x.name==='ARI').cases,7);
 assert.equal(d.items.reduce((s,x)=>s+x.percent,0),100);
 assert.deepEqual(JSON.parse(JSON.stringify(d.items.find(x=>x.name==='Cough').severities)),{mild:6,monitored:2,high_risk:0,unknown:0});
 assert.deepEqual(JSON.parse(JSON.stringify(d.severityTotals)),{mild:11,monitored:4,high_risk:0,unknown:0});
});
test('missing unknown severity disease detail stays in denominator and explicit unavailable category',()=>{
 const d=prepare([row(10,[{disease:'Cough',cases:6}],{severity_counts:{mild:6,unknown:4}})]);
 assert.equal(d.total,10);assert.equal(d.missing,4);assert.equal(d.items.find(x=>x.unavailable).percent,40);
 assert.equal(d.items.reduce((s,x)=>s+x.cases,0),d.total);
 assert.equal(d.items.find(x=>x.unavailable).severities.unknown,4);assert.equal(d.severityTotals.unknown,4);
});

test('mixed disease severities retain recorded values and render explicit per-disease labels',()=>{
 const d=prepare([{cases:14,severity_counts:{mild:8,monitored:3,high_risk:2,unknown:1},diseases_by_severity:{mild:[{disease:'Cough',cases:8}],monitored:[{disease:'Cough',cases:3}],high_risk:[{disease:'Cough',cases:2}]}}]);
 const cough=d.items.find(x=>x.name==='Cough');assert.equal(cough.cases,13);
 assert.deepEqual(JSON.parse(JSON.stringify(cough.severities)),{mild:8,monitored:3,high_risk:2,unknown:0});
 for(const key of ['mild','monitored','high_risk','unknown'])assert.equal(d.items.reduce((s,item)=>s+item.severities[key],0),d.severityTotals[key]);
 const html=render(d,'',false);assert.match(html,/Overall recorded severity/);assert.match(html,/Mild <b>8<\/b>/);assert.match(html,/Monitored <b>3<\/b>/);assert.match(html,/High Risk <b>2<\/b>/);assert.match(html,/Unknown <b>1<\/b>/);
});

test('missing disease details preserve known severity without assigning it to an invented disease',()=>{
 const d=prepare([{cases:7,severity_counts:{mild:2,monitored:3,high_risk:1,unknown:1},diseases_by_severity:{}}]);
 assert.equal(d.items.length,1);assert.equal(d.items[0].unavailable,true);
 assert.deepEqual(JSON.parse(JSON.stringify(d.items[0].severities)),{mild:2,monitored:3,high_risk:1,unknown:1});
 const inconsistent=prepare([{cases:3,severity_counts:{mild:5},diseases_by_severity:{mild:[{disease:'Cough',cases:5}]}}]);
 assert.equal(inconsistent.severityTotals.mild,0);assert.equal(inconsistent.severityTotals.unknown,3);
});
test('inconsistent or malformed disease detail cannot inflate totals or infer a disease',()=>{
 for(const bad of [row(3,[{disease:'Cough',cases:4}]),row(3,[{disease:'Cough',cases:-1}]),row(3,[],{diseases_by_severity:{mild:'broken'}}),row(3,[{disease:'Cough',cases:3}],{severity_counts:{mild:1}})]){
  const d=prepare([bad]);assert.equal(d.total,3);assert.equal(d.missing,3);assert.equal(d.items.length,1);assert.equal(d.items[0].unavailable,true);
 }
});
test('zero states and invalid totals are distinct; no fabricated zero or percentage',()=>{
 const z=prepare([row(0)]);assert.equal(z.total,0);assert.equal(z.items.length,0);assert.match(render(z,'',false),/No active cases recorded/);
 const d=prepare([row(null),row(''),row(' '),row(false),row(-1),row(1.2)]);assert.equal(d.omitted,6);assert.match(render(d,'',false),/No usable totals available/);assert.doesNotMatch(render(d,'',false),/NaN|Infinity/);
});
test('long distributions retain all categories, grouping only chart segments as Other',()=>{
 const entries=Array.from({length:10},(_,i)=>({disease:'Disease '+i,cases:i+1}));const d=prepare([row(55,entries)]);
 assert.equal(d.items.length,10);assert.equal(d.segments.length,7);assert.equal(d.segments.reduce((s,x)=>s+x.cases,0),55);assert.equal(d.segments.at(-1).cases,10);
 assert.equal((render(d,'',false).match(/scope="row"/g)||[]).length,11);
});
test('API names are escaped, stale state is explicit, and percentages describe recorded shares',()=>{
 const html=render(prepare([row(2,[{disease:'<img src=x onerror=alert(1)>',cases:2}])]),'<time>',true);
 assert.doesNotMatch(html,/<img|<time>/);assert.match(html,/&lt;img/);assert.match(html,/last successfully loaded totals/);assert.match(html,/not predictions/);assert.match(html,/100\.0%/);
});
