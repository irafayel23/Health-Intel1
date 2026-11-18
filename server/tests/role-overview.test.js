const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const overview=require('../../assets/js/shared/role-overview');
function fixture(role,{fail=[],session='ADMIN-007',empty=false}={}){
 const html=fs.readFileSync(path.join(__dirname,'../../'+(role==='admin'?'admin':'superadmin')+'.html'),'utf8');
 const els={};
 const make=()=>({textContent:'',children:[],attributes:{},disabled:false,value:'',className:'',listeners:{},replaceChildren(){this.children=[];},append(...x){this.children.push(...x);},addEventListener(k,f){this.listeners[k]=f;},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},querySelector(){return null;},contains(){return true;}});
 for(const [,id]of html.matchAll(/\bid="([^"]+)"/g))els[id]=make();
 els['role-overview'].attributes['data-overview-role']=role;
 const doc={getElementById:id=>els[id],createElement:make};
 const fixtures={
 '/api/session':{user:{system_id:session,role}},
 '/api/admin/pending-users':{data:[{system_id:'BHW-P',role:'bhw',created_at:'2026-11-01T00:00:00Z'}]},
 '/api/admin/active-users':{data:[{system_id:'BHW-A'},{system_id:'MHO-A'}]},
 '/api/admin/denied-users':{data:[{system_id:'BHW-D'}]},
 '/api/patients':{data:[{status:'Active',is_archived:0},{status:'Recovered',is_archived:0},{status:'Active',is_archived:1},{status:'Active',is_archived:0}]},
 '/api/diseases':{data:[{name:'Cough'},{name:'URTI'}]},
 '/api/admin/audit-logs':{data:[{id:1,user_id:'ADMIN-007',action:'Catalog Updated',created_at:'2026-10-30T10:00:00Z'}]},
 '/api/superadmin/users':{data:[{system_id:'ADMIN-A',role:'admin',status:'approved'},{system_id:'ADMIN-P',role:'admin',status:'pending'},{system_id:'BHW-A',role:'bhw',status:'approved'}]},
 '/api/superadmin/health':{data:{total_users:12,total_records:31,total_logs:45}},
 '/api/superadmin/audit-logs':{data:[{id:1,user_id:'SUPER-001',action:'Backup Generated',created_at:'2026-10-30T10:00:00Z'}]}
 };
 if(empty)for(const [key,value] of Object.entries(fixtures))if(Array.isArray(value.data))value.data=[];
 const calls=[],navigation=[];const accessViews=[];
 const win={HealthIntel:{apiOrigin:'https://example.invalid'},fetch:async url=>{const p=new URL(url).pathname;calls.push(p);return {ok:!fail.includes(p),json:async()=>({success:true,...fixtures[p]})}},switchMainView:(...a)=>navigation.push(a),switchSubView:(...a)=>navigation.push(a),selectAdminAccess(view){accessViews.push(view);}};
 overview.init(doc,win);
 return {els,win,calls,navigation,accessViews,flush:()=>new Promise(r=>setImmediate(r))};
}
test('account totals deduplicate IDs and distinguish unavailable from zero',()=>{
 assert.deepEqual(overview.accountSummary([{system_id:'A'}],[{system_id:'B'}],[{system_id:'A'}]),{total:2,pending:1,active:1});
 assert.equal(overview.accountSummary(null,[],[]),null);assert.equal(overview.number(0),'0');
});
test('Admin greeting, counts and queue reflect actual authorized responses',async()=>{
 const f=fixture('admin');await f.flush();
 assert.equal(f.els['overview-welcome'].textContent,'Welcome back, ADM-***');assert.equal(f.els['overview-account-id'].textContent,'ADM-***');
 assert.equal(f.els['overview-accounts'].textContent,'4');assert.equal(f.els['overview-records'].textContent,'2');assert.equal(f.els['overview-pending'].textContent,'1');assert.equal(f.els['overview-catalog'].textContent,'2');
 assert.equal(f.els['overview-pending-list'].children.length,1);assert.match(f.els['overview-hero-title'].textContent,/1 account request needs/);
 f.win.HealthIntelOverview.open('pending');assert.deepEqual(f.navigation,[['view-iam','nav-iam'],['iam','pending']]);
 assert.equal(f.els['role-overview'].attributes['aria-busy'],'false');assert.equal(f.els['overview-refresh'].disabled,false);
 assert(!f.calls.some(p=>p.includes('predict')));
});
test('Superadmin matches directory totals and opens the selected Access Control view',async()=>{
 const f=fixture('superadmin',{session:'SUPERADMIN-009'});await f.flush();
 assert.equal(f.els['overview-welcome'].textContent,'Welcome back, SUPERADMIN-***');assert.equal(f.els['overview-account-id'].textContent,'SUPERADMIN-***');assert.equal(f.els['overview-system-accounts'].textContent,'3');assert.equal(f.els['overview-accounts'].textContent,'1');assert.equal(f.els['overview-pending'].textContent,'1');assert.equal(f.els['overview-records'].textContent,'31');assert.equal(f.els['stat-total-logs'].textContent,'45');
 f.win.HealthIntelOverview.open('pending');assert.deepEqual(f.navigation[0],['view-users','nav-users']);f.win.HealthIntelOverview.open('directory');f.win.HealthIntelOverview.open('accounts');assert.deepEqual(f.accessViews,['pending','directory','accounts']);
 f.win.HealthIntelOverview.open('backup');assert.deepEqual(f.navigation[3],['view-db','nav-db']);
 f.win.HealthIntelOverview.open('records');f.win.HealthIntelOverview.open('audit');assert.deepEqual(f.navigation.slice(4),[['view-audit','nav-audit']]);
});
test('failed reads show unavailable values instead of fabricated zero, refresh recovers',async()=>{
 const fail=['/api/admin/pending-users','/api/patients'];const f=fixture('admin',{fail});await f.flush();
 assert.equal(f.els['overview-accounts'].textContent,'—');assert.equal(f.els['overview-pending'].textContent,'—');assert.equal(f.els['overview-records'].textContent,'—');assert.match(f.els['overview-load-status'].textContent,/could not be loaded/);
 fail.length=0;await f.win.HealthIntelOverview.refresh();assert.equal(f.els['overview-records'].textContent,'2');assert.equal(f.els['overview-accounts'].textContent,'4');
});
test('Admin greeting and header mask the signed-in identifier',async()=>{
 const f=fixture('admin',{session:'<img onerror=alert(1)>'});await f.flush();assert.equal(f.els['overview-welcome'].textContent,'Welcome back, ADM-***');assert.equal(f.els['overview-account-id'].textContent,'ADM-***');assert.equal(f.els['overview-welcome'].children.length,0);
});
test('both real pages retain role hooks, have unique overview IDs and responsive dark styles',()=>{
 for(const role of ['admin','superadmin']){
  const h=fs.readFileSync(path.join(__dirname,'../../'+role+'.html'),'utf8');
  for(const id of ['role-overview','overview-welcome','overview-refresh','overview-account-id','overview-pending-list','overview-recent-list'])assert.equal([...h.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id);
  assert(h.includes('sm:grid-cols-2 xl:grid-cols-4'));assert(h.includes('dark:bg-neutral-900'));assert(h.includes('data-overview-open="pending"'));assert(h.indexOf('shared/role-overview.js')<h.indexOf(role+'/'+role+'-shell.js'));
 }
});

function allText(el){return [el.textContent,...el.children.map(allText)].join(' ');}
test('empty queues provide a readable explanation without inventing requests',async()=>{
 for(const role of ['admin','superadmin']){
  const f=fixture(role,{empty:true});await f.flush();
  const box=f.els['overview-pending-list'];
  assert.match(allText(box),/No requests waiting/);
  assert.match(box.children[0].className,/border-dashed/);
  assert.match(allText(f.els['overview-recent-list']),/No activity yet/);
  assert.equal(f.els['overview-pending'].textContent,'0');
 }
});
test('failed panels are distinguishable from empty queues and preserve retry guidance',async()=>{
 const f=fixture('admin',{fail:['/api/admin/pending-users']});await f.flush();
 assert.match(allText(f.els['overview-pending-list']),/Unable to load this panel/);
 assert.match(allText(f.els['overview-pending-list']),/Refresh overview to try again/);
 assert.equal(f.els['overview-pending'].textContent,'—');
});
