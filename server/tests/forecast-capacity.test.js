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
            if (name === '../services/analytics-sample') return { sampleAnalytics: () => ({}) };
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

test('retired endpoint never starts a worker for repeated requests', async()=>{
    const f=fixture();const responses=await Promise.all(Array.from({length:20},()=>f.request()));
    assert.equal(f.children.length,0);
    assert.ok(responses.every(r=>r.statusCode===410&&r.body.code==='LEGACY_PREDICTION_RETIRED'));
});
