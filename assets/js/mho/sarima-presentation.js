// Display policy only. Never fits, modifies or replaces the frozen SARIMA results.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HealthIntelSarimaPresentation = factory();
})(typeof window === 'object' ? window : this, function () {
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
        if (!finite(prediction)) return [{ id: 'R7', title: view.required_components === 1 ? 'Review the unavailable forecast' : 'Review the missing forecasts',
            action: view.required_components === 1
                ? 'Ask the research team to review why no SARIMA model passed the required checks for this disease and barangay. Continue reviewing recorded cases with MHO personnel; no next-month estimate is available.'
                : 'Some required SARIMA forecasts did not pass model checks. Review them before using a combined estimate.' }];
        const result = [{ id: 'R2', title: 'Continue routine surveillance',
            action: 'Compare this estimate with the next completed monthly report and review it with MHO personnel.' }];
        if (finite(previous) && prediction > previous) result.push({ id: 'R3', title: 'Review the projected increase',
            action: 'Check recent disease reports and discuss the projected change with MHO personnel. An increase alone does not establish an outbreak.' });
        if (finite(previous) && prediction < previous) result.push({ id: 'R4', title: 'Check reporting completeness',
            action: 'Review the projected decrease and check for missing or delayed reports before interpreting the change.' });
        if (previous === 0 && prediction > 0) result.push({ id: 'R5', title: 'Verify the previous zero count',
            action: 'Confirm that the last recorded zero represents complete reporting. Percentage change from zero cannot be calculated.' });
        if (view.weak_components || view.AICc_only_components) result.push({ id: 'R6', title: 'Review the model evidence',
            action: 'Ask the research team to review the model-selection or seasonal-evidence limitations before interpreting this estimate.' });
        return result;
    }
    function availableMethod(forecast, prediction) {
        if (prediction === null) return 'Unavailable';
        return forecast.actual_model || 'SARIMA';
    }
    function derive(result) {
        const view = result?.view, context = result?.context;
        if (!view || !context || !Array.isArray(view.history) || !Array.isArray(view.dates)) throw Error('The saved forecast response is incomplete.');
        const forecast = view.production?.['1'], evaluation = view.protocols?.['80_20']?.['1'];
        if (!forecast || !evaluation?.metrics || forecast.horizon !== 1 || forecast.cutoff !== context.cutoff || forecast.target !== followingMonth(context.cutoff)) throw Error('The saved one-month forecast does not match the historical cutoff.');
        if (view.dates.length !== view.history.length || view.dates.at(-1) !== context.cutoff || !view.history.every(finite)) throw Error('The recorded forecast history is incomplete.');
        const previous = view.history.at(-1), prediction = finite(forecast.prediction) ? forecast.prediction : null;
        const method = availableMethod(forecast, prediction);
        const available = prediction !== null, change = available ? prediction - previous : null;
        const changePct = available && previous > 0 ? change / previous * 100 : null;
        const approximateStable = available && Math.round(prediction) === previous;
        const trend = !available ? 'Unavailable' : approximateStable ? 'Approximately stable' : change > 0 ? 'Projected increase' : 'Projected decrease';
        const scope = `${view.disease === 'ALL' ? 'All ten diseases' : view.disease} · ${view.barangay === 'ALL' ? 'All seven barangays' : view.barangay}`;
        const rangeAvailable = available && finite(forecast.lower) && finite(forecast.upper);
        const interval = rangeAvailable ? `${format(forecast.lower, 0)}–${format(forecast.upper, 0)} cases` : available ? (method === 'Seasonal Naive' ? 'No calibrated range for Seasonal Naive' : 'Combined range unavailable') : 'No forecast range';
        const metrics = evaluation.metrics;
        const score = finite(metrics.within_tolerance_pct) ? metrics.within_tolerance_pct : null;
        const explanation = available
            ? `Based on historical synthetic ${view.disease === 'ALL' ? 'disease' : view.disease} cases ${view.barangay === 'ALL' ? 'across the seven participating barangays' : 'in ' + view.barangay}, ${method} estimates approximately ${format(prediction, 0)} cases for ${monthLabel(forecast.target)}.`
            : view.required_components === 1
                ? `The ${monthLabel(forecast.target)} forecast for ${view.disease} in ${view.barangay} is unavailable because no SARIMA model passed all required statistical checks. Recorded history and available historical test results are still shown.`
                : `A complete ${monthLabel(forecast.target)} forecast is unavailable for this selection. Some required forecasts did not pass model checks. Recorded history is still shown.`;
        const changeText = !available ? 'Unavailable'
            : approximateStable ? 'About the same as the previous month'
                : `${change > 0 ? '+' : '−'}${format(Math.abs(change), 0)} cases${changePct === null ? ' · percentage change unavailable' : ' (' + (change > 0 ? '+' : '−') + format(Math.abs(changePct), 1) + '%)'}`;
        return { view, context, forecast, evaluation, metrics, prediction, method, available, previous, change, changePct, trend,
            target: forecast.target, cutoff: context.cutoff, scope, rangeAvailable, interval, score, explanation, changeText,
            recommendations: recommendations(view, prediction, previous) };
    }
    return { derive, recommendations, finite, format, monthLabel, followingMonth };
});
