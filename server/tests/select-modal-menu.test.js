const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../assets/js/shared/encoding-controls.js'),'utf8');
const open=source.slice(source.indexOf('        function open()'),source.indexOf('        function keys('));
test('a select menu is relocated inside the active modal and is not inert',()=>{
 for(const inModal of [true,false]){
  const attrs={},menu={hidden:true,inert:true,parentElement:null},body={append:n=>{n.parentElement=body;}},modal={append:n=>{n.parentElement=modal;}};
  const c={select:{disabled:false,closest:()=>inModal?modal:null},document:{body},menu,search:{value:'old',focus(){}},browseAll:true,render(){},position(){},button:{setAttribute:(k,v)=>attrs[k]=v},setActive(){},options:[]};
  vm.runInNewContext(open+';open()',c);
  assert.equal(menu.parentElement,inModal?modal:body);assert.equal(menu.inert,false);assert.equal(menu.hidden,false);assert.equal(attrs['aria-expanded'],'true');assert.equal(c.search.value,'');
 }
});
test('dropdown uses a scalable chevron and a scrollable touch-friendly list',()=>{
 assert(source.includes("createElementNS('http://www.w3.org/2000/svg','svg')"));assert(!source.includes("arrow.textContent='⌄'"));
 const css=fs.readFileSync(path.join(__dirname,'../../assets/css/shared/encoding-controls.css'),'utf8');
 assert(css.includes('flex:1 1 auto;overscroll-behavior:contain;touch-action:pan-y'));
 assert(css.includes('.hi-select-arrow svg {width:18px;height:18px;}'));
});
