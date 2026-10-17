const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/js/shared/map-details.js'),'utf8'),context);
const render=(overrides={})=>context.window.HealthIntelMapDetails.render({name:'Blumentritt',cases:19,severity_counts:{mild:18,monitored:1,high_risk:0,unknown:0},diseases_by_severity:{mild:[{disease:'Dengue',cases:9},{disease:'Hypertension',cases:5},{disease:'Influenza',cases:4}],monitored:[{disease:'Hypertension',cases:1}],high_risk:[]},color_reason:'At least one active case is Monitored; none is recorded as High Risk.',...overrides},'10/17/2026, 11:18 AM','bhwMap-details-title');
function rows(html){return [...html.matchAll(/<tr(?: class="[^"]*")?><th scope="row">([^<]*)<\/th>((?:<td>.*?<\/td>)+)<\/tr>/g)].map(([,disease,cells])=>({disease,values:[...cells.matchAll(/<td>(?:<strong>)?(\d+)(?:<\/strong>)?<\/td>/g)].map(m=>Number(m[1]))}));}

test('one disease row combines severities while retaining the original totals and color reason',()=>{
    const html=render(),data=rows(html);
    assert.deepEqual(data,[{disease:'Dengue',values:[9,0,0,9]},{disease:'Hypertension',values:[5,1,0,6]},{disease:'Influenza',values:[4,0,0,4]},{disease:'Total',values:[18,1,0,19]}]);
    assert.match(html,/Why orange\?/);assert.match(html,/none is recorded as High Risk/);assert.match(html,/not disease ratings or outbreak risk/);
    assert.match(html,/<\/header>\s*<div class="heatmap-info-body"/);assert.match(html,/aria-label="Close barangay details"/);
});
test('unknown severity is explicit even when the API does not provide its disease details',()=>{
    const html=render({cases:21,severity_counts:{mild:18,monitored:1,high_risk:0,unknown:2}}),data=rows(html);
    assert.deepEqual(data.find(r=>r.disease==='Breakdown unavailable').values,[0,0,0,2,2]);assert.deepEqual(data.at(-1).values,[18,1,0,2,21]);
    assert.match(html,/2 cases have unknown severity/);assert.match(html,/Disease details are unavailable for 2 cases/);assert.match(html,/Why orange\?/);
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
    const empty=render({cases:0,severity_counts:{},diseases_by_severity:{}});assert.match(empty,/No active disease cases recorded/);assert.match(empty,/Why gray\?/);assert.doesNotMatch(empty,/<table|heatmap-composition/);
    const high=render({cases:1,severity_counts:{high_risk:1},diseases_by_severity:{high_risk:[{disease:'A',cases:1}]}});assert.match(high,/Why red\?/);
    const unknown=render({cases:1,severity_counts:{unknown:1},diseases_by_severity:{}});assert.match(unknown,/Why purple\?/);assert.deepEqual(rows(unknown).at(-1).values,[0,0,0,1,1]);
});
