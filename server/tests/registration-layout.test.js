const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../..');
test('registration keeps requested field order, unique hooks and photo guidance',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  let previous=-1;
  for(const id of ['reg_emp_id','reg_employee_photo','reg_selfie_photo','reg_password','reg_confirm_password']){
    const token='id="'+id+'"',position=html.indexOf(token);
    assert(position>previous,id+' order');
    assert.equal(html.split(token).length-1,1,id+' unique');previous=position;
    assert(html.includes('for="'+id+'"'),id+' visible label');
  }
  for(const id of ['reg_password','reg_confirm_password']){
    assert(new RegExp('data-registration-password="'+id+'"[^>]*><svg').test(html));
    assert(html.includes('aria-controls="'+id+'"'));
  }
});
test('each eye independently toggles password visibility and accessible state without removing SVG',()=>{
  const source=fs.readFileSync(path.join(root,'assets/js/index/index-registration.js'),'utf8');
  const handler=source.slice(source.indexOf("document.querySelectorAll('[data-registration-password]')"),source.indexOf("document.querySelectorAll('[data-registration-camera]')"));
  const inputs={reg_password:{id:'reg_password',type:'password'},reg_confirm_password:{id:'reg_confirm_password',type:'password'}};
  const buttons=Object.keys(inputs).map(id=>({dataset:{registrationPassword:id},textContent:'svg-sentinel',attrs:{},addEventListener(event,fn){assert.equal(event,'click');this.click=fn;},setAttribute(k,v){this.attrs[k]=v;}}));
  vm.runInNewContext(handler,{document:{querySelectorAll:()=>buttons,getElementById:id=>inputs[id]}});
  for(const button of buttons){
    const input=inputs[button.dataset.registrationPassword];button.click();
    assert.equal(input.type,'text');assert.equal(button.attrs['aria-pressed'],'true');assert.match(button.attrs['aria-label'],/^Hide /);
    assert.equal(button.textContent,'svg-sentinel');button.click();assert.equal(input.type,'password');assert.equal(button.attrs['aria-pressed'],'false');assert.match(button.attrs['aria-label'],/^Show /);
  }
});

test('actual registration submit sends matching confirmation and consent, and blocks mismatches',async()=>{
  const source=fs.readFileSync(path.join(root,'assets/js/index/index-registration.js'),'utf8');
  const nodes=new Map(),requests=[],alerts=[];
  function node(id){if(!nodes.has(id))nodes.set(id,{value:'fixture',checked:true,style:{},addEventListener(event,fn){this[event]=fn;}});return nodes.get(id);}
  node('reg_password').value='QA-only-password';node('reg_confirm_password').value='QA-only-password';
  const context=vm.createContext({document:{getElementById:node,querySelectorAll:()=>[]},auth:{currentUser:{email:'review@example.invalid',getIdToken:async()=> 'fixture-token'}},Swal:{fire:options=>{alerts.push(options);}},fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {json:async()=>({success:false,error:'Fixture stops before persistence'})};}});
  vm.runInContext(source+";userEmail='review@example.invalid';registrationPhotoData=async()=> 'fixture-photo';",context);
  await node('profile-screen').submit({preventDefault(){}});
  assert.equal(requests.length,1);assert(requests[0].url.endsWith('/api/register'));
  const body=requests[0].body;assert.equal(body.confirm_password,body.password);assert.equal(body.review_consent,true);assert.equal(body.firebase_id_token,'fixture-token');assert.equal(body.selfie_photo,'fixture-photo');
  node('reg_confirm_password').value='different';
  await node('profile-screen').submit({preventDefault(){}});
  assert.equal(requests.length,1);assert.equal(alerts.at(-1).title,'Passwords do not match');
  const checkEmail=source.slice(source.indexOf('const checkRes ='),source.indexOf('const checkData ='));
  assert(!checkEmail.includes('confirm_password'));assert(!checkEmail.includes('review_consent'));
});

test('rejection dialog validates then saves once, keeping failed requests inside the form',async()=>{
 const source=fs.readFileSync(path.join(root,'assets/js/shared/registration-review.js'),'utf8');let options,validation,mode='success',dialogs=0;const requests=[];
 const values={'registration-denial-reason':{value:''},'registration-denial-note':{value:''},'registration-decision-notice':{dataset:{},hidden:true}};
 const c=vm.createContext({document:{getElementById:id=>values[id]},fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});if(mode==='network')throw Error('Offline');return {ok:mode==='success',json:async()=>mode==='success'?{success:true,message:'Registration declined. Notification email sent.',email_delivery:'sent'}:{success:false,error:'Submission changed. Reopen review.'}};},Swal:{fire:o=>{dialogs++;options=o;return o;},isLoading:()=>false,showValidationMessage:m=>validation=m}});vm.runInContext(source,c);await c.registrationDenial('QA','version-one');
 assert.equal(options.width,720);assert.equal(options.customClass.popup,'registration-denial-dialog');assert.equal(options.showLoaderOnConfirm,true);
 assert.equal(await options.preConfirm(),false);assert.match(validation,/Choose a reason/);
 values['registration-denial-reason'].value='9';assert.equal(await options.preConfirm(),false);assert.equal(requests.length,0);
 values['registration-denial-note'].value='Please upload a readable employee ID.';const result=await options.preConfirm();assert.equal(requests.length,1);assert.equal(requests[0].body.review_submission,'version-one');assert.equal(requests[0].body.system_id,'QA');assert.match(requests[0].body.reason,/Other/);
 const formOptions=options;c.registrationDecisionNotice(result);assert.equal(options.titleText,'Registration declined');assert.equal(options.text,result.message);assert.equal(options.icon,'success');assert.equal(dialogs,2);c.registrationDecisionNotice({...result,email_delivery:'failed'});assert.equal(options.icon,'warning');options=formOptions;
 for(const failure of ['server','network']){mode=failure;assert.equal(await options.preConfirm(),false);assert.match(validation,failure==='server'?/Submission changed/:/not been confirmed/);assert.equal(values['registration-denial-note'].value,'Please upload a readable employee ID.');}
});

test('submission badge and timeline show numeric count and escape rejection notes',()=>{
 const c=vm.createContext({Intl,Date});vm.runInContext(fs.readFileSync(path.join(root,'assets/js/shared/registration-review.js'),'utf8'),c);
 assert.match(c.registrationSubmissionBadge({submission_count:4}),/Resubmitted · Submission 4/);
 assert.equal(c.registrationSubmissionBadge({}), '');
 const html=c.registrationSubmissionHistory({submission_count:2,last_submitted_at:'2026-11-14T14:00:00Z',previous_rejection_reason:'<script>',registration_history:[]});
 assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));
});

test('Superadmin decline uses the shared decision and result feedback',async()=>{
 const c=vm.createContext({Swal:{fire:()=>{throw Error('Unexpected second popup');}}});
 vm.runInContext(fs.readFileSync(path.join(root,'assets/js/superadmin/superadmin-users.js'),'utf8'),c);
 let refreshed=0,notice,confirmed=true;
 c.registrationDenial=async(id,submission)=>{assert.equal(id,'QA-ADMIN');assert.equal(submission,'review-v2');return {isConfirmed:confirmed,value:{success:true,message:'Registration declined.',email_delivery:'failed'}};};
 c.loadAdmins=async()=>refreshed++;c.loadAuditLogs=async()=>refreshed++;c.registrationDecisionNotice=result=>notice=result;
 await c.toggleAdminStatus('QA-ADMIN','denied',{role:'admin',status:'pending',review_submission:'review-v2'});
 assert.equal(refreshed,2);assert.equal(notice.email_delivery,'failed');
 confirmed=false;await c.toggleAdminStatus('QA-ADMIN','denied',{role:'admin',status:'pending',review_submission:'review-v2'});assert.equal(refreshed,2);
});
