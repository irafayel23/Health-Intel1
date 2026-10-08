const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
    const elements = new Map(), calls = [], timers = new Map();
    function element() {
        const classes = new Set();
        return { textContent: '', innerHTML: '', value: '', dataset: {}, attributes: {}, children: [],
            classList: { add: (...keys) => keys.forEach(k => classes.add(k)), remove: (...keys) => keys.forEach(k => classes.delete(k)), toggle: (key,on) => on ? classes.add(key) : classes.delete(key) },
            setAttribute(key,value) { this.attributes[key] = value; },
            append(child) { this.children.push(child); }, replaceChildren(...children) { this.children = children; this.textContent = ''; } };
    }
    const document = { createElement: element, getElementById(id) { if (!elements.has(id)) elements.set(id,element()); return elements.get(id); } };
    let timerId = 0;
    const context = vm.createContext({ document, AbortController, console,
        setTimeout(fn) { timers.set(++timerId,fn); return timerId; }, clearTimeout(id) { timers.delete(id); },
        lucide: { createIcons() {} }, HealthIntelEncoding: { conditionLabel: record => record.disease },
        fetch(url, options) { return new Promise(resolve => calls.push({ url, options, resolve })); } });
    context.window = context; context.currentBrgyId = 2;
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../../assets/js/bhw/bhw-records.js'),'utf8'),context);
    context.renderPatientsTable = data => { document.getElementById('patients-table-body').textContent = data.map(row => row.patient_name).join(','); };
    const answer = (index, data=[], ok=true) => calls[index].resolve({ ok, json: async()=>({ success:ok,data }) });
    const record = patient_name => ({ patient_name, disease:'Fixture disease' });
    return { context, document, calls, answer, record, timers };
}

test('BHW initial load failure exposes retry and a successful retry restores the list', async () => {
    const f=fixture(), pending=f.context.loadPatients();
    assert.equal(f.document.getElementById('patient-load-status').dataset.state,'loading');
    assert.equal(f.document.getElementById('main-patient-table').attributes['aria-busy'],'true');
    f.answer(0,[],false); await pending;
    assert.equal(f.document.getElementById('patient-load-status').dataset.state,'error');
    assert.equal(f.document.getElementById('patient-load-retry').hidden,false);
    const retry=f.context.retryPatientLoad(); f.answer(1,[f.record('Synthetic patient')]); await retry;
    assert.equal(f.document.getElementById('patients-table-body').textContent,'Synthetic patient');
    assert.equal(f.document.getElementById('patient-load-status').dataset.state,'ready');
    assert.equal(f.document.getElementById('main-patient-table').attributes['aria-busy'],'false');
});

test('BHW failed refresh keeps the last loaded rows and identifies them as stale', async () => {
    const f=fixture(), initial=f.context.loadPatients(); f.answer(0,[f.record('Last loaded patient')]); await initial;
    const refresh=f.context.loadPatients();
    assert.equal(f.document.getElementById('patients-table-body').textContent,'Last loaded patient');
    f.answer(1,[],false); await refresh;
    assert.equal(f.document.getElementById('patients-table-body').textContent,'Last loaded patient');
    assert.match(f.document.getElementById('patient-load-message').textContent,/last loaded list/);
});

test('BHW navigation coalesces pending reads but a save refresh supersedes outdated data', async () => {
    const f=fixture(), old=f.context.loadPatients({coalesce:true});
    assert.equal(f.context.loadPatients({coalesce:true}),old); assert.equal(f.calls.length,1);
    const fresh=f.context.loadPatients(); assert.equal(f.calls.length,2); assert.equal(f.calls[0].options.signal.aborted,true);
    f.answer(1,[f.record('Newly saved patient')]); await fresh;
    f.answer(0,[f.record('Outdated patient')]); await old;
    assert.equal(f.document.getElementById('patients-table-body').textContent,'Newly saved patient');
    assert.equal(f.timers.size,0);
});

test('BHW switches to archived rows without displaying a late active-list response', async () => {
    const f=fixture(), active=f.context.loadPatients();
    f.context.toggleArchiveView();
    assert.equal(f.calls.length,2); assert.match(f.calls[1].url,/patients\/archived\?barangay_id=2$/);
    f.answer(1,[f.record('Archived patient')]); await f.context.loadArchivedPatients({coalesce:true});
    f.answer(0,[f.record('Active patient')]); await active;
    assert.equal(f.document.getElementById('patients-table-body').textContent,'Archived patient');
    assert.equal(f.document.getElementById('patient-load-status').dataset.state,'ready');
});
