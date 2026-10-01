const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {scriptPath} = require('./helpers/frontend-assets');
const root = path.resolve(__dirname, '../..');
const settle = () => new Promise(resolve => setImmediate(resolve));

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
    const s = {URLSearchParams,Intl,Date,TextEncoder,Event,console:{error:(...args)=>errors.push(args)},
        document:{getElementById:id=>elements[id] || null,createElement:()=>element(),addEventListener:on,documentElement:element(),
            querySelectorAll:selector=>selector.includes('nav-item')?navigation:[],querySelector:selector=>selector.includes('data-target')?navigation.find(n=>selector.includes(n.getAttribute('data-target'))):element()},
        localStorage:{getItem:k=>storage.get(k) || null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
        lucide:{createIcons(){}},firebase:{initializeApp(){},auth},location:{href:'',replace(value){this.href=value;}},
        addEventListener:on,dispatchEvent(event){for(const fn of events[event.type] || [])fn(event);},setInterval(){},setTimeout(){},
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
    s.Chart=class {constructor(_ctx,config){this.data=config.data;this.options=config.options;}update(){}destroy(){}};
    const prefix=file==='index.html'?'index-':file.split('.')[0]+'-';
    const names=[...html.matchAll(/<script src="assets\/js\/([^"]+\.js)"><\/script>/g)].map(m=>m[1]).filter(name=>path.basename(name).startsWith(prefix));
    function load() {
        for(const name of ['safe-text.js','date-format.js',...names])vm.runInNewContext(fs.readFileSync(scriptPath(name),'utf8'),s,{filename:name});
    }
    async function start(){for(const fn of events.DOMContentLoaded || [])await fn();await settle();await settle();}
    function hooks(){for(const [,name] of html.matchAll(/\bon(?:click|keyup|change|submit)="([a-zA-Z_$][\w$]*)\(/g))assert.equal(typeof s[name],'function',`${file}: ${name}`);}
    return {s,html,elements,events,requests,errors,downloads,navigation,load,start,hooks,storage};
}

test('BHW feature scripts initialize context, records, residents and charts in HTML order',async()=>{
    const p=page('bhw.html'),base=p.s.response;
    p.s.response=url=>url.includes('/bhw/context')?{success:true,data:{barangay_id:1,barangay_name:'Fixture Barangay'}}:base();
    p.load();await p.start();p.hooks();
    assert.deepEqual(p.errors,[]);
    assert.equal(p.s.currentBrgyId,1);
    assert.match(p.elements['dynamic-portal-title'].innerText,/Fixture Barangay/);
    for(const endpoint of ['bhw/context','bhw-stats','bhw-trend','patients','residents','bhw/puroks'])assert.ok(p.requests.some(r=>r.url.includes('/api/'+endpoint)),endpoint);
    p.s.dispatchEvent(new Event('health-intel:cases-changed'));await settle();
    assert.ok(p.requests.filter(r=>r.url.includes('/api/residents')).length>=2);
    await p.s.toggleArchiveView();await settle();
    assert.ok(p.requests.some(r=>r.url.includes('/api/patients/archived')));
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
