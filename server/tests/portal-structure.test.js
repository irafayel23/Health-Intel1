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
        const context={window:browser,URL,Request,Headers,localStorage:{removeItem(){}},sessionStorage:{getItem:()=> 'fixture-token',removeItem(){}},document:{addEventListener(){}},console};
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
        vm.runInNewContext(script, { window: browser, URL, Request, Headers, localStorage:{removeItem(){}}, sessionStorage: { getItem: () => 'fixture-token' }, document: { addEventListener() {} }, console });
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
            createTHead(){return element();},createTBody(){return element();},
            querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null,getClientRects:()=>[],hasAttribute:k=>k in attributes,
            getContext:()=>({createLinearGradient:()=>({addColorStop(){}})}),focus(){},scrollIntoView(){}};
        Object.defineProperty(e,'options',{get:()=>e.children});
        return e;
    }
    for(const [,id] of html.matchAll(/\bid="([^"]+)"/g)) elements[id] = element(id);
    for(const [tag,id] of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
        const classes=/\bclass="([^"]*)"/.exec(tag)?.[1];
        if(classes)elements[id].classList.add(...classes.split(/\s+/));
    }
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
    const s = {Option:function(label,value){this.textContent=label;this.value=value;},URLSearchParams,Intl,Date,TextEncoder,Event,AbortController,console:{error:(...args)=>errors.push(args)},
        document:{readyState:'loading',body:element(),getElementById:id=>elements[id] || null,createElement:()=>element(),addEventListener:on,documentElement:element(),
            querySelectorAll:selector=>selector.includes('nav-item')?navigation:selector==='.view-section'?Object.values(elements).filter(e=>e.classList.contains('view-section')):[],querySelector:selector=>selector==='#sidebar, #main-sidebar, #superadmin-sidebar'?(elements.sidebar || elements['main-sidebar'] || elements['superadmin-sidebar']):selector==='[data-portal-menu]'?elements['sidebar-toggle']:selector.includes('data-target')?navigation.find(n=>selector.includes(n.getAttribute('data-target'))):element()},
        sessionStorage:{getItem:k=>storage.get(k) || null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
        lucide:{createIcons(){}},firebase:{initializeApp(){},auth},location:{href:'',replace(value){this.href=value;}},
        addEventListener:on,dispatchEvent(event){for(const fn of events[event.type] || [])fn(event);},setInterval(){},setTimeout(){},clearTimeout(){},matchMedia:()=>({matches:false,addEventListener(){}}),
        Swal:{fire:async()=>({isConfirmed:false}),showLoading(){},close(){},isLoading:()=>false,showValidationMessage(){}},
        HealthIntel:{download:async(...args)=>downloads.push(args),clearSession(){}},
        HealthIntelEncoding:{purokOptions:()=>[],escape:value=>String(value),conditionLabel:r=>r.disease || '',conditionCell:r=>r.disease || '',bindCondition(){},bindPurokSuggestions(){return {close(){}};},enhanceSelect(){},populateConditions(){}},
        HealthIntelPatientPicker:{bind:()=>({validate(){},payload:()=>({}),reset(){},useExisting:async()=>{}})},
        HealthIntelVisits:{bindBloodPressure(){},validateMeasurements(){},formatTime:()=> 'Time not recorded',renderResidentHistory(){},followupMarkup:()=>'',followupPayload:()=>({}),followupHistory:()=>''},
        fetch:async(url,options)=>{
            requests.push({url:String(url),options});
            const result=s.response(String(url),options);
            return {ok:true,json:async()=>result};
        },
        response:url=>url?.includes('/bhw/dataset-analytics')?{success:true,source:'demonstration_dataset',source_label:'Dataset fixture',filters:{barangay:'Blumentritt'},total:0,months:[{label:'2026-01',cases:0}]}:({success:true,data:[],summary:{total_cases:0},total:0,active:0,cleared:0,recovered:0,high_risk:0,highRisk:0,mild:0,monitored:0,
            previous_year:2025,current_year:2026,total_logs:0,total_users:0,db_size:1,uptime:1})};
    s.localStorage={getItem:k=>k==='remembered_system_id'?storage.get(k)||null:null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>{if(k==='remembered_system_id')storage.delete(k);}};
    s.window=s;
    s.Chart=class {static register(){} constructor(_ctx,config){this.data=config.data;this.options=config.options;}update(){}destroy(){}};
    const prefix=file==='index.html'?'index-':file.split('.')[0]+'-';
    // Ordered deferred scripts keep the same page scope; allow attributes around src.
    const names=[...html.matchAll(/<script\b[^>]*\bsrc="assets\/js\/([^"?]+\.js)(?:\?[^"]*)?"[^>]*>\s*<\/script>/g)].map(m=>m[1]).filter(name=>path.basename(name).startsWith(prefix));
    function load() {
        const shared = ['theme.js','accessible-modal.js','chart-theme.js','pagination.js','registration-review.js'].filter(name=>html.includes('/'+name));
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
    p.s.response = url => {
        if (url.includes('/bhw/context')) return {success:true,data:{barangay_id:1,barangay_name:'Blumentritt'}};
        if (url.includes('/bhw/dataset-analytics')) return {success:true,source:'demonstration_dataset',source_label:'Dataset fixture',
            filters:{barangay:'Blumentritt'},total:40,months:[{label:'2025-12',cases:31},{label:'2026-01',cases:9}]};
        return base(url);
    };
    p.load();await p.start();p.hooks();
    assert.deepEqual(p.errors,[]);
    assert.equal(p.s.currentBrgyId,1);
    assert.match(p.elements['dynamic-portal-title'].innerText,/Blumentritt/);
    for(const endpoint of ['bhw/context','bhw-stats','bhw/dataset-analytics'])assert.ok(p.requests.some(r=>r.url.includes('/api/'+endpoint)),endpoint);
    assert.equal(p.elements['stat-total'].innerText,'40');
    assert.equal(p.elements['stat-active'].innerText,'0');
    assert.equal(p.elements['bhw-trend-period'].innerText,'Jan–Jan 2026');
    assert.match(p.elements['bhw-trend-status'].innerText,/Blumentritt/);
    assert.equal(p.requests.filter(r=>r.url.endsWith('/api/bhw/dataset-analytics')).length,1);
    for(const endpoint of ['patients','residents','bhw/puroks','bhw-trend'])assert.ok(!p.requests.some(r=>r.url.includes('/api/'+endpoint)),`${endpoint} must wait for its view`);
    await p.navigation.find(n=>n.getAttribute('data-target')==='view-patients').emit('click');await settle();
    assert.ok(p.requests.some(r=>r.url.includes('/api/patients')));
    assert.ok(!p.requests.some(r=>r.url.includes('/api/bhw/puroks')),'patient navigation must not fetch hidden report options');
    await p.navigation.find(n=>n.getAttribute('data-target')==='view-reports').emit('click');await settle();
    assert.ok(p.requests.some(r=>r.url.includes('/api/bhw/puroks')),'report filters load locations only when opened');
    assert.equal(p.elements['bhw-purok-filter'].children.length,1);
    assert.equal(p.elements['bhw-purok-filter'].children[0].textContent,'All puroks in your barangay');
    assert.equal(p.elements['bhw-purok-filter'].value,'All Puroks');
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

test('BHW case changes refresh visible supporting views and defer hidden directories until opened',async()=>{
    const p=page('bhw.html');p.load();await p.start();
    const navigate=async target=>{await p.navigation.find(n=>n.getAttribute('data-target')===target).emit('click');await settle();};
    await navigate('view-patients');
    const before=p.requests.length;
    p.s.dispatchEvent(new Event('health-intel:cases-changed'));await settle();
    assert.equal(p.requests.length,before,'case saves must not fetch hidden residents or report filters');
    await navigate('view-resident-profiles');
    const residentReads=p.requests.filter(r=>r.url.includes('/api/residents')).length;
    p.s.dispatchEvent(new Event('health-intel:cases-changed'));await settle();
    assert.equal(p.requests.filter(r=>r.url.includes('/api/residents')).length,residentReads+1);
    p.s.dispatchEvent(new Event('health-intel:case-corrected'));await settle();
    assert.equal(p.requests.filter(r=>r.url.includes('/api/residents')).length,residentReads+1,'paired correction events must not load the directory twice');
    await navigate('view-reports');
    const reportReads=p.requests.filter(r=>r.url.includes('/api/bhw/puroks')).length;
    p.s.dispatchEvent(new Event('health-intel:cases-changed'));await settle();
    assert.equal(p.requests.filter(r=>r.url.includes('/api/bhw/puroks')).length,reportReads+1);
    assert.equal(p.elements['bhw-purok-filter'].children.length,1);
    assert.equal(p.elements['bhw-purok-filter'].value,'All Puroks');
    assert.equal(p.requests.filter(r=>r.url.includes('/api/residents')).length,residentReads+1);
    await navigate('view-resident-profiles');
    assert.equal(p.requests.filter(r=>r.url.includes('/api/residents')).length,residentReads+2,'reopening loads fresh records');
});

test('BHW SQL directory keeps escaped cards, newborn age and dossier hooks',async()=>{
 const p=page('bhw.html');p.load();p.s.residentDirectoryZones=[];
 p.s.response=()=>({success:true,data:[{id:750,patient_name:'<script>fixture</script>',purok:'<b>QA</b>',age:0,case_count:1}],total:1,page:1,page_count:1});
 p.elements['directory-search'].value='Resident 749';await p.s.loadResidentDirectory();
 const html=p.elements['resident-grid'].innerHTML;assert.match(html,/viewPatientProfile\('750'\)/);assert.match(html,/&lt;script&gt;fixture&lt;\/script&gt;/);assert.match(html,/0 yrs/);
 assert.equal(p.elements['resident-page-count'].textContent,'Showing 1–1 of 1 residents');
 assert.match(p.requests.at(-1).url,/q=Resident\+749/);
 p.s.response=()=>({success:true,data:[],total:0,page:1,page_count:1});await p.s.loadResidentDirectory();assert.match(p.elements['resident-grid'].innerHTML,/No residents found/);
});

test('Resident SQL page metadata bounds controls and keeps case paging independent',async()=>{
 const p=page('bhw.html');p.load();p.s.residentDirectoryZones=[];vm.runInNewContext('currentPage=4;residentDirectoryPage=63',p.s);
 p.s.response=()=>({success:true,data:Array.from({length:6},(_,i)=>({id:745+i,patient_name:'Synthetic '+i,age:20})),total:750,page:63,page_count:63});await p.s.loadResidentDirectory();
 assert.equal(p.elements['resident-page-count'].textContent,'Showing 745–750 of 750 residents');assert.equal(vm.runInNewContext('currentPage',p.s),4);
 const controls=p.elements['resident-pagination'].children;assert.ok(controls.filter(b=>b.type==='button').length<=9);assert.equal(controls.find(b=>b.textContent==='Next').disabled,true);
 p.elements['directory-search'].value='new search';p.s.filterDirectory();assert.equal(vm.runInNewContext('residentDirectoryPage',p.s),1);
});

test('MHO split scripts retain API charts, filter refresh and report downloads',async()=>{
    const p=page('mho.html'),base=p.s.response;
    p.s.response=url=>url.includes('/walk-in-options')?{success:true,data:{barangays:[],diseases:[]}}:base();
    p.load();await p.start();p.hooks();
    assert.deepEqual(p.errors,[]);
    for(const endpoint of ['mho/kpi','mho/trend','mho/year-comparison','mho/analytics-options','mho/mortality','mho/stats','mho/walk-in-options','mho/walk-in-cases','mho/disease-reviews'])assert.ok(p.requests.some(r=>r.url.includes('/api/'+endpoint)),endpoint);
    assert.match(p.elements['insight-text'].textContent,/No recorded disease cases/);
    p.elements['filter-year'].value='2025';await p.s.updateDynamicChart();
    assert.ok(p.requests.some(r=>r.url.includes('/mho/stats?year=2025')));
    await p.s.generateOfficialPDF('FHSIS');
    assert.equal(p.downloads.length,1);assert.match(p.downloads[0][0],/\/api\/mho\/reports\/fhsis\?/);
});

test('MHO and BHW report dropdowns download covered CSV months and annual counts', async () => {
    for (const [role, monthId, yearId] of [
        ['mho', 'fhsis-month', 'fhsis-year'], ['bhw', 'bhw-report-month', 'bhw-report-year']
    ]) {
        const p = page(role + '.html');
        p.load();
        assert.equal(p.elements[monthId].options.length, 13);
        assert.equal(p.elements['pidsr-week'], undefined);
        if (role === 'mho') {
            assert.deepEqual(p.navigation.map(node => node.getAttribute('data-target')), ['view-analytics','view-history','view-patient-directory','view-predictive','view-review-center','view-heatmap','view-reports']);
            p.s.initializeMhoReportPeriods('2027-01-01');
            assert.equal(p.elements[monthId].value, 'January');
            assert.equal(p.elements[yearId].value, '2027');
        }
        const base = p.s.response;
        p.s.response = url => url.includes('/reports/historical-counts')
            ? { success: true, periods: ['2025-11'] }
            : base(url);
        p.s.HealthIntel.apiOrigin = 'http://localhost:3000';
        vm.runInNewContext(fs.readFileSync(scriptPath('historical-reports.js'), 'utf8'), p.s);
        const download = () => role === 'mho' ? p.s.generateOfficialPDF('FHSIS') : p.s.generateBHWReport('MONTHLY');
        p.elements[yearId].value = '2025';
        for (const [selection, month] of [['November', '11'], ['all', 'all']]) {
            p.elements[monthId].value = selection;
            await download();
            assert.ok(p.downloads.at(-1)[0].endsWith('/api/' + role + '/reports/historical-counts?month=' + month + '&year=2025&format=pdf'));
        }
        p.elements[yearId].value = '2027';
        await download();
        assert.equal(p.downloads.length, 2);
    }
});

test('MHO barangay report offers only covered periods and downloads the selected scope', async () => {
    const p = page('mho.html');
    p.s.HealthIntel.apiOrigin = 'http://localhost:3000';
    p.s.response = () => ({
        success: true,
        barangayPeriods: { Alegria: ['2026-09', '2024-04'], Salvacion: ['2024-04', '2024-03'] }
    });
    p.load();
    await p.s.initializeBarangayReport();
    const place = p.elements['barangay-report-place'];
    const year = p.elements['barangay-report-year'];
    const month = p.elements['barangay-report-month'];
    assert.equal(place.value, 'Alegria');
    assert.equal(year.value, '2026');
    assert.equal(month.options[0].textContent, 'September');
    place.value = 'Salvacion';
    await place.emit('change');
    assert.equal(year.value, '2024');
    assert.deepEqual(month.options.map(option => option.textContent), ['April', 'March']);
    const alerts = [];
    let loading = 0;
    p.s.Swal.fire = options => { alerts.push(options); options.didOpen?.(); };
    p.s.Swal.showLoading = () => { loading++; };
    const form = p.elements['barangay-report-form'];
    await form.emit('submit');
    assert.match(p.downloads[0][0], /barangay=Salvacion&month=04&year=2024&format=pdf$/);
    assert.equal(loading, 1);
    assert.equal(alerts[0].title, 'Generating report...');
    assert.equal(alerts[1].icon, 'success');
    assert.equal(p.elements['barangay-report-status'].textContent, '');
    p.s.HealthIntel.download = async () => { throw new Error('Download failed'); };
    await form.emit('submit');
    assert.equal(alerts.at(-1).icon, 'error');
    assert.equal(alerts.at(-1).text, 'Download failed');
    assert.equal(p.elements['barangay-report-download'].disabled, false);
    assert.equal(p.elements['barangay-report-status'].textContent, '');
});

test('Superadmin logout clears the session immediately without confirmation',async()=>{
    const p=page('superadmin.html');p.load();let dialogs=0,cleared=false;
    p.s.HealthIntel.logout=async()=>{cleared=true;};p.s.Swal.fire=async()=>{dialogs++;};
    await p.s.logout();
    assert.equal(dialogs,0);assert.equal(cleared,true);assert.equal(p.s.location.href,'index.html');
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

test('Superadmin account and ledger tooltips follow the pointer and stay inside the viewport', async () => {
    const p=page('superadmin.html');p.load();await p.start();
    const tooltip=p.elements['superadmin-row-tooltip'];
    Object.assign(tooltip,{offsetWidth:110,offsetHeight:24});
    Object.assign(p.s.document.documentElement,{clientWidth:390,clientHeight:600});
    const send=(type,options)=>p.s.dispatchEvent({type,...options});
    const point=(label,x,y,pointerType='mouse')=>send('pointermove',{pointerType,clientX:x,clientY:y,
        target:{closest:()=>({querySelector:()=>({textContent:label})})}});
    point('Open account details',50,100);
    assert.equal(tooltip.textContent,'Open account details');
    assert.equal(tooltip.classList.contains('is-visible'),true);
    assert.deepEqual(tooltip.style,{left:'64px',top:'118px'});
    point('Open event details',388,598);
    assert.equal(tooltip.textContent,'Open event details');
    assert.deepEqual(tooltip.style,{left:'272px',top:'564px'});
    send('keydown',{key:'Escape'});
    assert.equal(tooltip.classList.contains('is-visible'),false);
    point('Open event details',50,100,'touch');
    assert.equal(tooltip.classList.contains('is-visible'),false);
});

test('Superadmin distinguishes account states and never treats a denied account as suspended',async()=>{
    const p=page('superadmin.html');p.load();
    p.s.response=()=>({success:true,data:['approved','pending','suspended','denied','unexpected'].map(status=>({system_id:'QA-'+status,role:'admin',status,created_at:'2026-10-02'}))});
    await p.s.loadAdmins();
    const rows=p.elements['user-table-body'].innerHTML.match(/<tr\b[\s\S]*?<\/tr>/g);
    for(const [index,label] of [[0,'Active'],[1,'Pending'],[2,'Suspended'],[3,'Denied'],[4,'Unknown']]){
        assert.match(rows[index],new RegExp('>'+label+'<'));
        assert.doesNotMatch(rows[index],/toggleAdminStatus|In account details|title="Open account details"/);
        assert.match(rows[index],/class="hi-admin-access-hint"/);
    }
    assert.match(p.elements['user-table-body'].innerHTML,/QA-pending/);
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
    p.elements['admin-search'].value='';
    p.elements['admin-status-filter'].value='pending';p.s.renderAdmins();assert.match(p.elements['user-table-body'].innerHTML,/QA-P/);assert.doesNotMatch(p.elements['user-table-body'].innerHTML,/QA-A/);
    p.elements['admin-search'].value='not found';p.s.renderAdmins();assert.match(p.elements['user-table-body'].innerHTML,/No matching staff accounts/);
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

test('Staff Accounts filters roles and keeps BHW details read-only',async()=>{
    const p=page('superadmin.html');p.load();
    p.s.response=()=>({success:true,data:[
        {system_id:'QA-BHW',role:'bhw',status:'approved',assigned_barangay:'Salvacion'},
        {system_id:'QA-MHO',role:'mho',status:'approved'},
        {system_id:'QA-ADMIN',role:'admin',status:'suspended'}
    ]});
    await p.s.loadAdmins();p.s.selectAdminAccess('directory');
    const rows=p.elements['user-table-body'];
    assert.ok(p.elements['nav-users']);
    assert.equal(p.elements['nav-staff'], undefined);
    assert.equal(p.elements['admin-view-pending'], undefined);
    assert.match(p.elements['admin-list-status'].textContent,/3 of 3 staff accounts/);
    assert.match(rows.innerHTML,/QA-BHW[\s\S]*Salvacion[\s\S]*QA-MHO[\s\S]*QA-ADMIN/);
    assert.match(rows.innerHTML,/openAdminRow[\s\S]*Open account details/);
    let details;
    p.s.Swal.fire=async options=>{details=options;return {isConfirmed:true};};
    const before=p.requests.length;
    await p.s.openAdminRow({type:'click',target:{closest:()=>null}},'QA-BHW');
    assert.match(details.html,/Assigned barangay[\s\S]*Salvacion/);
    assert.equal(details.confirmButtonText,'Close');assert.equal(p.requests.length,before);
    p.elements['admin-role-filter'].value='mho';p.s.renderAdmins();
    assert.match(rows.innerHTML,/QA-MHO/);assert.doesNotMatch(rows.innerHTML,/QA-BHW|QA-ADMIN/);
    p.s.selectAdminAccess('activation');
    assert.equal(p.elements['admin-status-filter'].value,'awaiting_activation');
    assert.match(rows.innerHTML,/No matching staff accounts/);
    p.s.response=()=>({success:false});await p.s.loadAdmins();
    assert.match(rows.innerHTML,/Accounts could not be loaded/);
});


test('Staff directory paginates filters and retains review of pending Admins', async()=>{
    const p=page('superadmin.html');p.load();
    const accounts=Array.from({length:10},(_,i)=>[
        {system_id:'QA-A'+i,role:'admin',status:'approved'},
        {system_id:'QA-P'+i,role:'admin',status:'pending'}
    ]).flat();
    accounts.push({system_id:'QA-MHO-P',role:'mho',status:'pending'});
    p.s.response=url=>url.endsWith('/users')?{success:true,data:accounts}:
        url.endsWith('/history')?{success:true,data:{account:accounts[1],events:[]}}:{success:true,data:[]};
    await p.s.loadAdmins();
    const rows=p.elements['user-table-body'], pager=p.elements['admin-account-pager'];
    for(const [view,status,total] of [['directory','',21],['accounts','approved',10],['accounts','pending',10]]){
        p.s.selectAdminAccess(view);
        p.elements['admin-status-filter'].value=status;
        p.s.renderAdmins();
        assert.equal((rows.innerHTML.match(/<tr /g)||[]).length,8);
        assert(pager.innerHTML.includes('Showing 1–8 of '+total));
        p.s.pageAdminAccounts({target:{closest:()=>({dataset:{historyPage:'2'}})},currentTarget:pager});
        assert(pager.innerHTML.includes('Showing 9–'+Math.min(total,16)+' of '+total));
    }
    assert.doesNotMatch(rows.innerHTML,/QA-MHO-P/);
    const dialogs=[];
    p.s.Swal.fire=async options=>{dialogs.push(options);return dialogs.length===1?{isDenied:true}:{isConfirmed:dialogs.length===2};};
    await p.s.openAdminRow({type:'click',target:{closest:()=>null}},'QA-P0');
    assert.equal(dialogs[0].confirmButtonText,'Approve');
    assert.equal(dialogs[0].denyButtonText,'Decline');
    assert.equal(dialogs[1].confirmButtonText,'Decline and notify');
});

test('Admin account details escape saved identity/reasons and report missing history without inventing it',async()=>{
    const p=page('superadmin.html');p.load();let dialog;
    const dialogs=[];
    p.s.Swal.fire=async options=>{dialog=options;dialogs.push(options);return {isConfirmed:dialogs.length===2};};
    p.s.response=()=>({success:true,data:{account:{system_id:'QA-A',first_name:'<unsafe>',last_name:'Tester',email:'qa@example.invalid',status:'suspended'},has_more:true,events:[
        {action:'User Suspended',outcome:'Succeeded',user_id:'QA-SUP',role:'Superadmin',created_at:'2026-10-02T00:00:00Z',details:JSON.stringify({summary:'Saved suspension',reason:'<script>bad</script>',before:{status:'approved'},after:{status:'suspended'}})},
        {action:'User Suspended',user_id:'QA-SUP',role:'Superadmin',details:'Legacy event'}]}});
    await p.s.viewAdminAccount('QA-A');assert.match(p.requests[0].url,/\/superadmin\/admins\/QA-A\/history$/);
    assert.match(dialog.html,/&lt;unsafe&gt;/);assert.match(dialog.html,/&lt;script&gt;bad/);assert.doesNotMatch(dialog.html,/<script>|<unsafe>/);
    assert.match(dialog.html,/Active → Suspended/);assert.match(dialog.html,/Suspension reason was not recorded/);assert.match(dialog.html,/latest 100/);
    assert.equal(dialog.confirmButtonText,'Restore Access');assert.equal(dialog.cancelButtonText,'Close');assert.equal(dialog.focusCancel,true);
    await p.s.viewAdminAccount('QA-A');assert.equal(dialog.titleText,'Restore QA-A?');
    assert.equal(p.requests.some(row=>row.options?.method==='POST'),false);
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
    assert.match(p.elements['audit-table-body'].innerHTML,/tabindex="0"/);assert.match(p.elements['audit-table-body'].innerHTML,/openLedgerRow\(event, 1\)/);assert.doesNotMatch(p.elements['audit-table-body'].innerHTML,/View details/);
    let dialog;p.s.Swal.fire=async value=>{dialog=value;};await p.s.viewLedgerEvent(1);
    assert.match(dialog.html,/<dl class="hi-ledger-detail-row"><dt>Actor<\/dt><dd>/);
    assert.match(dialog.html,/Previous values/);assert.match(dialog.html,/Active/);assert.match(dialog.html,/Cleared/);assert.match(dialog.html,/Changed &lt;unsafe&gt;/);
    p.elements['ledger-to'].value='2026-09-30';p.s.filterLedger();assert.match(p.elements['ledger-status'].textContent,/on or after/);assert.ok(p.elements['audit-pagination'].classList.contains('hidden'));
    p.s.clearLedgerFilters();assert.match(p.elements['audit-table-body'].innerHTML,/QA-SUP/);assert.match(p.elements['audit-table-body'].innerHTML,/Not recorded/);
    p.s.fetch=async()=>{throw Error('Offline');};await p.s.loadAuditLogs();assert.match(p.elements['ledger-status'].textContent,/Previously loaded/);
});

test('Access-page scripts retain Google verification, registration and login handoffs',async()=>{
    const p=page('index.html');
    p.s.response=url=>url.endsWith('/check-email')?{exists:false}:
        url.endsWith('/register')?{success:true,system_id:'FIXTURE-BHW'}:{success:true,token:'fixture-session',system_id:'FIXTURE-BHW',redirect:'bhw.html'};
    p.load();await p.start();p.hooks();
    assert.equal(p.elements.login_id.value,'FIXTURE-BHW');
    p.elements['privacy-checkbox'].checked=true;await p.elements['privacy-checkbox'].emit('change');
    await p.elements['btn-google-login'].emit('click');await settle();await settle();
    assert.equal(p.elements['verified-email-text'].innerText,'fixture@example.invalid');
    p.elements.reg_role.value='bhw';await p.elements.reg_role.emit('change');
    assert.match(p.html, /id="reg_system_id" value="Shown after submission" readonly/);
    assert.ok(!p.requests.some(request=>request.url.endsWith('/get-next-id')));
    let confirmation;
    p.s.Swal.fire=async options=>{confirmation=options;return {};};
    p.elements.reg_confirm_password.value=p.elements.reg_password.value;p.elements.reg_review_consent.checked=true;p.s.registrationPhotoData=async()=> 'data:image/jpeg;base64,fixture';
    await p.elements['profile-screen'].emit('submit');await settle();
    const registration=p.requests.find(r=>r.url.endsWith('/register'));assert.ok(registration);
    const payload=JSON.parse(registration.options.body);
    assert.equal(payload.firebase_id_token,'fixture-google-token');
    assert.ok(!Object.hasOwn(payload,'system_id'));
    assert.match(confirmation.text,/official ID is FIXTURE-BHW/);
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


test('Master Ledger rows open the matching event with click, Enter or Space',()=>{
 const p=page('superadmin.html');p.load();const opened=[];let prevented=0;
 p.s.viewLedgerEvent=id=>opened.push(id);
 const row={},target={closest:()=>null};row.closest=()=>null;
 p.s.openLedgerRow({type:'click',target,currentTarget:row},7);
 for(const key of ['Enter',' '])p.s.openLedgerRow({type:'keydown',key,target:row,currentTarget:row,preventDefault(){prevented++;}},8);
 p.s.openLedgerRow({type:'keydown',key:'ArrowDown',target:row,currentTarget:row},9);
 p.s.openLedgerRow({type:'keydown',key:'Enter',target,currentTarget:row},9);
 p.s.openLedgerRow({type:'click',target:{closest:()=>({})},currentTarget:row},9);
 assert.deepEqual(opened,[7,8,8]);assert.equal(prevented,2);
 assert.match(fs.readFileSync(path.join(root,'superadmin.html'),'utf8'),/aria-label="Refresh accounts"/);
});


test('ledger retains full long text in details and disables rows without valid IDs',async()=>{
 const p=page('superadmin.html');p.load();const long='UnbrokenReference'.repeat(30);
 p.s.response=()=>({success:true,data:[{id:42,user_id:long,role:'BHW',action:long,details:long},{id:'invalid',action:'Legacy row'}]});
 await p.s.loadAuditLogs();const html=p.elements['audit-table-body'].innerHTML;
 assert.match(html,/openLedgerRow\(event, 42\)/);assert.doesNotMatch(html,/openLedgerRow\(event, NaN\)/);
 assert.equal((html.match(/tabindex="0"/g)||[]).length,1);assert.doesNotMatch(html,/View details/);
 let dialog;p.s.Swal.fire=value=>{dialog=value;};p.s.viewLedgerEvent(42);assert.ok(dialog.html.includes(long));
});


test('ledger paging keeps both boundary controls and full details for compact long previews',async()=>{
 const p=page('superadmin.html');p.load();const long='LongWord'.repeat(200);
 p.s.response=()=>({success:true,data:Array.from({length:9},(_,i)=>({id:i+1,user_id:long,role:long,action:long,details:long,created_at:'2026-11-01T00:00:00Z'}))});
 await p.s.loadAuditLogs();assert.equal((p.elements['audit-table-body'].innerHTML.match(/hi-ledger-action/g)||[]).length,8);
 assert.match(p.elements['audit-page-buttons'].innerHTML,/<button disabled[^>]+>Prev<\/button>/);
 assert.match(p.elements['audit-table-body'].innerHTML,/hi-ledger-cell/);assert.match(p.elements['audit-table-body'].innerHTML,/hi-ledger-summary/);
 p.s.goToAuditPage(2);assert.equal((p.elements['audit-table-body'].innerHTML.match(/hi-ledger-action/g)||[]).length,1);
 assert.match(p.elements['audit-page-info'].innerText,/Showing 9 to 9 of 9/);
 assert.match(p.elements['audit-page-buttons'].innerHTML,/<button disabled[^>]+>Next<\/button>/);
 let dialog;p.s.Swal.fire=value=>{dialog=value;};p.s.viewLedgerEvent(9);assert.ok(dialog.html.includes(long));
});


test('related ledger events paginate all loaded matches and keep close controls',async()=>{
 const p=page('superadmin.html');p.load();
 p.s.response=()=>({success:true,data:Array.from({length:13},(_,i)=>({id:i+1,user_id:'QA',role:'Superadmin',action:'Related '+i,target_type:'Account',target_id:'QA',details:'Detail '+i}))});
 await p.s.loadAuditLogs();let dialog,focusOptions;const content={innerHTML:'',offsetHeight:650,style:{},scrollTop:123,contains:()=>true,closest:()=>null,getClientRects:()=>[{}],hasAttribute:()=>false,getBoundingClientRect:()=>({top:360-modalBody.scrollTop}),focus(options){focusOptions=options;},scrollIntoView(){throw Error('Paging must scroll only the dialog body');},addEventListener:(name,fn)=>content[name]=fn};
 p.s.Swal.fire=options=>{dialog=options;};const modalBody={scrollTop:300,clientTop:2,getBoundingClientRect:()=>({top:20}),querySelector:()=>content};p.s.Swal.getHtmlContainer=()=>modalBody;
 p.s.viewLedgerEvent(1);assert.equal(dialog.showCloseButton,true);assert.equal(dialog.confirmButtonText,'Close');
 assert.equal(dialog.customClass.popup,'hi-ledger-modal');assert.doesNotMatch(dialog.html,/max-h-\[65vh\]|overflow-y-auto/);assert.match(dialog.html,/hi-history-pagination[\s\S]*Page 1 of 3[\s\S]*hi-related-pages/);assert.doesNotMatch(dialog.html,/Related 5/);dialog.didOpen();
 const click=n=>content.click({target:{closest:()=>({dataset:{historyPage:String(n)},disabled:false})}});
 click(2);assert.match(content.innerHTML,/Related 5/);assert.match(content.innerHTML,/Page 2 of 3/);
 click(3);assert.match(content.innerHTML,/Related 12/);assert.match(content.innerHTML,/Page 3 of 3/);
 assert.equal((content.innerHTML.match(/<article class="hi-related-event"/g)||[]).length,3);assert.match(content.innerHTML,/Related event cards/);assert.equal(focusOptions.preventScroll,true);assert.equal(content.scrollTop,123);assert.equal(modalBody.scrollTop,338);assert.equal(modalBody.tabIndex,0);assert.equal(content.style.minHeight,'650px');
 const before=content.innerHTML;click(4);assert.equal(content.innerHTML,before);
 assert.doesNotMatch(p.elements['audit-table-body'].innerHTML,/title="Open event details"/);
 assert.match(p.elements['audit-table-body'].innerHTML,/hi-ledger-hint/);
});

test('MHO pagers show five numbered pages and Previous and Next',()=>{
    const p=page('mho.html');p.load();
    const host={};
    p.s.renderMhoPages(host,65,131,'Patient directory pages');
    assert.match(host.innerHTML,/Page 65 of 131/);
    assert.match(host.innerHTML,/data-mho-page="65"[^>]*aria-current="page"/);
    assert.deepEqual([...host.innerHTML.matchAll(/data-mho-page="(\d+)"/g)].map(match=>Number(match[1])),[64,63,64,65,66,67,66]);
    assert.match(host.innerHTML,/>Previous<\/button>/);
    assert.match(host.innerHTML,/>Next<\/button>/);
    p.s.renderMhoPages(host,1,131,'Patient directory pages');
    assert.match(host.innerHTML,/data-mho-page="0" disabled>Previous/);
    assert.match(host.innerHTML,/aria-label="Page 5"/);
    p.s.renderMhoPages(host,131,131,'Patient directory pages');
    assert.match(host.innerHTML,/data-mho-page="132" disabled>Next/);
    p.s.renderMhoPages(host,1,1,'Recent consultation pages');
    assert.match(host.innerHTML,/Page 1 of 1/);
    assert.match(host.innerHTML,/disabled>Previous/);
    assert.match(host.innerHTML,/disabled>Next/);
    assert.match(host.innerHTML,/data-mho-page="1"[^>]*aria-current="page"/);
});

test('pagination focuses the visible table and reveals its header',()=>{
    const p=page('mho.html');p.load();
    const body=p.elements['mho-patient-body'],calls=[];
    const table={getClientRects:()=>[{}],hasAttribute:()=>false,
        focus:options=>calls.push(['focus',options.preventScroll]),
        scrollIntoView:options=>calls.push(['scroll',options.block,options.inline,options.behavior])};
    body.closest=selector=>selector==='table'?table:null;
    p.s.HealthIntelPagination.showStart('mho-patient-body');
    assert.equal(table.tabIndex,-1);
    assert.deepEqual(calls,[['focus',true],['scroll','start','nearest','instant']]);
    table.getClientRects=()=>[];
    p.s.HealthIntelPagination.showStart('mho-patient-body');
    assert.equal(calls.length,2,'a hidden list must not steal focus or scroll');
});

test('MHO directory reveals new results after a successful page request and keeps the old page on failure',async()=>{
    const p=page('mho.html'),base=p.s.response;
    let pageNumber=2, fail=false;
    p.s.response=url=>{
        if(url.includes('/walk-in-options'))return {success:true,data:{barangays:[],diseases:[]}};
        if(url.includes('/api/mho/patients?')){
            const target=Number(new URL(url).searchParams.get('page'));
            if(fail)return {success:false,error:'Fixture failure'};
            return {success:true,page:target,page_count:3,page_size:1,total:3,data:[{id:target,kind:'resident',patient_name:'Fixture '+target}]};
        }
        return base();
    };
    p.load();await p.start();
    const results=p.elements['mho-patient-body'],pager=p.elements['mho-patient-pager'],seen=[];
    p.s.HealthIntelPagination.showStart=id=>{assert.equal(id,'mho-patient-body');seen.push(results.innerHTML);};
    pager.closest=()=>({dataset:{mhoPage:String(pageNumber)}});
    await p.navigation.find(item=>item.getAttribute('data-target')==='view-patient-directory').emit('click');await settle();
    assert.match(results.innerHTML,/Fixture 1/);assert.equal(seen.length,0);
    await pager.emit('click');await settle();
    assert.match(seen[0],/Fixture 2/);
    fail=true;pageNumber=1;
    await pager.emit('click');await settle();
    assert.match(results.innerHTML,/Fixture 2/);assert.equal(seen.length,1);
    assert.match(p.elements['mho-patient-count'].textContent,/Still showing page 2/);
});


test('BHW surveillance puroks combine configured choices and assigned recorded locations',async()=>{
    const p=page('bhw.html');
    p.s.HealthIntelEncoding.purokOptions=()=>[{value:'Purok Sunrise',label:'Purok Sunrise'}];
    const base=p.s.response;
    p.s.response=url=>url.includes('/api/bhw/puroks')
      ?{success:true,data:['zone 1','123','Purok Sunrise','Purok Sambag']}:base(url);
    p.load();
    await p.s.loadPurokChoices();
    const select=p.elements['bhw-purok-filter'];
    assert.deepEqual(Array.from(select.children,option=>option.value),
      ['All Puroks','123','Purok Sambag','Purok Sunrise','zone 1']);
    assert.equal(select.children[0].textContent,'All puroks in your barangay');
    select.value='Purok Sambag';
    await p.s.loadPurokChoices();
    assert.equal(select.value,'Purok Sambag');
    assert.equal(select.disabled,false);
});
