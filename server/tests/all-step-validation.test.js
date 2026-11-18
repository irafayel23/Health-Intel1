const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),src=fs.readFileSync(path.join(root,'assets/js/shared/patient-visits.js'),'utf8');
const validate=src.slice(src.indexOf('        const validate=()=>{'),src.indexOf('        render();',src.indexOf('        const validate=()=>{')));
test('BHW wizard blocks incomplete patient, consultation and measurement steps',()=>{
 const valid={'swal-lname':'Test','swal-fname':'Fixture','swal-purok':'Test Zone','swal-birthdate':'01/01/2000','swal-age':'26','swal-case-date':'2026-11-01'};
 function attempt(step,changes={},visitBad=false,vitalsBad=false){const v={...valid,...changes};return ()=>vm.runInNewContext(validate+';validate();',{step,document:{getElementById:id=>({value:v[id]||''})},HealthIntelDate:{parseBirthdate:x=>x?'2000-01-01':null,todayInManila:()=> '2026-11-01'},formError:(id,m)=>Object.assign(Error(m),{field:id}),visitControl:{consultation(){if(visitBad)throw Error('Required consultation details missing');}},validateMeasurements(){if(vitalsBad)throw Error('Required measurements missing');}});}
 for(const id of ['swal-lname','swal-fname','swal-purok','swal-birthdate','swal-age'])assert.throws(attempt(0,{[id]:''}));
 assert.throws(attempt(1,{'swal-case-date':''}));assert.throws(attempt(1,{},true));assert.throws(attempt(2,{},false,true));
 assert.doesNotThrow(attempt(0));assert.doesNotThrow(attempt(1));assert.doesNotThrow(attempt(2));
});
test('real shared measurement validator requires both BP values, temperature, height and weight',()=>{
 const body=src.slice(src.indexOf("    function validateMeasurements("),src.indexOf('    function wizard('));
 const valid={'swal-bp':'120/80','swal-temperature':'36.5','swal-height':'165','swal-weight':'60'};
 for(const key of Object.keys(valid)){
  const values={...valid,[key]:''};assert.throws(()=>vm.runInNewContext(body+';validateMeasurements();',{document:{getElementById:id=>({value:values[id]})},formError:(id,m)=>Object.assign(Error(m),{field:id})}));
 }
});
test('unlisted disease requires both reported condition and source',()=>{
 const code=fs.readFileSync(path.join(root,'assets/js/shared/encoding-controls.js'),'utf8');const body=code.slice(code.indexOf('    function conditionPayload('),code.indexOf('    const pending='));
 for(const changes of [{'x-disease':''},{'x-reported':''},{'x-source':''}]){
  const values={'x-disease':'__condition_not_listed__','x-reported':'Reported condition','x-source':'Verbal referral',...changes};
  assert.throws(()=>vm.runInNewContext(body+";conditionPayload('x');",{UNLISTED:'__condition_not_listed__',document:{getElementById:id=>({value:values[id]})}}));
 }
});
