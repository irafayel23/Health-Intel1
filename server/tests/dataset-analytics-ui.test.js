const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { loadDataset, aggregateDataset } = require('../services/dataset-analytics');
const source = fs.readFileSync(path.join(__dirname, '../../assets/js/shared/dataset-analytics.js'), 'utf8'), rows = loadDataset();
const settle = () => new Promise(resolve => setImmediate(resolve));
function harness(role) {
    const ids = new Map(), requests = [], charts = [];
    let fail = false, pending, refreshed = 0;
    class Element {
        constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.options = []; this.events = {}; this.attributes = {}; this.classes = new Set(); this.value = ''; this.textContent = ''; this.classList = { toggle: (key, on) => on ? this.classes.add(key) : this.classes.delete(key), contains: key => this.classes.has(key) }; }
        set id(value) { this._id = value; ids.set(value, this); } get id() { return this._id; }
        set innerHTML(html) { for (const [, tag, id] of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"/g)) { const e = new Element(tag); e.id = id; } ids.get('analytics-source').value = 'dataset'; }
        get firstChild() { return this.children[0]; }
        append(...nodes) { this.children.push(...nodes); } replaceChildren(...nodes) { this.children = nodes; }
        add(option) { this.options.push(option); if (this.options.length === 1) this.value = option.value; }
        addEventListener(event, callback) { this.events[event] = callback; }
        setAttribute(key, value) { this.attributes[key] = value; } removeAttribute(key) { delete this.attributes[key]; }
        createTHead() { return this.section(); } createTBody() { return this.section(); }
        section() { const section = new Element('section'); section.insertRow = () => { const row = new Element('tr'); section.append(row); return row; }; this.append(section); return section; }
        getContext() { return {}; }
    }
    const host = new Element('div'); host.id = 'dataset-analytics'; host.dataset.role = role;
    const operational = new Element('div'); operational.id = 'operational-analytics';
    const scope = { document: { getElementById: id => ids.get(id), createElement: tag => new Element(tag) }, URLSearchParams,
        Option: function(text, value) { return { text, value }; },
        Chart: function(_ctx, config) { this.config = config; this.destroy = () => { this.destroyed = true; }; this.resize = () => {}; charts.push(this); },
        initializeMunicipalAnalytics: () => { refreshed++; }, loadDashboardStats: () => { refreshed++; }, loadTrendChart: () => {},
        fetch: async url => { requests.push(url); if (pending) { const hold = pending; pending = null; await hold; } if (fail) return { ok: false, json: async () => ({ success: false }) }; const query = Object.fromEntries(new URL(url, 'http://fixture.invalid').searchParams); return { ok: true, json: async () => aggregateDataset(rows, query, role === 'bhw' ? 'Caliban' : undefined) }; }
    };
    vm.runInNewContext(source, scope);
    return { ids, requests, charts, operational, fail: () => { fail = true; }, delay: promise => { pending = promise; }, refreshed: () => refreshed };
}
for (const role of ['mho', 'bhw']) test(role + ' historical view renders labeled tables/charts, switches source, filters and clears failed results', async () => {
    const h = harness(role); await settle(); await settle();
    assert(h.operational.classes.has('hidden')); assert.match(h.ids.get('analytics-source-note').textContent, /Synthetic Historical Data/);
    assert.equal(h.ids.get('dataset-summary').children.length, 2);
    assert.equal(h.ids.get('dataset-charts').children.length, role === 'mho' ? 4 : 3);
    for (const chart of h.charts) assert(chart.config.data.datasets[0].data.every(Number.isInteger));
    if (role === 'bhw') { assert.equal(h.ids.get('dataset-barangay').disabled, true); assert.equal(h.ids.get('dataset-barangay').options.length, 1); assert(!h.requests[0].includes('barangay=')); }
    h.ids.get('analytics-source').value = 'operational'; h.ids.get('analytics-source').events.change();
    assert(!h.operational.classes.has('hidden')); assert(h.ids.get('dataset-panels').classes.has('hidden')); assert.equal(h.refreshed(), 1);
    h.ids.get('analytics-source').value = 'dataset'; h.ids.get('analytics-source').events.change();
    h.ids.get('dataset-year').value = '2026'; await h.ids.get('dataset-year').events.change();
    assert.match(h.ids.get('dataset-status').textContent, /2026-01 through 2026-09/);
    let release; h.delay(new Promise(resolve => { release = resolve; }));
    h.ids.get('dataset-year').value = '2023'; const older = h.ids.get('dataset-year').events.change();
    h.ids.get('dataset-year').value = '2025'; await h.ids.get('dataset-year').events.change(); release(); await older;
    assert.match(h.ids.get('dataset-status').textContent, /2025-01 through 2025-12/);
    h.fail(); await h.ids.get('dataset-year').events.change();
    assert.equal(h.ids.get('dataset-summary').children.length, 0); assert.equal(h.ids.get('dataset-charts').children.length, 0);
    assert.match(h.ids.get('dataset-status').textContent, /unavailable/);
    assert.equal(h.ids.get('dataset-panels').attributes['aria-busy'], undefined);
});
