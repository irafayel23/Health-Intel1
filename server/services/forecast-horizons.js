'use strict';

const D = require('./monthly-data');
const { metrics } = require('./seasonal6200-sarima-demo');

const HORIZONS = [1, 2, 3, 4];
const FORMAT = 'sarima-four-horizons-v1';
const keyFor = (disease, barangay) => disease + '\0' + barangay;

function shift(period, offset) {
    D.month(period);
    const [year, month] = period.split('-').map(Number);
    const index = year * 12 + month - 1 + offset;
    return Math.floor(index / 12) + '-' + String(index % 12 + 1).padStart(2, '0');
}

function windowFrom(cutoff, reference) {
    const [year, month] = cutoff.split('-').map(Number);
    return [0, 1, 2].map(offset => {
        const target = shift(reference, offset);
        const [targetYear, targetMonth] = target.split('-').map(Number);
        const horizon = 12 * (targetYear - year) + targetMonth - month;
        return { target, horizon, outside: horizon < 1 || horizon > 4 };
    });
}

function step(fit, horizon) {
    if (!fit.usable) return null;
    if (horizon === 1) return {
        prediction: fit.prediction, lower: fit.lower, upper: fit.upper, raw_prediction: fit.raw_prediction
    };
    const value = fit.forecast_steps?.[horizon - 1];
    if (!value) return null;
    const { prediction, lower, upper, raw_prediction } = value;
    if (value.horizon !== horizon || ![prediction, lower, upper, raw_prediction].every(Number.isFinite) ||
        lower < 0 || prediction < lower || prediction > upper || prediction !== Math.max(0, raw_prediction)) {
        throw D.fail('A saved forecast step failed validation.', 409);
    }
    return { prediction, lower, upper, raw_prediction };
}

// The training prefix ends immediately before date index n. A target index
// is n + horizon - 1, so early/late backtest horizons share target months.
function extend(input, output, result) {
    const all = { '80_20': {}, '70_30': {} };
    for (const scope of output.scopes) {
        const view = result.views[keyFor(scope.disease, scope.barangay)];
        const end = scope.history.length;
        const fit = scope.outputs.at(-1).sarima;
        for (const horizon of HORIZONS.slice(1)) {
            const future = step(fit, horizon);
            view.production[horizon] = {
                ...future, prediction: future?.prediction ?? null,
                actual_model: future ? 'SARIMA' : 'Unavailable',
                reason: future ? fit.reason : 'No accepted saved estimate at this horizon',
                horizon, target: shift(input.cutoff, horizon), cutoff: input.cutoff
            };
            for (const [protocol, fraction] of [['80_20', .8], ['70_30', .7]]) {
                const first = Math.floor(end * fraction);
                const rows = Array.from({ length: end - first }, (_, index) => {
                    const targetIndex = first + index;
                    const n = targetIndex - horizon + 1;
                    const fitAtOrigin = scope.outputs[n - 31]?.sarima;
                    const prediction = fitAtOrigin ? step(fitAtOrigin, horizon)?.prediction ?? null : null;
                    return { target: view.dates[targetIndex], cutoff: view.dates[n - 1], horizon, actual: scope.history[targetIndex], prediction, actual_model: prediction === null ? 'Unavailable' : 'SARIMA' };
                });
                view.protocols[protocol][horizon] = { rows, metrics: metrics(rows) };
                (all[protocol][horizon] ??= []).push(...rows);
            }
        }
    }
    for (const [protocol, sets] of Object.entries(all)) {
        for (const [horizon, rows] of Object.entries(sets)) result.overall[protocol][horizon] = metrics(rows);
    }
    result.context.horizons = HORIZONS;
    result.context.availability = Object.fromEntries(HORIZONS.map(h => [h, Object.values(result.views).filter(v => v.production[h].prediction !== null).length]));
    return result;
}

function outcomesFor(target, forecast, reports, issued) {
    if (reports.length !== D.BARANGAYS.length || reports.some(row => !row.confirmed || row.pending)) {
        return { target, status: 'awaiting_confirmation', rows: [] };
    }
    if (!issued || Date.parse(issued) >= Date.parse(shift(target, 1) + '-01T00:00:00+08:00')) {
        return { target, status: 'no_prior_issue', rows: [] };
    }
    const rows = forecast.map(row => {
        const actual = reports.find(report => report.barangay === row.barangay).counts[row.disease];
        const absolute_error = row.prediction === null ? null : Math.abs(row.prediction - actual);
        return { ...row, actual, absolute_error, within_tolerance: absolute_error === null ? null : absolute_error <= Math.max(1, .2 * actual) };
    });
    return { target, status: Date.parse(issued) < Date.parse(target + '-01T00:00:00+08:00') ? 'issued_before_target' : 'issued_during_target', rows };
}

module.exports = { FORMAT, HORIZONS, keyFor, shift, windowFrom, step, extend, outcomesFor };
