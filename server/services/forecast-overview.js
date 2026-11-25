'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const D = require('./monthly-data');
const H = require('./forecast-horizons');
const { createLowCountSarimaDemo, metrics } = require('./seasonal6200-sarima-demo');
const { createConditionalCmp } = require('./conditional-pooled-cmp');

const DEMO_HASH = 'b939526a39eea1d888c74f7794f0b93b9972ab91d2bbf03e5c832ef26db8eddb';

function probabilityOf(row) {
    return row && !row.reason ? { count: row.count, exact: row.exact, nearby: row.nearby, range80: row.range80, range95: row.range95 } : null;
}

function detail(fit) {
    if (!fit?.usable) return null;
    return { order: fit.order, seasonal_order: fit.seasonal_order, params: fit.params,
        seasonal_evidence: fit.annual?.grade, roots: fit.minimum_finite_root, residuals: fit.ljung_box,
        selection: fit.selection_status, converged: fit.converged };
}

function displayRows(views, board, probabilities, previousTarget) {
    return views.map(view => {
        const estimate = ({ target, horizon, outside }) => {
            const forecast = outside ? null : view.production[horizon];
            return { target, horizon, status: outside ? 'outside' : forecast?.prediction != null ? 'available' : 'unavailable',
                mean: forecast?.prediction ?? null, lower: forecast?.lower ?? null, upper: forecast?.upper ?? null,
                probability: forecast?.prediction != null ? probabilities(view, horizon) : null, validation: 'exploratory_probability' };
        };
        const estimates = board.map(estimate);
        const performance = H.HORIZONS.map(horizon => {
            const record = view.protocols['80_20'][horizon];
            return record && { horizon, metrics: record.metrics, rows: record.rows.map(({ target, cutoff, actual, prediction }) => ({ target, cutoff, actual, prediction })) };
        }).filter(Boolean);
        return { disease: view.disease, barangay: view.barangay, estimates,
            ...(previousTarget && { previous_estimate: estimate(previousTarget) }),
            history: view.dates.map((month, index) => ({ month, cases: view.history[index] })),
            model: detail(view.production[1].diagnostics), performance };
    });
}

function createForecastDemo() {
    const baseline = createLowCountSarimaDemo();
    const cmp = createConditionalCmp();
    let evidence;
    function load() {
        const options = baseline.options();
        if (evidence) return evidence;
        const raw = fs.readFileSync(path.join(__dirname, '../data/seasonal-sarima-6200/multihorizon-demo.json'));
        if (crypto.createHash('sha256').update(raw).digest('hex') !== DEMO_HASH) throw D.fail('The demonstration forecasts failed verification.', 503);
        const packet = JSON.parse(raw);
        if (packet.schema !== 1 || packet.cutoff !== options.context.cutoff ||
            packet.baseline !== options.provenance.version || packet.dataset_sha256 !== options.provenance.dataset_sha256 ||
            packet.rows.length !== 70) throw D.fail('The demonstration forecasts failed verification.', 503);
        evidence = { packet, extras: new Map(packet.rows.map(row => [H.keyFor(row.disease, row.barangay), row])) };
        return evidence;
    }
    return function demo(source, barangay, requested) {
        const { packet, extras } = load();
        const reference = requested || H.shift(packet.cutoff, source === 'delayed' ? 2 : 1);
        if (reference <= packet.cutoff) throw D.fail('Choose a month after the demonstration cutoff.');
        const targets = H.windowFrom(packet.cutoff, reference);
        const probabilities = new Map();
        const views = D.DISEASES.flatMap(disease => (barangay ? [barangay] : D.BARANGAYS).map(place => {
            const fileKey = H.keyFor(disease, place);
            const saved = baseline.forecast({ disease, barangay: place });
            const view = saved.view, extra = extras.get(fileKey);
            if (!extra || extra.estimates[1] !== view.production[1].prediction) throw D.fail('The demonstration scope failed verification.', 503);
            if (cmp.enabled) {
                const original = cmp.augment(saved).experimental_probability;
                probabilities.set(fileKey, { ...extra.probabilities, 1: original?.status === 'available' ? original : null });
            }
            for (const horizon of H.HORIZONS.slice(1)) {
                const interval = extra.intervals?.[horizon - 1];
                view.production[horizon] = { prediction: extra.estimates[horizon], lower: interval?.[0] ?? null, upper: interval?.[1] ?? null };
                const rows = extra.replay[horizon];
                view.protocols['80_20'][horizon] = { rows, metrics: metrics(rows) };
            }
            return view;
        }));
        const firstTarget = H.shift(packet.cutoff, 1);
        const previousTarget = reference > firstTarget
            ? { target: firstTarget, horizon: 1, previous: true, outside: false } : null;
        return {
            source, status: 'demonstration', cutoff: packet.cutoff, reference,
            targets, previous_target: previousTarget, missing: previousTarget?.target ?? null,
            issued: null, dataset_version: packet.dataset_sha256, model_version: packet.baseline, barangay: barangay ?? null,
            rows: displayRows(views, targets, (view, horizon) => {
                const row = probabilities.get(H.keyFor(view.disease, view.barangay))?.[horizon];
                return probabilityOf(row?.lo80 !== undefined ? { ...row, range80: [row.lo80, row.hi80], range95: [row.lo95, row.hi95] } : row);
            }, previousTarget)
        };
    };
}

module.exports = { createForecastDemo, displayRows, probabilityOf };
