const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {scriptPath} = require('./helpers/frontend-assets');
const root = path.resolve(__dirname, '../..');
const settle = () => new Promise(resolve => setImmediate(resolve));

test('Configured API origins clear localhost ports and retain explicit deployment ports',async()=>{
    const script=fs.readFileSync(path.join(root,'assets/js/shared/api-session.js'),'utf8');
    for(const origin of ['https://demo.example.test','https://demo.example.test:8443','http://127.0.0.1:3107']){
        const calls=[];
        const browser={HEALTH_INTEL_API_ORIGIN:origin,location:{href:origin+'/index.html',pathname:'/index.html'},fetch:async(input,options)=>{calls.push({url:input instanceof Request?input.url:String(input),options});return {ok:true};}};
        const context={window:browser,URL,Request,Headers,localStorage:{getItem:()=> 'fixture-token',removeItem(){}},document:{addEventListener(){}},console};
        vm.runInNewContext(script,context);
        const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system_id:'FIXTURE-USER',password:'fixture-only'})};
        await browser.fetch('http://localhost:3000/api/login?test=1',options);
        assert.equal(calls[0].url,origin+'/api/login?test=1');assert.equal(calls[0].options.body,options.body);
        await browser.fetch('http://localhost:3000/api/patients');
        assert.equal(calls[1].url,origin+'/api/patients');assert.equal(calls[1].options.headers.get('Authorization'),'Bearer fixture-token');
        await browser.fetch('https://unrelated.example.test/image.svg');assert.equal(calls[2].url,'https://unrelated.example.test/image.svg');
        assert.equal(browser.HealthIntel.apiOrigin,origin);
    }
});

test('HTTPS pages use their own origin by default while local HTTP keeps the existing API origin', async () => {
    const script = fs.readFileSync(path.join(root, 'assets/js/shared/api-session.js'), 'utf8');
    for (const [location, expected] of [
        [{ href: 'https://health.example.test/index.html', protocol: 'https:', origin: 'https://health.example.test', pathname: '/index.html' }, 'https://health.example.test'],
        [{ href: 'https://health.example.test:8443/index.html', protocol: 'https:', origin: 'https://health.example.test:8443', pathname: '/index.html' }, 'https://health.example.test:8443'],
        [{ href: 'http://localhost:5500/index.html', protocol: 'http:', origin: 'http://localhost:5500', pathname: '/index.html' }, 'http://localhost:3000']
    ]) {
        const calls = [];
        const browser = { location, fetch: async url => { calls.push(String(url)); return { ok: true }; } };
        vm.runInNewContext(script, { window: browser, URL, Request, Headers, localStorage: { getItem: () => 'fixture-token' }, document: { addEventListener() {} }, console });
        await browser.fetch('http://localhost:3000/api/login');
        assert.equal(calls[0], expected + '/api/login');
        assert.equal(browser.HealthIntel.apiOrigin, expected);
    }
});

// These tests exercise script order, startup and cross-feature calls from real HTML.
// API, Firebase, charts and dialogs are mocked: no patient records or mail are created.
function page(file) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const elements = {}, events = {}, requests = [], errors = [], downloads = [];
    function element(id = '') {
        const classes = new Set(), listeners = {}, attributes = {};
        const e = {id, value:'', type:'password', checked:false, disabled:false, hidden:false, innerHTML:'', textContent:'', style:{}, dataset:{}, children:[], parentElement:{scrollTop:0},
            classList:{add:(...values)=>values.forEach(v=>classes.add(v)),remove:(...values)=>values.forEach(v=>classes.delete(v)),contains:v=>classes.has(v),
                replace(a,b){classes.delete(a);classes.add(b);},toggle(v,force){const on=force ?? !classes.has(v);on?classes.add(v):classes.delete(v);return on;}},
            addEventListener(name,fn){(listeners[name] ||= []).push(fn);},
            async emit(name){for(const fn of listeners[name] || [])await fn.call(e,{preventDefault(){},target:e});},
            setAttribute:(k,v)=>{attributes[k]=v;},removeAttribute:k=>{delete attributes[k];},getAttribute:k=>attributes[k],
            append(...nodes){e.children.push(...nodes);},prepend(node){e.children.unshift(node);},replaceChildren(...nodes){e.children=nodes;},reset(){},
            insertRow(){const row=element();row.insertCell=()=>{const cell=element();row.append(cell);return cell;};e.append(row);return row;},
            querySelector:()=>null,querySelectorAll:()=>[],
            getContext:()=>({createLinearGradient:()=>({addColorStop(){}})}),focus(){},scrollIntoView(){}};
        Object.defineProperty(e,'options',{get:()=>e.children});
        return e;
    }
    for(const [,id] of html.matchAll(/\bid="([^"]+)"/g)) elements[id] = element(id);
    for(const [,id,body] of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
        for(const [,tag,value,label] of body.matchAll(/(<option\b[^>]*value="([^"]*)"[^>]*>)([\s\S]*?)<\/option>/g)) {
            const option=element();option.value=value;option.textContent=label;elements[id].append(option);
            if(elements[id].children.length===1 || tag.includes('selected'))elements[id].value=value;
        }
    }
    const navigation = [...html.matchAll(/<[^>]*\bdata-target="([^"]+)"[^>]*>/g)].map(([,target])=>{
        const node=element();node.setAttribute('data-target',target);return node;
    });
    const on=(name,fn)=>{(events[name] ||= []).push(fn);};
    const storage = new Map([['active_user_id','FIXTURE-USER'],['remembered_system_id','FIXTURE-BHW']]);
    const authUser={email:'fixture@example.invalid',displayName:'Fixture User',getIdToken:async()=> 'fixture-google-token'};
    const authInstance={currentUser:authUser,signInWithPopup:async()=>({user:authUser})};
    const auth=()=>authInstance;auth.GoogleAuthProvider=function(){this.setCustomParameters=()=>{};};
    const s = {URLSearchParams,Intl,Date,TextEncoder,Event,AbortController,console:{error:(...args)=>errors.push(args)},
        document:{readyState:'loading',body:element(),getElementById:id=>elements[id] || null,createElement:()=>element(),addEventListener:on,documentElement:element(),
            querySelectorAll:selector=>selector.includes('nav-item')?navigation:[],querySelector:selector=>selector==='#sidebar, #main-sidebar, #superadmin-sidebar'?(elements.sidebar || elements['main-sidebar'] || elements['superadmin-sidebar']):selector==='[data-portal-menu]'?elements['sidebar-toggle']:selector.includes('data-target')?navigation.find(n=>selector.includes(n.getAttribute('data-target'))):element()},
        localStorage:{getItem:k=>storage.get(k) || null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
        lucide:{createIcons(){}},firebase:{initializeApp(){},auth},location:{href:'',replace(value){this.href=value;}},
        addEventListener:on,dispatchEvent(event){for(const fn of events[event.type] || [])fn(event);},setInterval(){},setTimeout(){},clearTimeout(){},matchMedia:()=>({matches:false,addEventListener(){}}),
        Swal:{fire:async()=>({isConfirmed:false}),showLoading(){},close(){},isLoading:()=>false,showValidationMessage(){}},
        HealthIntel:{download:async(...args)=>downloads.push(args),clearSession(){}},
        HealthIntelEncoding:{escape:value=>String(value),conditionLabel:r=>r.disease || '',conditionCell:r=>r.disease || '',bindCondition(){},enhanceSelect(){},populateConditions(){}},
        fetch:async(url,options)=>{
            requests.push({url:String(url),options});
            const result=s.response(String(url),options);
            return {ok:true,json:async()=>result};
        },
        response:()=>({success:true,data:[],summary:{total_cases:0},total:0,active:0,cleared:0,recovered:0,high_risk:0,highRisk:0,mild:0,monitored:0,
            previous_year:2025,current_year:2026,total_logs:0,total_users:0,db_size:1,uptime:1})};
    s.window=s;
    s.Chart=class {static register(){} constructor(_ctx,config){this.data=config.data;this.options=config.options;}update(){}destroy(){}};
    const prefix=file==='index.html'?'index-':file.split('.')[0]+'-';
    // Ordered deferred scripts keep the same page scope; allow attributes around src.
    const names=[...html.matchAll(/<script\b[^>]*\bsrc="assets\/js\/([^"]+\.js)"[^>]*>\s*<\/script>/g)].map(m=>m[1]).filter(name=>path.basename(name).startsWith(prefix));
    function load() {
        const shared = ['theme.js','accessible-modal.js','chart-theme.js'].filter(name=>html.includes('/'+name));
        for(const name of ['safe-text.js','date-format.js',...shared,...names,...(html.includes('portal-navigation.js')?['portal-navigation.js']:[])])vm.runInNewContext(fs.readFileSync(scriptPath(name),'utf8'),s,{filename:name});
    }
    async function start(){for(const fn of events.DOMContentLoaded || [])await fn();await settle();await settle();}
    function hooks(){for(const [,name] of html.matchAll(/\bon(?:click|keyup|change|submit)="([a-zA-Z_$][\w$]*)\(/g))assert.equal(typeof s[name],'function',`${file}: ${name}`);}
    return {s,html,elements,events,requests,errors,downloads,navigation,load,start,hooks,storage};
}

test('newborn age zero survives the BHW dossier and both Admin record views',async()=>{
    const bhw=page('bhw.html');bhw.load();
    bhw.s.response=()=>({success:true,resident:{age:0,patient_name:'Newborn Fixture',purok:'QA'},history:[]});
    await bhw.s.viewPatientProfile(1);
    assert.equal(bhw.elements['profile-age'].innerText,0);
    assert.deepEqual(bhw.errors,[]);
    const admin=page('admin.html');admin.load();
    const records=[{id:1,age:0,patient_name:'Newborn Fixture',date_recorded:'2026-10-04',status:'Active'},
        {id:2,age:null,patient_name:'Missing age Fixture',date_recorded:'2026-10-04',status:'Active'}];
    admin.s.renderPatientTable(records);
    assert.match(admin.elements['patient-table-body'].innerHTML,/<td>0<\/td>/);
    assert.match(admin.elements['patient-table-body'].innerHTML,/<td>N\/A<\/td>/);
    admin.s.renderArchivedPatientTable(records);
    assert.match(admin.elements['patient-archived-table-body'].innerHTML,/<td>0<\/td>/);
    assert.match(admin.elements['patient-archived-table-body'].innerHTML,/<td>N\/A<\/td>/);
});

test('BHW feature scripts initialize context, records, residents and charts in HTML order',async()=>{
    const p=page('bhw.html'),base=p.s.response;
    p.s.response=url=>url.includes('/bhw/context')?{success:true,data:{barangay_id:1,barangay_name:'Fixture Barangay'}}:base();
    p.load();await p.start();p.hooks();
    assert.deepEqual(p.errors,[]);
    assert.equal(p.s.currentBrgyId,1);
    assert.match(p.elements['dynamic-portal-title'].innerText,/Fixture Barangay/);
    for(const endpoint of ['bhw/context','bhw-stats','bhw-trend'])assert.ok(p.requests.some(r=>r.url.includes('/api/'+endpoint)),endpoint);
    for(const endpoint of ['patients','residents','bhw/puroks'])assert.ok(!p.requests.some(r=>r.url.includes('/api/'+endpoint)),`${endpoint} must wait for its view`);
    await p.navigation.find(n=>n.getAttribute('data-target')==='view-patients').emit('click');await settle();
    for(const endpoint of ['patients','bhw/puroks'])assert.ok(p.requests.some(r=>r.url.includes('/api/'+endpoint)),endpoint);
    await p.navigation.find(n=>n.getAttribute('data-target')==='view-resident-profiles').emit('click');await settle();
    assert.ok(p.requests.some(r=>r.url.includes('/api/residents')));
    p.s.dispatchEvent(new Event('health-intel:cases-changed'));await settle();
    assert.ok(p.requests.filter(r=>r.url.includes('/api/residents')).length>=2);
    await p.s.toggleArchiveView();await settle();
    assert.ok(p.requests.some(r=>r.url.includes('/api/patients/archived')));
    const before=p.requests.length;
    await p.navigation.find(n=>n.getAttribute('data-target')==='view-patients').emit('click');await settle();
    assert.ok(p.requests.slice(before).some(r=>r.url.includes('/api/patients/archived')),'returning to the archive keeps its data source');
});

test('MHO split scripts retain API charts, filter refresh and report downloads',async()=>{
    const p=page('mho.html'),base=p.s.response;
    p.s.response=url=>url.includes('/walk-in-options')?{success:true,data:{barangays:[],diseases:[]}}:base();
    p.load();await p.start();p.hooks();
    assert.deepEqual(p.errors,[]);
    for(const endpoint of ['mho/kpi','mho/yoy','mho/mortality','mho/stats','mho/walk-in-options','mho/walk-in-cases','mho/disease-reviews'])assert.ok(p.requests.some(r=>r.url.includes('/api/'+endpoint)),endpoint);
    assert.match(p.elements['insight-text'].textContent,/No recorded disease cases/);
    p.elements['filter-year'].value='2025';await p.s.updateDynamicChart();
    assert.ok(p.requests.some(r=>r.url.includes('/mho/stats?year=2025')));
    await p.s.generateOfficialPDF('FHSIS');
    assert.equal(p.downloads.length,1);assert.match(p.downloads[0][0],/\/api\/mho\/reports\/fhsis\?/);
});

test('MHO navigation keeps the requested workflow order and defaults to Philippine month and ISO week',async()=>{
    const p=page('mho.html');p.load();
    assert.deepEqual(p.navigation.map(node=>node.getAttribute('data-target')),['view-analytics','view-history','view-disease-review','view-predictive','view-heatmap','view-reports']);
    for(const [day,month,year,week,isoYear] of [
        ['2026-10-02','October','2026','40','2026'],
        ['2025-12-29','December','2025','1','2026'],
        ['2027-01-01','January','2027','53','2026'],
        ['2027-01-04','January','2027','1','2027']
    ]){
        p.s.initializeMhoReportPeriods(day);
        assert.equal(p.elements['fhsis-month'].value,month);assert.equal(p.elements['fhsis-year'].value,year);
        assert.equal(p.elements['pidsr-week'].value,week);assert.equal(p.elements['pidsr-year'].value,isoYear);
    }
    p.s.HealthIntelDate.todayInManila=()=> '2026-10-02';await p.start();
    assert.equal(p.elements['fhsis-month'].value,'October');assert.equal(p.elements['pidsr-week'].value,'40');
    p.elements['pidsr-week'].value='1';p.elements['pidsr-year'].value='2026';await p.s.generateOfficialPDF('PIDSR');
    assert.match(p.downloads.at(-1)[0],/week=1&year=2026/,'Explicit older period choices must remain usable');
});

test('Superadmin logout uses clear wording, respects cancel and clears the session on confirmation',async()=>{
    const p=page('superadmin.html');p.load();let dialog,cleared=false;
    p.s.HealthIntel.clearSession=()=>{cleared=true;};p.s.Swal.fire=async options=>{dialog=options;return {isConfirmed:false};};
    p.s.logout();await settle();assert.equal(dialog.title,'Log out?');assert.equal(dialog.confirmButtonText,'Log out');assert.equal(cleared,false);
    p.s.Swal.fire=async()=>({isConfirmed:true});p.s.logout();await settle();
    assert.equal(cleared,true);assert.equal(p.s.location.href,'index.html');
});

test('Superadmin startup, ledger Sync and canceled backup survive script separation',async()=>{
    const p=page('superadmin.html');p.load();await p.start();p.hooks();
    assert.deepEqual(p.errors,[]);
    for(const endpoint of ['superadmin/users','superadmin/audit-logs','superadmin/health'])assert.ok(p.requests.some(r=>r.url.endsWith('/api/'+endpoint)),endpoint);
    assert.equal(p.elements['status-db'].innerText,'Connected');
    p.s.response=()=>({success:true,data:[{user_id:'FIXTURE-BHW',role:'BHW',action:'Patient Encoded',created_at:'2026-09-30',details:'Fixture case'}]});
    await p.s.loadAuditLogs();assert.match(p.elements['audit-table-body'].innerHTML,/FIXTURE-BHW/);
    await p.s.backupDB();assert.equal(p.elements['backup-download-button'].disabled,false);assert.equal(p.downloads.length,0);
    p.s.toggleSuperTheme();assert.equal(p.s.document.documentElement.classList.contains('dark'),true);
});

test('Superadmin distinguishes account states and never treats a denied account as suspended',async()=>{
    const p=page('superadmin.html');p.load();
    p.elements['stat-active-admins'].innerText=9;
    p.s.response=()=>({success:true,data:['approved','pending','suspended','denied','unexpected'].map(status=>({system_id:'QA-'+status,role:'admin',status,created_at:'2026-10-02'}))});
    await p.s.loadAdmins();
    const rows=p.elements['user-table-body'].innerHTML.match(/<tr\b[\s\S]*?<\/tr>/g);
    for(const [index,label,action] of [[0,'Active','Suspend'],[1,'Pending','Approve'],[2,'Suspended','Restore'],[3,'Denied',null],[4,'Unknown',null]]){
        assert.match(rows[index],new RegExp('>'+label+'<'));
        if(action) assert.match(rows[index],new RegExp('>'+action+'<'));
        else assert.doesNotMatch(rows[index],/toggleAdminStatus/);
    }
    assert.equal(p.elements['stat-active-admins'].innerText,9,'Loading Admin accounts must not overwrite the all-personnel health count');
    p.s.Swal.fire=async()=>({isConfirmed:true});
    await p.s.toggleAdminStatus('QA-pending','approved');
    const update=p.requests.find(r=>r.url.endsWith('/approve-admin'));
    assert.equal(JSON.parse(update.options.body).system_id,'QA-pending');
    let errorDialog;p.s.Swal.fire=async options=>{errorDialog=options;return {isConfirmed:true};};
    p.s.response=()=>({success:false,error:'Account update refused'});
    await p.s.toggleAdminStatus('QA-suspended','approved');
    assert.equal(errorDialog.title,'Account update failed');
    assert.equal(errorDialog.text,'Account update refused');
});

test('Admin Access searches identity fields, filters status and requires a confirmed suspension reason',async()=>{
    const p=page('superadmin.html');p.load();
    const accounts=[{system_id:'QA-A',first_name:'Ada',last_name:'Tester',email:'ada@example.invalid',employee_id:'EMP-42',role:'admin',status:'approved'},
        {system_id:'QA-P',first_name:'Other',last_name:'Reviewer',email:'other@example.invalid',role:'admin',status:'pending'}];
    p.s.response=url=>({success:true,data:url.endsWith('/users')?accounts:[]});await p.s.loadAdmins();
    for(const search of ['ada tester','ADA@EXAMPLE','EMP-42','qa-a']){
        p.elements['admin-search'].value=search;p.s.renderAdmins();assert.match(p.elements['user-table-body'].innerHTML,/QA-A/);assert.doesNotMatch(p.elements['user-table-body'].innerHTML,/QA-P/);
    }
    p.elements['admin-search'].value='';p.elements['admin-status-filter'].value='pending';p.s.renderAdmins();assert.match(p.elements['user-table-body'].innerHTML,/QA-P/);assert.doesNotMatch(p.elements['user-table-body'].innerHTML,/QA-A/);
    p.elements['admin-search'].value='not found';p.s.renderAdmins();assert.match(p.elements['user-table-body'].innerHTML,/No Admin accounts match/);
    const before=p.requests.length;
    p.s.Swal.fire=async()=>({isConfirmed:false});await p.s.toggleAdminStatus('QA-A','suspended');assert.equal(p.requests.length,before);
    let prompt;p.s.Swal.fire=async options=>{prompt=options;return {isConfirmed:true,value:'   '};};await p.s.toggleAdminStatus('QA-A','suspended');assert.equal(p.requests.length,before);
    assert.ok(prompt.inputValidator(''));assert.ok(prompt.inputValidator('x'.repeat(501)));assert.ok(prompt.inputValidator('<b>reason</b>'));
    p.s.Swal.fire=async()=>({isConfirmed:true,value:'  Account access review\nAwaiting confirmation  '});await p.s.toggleAdminStatus('QA-A','suspended');
    const request=p.requests.find(row=>row.url.endsWith('/suspend-user'));
    assert.deepEqual(JSON.parse(request.options.body),{system_id:'QA-A',reason:'Account access review\nAwaiting confirmation'});
    assert.ok(p.requests.some(row=>row.url.endsWith('/audit-logs')),'Account actions refresh Master Ledger');
    accounts[0].status='suspended';await p.s.loadAdmins();await p.s.toggleAdminStatus('QA-A','approved');assert.ok(p.requests.some(row=>row.url.endsWith('/restore-suspended')));
});

test('Admin account details escape saved identity/reasons and report missing history without inventing it',async()=>{
    const p=page('superadmin.html');p.load();let dialog;
    p.s.Swal.fire=async options=>{dialog=options;};
    p.s.response=()=>({success:true,data:{account:{system_id:'QA-A',first_name:'<unsafe>',last_name:'Tester',email:'qa@example.invalid',status:'suspended'},has_more:true,events:[
        {action:'User Suspended',outcome:'Succeeded',user_id:'QA-SUP',role:'Superadmin',created_at:'2026-10-02T00:00:00Z',details:JSON.stringify({summary:'Saved suspension',reason:'<script>bad</script>',before:{status:'approved'},after:{status:'suspended'}})},
        {action:'User Suspended',user_id:'QA-SUP',role:'Superadmin',details:'Legacy event'}]}});
    await p.s.viewAdminAccount('QA-A');assert.match(p.requests[0].url,/\/superadmin\/admins\/QA-A\/history$/);
    assert.match(dialog.html,/&lt;unsafe&gt;/);assert.match(dialog.html,/&lt;script&gt;bad/);assert.doesNotMatch(dialog.html,/<script>|<unsafe>/);
    assert.match(dialog.html,/Active → Suspended/);assert.match(dialog.html,/Suspension reason was not recorded/);assert.match(dialog.html,/latest 100/);
    p.s.response=()=>({success:true,data:{account:{system_id:'QA-A'},events:[],has_more:false}});await p.s.viewAdminAccount('QA-A');assert.match(dialog.html,/No linked access events/);
    p.s.response=()=>({success:false,error:'Try later'});await p.s.viewAdminAccount('QA-A');assert.equal(dialog.title,'Account history unavailable');assert.equal(dialog.text,'Try later');
});

test('Superadmin restart control gives manual instructions without a request or false success',async()=>{
    const p=page('superadmin.html');p.load();let dialog;
    p.s.Swal.fire=async options=>{dialog=options;return {isConfirmed:true};};
    await p.s.restartServices();
    assert.match(p.html,/View instructions/);
    assert.equal(dialog.title,'Manual server restart');
    assert.match(dialog.text,/Ctrl\+C/);assert.match(dialog.text,/npm start/);
    assert.equal(dialog.icon,'info');assert.equal(p.requests.length,0);
    assert.doesNotMatch(JSON.stringify(dialog),/Services Restarted|Force Restart/);
});

test('Master Ledger filters combine actor, role, action and Philippine dates; details escape text and retain recorded changes',async()=>{
    const p=page('superadmin.html');p.load();
    p.s.response=()=>({success:true,data:[
        {id:1,user_id:'QA-BHW',role:'BHW',action:'Status Updated',target_type:'Case',target_id:'REC-5257',case_id:5257,outcome:'Succeeded',created_at:'2026-09-30T16:00:00Z',details:JSON.stringify({summary:'Changed <unsafe>',before:{status:'Active'},after:{status:'Cleared'}})},
        {id:2,user_id:'QA-SUP',role:'Superadmin',action:'Database Backup Generated',target_type:'Backup',target_id:'Database dump',created_at:'2026-09-30T15:59:59Z',details:'Legacy details'}]});
    await p.s.loadAuditLogs();
    p.elements['ledger-search'].value='REC-5257';p.elements['ledger-role'].value='BHW';p.elements['ledger-action'].value='Status Updated';p.elements['ledger-from'].value=p.elements['ledger-to'].value='2026-10-01';p.s.filterLedger();
    assert.match(p.elements['audit-table-body'].innerHTML,/QA-BHW/);assert.doesNotMatch(p.elements['audit-table-body'].innerHTML,/QA-SUP/);
    assert.match(p.elements['audit-table-body'].innerHTML,/Changed &lt;unsafe&gt;/);assert.doesNotMatch(p.elements['audit-table-body'].innerHTML,/<unsafe>/);
    let dialog;p.s.Swal.fire=async value=>{dialog=value;};await p.s.viewLedgerEvent(1);
    assert.match(dialog.html,/Previous values/);assert.match(dialog.html,/Active/);assert.match(dialog.html,/Cleared/);assert.match(dialog.html,/Changed &lt;unsafe&gt;/);
    p.elements['ledger-to'].value='2026-09-30';p.s.filterLedger();assert.match(p.elements['ledger-status'].textContent,/on or after/);assert.ok(p.elements['audit-pagination'].classList.contains('hidden'));
    p.s.clearLedgerFilters();assert.match(p.elements['audit-table-body'].innerHTML,/QA-SUP/);assert.match(p.elements['audit-table-body'].innerHTML,/Not recorded/);
    p.s.fetch=async()=>{throw Error('Offline');};await p.s.loadAuditLogs();assert.match(p.elements['ledger-status'].textContent,/Previously loaded/);
});

test('Access-page scripts retain Google verification, registration and login handoffs',async()=>{
    const p=page('index.html');
    p.s.response=url=>url.endsWith('/check-email')?{exists:false}:url.endsWith('/get-next-id')?{success:true,next_id:'FIXTURE-BHW'}:
        url.endsWith('/register')?{success:true,system_id:'FIXTURE-BHW'}:{success:true,token:'fixture-session',system_id:'FIXTURE-BHW',redirect:'bhw.html'};
    p.load();await p.start();p.hooks();
    assert.equal(p.elements.login_id.value,'FIXTURE-BHW');
    p.elements['privacy-checkbox'].checked=true;await p.elements['privacy-checkbox'].emit('change');
    await p.elements['btn-google-login'].emit('click');await settle();await settle();
    assert.equal(p.elements['verified-email-text'].innerText,'fixture@example.invalid');
    p.elements.reg_role.value='bhw';await p.elements.reg_role.emit('change');
    assert.equal(p.elements.reg_system_id.value,'FIXTURE-BHW');
    await p.elements['profile-screen'].emit('submit');await settle();
    const registration=p.requests.find(r=>r.url.endsWith('/register'));assert.ok(registration);
    assert.equal(JSON.parse(registration.options.body).firebase_id_token,'fixture-google-token');
    p.elements.login_id.value='fixture-bhw';await p.elements['login-form'].emit('submit');await settle();
    assert.equal(p.storage.get('health_intel_token'),'fixture-session');assert.equal(p.s.location.href,'bhw.html');
    assert.deepEqual(p.errors,[]);
});

test('Access-page recovery continues across the screen helper and reset scripts',async()=>{
    const p=page('index.html');p.s.response=()=>({success:true,message:'Fixture reset requested'});
    p.s.Swal.fire=async options=>options.input==='email'?{value:'fixture@example.invalid'}:{};
    p.load();await p.start();
    await p.elements['forgot-pass-btn'].emit('click');
    assert.equal(p.s.resetEmailCache,'fixture@example.invalid');assert.equal(p.elements['form-subtitle'].innerText,'Secure Password Reset');
    p.elements.reset_otp.value='123456';p.elements.reset_new_password.value=p.elements.reset_confirm_password.value='Synthetic-password-2026';
    await p.elements['reset-screen'].emit('submit');await settle();
    const reset=p.requests.find(r=>r.url.endsWith('/reset-password'));assert.ok(reset);
    assert.equal(JSON.parse(reset.options.body).email,'fixture@example.invalid');
    assert.equal(p.elements['form-subtitle'].innerText,'Welcome back');assert.deepEqual(p.errors,[]);
});

test('connected and archived pages resolve local scripts, styles, images and page links',()=>{
    for(const file of ['index.html','bhw.html','mho.html','admin.html','superadmin.html','legacy/prototypes/municipal.html','legacy/prototypes/register.html']){
        const html=fs.readFileSync(path.join(root,file),'utf8').replace(/<!--[\s\S]*?-->/g,'');
        const paths=[...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(m=>m[1])
            .filter(value=>!value.startsWith('#') && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value));
        for(const asset of paths){
            const pathname=asset.split(/[?#]/)[0];
            const target=pathname.startsWith('/')?path.resolve(root,`.${pathname}`):path.resolve(root,path.dirname(file),pathname);
            assert.ok(target.startsWith(root+path.sep),`${file}: ${asset} stays in the project`);
            assert.ok(fs.existsSync(target),`${file}: ${asset}`);
            if(pathname.endsWith('.js'))new vm.Script(fs.readFileSync(target,'utf8'),{filename:asset});
            if(pathname.endsWith('.css'))assert.ok(fs.statSync(target).size>0,asset);
        }
    }
});
