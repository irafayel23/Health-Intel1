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
        assert.equal(history.latestConfirmed, '2026-10');
        assert.equal(history.latestComplete, null);
        assert.equal(history.cases, 6200);
        assert.deepEqual(history.gaps, ['2026-11']);
        assert.deepEqual(history.partial, ['2026-10']);
        const exportCsv = await api.exportCsv();
        assert.equal(exportCsv.split(/\r?\n/)[0],'Date,Barangay,Disease,Cases');
        assert.match(exportCsv,/2026-10,Alegria,Cough,0(?:\r?\n|$)/);
        assert.doesNotMatch(exportCsv,/Synthetic demonstration|Confirmed operational reports/);
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
        assert.equal((await api.datasets()).versions[0].trainingRange,null);
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


test('saved CSV versions train previews using only the verified upload and cannot be published', async t => {
    const { EventEmitter } = require('node:events');
    const { createMonthlyPredictions } = require('../services/monthly-predictions');
    const D = require('../services/monthly-data');
    const snapshot = require('../data/seasonal-sarima-6200/snapshot.json');
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'hi-upload-training-'));
    assert.equal(path.dirname(directory), os.tmpdir());
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const now = () => new Date('2026-11-15T12:00:00Z');
    const user = {system_id:'ADM-TEST',role:'admin'};
    const runs = new Map();
    const db = {
        async getConnection() { return db; },
        async query(sql) {
            if (sql.includes('GET_LOCK')) return [[{acquired:1}]];
            if (sql.includes('RELEASE_LOCK')) return [[]];
            if (sql.includes('prediction_publications')) return [[]];
            if (sql.includes('prediction_runs')) return [[...runs.values()]];
            throw Error(sql);
        },
        async execute(sql, params) {
            if (sql.includes('system_audit_logs')) return [[]];
            if (sql.startsWith('SELECT * FROM prediction_runs WHERE input_hash=')) {
                return [[...runs.values()].filter(run => run.input_hash === params[0] && run.status === 'ready')];
            }
            if (sql.startsWith('SELECT * FROM prediction_runs WHERE id=')) return [[runs.get(params[0])]];
            if (sql.startsWith('INSERT INTO prediction_runs')) {
                const [id,start_month,cutoff,input_hash] = params;
                runs.set(id,{id,start_month,cutoff,input_hash,status:'queued'});
                return [[]];
            }
            if (sql.includes("SET status='running'")) {
                Object.assign(runs.get(params[1]),{status:'running',worker_pid:params[0]});
                return [[]];
            }
            if (sql.includes("SET status='ready'")) {
                Object.assign(runs.get(params[1]),{status:'ready',output_hash:params[0],worker_pid:null});
                return [[]];
            }
            throw Error(sql);
        },
        async beginTransaction() {}, async commit() {}, async rollback() {}, release() {}
    };
    const analytics = createAdminAnalytics(db, {reports:async () => []}, {directory:path.join(directory,'admin-analytics'),now});
    let frozen, launches = 0;
    const service = createMonthlyPredictions(db, {
        directory, now, probe:async () => ({ready:true}),
        launch: (_program,args) => {
            launches++;
            const io = require('node:fs');
            frozen = JSON.parse(io.readFileSync(args[4],'utf8'));
            const scopes = frozen.scopes.map((scope,index) => ({...scope,outputs:snapshot.scopes[index].outputs}));
            io.writeFileSync(args[5],JSON.stringify({input_sha256:D.hash(frozen),policy_sha256:frozen.policy_sha256,scopes}));
            io.writeFileSync(args[6],JSON.stringify({state:'complete',completed:70}));
            return Object.assign(new EventEmitter(),{pid:process.pid,exitCode:0});
        }
    });
    const csvRows = snapshot.scopes.flatMap(scope => snapshot.dates.map((period,index) =>
        [period,scope.barangay,scope.disease,scope.history[index]].join(',')));
    const raw = csv(csvRows);
    const preview = analytics.preview(raw);
    assert.deepEqual(preview.trainingRange,{start:'2023-01',cutoff:'2026-09',months:45});
    const upload = await analytics.save(raw,preview.id,user);
    assert.deepEqual((await analytics.datasets()).versions[0].trainingRange,preview.trainingRange);
    const incomplete = csv(csvRows.slice(1));
    const gap = analytics.preview(incomplete);
    assert.equal(gap.trainingRange,null);
    await analytics.save(incomplete,gap.id,user);
    const selection = {start:'2023-01',cutoff:'2026-09',mode:D.MIXED,dataset_id:upload.id};
    await assert.rejects(service.start({...selection,dataset_id:gap.id},user),/saved CSV is missing/);
    await assert.rejects(service.start({...selection,dataset_id:'../unknown'},user),/saved CSV version/);
    await assert.rejects(service.start({...selection,mode:'operational'},user),/preview mode/);
    const run = await service.start(selection,user);
    assert.equal(run.status,'ready');
    assert.equal(frozen.uploaded_dataset_sha256,upload.id);
    assert.deepEqual(frozen.report_digests,[]);
    assert.deepEqual(frozen.scopes.map(scope=>scope.history),snapshot.scopes.map(scope=>scope.history));
    const review = await service.review(run.id);
    assert.equal(review.dataset_id,upload.id);
    assert.equal(review.current_data_matches,true);
    assert.equal(review.probability,null);
    await assert.rejects(service.publish({run_id:run.id,acknowledged:true},user),/cannot be published/);
    await assert.rejects(service.prepareProbability(run.id,{genuine_history_reviewed:true,outcomes_unknown:true},user),/genuine reported history/);
    assert.equal((await service.start(selection,user)).id,run.id);
    assert.equal(launches,1);

    const stored = path.join(directory,'admin-analytics','datasets',upload.id+'.json');
    const payload = JSON.parse(await fs.readFile(stored,'utf8'));
    payload.rows[0].Cases++;
    await fs.writeFile(stored,JSON.stringify(payload));
    assert.equal((await service.review(run.id)).current_data_matches,false);
    await assert.rejects(service.start(selection,user),/saved CSV version could not be verified/);
});
