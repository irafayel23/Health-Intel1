const {test}=require('node:test'),assert=require('node:assert/strict');
const {createFixture}=require('./helpers/directory-session-fixture');
test('password changes rotate all four role sessions atomically while old tokens stop working',async()=>{
 const f=await createFixture();
 const call=(path,token,body)=>fetch(f.base+'/api'+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  for(const [role,id] of Object.entries(f.users)){
   const login=await (await call('/login',null,{system_id:id,password:f.password})).json();assert.ok(login.token,role);
   const bad=await call('/change-password',login.token,{current_password:'Incorrect-QA-password',new_password:'Next-QA-password-2026'});assert.equal(bad.status,401);assert.equal((await call('/session',login.token)).status,200);
   const changed=await call('/change-password',login.token,{current_password:f.password,new_password:'Next-QA-password-2026'});assert.equal(changed.status,200);const result=await changed.json();assert.equal(result.success,true);assert.ok(result.token);assert.notEqual(result.token,login.token);
   assert.equal((await call('/session',result.token)).status,200);assert.equal((await call('/session',login.token)).status,401);
   assert.equal((await call('/change-password',login.token,{current_password:'Next-QA-password-2026',new_password:'Stale-QA-password-2026'})).status,401);
   assert.equal((await call('/login',null,{system_id:id,password:f.password})).status,401);
  }
 }finally{await f.close();}
});
