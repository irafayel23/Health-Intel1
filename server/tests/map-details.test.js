const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/js/shared/map-details.js'),'utf8'),context);
const render=(overrides={})=>context.window.HealthIntelMapDetails.render({name:'Blumentritt',cases:19,severity_counts:{mild:18,monitored:1,high_risk:0,unknown:0},diseases_by_severity:{mild:[{disease:'Dengue',cases:9},{disease:'Hypertension',cases:5},{disease:'Influenza',cases:4}],monitored:[{disease:'Hypertension',cases:1}],high_risk:[]},color_reason:'At least one active case is Monitored; none is recorded as High Risk.',...overrides},'10/17/2026, 11:18 AM','bhwMap-details-title');
function rows(html){return [...html.matchAll(/<tr(?: class="[^"]*")?><th scope="row">([^<]*)<\/th>((?:<td>.*?<\/td>)+)<\/tr>/g)].map(([,disease,cells])=>({disease,values:[...cells.matchAll(/<td>(?:<strong>)?(\d+)(?:<\/strong>)?<\/td>/g)].map(m=>Number(m[1]))}));}

test('disease rows retain individual severity while the barangay assessment remains unavailable',()=>{
    const html=render(),data=rows(html);
    assert.deepEqual(data,[{disease:'Dengue',values:[9,0,0,9]},{disease:'Hypertension',values:[5,1,0,6]},{disease:'Influenza',values:[4,0,0,4]},{disease:'Total',values:[18,1,0,19]}]);
    assert.match(html,/Barangay case-activity classification/);assert.match(html,/Individual patient severity/);assert.match(html,/Not assessed/);assert.match(html,/Case-activity data is unavailable/);assert.match(html,/Locally configured case-volume bands/);assert.doesNotMatch(html,/Each colored ring segment/);
    assert.match(html,/<\/header>\s*<div class="heatmap-info-body"/);assert.match(html,/aria-label="Close barangay details"/);
});
test('unknown severity is explicit even when the API does not provide its disease details',()=>{
    const html=render({cases:21,severity_counts:{mild:18,monitored:1,high_risk:0,unknown:2}}),data=rows(html);
    assert.deepEqual(data.find(r=>r.disease==='Breakdown unavailable').values,[0,0,0,2,2]);assert.deepEqual(data.at(-1).values,[18,1,0,2,21]);
    assert.match(html,/2 cases have unknown severity/);assert.match(html,/Disease details are unavailable for 2 cases/);
});
test('legacy missing breakdown is shown honestly; known disease names are not invented',()=>{
    const html=render({diseases_by_severity:undefined,high_risk_diseases:[],pending_classification:1});
    assert.deepEqual(rows(html),[{disease:'Breakdown unavailable',values:[18,1,0,19]},{disease:'Total',values:[18,1,0,19]}]);
    assert.match(html,/1 active case needs disease classification review/);assert.doesNotMatch(html,/Dengue|Hypertension|Influenza/);
});
test('patient-controlled names, disease labels, dates and color explanations are escaped',()=>{
    const html=render({name:'<img src=x onerror=alert(1)>',diseases_by_severity:{mild:[{disease:'<script>alert(1)</script>',cases:18}],monitored:[{disease:'A & B',cases:1}]},color_reason:'<svg onload=alert(1)>'});
    assert.doesNotMatch(html,/<script>|<img|<svg onload/);assert.match(html,/&lt;script&gt;/);assert.match(html,/A &amp; B/);
    const custom=context.window.HealthIntelMapDetails.render({name:'A',cases:0,severity_counts:{}},'<img>','" onmouseover="x');assert.doesNotMatch(custom,/<img>|id="" onmouseover/);assert.match(custom,/&lt;img&gt;/);
});
test('empty, High Risk and incomplete summaries use the correct state with no invented trend',()=>{
    const empty=render({cases:0,severity_counts:{},diseases_by_severity:{}});assert.match(empty,/No active disease cases recorded/);assert.match(empty,/Circle color shows locally configured case volume/);assert.doesNotMatch(empty,/<table|heatmap-composition/);
    const high=render({cases:1,severity_counts:{high_risk:1},diseases_by_severity:{high_risk:[{disease:'A',cases:1}]}});assert.match(high,/Not assessed/);assert.match(high,/heatmap-metric-high_risk/);
    const unknown=render({cases:1,severity_counts:{unknown:1},diseases_by_severity:{}});assert.match(unknown,/1 case has unknown severity/);assert.deepEqual(rows(unknown).at(-1).values,[0,0,0,1,1]);
});

test('patient severity composition remains accurate but does not color the barangay marker',()=>{
    const data={name:'Sample',cases:19,severity_counts:{mild:18,monitored:1}};
    const result=context.window.HealthIntelMapDetails.composition(data);
    assert.equal(result.segments.length,2);assert.ok(Math.abs(result.segments[0].percent-94.73684210526316)<1e-9);assert.ok(Math.abs(result.segments[1].percent-5.263157894736842)<1e-9);
    assert.ok(Math.abs(result.segments.reduce((sum,s)=>sum+s.percent,0)-100)<1e-9);
    const html=context.window.HealthIntelMapDetails.marker(data);assert.match(html,/heatmap-ring-none/);assert.doesNotMatch(html,/heatmap-ring-mild|heatmap-ring-monitored|stroke-dasharray/);assert.match(html,/>19<\/text>/);assert.doesNotMatch(html,/heatmap-ring-high_risk/);
    assert.match(context.window.HealthIntelMapDetails.summary(data),/18 Mild, 1 Monitored, 0 High Risk/);
});

test('missing and inconsistent breakdowns remain unknown and empty markers avoid invalid SVG values',()=>{
    for(const data of [{cases:5},{cases:5,severity_counts:{mild:2}},{cases:5,severity_counts:{mild:8,monitored:2}}]) {
        const result=context.window.HealthIntelMapDetails.composition(data);
        assert.equal(Object.values(result.counts).reduce((a,b)=>a+b,0),5);assert.ok(result.counts.unknown>0);
        assert.ok(Math.abs(result.segments.reduce((sum,s)=>sum+s.percent,0)-100)<1e-9);
    }
    const empty=context.window.HealthIntelMapDetails.marker({cases:0,severity_counts:{}});assert.doesNotMatch(empty,/NaN|Infinity|stroke-dasharray/);assert.match(empty,/>0<\/text>/);
    const missing=context.window.HealthIntelMapDetails.marker({cases:5});assert.match(missing,/heatmap-ring-none/);assert.doesNotMatch(missing,/heatmap-ring-mild/);
});

test('even many High Risk patients cannot become a barangay High Risk assessment without validated thresholds',()=>{
    for(const total of [0,1,1000]) {
        const data={name:'Sample',cases:total,severity_counts:{high_risk:total}};
        const marker=context.window.HealthIntelMapDetails.marker(data);
        assert.match(marker,/heatmap-ring-none/);
        assert.doesNotMatch(marker,/heatmap-ring-high_risk|heatmap-ring-mild|heatmap-ring-monitored/);
        assert.match(context.window.HealthIntelMapDetails.summary(data),/case volume Not assessed/);
    }
});

test('both portal legends and marker labels separate barangay assessment from patient severity',()=>{
    for(const page of ['bhw.html','mho.html']) {
        const html=fs.readFileSync(path.join(__dirname,'../../',page),'utf8');
        const legend=html.match(/<div class="heatmap-legend"[^>]*>([\s\S]*?)<\/div>/)[1];
        assert.match(legend,/1-10 cases/);assert.match(legend,/21\+ cases/);
        assert.match(legend,/assessment unavailable/);assert.doesNotMatch(legend,/No active cases|Severity incomplete/);
    }
    const map=fs.readFileSync(path.join(__dirname,'../../assets/js/shared/health-map.js'),'utf8');
    assert.doesNotMatch(map,/counts\.high_risk\?`/);
    assert.match(map,/HealthIntelMapDetails\.classification\(brgy\)/);
});

test('live activity colors all three bands and explains source counts separately from active patient severity',()=>{
 const {assess}=require('../services/map-activity');
 for(const [n,tone] of [[10,'mild'],[11,'monitored'],[21,'high_risk']]){
  const rows=[['2026-10-20',1],['2026-10-27',2],['2026-10-30',3],['2026-11-16',n]].map(([date_recorded,cases])=>({barangay_id:2,disease:'URTI',date_recorded,cases}));
  const activity=assess(rows,2,'',new Date('2026-11-16T14:00:00Z'));
  const data={name:'Sample',cases:1,severity_counts:{high_risk:1},activity};
  const marker=context.window.HealthIntelMapDetails.marker(data),html=render(data);
  assert.match(marker,new RegExp('heatmap-ring-'+tone));assert.match(marker,/>this month<\/text>/);
  assert.match(html,/2026-11-01 to 2026-11-16/);assert.doesNotMatch(html,/sample SD|zero baseline|mean \+ 1 SD/);assert.match(html,/not official outbreak-risk thresholds/);
  assert.match(html,/Why this color/);assert.match(html,/Individual patient severity/);
 }
});
