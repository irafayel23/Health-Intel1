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
 '/api/admin/analytics/datasets':{data:{bundled:{through:'2026-10',latestComplete:'2026-09'}}},
 '/api/admin/operational-predictions/reports':{data:['Alegria','Blumentritt','Caliban','Cansilayan','Minoyan','Salvacion','Sta. Rosa'].map((barangay,i)=>({barangay,confirmed:i<4,pending:i===4?1:0,stale:i===5}))},
 '/api/patients':{data:[{status:'Active',is_archived:0},{status:'Recovered',is_archived:0},{status:'Active',is_archived:1},{status:'Active',is_archived:0}]},
 '/api/diseases':{data:[{name:'Cough'},{name:'URTI'}]},
 '/api/admin/audit-logs':{data:[{id:1,user_id:'ADMIN-007',action:'Catalog Updated',created_at:'2026-10-30T10:00:00Z'}]},
 '/api/superadmin/users':{data:[{system_id:'ADMIN-A',role:'admin',status:'approved'},{system_id:'ADMIN-P',role:'admin',status:'pending'},{system_id:'BHW-A',role:'bhw',status:'awaiting_activation'}]},
 '/api/superadmin/health':{data:{total_users:12,total_records:31,total_logs:45}},
 '/api/superadmin/audit-logs':{data:[{id:1,user_id:'SUPER-001',action:'Backup Generated',created_at:'2026-10-30T10:00:00Z'}]}
 };
 if(empty)for(const [key,value] of Object.entries(fixtures))if(Array.isArray(value.data))value.data=[];
 const calls=[],navigation=[];const accessViews=[];
 const win={HealthIntel:{apiOrigin:'https://example.invalid'},fetch:async url=>{const p=new URL(url).pathname;calls.push(p);return {ok:!fail.includes(p),json:async()=>({success:true,...fixtures[p]})}},switchMainView:(...a)=>navigation.push(a),HealthIntelAdminAnalytics:{openTab:(...args)=>navigation.push(args.filter(value=>value!==undefined))},selectAdminAccess(view){accessViews.push(view);}};
 overview.init(doc,win);
 return {els,win,calls,navigation,accessViews,flush:()=>new Promise(r=>setImmediate(r))};
}
test('Admin overview shows the last completed report period, confirmed count and destination tabs',async()=>{
 const f=fixture('admin');await f.flush();
 assert.equal(f.els['overview-account-id'].textContent,'ADM-***');
 assert.equal(f.els['overview-records'].textContent,'2');
 assert.equal(f.els['overview-catalog'].textContent,'2');
 assert.equal(f.els['overview-confirmed'].textContent,'4 / 7');
 assert.equal(f.els['overview-report-period'].textContent,'October 2026');
 assert.equal(f.els['overview-latest-month'].textContent,'September 2026');
 assert.match(allText(f.els['overview-report-list']),/Confirmed/);
 assert.match(allText(f.els['overview-report-list']),/Pending classification/);
 assert.match(allText(f.els['overview-report-list']),/review again/);
 f.win.HealthIntelOverview.open('reports');
 f.win.HealthIntelOverview.open('datasets');
 assert.deepEqual(f.navigation,[['view-admin-analytics','nav-admin-analytics'],['training','2026-10'],['view-admin-analytics','nav-admin-analytics'],['datasets']]);
 assert.equal(f.els['role-overview'].attributes['aria-busy'],'false');
 assert.equal(f.els['overview-refresh'].disabled,false);
 assert.equal(f.calls.some(p=>/pending-users|active-users|denied-users/.test(p)),false);
});
test('Superadmin matches directory totals and opens the Staff Accounts directory with matching filters',async()=>{
 const f=fixture('superadmin',{session:'SUPERADMIN-009'});await f.flush();
 assert.equal(f.els['overview-welcome'].textContent,'Welcome back, SUPERADMIN-***');assert.equal(f.els['overview-account-id'].textContent,'SUPERADMIN-***');assert.equal(f.els['overview-system-accounts'].textContent,'3');assert.equal(f.els['overview-accounts'].textContent,'2');assert.equal(f.els['overview-pending'].textContent,'1');assert.equal(f.els['overview-records'].textContent,'31');assert.equal(f.els['stat-total-logs'].textContent,'45');
 f.win.HealthIntelOverview.open('activation');assert.deepEqual(f.navigation[0],['view-users','nav-users']);f.win.HealthIntelOverview.open('directory');f.win.HealthIntelOverview.open('accounts');assert.deepEqual(f.accessViews,['activation','directory','accounts']);
 f.win.HealthIntelOverview.open('backup');assert.deepEqual(f.navigation[3],['view-db','nav-db']);
 f.win.HealthIntelOverview.open('records');f.win.HealthIntelOverview.open('audit');assert.deepEqual(f.navigation.slice(4),[['view-audit','nav-audit']]);
});
test('failed report reads show unavailable values and recover after refresh',async()=>{
 const fail=['/api/admin/operational-predictions/reports','/api/patients'];
 const f=fixture('admin',{fail});await f.flush();
 assert.equal(f.els['overview-confirmed'].textContent,'—');
 assert.equal(f.els['overview-records'].textContent,'—');
 assert.equal(f.els['overview-latest-month'].textContent,'September 2026');
 assert.match(allText(f.els['overview-report-list']),/could not be loaded/);
 fail.length=0;await f.win.HealthIntelOverview.refresh();
 assert.equal(f.els['overview-records'].textContent,'2');
 assert.equal(f.els['overview-confirmed'].textContent,'4 / 7');
});
test('Admin masks the signed-in identifier and keeps a separate access review shortcut',async()=>{
 const f=fixture('admin',{session:'<img onerror=alert(1)>'});await f.flush();
 assert.equal(f.els['overview-account-id'].textContent,'ADM-***');
 const html=fs.readFileSync(path.join(__dirname,'../../admin.html'),'utf8');
 for(const item of ['nav-iam','view-iam','admin-users.js','Pending Approvals'])assert(!html.includes(item));
 assert(html.includes('HealthIntelStaffAccess.reviewAdminAccess()'));
});
test('empty Superadmin overview preserves the activation and activity empty states',async()=>{
 const f=fixture('superadmin',{empty:true});await f.flush();
 assert.match(allText(f.els['overview-pending-list']),/No staff awaiting activation/);
 assert.match(allText(f.els['overview-recent-list']),/No activity yet/);
 assert.equal(f.els['overview-pending'].textContent,'0');
});
function allText(el){return [el.textContent,...el.children.map(allText)].join(' ');}
