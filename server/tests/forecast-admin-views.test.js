const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const board = fs.readFileSync(path.join(__dirname, '../../assets/js/shared/forecast-board.js'), 'utf8');
const draft = { id: '11111111-1111-4111-8111-111111111111', status: 'ready', cutoff: '2026-10' };
const current = { id: '22222222-2222-4222-8222-222222222222', status: 'published', cutoff: '2026-09' };
const earlier = { id: '33333333-3333-4333-8333-333333333333', status: 'published', cutoff: '2026-08' };
const settle = () => new Promise(resolve => setImmediate(resolve));

function workspace(role, response) {
    const calls = [], navigation = [];
    class Element {
        constructor(tag = 'div') {
            Object.assign(this, { tag, children: [], handlers: {}, dataset: {}, value: '', hidden: false, classes: new Set() });
            this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) };
        }
        append(...nodes) { this.children.push(...nodes); }
        replaceChildren(...nodes) { this.children = nodes; }
        add(option) { if (!this.children.length) this.value = option.value; this.append(option); }
        addEventListener(type, fn) { this.handlers[type] = fn; }
        focus() { this.focused = true; }
        setAttribute() {}
        removeAttribute() {}
        getClientRects() { return [{}]; }
        closest() { return this; }
    }
    const host = new Element();
    host.dataset.forecastBoard = role;
    vm.runInNewContext(board, {
        window: { HealthIntelAdminAnalytics: { openTab: tab => navigation.push(tab) } },
        document: { querySelector: () => host, createElement: tag => new Element(tag) },
        Option: function(text, value) { return { text, value }; },
        MutationObserver: class { observe() {} }, URLSearchParams, AbortSignal,
        fetch: async rawUrl => {
            const url = new URL(rawUrl);
            calls.push(url);
            const result = await response(url);
            return { ok: !result.error, status: result.status || 200, json: async () => result };
        }
    });
    return {
        calls, navigation,
        source: () => host.children[0].children[0].children[0],
        version: () => host.children[0].children[1],
        meta: () => host.children[0].children.at(-1),
        panel: () => host.children[1].children[0],
        actions: () => host.children[1].children[0].children[2].children
    };
}

test('an absent publication with a saved draft is an empty state and the primary action opens that exact draft', async () => {
    const view = workspace('admin', url => url.pathname.endsWith('/versions')
        ? { success: true, data: { active: null, versions: [draft] } }
        : { success: false, error: 'Fixture boundary', status: 503 });
    await settle();
    assert.equal(view.calls.length, 1, 'an absent publication needs no overview request');
    assert.equal(view.panel().children[0].textContent, 'No predictions published yet');
    assert.equal(view.panel().dataset.state, 'empty');
    assert.equal(view.version().hidden, true);
    assert.deepEqual(view.actions().map(action => action.textContent), ['View latest draft', 'View predictive preview']);
    await view.actions()[0].handlers.click();
    assert.equal(view.source().value, 'draft');
    assert.equal(view.source().focused, true);
    assert.equal(view.calls.at(-1).searchParams.get('source'), 'published');
    assert.equal(view.calls.at(-1).searchParams.get('version'), draft.id);
});

test('without saved drafts Admin can open training or the explicitly labelled demonstration', async () => {
    const view = workspace('admin', url => url.pathname.endsWith('/versions')
        ? { success: true, data: { active: null, versions: [] } }
        : { success: false, error: 'Fixture boundary', status: 503 });
    await settle();
    assert.deepEqual(view.actions().map(action => action.textContent), ['Go to Model Training', 'View predictive preview']);
    view.actions()[0].handlers.click();
    assert.deepEqual(view.navigation, ['training']);
    await view.actions()[1].handlers.click();
    assert.equal(view.source().value, 'demo');
    assert.equal(view.calls.at(-1).searchParams.toString(), 'source=demo');
    assert.equal(view.calls.length, 2, 'the demonstration does not request publication versions');
});

test('published views retain the active pointer and only list other previously issued versions', async () => {
    const view = workspace('admin', url => url.pathname.endsWith('/versions')
        ? { success: true, data: { active: current.id, versions: [draft, current, earlier] } }
        : { success: false, error: 'Fixture boundary', status: 503 });
    await settle();
    assert.equal(view.version().hidden, false);
    const versionSelect = view.version().children[0];
    assert.deepEqual(versionSelect.children.map(item => item.value), ['', earlier.id]);
    assert.equal(view.calls.at(-1).searchParams.toString(), 'source=published');
    versionSelect.value = earlier.id;
    versionSelect.handlers.change();
    await settle();
    assert.equal(view.calls.at(-1).searchParams.get('version'), earlier.id);
});

test('a real read failure provides retry, and non-Admin publication requests keep automatic source selection', async () => {
    let available = false;
    const view = workspace('admin', () => available
        ? { success: true, data: { active: null, versions: [] } }
        : { success: false, error: 'Fixture dependency failed', status: 503 });
    await settle();
    assert.equal(view.panel().dataset.state, 'error');
    assert.deepEqual(view.actions().map(action => action.textContent), ['Retry']);
    available = true;
    view.actions()[0].handlers.click();
    await settle();
    assert.equal(view.panel().dataset.state, 'empty');
    for (const role of ['mho', 'bhw']) {
        const scoped = workspace(role, () => ({ success: false, error: 'No publication', code: 'OPERATIONAL_PREDICTIONS_UNPUBLISHED', status: 409 }));
        await settle();
        assert.equal(scoped.calls.length, 1);
        assert.equal(scoped.calls[0].searchParams.toString(), 'source=auto');
        assert.equal(scoped.meta().textContent, 'No operational predictions are published yet.');
    }
});
