const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../assets/js/shared/patient-visits.js'),'utf8');
const code=src.slice(src.indexOf("            const hour=value('swal-time-hour')"),src.indexOf('            const caseId=returning()'));
function time(h,m,p){const values={'swal-time-hour':h,'swal-time-minute':m,'swal-time-period':p};return vm.runInNewContext('(()=>{'+code+'return time;})()',{value:id=>values[id],formError:(id,msg)=>Object.assign(Error(msg),{field:id})});}
test('shared BHW and return-visit form requires full time with correct midnight/noon conversion',()=>{
 for(const args of [['','',''],['9','','AM'],['9','30',''],['0','30','AM'],['13','30','AM'],['9','60','AM']])assert.throws(()=>time(...args),/consultation time is required/);
 assert.equal(time('12','00','AM'),'00:00');assert.equal(time('12','00','PM'),'12:00');assert.equal(time('1','05','PM'),'13:05');
 assert(!src.includes('Consultation time <span class="hi-field-help">(optional)'));
});
