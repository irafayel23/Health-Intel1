// BHW and MHO display of verified saved SARIMA results. Predict never starts fitting.
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const P = window.HealthIntelSarimaPresentation;
    const C = window.HealthIntelCmpPresentation;
    const assignedScope = () => $('view-predictive')?.dataset?.assignedBarangay === 'true';
    const selectionPrompt = () => assignedScope() ? 'Select a disease' : 'Select a disease and barangay';
    const S = { meta: null, result: null, presentation: null, controller: null, sequence: 0, width: 0, chart: null, cmp: null };
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
        S.result = null; S.presentation = null; S.chart = null; S.cmp = null; C?.reset();
        renderEstimateInfo(null);
        ring(null);
        $('sarima-fallback').hidden = true;
        $('sarima-fallback-rows').replaceChildren();
        text('sarima-fallback-coverage', '');
        ['sarima-mae', 'sarima-rmse', 'sarima-mape'].forEach(id => text(id, '—'));
        ['forecast-months', 'sarima-missing', 'forecast-recommendations'].forEach(id => { $(id).hidden = true; });
        text('sarima-scope', 'Results for your selection');
        text('sarima-method', 'Prediction method');
        text('sarima-seasonality-note', ''); $('sarima-seasonality-note').hidden = true;
        text('sarima-score-count', 'Select Predict to see past performance.');
        text('sarima-score-note', ''); text('sarima-mape-denominator', '');
        text('sarima-score-formula', 'Select Predict to see the calculation for this selection.');
        text('predictive-insight-text', selectionPrompt() + ' to view a prediction from the chosen history.');
        text('sarima-history-summary', ''); text('sarima-evaluation-summary', '');
        $('forecast-recommendation-status').hidden = false;
        text('forecast-recommendation-status', 'Select Predict to see suggested follow-up.');
        $('sarima-previous-point').disabled = true; $('sarima-next-point').disabled = true;
        text('sarima-chart-title', 'Cases and prediction');
        text('sarima-chart-subtitle', 'Recorded history and saved SARIMA estimates');
        text('sarima-chart-note', 'Available prediction ranges describe model uncertainty; actual future cases are unknown.');
        text('sarima-chart-readout', 'Point to a month or use the arrows to inspect its values.');
        if (!initial) chartMessage(message);
    }
    function clearSelection() {
        S.sequence++; S.controller?.abort(); reset('Predict to view this selection.');
        $('sarima-dashboard').setAttribute('aria-busy', 'false');
        $('run-forecast-button').disabled = false; text('run-forecast-button', (assignedScope() ? 'Predict' : 'View prediction'));
        text('sarima-state', 'Selection changed. Predict to update the results.');
    }
    async function get(path, signal) {
        const response = await fetch(base() + path, { signal });
        const body = await response.json();
        if (!response.ok || !body.success) throw Error(body.error || 'The saved prediction could not be loaded.');
        return body.data;
    }
    function currentMonth() {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
        return parts.find(p => p.type === 'year').value + '-' + parts.find(p => p.type === 'month').value;
    }
    let demonstrationChosen = false;
    const operational = () => S.result?.provenance?.mode === 'verified_operational_monthly_snapshot';
    const role = () => assignedScope() ? 'bhw' : 'mho';
    async function selectedSource(signal) {
        const publishedBase = '/api/' + role() + '/operational-predictions';
        const status = await get(publishedBase + (assignedScope() ? '/status' : '/publication'), signal);
        const publication = status?.publication;
        if (publication !== null && (typeof publication?.run_id !== 'string' || !publication.run_id)) {
            throw Error('The publication status response is incomplete.');
        }
        const published = publication !== null;
        const usePublished = published && (assignedScope() || !demonstrationChosen);
        return { endpoint:usePublished ? publishedBase : '/api/' + role() + '/sarima-demo', published:usePublished, version:publication?.run_id };
    }
    function showProvenance(data, published, cutoff = data.context?.cutoff) {
        const history = cutoff ? ' · History through ' + P.monthLabel(cutoff) : '';
        text('sarima-provenance', published
            ? `Data source: confirmed operational case reports${history} · Published version ${data.provenance.version}.`
            : `Data source: ITR-derived records combined with generated monthly counts${history}.`);
    }
    function fillChoices(meta) {
        const fill = (id, names) => {
            const current = $(id).value;
            $(id).replaceChildren(...names.map(name => {
                const option = node('option', '', name); option.value = name; return option;
            }));
            $(id).value = names.includes(current) ? current : names[0];
            $(id).disabled = false;
        };
        fill('predictive-disease-select', meta.diseases);
        fill('predictive-brgy-select', assignedScope() ? [meta.barangay] : meta.barangays);
        if (assignedScope()) $('predictive-brgy-select').disabled = true;
    }
    async function loadPrediction(predict = false) {
        const sequence = ++S.sequence;
        S.controller?.abort();
        const controller = new AbortController(); S.controller = controller;
        const button = $('run-forecast-button');
        const timeout = setTimeout(() => controller.abort(), 15000);
        reset('Loading the selected prediction history…');
        text('sarima-provenance', 'Checking the current prediction source…');
        text('sarima-state', 'Loading saved SARIMA results…');
        button.disabled = true; text('run-forecast-button', 'Loading…');
        $('sarima-dashboard').setAttribute('aria-busy', 'true');
        let source;
        let choicesReady = false;
        try {
            source = await selectedSource(controller.signal);
            if (sequence !== S.sequence) return;
            const panel = $('prediction-source-panel');
            if (panel) {
                panel.hidden = !source.version;
                $('prediction-source').value = source.published ? 'operational' : 'demonstration';
            }
            if (S.endpoint !== source.endpoint || !S.meta || (!predict && source.published && S.meta.provenance?.version !== source.version)) {
                const meta = await get(source.endpoint + '/options', controller.signal);
                if (sequence !== S.sequence) return;
                S.meta = meta; S.endpoint = source.endpoint;
                fillChoices(meta);
            }
            choicesReady = true;
            C?.enable(source.published || S.meta.experimental_probability_enabled === true);
            if (!predict) {
                showProvenance(S.meta, source.published);
                const target = S.meta.context?.main_target || (S.meta.context?.cutoff && P.followingMonth(S.meta.context.cutoff));
                text('sarima-state', target ? `${source.published ? 'Published' : 'Saved demonstration'} prediction for ${P.monthLabel(target)}.` : 'Saved predictions for ' + S.meta.barangay + '.');
                chartMessage(selectionPrompt() + ', then select Predict to view the saved result.');
                return;
            }
            const query = new URLSearchParams({ disease: $('predictive-disease-select').value });
            if (!assignedScope()) {
                query.set('barangay', $('predictive-brgy-select').value);
                query.set('protocol', '80_20');
                query.set('horizon', '1');
            }
            const result = await get(source.endpoint + (source.published ? '/prediction?' : '?') + query, controller.signal);
            if (sequence !== S.sequence) return;
            if (source.published && (result.provenance?.mode !== 'verified_operational_monthly_snapshot' || !result.provenance.version)) {
                throw Error('The published prediction version could not be verified.');
            }
            const presentation = P.derive(result);
            S.result = result; S.presentation = presentation;
            S.meta = {...S.meta, context:result.context, provenance:result.provenance};
            showProvenance(result, source.published);
            render();
        } catch (error) {
            if (sequence !== S.sequence) return;
            reset('The prediction could not be loaded. Please try again.');
            text('predictive-insight-text', 'Prediction unavailable. Please try again.');
            text('forecast-recommendation-status', 'Prediction-dependent suggestions are unavailable until the results load.');
            text('sarima-state', error.name === 'AbortError' ? 'Loading timed out. Check the connection and retry.'
                : !source ? 'Publication status unavailable. Try again to check the current prediction source.'
                : (choicesReady ? 'The saved prediction could not be loaded. ' : 'Could not load prediction choices. ') + error.message);
            text('sarima-provenance', source?.published ? 'Operational source unavailable. No demonstration records have been substituted.'
                : source ? 'Demonstration source unavailable.' : 'Prediction source unverified.');
            if (!choicesReady) {
                $('predictive-disease-select').disabled = true;
                $('predictive-brgy-select').disabled = true;
                S.meta = null;
            }
        } finally {
            clearTimeout(timeout);
            if (sequence === S.sequence) {
                button.disabled = false; text('run-forecast-button', choicesReady ? (assignedScope() ? 'Predict' : 'View prediction') : 'Retry loading');
                $('sarima-dashboard').setAttribute('aria-busy', 'false');
            }
        }
    }
    function run() {
        if (!$('run-forecast-button').disabled) return loadPrediction(Boolean(S.meta));
    }
    function renderFallback(fallback) {
        const section = $('sarima-fallback');
        const history = fallback?.historical;
        const current = fallback?.current;
        const rows = [...(current ? [current] : []), ...(history?.rows || [])];
        section.hidden = rows.length === 0;
        text('sarima-fallback-coverage', history?.rows.length
            ? `Historical availability for this selection: SARIMA ${history.sarima_available} of ${history.attempted} · With fallback ${history.combined_available} of ${history.attempted}.`
            : '');
        $('sarima-fallback-rows').replaceChildren(...rows.map(row => {
            const item = node('li', 'rounded-xl border border-border bg-slate-50 px-4 py-3 dark:bg-slate-900');
            const count = `${P.format(row.prediction, 0)} ${row.prediction === 1 ? 'case' : 'cases'}`;
            const details = row.actual === null
                ? `Source: ${P.monthLabel(row.source_month)}.`
                : `Source: ${P.monthLabel(row.source_month)} · Historical actual: ${row.actual} · Absolute error: ${row.absolute_error}`;
            item.append(
                node('h3', 'text-sm font-semibold text-foreground', `${P.monthLabel(row.target)} · ${count}`),
                node('p', 'mt-1 text-xs font-medium text-foreground', row.label),
                node('p', 'mt-1 text-xs leading-relaxed text-muted-foreground', details)
            );
            return item;
        }));
        return current;
    }
    function renderEstimateInfo(details) {
        const info = $('sarima-estimate-info');
        if (!info) return;
        const model = details && P.modelCalculation(details);
        const content = $('sarima-estimate-info-content');
        info.open = false;
        info.hidden = !model;
        content.replaceChildren();
        text('sarima-estimate-info-scope', model ? details.scope + ' · ' + P.monthLabel(details.target) : '');
        if (!model) return;

        for (const term of model.terms) {
            const row = node('p');
            row.append(node('strong', 'font-semibold', term.label + ' '), node('span', 'tabular-nums', P.format(term.value, 6)));
            content.append(row);
        }
        if (P.finite(model.priorYearCases)) {
            content.append(node('p', '', P.monthLabel(model.priorMonth) + ' recorded cases · ' + model.priorYearCases));
        }
        content.append(node('p', 'rounded-lg bg-muted p-2 tabular-nums', model.equation));
        if (model.fullEquation) {
            content.append(node('p', 'rounded-lg bg-muted p-2 tabular-nums', model.fullEquation));
        }
        content.append(
            node('p', 'font-semibold', P.format(model.prediction, 4) + ' expected cases · ' + P.format(model.prediction, 0) + ' on the dashboard')
        );
    }
    function render() {
        const d = S.presentation; if (!d) return;
        const { metrics: m, view: v } = d;
        const currentFallback = renderFallback(v.seasonal_fallback);
        text('sarima-state', `${d.scope} · ${operational()?'Published':'Saved demonstration'} ${P.monthLabel(d.target)} prediction${S.result.current_data_matches===false?' · Reporting changed: this published snapshot has not been updated.':''}${operational() && d.target < currentMonth()?' · Archived target month; prepare a current update.':''}`);
        text('sarima-scope', d.scope); ring(d.score);
        text('sarima-score-count', m.available ? `${m.within_tolerance_hits} of ${m.available} past predictions met the error limit.` : 'A complete historical score is unavailable.');
        text('sarima-score-note', `${m.available} of ${m.attempted} historical predictions available${m.unavailable ? `; ${m.unavailable} unavailable` : ''}.`);
        text('sarima-score-formula', m.available
            ? `${m.within_tolerance_hits} ÷ ${m.available} × 100 = ${P.format(d.score)}%. Unavailable predictions are excluded from this percentage and counted on the card.`
            : `No complete predictions were available for ${m.attempted} requested test months. A percentage cannot be calculated.`);
        text('sarima-mae', P.format(m.MAE)); text('sarima-rmse', P.format(m.RMSE));
        text('sarima-mape', m.MAPE_positive_pct === null ? 'Unavailable' : P.format(m.MAPE_positive_pct) + '%');
        text('sarima-mape-denominator', m.MAPE_zero_actual_excluded ? `${m.MAPE_zero_actual_excluded} zero-count targets excluded from MAPE only.` : '');
        $('forecast-months').hidden = false;
        text('sarima-main-month', `${P.monthLabel(d.target)} estimate`);
        renderEstimateInfo(d);
        text('sarima-main-estimate', d.available ? P.format(d.prediction, 0) : 'Unavailable');
        $('sarima-main-estimate').classList.toggle('text-5xl', d.available);
        $('sarima-main-estimate').classList.toggle('text-2xl', !d.available);
        text('sarima-main-range', d.rangeAvailable ? `95% model range: ${d.interval}` : d.interval);
        text('sarima-main-note', `One month after the last recorded month, ${P.monthLabel(d.cutoff)}.`);
        text('sarima-summary-scope', d.scope);
        text('sarima-method', d.method);
        const estimateModel = $('mho-estimate-model');
        if (estimateModel) estimateModel.textContent = d.available ? `${d.method} case estimate` : 'Case estimate unavailable';
        const weakSeason = d.available && d.method === 'SARIMA' && !!v.weak_components;
        $('sarima-seasonality-note').hidden = !weakSeason;
        text('sarima-seasonality-note', weakSeason ? 'Annual seasonal evidence is weak or uncertain for this selection. The SARIMA fit passed numerical checks; this does not establish significant annual seasonality.' : '');
        text('sarima-previous-month', `${P.monthLabel(d.cutoff)} recorded`);
        text('sarima-previous-cases', P.format(d.previous, 0) + ' cases');
        text('sarima-trend', d.trend); text('sarima-change', d.changeText);
        text('predictive-insight-text', currentFallback
            ? 'SARIMA is unavailable for this month. See the separate seasonal fallback estimate above.'
            : d.explanation);
        text('sarima-history-summary', d.available && d.previous === 0 ? 'Percentage change is not calculated because the previous count was zero.' : '');
        text('sarima-evaluation-summary', d.available ? 'Estimated counts are rounded for readability. Prediction ranges are model uncertainty, not guarantees.' : 'Historical test scores describe past predictions. No next-month case count has been substituted.');
        $('forecast-recommendation-status').hidden = true; $('forecast-recommendations').hidden = false;
        $('forecast-recommendations').replaceChildren(...d.recommendations.map(r => {
            const card = node('li', 'flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card');
            card.dataset.rule = r.id;
            const content = node('div', 'flex-1 border-l-4 border-teal-600 p-4 sm:p-5');
            content.append(
                node('h3', 'text-base font-bold leading-snug text-foreground', r.title),
                node('p', 'mt-2 text-sm leading-relaxed text-foreground', r.action)
            );
            card.append(content);
            if (r.owner) {
                const team = node('p', 'border-t border-border bg-slate-50 px-4 py-3 text-xs leading-relaxed text-foreground dark:bg-slate-900 sm:px-5');
                team.append(node('strong', 'font-semibold', 'Responsible team: '), node('span', '', r.owner));
                card.append(team);
            }
            return card;
        }));
        const missing = S.result.missing_components || [];
        $('sarima-missing').hidden = d.available;
        text('sarima-missing-note', currentFallback
            ? 'The seasonal fallback above provides a case count for this month.'
            : v.required_components === 1
            ? 'No SARIMA model passed all required checks for this disease and barangay. The next-month estimate is unavailable; recorded history and available historical test scores are still shown.'
            : `${missing.length} of ${v.required_components} required disease–barangay predictions are unavailable. A complete estimate cannot be shown.`);
        $('sarima-missing-list').replaceChildren(...missing.map(r => node('li', '', `${r.disease} · ${r.barangay}`)));
        S.cmp = C?.render(S.result, d) || null;
        drawChart();
    }

    function drawChart() {
        const d = S.presentation, target = $('sarima-chart'); if (!d || !target.clientWidth) return;
        const band = S.cmp || (d.rangeAvailable ? {lower:d.forecast.lower,upper:d.forecast.upper,label:'SARIMA 95% model interval'} : null);
        const v = d.view, W = Math.max(240, target.clientWidth), mobile = W < 500;
        const H = mobile ? 330 : 420, L = mobile ? 42 : 50, R = mobile ? 18 : 24, T = 66, B = 52;
        const N = v.history.length, first = Math.max(0, N - Number($('sarima-window').value)), last = N;
        const dates = [...v.dates, d.target], back = new Map(d.evaluation.rows.map(r => [r.target, r.prediction]));
        const finite = P.finite, visibleTests = d.evaluation.rows.filter(r => dates.indexOf(r.target) >= first && finite(r.prediction));
        const values = [...v.history.slice(first), ...visibleTests.map(r => r.prediction), ...[d.prediction, band?.upper].filter(finite)];
        const rawMax = Math.max(1, ...values) * 1.12, unit = 10 ** Math.floor(Math.log10(rawMax / 4));
        const step = Math.max(1, [1, 2, 5, 10].find(k => k * unit >= rawMax / 4) * unit), maximum = Math.ceil(rawMax / step) * step;
        const x = i => L + (i - first) / Math.max(1, last - first) * (W - L - R), y = a => H - B - a / maximum * (H - T - B);
        const dark = document.documentElement.classList.contains('dark');
        const colors = { grid: dark ? '#293749' : '#e8eef5', muted: dark ? '#9aadc3' : '#72849b', blue: dark ? '#60a5fa' : '#3b82f6', violet: dark ? '#c4b5fd' : '#8b5cf6', teal: dark ? '#2dd4bf' : '#0d9488', region: dark ? '#0c342f' : '#eaf8f4', paper: dark ? '#132b32' : '#ecfdf5' };
        const ns = 'http://www.w3.org/2000/svg';
        const n = (tag, attributes = {}, value) => { const e = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attributes)) e.setAttribute(key, String(value)); if (value !== undefined) e.textContent = value; return e; };
        const svg = n('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img', 'aria-label': `${d.scope}: recorded cases, past predictions and saved ${P.monthLabel(d.target)} prediction` });
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
            if (band) {
                svg.append(n('polygon', { points: [[N - 1, d.previous], [N, band?.lower], [N, band?.upper]].map(([i, a]) => `${x(i)},${y(a)}`).join(' '), fill: colors.teal, opacity: .13, 'data-forecast-interval': 'true' }));
                svg.append(n('line', { x1: x(N), x2: x(N), y1: y(band?.lower), y2: y(band?.upper), stroke: colors.teal, 'stroke-width': 5, opacity: .28 }));
                [band?.lower, band?.upper].forEach(a => svg.append(n('line', { x1: x(N) - 5, x2: x(N) + 5, y1: y(a), y2: y(a), stroke: colors.teal, 'stroke-width': 1.5 })));
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
        const cross = n('line', { y1: T, y2: H - B, stroke: colors.muted, 'stroke-dasharray': '3 4', 'pointer-events': 'none', visibility: 'hidden' });
        const tip = n('g', { 'pointer-events': 'none', visibility: 'hidden' }), tw = Math.min(285, W - 16);
        tip.append(n('rect', { width: tw, height: 86, rx: 10, fill: '#163344', opacity: .97 }));
        const lines = [0, 1, 2, 3].map(i => n('text', { x: 11, y: 18 + 18 * i, fill: i === 0 ? '#fff' : '#daebf6', 'font-size': 11, 'font-weight': i === 0 ? 700 : 400 })); lines.forEach(e => tip.append(e));
        const defaultIndex = S.chart?.index >= first && S.chart.index <= N ? S.chart.index : N;
        function inspect(i, showTooltip = true, preferPrediction = false) {
            i = Math.max(first, Math.min(N, i)); S.chart.index = i;
            const future = i === N, p = future ? d.prediction : back.get(dates[i]);
            const labels = [P.monthLabel(dates[i]), future ? `Prediction: ${d.available ? P.format(p, 0) + ' estimated cases' : 'unavailable'}` : `Recorded: ${P.format(v.history[i], 0)} cases`, future ? band ? `${band.label}: ${P.format(band.lower)}–${P.format(band.upper)}` : 'No prediction range available' : `Past prediction: ${finite(p) ? P.format(p) + ' cases' : 'not tested / unavailable'}`, future ? `History ends ${P.monthLabel(d.cutoff)}` : operational() ? 'Recorded operational monthly cases' : 'Recorded demonstration monthly cases'];
            if (preferPrediction) [labels[1], labels[2]] = [labels[2], labels[1]];
            text('sarima-chart-readout', labels.slice(0, 3).join(' · '));
            $('sarima-previous-point').disabled = i === first; $('sarima-next-point').disabled = i === N;
            cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', showTooltip ? 'visible' : 'hidden');
            lines.forEach((e, k) => { e.textContent = labels[k]; });
            const py = finite(p) && (future || preferPrediction) ? y(p) : y(v.history[i] || 0);
            tip.setAttribute('transform', `translate(${Math.max(8, Math.min(W - tw - 8, x(i) - tw / 2))},${Math.max(T + 5, Math.min(H - B - 91, py - 100))})`);
            tip.setAttribute('visibility', showTooltip ? 'visible' : 'hidden');
        }
        S.chart = { index: defaultIndex, inspect };
        const pointTargets = new Map();
        function addInteractivePoint(point, i, preferPrediction = false) {
            const select = () => inspect(i, true, preferPrediction);
            pointTargets.set(point, select);
            point.addEventListener('focus', select);
            point.addEventListener('pointerenter', select);
            point.addEventListener('click', select);
            point.addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); select(); } });
            svg.append(point);
        }
        const historyDotRadius = 3.5;
        for (const [i, value] of [...history, ...(d.available ? [[N, d.prediction]] : [])]) {
            const future = i === N;
            const point = n('circle', { cx: x(i), cy: y(value), r: future ? 8 : historyDotRadius, fill: future ? 'transparent' : dark ? '#172436' : '#fff', stroke: future ? 'none' : colors.blue, 'stroke-width': 1.5, tabindex: 0, role: 'button', 'data-month': dates[i], 'aria-label': `${P.monthLabel(dates[i])}: ${P.format(value, 0)} ${future ? 'estimated' : (operational() ? 'recorded operational' : 'recorded demonstration')} cases` });
            point.append(n('title', {}, `${P.monthLabel(dates[i])}: ${P.format(value, 0)} cases`));
            addInteractivePoint(point, i);
        }
        // Widen the tap area around each prediction while keeping it in its own month.
        const tapRadius = Math.min(20, (x(first + 1) - x(first)) / 2);
        for (const row of visibleTests) {
            const i = dates.indexOf(row.target);
            if (i >= N) continue;
            const point = n('ellipse', { cx: x(i), cy: y(row.prediction), rx: tapRadius, ry: 22, fill: 'transparent', tabindex: 0, role: 'button', 'data-backtest-month': row.target, 'aria-label': `${P.monthLabel(row.target)}: past prediction ${P.format(row.prediction)} cases` });
            addInteractivePoint(point, i, true);
        }
        svg.append(cross, tip);
        svg.addEventListener('pointermove', event => {
            if (event.pointerType === 'touch') return;
            const selectPoint = pointTargets.get(event.target) || pointTargets.get(event.target?.parentElement);
            if (selectPoint) { selectPoint(); return; }
            const box = svg.getBoundingClientRect(), px = (event.clientX - box.left) / box.width * W;
            if (px >= L && px <= W - R) inspect(Math.round(first + (px - L) / (W - L - R) * (N - first)));
        });
        svg.addEventListener('pointerleave', event => {
            if (event.pointerType === 'touch') return;
            tip.setAttribute('visibility', 'hidden'); cross.setAttribute('visibility', 'hidden');
        });
        target.replaceChildren(svg); inspect(defaultIndex, false);
        text('sarima-chart-title', `${v.disease === 'ALL' ? 'Disease' : v.disease} cases and prediction`);
        text('sarima-chart-subtitle', `${v.barangay === 'ALL' ? 'All seven barangays' : v.barangay} · ${P.monthLabel(dates[first])}–${P.monthLabel(d.target)}`);
        text('sarima-chart-note', !d.available ? 'No accepted next-month SARIMA prediction is available. Recorded history and available past predictions are shown.' : band ? `Shading marks the prediction period. Range: ${band.label}. Actual future cases are unknown.` : d.method === 'Seasonal Naive' ? 'Shading marks the prediction period. Seasonal Naive uses the same month of the previous year; no calibrated prediction interval is available.' : 'Shading marks the prediction period. A combined uncertainty range is not available.');
    }
    function start() {
        if (!$('view-predictive')) return;
        if (assignedScope()) $('run-forecast-button').addEventListener('click', run);
        $('prediction-source')?.addEventListener('change', () => window.selectSarimaSource());
        if (!P) { chartMessage('The prediction display module could not load. Refresh the page.'); return; }
        ['predictive-disease-select', 'predictive-brgy-select'].forEach(id => $(id).addEventListener('change', clearSelection));
        $('sarima-window').addEventListener('change', () => { S.chart = null; drawChart(); });
        $('sarima-previous-point').addEventListener('click', () => S.chart?.inspect(S.chart.index - 1));
        $('sarima-next-point').addEventListener('click', () => S.chart?.inspect(S.chart.index + 1));
        const disclosures = [$('sarima-score-info'), $('sarima-estimate-info')].filter(Boolean);
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            for (const info of disclosures) {
                if (!info.open) continue;
                info.open = false;
                info.querySelector('summary').focus();
            }
        });
        document.addEventListener('pointerdown', event => {
            for (const info of disclosures) {
                if (!info.contains(event.target)) info.open = false;
            }
        });
        if (window.ResizeObserver) new ResizeObserver(entries => { const width = Math.round(entries[0].contentRect.width); if (width && width !== S.width) { S.width = width; drawChart(); } }).observe($('sarima-chart'));
        if (window.MutationObserver) new MutationObserver(() => drawChart()).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        document.querySelector('[data-target="view-predictive"]')?.addEventListener('click', () => requestAnimationFrame(drawChart));
        loadPrediction();
    }
    window.refreshSarimaSource = () => {
        demonstrationChosen = false;
        return loadPrediction();
    };
    window.selectSarimaSource = () => {
        demonstrationChosen = $('prediction-source').value === 'demonstration';
        return loadPrediction();
    };
    window.runPredictiveModel = run;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
