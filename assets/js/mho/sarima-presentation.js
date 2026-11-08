// Display policy only. Never fits, modifies or replaces the frozen SARIMA results.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./mho-action-guidance'));
    else root.HealthIntelSarimaPresentation = factory(root.HealthIntelActionGuidance);
})(typeof window === 'object' ? window : this, function (guidance) {
    'use strict';
    const finite = value => typeof value === 'number' && Number.isFinite(value);
    const format = (value, decimals = 2) => finite(value)
        ? value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : 'Unavailable';
    const monthLabel = value => new Date(value + '-01T12:00:00Z')
        .toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    function followingMonth(cutoff) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(cutoff || '')) throw Error('The historical cutoff is invalid.');
        const date = new Date(cutoff + '-01T12:00:00Z');
        date.setUTCMonth(date.getUTCMonth() + 1);
        return date.toISOString().slice(0, 7);
    }
    function recommendations(view, prediction, previous) {
        if (!finite(prediction)) return [{ id: 'R7', title: view.required_components === 1 ? 'Review the unavailable prediction' : 'Review the missing predictions',
            action: view.required_components === 1
                ? 'Ask the research team to review why no SARIMA model passed the required checks for this disease and barangay. Continue reviewing recorded cases with MHO personnel; no next-month estimate is available.'
                : 'Some required SARIMA predictions did not pass model checks. Review them before using a combined estimate.' }];
        if(!guidance)throw Error('Health-action guidance could not be loaded.');
        return guidance.prediction(view,prediction,previous);
    }

    function availableMethod(forecast, prediction) {
        if (prediction === null) return 'Unavailable';
        return forecast.actual_model || 'SARIMA';
    }
    function derive(result) {
        const view = result?.view, context = result?.context;
        if (!view || !context || !Array.isArray(view.history) || !Array.isArray(view.dates)) throw Error('The saved prediction response is incomplete.');
        const forecast = view.production?.['1'], evaluation = view.protocols?.['80_20']?.['1'];
        if (!forecast || !evaluation?.metrics || forecast.horizon !== 1 || forecast.cutoff !== context.cutoff || forecast.target !== followingMonth(context.cutoff)) throw Error('The saved one-month prediction does not match the historical cutoff.');
        if (view.dates.length !== view.history.length || view.dates.at(-1) !== context.cutoff || !view.history.every(finite)) throw Error('The recorded prediction history is incomplete.');
        const previous = view.history.at(-1), prediction = finite(forecast.prediction) ? forecast.prediction : null;
        const method = availableMethod(forecast, prediction);
        const available = prediction !== null, change = available ? prediction - previous : null;
        const changePct = available && previous > 0 ? change / previous * 100 : null;
        const approximateStable = available && Math.round(prediction) === previous;
        const trend = !available ? 'Unavailable' : approximateStable ? 'Approximately stable' : change > 0 ? 'Projected increase' : 'Projected decrease';
        const scope = `${view.disease === 'ALL' ? 'All ten diseases' : view.disease} · ${view.barangay === 'ALL' ? 'All seven barangays' : view.barangay}`;
        const rangeAvailable = available && finite(forecast.lower) && finite(forecast.upper);
        const interval = rangeAvailable ? `${format(forecast.lower, 0)}–${format(forecast.upper, 0)} cases` : available ? (method === 'Seasonal Naive' ? 'No calibrated range for Seasonal Naive' : 'Combined range unavailable') : 'No prediction range';
        const metrics = evaluation.metrics;
        const score = finite(metrics.within_tolerance_pct) ? metrics.within_tolerance_pct : null;
        const explanation = available
            ? `For ${monthLabel(forecast.target)}, ${method} estimates approximately ${format(prediction, 0)} ${view.disease === 'ALL' ? 'disease' : view.disease} cases ${view.barangay === 'ALL' ? 'across the seven participating barangays' : 'in ' + view.barangay}.`
            : view.required_components === 1
                ? `The ${monthLabel(forecast.target)} prediction for ${view.disease} in ${view.barangay} is unavailable because no SARIMA model passed all required statistical checks. Recorded history and available historical test results are still shown.`
                : `A complete ${monthLabel(forecast.target)} prediction is unavailable for this selection. Some required predictions did not pass model checks. Recorded history is still shown.`;
        const changeText = !available ? 'Unavailable'
            : approximateStable ? 'About the same as the previous month'
                : `${change > 0 ? '+' : '−'}${format(Math.abs(change), 0)} ${Math.round(Math.abs(change))===1?'case':'cases'}${changePct === null ? ' · percentage change unavailable' : ' (' + (change > 0 ? '+' : '−') + format(Math.abs(changePct), 1) + '%)'}`;
        return { view, context, forecast, evaluation, metrics, prediction, method, available, previous, change, changePct, trend,
            target: forecast.target, cutoff: context.cutoff, scope, rangeAvailable, interval, score, explanation, changeText,
            recommendations: recommendations(view, prediction, previous) };
    }
    return { derive, recommendations, finite, format, monthLabel, followingMonth };
});
