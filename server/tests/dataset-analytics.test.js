'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const express = require('express');
const { loadDataset, aggregateDataset, registerDatasetAnalytics, LABEL, SOURCE_HASH } = require('../services/dataset-analytics');
const { DISEASES, BARANGAYS } = require('../services/seasonal6200-sarima-demo');
const rows = loadDataset();
// Independent raw CSV sums, separate from the aggregation implementation.
const raw = fs.readFileSync(path.join(__dirname, '../../datasets/combined_historical_cases.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(line => { const [month, barangay, disease, count] = line.split(','); return { month, barangay, disease, count: Number(count) }; });
test('preserved CSV contains 3150 unique monthly scopes, 6200 cases and all 70 combinations', () => {
    assert.equal(rows.length, 3150); assert.equal(raw.reduce((n, row) => n + row.count, 0), 6200);
    assert.equal(new Set(raw.map(row => row.barangay + '|' + row.disease)).size, 70);
    const result = aggregateDataset(rows);
    assert.equal(result.total, 6200); assert.equal(result.coverage.months, 45);
    assert.equal(result.dataset_sha256, SOURCE_HASH); assert.equal(result.source_label, LABEL);
    assert.equal(result.months[0].label, '2023-01'); assert.equal(result.months.at(-1).label, '2026-09');
    for (const key of ['diseases', 'months', 'barangays', 'years']) assert.equal(result[key].reduce((n, row) => n + row.cases, 0), 6200);
    for (const key of ['active', 'age', 'recovered', 'high_risk']) assert.equal(Object.hasOwn(result, key), false);
});
test('all 385 BHW/year/disease selections equal independent CSV sums and municipal totals', () => {
    for (const year of ['all', '2023', '2024', '2025', '2026']) for (const disease of ['all', ...DISEASES]) {
        let municipal = 0;
        for (const barangay of BARANGAYS) {
            const r = aggregateDataset(rows, { year, disease }, barangay);
            const selected = raw.filter(row => row.barangay === barangay && (year === 'all' || row.month.startsWith(year)) && (disease === 'all' || disease === row.disease));
            assert.equal(r.total, selected.reduce((n, row) => n + row.count, 0));
            for (const month of r.months) assert.equal(month.cases, selected.filter(row => row.month === month.label).reduce((n, row) => n + row.count, 0));
            assert.deepEqual(r.options.barangays, [barangay]); municipal += r.total;
        }
        assert.equal(aggregateDataset(rows, { year, disease }).total, municipal);
    }
});
test('invalid dimensions, forged barangay and invalid CSV cannot produce silently invented counts', () => {
    for (const q of [{ year: '2027' }, { year: ['2023'] }, { disease: 'Dengue' }, { barangay: 'Unknown' }, { age: 'all' }, { sample: '1' }, { barangay_id: '2' }]) assert.throws(() => aggregateDataset(rows, q), e => e.status === 400);
    assert.throws(() => aggregateDataset(rows, { barangay: 'Caliban' }, 'Salvacion'), e => e.status === 400);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hi-dataset-'));
    try { fs.writeFileSync(path.join(dir, 'changed.csv'), 'Date,Barangay,Disease,Cases\n2026-09,Caliban,Cough,99999'); assert.throws(() => loadDataset(path.join(dir, 'changed.csv')), /hash mismatch/); }
    finally { fs.rmSync(dir, { recursive: true }); }
});
test('HTTP dataset endpoints enforce own BHW scope and exact roles, keeping operational routes separate', async () => {
    const app = express();
    app.use((req, _res, next) => { req.user = { role: req.get('fixture-role'), barangay_id: Number(req.get('fixture-barangay')) }; next(); });
    registerDatasetAnalytics(app, { execute: async (_sql, [id]) => [[{ name: BARANGAYS[id - 1] }]] });
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const get = async (url, role = 'bhw', id = 1) => { const r = await fetch('http://127.0.0.1:' + server.address().port + url, { headers: { 'fixture-role': role, 'fixture-barangay': String(id) } }); return { status: r.status, data: await r.json() }; };
    try {
        for (let id = 1; id <= 7; id++) { const r = await get('/api/bhw/dataset-analytics', 'bhw', id); assert.equal(r.status, 200); assert.deepEqual(r.data.options.barangays, [BARANGAYS[id - 1]]); assert.equal(r.data.diseases.length, 10); }
        assert.equal((await get('/api/bhw/dataset-analytics?barangay=Caliban')).status, 400);
        for (const role of ['admin', 'mho', 'superadmin', '']) assert.equal((await get('/api/bhw/dataset-analytics', role)).status, 403);
        assert.equal((await get('/api/bhw/dataset-analytics', 'bhw', 0)).status, 403);
        assert.equal((await get('/api/mho/dataset-analytics', 'bhw')).status, 403);
        assert.equal((await get('/api/mho/dataset-analytics', 'mho')).data.total, 6200);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
test('MHO barangay report matches the CSV and downloads a scoped PDF', async () => {
    const { registerHistoricalReports } = require('../services/historical-reports');
    const app = express();
    app.use((req, _res, next) => { req.user = { role: req.get('fixture-role'), barangay_id: 1 }; next(); });
    registerHistoricalReports(app, { execute: async () => [[{ name: 'Salvacion' }]] });
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const get = (query = '', role = 'mho', portal = 'mho') =>
        fetch('http://127.0.0.1:' + server.address().port + '/api/' + portal + '/reports/historical-counts' + query,
            { headers: { 'fixture-role': role } });
    try {
        const options = await (await get()).json();
        assert.deepEqual(Object.keys(options.barangayPeriods).sort(), [...BARANGAYS].sort());
        for (const barangay of BARANGAYS) {
            const response = await get('?' + new URLSearchParams({ barangay, month: '04', year: '2024' }));
            assert.equal(response.status, 200);
            const data = await response.json();
            const expected = raw.filter(row => row.month === '2024-04' && row.barangay === barangay);
            assert.equal(data.scope, barangay);
            assert.equal(data.total, expected.reduce((total, row) => total + row.count, 0));
            assert.deepEqual(data.breakdown.map(row => [row.barangay, row.disease, row.cases]).sort(),
                expected.map(row => [row.barangay, row.disease, row.count]).sort());
        }
        const selection = '?barangay=Salvacion&month=04&year=2024';
        const pdf = await get(selection + '&format=pdf');
        assert.equal(pdf.status, 200);
        assert.match(pdf.headers.get('content-disposition'), /Barangay_Case_Report_Salvacion_April_2024\.pdf/);
        assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
        assert.equal((await get(selection, 'bhw')).status, 403);
        assert.equal((await get(selection, 'bhw', 'bhw')).status, 400);
        assert.equal((await get('?barangay=Unknown&month=04&year=2024')).status, 400);
        assert.equal((await get('?barangay=Salvacion&month=12&year=2026')).status, 400);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
test('both dashboards retain their layouts without the standalone dataset selector', () => {
    for (const role of ['mho', 'bhw']) {
        const html = fs.readFileSync(path.join(__dirname, '../../' + role + '.html'), 'utf8');
        assert.doesNotMatch(html, /id="dataset-analytics"|Analytics source/);
        assert.match(html, /data-forecast-board=/);
        assert.match(html, /forecast-board\.js\?v=/);
        assert.doesNotMatch(html, /forecast-legacy|predictive-disease-select|run-forecast-button|mho-forecast\.js\?v=/);
    }
});

test('portal markup keeps existing operational widgets within their view and predictions outside it',()=>{
 for(const role of ['bhw','mho']){
  const html=fs.readFileSync(path.join(__dirname,'../../'+role+'.html'),'utf8').replace(/<script\b[^]*?<\/script>/gi,'');
  const stack=[],parents=new Map();
  for(const match of html.matchAll(/<([a-z][\w-]*)(\s[^]*?)?>|<\/([a-z][\w-]*)\s*>/gi)){
   if(match[3]){let i=stack.length-1;while(i>=0&&stack[i].tag!==match[3])i--;if(i>=0)stack.splice(i);continue;}
   const id=/\bid="([^"]+)"/.exec(match[2]||'')?.[1];if(id)parents.set(id,stack.map(e=>e.id));
   if(!['input','img','br','hr','meta','link','source','area','base','wbr'].includes(match[1]))stack.push({tag:match[1],id});
  }
  const dashboard = role==='bhw'?'bhw-dashboard-content':'operational-analytics';
  assert(parents.get('stat-total').includes(role==='bhw'?'view-reports':dashboard));
  if(role==='bhw')assert(parents.get('bhwChart').includes('view-reports'));
  assert(!parents.get('view-predictive').includes(dashboard));
  assert(!parents.get('view-predictive').includes(role==='bhw'?'view-dashboard':'view-analytics'));
 }
});
