const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const settle=()=>new Promise(r=>setImmediate(r));
function loginPage(results,answers=[]){
 const events={},calls=[],dialogs=[],storage=new Map(),fields={login_id:{value:'session-bhw'},login_password:{value:'Disposable-only-password'},remember_me:{checked:false}},submit={disabled:false};
 const form={addEventListener:(type,fn)=>events[type]=fn,querySelector:()=>submit};
 fields['login-form']=form;
 const sandbox={document:{getElementById:id=>fields[id]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  window:{location:{href:'index.html'}},fetch:async(url,options)=>{calls.push({url,options,body:JSON.parse(options.body)});const value=results.shift();if(value instanceof Error)throw value;return {json:async()=>value};},
  Swal:{fire:async options=>{dialogs.push(options);const answer=answers.shift();return typeof answer==='function'?answer():answer||{};}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/index/index-login.js'),'utf8'),sandbox);
 return {events,calls,dialogs,storage,fields,submit,sandbox,submitForm:()=>events.submit({preventDefault(){}})};
}
test('Cancel leaves the existing account session untouched and sends no takeover',async()=>{
 const p=loginPage([{success:false,code:'SESSION_CONFLICT',error:'Another session exists.',takeover_token:'fixture-challenge'}],[{isConfirmed:false}]);p.storage.set('health_intel_token','old-browser-token');
 await p.submitForm();assert.equal(p.calls.length,1);assert.equal(p.storage.get('health_intel_token'),'old-browser-token');assert.equal(p.fields.login_password.value,'');
 assert.equal(p.dialogs[0].focusCancel,true);assert.equal(p.dialogs[0].allowOutsideClick,false);assert.equal(p.submit.disabled,false);assert.equal(p.sandbox.window.location.href,'index.html');
});
test('only an explicit confirmation submits the bound challenge and installs the accepted login',async()=>{
 const p=loginPage([{code:'SESSION_CONFLICT',error:'Unsaved entries may be lost.',takeover_token:'fixture-challenge'},
  {success:true,token:'new-fixture-token',system_id:'SESSION-BHW',redirect:'/bhw.html'}],[{isConfirmed:true},{}]);
 await p.submitForm();assert.equal(p.calls.length,2);assert.equal(p.calls[1].body.replace_existing,true);assert.equal(p.calls[1].body.takeover_token,'fixture-challenge');
 assert.equal(p.storage.get('active_user_id'),'SESSION-BHW');assert.equal(p.storage.get('health_intel_token'),'new-fixture-token');assert.equal(p.sandbox.window.location.href,'/bhw.html');
 assert.ok(!Array.from(p.storage.values()).includes('Disposable-only-password'));assert.ok(!Array.from(p.storage.values()).includes('fixture-challenge'));
});
test('a changed competing session needs a fresh sign-in; no automatic repeated takeover',async()=>{
 const p=loginPage([{code:'SESSION_CONFLICT',takeover_token:'old-fixture'},{code:'SESSION_CONFLICT',takeover_token:'new-fixture'}],[{isConfirmed:true},{}]);
 await p.submitForm();assert.equal(p.calls.length,2);assert.equal(p.storage.has('health_intel_token'),false);assert.match(p.dialogs.at(-1).text,/changed/);
});
test('duplicate submissions while a warning is open do not issue a second request',async()=>{
 let release;const pending=new Promise(r=>release=r);const p=loginPage([{code:'SESSION_CONFLICT',takeover_token:'fixture'}],[()=>pending]);
 const first=p.submitForm();await settle();assert.equal(p.submit.disabled,true);await p.submitForm();assert.equal(p.calls.length,1);release({isConfirmed:false});await first;assert.equal(p.submit.disabled,false);
});
test('a newer login in another tab is never overwritten by a delayed login response',async()=>{
 const p=loginPage([{code:'SESSION_CONFLICT',takeover_token:'fixture'},{success:true,token:'late-fixture',system_id:'SESSION-BHW',redirect:'/bhw.html'}],
 [()=>{p.storage.set('health_intel_token','newer-fixture');return {isConfirmed:true};},{}]);
 await p.submitForm();assert.equal(p.storage.get('health_intel_token'),'newer-fixture');assert.equal(p.sandbox.window.location.href,'index.html');assert.match(p.dialogs.at(-1).title,/another tab/);
});

function portal(role='bhw'){
 const storage=new Map([['health_intel_token','original-fixture'],['active_user_id','SESSION-'+role.toUpperCase()]]),events={},docEvents={},calls=[],timers=[];
 const node=tag=>({tag,children:[],textContent:'',className:'',append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},setAttribute(){},addEventListener(type,fn){this[type]=fn;},focus(){this.focused=true;}});
 const body=node('body');body.append({...node('main'),textContent:'Private synthetic fixture form'});
 let responder=async()=>new Response(JSON.stringify({user:{system_id:'SESSION-'+role.toUpperCase(),role}}),{status:200});
 const document={body,hidden:false,createElement:node,querySelectorAll:()=>[],addEventListener:(type,fn)=>{(docEvents[type]||=[]).push(fn);}};
 const sandbox={URL,Headers,Request,Error,AbortController,setTimeout,clearTimeout,console:{error(){}},document,
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 window:{location:{href:'http://localhost:3000/'+role+'.html',pathname:'/'+role+'.html',replace:()=>{}},
 fetch:async(input,options)=>{calls.push({input,options});return responder(input,options);},addEventListener:(type,fn)=>events[type]=fn,
 setInterval:(fn,ms)=>{timers.push({fn,ms});return 1;},clearInterval(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/shared/api-session.js'),'utf8'),sandbox);
 return {storage,events,docEvents,calls,timers,body,sandbox,setResponse:fn=>responder=fn,locked:()=>JSON.stringify(body).includes('ACCOUNT SECURITY')};
}
for(const role of ['bhw','mho','admin','superadmin'])test(role+': another-tab sign-in hides the form, preserves newer credentials and blocks POST',async()=>{
 const p=portal(role);await settle();p.storage.set('health_intel_token','newer-fixture');p.events.storage({key:'health_intel_token',newValue:'newer-fixture'});
 assert.equal(p.locked(),true);assert.equal(p.storage.get('health_intel_token'),'newer-fixture');const before=p.calls.length;
 await assert.rejects(p.sandbox.window.fetch('http://localhost:3000/api/patients',{method:'POST',body:'{}'}),/ended/);assert.equal(p.calls.length,before);
});
test('remote revocation check clears only this session and removes the unfinished form',async()=>{
 const p=portal();await settle();p.setResponse(async()=>new Response(JSON.stringify({code:'SESSION_REPLACED',error:'Ended'}),{status:401}));
 await p.sandbox.window.HealthIntel.checkSession();assert.equal(p.locked(),true);assert.equal(p.storage.has('health_intel_token'),false);assert.equal(p.timers[0].ms,30000);
});
test('same-token tabs and network/database errors do not falsely end the session',async()=>{
 const p=portal();await settle();p.events.storage({key:'health_intel_token',newValue:'original-fixture'});assert.equal(p.locked(),false);
 p.setResponse(async()=>{throw Error('Network offline');});await p.sandbox.window.HealthIntel.checkSession();assert.equal(p.locked(),false);
 p.setResponse(async()=>new Response(JSON.stringify({code:'ACCESS_UNAVAILABLE',error:'Unavailable'}),{status:503}));await p.sandbox.window.HealthIntel.checkSession();assert.equal(p.locked(),false);assert.equal(p.storage.get('health_intel_token'),'original-fixture');
});
test('an old in-flight read response cannot expose records after a new tab signs in',async()=>{
 const p=portal();await settle();let release;p.setResponse(()=>new Promise(r=>release=r));
 const pending=p.sandbox.window.fetch('http://localhost:3000/api/patients');p.storage.set('health_intel_token','newer-fixture');
 release(new Response(JSON.stringify({patients:['Synthetic fixture only']}),{status:200}));await assert.rejects(pending,/ended/);assert.equal(p.locked(),true);assert.equal(p.storage.get('health_intel_token'),'newer-fixture');
});
test('focus/visibility checks detect revocation while background timers may be delayed',async()=>{
 const p=portal();await settle();p.setResponse(async()=>new Response(JSON.stringify({code:'SESSION_INVALID',error:'Expired'}),{status:401}));
 await p.events.focus();assert.equal(p.locked(),true);assert.equal(p.storage.has('active_user_id'),false);
});

test('old tab sign-out cannot revoke the newer tab session',async()=>{
 const p=portal();await settle();p.storage.set('health_intel_token','newer-fixture');const before=p.calls.length;
 await assert.rejects(p.sandbox.window.HealthIntel.logout(),/ended/);assert.equal(p.calls.length,before);assert.equal(p.storage.get('health_intel_token'),'newer-fixture');assert.equal(p.locked(),true);
});

test('Guided session screen explains recovery, focuses sign-in and removes patient DOM for every role',async()=>{
 for(const role of ['bhw','mho','admin','superadmin']){
  const p=portal(role);await settle();p.storage.set('health_intel_token','newer-fixture');p.events.storage({key:'health_intel_token'});
  const nodes=[];const visit=n=>{nodes.push(n);(n.children||[]).forEach(visit);};visit(p.body);
  const text=nodes.map(n=>n.textContent).join(' ');
  assert.match(text,/Sign-in changed in this browser/);assert.match(text,/Unsaved entries are not stored/);
  assert.match(text,/submission already sent may have completed/);assert.match(text,/Check recent records first/);
  assert.ok(!text.includes('Private synthetic fixture form'));
  const buttons=nodes.filter(n=>n.tag==='button');assert.equal(buttons.length,1);assert.equal(buttons[0].focused,true);
  assert.equal(buttons[0].textContent,'Return to sign in');
  let destination;p.sandbox.window.location.replace=url=>destination=url;buttons[0].click();assert.equal(destination,'index.html');
  assert.ok(nodes.some(n=>n.tag==='img'&&n.src==='assets/img/Health-Intel-Symbol.png'));assert.match(text,/Patient information is hidden and further saves are blocked/);
 }
});

test('takeover confirmation is red and cancel remains the default',async()=>{
 const p=loginPage([{code:'SESSION_CONFLICT',takeover_token:'fixture'}],[{isConfirmed:false}]);await p.submitForm();
 assert.equal(p.dialogs[0].confirmButtonColor,'#b91c1c');assert.equal(p.dialogs[0].focusCancel,true);
});
test('remote replacement reason is explicit, while expiry and generic revocation never claim another sign-in',async()=>{
 for(const [code,reason,expected] of [['SESSION_REPLACED','OTHER_SIGN_IN','Signed in elsewhere'],['SESSION_REPLACED',undefined,'Please sign in again'],['SESSION_INVALID',undefined,'Please sign in again']]){
  const p=portal();await settle();p.setResponse(async()=>new Response(JSON.stringify({code,reason,error:'Ended'}),{status:401}));await p.sandbox.window.HealthIntel.checkSession();
  const text=JSON.stringify(p.body);assert.ok(text.includes(expected));if(!reason)assert.ok(!text.includes('Signed in elsewhere'));assert.equal(p.storage.has('health_intel_token'),false);
 }
});


test('different browser accounts keep independent session checks',async()=>{
 const bhw=portal('bhw'),admin=portal('admin');await settle();
 await admin.sandbox.window.HealthIntel.checkSession();await bhw.sandbox.window.HealthIntel.checkSession();
 assert.equal(bhw.locked(),false);assert.equal(admin.locked(),false);
 assert.equal(bhw.storage.get('active_user_id'),'SESSION-BHW');
 assert.equal(admin.storage.get('active_user_id'),'SESSION-ADMIN');
});
test('a different account in a shared tab has accurate messaging and preserves the newer login',async()=>{
 const p=portal('bhw');await settle();
 p.storage.set('active_user_id','SESSION-ADMIN');p.storage.set('health_intel_token','admin-fixture');
 p.events.storage({key:'health_intel_token'});
 const text=JSON.stringify(p.body);
 assert.match(text,/Sign-in changed in this browser/);assert.match(text,/Another tab changed the account/);
 assert.ok(!text.includes('this account was signed in from another'));
 assert.equal(p.storage.get('active_user_id'),'SESSION-ADMIN');
 await assert.rejects(p.sandbox.window.fetch('http://localhost:3000/api/patients',{method:'POST'}),/ended/);
});


test('MHO, Admin and BHW logout links sign out without confirmation',async()=>{
 for(const role of ['bhw','mho','admin']){
  const p=portal(role);await settle();let click,redirect,dialogs=0;
  p.sandbox.document.querySelectorAll=()=>[{addEventListener:(event,fn)=>click=fn}];
  p.sandbox.window.location.replace=url=>redirect=url;
  p.sandbox.window.Swal={fire:()=>dialogs++};
  p.docEvents.DOMContentLoaded.forEach(fn=>fn());
  p.setResponse(async()=>new Response('{}',{status:200}));
  await click({preventDefault(){}});
  assert.equal(redirect,'index.html');assert.equal(dialogs,0);
  assert.equal(p.storage.has('health_intel_token'),false);
  assert.ok(p.calls.some(c=>c.input.endsWith('/api/logout')&&c.options.method==='POST'));
 }
});
test('Superadmin logout is direct and a failed request retains error feedback',async()=>{
 const source=fs.readFileSync(path.join(root,'assets/js/superadmin/superadmin-shell.js'),'utf8');
 let revoked=0,dialogs=0;
 const context={HealthIntel:{logout:async()=>revoked++},window:{location:{},addEventListener(){}},Swal:{fire:()=>dialogs++}};
 vm.createContext(context);vm.runInContext(source,context);
 await vm.runInContext('logout()',context);
 assert.equal(revoked,1);assert.equal(dialogs,0);assert.equal(context.window.location.href,'index.html');
 context.window.location.href='superadmin.html';context.HealthIntel.logout=async()=>{throw Error('Offline');};
 await vm.runInContext('logout()',context);
 assert.equal(dialogs,1);assert.equal(context.window.location.href,'superadmin.html');
});
test('all roles share blue logout with red hover and keyboard focus',()=>{
 for(const role of ['bhw','mho','admin','superadmin']){
  const html=fs.readFileSync(path.join(root,role+'.html'),'utf8');
  assert.ok(html.includes('nav-item sign-out'));
  assert.ok(html.includes('portal-responsive.css?v=20261107-logout-hover'));
 }
 const css=fs.readFileSync(path.join(root,'assets/css/shared/portal-responsive.css'),'utf8');
 assert.ok(css.includes('background-color: rgb(239 68 68 / 10%);'));
 assert.ok(css.includes('color: #b91c1c;'));
 assert.match(css,/html:not\(\.dark\)[^{]+\.nav-item\.sign-out \{[^}]+color: #1d4ed8;/);
 assert.match(css,/\.nav-item\.sign-out:is\(:hover, :focus-visible\) \{[^}]+color: #b91c1c;/);
});


test('password renewal keeps this page active and discards an old in-flight failure',async()=>{
 const p=portal('superadmin');await settle();let release;
 p.setResponse((input)=>String(input).endsWith('/change-password')?new Response(JSON.stringify({success:true,token:'renewed-fixture'}),{status:200}):new Promise(resolve=>release=resolve));
 const old=p.sandbox.window.fetch('http://localhost:3000/api/session');
 await p.sandbox.window.fetch('http://localhost:3000/api/change-password',{method:'POST'});
 assert.equal(p.storage.get('health_intel_token'),'renewed-fixture');assert.equal(p.locked(),false);
 release(new Response(JSON.stringify({code:'SESSION_INVALID'}),{status:401}));await assert.rejects(old,/older session response/);assert.equal(p.locked(),false);
 p.setResponse(()=>new Response(JSON.stringify({user:{system_id:'QA',role:'superadmin'}}),{status:200}));await p.sandbox.window.HealthIntel.checkSession();assert.equal(p.locked(),false);
});
test('password renewal cannot overwrite a newer sign-in while reading its response',async()=>{
 const p=portal('superadmin');await settle();
 p.setResponse(()=>({ok:true,clone:()=>({json:async()=>{p.storage.set('health_intel_token','newer-tab-fixture');return {success:true,token:'late-renewal'};}})}));
 await assert.rejects(p.sandbox.window.fetch('http://localhost:3000/api/change-password',{method:'POST'}),/Sign-in changed/);
 assert.equal(p.storage.get('health_intel_token'),'newer-tab-fixture');assert.equal(p.locked(),true);
});
