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
    for(const [,name] of html.matchAll(/<script src="assets\/js\/(admin\/admin-[^"]+\.js)"><\/script>/g)) {
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

test('Admin searches exact Case IDs and displays actionable audit references safely', () => {
    const elements = {'audit-table-body':{innerHTML:''},'audit-pagination':{classList:{remove(){},add(){}}},'audit-page-info':{},'audit-page-buttons':{}};
    const sandbox = {console,lucide:{createIcons(){}},window:{addEventListener(){}},document:{getElementById:id=>elements[id]},HealthIntelText:null};
    vm.runInNewContext(script('safe-text.js'),sandbox);sandbox.HealthIntelText=sandbox.window.HealthIntelText;
    loadAdminScripts(sandbox);
    assert.equal(sandbox.matchesCaseSearch({id:5257,patient_name:'Fixture'},'REC-5257'),true);
    assert.equal(sandbox.matchesCaseSearch({id:5257,patient_name:'Fixture'},'#REC-5257'),true);
    assert.equal(sandbox.matchesCaseSearch({id:5257,patient_name:'Fixture'},'5257'),true);
    assert.equal(sandbox.matchesCaseSearch({id:52570,patient_name:'Fixture'},'REC-5257'),false);
    vm.runInNewContext(`allAuditLogs=[{case_id:5257,action:'Patient Encoded',user_id:'QA-BHW',role:'BHW',created_at:'2026-09-30T00:00:00Z',details:JSON.stringify({case_id:5257,summary:'Created case <unsafe>'})},{case_id:null,action:'Patient Encoded',user_id:'QA-BHW',role:'BHW',created_at:'2026-09-30T00:00:00Z',details:'Older encoding'}];renderAuditTable();`,sandbox);
    assert.match(elements['audit-table-body'].innerHTML,/viewAdminCase\(5257,true\)/);
    assert.match(elements['audit-table-body'].innerHTML,/Created case &lt;unsafe&gt;/);
    assert.doesNotMatch(elements['audit-table-body'].innerHTML,/Historical entry: no recorded Case ID/);
    assert.match(elements['audit-table-body'].innerHTML,/Older encoding/);
    assert.equal((elements['audit-table-body'].innerHTML.match(/viewAdminCase\(/g)||[]).length,1);
    assert.doesNotMatch(elements['audit-table-body'].innerHTML,/viewAdminCase\(null/);
});

test('Admin case links select the correct records tab and explain missing resident profiles', async () => {
    for (const archived of [false,true]) {
        let dialog, selectedView, selectedTab, focused = false;
        const elements = Object.fromEntries(['filter-table-brgy','filter-table-disease','filter-table-status','search-patient','search-archived-patient'].map(id=>[id,{value:''}]));
        elements['admin-case-row-5257']={classList:{add(){focused=true;}},scrollIntoView(){}};
        const sandbox = {console,lucide:{createIcons(){}},window:{addEventListener(){}},document:{getElementById:id=>elements[id]},
            fetch:async()=>({ok:true,json:async()=>({success:true,case:{id:5257,is_archived:archived,resident_id:archived?42:null,patient_name:'Fixture',encoded_by:'QA-BHW'},history:[]})}),
            Swal:{fire:async value=>{dialog=value;return {};}}};
        vm.runInNewContext(script('safe-text.js'),sandbox);sandbox.HealthIntelText=sandbox.window.HealthIntelText;
        loadAdminScripts(sandbox);
        sandbox.fetchPatientRecords=async()=>{};sandbox.loadArchivedPatients=async()=>{};
        sandbox.switchMainView=(view)=>{selectedView=view;};sandbox.switchSubView=(_,tab)=>{selectedTab=tab;};
        sandbox.filterData=()=>{};sandbox.filterArchivedPatients=()=>{};
        await sandbox.viewAdminCase(5257,true);
        assert.equal(dialog.title,'Case #REC-5257');
        assert.equal(selectedView,'view-data');assert.equal(selectedTab,archived?'archived':'active');
        assert.equal(elements[archived?'search-archived-patient':'search-patient'].value,'REC-5257');
        assert.equal(focused,true);assert.equal(dialog.showDenyButton,true);
        assert.doesNotMatch(dialog.html,/No verified resident link/);
        if(archived)assert.match(dialog.html,/RES-42/);
        else assert.match(dialog.html,/This case is not linked to a resident profile\./);
    }
});

test('Admin scripts load in HTML order and initialize all feature views with existing hooks', async () => {
    const elements = {}, events = {}, requests = [], errors = [];
    const sandbox = {console:{error:(...args)=>errors.push(args)},lucide:{createIcons(){}},window:{addEventListener:(name,fn)=>{events[name]=fn;}},
        document:{getElementById:id=>elements[id] ||= {value:'',innerHTML:'',classList:{add(){},remove(){}}}},
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
    let residents = [];
    const sandbox = { lucide:{createIcons(){}}, console, window:{ currentBrgyId:1, addEventListener:(name,fn)=>{events[name]=fn;} },
        document:{ querySelectorAll:selector=>selector.includes('nav-menu')?[button]:[], addEventListener(){}, getElementById:id=>id==='directory-search'?{value:''}:id==='resident-grid'?grid:null },
        escapeText:value=>String(value), fetch:async url=>{requests.push(url);return {json:async()=>({success:true,data:residents})};} };
    vm.runInNewContext(script('safe-text.js'),sandbox);
    vm.runInNewContext(script('encoding-controls.js'),sandbox);sandbox.HealthIntelEncoding=sandbox.window.HealthIntelEncoding;
    const bhwHtml = fs.readFileSync(path.join(__dirname,'../../bhw.html'),'utf8');
    for (const [,name] of bhwHtml.matchAll(/<script src="assets\/js\/(bhw\/bhw-(?:records|residents|dashboard|startup)\.js)"><\/script>/g)) {
        vm.runInNewContext(script(name),sandbox,{filename:name});
    }
    await sandbox.loadResidentDirectory();
    assert.match(grid.innerHTML,/No residents found/);
    residents = [{id:42,patient_name:'Disposable Directory',age:26,purok:'QA Zone',case_count:1}];
    await events['health-intel:cases-changed']();
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
