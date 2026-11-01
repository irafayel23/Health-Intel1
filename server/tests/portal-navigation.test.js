const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../assets/js/shared/portal-navigation.js'),'utf8');
function setup(id,mobile=false){
 const events={},mediaEvents={},windowEvents={};
 function element(text=''){
  const set=new Set(),attrs={},handlers={};
  return {id:'',textContent:text,children:[],style:{},hidden:false,disabled:false,inert:false,
   classList:{add:x=>set.add(x),contains:x=>set.has(x),toggle(x,on){if(on)set.add(x);else set.delete(x);}},
   setAttribute:(k,v)=>attrs[k]=String(v),getAttribute:k=>attrs[k]??null,removeAttribute:k=>delete attrs[k],
   addEventListener(k,f){(handlers[k]??=[]).push(f);},emit(k,e={}){for(const f of handlers[k]||[])f({target:this,preventDefault(){},...e});},
   append(...nodes){this.children.push(...nodes);},prepend(n){this.children.unshift(n);},focus(){doc.activeElement=this;this.emit('focus');},
   getBoundingClientRect:()=>({top:120,right:80}),getClientRects:()=>[{}],querySelectorAll:()=>[]};
 }
 const body=element(),sidebar=element(),brand=element(),main=element(),toggle=element(),nav=element('Patient Records');sidebar.id=id;
 const media={matches:mobile,addEventListener:(k,f)=>mediaEvents[k]=f};
 sidebar.querySelector=()=>({parentElement:brand});sidebar.querySelectorAll=()=>[nav];
 const doc={readyState:'complete',body,activeElement:null,createElement:()=>element(),addEventListener:(k,f)=>events[k]=f,querySelector:s=>s.startsWith('#sidebar,')?sidebar:s==='[data-portal-menu]'?toggle:s==='main'?main:null,querySelectorAll:()=>[]};
 const win={matchMedia:()=>media,innerHeight:844,addEventListener:(k,f)=>windowEvents[k]=f,dispatchEvent(){},toggleSidebar(){throw Error('Old portal-specific collapse must not execute');}};
 vm.runInNewContext(source,{document:doc,window:win,Event:class{constructor(type){this.type=type;}}});
 return {body,sidebar,brand,main,toggle,nav,doc,win,media,events,change(m){media.matches=m;mediaEvents.change();},desktop:brand.children[0],tooltip:body.children[0],close:sidebar.children[0]};
}
for(const [role,id]of [['BHW','sidebar'],['MHO','sidebar'],['Admin','main-sidebar'],['Superadmin','superadmin-sidebar']]){
 test(role+' desktop starts expanded, toggles on click, exposes accessible tooltips and retains focus',()=>{
  const a=setup(id);assert.equal(a.sidebar.classList.contains('hi-sidebar-collapsed'),false);assert.equal(a.desktop.getAttribute('aria-expanded'),'true');assert.equal(a.desktop.getAttribute('aria-label'),'Collapse sidebar');
  a.desktop.emit('click');assert.equal(a.sidebar.classList.contains('hi-sidebar-collapsed'),true);assert.equal(a.desktop.getAttribute('aria-label'),'Expand sidebar');assert.equal(a.desktop.getAttribute('aria-controls'),id);
  a.nav.emit('mouseenter');assert.equal(a.tooltip.hidden,false);assert.equal(a.tooltip.textContent,'Patient Records');assert.equal(a.nav.getAttribute('aria-label'),'Patient Records');
  a.nav.emit('mouseleave');assert.equal(a.tooltip.hidden,true);a.nav.focus();assert.equal(a.tooltip.hidden,false);a.events.keydown({key:'Escape'});assert.equal(a.tooltip.hidden,true);
  a.desktop.focus();a.desktop.emit('click');assert.equal(a.sidebar.classList.contains('hi-sidebar-collapsed'),false);assert.equal(a.doc.activeElement,a.desktop);assert.equal(a.desktop.getAttribute('aria-expanded'),'true');
 });
 test(role+' mobile drawer remains separate from desktop collapse with close/Escape and breakpoint recovery',()=>{
  const a=setup(id);a.desktop.emit('click');a.change(true);assert.equal(a.sidebar.classList.contains('hi-sidebar-collapsed'),false);assert.equal(a.sidebar.inert,true);
  a.win.toggleSidebar();assert.equal(a.sidebar.inert,false);assert.equal(a.main.inert,true);assert.equal(a.doc.activeElement,a.close);assert.equal(a.toggle.getAttribute('aria-expanded'),'true');
  a.events.keydown({key:'Escape',preventDefault(){}});assert.equal(a.sidebar.inert,true);assert.equal(a.main.inert,false);assert.equal(a.doc.activeElement,a.toggle);
  a.win.toggleSidebar();a.close.emit('click');assert.equal(a.toggle.getAttribute('aria-expanded'),'false');a.change(false);assert.equal(a.sidebar.classList.contains('hi-sidebar-collapsed'),true);assert.equal(a.main.inert,false);
 });
}
