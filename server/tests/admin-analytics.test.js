'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createAdminAnalytics, readUpload } = require('../services/admin-analytics');
const { DISEASES } = require('../services/monthly-data');
const { rules } = require('../middleware/access-control');

const header = 'Date,Barangay,Disease,Cases';
const october = '2026-10,Alegria,Cough,0';
const current = '2026-12';
const csv = lines => [header, ...lines].join('\n');

test('Admin CSV validation preserves zeros and rejects duplicates, current months and unsafe rows', () => {
    assert.equal(readUpload(csv([october]), current)[0].Cases, 0);
    assert.throws(() => readUpload(csv([october, october]), current), /Duplicate/);
    assert.throws(() => readUpload(csv(['2026-12,Alegria,Cough,0']), current), /completed month/);
    assert.throws(() => readUpload(csv(['2026-10,Alegria,Cough,-1']), current), /whole case count/);
    assert.throws(() => readUpload(csv(['2026-10,Other,Cough,1']), current), /Unknown barangay/);
    assert.throws(() => readUpload(csv(['2026-10,Alegria,<script>,1']), current), /Unknown disease/);
    assert.equal(readUpload(header + ',Source\n' + october + ',Confirmed operational reports', current)[0].Source,'Uploaded, unverified');
});

test('Admin preview and export keep historical, confirmed, incomplete and missing values distinct', async () => {
    const counts = Object.fromEntries(DISEASES.map(name => [name,0]));
    const operational = {
        reports: async month => month === '2026-10' ? [
            {barangay:'Alegria',confirmed:true,pending:0,total:0,counts},
            {barangay:'Blumentritt',confirmed:false,pending:0,total:0,counts}
        ] : [],
        publicationStatus: async () => ({publication:null})
    };
    const directory = await fs.mkdtemp(path.join(os.tmpdir(),'hi-admin-dataset-'));
    const db = { execute: async () => [[]] };
    const api = createAdminAnalytics(db, operational, {directory,now:() => new Date('2026-12-15T12:00:00Z')});
    try {
        const history = (await api.datasets()).bundled;
        assert.equal(history.first, '2023-01');
        assert.equal(history.last, '2026-10');
        assert.equal(history.cases, 6200);
        assert.deepEqual(history.gaps, ['2026-11']);
        assert.deepEqual(history.partial, ['2026-10']);
        const exportCsv = await api.exportCsv();
        assert.match(exportCsv,/2026-10,Alegria,Cough,0,Confirmed operational reports/);
        assert.doesNotMatch(exportCsv,/2026-10,Blumentritt/);
        const map = await api.map({period:'2026-10',disease:'Cough'});
        assert.deepEqual(map.rows.map(row=>row.cases),[0,null]);

        const raw = csv([october]);
        const preview = api.preview(raw);
        assert.equal((await api.datasets()).versions.length,0);
        await assert.rejects(api.save(raw, 'wrong', {system_id:'ADM-TEST',role:'admin'}),/changed/);
        const saved = await api.save(raw,preview.id,{system_id:'ADM-TEST',role:'admin'});
        assert.equal(saved.id, preview.id);
        assert.equal((await api.save(raw,preview.id,{system_id:'ADM-TEST',role:'admin'})).id, saved.id);
        assert.equal((await api.datasets()).versions.length,1);
    } finally {
        const folder = path.join(directory,'datasets');
        for (const file of await fs.readdir(folder).catch(() => [])) {
            assert.match(file,/^[a-f0-9]{64}\.json$/);
            await fs.unlink(path.join(folder,file));
        }
        await fs.rmdir(folder).catch(error => { if(error.code !== 'ENOENT') throw error; });
        await fs.rmdir(directory);
    }
});

test('Admin-only routes and the existing MHO and BHW boundaries stay separate', () => {
    for (const [method,path] of [
        ['GET','/admin/analytics/historical.csv'],['GET','/admin/analytics/heatmap'],
        ['POST','/admin/analytics/datasets/save'],['POST','/admin/analytics/predictions/runs']
    ]) {
        const rule = rules.find(([verb, pattern]) => verb === method && pattern.test(path));
        assert.deepEqual(rule[2], ['admin']);
    }
    const permitted = (method, path) => rules.find(([verb, pattern]) => verb === method && pattern.test(path))?.[2];
    const run = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    for (const action of ['reports', 'runs', 'runs/' + run + '/probability', 'publish']) {
        assert.deepEqual(permitted('POST','/admin/operational-predictions/' + action), ['admin']);
        assert.equal(permitted('POST','/mho/operational-predictions/' + action), undefined);
    }
    assert.deepEqual(permitted('GET','/mho/operational-predictions/prediction'), ['mho']);
    assert.deepEqual(permitted('GET','/bhw/operational-predictions/prediction'), ['bhw']);
});

test('only Admin can confirm reports, start runs, prepare probabilities and publish', async () => {
    const { registerMonthlyPredictionRoutes } = require('../routes/monthly-prediction-routes');
    const routes = new Map();
    const app = {
        get: (route, ...handlers) => routes.set('GET ' + route, handlers.at(-1)),
        post: (route, ...handlers) => routes.set('POST ' + route, handlers.at(-1))
    };
    const calls = [];
    const service = Object.fromEntries(['confirm','start','prepareProbability','publish'].map(action => [action, (...args) => {
        calls.push({ action, role: args.at(-1).role });
        return { action };
    }]));
    registerMonthlyPredictionRoutes(app, {}, service);
    const paths = [
        ['confirm','/reports'], ['start','/runs'], ['prepareProbability','/runs/:id/probability'], ['publish','/publish']
    ];
    for (const [action, path] of paths) {
        assert.equal(routes.has('POST /api/mho/operational-predictions' + path), false);
        const handler = routes.get('POST /api/admin/operational-predictions' + path);
        for (const role of ['mho','bhw','superadmin','admin']) {
            const res = { code:200, set() {}, status(code) { this.code=code; return this; }, json(data) { this.data=data; } };
            await handler({ user:{role}, body:{}, params:{id:'fixture-run'} }, res);
            assert.equal(res.code, role === 'admin' ? 200 : 403);
            if (role === 'admin') assert.equal(res.data.data.action, action);
        }
    }
    assert.deepEqual(calls, paths.map(([action]) => ({action,role:'admin'})));
    assert.equal(routes.has('GET /api/mho/operational-predictions/prediction'), true);
});
