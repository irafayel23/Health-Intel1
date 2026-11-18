const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {scriptPath} = require('./helpers/frontend-assets');
const script = name => fs.readFileSync(scriptPath(name),'utf8');
const {caseIdForAudit} = require('../services/case-audit');
function loadAdminScripts(sandbox) {
    vm.runInNewContext(script('safe-text.js'),sandbox);sandbox.HealthIntelText=sandbox.window.HealthIntelText;
    vm.runInNewContext(script('encoding-controls.js'),sandbox);sandbox.HealthIntelEncoding=sandbox.window.HealthIntelEncoding;
    const html = fs.readFileSync(path.join(__dirname,'../../admin.html'),'utf8');
    for(const [,name] of html.matchAll(/<script src="assets\/js\/(admin\/admin-[^"?]+\.js)(?:\?[^" ]*)?"><\/script>/g)) {
        vm.runInNewContext(script(name),sandbox,{filename:name});
    }
}

test('case links use explicit references and never guess IDs from unrelated or legacy encoding details', () => {
    assert.equal(caseIdForAudit({action:'Patient Encoded',details:JSON.stringify({case_id:5257,summary:'Created case'})}),5257);
    assert.equal(caseIdForAudit({action:'Case Corrected',details:JSON.stringify({case_id:5257,before:{},after:{}})}),5257);
    assert.equal(caseIdForAudit({action:'Record Archived',details:'Record Archived: #1083.'}),1083);
    assert.equal(caseIdForAudit({action:'Status Updated',details:'Updated case #REC-1083 to Cleared; follow-up note appended.'}),1083);
    for (const log of [
        {action:'Patient Encoded',details:'Encoded disease dated 2026-09-30; barangay #1; severity Mild.'},
        {action:'Disease Archived',details:'Disease Archived: #1083.'},
        {action:'User Approved',details:JSON.stringify({case_id:5257})},
        {action:'Record Restored',details:'Record Restored: #1083. Note #5257'},
        {action:'Patient Encoded',details:JSON.stringify({case_id:-1})}
    ]) assert.equal(caseIdForAudit(log),null);
});

test('Admin audit rows preserve system details in dialogs and open only explicit case links', async () => {
    const elements = {'audit-table-body':{},'audit-page-info':{},'audit-page-buttons':{querySelector:()=>null}};
    let dialog, linkedCase, focused = false;
    const row = {querySelector:()=>({focus(){focused=true;}})};
    const sandbox = {console,lucide:{createIcons(){}},window:{addEventListener(){}},document:{getElementById:id=>elements[id]},
        Swal:{fire:async value=>{dialog=value;return {};}}};
    loadAdminScripts(sandbox);
    assert.equal(sandbox.matchesCaseSearch({id:5257,patient_name:'Fixture'},'REC-5257'),true);
    assert.equal(sandbox.matchesCaseSearch({id:5257,patient_name:'Fixture'},'#REC-5257'),true);
    assert.equal(sandbox.matchesCaseSearch({id:5257,patient_name:'Fixture'},'5257'),true);
    assert.equal(sandbox.matchesCaseSearch({id:52570,patient_name:'Fixture'},'REC-5257'),false);
    sandbox.viewAdminCase=(id, log)=>{linkedCase=[id, log.details];};
    vm.runInNewContext("allAuditLogs=[{case_id:5257,action:'Patient Encoded',user_id:'QA-BHW',role:'BHW',details:JSON.stringify({case_id:5257,summary:'Created case <unsafe>'})},...Array.from({length:8},()=>({case_id:null,action:'Catalog update',details:'Older encoding <unsafe>'}))];renderAuditTable();",sandbox);
    assert.match(elements['audit-table-body'].innerHTML,/Patient Encoded · #REC-5257/);
    assert.doesNotMatch(elements['audit-table-body'].innerHTML,/Created case|Older encoding/);
    assert.match(elements['audit-page-info'].textContent,/Showing 1–8 of 9/);
    await sandbox.openAdminAuditEvent(0,row);
    assert.deepEqual(linkedCase,[5257,JSON.stringify({case_id:5257,summary:'Created case <unsafe>'})]);
    assert.equal(focused,true);
    await sandbox.openAdminAuditEvent(1,row);
    assert.equal(dialog.titleText,'Audit event details');
    assert.match(dialog.html,/Older encoding &lt;unsafe&gt;/);
    sandbox.goToAuditPage(2);
    assert.equal((elements['audit-table-body'].innerHTML.match(/admin-audit-row/g)||[]).length,1);
    assert.match(elements['audit-page-info'].textContent,/Showing 9–9 of 9/);
    assert.match(elements['audit-page-buttons'].innerHTML,/aria-current="page">2/);
});

test('Admin audit case links open read-only case details without leaving the audit page', async () => {
    for (const scenario of ['active','archived','unavailable']) {
        let dialog;
        const archived = scenario==='archived';
        const sandbox = {console,lucide:{createIcons(){}},window:{addEventListener(){}},document:{getElementById:()=>null},
            fetch:async()=>({ok:scenario!=='unavailable',json:async()=>({success:true,case:{id:5257,is_archived:archived,resident_id:archived?42:null,patient_name:'Fixture',encoded_by:'QA-BHW'},history:[]})}),
            Swal:{fire:async value=>{dialog=value;return {isConfirmed:true};}}};
        loadAdminScripts(sandbox);
        sandbox.switchMainView=()=>{throw Error('Audit case should open in place');};
        const event={case_id:5257, action:'Patient Encoded', details:'Recorded case <unsafe>'};
        await sandbox.viewAdminCase(5257,event);
        assert.match(dialog.html,/Recorded case &lt;unsafe&gt;/);
        if (scenario==='unavailable') {
            assert.equal(dialog.titleText,'Audit event details');
            assert.match(dialog.html,/linked case could not be opened/);
        } else {
            assert.equal(dialog.title,'Case #REC-5257');
            assert.equal(dialog.showDenyButton,false);
            assert.equal(dialog.confirmButtonText,'Close');
            if(archived)assert.match(dialog.html,/RES-42/);
            else assert.match(dialog.html,/This case is not linked to a resident profile\./);
        }
    }
});

test('Admin case paging reaches records past the old limit and keeps both lists independent', () => {
    const elements = {};
    const sandbox = {
        console, lucide:{createIcons(){}}, window:{addEventListener(){}},
        document:{getElementById:id=>elements[id] ||= {value:'',innerHTML:'',querySelector:()=>null}}
    };
    loadAdminScripts(sandbox);
    vm.runInNewContext("allPatients = Array.from({length: 54}, (_, index) => ({id: index + 1, patient_name: 'Sample case'})); allArchivedPatients = allPatients.slice(0, 12);", sandbox);
    sandbox.filterData();
    assert.match(elements['admin-active-case-pages'].innerHTML, /Showing 1–10 of 54 cases/);
    assert.match(elements['admin-active-case-pages'].innerHTML, /disabled>Previous/);
    assert.doesNotMatch(elements['patient-table-body'].innerHTML, />View case<|>Correct<|>Archive</);
    assert.match(elements['patient-table-body'].innerHTML, /onclick="viewAdminCase\(1\)"/);
    assert.match(elements['patient-table-body'].innerHTML, /<button type="button" class="admin-case-open" aria-label="Open case #REC-1 for Sample case"/);
    assert.match(elements['patient-table-body'].innerHTML, /class="admin-case-name">Sample case<\/span>\s*<span class="admin-case-id">#REC-1/);
    assert.match(elements['patient-table-body'].innerHTML, /class="admin-case-status" data-status="active">Active/);
    sandbox.goToAdminCasePage('active', 6);
    assert.match(elements['admin-active-case-pages'].innerHTML, /Showing 51–54 of 54 cases/);
    assert.match(elements['admin-active-case-pages'].innerHTML, /disabled>Next/);
    assert.match(elements['patient-table-body'].innerHTML, /admin-case-row-54/);
    sandbox.goToAdminCasePage('archived', 2);
    assert.match(elements['admin-archived-case-pages'].innerHTML, /Showing 11–12 of 12 cases/);
    assert.match(elements['admin-active-case-pages'].innerHTML, /Showing 51–54/);
    elements['search-patient'].value = 'REC-54';
    sandbox.filterData();
    assert.match(elements['admin-active-case-pages'].innerHTML, /1 matching case/);
    assert.match(elements['patient-table-body'].innerHTML, /admin-case-row-54/);
    assert.doesNotMatch(elements['patient-table-body'].innerHTML, /admin-case-row-53/);
    elements['search-patient'].value = 'No match';
    sandbox.filterData();
    assert.match(elements['patient-table-body'].innerHTML, /colspan="7"[^>]*>No matching case records/);
});

test('Admin case rows keep filters intact and defer each action until chosen in details', async () => {
    let archived = false, decision = {}, dialog;
    const reads = [], actions = [];
    const elements = {
        'search-patient': {value:'Fixture filter'},
        'admin-case-row-42': {querySelector:()=>({focus(){}})}
    };
    const sandbox = {
        console, lucide:{createIcons(){}}, window:{addEventListener(){}},
        document:{getElementById:id=>elements[id]},
        fetch:async url=>{
            reads.push(url);
            return {ok:true,json:async()=>({success:true,case:{id:42,is_archived:archived,patient_name:'<Example>'},history:[]})};
        },
        HealthIntelCorrections:{open:id=>actions.push(['correct',id])},
        Swal:{fire:async options=>{dialog=options;return decision;}}
    };
    loadAdminScripts(sandbox);
    sandbox.archivePatient=id=>actions.push(['archive',id]);
    sandbox.restorePatient=id=>actions.push(['restore',id]);
    await sandbox.viewAdminCase(42);
    assert.deepEqual(actions,[]);
    assert.equal(dialog.confirmButtonText,'Correct');
    assert.equal(dialog.denyButtonText,'Archive');
    assert.equal(dialog.denyButtonColor,'#b91c1c');
    assert.equal(dialog.confirmButtonColor,'#1e40af');
    assert.equal(dialog.cancelButtonColor,'#475569');
    assert.equal(dialog.reverseButtons,undefined);
    const archiveButton={};
    let moved;
    dialog.didRender({querySelector: selector=>selector==='.swal2-deny' ? archiveButton : {before:button=>{moved=button;}}});
    assert.equal(moved,archiveButton);
    assert.equal(dialog.focusCancel,true);
    assert.match(dialog.html,/&lt;Example&gt;/);
    assert.equal(elements['search-patient'].value,'Fixture filter');
    assert.deepEqual(reads,['http://localhost:3000/api/admin/cases/42']);
    decision = {isConfirmed:true};
    await sandbox.viewAdminCase(42);
    decision = {isDenied:true};
    await sandbox.viewAdminCase(42);
    archived = true;
    decision = {isConfirmed:true};
    await sandbox.viewAdminCase(42);
    assert.equal(dialog.confirmButtonText,'Restore');
    assert.equal(dialog.showDenyButton,false);
    assert.deepEqual(actions,[['correct',42],['archive',42],['restore',42]]);
});

test('Admin disease rows open escaped details and route only explicit actions', async () => {
    const actions = [], reads = [];
    let dialog, decision = {};
    const table = () => ({
        innerHTML: '',
        querySelectorAll() {
            this.row = {
                addEventListener(_event, fn) { this.open = fn; },
                querySelector: () => ({focus(){}})
            };
            return [this.row];
        }
    });
    const active = table(), archived = table();
    const elements = {'disease-table-body': active, 'disease-archived-table-body': archived};
    const sandbox = {
        console, lucide:{createIcons(){}}, window:{addEventListener(){}},
        document:{getElementById:id=>elements[id]},
        fetch:async url=>{
            reads.push(url);
            return {ok:true,json:async()=>({success:true,data:[url.endsWith('/archived') ? {id:43,name:'Archived fixture'} : {id:42,name:'<Fixture>'}]})};
        },
        Swal:{fire:async options=>{dialog=options;return decision;}}
    };
    loadAdminScripts(sandbox);
    sandbox.archiveDisease=id=>actions.push(['archive',id]);
    sandbox.restoreDisease=id=>actions.push(['restore',id]);
    await sandbox.loadDiseases();
    assert.equal(sandbox.window.adminRegistryChoices[0].id,42);
    assert.match(active.innerHTML,/&lt;Fixture&gt;/);
    assert.match(archived.innerHTML,/Archived fixture/);
    for (const body of [active,archived]) assert.doesNotMatch(body.innerHTML,/onclick=|>Restore<|>Archive</);
    await active.row.open();
    assert.equal(dialog.confirmButtonText,'Archive');
    assert.equal(dialog.focusCancel,true);
    assert.match(dialog.html,/&lt;Fixture&gt;/);
    assert.deepEqual(actions,[]);
    decision = {isConfirmed:true};
    await active.row.open();
    await archived.row.open();
    assert.equal(dialog.confirmButtonText,'Restore');
    assert.equal(dialog.confirmButtonColor,'#047857');
    assert.equal(dialog.cancelButtonColor,'#475569');
    assert.equal(dialog.reverseButtons,undefined);
    assert.deepEqual(actions,[['archive',42],['restore',43]]);
    assert.equal(reads.length,2);
});

test('Admin scripts load in HTML order and initialize all feature views with existing hooks', async () => {
    const elements = {}, events = {}, requests = [], errors = [];
    const sandbox = {console:{error:(...args)=>errors.push(args)},lucide:{createIcons(){}},window:{addEventListener:(name,fn)=>{events[name]=fn;}},
        document:{addEventListener:(name,fn)=>{events[name]=fn;},getElementById:id=>elements[id] ||= {value:'',innerHTML:'',querySelectorAll:()=>[],classList:{add(){},remove(){}}}},
        fetch:async url=>{requests.push(url);return {ok:true,json:async()=>({success:true,data:[]}),clone(){return this;}};}};
    loadAdminScripts(sandbox);
    events.DOMContentLoaded();
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(errors,[]);
    for(const endpoint of ['/admin/pending-users','/admin/active-users','/admin/denied-users','/patients','/patients/archived','/diseases','/diseases/archived','/admin/audit-logs']) {
        assert.ok(requests.includes('http://localhost:3000/api'+endpoint),endpoint);
    }
    const html = fs.readFileSync(path.join(__dirname,'../../admin.html'),'utf8');
    for(const [,handler] of html.matchAll(/\bon(?:click|keyup|change)="([a-zA-Z_$][\w$]*)\(/g)) {
        if(handler==='logout')continue; // Shared session script owns this handler.
        assert.equal(typeof sandbox[handler],'function',handler);
    }
});

test('resident directory reloads after saved case changes and when its real sidebar tab opens', async () => {
    const html = fs.readFileSync(path.join(__dirname,'../../bhw.html'),'utf8');
    const residentButton = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].find(match=>match[0].includes('Resident Profiles'));
    assert.ok(residentButton);
    const target = /data-target="([^"]+)"/.exec(residentButton[0])[1];
    const events = {}, clicks = {}, requests = [];
    const button = { classList:{contains:()=>false,remove(){},add(){}}, getAttribute:()=>target, addEventListener:(name,fn)=>{clicks[name]=fn;} };
    const grid = {innerHTML:''};
    const residentView = {classList:{contains:()=>false,add(){},remove(){}}};
    let residents = [];
    const purok = {value:'', replaceChildren(...options){ this.options=options; }};
    const age = {value:''};
    const elements = {'directory-search':{value:''}, 'resident-grid':grid, 'view-resident-profiles':residentView,
        'resident-filter-purok':purok, 'resident-filter-age':age};
    const sandbox = { lucide:{createIcons(){}}, console, window:{ currentBrgyId:1, currentBrgyName:'Blumentritt', addEventListener:(name,fn)=>{events[name]=fn;} },
        Option:function(label,value){ this.label=label; this.value=value; },
        document:{ querySelectorAll:selector=>selector.includes('nav-menu')?[button]:[], addEventListener(){}, getElementById:id=>elements[id] || null },
        escapeText:value=>String(value), fetch:async url=>{requests.push(url);return {json:async()=>({success:true,data:residents})};} };
    vm.runInNewContext(script('safe-text.js'),sandbox);
    vm.runInNewContext(script('encoding-controls.js'),sandbox);sandbox.HealthIntelEncoding=sandbox.window.HealthIntelEncoding;
    const bhwHtml = fs.readFileSync(path.join(__dirname,'../../bhw.html'),'utf8');
    for (const [,name] of bhwHtml.matchAll(/<script src="assets\/js\/(bhw\/bhw-(?:records|residents|dashboard|startup)\.js)(?:\?[^"]*)?"><\/script>/g)) {
        vm.runInNewContext(script(name),sandbox,{filename:name});
    }
    await sandbox.loadResidentDirectory();
    assert.match(grid.innerHTML,/No residents found/);
    residents = [{id:42,patient_name:'Disposable Directory',age:26,purok:'QA Zone',case_count:1}];
    await events['health-intel:cases-changed']();
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(grid.innerHTML,/Disposable Directory/);
    assert.ok(purok.options.some(option=>option.label==='Purok Sambag'));
    assert.ok(purok.options.some(option=>option.label==='QA Zone'));
    age.value='senior';
    sandbox.filterDirectory();
    assert.match(grid.innerHTML,/No residents found/);
    age.value='adult';
    sandbox.filterDirectory();
    assert.match(grid.innerHTML,/Disposable Directory/);
    const before = requests.length;
    clicks.click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(requests.length,before+1);
    assert.ok(requests.every(url=>url.endsWith('/api/residents?barangay_id=1')));
});

test('BHW PDFs explain empty periods and preserve surveillance location filters', async () => {
    for (const type of ['MONTHLY','SURVEILLANCE']) {
        const alerts = [], elements = { 'bhw-report-month':{value:'October'}, 'bhw-report-year':{value:'2026'}, 'bhw-purok-filter':{value:'QA Zone'} };
        let table, filename, requested;
        const sandbox = { console, URLSearchParams, Intl, Date, HealthIntelPDF:{ensure:async()=>{}}, document:{getElementById:id=>elements[id],addEventListener(){}},
            window:{currentBrgyId:1,currentBrgyName:'Fixture Barangay',jspdf:{jsPDF:class {setFontSize(){} text(){} autoTable(value){table=value;} save(value){filename=value;}}}},
            Swal:{fire:(...args)=>alerts.push(args)},fetch:async url=>{requested=url;return {json:async()=>({success:true,data:type==='SURVEILLANCE'?[{purok:'Other Zone'}]:[]})};} };
        sandbox.window=sandbox.window || {};vm.runInNewContext(script('safe-text.js'),sandbox);vm.runInNewContext(script('encoding-controls.js'),sandbox);sandbox.HealthIntelEncoding=sandbox.window.HealthIntelEncoding;
        vm.runInNewContext(script('bhw-dialogs.js'),sandbox);
        await sandbox.generateBHWReport(type);
        assert.match(requested,/month=October&year=2026/);
        assert.match(table.body[0][0].content,/No recorded cases match October 2026/);
        if(type==='SURVEILLANCE')assert.match(table.body[0][0].content,/QA Zone/);
        assert.match(filename,/October_2026\.pdf$/);
        assert.equal(alerts.at(-1)[0],'No matching cases');
        assert.equal(alerts.at(-1)[2],'info');
    }
});

test('Admin archive and restore keep failed saves in the dialog instead of claiming success', async () => {
    for (const action of ['archive','restore']) {
        for (const failure of ['http','network']) {
            const notices=[];let validation, refreshed=0;
            const sandbox={console,window:{addEventListener(){}},document:{getElementById(){return null;}},lucide:{createIcons(){}},
                fetch:async()=>{if(failure==='network')throw Error('Connection lost');return {ok:false,json:async()=>({success:false,error:'Save rejected'})};},
                Swal:{isLoading:()=>false,showValidationMessage:message=>{validation=message;},fire:async options=>{notices.push(options);if(options.preConfirm){const value=await options.preConfirm();return {isConfirmed:value!==false,value};}return {};}}};
            loadAdminScripts(sandbox);
            sandbox.fetchPatientRecords=()=>{refreshed++;};sandbox.loadArchivedPatients=()=>{refreshed++;};
            await sandbox[action==='archive'?'archivePatient':'restorePatient'](42);
            assert.equal(validation,failure==='http'?'Save rejected':'Connection lost');
            assert.equal(notices.length,1);assert.equal(refreshed,0);
        }
    }
});

test('PDF loading retries a failed plugin without downloading the core library again', async () => {
    const tags=[];const sandbox={window:{},document:{createElement:()=>({remove(){}}),head:{append:tag=>tags.push(tag)}}};
    vm.runInNewContext(script('pdf-export.js'),sandbox);
    const first=sandbox.window.HealthIntelPDF.ensure();
    assert.equal(tags.length,1);
    sandbox.window.jspdf={jsPDF:{API:{}}};tags[0].onload();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(tags.length,2);tags[1].onerror();
    await assert.rejects(first,/PDF tools could not load/);
    const retry=sandbox.window.HealthIntelPDF.ensure();
    assert.equal(tags.length,3);assert.match(tags[2].src,/autotable/);
    sandbox.window.jspdf.jsPDF.API.autoTable=()=>{};tags[2].onload();await retry;
    await sandbox.window.HealthIntelPDF.ensure();assert.equal(tags.length,3);
});

test('account and registry failures show errors without refreshing or reporting success', async () => {
    for (const failure of ['http','network','rejected']) {
        const notices=[];let refreshes=0;
        const sandbox={console,window:{addEventListener(){}},document:{getElementById(){return null;}},lucide:{createIcons(){}},
            fetch:async()=>{if(failure==='network')throw Error('Connection lost');return {ok:failure==='rejected',json:async()=>({success:false,error:'Change rejected'})};},
            Swal:{fire:async (...args)=>{notices.push(args);return {isConfirmed:true};}}};
        loadAdminScripts(sandbox);sandbox.loadUsers=()=>{refreshes++;};sandbox.loadDiseases=()=>{refreshes++;};
        await sandbox.denyUser('QA-PENDING');await sandbox.undoDeny('QA-PENDING');
        await sandbox.suspendUser('QA-BHW');await sandbox.restoreSuspended('QA-BHW');
        await sandbox.archiveDisease(42);await sandbox.restoreDisease(42);
        await new Promise(resolve=>setImmediate(resolve));
        assert.equal(refreshes,0);
        const errors=notices.filter(args=>args[2]==='error');assert.equal(errors.length,6);
        assert.ok(errors.every(args=>args[1]===(failure==='network'?'Connection lost':'Change rejected')));
        assert.ok(!notices.some(args=>args[2]==='success'||args[0]?.icon==='success'));
    }
});

test('catalog creation retains the form on rejected saves and submits only a trimmed name on success',async()=>{
    for(const outcome of ['http','rejected','network','success']) {
        const notices=[],elements={};let closes=0,refreshes=0,sent;
        const element=id=>elements[id]||=( {value:id==='new_disease_name'?'  Catalog Fixture  ':'',hidden:true,disabled:false,focus(){},setAttribute(){},removeAttribute(){}} );
        const sandbox={document:{getElementById:element},Swal:{fire:notice=>notices.push(notice)},closeModal:()=>closes++,
            fetch:async(url,options)=>{sent=JSON.parse(options.body);if(outcome==='network')throw Error('Connection lost');return {ok:outcome!=='http',json:async()=>outcome==='success'?{success:true}:{success:false,error:'Name already exists'}};}};
        vm.runInNewContext(script('admin-registry.js'),sandbox);
        sandbox.loadDiseases=()=>refreshes++;
        await sandbox.saveNewDisease();
        assert.deepEqual(sent,{name:'Catalog Fixture'});assert.equal(element('disease-save-button').disabled,false);
        if(outcome==='success'){assert.equal(closes,1);assert.equal(refreshes,1);assert.equal(notices[0].icon,'success');}
        else {assert.equal(closes,0);assert.equal(refreshes,0);assert.equal(notices.length,0);assert.equal(element('disease-form-error').hidden,false);assert.match(element('disease-form-error').textContent,/already exists|Connection lost/);}
    }
});

test('Google verification prevents competing popups and restores its button after failure', async () => {
    const elements={},dialogs=[];let requests=0,rejectPopup;
    const element=id=>elements[id] ||= {checked:true,disabled:false,style:{},listeners:{},attributes:{},addEventListener(name,handler){this.listeners[name]=handler;},setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];}};
    const sandbox={document:{getElementById:element},firebase:{auth:{GoogleAuthProvider:class {setCustomParameters(){}}}},
        auth:{signInWithPopup(){requests++;return new Promise((_,reject)=>{rejectPopup=reject;});}},Swal:{fire:value=>dialogs.push(value)}};
    vm.runInNewContext(script('index-registration.js'),sandbox);
    const button=element('btn-google-login'),click=()=>button.listeners.click({preventDefault(){}});
    click();click();assert.equal(requests,1);assert.equal(button.disabled,true);assert.equal(button.attributes['aria-busy'],'true');
    rejectPopup({code:'auth/popup-blocked'});await new Promise(resolve=>setImmediate(resolve));
    assert.match(dialogs.at(-1).text,/blocked the Google window/);assert.equal(button.disabled,false);assert.equal(button.attributes['aria-busy'],undefined);
    element('privacy-checkbox').checked=false;click();assert.equal(requests,1);
});

test('Purok suggestions are scoped, searchable and optional', () => {
    let barangay = 'Sta. Rosa';
    let list;
    function node() {
        const el = new EventTarget();
        const attributes = new Map();
        return Object.assign(el, {
            id: '', value: '', dataset: {}, children: [],
            setAttribute: (name, value) => attributes.set(name, value),
            getAttribute: name => attributes.get(name),
            removeAttribute: name => attributes.delete(name),
            replaceChildren(...items) { this.children = items; },
            append(element) { list = element; },
            closest: () => null,
            style: {},
            getBoundingClientRect: () => ({left:40, top:400, bottom:448, width:200}),
            scrollIntoView() {},
            remove() {},
        });
    }
    const input = node();
    input.id = 'sample-purok';
    const window = Object.assign(new EventTarget(), {HealthIntelText:{escape:String}, innerWidth:400, innerHeight:500});
    const scope = {window, document:{createElement:node, body:node()}, AbortController, Event};
    vm.runInNewContext(script('encoding-controls.js'), scope);
    scope.window.HealthIntelEncoding.bindPurokSuggestions(input, () => barangay);
    const type = value => { input.value = value; input.dispatchEvent(new Event('input')); };
    const key = value => {
        const event = new Event('keydown', {cancelable:true});
        Object.defineProperty(event, 'key', {value});
        input.dispatchEvent(event);
    };
    type('r');
    assert.equal(list.hidden, false);
    assert.equal(list.children[0].textContent, 'Purok Relocation');
    assert.equal(list.style.top, 'auto');
    assert.equal(list.style.bottom, '106px');
    key('ArrowDown');
    key('Enter');
    assert.equal(input.value, 'Purok Relocation');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    barangay = 'Caliban';
    type('sitio mi');
    assert.deepEqual(Array.from(list.children, el => el.textContent), ['Purok Mirasol (Sitio Mirasol)']);
    barangay = 'Salvacion';
    type('sen');
    assert.deepEqual(Array.from(list.children, el => el.textContent), ['Purok Señora']);
    type('Custom Zone 4');
    assert.equal(list.hidden, true);
    assert.equal(input.value, 'Custom Zone 4');
    barangay = '';
    type('r');
    assert.equal(list.hidden, true);
});
