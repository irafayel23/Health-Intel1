const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const {createFixture}=require('./helpers/directory-session-fixture');
const {comparisonSelection,analyticsFilters}=require('../services/mho-analytics');
const {todayPeriod}=require('../services/report-periods');
let f;const tokens={};
async function api(role,path){const response=await fetch(f.base+'/api/mho/'+path,{headers:{Authorization:'Bearer '+tokens[role]}});return {status:response.status,...await response.json()};}
before(async()=>{f=await createFixture();for(const role of ['bhw','mho']){const r=await fetch(f.base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system_id:f.users[role],password:f.password})});tokens[role]=(await r.json()).token;}
 for(const [date,disease,status,barangay,age] of [['2023-02-01','Trend QA','Cleared',f.own,10],['2026-01-04','Trend QA','Active',f.own,10],['2026-01-15','Trend QA','Active',f.own,10],['2026-03-01','Trend QA','Deceased',f.own,70],['2026-01-01','Trend QA','Active',f.other,10]])await f.db.execute('INSERT INTO health_cases(patient_name,barangay_id,disease,date_recorded,status,severity,age,encoded_by) VALUES(?,?,?,?,?,?,?,?)',['Synthetic Trend',barangay,disease,date,status,'Mild',age,f.users.bhw]);
 for(let i=0;i<7;i++)await f.db.execute("INSERT INTO health_cases(patient_name,barangay_id,disease,date_recorded,status,severity,age,encoded_by) VALUES('Synthetic Outcome',?,?,'2022-01-01','Deceased','Mild',30,?)",[f.own,'Outcome '+i,f.users.bhw]);
 for(const date of ['2024-01-02','2024-12-31','2025-01-02','2025-12-31'])await f.db.execute("INSERT INTO health_cases(patient_name,barangay_id,disease,date_recorded,status,severity,age,encoded_by) VALUES('Synthetic Comparison',?,'Cutoff QA',?,'Cleared','Mild',40,?)",[f.own,date,f.users.bhw]);
});
after(async()=>{await f?.close();});
test('trend includes every recorded year and monthly counts; visits do not multiply cases',async()=>{
 const annual=await api('mho','trend?disease=Trend%20QA');assert.equal(annual.status,200);assert.equal(annual.granularity,'annual');assert.deepEqual(annual.data.map(r=>[r.period,r.cases]),[[2023,1],[2026,4]]);
 const monthly=await api('mho','trend?year=2026&disease=Trend%20QA&barangay=Synthetic%20Barangay%20A');assert.equal(monthly.granularity,'monthly');assert.deepEqual(monthly.data.map(r=>[r.period,r.cases]),[[1,2],[3,1]]);
 const children=await api('mho','trend?year=2026&age=6-12&disease=Trend%20QA');assert.deepEqual(children.data.map(r=>[r.period,r.cases]),[[1,3]]);
 const existing=await api('mho','trend?disease=Synthetic%20Disease%20A');assert.equal(existing.data.reduce((n,r)=>n+r.cases,0),1,'Twelve visits belong to one case');
 assert.deepEqual((await api('mho','trend?disease=No%20matching%20condition')).data,[]);
});
test('dynamic choices come from configured barangays and stored years; invalid filters and wrong roles rejected',async()=>{
 const options=await api('mho','analytics-options');assert.equal(options.status,200);assert.ok(options.years.includes(2022));assert.ok(options.years.includes(2026));assert.deepEqual(options.barangays,['Synthetic Barangay A','Synthetic Barangay B']);assert.ok(options.diseases.includes('Trend QA'));
 for(const path of ['trend?age=invalid','trend?year=invalid','trend?disease=one&disease=two'])assert.equal((await api('mho',path)).status,400);
 for(const path of ['trend','analytics-options'])assert.equal((await api('bhw',path)).status,403);
});
test('deceased donut receives all categories, not a truncated top five',async()=>{
 const result=await api('mho','mortality?year=2022');assert.equal(result.data.length,7);assert.equal(result.data.reduce((sum,row)=>sum+row.count,0),7);
 assert.deepEqual((await api('mho','mortality?year=2020')).data,[]);
});

test('grouped disease comparison includes every available year and keeps single-year previous-year mode',async()=>{
 const all=await api('mho','year-comparison');assert.equal(all.status,200);assert.deepEqual(all.years,[2022,2023,2024,2025,2026]);assert.equal(all.diseases.length,4);assert.equal(all.diseases[0],'Trend QA');assert.equal(all.data.find(row=>row.disease==='Trend QA'&&row.year===2026).cases,4);assert.equal(all.data.find(row=>row.disease==='Trend QA'&&row.year===2023).cases,1);
 const selected=await api('mho','year-comparison?year=2026');assert.deepEqual(selected.years,[2025,2026]);assert.ok(selected.data.every(row=>selected.years.includes(row.year)));
 const scoped=await api('mho','year-comparison?age=6-12&barangay=Synthetic%20Barangay%20A');assert.deepEqual(scoped.years,[2023,2026]);assert.equal(scoped.data.find(row=>row.year===2026&&row.disease==='Trend QA').cases,2);
 assert.equal((await api('mho','year-comparison?year=bad')).status,400);assert.equal((await api('bhw','year-comparison')).status,403);assert.deepEqual((await api('mho','year-comparison?year=2000')).data,[]);
});

test('comparison accepts chosen nonadjacent years and applies the same Philippine month/day cutoff',async()=>{
 const selected=await api('mho','year-comparison?year=2026&years=2023,2025');
 assert.equal(selected.status,200);assert.deepEqual(selected.years,[2023,2025]);assert.ok(selected.data.every(row=>[2023,2025].includes(row.year)));
 const calendar=await api('mho','year-comparison?years=2024,2025&period=calendar');
 assert.deepEqual(calendar.data.filter(row=>row.disease==='Cutoff QA').map(row=>row.cases),[2,2]);
 const same=await api('mho','year-comparison?years=2024,2025&period=same');
 assert.equal(same.status,200);assert.equal(same.period,'same');assert.equal(same.through,todayPeriod().start);
 const expected=['01-02','12-31'].filter(date=>date<=same.through.slice(5)).length;
 assert.deepEqual(same.data.filter(row=>row.disease==='Cutoff QA').map(row=>row.cases),expected?[expected,expected]:[]);
 const all=await api('mho','year-comparison?year=2026&years=all&period=same');assert.deepEqual(all.years,[2022,2023,2024,2025,2026]);
 assert.equal((await api('bhw','year-comparison?years=all&period=same')).status,403);
 for(const query of ['years=2025','years=2025,2025','years=2023,2025%20OR%201=1','years=2025,9999','years=all&years=2025,2026','period=bad','period=same&period=calendar'])assert.equal((await api('mho','year-comparison?'+query)).status,400,query);
});

test('comparison cutoff uses the Philippine date including midnight and leap day',()=>{
 const filters=analyticsFilters({});
 assert.equal(comparisonSelection({period:'same'},filters,new Date('2026-10-18T16:01:00Z')).through,'2026-10-19');
 assert.equal(comparisonSelection({period:'same'},filters,new Date('2024-02-28T16:01:00Z')).through,'2024-02-29');
 assert.deepEqual(comparisonSelection({years:'2025,2023',period:'same'},filters,new Date('2026-10-18T00:00:00Z')).years,[2023,2025]);
});

test('case breakdown reconciles barangays, age groups and selected case outcomes without multiplying visits',async()=>{
 const all=await api('mho','breakdown'),stats=await api('mho','stats');assert.equal(all.status,200);
 assert.equal(all.total_cases,stats.summary.total_cases);
 for(const dimension of ['barangays','ages'])assert.equal(all[dimension].reduce((sum,row)=>sum+Number(row.cases),0),all.total_cases);
 assert.equal(all.ages.at(-1).label,'Not recorded');assert.equal(all.unknown_age_cases,all.ages.at(-1).cases);
 const selected=await api('mho','breakdown?year=2026&age=6-12&barangay=Synthetic%20Barangay%20A');assert.equal(selected.total_cases,2);assert.equal(selected.barangays.length,1);assert.equal(selected.ages.find(row=>row.label==='6-12').cases,2);
 const deaths=await api('mho','breakdown?category=mortality');assert.equal(deaths.total_cases,(await api('mho','stats?category=mortality')).summary.total_cases);
 const empty=await api('mho','breakdown?year=1901');assert.equal(empty.total_cases,0);assert.ok(empty.barangays.every(row=>Number(row.cases)===0));
 assert.equal((await api('bhw','breakdown')).status,403);assert.equal((await api('mho','breakdown?age=bad')).status,400);
});

test('display-only sample graphs reconcile and never add or change saved cases',async()=>{
 const [[before]]=await f.db.query('SELECT COUNT(*) AS total FROM health_cases');
 const options=await api('mho','analytics-options?sample=1'),profile=await api('mho','stats?sample=1'),data=await api('mho','breakdown?sample=1'),kpi=await api('mho','kpi?sample=1');
 assert.equal(options.sample,true);assert.equal(options.diseases.length,10);assert.equal(profile.data.length,10);
 assert.equal(kpi.total,profile.summary.total_cases);assert.equal(data.total_cases,kpi.total);assert.equal(data.barangays.length,2);assert.ok(data.barangays.every(row=>row.cases>0));assert.ok(data.ages.every(row=>row.cases>0));
 assert.equal(data.ages.reduce((sum,row)=>sum+row.cases,0),data.total_cases);assert.equal(data.months.reduce((sum,row)=>sum+row.cases,0),data.total_cases);
 const trend=await api('mho','trend?sample=1');assert.equal(trend.data.reduce((sum,row)=>sum+row.cases,0),data.total_cases);
 const mortality=await api('mho','mortality?sample=1');assert.equal(mortality.data.length,5);assert.equal(mortality.data.reduce((sum,row)=>sum+row.count,0),(await api('mho','breakdown?sample=1&category=mortality')).total_cases);
 const age=await api('mho','breakdown?sample=1&age=60%2B');assert.equal(age.ages.find(row=>row.label==='60+').cases,age.total_cases);
 const chosen=await api('mho','year-comparison?sample=1&years=2023,2026&period=same');assert.deepEqual(chosen.years,[2023,2026]);assert.equal(chosen.period,'same');
 const [[after]]=await f.db.query('SELECT COUNT(*) AS total FROM health_cases');assert.equal(before.total,after.total);
 for(const route of ['breakdown?sample=1','stats?sample=1','analytics-options?sample=1'])assert.equal((await api('bhw',route)).status,403);
 for(const query of ['sample=invalid','sample=1&age=invalid','sample=1&sample=1'])assert.equal((await api('mho','breakdown?'+query)).status,400);
});
