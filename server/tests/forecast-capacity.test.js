const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const vm = require('node:vm');
const { createForecastCapacity } = require('../services/forecast-capacity');

function fixture() {
    const children = [], routes = new Map();
    const module = { exports: {} };
    const source = fs.readFileSync(require.resolve('../routes/analytics-routes'), 'utf8');
    vm.runInNewContext(source, {
        module, process: { env: {} }, __dirname: __dirname, console,
        setTimeout, clearTimeout,
        require(name) {
            if (name === '../services/forecast-capacity') return { createForecastCapacity };
            if (name === '../services/dashboard-data') return { createDashboardData: () => ({
                forecastSelections: async () => ({ places: [{}], categories: [{}] })
            }) };
            if (name === '../services/disease-registry') return {
                createDiseaseRegistryHandlers: () => ({}), createDiseaseRegistryData: () => ({})
            };
            if (name === '../services/mho-analytics') return {};
            if (name === 'child_process') return { spawn() {
                const child = new EventEmitter();
                child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
                child.kill = () => { child.killed = true; };
                children.push(child); return child;
            } };
            throw Error('Unexpected dependency: ' + name);
        }
    });
    module.exports.registerAnalyticsRoutes({
        get: (route, handler) => routes.set(route, handler), post() {}, put() {}
    }, {}, 'test-python');
    async function request() {
        const res = new EventEmitter(); res.headers = {}; res.statusCode = 200;
        res.set = (name, value) => { res.headers[name] = value; return res; };
        res.status = code => { res.statusCode = code; return res; };
        res.json = payload => { res.body = payload; return res; };
        await routes.get('/api/predict')({ query: { disease: 'Synthetic', barangay: 'Fixture' } }, res);
        return res;
    }
    return { children, request };
}

test('forecast capacity rejects invalid limits and duplicate release cannot create extra slots', () => {
    for (const value of [0, 5, NaN, 1.5]) assert.throws(() => createForecastCapacity(value));
    const gate = createForecastCapacity(1), release = gate.acquire();
    assert.equal(gate.acquire(), null); release(); release();
    assert.ok(gate.acquire()); assert.equal(gate.acquire(), null);
});

test('simultaneous requests start one worker; completion permits the next request', async () => {
    const f = fixture();
    const responses = await Promise.all(Array.from({ length: 20 }, () => f.request()));
    assert.equal(f.children.length, 1);
    assert.equal(responses.filter(r => r.statusCode === 503).length, 19);
    assert.equal(responses[1].headers['Retry-After'], '5');
    f.children[0].stdout.emit('data', '{"success":true}'); f.children[0].emit('close', 0);
    assert.equal(responses[0].body.success, true);
    await f.request(); assert.equal(f.children.length, 2);
    f.children[1].emit('close', 1);
});

test('disconnected and failed workers hold capacity until exit, then recover', async () => {
    const f = fixture(), first = await f.request();
    first.emit('close'); assert.equal(f.children[0].killed, true);
    assert.equal((await f.request()).statusCode, 503);
    f.children[0].emit('close', 1);
    const second = await f.request();
    f.children[1].emit('error', Error('spawn failed'));
    assert.equal(second.statusCode, 503);
    f.children[1].emit('close', -1);
    await f.request(); assert.equal(f.children.length, 3);
    f.children[2].emit('close', 1);
});
