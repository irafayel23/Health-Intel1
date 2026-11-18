const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'assets/js/mho/mho-walkins.js'),'utf8');
const advance=source.slice(source.indexOf('    function advanceStep()'),source.indexOf('    function showStatus('));
const clock=source.slice(source.indexOf('    function consultationTime()'),source.indexOf('    function consultation()'));
function attempt(step,changes={},badMeasurements=false){
 const values={'walkin-last':'Fixture','walkin-first':'Test','walkin-purok':'Test zone','walkin-barangay':'1','walkin-birthdate':'01/01/2000','walkin-date':'2026-11-01','walkin-age':'26','walkin-transaction':'Walk-in','walkin-nature':'New consultation/case','walkin-time-hour':'9','walkin-time-minute':'30','walkin-time-period':'AM',...changes};
 const errors=[],moves=[];const c={patientPicker:null,step,clearFieldErrors(){},value:id=>values[id]||'',fail:(id,msg)=>{const e=Error(msg);e.field=id;throw e;},HealthIntelDate:{parseBirthdate:v=>v?'2000-01-01':null},todayInManila:()=> '2026-11-01',updateAge(){},returning:()=>false,matches:[],HealthIntelVisits:{validateMeasurements(){if(badMeasurements)throw Object.assign(Error('Enter temperature.'),{field:'walkin-temperature'});}},showStatus(){},showStep:n=>moves.push(n),fieldError:(id,msg)=>errors.push({id,msg})};
 vm.runInNewContext(clock+advance+';advanceStep()',c);return {errors,moves};
}
test('Continue blocks missing patient details, referral reason and measurements at their steps',()=>{
 for(const id of ['walkin-first','walkin-last','walkin-purok','walkin-barangay','walkin-birthdate']){const r=attempt(0,{[id]:''});assert.equal(r.moves.length,0);assert.equal(r.errors[0].id,id);}
 let r=attempt(1,{'walkin-transaction':'Referral'});assert.equal(r.moves.length,0);assert.equal(r.errors[0].id,'walkin-referral-reason');
 r=attempt(2,{},true);assert.equal(r.moves.length,0);assert.equal(r.errors[0].id,'walkin-temperature');
});
test('Continue requires complete time and validates AM/PM',()=>{
 assert.equal(attempt(1,{'walkin-time-hour':'','walkin-time-minute':'','walkin-time-period':''}).moves.length,0);
 for(const changes of [{'walkin-time-minute':''},{'walkin-time-period':''},{'walkin-time-hour':'13','walkin-time-minute':'00','walkin-time-period':'AM'},{'walkin-time-hour':'9','walkin-time-minute':'60','walkin-time-period':'PM'}])assert.equal(attempt(1,changes).moves.length,0);
 assert.deepEqual(attempt(1,{'walkin-time-hour':'9','walkin-time-minute':'30','walkin-time-period':'AM'}).moves,[2]);
});
test('MHO entry opens/closes through the existing accessible modal and keeps history on the page',()=>{
 const calls=[],listeners={};const els={};
 const field=id=>els[id]||(els[id]={addEventListener:(name,fn)=>listeners[id+name]=fn});
 const c={field,isSaving:false,step:0,showStep:(...x)=>calls.push(['step',...x]),loadRecent:()=>calls.push(['refresh']),window:{HealthIntelModal:{open:x=>calls.push(['open',x]),close:x=>calls.push(['close',x])}}};
 vm.runInNewContext(source.slice(source.indexOf('    function closeEntry()'),source.indexOf('    async function openReturnVisit'))+';bindViews()',c);
 listeners['walkin-record-tabclick']();assert.equal(calls[0][0],'open');
 listeners['walkin-cancelclick']();assert.equal(calls.at(-1)[0],'close');
 c.isSaving=true;const n=calls.length;listeners['walkin-dialog-closeclick']();assert.equal(calls.length,n);
 listeners['walkin-recent-tabclick']();assert.equal(calls.at(-1)[0],'refresh');
 const html=fs.readFileSync(path.join(root,'mho.html'),'utf8');
 assert(html.indexOf('id="walkin-record-panel"')>html.indexOf('</main>'));
 assert.match(html, /id="walkin-record-panel"[^>]*role="dialog"[^>]*aria-modal="true"/);
 assert(!/<div id="walkin-recent-panel"[^>]* hidden/.test(html));
 assert(html.includes('shared/accessible-modal.js'));assert(html.includes('Add walk-in patient'));
});

test('popup centering remains compatible with the existing flex-based modal helper',()=>{
 let css;require('../../tools/styles/mho-walkin-dialog.cjs').handler({addUtilities:x=>{css=x;}});
 assert.equal(css['.walkin-entry-overlay'].display,'flex');
 assert.equal(css['.walkin-entry-overlay'].alignItems,'center');assert.equal(css['.walkin-entry-overlay'].justifyContent,'center');
 assert.equal(css['.walkin-entry-window'].width,'min(980px,100%)');
 assert.equal(css['.walkin-entry-window'].margin,'auto');
});
