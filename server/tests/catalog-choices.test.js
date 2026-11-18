const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {DISEASES}=require('../services/seasonal6200-sarima-demo');
test('analytics sample uses exactly the ten study categories without changing stored cases',()=>{
 const {sampleAnalytics}=require('../services/analytics-sample');const options=sampleAnalytics('analytics-options',{},['Synthetic Barangay'],new Date('2026-11-05'));assert.deepEqual(options.diseases,DISEASES);for(const row of sampleAnalytics('stats',{},['Synthetic Barangay'],new Date('2026-11-05')).data)assert(DISEASES.includes(row.disease));
});
test('Admin filter cannot reintroduce old or archived patient labels as active catalog choices',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../assets/js/admin/admin-records.js'),'utf8'),start=source.indexOf('function refreshAdminDiseaseFilter()');assert(start>0);const filter={value:'Dengue',children:[],replaceChildren(...items){this.children=items;this.value=items[0].value;},add(o){this.children.push(o);}};const context={document:{getElementById:()=>filter},window:{adminRegistryChoices:DISEASES.map(name=>({name}))},allPatients:[{disease:'Dengue'}],allArchivedPatients:[{disease:'Typhoid'}],Option:function(text,value){this.text=text;this.value=value;}};vm.runInNewContext(source.slice(start),context);context.refreshAdminDiseaseFilter();assert.deepEqual(filter.children.map(o=>o.value),['',...DISEASES.toSorted()]);assert.equal(filter.value,'');
});
test('correction choices preserve only the current legacy category alongside active catalog names',async()=>{
 const {handlers}=require('../services/case-corrections');const db={execute:async()=>[[{id:1,barangay_id:1,disease:'Historical fixture condition',is_archived:0}]],query:async sql=>{assert.match(sql,/status='Active' AND is_archived=0/);return [DISEASES.map(name=>({name}))];}};let result;const res={json:v=>result=v,status(){return this;}};await handlers(db).get({user:{role:'admin'},params:{id:'1'}},res);assert.equal(result.success,true);assert.deepEqual(result.data.diseases,[...DISEASES,'Historical fixture condition'].toSorted());assert(!result.data.diseases.includes('Typhoid'));
});
test('MHO chart choices come from active catalog; archived history does not recreate extra options',async()=>{
 const {createDashboardData}=require('../services/dashboard-data');let n=0;const db={execute:async sql=>{n++;if(n===1)return [[{year:2026}]];if(n===2)return [[{name:'Synthetic Barangay'}]];assert.match(sql,/FROM disease_registry WHERE status='Active' AND is_archived=0/);return [DISEASES.map(disease=>({disease}))];}};assert.deepEqual((await createDashboardData(db).analyticsOptions()).diseases,DISEASES);
});
