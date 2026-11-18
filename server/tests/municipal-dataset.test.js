const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {create}=require('../../assets/js/mho/municipal-dataset');
const {loadDataset,aggregateDataset}=require('../services/dataset-analytics');
const rows=loadDataset();
function fixture(){let requests=0,fail=false;const read=create(async url=>{requests++;if(fail)return {ok:false,json:async()=>({success:false})};return {ok:true,json:async()=>aggregateDataset(rows,Object.fromEntries(new URL(url,'http://fixture').searchParams))};});return {read,count:()=>requests,fail:value=>{fail=value;}};}
test('existing six Municipal charts share the same 6200 counts and only five initial CSV requests',async()=>{
 const f=fixture(),q={year:'all',barangay:'all',age:'all',category:'morbidity'};
 const [kpi,profile,trend,distribution,breakdown,comparison]=await Promise.all(['kpi','stats','trend','disease-distribution','breakdown','year-comparison'].map(p=>f.read(p,q)));
 assert.equal(kpi.total,6200);assert.equal(kpi.months,45);assert.equal(kpi.diseases,10);assert.equal(kpi.barangays,7);
 assert.equal(profile.data.reduce((s,r)=>s+r.cases,0),6200);assert.equal(trend.data.reduce((s,r)=>s+r.cases,0),6200);assert.equal(distribution.data.reduce((s,r)=>s+r.count,0),6200);assert.equal(breakdown.barangays.reduce((s,r)=>s+r.cases,0),6200);
 assert.deepEqual(breakdown.ages,[]);assert.equal(comparison.through,'2026-09-30');assert.equal(f.count(),5);
 for(const item of comparison.data){const expected=aggregateDataset(rows,{year:String(item.year),disease:item.disease}).total;assert.equal(item.cases,expected);}
 await f.read('kpi',q);assert.equal(f.count(),5);
});
test('all seven barangays and four years match dataset exactly; trend disease selection is preserved',async()=>{
 const f=fixture();for(const barangay of [...new Set(rows.map(r=>r.Barangay))])for(const year of ['2023','2024','2025','2026']){const q={year,barangay};const d=aggregateDataset(rows,q);const k=await f.read('kpi',q);assert.equal(k.total,d.total);assert.equal(k.months,year==='2026'?9:12);}
 const t=await f.read('trend',{year:'2026',barangay:'Caliban',disease:'Influenza'});assert.equal(t.data.length,9);assert.equal(t.data.reduce((s,r)=>s+r.cases,0),aggregateDataset(rows,{year:'2026',barangay:'Caliban',disease:'Influenza'}).total);
});
test('failures are retryable, invalid dimensions refused, unknown chart rejected',async()=>{
 const f=fixture();f.fail(true);await assert.rejects(f.read('kpi',{}));f.fail(false);assert.equal((await f.read('kpi',{})).total,6200);
 await assert.rejects(f.read('kpi',{age:'18-59'}));await assert.rejects(f.read('stats',{category:'mortality'}));await assert.rejects(f.read('unknown',{}));await assert.rejects(f.read('year-comparison',{years:'2027'}));
});
test('MHO keeps existing chart containers, removes separate view and unsupported controls, preserves Predictions section',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../../mho.html'),'utf8');assert(!html.includes('id="dataset-analytics"'));assert(!html.includes('Analytics source'));assert(html.includes('id="operational-analytics" class="space-y-5"'));
 for(const id of ['dynamicChart','yoyMorbidityChart','mortalityChart','comparisonChart','breakdownChart','sarima-chart','monthly-updates'])assert(html.includes('id="'+id+'"'),id);
 assert(html.indexOf('municipal-dataset.js')<html.indexOf('mho-analytics.js'));assert(html.includes('hidden disabled id="breakdown-age-tab"'));
});

test('existing Municipal controller renders five original charts, findings and filtered totals with separate live patient status cards',async()=>{
 const vm=require('node:vm'),path=require('node:path');
 class E{constructor(){this.children=[];this.options=[];this.value='';this.dataset={};this.classList={add(){},remove(){},toggle(){},contains(){return false;}};}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}setAttribute(){}addEventListener(){}getContext(){return {};}add(o){this.options.push(o);}remove(i){this.options.splice(i,1);}querySelectorAll(){return [];}createTHead(){return this.section();}createTBody(){return this.section();}section(){return {insertRow(){return {append(){},insertCell(){return {};}};}};}}
 const html=fs.readFileSync(path.join(__dirname,'../../mho.html'),'utf8'),els=new Map([...html.matchAll(/id="([^"\n]+)"/g)].map(m=>[m[1],new E()]));
 for(const id of ['filter-year','filter-barangay','filter-age']){els.get(id).value='all';els.get(id).options=[{textContent:'All'}];}els.get('filter-trend-disease').options=[{textContent:'All'}];els.get('comparison-years-mode').value='all';els.get('comparison-period').value='calendar';
 const charts=[],events={};let recordedAfterDataset=2;const scope={window:{addEventListener:(name,callback)=>{events[name]=callback;}},document:{getElementById:id=>els.get(id),createElement:()=>new E(),addEventListener(){},querySelector(){return null;}},setInterval:()=>1,Option:function(text,value){return {textContent:text,value};},Chart:function(ctx,config){this.config=config;this.destroy=()=>{};charts.push(this);},URLSearchParams,Intl,Date,Map,fetch:async url=>{if(url.startsWith('/api/mho/kpi?'))return {ok:true,json:async()=>({success:true,active:6,recovered:12,highRisk:1,recordedAfterDataset})};assert(url.startsWith('/api/mho/dataset-analytics?'));return {ok:true,json:async()=>aggregateDataset(rows,Object.fromEntries(new URL(url,'http://fixture').searchParams))};},MunicipalDataset:{create}};
 vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../assets/js/mho/mho-insights.js'),'utf8'),scope);scope.MHOInsights=scope.window.MHOInsights;vm.runInContext(fs.readFileSync(path.join(__dirname,'../../assets/js/mho/mho-analytics.js'),'utf8'),scope);for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));
 assert.equal(els.get('stat-total').textContent,'6,202');assert.equal(els.get('stat-total-period').textContent,'All years');for(const [id,value]of [['stat-active','6'],['stat-recovered','12'],['stat-risk','1']])assert.equal(els.get(id).textContent,value);assert.equal(charts.length,5);assert.equal(els.get('descriptive-findings').children.length,3);assert.equal(els.get('mortality-title').textContent,'Disease distribution');assert(!els.get('comparison-context').textContent.includes('unavailable'));
 recordedAfterDataset++;events['health-intel:cases-changed']();await new Promise(r=>setImmediate(r));assert.equal(els.get('stat-total').textContent,'6,203');
 assert(!html.includes('id="mho-patient-search-button"'));
 els.get('filter-barangay').value='Caliban';els.get('filter-year').value='2026';await vm.runInContext('updateDynamicChart()',scope);assert.equal(els.get('stat-total').textContent,(aggregateDataset(rows,{barangay:'Caliban',year:'2026'}).total+3).toLocaleString('en-PH'));assert(els.get('analytics-data-context').textContent.includes('generated monthly counts'));
 let pending=[];const datasetFetch=scope.fetch;scope.fetch=url=>url.startsWith('/api/mho/kpi?')?new Promise(resolve=>pending.push({url,resolve})):datasetFetch(url);
 vm.runInContext('analyticsRequestId=101',scope);const stale=vm.runInContext("fetchLiveMHOStats({year:'2025',barangay:'Caliban'},101)",scope);
 vm.runInContext('analyticsRequestId=102',scope);const fresh=vm.runInContext("fetchLiveMHOStats({year:'2026',barangay:'Salvacion'},102)",scope);
 assert(pending[1].url.includes('barangay=Salvacion'));pending[1].resolve({ok:true,json:async()=>({success:true,active:0,recovered:3,highRisk:0})});await fresh;
 pending[0].resolve({ok:true,json:async()=>({success:true,active:99,recovered:99,highRisk:99})});await stale;assert.equal(els.get('stat-active').textContent,'0');
 scope.fetch=async()=>({ok:false,json:async()=>({success:false})});await vm.runInContext('fetchLiveMHOStats({},102)',scope);assert.equal(els.get('stat-active').textContent,'Unavailable');assert.equal(els.get('stat-total').textContent,'Unavailable');
 scope.fetch=async()=>({ok:true,json:async()=>({success:true,active:null,recovered:0,highRisk:0})});await vm.runInContext('fetchLiveMHOStats({},102)',scope);assert.equal(els.get('stat-active').textContent,'Unavailable');
});
