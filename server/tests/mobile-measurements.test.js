const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function form(prefix){
 const fields=new Map();
 function element(){return {value:'',handlers:{},children:[],setAttribute(){},append(...nodes){this.children.push(...nodes);},after(node){this.next=node;},remove(){},addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);},emit(name){for(const fn of this.handlers[name]||[])fn({inputType:'insertText',data:'',preventDefault(){}});}};}
 for(const [name,value] of [['bp',''],['temperature','36.5'],['height','165'],['weight','60']])fields.set(prefix+'-'+name,{...element(),id:prefix+'-'+name,value});
 const document={getElementById:id=>fields.get(id),querySelector:()=>null,createElement(){const node=element();Object.defineProperty(node,'id',{set(id){this._id=id;fields.set(id,this);},get(){return this._id;}});return node;}};
 const context={document,AbortController,HealthIntelEncoding:{escape:String}};context.window=context;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/js/shared/patient-visits.js'),'utf8'),context);
 const control=context.HealthIntelVisits.bindBloodPressure(prefix);
 return {field:name=>fields.get(prefix+'-'+name),control,validate:()=>context.HealthIntelVisits.validateMeasurements(prefix)};
}
for(const prefix of ['swal','walkin']){
 test(prefix+' blood pressure uses independent numeric fields and preserves the API value',()=>{
  const f=form(prefix);assert.equal(f.field('bp').type,'hidden');
  assert.equal(f.field('bp-systolic').inputMode,'numeric');assert.equal(f.field('bp-diastolic').inputMode,'numeric');
  f.field('bp-systolic').value='120';f.field('bp-systolic').emit('input');
  assert.throws(f.validate,error=>error.field===prefix+'-bp-diastolic');
  f.field('bp-diastolic').value='80';f.field('bp-diastolic').emit('input');f.validate();assert.equal(f.field('bp').value,'120/80');
  f.field('bp-systolic').value='12090';assert.throws(f.validate,error=>error.field===prefix+'-bp-systolic');
  f.field('bp-systolic').value='0';assert.throws(f.validate);
  f.field('bp-systolic').value='120';f.field('bp-diastolic').value='8x';assert.throws(f.validate);
  f.control.destroy();
 });
 test(prefix+' clearing or resetting pressure does not reuse the previous consultation',()=>{
  const f=form(prefix);f.field('bp').value='130/90';f.field('bp').emit('change');
  assert.equal(f.field('bp-systolic').value,'130');assert.equal(f.field('bp-diastolic').value,'90');
  f.field('bp-systolic').value='';f.field('bp-diastolic').value='';
  assert.throws(f.validate);assert.equal(f.field('bp').value,'');f.control.destroy();
 });
}
