const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../assets/js/mho/mho-walkins.js'),'utf8');
const marker="form.addEventListener('submit',async event=>{";
const body=source.slice(source.indexOf(marker)+marker.length,source.lastIndexOf('        });'));
async function submit(result,ok=true){
    const popups=[],statuses=[];
    const input={hidden:false,querySelector:()=>null,dispatchEvent(){}};
    const values={'walkin-last':'Fixture','walkin-first':'Test','walkin-purok':'Test zone','walkin-date':'2026-10-30','walkin-age':'26','walkin-barangay':'1','walkin-severity':'Mild'};
    const context={step:3,isSaving:false,save:{disabled:false},optionsReady:true,returnCase:null,openVersion:0,
        clearFieldErrors(){},value:id=>values[id]||'',field:()=>input,
        fail:(_id,message)=>{throw Error(message);},HealthIntelDate:{parseBirthdate:()=> '2000-01-01'},todayInManila:()=> '2026-10-30',
        consultation:()=>({condition:{disease:'Cough'},visit:{}}),api:'http://fixture.invalid',
        fetch:async()=>({ok,json:async()=>result}),form:{reset(){}},date:{},Event:class{},
        updateAge(){},renderCategories(){},visitFields(){},scheduleMatches(){},loadRecent:async()=>{},
        showStatus:(...args)=>statuses.push(args),fieldError(){},Swal:{fire:args=>{popups.push(args);return Promise.resolve({isConfirmed:true});}},window:{dispatchEvent(){}}};
    await vm.runInNewContext(`(async event=>{${body}})`,context)({preventDefault(){}});
    return {popups,statuses,save:context.save};
}
test('MHO confirms a saved new case and preserves pending-review wording',async()=>{
    const r=await submit({success:true,id:123,review_status:'Pending'});
    assert.equal(r.popups.length,1);assert.equal(r.popups[0].icon,'success');assert.match(r.popups[0].text,/#REC-123/);assert.match(r.popups[0].text,/awaiting MHO review/);
});
test('MHO confirms a saved return visit without claiming another disease case',async()=>{
    const r=await submit({success:true,id:123,new_case:false});
    assert.equal(r.popups[0].titleText,'Consultation saved');assert.match(r.popups[0].text,/totals are unchanged/);
});
test('MHO never shows success for an HTTP failure or unsuccessful save',async()=>{
    for(const [result,ok] of [[{success:false,error:'Save rejected'},false],[{success:false,error:'Save rejected'},true]]){
        const r=await submit(result,ok);assert.equal(r.popups.length,0);assert.equal(r.statuses.at(-1)[1],'error');assert.equal(r.save.disabled,false);
    }
});
