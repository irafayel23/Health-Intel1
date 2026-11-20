const {test}=require('node:test'),assert=require('node:assert/strict');
const {periods,band,assess}=require('../services/map-activity');
const now=new Date('2026-11-16T14:00:00Z');
const row=(cases,extra={})=>({barangay_id:2,date_recorded:'2026-11-16',disease:'URTI',cases,...extra});
test('every fixed-band boundary including zero and unlimited high counts is exact',()=>{
 for(const [n,label,tone] of [[0,'No recorded cases','none'],[1,'Mild','mild'],[10,'Mild','mild'],[11,'Monitored','monitored'],[20,'Monitored','monitored'],[21,'High Risk','high_risk'],[1000,'High Risk','high_risk']]){
  assert.equal(band(n).label,label);assert.equal(band(n).tone,tone);
 }
 for(const n of [-1,NaN,1.5,'1'])assert.throws(()=>band(n));
});
test('combined total drives both the circle count and band; disease filtering stays isolated',()=>{
 const rows=[row(8),row(8,{disease:'Vertigo'}),row(100,{barangay_id:3})];
 const all=assess(rows,2,'',now);assert.equal(all.observed_cases,16);assert.equal(all.label,'Monitored');assert.equal(all.details.length,10);
 const selected=assess(rows,2,'Vertigo',now);assert.equal(selected.observed_cases,8);assert.equal(selected.label,'Mild');
});
test('history and patient severity cannot turn one recorded case orange',()=>{
 const result=assess([row(1,{severity:'High Risk'}),row(100,{date_recorded:'2026-10-31'})],2,'',now);
 assert.equal(result.label,'Mild');assert.equal(result.observed_cases,1);assert.match(result.reason,/1-10/);
});
test('overall volume counts pending and other records while the selected disease awaits review',()=>{
 const rows=[row(3),row(1,{disease_review_status:'Pending'}),row(1,{disease:'Other'})];
 const all=assess(rows,2,'',now);
 assert.equal(all.observed_cases,5);
 assert.equal(all.label,'Mild');
 assert.equal(all.tone,'mild');
 assert.equal(all.pending_cases,1);
 assert.equal(all.other_cases,1);
 assert.equal(all.details.find(item=>item.disease==='URTI').current,3);
 assert.equal(assess(rows,2,'URTI',now).status,'unavailable');
 assert.equal(assess([...rows,row(6)],2,'',now).label,'Monitored');
});
test('Philippine calendar month excludes older and future dates without requiring historical data',()=>{
 assert.deepEqual(periods(now).current,{start:'2026-11-01',end:'2026-11-17',through:'2026-11-16'});
 assert.equal(periods(now).start,'2026-11-01');assert.equal(periods(new Date('2026-11-16T16:00:00Z')).current.through,'2026-11-17');
 assert.equal(assess([row(1),row(50,{date_recorded:'2026-11-17'})],2,'',now).observed_cases,1);
 assert.equal(assess([],2,'',new Date('2026-10-10T00:00:00Z')).status,'assessed');
});
test('malformed counts and dates fail; unlisted selected conditions remain unavailable',()=>{
 assert.throws(()=>assess([row('bad')],2,'',now));assert.throws(()=>assess([row(1,{date_recorded:'2026-99-99'})],2,'',now));
 assert.equal(assess([],2,'Other',now).status,'unavailable');
});

test('month-to-date includes its first day, excludes the prior month and resets at Philippine midnight',()=>{
 const rows=[row(10,{date_recorded:'2026-11-01'}),row(1),row(100,{date_recorded:'2026-10-31'})];
 const current=assess(rows,2,'',now);assert.equal(current.observed_cases,11);assert.equal(current.label,'Monitored');
 assert.equal(periods(new Date('2026-11-30T16:00:00Z')).start,'2026-12-01');
 assert.equal(periods(new Date('2026-12-31T16:00:00Z')).start,'2027-01-01');
 const reset=assess(rows,2,'',new Date('2026-11-30T16:00:00Z'));assert.equal(reset.observed_cases,0);
 assert.equal(periods(new Date('2028-02-29T12:00:00Z')).current.through,'2028-02-29');
});
