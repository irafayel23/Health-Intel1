const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'assets/js/shared/portal-history.js'),'utf8');
function page(role,hash='') {
 const html=fs.readFileSync(path.join(root,role+'.html'),'utf8'),sections=[],events={};
 const buttons=[];
 for(const [,attrs]of html.matchAll(/<button\b([^>]*)>/g)){
  const attr=name=>new RegExp('(?:^|\\s)'+name+'="([^"]*)"').exec(attrs)?.[1]||'';
  const classes=new Set(attr('class').split(/\s+/));if(!classes.has('nav-item')||classes.has('sign-out'))continue;
  const target=attr('data-target')||/^switchMainView\('([a-z0-9-]+)',/.exec(attr('onclick'))?.[1];
  if(!target||!html.includes('id="'+target+'"'))continue;
  const handlers=[],button={id:attr('id'),dataset:{target:attr('data-target')},getAttribute:attr,classList:{contains:key=>classes.has(key),toggle(key,on){if(on)classes.add(key);else classes.delete(key);}},addEventListener:(name,fn)=>handlers.push(fn)};
  button.click=()=>{for(const [,other]of sections)other.classList.toggle('active',other===button);for(const fn of handlers)fn();};
  sections.push([target,button]);buttons.push(button);
 }
 const w={location:new URL('http://localhost:3000/'+role+'.html'+hash),addEventListener:(name,fn)=>(events[name]||=[]).push(fn)};
 const entries=[w.location.href];let index=0;
 const navigate=target=>{if(target<0||target>=entries.length)return;index=target;w.location=new URL(entries[index]);for(const fn of events.popstate||[])fn();};
 w.history={get length(){return entries.length;},pushState(state,title,url){entries.splice(++index);entries.push(new URL(url,w.location).href);w.location=new URL(entries[index]);},replaceState(state,title,url){entries[index]=new URL(url,w.location).href;w.location=new URL(entries[index]);},back:()=>navigate(index-1),forward:()=>navigate(index+1)};
 w.switchMainView=view=>{for(const [id,button]of sections)button.classList.toggle('active',id===view);return 'view-switched';};
 const document={readyState:'complete',querySelector:()=>({querySelectorAll:()=>buttons}),getElementById:id=>html.includes('id="'+id+'"')?{}:null};
 vm.runInNewContext(source,{window:w,document});return {w,sections,close(){}};
}
for(const role of ['bhw','mho','admin','superadmin'])test(role+': browser Back/Forward and reload restore allowlisted sections',async()=>{
 const p=page(role);try{
 const first=p.sections.find(([,b])=>b.classList.contains('active'))[0],next=p.sections.find(([id])=>id!==first);
 next[1].click();assert.equal(p.w.location.hash,'#'+next[0]);const length=p.w.history.length;
 next[1].click();assert.equal(p.w.history.length,length);
 let popped=new Promise(resolve=>p.w.addEventListener('popstate',resolve,{once:true}));p.w.history.back();await popped;
 assert.equal(p.w.location.hash,'#'+first);assert(p.sections.find(([id])=>id===first)[1].classList.contains('active'));
 popped=new Promise(resolve=>p.w.addEventListener('popstate',resolve,{once:true}));p.w.history.forward();await popped;
 assert(next[1].classList.contains('active'));
 const reloaded=page(role,p.w.location.hash);try{assert(reloaded.sections.find(([id])=>id===next[0])[1].classList.contains('active'));}finally{reloaded.close();}
 assert.equal(p.w.location.pathname,'/'+role+'.html');
 }finally{p.close();}
});
test('unrecognized hashes cannot select logout or arbitrary content',()=>{
 const p=page('admin','#logout');try{assert.notEqual(p.w.location.hash,'#logout');assert.equal(p.w.history.length,1);}finally{p.close();}
});

test('programmatic overview shortcuts record one section entry',()=>{
 const p=page('admin');try{const next=p.sections.find(([id])=>id==='view-data');const length=p.w.history.length;assert.equal(p.w.switchMainView(next[0],next[1].id),'view-switched');assert.equal(p.w.location.hash,'#view-data');assert.equal(p.w.history.length,length+1);p.w.switchMainView(next[0],next[1].id);assert.equal(p.w.history.length,length+1);}finally{p.close();}
});
