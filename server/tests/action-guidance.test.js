const {test}=require('node:test'),assert=require('node:assert/strict');
const G=require('../../assets/js/mho/mho-action-guidance');
const P=require('../../assets/js/mho/sarima-presentation');
const base=(disease='Cough')=>({disease,barangay:'Salvacion',required_components:1,production:{'1':{target:'2026-10'}}});

test('all ten study conditions receive an action, responsible role, factual reason and primary-source link',()=>{
 for(const disease of ['Cough','URTI','Infection all types','ARI','Fever unknown origin','Hypertension','Influenza','Acute Gastroenteritis','Vertigo','All types of skin disease']){
  const rows=G.prediction(base(disease),4,3);assert(rows.length>=2);
  for(const row of rows){assert(row.owner);assert(row.reason);assert(row.action);assert.equal(new URL(row.source.url).hostname,'www.who.int');}
  assert(rows.some(row=>row.id==='R3'));assert(rows[0].action.includes('Salvacion'));assert(rows[0].reason.includes(disease));
 }
});

test('different diseases produce concrete and distinct appropriate actions',()=>{
 const action=disease=>G.prediction(base(disease),4,3)[0].action;
 assert.match(action('Cough'),/cover coughs.*clean hands/);
 assert.match(action('Acute Gastroenteritis'),/safe drinking water.*oral rehydration supplies/);
 assert.match(action('Hypertension'),/blood pressure checks.*monitor works/);
 assert.match(action('Vertigo'),/place to sit.*persistent symptoms/);
 assert.match(action('All types of skin disease'),/assess the signs.*referral/);
 assert.match(action('Fever unknown origin'),/unexplained fever/);
 assert.doesNotMatch(action('Fever unknown origin'),/water contamination|antibiotic/);
});

test('rise, rounded stability, decline, zero and unavailable each preserve appropriate behavior',()=>{
 assert(G.prediction(base(),4,3).some(row=>row.id==='R3'));
 assert(!G.prediction(base(),3.2,3).some(row=>row.id==='R3'||row.id==='R4'));
 assert(G.prediction(base(),2,3).some(row=>row.id==='R4'));
 const zero=G.prediction(base(),0,0);assert.equal(zero.length,1);assert.match(zero[0].action,/cover coughs/);
 const fromZero=G.prediction(base(),2,0);assert(fromZero.some(row=>row.id==='R5'));assert(fromZero.every(row=>!row.action.includes('Infinity')));
 assert.equal(G.prediction(base(),null,3).length,0);
 assert.deepEqual(P.recommendations(base(),null,3).map(row=>row.id),['R7']);
});

test('Municipal Analytics contains factual descriptions only, with no recommendation renderer',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const root=path.resolve(__dirname,'../..');
 const html=fs.readFileSync(path.join(root,'mho.html'),'utf8');
 const analytics=html.slice(html.indexOf('id="view-analytics"'),html.indexOf('id="view-heatmap"'));
 assert(analytics.includes('Recorded-case summary'));assert.doesNotMatch(analytics,/Recommended health actions|Suggested MHO action|Suggested actions require MHO approval/);
 const js=fs.readFileSync(path.join(root,'assets/js/mho/mho-analytics.js'),'utf8');assert(!js.includes('renderAnalyticsActions'));assert(!js.includes('HealthIntelActionGuidance'));
 const scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/mho/mho-insights.js'),'utf8'),scope);
 for(const rows of [[],[{disease:'Cough',cases:4}]]){
  const result=scope.window.MHOInsights.describeProfile(rows,{barangay:'Caliban',year:'2025',age:'all',category:'morbidity'},{total_cases:rows.length?4:0});
  assert.equal(result.action,undefined);assert.doesNotMatch(result.text,/Arrange|Ask the|Coordinate|Recommend/);
 }
});

test('guidance never mutates saved views or records and forecast-dependent text does not leak other months',()=>{
 const view=base('Hypertension'),before=JSON.stringify(view);G.prediction(view,4,3);assert.equal(JSON.stringify(view),before);
 const text=JSON.stringify(G.prediction(view,4,3));assert(text.includes('October 2026'));assert(!text.includes('November'));
});
