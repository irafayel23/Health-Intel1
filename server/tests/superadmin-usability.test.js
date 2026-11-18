const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const text={escape:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),auditDetails:event=>event.details||''};
function profile(values,{failure=false,role='superadmin'}={}){
 const messages=[],requests=[],dialogs=[];let cleared=false,redirect;
 const context={TextEncoder,HealthIntelText:text,document:{getElementById:id=>({value:values[id]||''})},
  HealthIntel:{apiOrigin:'http://localhost:3000',clearSession(){cleared=true;}},location:{replace:url=>redirect=url},
  fetch:async(url,options)=>{requests.push({url,options});return {ok:!options||!failure,json:async()=>options?failure?{success:false,error:'Incorrect current password.'}:{success:true}:{user:{system_id:'QA-'+role.toUpperCase(),role}}};},
  Swal:{isLoading:()=>false,showValidationMessage:message=>messages.push(message),fire:async options=>{dialogs.push(options);if(!options.preConfirm)return {};const value=await options.preConfirm();return {isConfirmed:!!value,value};}}};
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'assets/js/shared/account-settings.js'),'utf8'),context);
 return {context,messages,requests,dialogs,cleared:()=>cleared,redirect:()=>redirect};
}
const valid={'account-current-password':'Old-QA-password','account-new-password':'New-QA-password','account-confirm-password':'New-QA-password'};
test('all four profiles require confirmation and send only current/new password',async()=>{
 for(const role of ['bhw','mho','admin','superadmin']){
  const p=profile(valid,{role});await p.context.HealthIntelAccount.open();
  assert.equal(p.requests.length,2);assert.match(p.dialogs[0].html,/Confirm new password/);
  const dialog=p.dialogs[0];assert.equal(dialog.customClass.popup,'hi-account-dialog');
  assert.equal(dialog.showCloseButton,true);assert.equal(dialog.returnFocus,true);
  assert.equal(dialog.reverseButtons,true);assert.equal(dialog.focusConfirm,false);
  assert.match(dialog.html,new RegExp('QA-'+role.toUpperCase()));
  assert.match(dialog.html,new RegExp(({bhw:'Barangay Health Worker',mho:'Municipal Health Officer',admin:'Admin',superadmin:'Superadmin'})[role]));
  for(const id of Object.keys(valid))assert.match(dialog.html,new RegExp('label for="'+id+'"'));
  assert.deepEqual(JSON.parse(p.requests[1].options.body),{current_password:valid['account-current-password'],new_password:valid['account-new-password']});
  assert.equal(p.cleared(),false);assert.equal(p.redirect(),undefined);assert.equal(p.dialogs.at(-1).title,'Password updated');
 }
});
test('empty, mismatched, short and oversized passwords never submit',async()=>{
 for(const values of [{},{...valid,'account-confirm-password':'Different'},{...valid,'account-new-password':'short','account-confirm-password':'short'},{...valid,'account-new-password':'😀'.repeat(20),'account-confirm-password':'😀'.repeat(20)}]){
  const p=profile(values);await p.context.HealthIntelAccount.open();
  assert.equal(p.requests.length,1);assert.equal(p.messages.length,1);assert.equal(p.cleared(),false);assert.equal(p.redirect(),undefined);
 }
});
test('incorrect current password keeps the dialog open and shows the server error',async()=>{
 const p=profile(valid,{failure:true});await p.context.HealthIntelAccount.open();
 assert.equal(p.messages[0],'Incorrect current password.');assert.equal(p.cleared(),false);assert.equal(p.redirect(),undefined);
});
function directory(){
 const elements={'admin-search':{value:''},'admin-status-filter':{value:''},'admin-list-status':{},'user-table-body':{},'admin-pending-count':{},'admin-account-pager':{},'admin-role-filter':{value:''}};
 const content={innerHTML:'',contains:()=>true,querySelector:()=>({focus(){}}),scrollIntoView(){},addEventListener:(name,fn)=>content[name]=fn};
 const context={Intl,Date,Number,Set,escapeText:text.escape,HealthIntelText:text,ledgerPayload:()=>({}),
  document:{getElementById:id=>elements[id]},fetch:async()=>({ok:true,json:async()=>context.response}),
  Swal:{getHtmlContainer:()=>({querySelector:()=>content}),fire:async options=>{context.dialog=options;content.innerHTML=options.html;options.didOpen?.();}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'assets/js/superadmin/superadmin-users.js'),'utf8'),context);
 return {context,elements,content};
}
test('history pages keep all events, display numbered navigation and obey boundaries',async()=>{
 const p=directory();p.context.response={success:true,data:{account:{system_id:'QA-ADMIN',first_name:'<unsafe>'},events:Array.from({length:17},(_,i)=>({action:'Event '+i,details:'<detail>'+i})),has_more:true}};
 await p.context.viewAdminAccount('QA-ADMIN');assert.match(p.content.innerHTML,/hi-history-pagination[\s\S]*Page 1 of 4[\s\S]*hi-related-pages/);assert.match(p.content.innerHTML,/Event 4/);assert.doesNotMatch(p.content.innerHTML,/Event 5/);
 assert.match(p.content.innerHTML,/&lt;unsafe&gt;/);assert.match(p.content.innerHTML,/latest 100/);
 const click=number=>p.content.click({target:{closest:()=>({dataset:{historyPage:String(number)},disabled:false})}});
 click(2);assert.match(p.content.innerHTML,/Page 2 of 4/);assert.match(p.content.innerHTML,/Event 5/);assert.doesNotMatch(p.content.innerHTML,/Event 0/);
 click(4);assert.match(p.content.innerHTML,/Event 16/);assert.match(p.content.innerHTML,/Page 4 of 4/);
 const before=p.content.innerHTML;click(5);assert.equal(p.content.innerHTML,before);
 assert.deepEqual(Array.from(p.context.historyPageNumbers(10,20)),[1,null,9,10,11,null,20]);
});
test('account rows open details with click or Enter and exclude status controls',async()=>{
 const p=directory();p.context.response={success:true,data:[{system_id:'QA-ADMIN',role:'admin',status:'suspended',first_name:'Tester'}]};
 await p.context.loadAdmins();const html=p.elements['user-table-body'].innerHTML;
 assert.match(html,/tabindex="0"/);assert.match(html,/openAdminRow/);assert.match(html,/hi-admin-access-hint/);assert.doesNotMatch(html,/toggleAdminStatus|In account details|title="Open account details"/);
 let opened=0;p.context.viewAdminAccount=async()=>opened++;
 const row={closest:()=>null};const target={closest:()=>null};
 await p.context.openAdminRow({type:'click',target,currentTarget:row},'QA-ADMIN');
 await p.context.openAdminRow({type:'keydown',key:'Enter',target:row,currentTarget:row,preventDefault(){}},'QA-ADMIN');
 await p.context.openAdminRow({type:'keydown',key:' ',target:row,currentTarget:row,preventDefault(){}},'QA-ADMIN');
 p.context.openAdminRow({type:'click',target:{closest:()=>({})}},'QA-ADMIN');
 p.context.openAdminRow({type:'keydown',key:'ArrowDown',target:row,currentTarget:row},'QA-ADMIN');
 assert.equal(opened,3);
});
test('profile buttons and icon refresh retain accessible names and existing hooks',()=>{
 for(const role of ['admin','superadmin']){
  const html=fs.readFileSync(path.join(root,role+'.html'),'utf8');assert.match(html,/id="account-profile"/);assert.match(html,/account-settings.js/);
 }
 const html=fs.readFileSync(path.join(root,'superadmin.html'),'utf8');assert.match(html,/id="overview-refresh" aria-label="Refresh overview"/);
 assert(html.indexOf('id="theme-toggle-btn"') < html.indexOf('id="overview-account-id"'));
 assert(html.indexOf('id="overview-account-id"') < html.indexOf('id="account-profile"'));
});


test('all portals load the shared account dialog before their profile callers',()=>{
 for(const role of ['bhw','mho','admin','superadmin']){
  const html=fs.readFileSync(path.join(root,role+'.html'),'utf8');
  assert.equal((html.match(/shared\/account-settings.js/g)||[]).length,1);
  assert.equal((html.match(/shared\/account-settings.css/g)||[]).length,1);
  if(['bhw','mho'].includes(role)){
   const script='assets/js/'+role+'/'+(role==='bhw'?'bhw-dialogs.js':'mho-account.js');
   assert(html.indexOf('shared/account-settings.js')<html.indexOf(script));
   const js=fs.readFileSync(path.join(root,script),'utf8');
   assert.match(js,/function showAccountSettings\(\) \{\s*return window.HealthIntelAccount.open\(\);\s*\}/);
   assert.doesNotMatch(js,/id="current-pass"|id="new-pass"/);
  }
 }
});
test('account errors never submit a password if the session cannot be loaded',async()=>{
 const p=profile(valid);p.context.fetch=async()=>({ok:false,json:async()=>({error:'Sign in required.'})});
 await p.context.HealthIntelAccount.open();assert.equal(p.dialogs[0].title,'Account unavailable');
 assert.equal(p.cleared(),false);assert.equal(p.redirect(),undefined);
});
test('opening profile focuses the current password and loading blocks dismissal',async()=>{
 const p=profile(valid);let focused=false;
 p.context.document.getElementById=id=>({value:valid[id],focus(){focused=true;}});
 await p.context.HealthIntelAccount.open();const dialog=p.dialogs[0];dialog.didOpen();
 assert.equal(focused,true);assert.equal(dialog.allowEscapeKey(),true);
 p.context.Swal.isLoading=()=>true;assert.equal(dialog.allowEscapeKey(),false);assert.equal(dialog.allowOutsideClick(),false);
});
