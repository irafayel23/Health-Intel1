'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const D = require('../services/monthly-data');
const H = require('../services/forecast-horizons');
const CMP = require('../services/operational-cmp');
const { createForecastDemo } = require('../services/forecast-overview');
const baseline = require('../data/seasonal-sarima-6200/snapshot.json');
const extension = require('../data/seasonal-sarima-6200/multihorizon-demo.json');
const access = require('../middleware/access-control');
const sample = createForecastDemo();

test('verified demo has all 70 scopes and 280 estimates, with the exact primary baseline and research metrics', () => {
    const normal = sample('demo');
    const delayed = sample('delayed');
    assert.equal(normal.rows.length, 70);
    assert.equal(delayed.rows.length, 70);
    const wanted = [[626,563,.492066],[625,556,.542424],[626,549,.552405],[627,548,.562377]];
    for (const [index, [available,hits,mae]] of wanted.entries()) {
        const h = index+1;
        const rows = normal.rows.flatMap(r => r.performance.find(p => p.horizon===h).rows);
        const result = require('../services/seasonal6200-sarima-demo').metrics(rows);
        assert.equal(result.attempted,630);
        assert.equal(result.available,available);
        assert.equal(result.within_tolerance_hits,hits);
        assert.ok(Math.abs(result.MAE-mae)<1e-6);
    }
    for (const [i,row] of normal.rows.entries()) {
        const other = delayed.rows[i];
        const original = baseline.scopes.find(s => s.disease===row.disease&&s.barangay===row.barangay);
        const expected = extension.rows.find(s => s.disease===row.disease&&s.barangay===row.barangay);
        assert.equal(row.estimates[0].mean,original.outputs.at(-1).sarima.prediction);
        assert.deepEqual([...row.estimates,...other.estimates].map(r => r.mean),[1,2,3,2,3,4].map(h => expected.estimates[h]));
        assert.equal(other.history.at(-1).month,'2026-09');
        assert.equal(other.estimates.at(-1).target,'2027-01');
    }
    const late = sample('delayed','Salvacion','2027-01');
    assert.deepEqual(late.rows[0].estimates.map(e=>e.status),['available','outside','outside']);
    assert.ok(late.rows.every(r => r.estimates.slice(1).every(e=>e.mean===null&&e.probability===null)));
});

test('the previous-month cell reuses Horizon 1 and keeps the missing month out of actual history', () => {
    const normal = sample('demo', 'Alegria');
    const delayed = sample('delayed', 'Alegria');
    assert.equal(normal.previous_target, null);
    assert.deepEqual(delayed.previous_target, { ...normal.targets[0], previous: true });
    assert.equal(delayed.previous_target.target, delayed.missing);
    assert.deepEqual(delayed.targets.map(target => target.horizon), [2, 3, 4]);
    for (const [index, row] of delayed.rows.entries()) {
        assert.deepEqual(row.previous_estimate, normal.rows[index].estimates[0]);
        assert.ok(!row.history.some(observation => observation.month === delayed.missing));
    }
});

test('planning rules use the selected forecast month and leave missing comparisons unavailable', () => {
    const { prediction } = require('../../assets/js/mho/mho-action-guidance');
    const view = { disease: 'Cough', barangay: 'Alegria', production: { 1: { target: '2026-10' } } };
    const original = prediction(view, 4.48, 0);
    assert.deepEqual(original.map(rule => rule.id), ['R2', 'R3', 'R5']);
    assert.match(original[0].reason, /October 2026/);
    const later = prediction(view, 4.56, undefined, '2026-12');
    assert.deepEqual(later.map(rule => rule.id), ['R2']);
    assert.match(later[0].reason, /December 2026/);
    assert.match(later[0].action, /Alegria/);
    assert.deepEqual(prediction(view, null, undefined, '2026-12'), []);
});

test('all BHW assignments restrict the resulting history, forecasts and scoped probabilities', () => {
    for (const barangay of D.BARANGAYS) {
        const board = sample('delayed', barangay);
        assert.equal(board.barangay, barangay);
        assert.equal(board.rows.length, 10);
        assert.ok(board.rows.every(row => row.barangay===barangay));
    }
    for (const role of ['admin','mho','bhw']) {
        const url='/'+role+'/operational-predictions/overview';
        assert.deepEqual(access.rules.find(([method, regex]) => method==='GET'&&regex.test(url))[2],[role]);
    }
});

test('target-month comparisons require complete reports and preserve the original issued estimate', () => {
    const forecast=[{disease:'Cough',barangay:'Alegria',horizon:3,prediction:1.75}];
    const reports=D.BARANGAYS.map(barangay=>({barangay,confirmed:true,pending:0,counts:{Cough:0}}));
    assert.deepEqual(H.outcomesFor('2026-12',forecast,reports.slice(1),'2026-10-10Z').rows,[]);
    assert.equal(H.outcomesFor('2026-12',forecast,reports,'2027-01-02Z').status,'no_prior_issue');
    const comparison=H.outcomesFor('2026-12',forecast,reports,'2026-10-10Z');
    assert.equal(comparison.status,'issued_before_target');
    assert.deepEqual(comparison.rows[0],{...forecast[0],actual:0,absolute_error:1.75,within_tolerance:false});
});

test('new probability versions bind four separate histories to their exact horizons and targets', () => {
    const input={forecast_format:H.FORMAT,policy_sha256:'policy',cutoff:'2026-09',target:'2026-10'};
    const fit={usable:true,prediction:1,forecast_steps:[null,...[2,3,4].map(h=>({horizon:h,prediction:h,raw_prediction:h,lower:0,upper:8}))]};
    const output={scopes:[{disease:'Cough',barangay:'Alegria',history:[1,2,4,5,6,7],outputs:[{n:2,sarima:fit},{n:3,sarima:fit},{n:4,sarima:fit},{n:5,sarima:fit}]}]};
    const forecasts=Object.fromEntries(H.HORIZONS.map(h=>[h,{prediction:h,actual_model:'SARIMA'}]));
    const verified={input,output,result:{views:{[H.keyFor('Cough','Alegria')]:{production:forecasts}}}};
    const pairs=CMP.earlierPairs(verified);
    assert.deepEqual(pairs.map(r=>r.prior_pairs.map(p=>p.y)),[[4,5,6,7],[5,6,7],[6,7],[7]]);
    const packet={schema:2,binding:CMP.binding('fixture',verified),review:{genuine_history_reviewed:true,outcomes_unknown:true,reviewed_by:'Admin fixture',reviewed_at:'2026-10-12T00:00:00Z'},rows:pairs.map(r=>({disease:r.disease,barangay:r.barangay,horizon:r.horizon,target:r.target,mean:r.mean,reason:'insufficient_prior_prediction_pairs'}))};
    CMP.validatePacket(packet,'fixture',verified);
    packet.rows[2].target='2026-11';
    assert.throws(()=>CMP.validatePacket(packet,'fixture',verified),/target/);
});

test('frozen baseline artifacts still match the issued research manifests', () => {
    for(const [dir,file,hash] of [
        ['seasonal-sarima-6200','snapshot.json','bf574e642abdee4813b08d62179daf693c3929d56646afd5d099ed966bb561ac'],
        ['seasonal-sarima-6200','SYNTHETIC_monthly.csv','49b4ca92eff35bc574b61f46cde982a35b4d843b84d71228158e1941829c84e7'],
        ['conditional-cmp-6200','results.json','bcce83fde73fd60017d3a6c5e2c61b8e0bc3b54ded8963c4a68a21a716d4a9e4']
    ]) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../data/'+dir+'/'+file))).digest('hex'),hash);
});


test('automatic viewer selection replays the demo only with an opt-in and no published version', async () => {
    const { registerMonthlyPredictionRoutes } = require('../routes/monthly-prediction-routes');
    const routes = new Map();
    const app = { get: (url, handler) => routes.set(url, handler), post() {} };
    const code = 'OPERATIONAL_PREDICTIONS_UNPUBLISHED';
    const unavailable = Object.assign(new Error('Unpublished'), { status: 409, code });
    const broken = Object.assign(new Error('Integrity check failed'), { status: 409 });
    const published = { status: 'published' };
    const saved = { NODE_ENV: process.env.NODE_ENV, ENABLE_SARIMA_DEMO: process.env.ENABLE_SARIMA_DEMO };
    let result = unavailable;
    const service = { overview: async () => {
        if (result instanceof Error) throw result;
        return result;
    } };
    const db = { execute: async () => [[{ name: 'Alegria' }]] };
    async function load(role) {
        let response;
        const res = { set() {}, status() { return this; }, json(value) { response = value; } };
        const request = { user: { role, barangay_id: 1 }, query: { source: 'auto' } };
        await routes.get('/api/' + role + '/operational-predictions/overview')(request, res);
        return response;
    }
    try {
        process.env.NODE_ENV = 'production';
        process.env.ENABLE_SARIMA_DEMO = 'true';
        registerMonthlyPredictionRoutes(app, db, service);
        assert.equal((await load('mho')).data.status, 'demonstration');
        const bhw = (await load('bhw')).data;
        assert.equal(bhw.status, 'demonstration');
        assert.equal(bhw.barangay, 'Alegria');
        assert.ok(bhw.rows.every(row => row.barangay === 'Alegria'));

        result = published;
        assert.equal((await load('mho')).data, published);
        result = broken;
        assert.equal((await load('mho')).success, false);
        result = unavailable;
        process.env.ENABLE_SARIMA_DEMO = 'false';
        assert.equal((await load('mho')).code, code);
    } finally {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
});
