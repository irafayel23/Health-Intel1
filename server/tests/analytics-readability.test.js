const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const source=file=>fs.readFileSync(path.join(root,'assets/js',file),'utf8');
const sandbox={window:{}};vm.runInNewContext(source('mho/mho-insights.js'),sandbox);
const insights=sandbox.window.MHOInsights;
function fixture(){return {profile:{data:[{disease:'Cough',cases:4},{disease:'URTI',cases:4}]},breakdown:{total_cases:10,unknown_age_cases:2,barangays:[{label:'Alegria',cases:6},{label:'Salvacion',cases:4}],ages:[{label:'18-59',cases:5},{label:'60+',cases:3},{label:'Not recorded',cases:2}],months:[{label:'2026-01',cases:5},{label:'2026-02',cases:5}]}};}

test('all four descriptive findings explain actual counts and shares, including tied leaders',()=>{
 const {profile,breakdown}=fixture(),rows=insights.descriptiveFindings(profile,breakdown);
 assert.equal(rows.length,4);
 assert.equal(rows[0].name,'Cough, URTI');assert.equal(rows[0].share,40);assert.match(rows[0].explanation,/Each tied disease category.*4 of 10.*40.0% each/);
 assert.equal(rows[1].share,60);assert.match(rows[1].explanation,/6 of 10.*60.0%/);assert.match(rows[1].explanation,/not adjusted for barangay population/);
 assert.equal(rows[2].share,50);assert.match(rows[2].explanation,/5 of 10/);assert.match(rows[2].explanation,/2 records have no usable age.*denominator/);
 assert.match(rows[3].name,/Jan 2026, Feb 2026/);assert.match(rows[3].explanation,/50.0% each/);assert.match(rows[3].explanation,/does not establish a recurring seasonal pattern/);
});

test('explanations reflect changed filtered totals without changing the source rows',()=>{
 const {profile,breakdown}=fixture();const before=JSON.stringify({profile,breakdown});insights.descriptiveFindings(profile,breakdown);assert.equal(JSON.stringify({profile,breakdown}),before);
 const single=insights.descriptiveFindings({data:[{disease:'Vertigo',cases:2}]},{total_cases:2,unknown_age_cases:0,barangays:[{label:'Minoyan',cases:2}],ages:[{label:'60+',cases:2}],months:[{label:'2025-12',cases:2}]});
 for(const row of single){assert.equal(row.share,100);assert.match(row.explanation,/2 of 2.*100.0%/);assert.equal(row.tied,false);}
 assert.equal(single[2].name,'60+ years');assert.equal(single[3].name,'Dec 2025');
});

test('empty, undated and unknown-age selections do not invent leading observations',()=>{
 const {profile,breakdown}=fixture();assert.equal(insights.descriptiveFindings(profile,{...breakdown,total_cases:0}).length,0);
 const rows=insights.descriptiveFindings(profile,{...breakdown,unknown_age_cases:10,ages:[{label:'Not recorded',cases:10}],months:[]});
 for(const index of [2,3]){assert.equal(rows[index].name,'Not recorded');assert.equal(rows[index].share,null);assert.equal(rows[index].count,0);assert.doesNotMatch(rows[index].explanation,/NaN|Infinity/);}
 assert.match(rows[2].explanation,/No usable age group/);assert.match(rows[3].explanation,/No usable case date/);
});

test('rendered findings include one visible explanation beneath each value',()=>{
 class Element{constructor(tag){this.tagName=tag;this.children=[];this.className='';}append(...nodes){this.children.push(...nodes);}replaceChildren(){this.children=[];}}
 const target=new Element('dl');const {profile,breakdown}=fixture();
 const scope={document:{getElementById:()=>target,createElement:tag=>new Element(tag)},MHOInsights:insights};
 const code=source('mho/mho-analytics.js');vm.runInNewContext(code.slice(0,code.indexOf('\nfor(const dimension')),scope);
 vm.runInNewContext('analyticsProfileData='+JSON.stringify(profile)+';analyticsBreakdownData='+JSON.stringify(breakdown)+';renderDescriptiveFindings();',scope);
 assert.equal(target.children.length,4);
 for(const row of target.children){const dd=row.children[1];assert.equal(dd.tagName,'dd');assert.equal(dd.children[1].tagName,'p');assert(dd.children[1].textContent.length>40);assert(!dd.children[1].className.includes('sr-only'));}
});

test('canvas labels darken only Municipal Analytics and remain readable on a live theme update',()=>{
 let plugin,dark=false;vm.runInNewContext(source('shared/chart-theme.js'),{window:{Chart:true},Chart:{register:value=>{plugin=value;}},document:{documentElement:{classList:{contains:()=>dark}}}});
 const chart=inside=>({canvas:{closest:()=>inside?{}:null},config:{type:'bar',options:{scales:{x:{ticks:{precision:0}},y:{grid:{display:false}}}}}});
 const analytics=chart(true),other=chart(false);plugin.beforeUpdate(analytics);plugin.beforeUpdate(other);
 assert.equal(analytics.config.options.scales.x.ticks.color,'#0f172a');assert.equal(analytics.config.options.plugins.legend.labels.color,'#0f172a');assert.equal(other.config.options.color,'#475569');assert.equal(analytics.config.options.scales.x.ticks.precision,0);
 dark=true;plugin.beforeUpdate(analytics);assert.equal(analytics.config.options.color,'#cbd5e1');dark=false;plugin.beforeUpdate(analytics);assert.equal(analytics.config.options.color,'#0f172a');
});
