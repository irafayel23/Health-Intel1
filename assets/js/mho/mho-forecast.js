// MHO display of frozen synthetic SARIMA results. No model fitting or operational case query.
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const P = window.HealthIntelSarimaPresentation;
    const S = { meta: null, result: null, presentation: null, controller: null, sequence: 0, width: 0, chart: null };
    const text = (id, value) => { $(id).textContent = value; };
    const node = (tag, classes, value) => {
        const item = document.createElement(tag); item.className = classes || '';
        if (value !== undefined) item.textContent = value;
        return item;
    };
    const base = () => window.HealthIntel?.apiOrigin || 'http://localhost:3000';
    function chartMessage(message) {
        $('sarima-chart').replaceChildren(node('p', 'grid min-h-[330px] place-content-center px-5 text-center text-sm text-muted-foreground sm:min-h-[420px]', message));
    }
    function ring(value) {
        const circumference = 2 * Math.PI * 78;
        text('sarima-score', value === null ? 'Unavailable' : P.format(value) + '%');
        $('sarima-score').setAttribute('font-size', value === null ? '20' : '30');
        $('sarima-score-ring').setAttribute('stroke-dasharray', `${value === null ? 0 : Math.min(100, Math.max(0, value)) / 100 * circumference} ${circumference}`);
    }
    function reset(message, initial = false) {
        S.result = null; S.presentation = null; S.chart = null;
        ring(null);
        ['sarima-mae', 'sarima-rmse', 'sarima-mape'].forEach(id => text(id, '—'));
        ['forecast-months', 'sarima-missing', 'forecast-recommendations'].forEach(id => { $(id).hidden = true; });
        text('sarima-scope', 'Results for your selection');
        text('sarima-method', 'Forecast method');
        text('sarima-seasonality-note', ''); $('sarima-seasonality-note').hidden = true;
        text('sarima-score-count', 'Run a forecast to see past performance.');
        text('sarima-score-note', ''); text('sarima-mape-denominator', '');
        text('sarima-score-formula', 'Run a forecast to see the calculation for this selection.');
        text('predictive-insight-text', 'Select a disease and barangay to view a demonstration forecast.');
        text('sarima-history-summary', ''); text('sarima-evaluation-summary', '');
        $('forecast-recommendation-status').hidden = false;
        text('forecast-recommendation-status', 'Run a forecast to see suggested follow-up.');
        $('sarima-previous-point').disabled = true; $('sarima-next-point').disabled = true;
        text('sarima-chart-title', 'Cases and forecast');
        text('sarima-chart-subtitle', 'Recorded history and saved SARIMA estimates');
        text('sarima-chart-readout', 'Point to a month or use the arrows to inspect its values.');
        if (!initial) chartMessage(message);
    }
    function clearSelection() {
        S.sequence++; S.controller?.abort(); reset('Run Forecast to view this selection.');
        $('sarima-dashboard').setAttribute('aria-busy', 'false');
        $('run-forecast-button').disabled = false; text('run-forecast-button', 'Run Forecast');
        text('sarima-state', 'Selection changed. Run Forecast to update the results.');
    }
    async function get(path, signal) {
        const response = await fetch(base() + path, { signal });
        const body = await response.json();
        if (!response.ok || !body.success) throw Error(body.error || 'The saved forecast could not be loaded.');
        return body.data;
    }
    async function initialize() {
        try {
            S.meta = await get('/api/mho/sarima-demo/options');
            const fill = (id, names) => {
                $(id).replaceChildren(...names.map(name => {
                    const option = node('option', '', name); option.value = name; return option;
                }));
                $(id).value = names[0]; $(id).disabled = false;
            };
            fill('predictive-disease-select', S.meta.diseases);
            fill('predictive-brgy-select', S.meta.barangays);
            text('sarima-provenance', `Saved synthetic demonstration · History through ${P.monthLabel(S.meta.context.cutoff)} · No live retraining`);
            text('sarima-state', `Saved ${P.monthLabel(P.followingMonth(S.meta.context.cutoff))} forecast from ${P.monthLabel(S.meta.context.cutoff)} history.`);
            $('run-forecast-button').disabled = false; text('run-forecast-button', 'Run Forecast');
        } catch (error) {
            text('sarima-state', 'Could not load the forecast choices. Check the local connection and retry.');
            chartMessage('The saved forecast service is unavailable.');
            $('run-forecast-button').disabled = false; text('run-forecast-button', 'Retry loading');
        }
    }
    async function run() {
        if (!S.meta) { await initialize(); return; }
        const button = $('run-forecast-button'); if (button.disabled) return;
        const sequence = ++S.sequence; S.controller?.abort();
        const controller = new AbortController(); S.controller = controller;
        reset('Loading your saved forecast…'); button.disabled = true; text('run-forecast-button', 'Loading…');
        $('sarima-dashboard').setAttribute('aria-busy', 'true'); text('sarima-state', 'Loading saved SARIMA results…');
        const timeout = setTimeout(() => controller.abort(), 15000);
        const query = new URLSearchParams({ disease: $('predictive-disease-select').value, barangay: $('predictive-brgy-select').value, protocol: '80_20', horizon: '1' });
        try {
            const result = await get('/api/mho/sarima-demo?' + query, controller.signal);
            if (sequence !== S.sequence) return;
            const presentation = P.derive(result);
            S.result = result; S.presentation = presentation; render();
        } catch (error) {
            if (sequence !== S.sequence) return;
            reset('The forecast could not be loaded. Please try again.');
            text('sarima-state', error.name === 'AbortError' ? 'Loading timed out. Check the connection and retry.' : 'The saved forecast could not be loaded. Check the connection and retry.');
            text('sarima-score-count', 'Historical test results unavailable.');
            text('predictive-insight-text', 'Forecast unavailable. Please try again.');
            text('forecast-recommendation-status', 'Forecast-dependent suggestions are unavailable until the results load.');
        } finally {
            clearTimeout(timeout);
            if (sequence === S.sequence) {
                button.disabled = false; text('run-forecast-button', 'Run Forecast');
                $('sarima-dashboard').setAttribute('aria-busy', 'false');
            }
        }
    }
    function render() {
        const d = S.presentation; if (!d) return;
        const { metrics: m, view: v } = d;
        text('sarima-state', `${d.scope} · Saved ${P.monthLabel(d.target)} forecast`);
        text('sarima-scope', d.scope); ring(d.score);
        text('sarima-score-count', m.available ? `${m.within_tolerance_hits} of ${m.available} past predictions met the error limit.` : 'A complete historical score is unavailable.');
        text('sarima-score-note', `${m.available} of ${m.attempted} historical forecasts available${m.unavailable ? `; ${m.unavailable} unavailable` : ''}.`);
        text('sarima-score-formula', m.available
            ? `${m.within_tolerance_hits} ÷ ${m.available} × 100 = ${P.format(d.score)}%. Unavailable forecasts are excluded from this percentage and counted on the card.`
            : `No complete forecasts were available for ${m.attempted} requested test months. A percentage cannot be calculated.`);
        text('sarima-mae', P.format(m.MAE)); text('sarima-rmse', P.format(m.RMSE));
        text('sarima-mape', m.MAPE_positive_pct === null ? 'Unavailable' : P.format(m.MAPE_positive_pct) + '%');
        text('sarima-mape-denominator', m.MAPE_zero_actual_excluded ? `${m.MAPE_zero_actual_excluded} zero-count targets excluded from MAPE only.` : '');
        $('forecast-months').hidden = false;
        text('sarima-main-month', `${P.monthLabel(d.target)} estimate`);
        text('sarima-main-estimate', d.available ? P.format(d.prediction, 0) : 'Unavailable');
        $('sarima-main-estimate').classList.toggle('text-5xl', d.available);
        $('sarima-main-estimate').classList.toggle('text-2xl', !d.available);
        text('sarima-main-range', d.rangeAvailable ? `95% model range: ${d.interval}` : d.interval);
        text('sarima-main-note', `One month after the last recorded month, ${P.monthLabel(d.cutoff)}.`);
        text('sarima-summary-scope', d.scope);
        text('sarima-method', d.method);
        const weakSeason = d.available && d.method === 'SARIMA' && !!v.weak_components;
        $('sarima-seasonality-note').hidden = !weakSeason;
        text('sarima-seasonality-note', weakSeason ? 'Annual seasonal evidence is weak or uncertain for this selection. The SARIMA fit passed numerical checks; this does not establish significant annual seasonality.' : '');
        text('sarima-previous-month', `${P.monthLabel(d.cutoff)} recorded`);
        text('sarima-previous-cases', P.format(d.previous, 0) + ' cases');
        text('sarima-trend', d.trend); text('sarima-change', d.changeText);
        text('predictive-insight-text', d.explanation);
        text('sarima-history-summary', d.available && d.previous === 0 ? 'Percentage change is not calculated because the previous count was zero.' : '');
        text('sarima-evaluation-summary', d.available ? 'Estimated counts are rounded for readability. Forecast ranges are model uncertainty, not guarantees.' : 'Historical test scores describe past predictions. No next-month case count has been substituted.');
        $('forecast-recommendation-status').hidden = true; $('forecast-recommendations').hidden = false;
        $('forecast-recommendations').replaceChildren(...d.recommendations.map(r => {
            const li = node('li', 'rounded-xl border border-teal-100 bg-card p-4 dark:border-teal-900'); li.dataset.rule = r.id;
            li.append(node('h3', 'text-sm font-semibold text-teal-950 dark:text-teal-100', r.title), node('p', 'mt-2 text-xs leading-relaxed text-muted-foreground', r.action));
            return li;
        }));
        const missing = S.result.missing_components || [];
        $('sarima-missing').hidden = d.available;
        text('sarima-missing-note', v.required_components === 1
            ? 'No SARIMA model passed all required checks for this disease and barangay. The next-month estimate is unavailable; recorded history and available historical test scores are still shown.'
            : `${missing.length} of ${v.required_components} required disease–barangay forecasts are unavailable. A complete estimate cannot be shown.`);
        $('sarima-missing-list').replaceChildren(...missing.map(r => node('li', '', `${r.disease} · ${r.barangay}`)));
        drawChart();
    }

    function drawChart() {
        const d = S.presentation, target = $('sarima-chart'); if (!d || !target.clientWidth) return;
        const v = d.view, W = Math.max(240, target.clientWidth), mobile = W < 500;
        const H = mobile ? 330 : 420, L = mobile ? 42 : 50, R = mobile ? 18 : 24, T = 66, B = 52;
        const N = v.history.length, first = Math.max(0, N - Number($('sarima-window').value)), last = N;
        const dates = [...v.dates, d.target], back = new Map(d.evaluation.rows.map(r => [r.target, r.prediction]));
        const finite = P.finite, visibleTests = d.evaluation.rows.filter(r => dates.indexOf(r.target) >= first && finite(r.prediction));
        const values = [...v.history.slice(first), ...visibleTests.map(r => r.prediction), ...[d.prediction, d.forecast.upper].filter(finite)];
        const rawMax = Math.max(1, ...values) * 1.12, unit = 10 ** Math.floor(Math.log10(rawMax / 4));
        const step = Math.max(1, [1, 2, 5, 10].find(k => k * unit >= rawMax / 4) * unit), maximum = Math.ceil(rawMax / step) * step;
        const x = i => L + (i - first) / Math.max(1, last - first) * (W - L - R), y = a => H - B - a / maximum * (H - T - B);
        const dark = document.documentElement.classList.contains('dark');
        const colors = { grid: dark ? '#293749' : '#e8eef5', muted: dark ? '#9aadc3' : '#72849b', blue: dark ? '#60a5fa' : '#3b82f6', violet: dark ? '#c4b5fd' : '#8b5cf6', teal: dark ? '#2dd4bf' : '#0d9488', region: dark ? '#0c342f' : '#eaf8f4', paper: dark ? '#132b32' : '#ecfdf5' };
        const ns = 'http://www.w3.org/2000/svg';
        const n = (tag, attributes = {}, value) => { const e = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attributes)) e.setAttribute(key, String(value)); if (value !== undefined) e.textContent = value; return e; };
        const svg = n('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img', 'aria-label': `${d.scope}: recorded cases, past predictions and saved ${P.monthLabel(d.target)} forecast` });
        const defs = n('defs'), gradient = n('linearGradient', { id: 'sarima-history-gradient', x1: 0, y1: 0, x2: 0, y2: 1 });
        gradient.append(n('stop', { offset: '0%', 'stop-color': colors.blue, 'stop-opacity': .15 }), n('stop', { offset: '100%', 'stop-color': colors.blue, 'stop-opacity': .01 })); defs.append(gradient); svg.append(defs);
        const boundary = x(N - .5);
        svg.append(n('rect', { x: boundary, y: T, width: W - R - boundary, height: H - B - T, fill: colors.region }), n('line', { x1: boundary, x2: boundary, y1: T, y2: H - B, stroke: colors.teal, opacity: .45, 'stroke-dasharray': '4 5' }));
        for (let value = 0; value <= maximum; value += step) svg.append(n('line', { x1: L, x2: W - R, y1: y(value), y2: y(value), stroke: colors.grid }), n('text', { x: L - 8, y: y(value) + 4, 'text-anchor': 'end', fill: colors.muted, 'font-size': 11 }, P.format(value, 0)));
        svg.append(n('text', { x: L, y: 50, fill: colors.muted, 'font-size': 11 }, 'Cases'));
        const badgeWidth = Math.min(245, W - L - R), badgeX = W - R - badgeWidth;
        const badge = n('g', { 'data-forecast-label': d.target });
        badge.append(n('rect', { x: badgeX, y: 12, width: badgeWidth, height: 28, rx: 9, fill: colors.paper }), n('text', { x: W - R - 10, y: 30, 'text-anchor': 'end', fill: colors.teal, 'font-size': mobile ? 10.5 : 12, 'font-weight': 700 }, `${P.monthLabel(d.target)} · ${d.available ? '~' + P.format(d.prediction, 0) + ' cases' : 'unavailable'}`)); svg.append(badge);
        const history = v.history.map((value, i) => [i, value]).filter(([i]) => i >= first);
        const area = `M ${x(first)} ${y(0)} L ${history.map(([i, a]) => `${x(i)} ${y(a)}`).join(' L ')} L ${x(N - 1)} ${y(0)} Z`;
        svg.append(n('path', { d: area, fill: 'url(#sarima-history-gradient)' }));
        const poly = (points, color, dash, name) => {
            if (!points.length) return;
            svg.append(n('polyline', { points: points.map(([i, value]) => `${x(i)},${y(value)}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', ...(dash ? { 'stroke-dasharray': '5 5' } : {}), 'data-series': name }));
        };
        poly(history, colors.blue, false, 'history');
        let segment = [];
        for (const r of d.evaluation.rows) {
            const i = dates.indexOf(r.target); if (i < first || i >= N) continue;
            if (!finite(r.prediction)) { poly(segment, colors.violet, false, 'backtest'); segment = []; }
            else { segment.push([i, r.prediction]); svg.append(n('circle', { cx: x(i), cy: y(r.prediction), r: 2.5, fill: colors.violet })); }
        }
        poly(segment, colors.violet, false, 'backtest');
        if (d.available) {
            if (d.rangeAvailable) {
                svg.append(n('polygon', { points: [[N - 1, d.previous], [N, d.forecast.lower], [N, d.forecast.upper]].map(([i, a]) => `${x(i)},${y(a)}`).join(' '), fill: colors.teal, opacity: .13, 'data-forecast-interval': 'true' }));
                svg.append(n('line', { x1: x(N), x2: x(N), y1: y(d.forecast.lower), y2: y(d.forecast.upper), stroke: colors.teal, 'stroke-width': 5, opacity: .28 }));
                [d.forecast.lower, d.forecast.upper].forEach(a => svg.append(n('line', { x1: x(N) - 5, x2: x(N) + 5, y1: y(a), y2: y(a), stroke: colors.teal, 'stroke-width': 1.5 })));
            }
            poly([[N - 1, d.previous], [N, d.prediction]], colors.teal, true, 'forecast');
            svg.append(n('circle', { cx: x(N), cy: y(d.prediction), r: 5.5, fill: colors.teal, stroke: dark ? '#0f172a' : 'white', 'stroke-width': 2 }));
        }
        const ticks = mobile ? 4 : 6;
        for (let k = 0; k < ticks; k++) {
            const i = Math.round(first + (last - first) * k / (ticks - 1));
            const label = new Date(dates[i] + '-01T12:00:00Z').toLocaleDateString('en-PH', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            svg.append(n('text', { x: x(i), y: H - 27, 'text-anchor': 'middle', fill: colors.muted, 'font-size': 10 }, label));
        }
        svg.append(n('text', { x: (L + W - R) / 2, y: H - 7, 'text-anchor': 'middle', fill: colors.muted, 'font-size': 10 }, 'Month'));
        const cross = n('line', { y1: T, y2: H - B, stroke: colors.muted, 'stroke-dasharray': '3 4', visibility: 'hidden' });
        const tip = n('g', { 'pointer-events': 'none', visibility: 'hidden' }), tw = Math.min(285, W - 16);
        tip.append(n('rect', { width: tw, height: 86, rx: 10, fill: '#163344', opacity: .97 }));
        const lines = [0, 1, 2, 3].map(i => n('text', { x: 11, y: 18 + 18 * i, fill: i === 0 ? '#fff' : '#daebf6', 'font-size': 11, 'font-weight': i === 0 ? 700 : 400 })); lines.forEach(e => tip.append(e));
        const defaultIndex = S.chart?.index >= first && S.chart.index <= N ? S.chart.index : N;
        function inspect(i, showTooltip = true) {
            i = Math.max(first, Math.min(N, i)); S.chart.index = i;
            const future = i === N, p = future ? d.prediction : back.get(dates[i]);
            const labels = [P.monthLabel(dates[i]), future ? `Forecast: ${d.available ? P.format(p) + ' estimated cases' : 'unavailable'}` : `Recorded: ${P.format(v.history[i], 0)} cases`, future ? d.rangeAvailable ? `95% model range: ${P.format(d.forecast.lower)}–${P.format(d.forecast.upper)}` : 'No forecast range available' : `Past prediction: ${finite(p) ? P.format(p) + ' cases' : 'not tested / unavailable'}`, future ? `History ends ${P.monthLabel(d.cutoff)}` : 'Recorded synthetic monthly cases'];
            text('sarima-chart-readout', labels.slice(0, 3).join(' · '));
            $('sarima-previous-point').disabled = i === first; $('sarima-next-point').disabled = i === N;
            cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', showTooltip ? 'visible' : 'hidden');
            lines.forEach((e, k) => { e.textContent = labels[k]; });
            const py = future && d.available ? y(d.prediction) : y(v.history[i] || 0);
            tip.setAttribute('transform', `translate(${Math.max(8, Math.min(W - tw - 8, x(i) - tw / 2))},${Math.max(T + 5, Math.min(H - B - 91, py - 100))})`);
            tip.setAttribute('visibility', showTooltip ? 'visible' : 'hidden');
        }
        S.chart = { index: defaultIndex, inspect };
        for (const [i, value] of [...history, ...(d.available ? [[N, d.prediction]] : [])]) {
            const future = i === N;
            const point = n('circle', { cx: x(i), cy: y(value), r: future ? 8 : 3.5, fill: future ? 'transparent' : dark ? '#172436' : '#fff', stroke: future ? 'none' : colors.blue, 'stroke-width': 1.5, tabindex: 0, role: 'button', 'data-month': dates[i], 'aria-label': `${P.monthLabel(dates[i])}: ${P.format(value, future ? 2 : 0)} ${future ? 'estimated' : 'recorded synthetic'} cases` });
            point.append(n('title', {}, `${P.monthLabel(dates[i])}: ${P.format(value)} cases`));
            point.addEventListener('focus', () => inspect(i)); point.addEventListener('pointerenter', () => inspect(i)); point.addEventListener('click', () => inspect(i));
            point.addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); inspect(i); } });
            svg.append(point);
        }
        svg.append(cross, tip);
        svg.addEventListener('pointermove', event => { const box = svg.getBoundingClientRect(), px = (event.clientX - box.left) / box.width * W; if (px >= L && px <= W - R) inspect(Math.round(first + (px - L) / (W - L - R) * (N - first))); });
        svg.addEventListener('pointerleave', () => { tip.setAttribute('visibility', 'hidden'); cross.setAttribute('visibility', 'hidden'); });
        target.replaceChildren(svg); inspect(defaultIndex, false);
        text('sarima-chart-title', `${v.disease === 'ALL' ? 'Disease' : v.disease} cases and forecast`);
        text('sarima-chart-subtitle', `${v.barangay === 'ALL' ? 'All seven barangays' : v.barangay} · ${P.monthLabel(dates[first])}–${P.monthLabel(d.target)}`);
        text('sarima-chart-note', !d.available ? 'No accepted next-month SARIMA forecast is available. Recorded history and available past predictions are shown.' : d.rangeAvailable ? 'Shading marks the forecast period. The range is a nominal 95% model interval; actual future cases are unknown.' : d.method === 'Seasonal Naive' ? 'Shading marks the forecast period. Seasonal Naive uses the same month of the previous year; no calibrated prediction interval is available.' : 'Shading marks the forecast period. A combined uncertainty range is not available.');
    }
    function start() {
        if (!$('view-predictive')) return;
        if (!P) { chartMessage('The forecast display module could not load. Refresh the page.'); return; }
        ['predictive-disease-select', 'predictive-brgy-select'].forEach(id => $(id).addEventListener('change', clearSelection));
        $('sarima-window').addEventListener('change', () => { S.chart = null; drawChart(); });
        $('sarima-previous-point').addEventListener('click', () => S.chart?.inspect(S.chart.index - 1));
        $('sarima-next-point').addEventListener('click', () => S.chart?.inspect(S.chart.index + 1));
        const info = $('sarima-score-info');
        document.addEventListener('keydown', event => { if (event.key === 'Escape' && info.open) { info.open = false; info.querySelector('summary').focus(); } });
        document.addEventListener('pointerdown', event => { if (!info.contains(event.target)) info.open = false; });
        if (window.ResizeObserver) new ResizeObserver(entries => { const width = Math.round(entries[0].contentRect.width); if (width && width !== S.width) { S.width = width; drawChart(); } }).observe($('sarima-chart'));
        if (window.MutationObserver) new MutationObserver(() => drawChart()).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        document.querySelector('[data-target="view-predictive"]')?.addEventListener('click', () => requestAnimationFrame(drawChart));
        initialize();
    }
    window.runPredictiveModel = run;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
