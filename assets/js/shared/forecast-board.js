(() => {
    'use strict';

    const host = document.querySelector('[data-forecast-board]');
    if (!host) return;
    const role = host.dataset.forecastBoard;
    const endpoint = '/api/' + role + '/operational-predictions';
    const number = (value, digits = 0) => value == null ? 'Unavailable' : Number(value).toLocaleString('en-PH', { maximumFractionDigits: digits });
    const monthLabel = (period, month = 'short') => new Intl.DateTimeFormat('en-PH', { month, year: 'numeric', timeZone: 'UTC' }).format(new Date(period + '-01T00:00:00Z'));
    const issueLabel = value => new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });
    const percentage = value => value == null ? 'Unavailable' : number(100 * value, 1) + '%';
    const cases = count => count === 1 ? 'case' : 'cases';
    let sequence = 0;
    let disposeDrawer = () => {};
    let visible = false;

    function element(tag, text, cls) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (cls) node.className = cls;
        return node;
    }

    function table(headers, rows, options = {}) {
        const result = element('table', undefined, 'forecast-table');
        const head = result.createTHead().insertRow();
        for (const header of headers) {
            const cell = element('th');
            cell.scope = 'col';
            cell.append(header);
            head.append(cell);
        }
        const body = result.createTBody();
        for (const row of rows) {
            const tr = body.insertRow();
            row.forEach((value, index) => {
                const cell = element(index === 0 ? 'th' : 'td');
                if (index === 0) cell.scope = 'row';
                if (options.scroll) cell.dataset.column = typeof headers[index] === 'string' ? headers[index] : headers[index].textContent;
                cell.append(value);
                tr.append(cell);
            });
        }
        const wrap = element('div', undefined, 'forecast-table-wrap' + (options.scroll ? ' forecast-scroll' : ''));
        if (options.scroll) {
            wrap.tabIndex = 0;
            wrap.setAttribute('role', 'region');
            wrap.setAttribute('aria-label', options.scroll);
        }
        wrap.append(result);
        return { wrap, body };
    }

    function control(label, options, change) {
        const wrapper = element('label', label, 'forecast-control');
        const select = element('select');
        select.setAttribute('aria-label', label);
        for (const [value, title] of options) select.add(new Option(title, value));
        select.addEventListener('change', () => change(select.value));
        wrapper.append(select);
        return { wrapper, select };
    }

    function disclosure(label, content, open) {
        const details = element('details');
        details.open = !!open;
        details.append(element('summary', label), content);
        return details;
    }

    async function request(route) {
        const base = window.HealthIntel?.apiOrigin || 'http://localhost:3000';
        const response = await fetch(base + endpoint + route, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
        const result = await response.json();
        if (!response.ok || !result.success) throw Object.assign(Error(result.error || 'Could not load predictions.'), { status: response.status, code: result.code });
        return result.data;
    }

    const forecastBody = element('div', undefined, 'forecast-board');
    const toolbar = element('div', undefined, 'forecast-toolbar');
    const meta = element('div', undefined, 'forecast-meta forecast-metadata');
    meta.setAttribute('role', 'status');
    const source = control('Prediction source', [
        ['published', 'Published predictions'],
        ['draft', 'Saved drafts'],
        ['demo', 'Predictive preview'],
    ], value => selectAdminSource(value));
    const history = control('Version', [], () => load());
    history.wrapper.hidden = true;
    if (role === 'admin') toolbar.append(source.wrapper, history.wrapper);
    toolbar.append(meta);
    host.append(toolbar, forecastBody);

    function fitExplanation(model) {
        const box = element('div');
        if (!model) {
            box.append(element('p', 'The saved version has no accepted fit for this selection.'));
            return box;
        }
        const [p, d, q] = model.order;
        const [P, D, Q, season] = model.seasonal_order;
        const coefficient = (symbol, prefix, n, lag, sign) => {
            const terms = Array.from({ length: n }, (_, i) => [model.params[prefix + (i + 1) * lag], (i + 1) * lag]);
            return terms.every(([v]) => Number.isFinite(v)) ? '(' + ['1', ...terms.map(([value, l]) => {
                const signed = sign * value;
                return (signed < 0 ? ' − ' : ' + ') + number(Math.abs(signed), 6) + 'B' + (l === 1 ? '' : '^' + l);
            })].join('') + ')' : symbol;
        };
        const ar = coefficient('φ(B)', 'ar.L', p, 1, -1);
        const sar = coefficient('Φ(B^12)', 'ar.S.L', P, season, -1);
        const ma = coefficient('θ(B)', 'ma.L', q, 1, 1);
        const sma = coefficient('Θ(B^12)', 'ma.S.L', Q, season, 1);
        const diff = (d ? '(1 − B)^' + d + ' ' : '') + (D ? '(1 − B^' + season + ')^' + D + ' ' : '');
        box.append(element('p', 'SARIMA (' + model.order.join(', ') + ') × (' + model.seasonal_order.join(', ') + ')'));
        box.append(element('p', ar + ' ' + sar + ' ' + diff + 'yₜ = ' + number(model.params.intercept ?? 0, 6) + ' + ' + ma + ' ' + sma + 'εₜ', 'forecast-info'));
        box.append(element('p', 'B shifts the series back one month. The annual terms use lag ' + season + '. Forecasts use the fitted state and the expected value of future errors, which is zero. Equation coefficients are rounded here for readability.', 'forecast-info'));
        const diagnostics = [
            ['Convergence', model.converged ? 'Passed' : 'Unavailable'],
            ['Annual evidence', String(model.seasonal_evidence || 'Unavailable').replaceAll('_', ' ')],
            ['Selection', String(model.selection || 'Unavailable').replaceAll('_', ' ')],
            ['Minimum finite root', number(model.roots, 5)],
            ['Residual checks', (model.residuals || []).map(r => 'Lag ' + r.lag + ' · p ' + number(r.pvalue, 4)).join(', ') || 'Unavailable'],
        ];
        box.append(table(['Diagnostic', 'Saved value'], diagnostics).wrap);
        box.append(table(['Coefficient', 'Value'], Object.entries(model.params).map(([key, value]) => [key, String(value)])).wrap);
        return box;
    }

    function seasonalTable(history, target, mean) {
        const month = target.slice(5);
        const matches = history.filter(r => r.month < target && r.month.slice(5) === month && Number.isFinite(r.cases));
        const box = element('div');
        box.append(element('p', 'These recorded counts show the seasonal pattern. SARIMA uses its fitted coefficients and historical inputs to calculate the estimate.', 'forecast-info'));
        if (!matches.length) box.append(element('p', 'No saved counts for the same calendar month.', 'forecast-info'));
        box.append(table(['Month', 'Cases'], [
            ...matches.map(r => [monthLabel(r.month, 'long') + ' · Actual', number(r.cases)]),
            [monthLabel(target, 'long') + ' · SARIMA estimate', number(mean, 4)]
        ]).wrap);
        return disclosure('Historical seasonal patterns', box);
    }

    function municipalHistory(rows) {
        const months = new Map();
        for (const row of rows) {
            for (const { month, cases } of row.history) {
                if (!Number.isFinite(cases)) continue;
                const values = months.get(month) || [];
                values.push(cases);
                months.set(month, values);
            }
        }
        return [...months].filter(([, values]) => values.length === 7)
            .map(([month, values]) => ({ month, cases: values.reduce((sum, cases) => sum + cases, 0) }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }

    function municipalCalculation(rows, month, aggregate) {
        const box = element('div');
        const raw = value => value == null ? 'Unavailable' : String(value);
        box.append(table(['Barangay', 'Unrounded SARIMA estimate'], rows.map(place =>
            [place.barangay, raw(place.estimates[month].mean)])).wrap);
        box.append(element('p', 'Unrounded total · ' + raw(aggregate.mean), 'forecast-info'),
            element('p', 'Rounded municipal prediction · ' + number(aggregate.mean == null ? null : Math.round(aggregate.mean)), 'forecast-info'));
        if (aggregate.mean == null) box.append(element('p', 'A municipal total requires all seven estimates.', 'forecast-info'));
        return box;
    }

    function shiftMonth(month, shift) {
        const date = new Date(month + '-01T00:00:00Z');
        date.setUTCMonth(date.getUTCMonth() + shift);
        return date.toISOString().slice(0, 7);
    }

    function verifiedCalculation(row, selected, cutoff) {
        if (!Number.isFinite(selected.mean)) return null;
        const { order, seasonal_order: seasonalOrder, params } = row.model;
        const seasonalAR = seasonalOrder.join(',') === '1,0,0,12';
        const combined = order.join(',') === '1,0,0';
        const pureAR = order.join(',') === '0,0,0' || combined;
        const inputs = new Map(row.history.map(({month, cases}) => [month, cases]));
        const phi = params['ar.L1'];
        const seasonal = params['ar.S.L12'];
        const intercept = params.intercept;
        let calculation;
        if (seasonalAR && pureAR && [intercept, seasonal, ...(combined ? [phi] : [])].every(Number.isFinite)) {
            for (let n = 1; n <= selected.horizon; n++) {
                const target = shiftMonth(cutoff, n);
                const terms = [[12, seasonal]];
                if (combined) terms.unshift([1, phi]);
                if (combined) terms.push([13, -phi * seasonal]);
                const lags = terms.map(([lag, factor]) => {
                    const month = shiftMonth(target, -lag);
                    return { lag, month, factor, count: inputs.get(month) };
                });
                const value = lags.reduce((sum, input) => sum + input.factor * input.count, intercept);
                inputs.set(target, value);
                calculation = { target, lags, value };
            }
        }
        const value = calculation?.value;
        if (calculation?.target === selected.target && Number.isFinite(value) &&
            Math.abs(Math.max(0, value) - selected.mean) <= 1e-9 * Math.max(1, Math.abs(selected.mean))) {
            return { intercept, lags: calculation.lags, value };
        }
        return null;
    }

    function recommendationList(rows, month, groupByBarangay) {
        const sections = element('div', undefined, 'forecast-detail');
        sections.append(element('p', 'Planning suggestions for MHO review. Use confirmed reports and local service needs when deciding what to do.', 'forecast-info'));
        for (const row of rows) {
            const estimate = row.estimates[month];
            const previousMonth = shiftMonth(estimate.target, -1);
            const previous = row.history.find(r => r.month === previousMonth);
            const actions = window.HealthIntelActionGuidance.prediction(row, estimate.mean, previous?.cases, estimate.target);
            const list = element('div', undefined, 'forecast-recommendation-list');
            if (!actions.length) list.append(element('p', 'No recommendation is available for this forecast.', 'forecast-info'));
            for (const item of actions) {
                const card = element('article', undefined, 'forecast-panel forecast-recommendation');
                const source = element('a', item.source.label);
                source.href = item.source.url;
                source.target = '_blank';
                source.rel = 'noopener noreferrer';
                const scope = row.disease + ' · ' + row.barangay + ' · ' + monthLabel(estimate.target, 'long');
                const observed = item.id === 'R2' || !previous ? '' :
                    ' ' + monthLabel(previous.month, 'long') + ' recorded ' + previous.cases + ' ' + cases(previous.cases) + '.';
                card.append(element('h4', item.title), element('p', scope, 'forecast-info'),
                    element('p', item.action), element('p', item.reason + observed, 'forecast-info'),
                    element('p', 'Suggested lead · ' + item.owner, 'forecast-info'), source);
                list.append(card);
            }
            sections.append(groupByBarangay ? disclosure(row.barangay + ' · ' + actions.length + (actions.length === 1 ? ' action' : ' actions'), list) : list);
        }
        return sections;
    }

    function compare(overview) {
        const section = element('section', undefined, 'forecast-panel forecast-outcomes');
        section.append(element('h2', 'Issued predictions and confirmed actuals'));
        if (overview.status !== 'published') {
            section.append(element('p', 'Comparisons become available for issued operational versions after target-month reports are complete.', 'forecast-info'));
            return section;
        }
        const button = element('button', 'Load confirmed outcomes', 'forecast-action');
        button.type = 'button';
        const output = element('div');
        output.setAttribute('aria-live', 'polite');
        button.addEventListener('click', async () => {
            button.disabled = true;
            output.textContent = 'Checking completed reports…';
            try {
                const data = await request('/compare/' + encodeURIComponent(overview.model_version));
                output.replaceChildren(element('p', 'First issued ' + issueLabel(data.issued) + ' PHT · Model ' + data.model_version + ' · Dataset ' + data.dataset_version.slice(0, 12), 'forecast-meta'));
                for (const target of data.targets) {
                    const label = monthLabel(target.target, 'long') + ' · H' + target.horizon;
                    const statuses = { month_open: 'Reporting month still open', awaiting_confirmation: 'Awaiting complete confirmation', no_prior_issue: 'No eligible issue date', unavailable: 'No forecast saved for this horizon' };
                    if (statuses[target.status]) output.append(element('p', label + ' · ' + statuses[target.status], 'forecast-info'));
                    else output.append(disclosure(label + (target.status === 'issued_during_target' ? ' · issued during target month' : ' · issued before target month'),
                        table(['Disease', 'Barangay', 'Issued estimate', 'Actual', 'Absolute error', 'Within tolerance'],
                            target.rows.map(r => [r.disease, r.barangay, number(r.prediction, 4), number(r.actual), number(r.absolute_error, 4), r.within_tolerance == null ? 'Unavailable' : r.within_tolerance ? 'Yes' : 'No']),
                            { scroll: 'Issued forecasts and confirmed counts' }).wrap));
                }
            } catch (error) { output.textContent = error.message; }
            finally { button.disabled = false; }
        });
        section.append(button, output);
        return section;
    }

    function seriesChart(container, dates, series, { split = dates.length, selected = -1, missingIndex = -1, intervals = [], onSelect } = {}) {
        const width = Math.max(235, Math.floor(container.clientWidth));
        const height = container.classList.contains('prediction-performance-chart') ? 222 : 268;
        const left = 33, right = width - 18, top = 20, bottom = height - 40;
        const max = Math.max(4, ...series.flatMap(line => line.values), ...intervals.flatMap(value => value || []));
        const step = Math.ceil(max / 4);
        const x = index => left + index * (right - left) / Math.max(1, dates.length - 1);
        const y = value => bottom - value / (step * 4) * (bottom - top);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        svg.setAttribute('aria-label', container.getAttribute('aria-label'));
        svg.setAttribute('role', 'group');
        const readout = element('p', undefined, 'prediction-readout sr-only');
        readout.setAttribute('aria-live', 'polite');
        const tip = element('div', undefined, 'prediction-point-tip');
        tip.hidden = true;
        tip.setAttribute('aria-hidden', 'true');
        let pinned = null;
        function showPoint(dot, heading, values) {
            tip.replaceChildren(element('strong', heading), ...values.map(value => element('span', value)));
            tip.hidden = false;
            readout.textContent = [heading, ...values].join(' · ');
            const bounds = container.getBoundingClientRect();
            const point = dot.getBoundingClientRect();
            const midX = point.left - bounds.left + point.width / 2;
            const above = point.top - bounds.top - tip.offsetHeight - 8;
            tip.style.left = Math.max(0, Math.min(bounds.width - tip.offsetWidth, midX - tip.offsetWidth / 2)) + 'px';
            tip.style.top = (above >= 0 ? above : point.bottom - bounds.top + 8) + 'px';
        }
        function hidePoint() {
            tip.hidden = true;
            pinned = null;
        }
        function mark(tag, attrs, label) {
            const node = document.createElementNS(svg.namespaceURI, tag);
            for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
            if (label) node.textContent = label;
            svg.append(node);
            return node;
        }
        if (split > 0 && split < dates.length) {
            const cutoff = (x(split - 1) + x(split)) / 2;
            mark('rect', { x: cutoff, y: top - 6, width: right - cutoff + 7, height: bottom - top + 6, class: 'prediction-period-band' });
            mark('path', { d: 'M' + cutoff + ' ' + (top - 6) + 'V' + bottom, class: 'prediction-cutoff' });
        }
        if (missingIndex >= 0) {
            const radius = Math.min(10, (right - left) / Math.max(1, dates.length - 1) / 2);
            mark('rect', { x: x(missingIndex) - radius, y: top, width: radius * 2, height: bottom - top, class: 'prediction-missing-band' });
        }
        for (let i = 0; i <= 4; i++) {
            const tick = y(i * step);
            mark('line', { x1: left, x2: right, y1: tick, y2: tick, class: 'prediction-gridline' });
            mark('text', { x: left - 7, y: tick + 4, 'text-anchor': 'end' }, String(i * step));
        }
        intervals.forEach((interval, i) => {
            if (interval?.every(Number.isFinite)) mark('line', { x1: x(split + i), x2: x(split + i), y1: y(interval[0]), y2: y(interval[1]), class: 'prediction-interval' });
        });
        for (const line of series) {
            const path = line.values.map((value, index) => Number.isFinite(value)
                ? (Number.isFinite(line.values[index - 1]) ? 'L' : 'M') + x(index) + ' ' + y(value) : '').join(' ');
            mark('path', { d: path, class: 'prediction-series ' + line.className });
            line.values.forEach((value, index) => {
                if (!Number.isFinite(value) || index === line.bridge) return;
                const heading = monthLabel(dates[index], 'long');
                const values = series.filter(other => index !== other.bridge && Number.isFinite(other.values[index]))
                    .map(other => other.label + ' · ' + number(other.values[index], 4) + ' cases');
                if (index === missingIndex) values.push('Actual report unavailable');
                const selectable = !!onSelect && index >= split;
                const dot = mark('circle', { cx: x(index), cy: y(value), r: index === selected ? 5.5 : 3.5,
                    class: 'prediction-dot ' + line.className, tabindex: 0, role: 'button',
                    'aria-label': [heading, ...values].join(' · '), 'data-point-index': index });
                const show = () => showPoint(dot, heading, values);
                const activate = () => {
                    if (selectable && index !== selected) {
                        onSelect(index - split);
                        return;
                    }
                    pinned = dot;
                    show();
                };
                dot.addEventListener('focus', show);
                dot.addEventListener('blur', () => { if (!pinned) hidePoint(); });
                dot.addEventListener('pointerenter', () => { if (!pinned) show(); });
                dot.addEventListener('pointerleave', () => { if (!pinned && document.activeElement !== dot) hidePoint(); });
                dot.addEventListener('click', activate);
                dot.addEventListener('keydown', event => {
                    if (event.key === 'Escape') {
                        hidePoint();
                    } else if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault();
                        activate();
                    }
                });
            });
        }
        const last = dates.length - 1;
        // Reserve space for prediction labels before adding historical ticks.
        let next = Infinity;
        for (let i = last; i >= 0; i--) {
            if (next - x(i) < 52) continue;
            if (i < split && i !== split - 1 && i !== 0 && i % Math.max(1, Math.ceil(split / 4)) !== 0) continue;
            mark('text', { x: x(i), y: bottom + 23, 'text-anchor': i === last ? 'end' : i === 0 ? 'start' : 'middle' },
                monthLabel(dates[i]));
            next = x(i);
        }
        svg.addEventListener('click', event => { if (!event.target.closest('[data-point-index]')) hidePoint(); });
        container.replaceChildren(svg, tip, readout);
    }

    function render(data) {
        const workspace = element('div', undefined, 'prediction-workspace');
        for (const [tag, key] of [['nav','nav'],['div','root'],['dialog','drawer'],['dialog','calc'],['dialog','quickInfo']]) {
            const node = element(tag);
            node.dataset.region = key;
            workspace.append(node);
        }
        const $ = id => workspace.querySelector('[data-region="' + id + '"]') || workspace.querySelector('#' + id);
        $('nav').setAttribute('aria-label', 'Predictive Analytics views');
        $('calc').setAttribute('aria-labelledby', 'calc-title');
        $('drawer').setAttribute('aria-labelledby', 'prediction-drawer-title');
        const periods = data.previous_target ? [data.previous_target, ...data.targets] : data.targets;
        const rows = data.rows.map(row => ({...row, estimates: data.previous_target ? [row.previous_estimate, ...row.estimates] : row.estimates}));
        const places = [...new Set(rows.map(row => row.barangay))];
        const diseases = [...new Set(rows.map(row => row.disease))];
        const all = 'Municipality';
        const geography = data.barangay ? 'My Barangay' : 'Barangay Analysis';
        let place = data.barangay || all;
        let modelsOpen = false;
        const manilaMonth = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 7);
        const nextMonth = shiftMonth(manilaMonth, 1);
        const upcomingIndex = periods.findIndex(period => period.target === nextMonth && !period.outside);
        let month = upcomingIndex >= 0 ? upcomingIndex : Number(!!data.previous_target);
        let view = 'Overview', span = 12, sort = true;
        const scopes = (d,p) => rows.filter(row => row.disease === d && (p === all || row.barangay === p));
        function mean(d,p,i) {
            const group = scopes(d,p);
            const values = group.map(row => row.estimates[i]?.mean);
            return group.length === (p === all ? 7 : 1) && values.every(Number.isFinite) ? values.reduce((a,b) => a + b,0) : null;
        }
        const ranking=(p,i)=>diseases.slice().sort((a,b)=>(mean(b,p,i) ?? -Infinity) - (mean(a,p,i) ?? -Infinity)||a.localeCompare(b));
        let disease=ranking(place,month)[0],local=places[0];
        const tabNames=['Overview', geography, 'Performance', 'Recommended Actions']
        const analysisPlace = () => place === all ? local : place;
        const fmt=v=>v==null?'Unavailable':String(Math.round(v));
        const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
        function select(label,vals,v,field){return '<label class="prediction-field"><span>'+label+'</span><select id="prediction-field-'+field+'" aria-label="'+label+'" data-field="'+field+'">'+vals.map(([k,t])=>'<option value="'+esc(k)+'" '+(String(k)===String(v)?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>'}
        const options=a=>a.map(v=>[v,v]);
        const months=()=>select('Prediction month',periods.map((t,i)=>[i,monthLabel(t.target)+(t.previous?' · Previous prediction':'')]),month,'month');
        const ds=()=>select('Disease',options(diseases),disease,'disease');
        const ps=()=>select('Geographic scope',options(data.barangay?places:[all,...places]),place,'place');
        const ls=()=>select('Barangay',options(places),analysisPlace(),'local');
        function htmlTable(headers, rows, { region, currentRow = -1 } = {}) {
            const wrapper = region ? '<div class="wrap prediction-matrix" tabindex="0" role="region" aria-label="' + esc(region) + '">' : '<div class="wrap">';
            const head = headers.map(label => '<th scope="col">' + label + '</th>').join('');
            const body = rows.map((row, index) => {
                const cells = row.map((value, column) => column === 0
                    ? '<th scope="row">' + value + '</th>'
                    : '<td>' + value + '</td>').join('');
                return '<tr' + (index === currentRow ? ' data-selected="true"' : '') + '>' + cells + '</tr>';
            }).join('');
            return wrapper + '<table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
        }
        const cell=(d,p,i,label)=>'<button aria-haspopup="dialog" aria-label="'+esc(d+' · '+p+' · '+monthLabel(periods[i].target)+' · '+label)+'" data-d="'+esc(d)+'" data-p="'+esc(p)+'" data-i="'+i+'">'+label+'</button>';
        function drawPlots() {
            const plot = $('plot');
            if (plot && modelsOpen) {
                const parts = scopes(disease, place);
                const history = parts.length === 7 ? municipalHistory(parts) : parts[0]?.history || [];
                const recorded = history.slice(-span);
                const dates = [...recorded.map(item => item.month), ...periods.map(item => item.target)];
                const split = recorded.length;
                const values = recorded.map(item => item.cases);
                const prediction = [...Array(split).fill(null), ...periods.map((_, i) => mean(disease, place, i))];
                if (split && Number.isFinite(prediction[split])) prediction[split - 1] = values.at(-1);
                seriesChart(plot, dates, [
                    { label: 'Recorded', values, className: 'recorded' },
                    { label: 'Predicted', values: prediction, className: 'predicted', bridge: split - 1 }
                ], {
                    split, selected: split + month, missingIndex: dates.indexOf(data.missing),
                    intervals: place === all ? [] : parts[0].estimates.map(e => e.probability?.range80),
                    onSelect: i => {
                        month = i;
                        renderView();
                        const point = $('plot').querySelector('.predicted[data-point-index="' + (split + i) + '"]');
                        point?.focus({ preventScroll: true });
                        point?.dispatchEvent(new Event('click'));
                    }
                });
                const recordedTable = $('recordedValues');
                if (!recordedTable.childElementCount) recordedTable.append(disclosure('View recorded counts as a table',
                    table(['Month', 'Recorded cases'], recorded.map(item => [monthLabel(item.month), number(item.cases)])).wrap));
            }
            const performancePlot = $('performancePlot');
            if (performancePlot) {
                const record = scopes(disease, analysisPlace())[0].performance.find(item => item.horizon === periods[month].horizon);
                if (!record?.rows.length) return;
                seriesChart(performancePlot, record.rows.map(item => item.target), [
                    { label: 'Recorded', values: record.rows.map(item => item.actual), className: 'recorded' },
                    { label: 'Predicted', values: record.rows.map(item => item.prediction), className: 'predicted' }
                ]);
            }
        }
        function bars(items, value, button, highlightLeader = false) {
            const maximum = Math.max(0, ...items.map(value));
            const rows = items.map(item => {
                const count = value(item);
                const width = count == null || !maximum ? 0 : 100 * count / maximum;
                const leading = highlightLeader && maximum > 0 && count === maximum;
                return '<button type="button" ' + button(item) + (leading ? ' class="prediction-leading-bar"' : '') + '>' +
                    '<span>' + esc(item) + '</span><span class="prediction-bar-track" aria-hidden="true">' +
                    '<span class="bar" style="width:' + width + '%"></span></span><b>' + fmt(count) + '</b></button>';
            });
            return '<div class="bars">' + rows.join('') + '</div>';
        }
        const fixed=(value, digits=4)=>Number.isFinite(value)?value.toFixed(digits):'Unavailable';
        const infoButton=(key,label)=>'<button class="infoIcon" type="button" data-info="'+key+'" aria-label="'+label+'" aria-haspopup="dialog">i</button>';
        const metricHelp={
         evaluation:['80/20 historical evaluation','The final 20% of historical months form the test window. Each prediction uses only the history available at its cutoff. These scores measure retrospective performance. Future operational accuracy has yet to be established.'],
         horizon:['Months ahead','Number of months from the last observation available at the prediction cutoff to the target month.'],
         available:['Prediction availability','Saved predictions available out of all attempted predictions for this scope and months-ahead setting.'],
         tolerance:['Within tolerance','Share of available predictions whose absolute error is at most one case or 20% of the recorded count, whichever is larger.'],
         mae:['Mean absolute error','Average absolute difference between predicted and recorded cases, measured in cases.'],
         rmse:['Root mean squared error','Square root of the average squared prediction error, measured in cases. Larger errors receive more weight.'],
         mape:['Mean absolute percentage error','Average absolute percentage difference relative to the recorded count. Only positive recorded counts are included.'],
         poisson:['COM-Poisson probabilities','These model-based probabilities describe possible monthly counts for the named barangay, disease, and prediction month. The exact-count probability refers to one count. The nearby probability includes counts within one case of that count. The 80% and 95% intervals summarize ranges from the same saved distribution. Validation against future confirmed monthly counts is pending.']
        };
        function openInfo(button,title,content){
         const dialog=$('quickInfo');
         dialog.replaceChildren();
         const header=element('div',undefined,'row');
         const close=element('button','Close');close.type='button';close.dataset.close='';
         const heading=element('h3',title);heading.id='quick-title';
         header.append(heading,close);dialog.setAttribute('aria-labelledby',heading.id);
         dialog.append(header,content);dialog.showModal();
         const anchor=button.getBoundingClientRect(),rect=dialog.getBoundingClientRect();
         if(innerWidth>650){
          dialog.style.left=Math.max(12,Math.min(innerWidth-rect.width-12,anchor.right-rect.width))+'px';
          dialog.style.top=Math.max(12,Math.min(innerHeight-rect.height-12,anchor.bottom+8))+'px';
         }
         dialog.addEventListener('close',()=>{dialog.style.left='';dialog.style.top='';button.focus({preventScroll:true})},{once:true});
        }
        function modelSteps(d,p,i,quick=false){
         const group=scopes(d,p),row=group[0],estimate=row.estimates[i],value=mean(d,p,i);
         const body=element('div',undefined,'mathSteps');
         const municipal=p===all;
         const model=municipal?null:row.model;
         const verified=model&&verifiedCalculation(row,estimate,data.cutoff);
         const step=(title,content)=>{const section=element('section');section.append(element('h4',title),content);body.append(section)};
         const params=model?Object.entries(model.params).filter(([key])=>key!=='sigma2'):null;
         const parameterName=key=>({'intercept':'Model constant','ar.S.L12':'Seasonal AR coefficient','ar.L1':'AR coefficient (lag 1)'})[key]||key;
         body.append(element('p',d+' · '+(municipal?'Municipal total':p)+' · '+monthLabel(estimate.target,'long')));
         if(!quick&&estimate.target===data.missing)body.append(element('small','Previous prediction · actual report unavailable'));
         if(municipal){
          step(quick?'Municipal total':'1 · Inputs',element('p','The municipal prediction combines all seven barangays for this disease and month.'));
          if(!quick)step('2 · Method',element('p','Each barangay has its own fitted SARIMA model. The municipal total uses the sum of unrounded estimates.'));
          const aggregation=table(['Barangay','Expected cases'],group.map(r=>[r.barangay,fixed(r.estimates[i].mean)])).wrap;
          step(quick?'Calculation':'3 · Numerical calculation',quick?element('p','Sum of the seven unrounded barangay estimates ≈ '+fixed(value)):aggregation);
         }else{
          const inputs=verified?table(['Input','Month','Cases'],verified.lags.map(l=>[l.month>data.cutoff?'Prior prediction · lag '+l.lag:'Recorded · lag '+l.lag,monthLabel(l.month),Number.isInteger(l.count)?String(l.count):fixed(l.count)])).wrap:element('p','The saved model used the monthly observations through '+monthLabel(data.cutoff,'long')+'. A short numerical reconstruction is unavailable for this selection.');
          step(quick?'Historical inputs':'1 · Historical inputs',inputs);
          if(!quick)body.append(seasonalTable(row.history,estimate.target,value));
          if(model){
           const fit=element('div');
           if(!quick){const output=fitExplanation(model);fit.append(...Array.from(output.children).slice(0,3));}
           fit.append(table(['Fitted parameter','Value'],params.map(([key,n])=>[parameterName(key),fixed(n,6)])).wrap);
           step(quick?'Fitted parameters':'2 · Fitted SARIMA equation',fit);
          }else if(!quick)step('2 · Fitted SARIMA equation',element('p','Fitted model details are unavailable.'));
          const equation=verified?fixed(verified.intercept,6)+verified.lags.map(l=>' + ('+fixed(l.factor,6)+' × '+(Number.isInteger(l.count)?l.count:fixed(l.count))+')').join('')+' ≈ '+fixed(verified.value):null;
          const numerical=element('div');
          numerical.append(element('p',equation||'The saved prediction comes from the fitted model. The available inputs do not support a verified short equation for this selection.',equation?'mathFormula':''));
          if(verified&&verified.value<0)numerical.append(element('p','The saved nonnegative prediction is zero.'));
          step(quick?'Calculation':'3 · Numerical calculation',numerical);
         }
         step(quick?'Prediction':'4 · Final predicted count',element('p',fixed(value)+' expected cases before rounding · '+fmt(value)+' predicted cases'));
         if(!quick&&model){const diagnostics=fitExplanation(model);body.append(disclosure('5 · Advanced model diagnostics',diagnostics.children[3]));}
         return body;
        }

        function recommendationContext(index = month) {
            return element('p', data.status === 'demonstration' || data.source === 'dataset-backed preview'
                ? 'Predictive preview suggestions · Review the saved rules and evidence.'
                : data.status !== 'published' || data.expired || periods[index].target < shiftMonth(new Date(Date.now() + 28800000).toISOString().slice(0,7), 0)
                    ? 'Historical suggestions from a saved prediction. Confirm current reports before using them for planning.'
                    : 'Planning suggestions based on the selected prediction. Confirm current reports before acting.', 'note');
        }
        function overviewDetails() {
            const municipal = place === all;
            const barangay = analysisPlace();
            const row = scopes(disease, barangay)[0];
            const estimate = row.estimates[month];
            const probability = estimate.probability;
            const target = monthLabel(estimate.target, 'long');
            const value = mean(disease, place, month);
            const metric = (label, value) => '<div class="metricBlock"><small>' + label + '</small><b>' + value + '</b></div>';
            const scope = municipal ? 'Municipal total' : place;
            $('detailsBox').innerHTML = `
                <h2>Prediction details</h2>
                <p class="prediction-section-context">${esc(disease)} · ${target}</p>
                <div class="models">
                    <section>
                        <div class="row"><h3>SARIMA</h3>${infoButton('sarima', 'About this SARIMA prediction')}</div>
                        <p class="cardScope">${esc(scope)}</p>
                        <div class="prediction-hero"><strong class="caseNumber">${fmt(value)}</strong>${value == null ? '' : '<span>predicted cases</span>'}</div>
                        <p>Unrounded expected count · ${fixed(value)}</p>
                        <p class="note">SARIMA fits each disease’s monthly history in each barangay through ${monthLabel(data.cutoff, 'long')}. It carries the fitted pattern forward to the selected month, including seasonal effects when supported.</p>
                        <p class="note">${municipal ? 'Sum of the seven barangay estimates. Change Geographic scope to view one barangay.' : 'Estimated monthly cases for this barangay.'}</p>
                        <button id="explain" class="prediction-action">How was this calculated?</button>
                    </section>
                    <section>
                        <div class="row"><h3>COM-Poisson</h3><div class="filters">
                            ${infoButton('poisson', 'About COM-Poisson probabilities')}</div></div>
                        <p class="note">Each percentage is the estimated chance of a case count in one barangay during one month.</p>
                        <div class="prediction-probability-scope">
                            <div><p class="cardScope">Barangay-level probabilities</p>
                                <p class="note">${municipal ? 'This barangay filter also updates the action preview.' : esc(barangay)}</p></div>
                            ${municipal ? ls() : ''}
                        </div>
                        ${probability ? `<div class="mini">
                            ${metric('Exactly ' + probability.count + ' cases', percentage(probability.exact))}
                            ${metric(Math.max(0, probability.count - 1) + '–' + (probability.count + 1) + ' cases', percentage(probability.nearby))}
                            ${metric('80% prediction interval', probability.range80.join('–') + ' cases')}
                            ${metric('95% prediction interval', probability.range95.join('–') + ' cases')}
                        </div>` : '<p>Probability unavailable for this selection.</p>'}
                    </section>
                </div>`;
            const comparison = estimate => {
                const prob = estimate.probability;
                return [monthLabel(estimate.target), prob ? 'Exactly ' + prob.count + ' · ' + percentage(prob.exact) : 'Unavailable',
                    prob ? Math.max(0, prob.count - 1) + '–' + (prob.count + 1) + ' · ' + percentage(prob.nearby) : 'Unavailable',
                    prob ? prob.range80.join('–') : 'Unavailable', prob ? prob.range95.join('–') : 'Unavailable'];
            };
            const windowRows = row.estimates.filter(item => data.targets.some(target => target.target === item.target));
            const probabilities = table(['Month', 'Case count · chance', 'Nearby counts · chance', '80% interval', '95% interval'], windowRows.map(comparison), {scroll: 'Monthly COM-Poisson probabilities'}).wrap;
            $('detailsBox').append(disclosure('Compare monthly probabilities · ' + disease + ' · ' + barangay, probabilities));
            $('explain').onclick = () => calculation(disease, place, month);
            const previous = row.history.find(item => item.month === shiftMonth(estimate.target, -1));
            const action = window.HealthIntelActionGuidance.prediction(row, estimate.mean, previous?.cases, estimate.target)[0];
            const actions = $('actionBox');
            actions.innerHTML = '<div class="row"><h2>Recommended actions</h2><button id="allActions" class="prediction-action">View all recommendations</button></div>';
            actions.append(element('p', disease + ' · ' + barangay + ' · ' + target, 'prediction-section-context'), recommendationContext());
            if (action) {
                const preview = element('div', undefined, 'actionPreview');
                const source = element('a', action.source.label);
                source.href = action.source.url;
                source.target = '_blank';
                source.rel = 'noopener noreferrer';
                preview.append(element('h3', action.title), element('p', action.action),
                    element('p', barangay + ' · ' + action.reason, 'note'), source);
                actions.append(preview);
            } else {
                actions.append(element('p', 'No saved prediction supports a recommendation for this selection.'));
            }
            $('allActions').onclick = () => {
                local = barangay;
                view = 'Recommended Actions';
                renderView();
                $('nav').querySelector('[aria-current=true]').focus();
            };
        }

        function sectionHeading(title, controls = '') {
            const hasFilters = controls.includes('prediction-field');
            const toolbar = hasFilters
                ? '<div class="prediction-filter-bar" role="group" aria-label="Prediction filters">' + controls + '</div>'
                : controls ? '<div class="prediction-section-actions">' + controls + '</div>' : '';
            return '<div class="prediction-section-head"><h2>' + title + '</h2>' + toolbar + '</div>';
        }
        function openMonthSummary() {
            const period = periods[month];
            const value = mean(disease, place, month);
            const body = element('div', undefined, 'prediction-month-summary');
            body.append(element('p', disease + ' · ' + place),
                element('strong', fmt(value), 'prediction-month-value'),
                element('span', value == null ? 'Prediction unavailable' : 'predicted cases'));
            if (value != null) {
                body.append(element('p', 'SARIMA expected count · ' + fixed(value)),
                    element('p', 'Model fitted on monthly history through ' + monthLabel(data.cutoff, 'long') + '.'));
                const group = scopes(disease, place);
                const history = place === all ? municipalHistory(group) : group[0]?.history || [];
                const sameMonth = history.find(row => row.month === shiftMonth(period.target, -12));
                if (sameMonth) body.append(element('p', 'For comparison · ' + monthLabel(sameMonth.month, 'long') + ' recorded count · ' + number(sameMonth.cases) + ' cases'));
            }
            if (data.status === 'demonstration') body.append(element('small', 'Predictive preview'));
            const math = element('button', 'How was this calculated?', 'prediction-action');
            math.type = 'button';
            math.onclick = () => calculation(disease, place, month);
            openPredictionDialog(monthLabel(period.target, 'long') + ' prediction', body, value == null ? [] : [math]);
        }
        function volumePlanning(names) {
            const available = names.filter(name => Number.isFinite(mean(name, place, month)));
            const highest = available.length ? mean(available[0], place, month) : null;
            if (highest == null) return '<p>No saved estimates are available for this month and scope.</p>';
            if (highest === 0) return '<p>All available estimates are zero. Review current reports before allocating resources.</p>';
            const leaders = available.filter(name => mean(name, place, month) === highest);
            const partial = available.length < names.length ? ' Only ' + available.length + ' of ' + names.length + ' conditions have estimates.' : '';
            return `<p class="prediction-planning-lead"><strong>${leaders.map(esc).join(' and ')}</strong> · ${fmt(highest)} predicted ${cases(Math.round(highest))}${leaders.length > 1 ? ' each' : ''}</p>
                <p>Highest expected volume for ${esc(place)} in ${monthLabel(periods[month].target, 'long')}, ranked before rounding.${partial}</p>
                <p>${role === 'bhw' ? 'Check local visit and referral activity and share supply needs with the MHO.' : 'Review recent reports, supplies on hand and equipment readiness with the health center before adjusting stock or staffing.'}</p>`;
        }

        function overview() {
            const captions = periods.map(t => monthLabel(t.target) + (t.previous ? '<br><small>Previous prediction</small>' : ''));
            const monthCards = periods.map((target, index) => {
                const value = mean(disease,place,index);
                const label = target.previous ? 'Previous prediction' : 'Predicted cases';
                return `<button type="button" class="card prediction-month-card" aria-haspopup="dialog"
                    aria-pressed="${month === index}" data-month="${index}"${target.previous ? ' data-previous-prediction' : ''}>
                    <span class="prediction-month-copy"><small>${monthLabel(target.target)} · ${label}</small><b>${esc(disease)}</b></span>
                    <strong>${fmt(value)}</strong><span class="prediction-month-arrow" aria-hidden="true"></span>
                </button>`;
            }).join('');
            const forecastCells = name => periods.map((_, index) => {
                const value = mean(name,place,index);
                return value == null ? 'Unavailable' : cell(name,place,index,fmt(value));
            });
            const breakdown = (sort ? ranking(place,month) : diseases.slice().sort()).map(name => [esc(name), ...forecastCells(name)]);
            const ranked = ranking(place, month);
            return `<article class="prediction-outlook">
                    ${sectionHeading('Predicted cases by disease', ps() + months())}
                    <p class="prediction-section-context">${monthLabel(periods[month].target,'long')} · ${esc(place)} · All study diseases</p>
                    ${upcomingIndex < 0 ? '<p class="note">This version has no supported prediction month for ' + monthLabel(nextMonth,'long') + '. Showing its saved window.</p>' : ''}
                    <div class="prediction-outlook-grid"><div class="prediction-ranking">
                        ${bars(ranked, name => mean(name,place,month), name => 'aria-haspopup="dialog" data-d="'+esc(name)+'" data-p="'+esc(place)+'" data-i="'+month+'"', true)}
                    </div><aside class="prediction-planning">
                        <h3>First planning review</h3>${volumePlanning(ranked)}
                    </aside></div>
                    <details class="prediction-reading-guide"><summary>How to read predicted cases</summary>
                        <p class="note">A case counts one recorded disease episode. A person can have several cases, and a case can have several visits. These totals measure workload. Comparing population rates requires approved population figures for the same areas and period.</p>
                        ${role === 'mho' ? '<p class="note">Clinical urgency is assessed for each patient by the receiving clinician. The MHO records the assessment at the consultation.</p>' : ''}
                    </details>
                </article>
                <section class="prediction-model-control" aria-labelledby="prediction-model-heading">
                    <div><h2 id="prediction-model-heading">Model results</h2><p>Monthly estimates, probability ranges and calculations.</p></div>
                    <button type="button" id="toggleModels" class="prediction-action prediction-disclosure" aria-controls="prediction-model-results" aria-expanded="${modelsOpen}">${modelsOpen ? 'Hide' : 'Show'} SARIMA and COM-Poisson results</button>
                </section>
                <div id="prediction-model-results"${modelsOpen ? '' : ' hidden'}>
                <div class="cards">${monthCards}</div>
                <article>
                    ${sectionHeading('Historical and predicted cases',ds()+select('History',[[12,'12 months'],[24,'24 months'],[60,'All months']],span,'span'))}
                    <p>${esc(disease)} · ${esc(place)} · Monthly case count</p>
                    <div id="plot" class="prediction-plot" aria-label="Historical and predicted monthly case counts"></div>
                    <div class="legend"><b>━ Recorded</b><i>┄ SARIMA prediction</i>${place===all?'':'<span>Vertical bars · saved COM-Poisson 80% intervals</span>'}</div>
                    <div id="recordedValues"></div>
                    ${data.missing ? '<p class="note">'+monthLabel(data.missing)+' is a previous prediction. Its actual report is unavailable.</p>' : ''}
                    ${htmlTable(['Predicted cases',...captions],[[esc(disease),...forecastCells(disease)]])}
                </article>
                <article id="detailsBox"></article>
                <article>${sectionHeading('Monthly breakdown','<button id="sort" class="prediction-action">Sort by '+(sort?'name':'estimate')+'</button>')}
                    ${htmlTable(['Disease',...captions],breakdown,{region:'Monthly prediction breakdown'})}
                </article></div>
                <article id="actionBox"></article>`;
        }
        function barangayAnalysis() {
            const max = Math.max(0,...rows.map(row=>row.estimates[month].mean));
            const matrix = diseases.map(name => [esc(name), ...places.map(barangay => {
                const value = mean(name,barangay,month);
                return value == null ? 'Unavailable' : '<span class="matrixCell" style="background:color-mix(in srgb,var(--teal) '
                    + (10 + 40 * value / Math.max(1,max)) + '%,var(--panel))">' + cell(name,barangay,month,fmt(value)) + '</span>';
            })]);
            const sorted = places.slice().sort((a,b)=>(mean(disease,b,month)??-Infinity)-(mean(disease,a,month)??-Infinity)||a.localeCompare(b));
            return `<article>${sectionHeading('Predicted cases by barangay',months())}
                <p>Select a count to view its prediction details. Shading uses unrounded estimates.</p>
                <div class="matrixLegend"><small>0 cases</small><span class="matrixRamp" aria-hidden="true"></span><small>${fixed(max)} expected cases</small></div>
                ${htmlTable(['Disease',...places.map(esc)],matrix,{ region: 'Predicted cases by barangay' })}
                </article>
                <article>${sectionHeading('Barangay comparison',ds())}
                ${bars(sorted,barangay=>mean(disease,barangay,month),barangay=>'data-d="'+esc(disease)+'" data-p="'+esc(barangay)+'" data-i="'+month+'"')}
                </article>`;
        }
        function scopedAnalysis() {
            const barangay = analysisPlace();
            const row = scopes(disease,barangay)[0];
            const performance = row.performance.find(item=>item.horizon===periods[month].horizon);
            const context = '<p class="prediction-section-context">' +esc(disease)+' · '+esc(barangay)+' · '+monthLabel(periods[month].target,'long')+'</p>';
            const filters = ds()+ls()+months();
            if (view === 'Recommended Actions') return '<article>'+sectionHeading('Recommended surveillance actions',filters)+context+'<div id="analysisBody" class="prediction-action-list"></div></article>';
            const labels = [['Months ahead','horizon'],['Prediction availability','available'],['Within tolerance','tolerance'],['MAE','mae'],['RMSE','rmse'],['MAPE¹','mape']];
            const percent = value => value == null ? 'Unavailable' : number(value,1)+'%';
            const metrics = row.performance.map(({horizon,metrics:m}) => [horizon,m.available+'/'+m.attempted,percent(m.within_tolerance_pct),
                number(m.MAE,3),number(m.RMSE,3),percent(m.MAPE_positive_pct)]);
            const horizon = periods[month].horizon;
            const selectedRow = row.performance.findIndex(item => item.horizon === horizon);
            const comparison = performance?.rows.length ? '<div class="legend"><b>━ Recorded</b><i>┄ Predicted</i></div>'
                + '<div id="performancePlot" class="prediction-plot prediction-performance-chart" aria-label="Retrospective predictions and recorded cases"></div>'
                + '<details><summary>View monthly results as a table</summary>' + htmlTable(['Test month','Predicted','Recorded'],performance.rows.map(r=>[monthLabel(r.target),number(r.prediction,3),number(r.actual)])) + '</details>'
                : '<p>No saved evaluation for this horizon.</p>';
            return `<article>${sectionHeading('Historical prediction performance',filters)}${context}
                <div class="performanceHelp"><small>80/20 historical evaluation · Retrospective results</small>${infoButton('evaluation','About the 80/20 historical evaluation')}</div>
                <div class="prediction-performance-summary">${htmlTable(labels.map(([label,key])=>label+' '+infoButton(key,'About '+label)),metrics,{currentRow:selectedRow,region:'Historical prediction performance metrics'})}</div>
                <p class="note">¹ Positive actual counts only.</p>
                <section class="prediction-performance-comparison"><h3>Predicted versus recorded · ${periods[month].horizon} ${periods[month].horizon===1?'month':'months'} ahead</h3>${comparison}</section>
                </article>`;
        }

        const clearSelects = () => {
            for (const select of workspace.querySelectorAll('select[data-field]')) select._hiSelect?.destroy();
        };
        function renderView(){
            clearSelects();
         $('nav').innerHTML=tabNames.map(t=>'<button data-tab="'+t+'" aria-current="'+(view===t)+'">'+t+'</button>').join('');
            const content = view === 'Overview' ? overview() : view === geography ? barangayAnalysis() : scopedAnalysis();
            $('root').innerHTML = content;
            if (view === 'Overview') {
                overviewDetails();
                const toggle = $('toggleModels');
                toggle.onclick = () => {
                    modelsOpen = !modelsOpen;
                    $('prediction-model-results').hidden = !modelsOpen;
                    toggle.setAttribute('aria-expanded', String(modelsOpen));
                    toggle.textContent = (modelsOpen ? 'Hide' : 'Show') + ' SARIMA and COM-Poisson results';
                    if (modelsOpen) drawPlots();
                };
                $('sort').onclick = () => { sort = !sort; renderView(); $('sort').focus(); };
            }
            if (view === 'Recommended Actions') {
                const row = scopes(disease, analysisPlace())[0];
                $('analysisBody').append(recommendationContext(), recommendationList([row],month,false));
            }
            for (const select of workspace.querySelectorAll('select[data-field]')) {
                window.HealthIntelEncoding?.enhanceSelect(select);
            }
            drawPlots();
        }
        function openPredictionDialog(title, body, actions = []) {
            const dialog = $('drawer');
            const trigger = document.activeElement;
            const header = element('header', undefined, 'prediction-dialog-header');
            const heading = element('h2', title);
            heading.id = 'prediction-drawer-title';
            const closeHeader = element('button', '×', 'prediction-dialog-x');
            closeHeader.type = 'button';
            closeHeader.dataset.close = '';
            closeHeader.setAttribute('aria-label', 'Close prediction details');
            header.append(heading, closeHeader);
            body.classList.add('prediction-dialog-body');
            const footer = element('footer', undefined, 'prediction-dialog-footer');
            const closeFooter = element('button', 'Close', 'prediction-action');
            closeFooter.type = 'button';
            closeFooter.dataset.close = '';
            footer.append(...actions, closeFooter);
            dialog.replaceChildren(header, body, footer);
            dialog.addEventListener('close', () => {
                if (trigger?.isConnected && document.activeElement === document.body) trigger.focus({ preventScroll: true });
            }, { once: true });
            dialog.showModal();
        }

        function inspect(d, p, i) {
            const row = scopes(d, p)[0];
            const estimate = row.estimates[i];
            const value = mean(d, p, i);
            const probability = p === all ? null : estimate.probability;
            const scope = p === all ? 'Municipal total' : p;
            const body = element('div');
            const monthsAhead = estimate.horizon === 1 ? '1 month ahead' : estimate.horizon + ' months ahead';
            body.append(element('p', d + ' · ' + scope + ' · ' + monthLabel(estimate.target, 'long') + ' · ' + monthsAhead));
            if (estimate.target === data.missing) body.append(element('p', 'Actual report unavailable', 'note'));
            const summary = element('div', undefined, 'prediction-dialog-estimate');
            summary.append(element('strong', fmt(value), 'prediction-month-value'));
            if (value != null) summary.append(element('span', ' predicted cases'), element('p', 'Unrounded expected count · ' + fixed(value)));
            body.append(summary);
            if (probability) {
                body.append(element('h3', 'COM-Poisson probabilities'), table(['Measure', 'Saved result'], [
                    ['Exactly ' + probability.count + ' cases', percentage(probability.exact)],
                    ['Within one case', percentage(probability.nearby)],
                    ['80% prediction interval', probability.range80.join('–') + ' cases'],
                    ['95% prediction interval', probability.range95.join('–') + ' cases']
                ]).wrap);
            } else {
                body.append(element('p', p === all ? 'COM-Poisson probabilities are available at barangay level.' : 'No saved COM-Poisson probabilities are available for this selection.'));
            }
            if (p !== all) {
                const metric = row.performance.find(item => item.horizon === estimate.horizon)?.metrics;
                if (metric) body.append(element('p', 'Historical MAE · ' + number(metric.MAE, 3) + ' cases', 'note'));
                body.append(seasonalTable(row.history, estimate.target, value),
                    disclosure('Recommended actions', recommendationList([row], i, false)));
            }
            const math = element('button', 'How was this calculated?', 'prediction-action');
            math.id = 'math';
            math.type = 'button';
            math.onclick = () => calculation(d, p, i);
            const use = element('button', 'Use in analysis', 'prediction-action prediction-primary');
            use.id = 'useSelection';
            use.type = 'button';
            use.onclick = () => {
                modelsOpen = true;
                disease = d;
                place = p;
                month = i;
                if (p !== all) local = p;
                $('drawer').close();
                view = 'Overview';
                renderView();
                $('nav').querySelector('[aria-current=true]').focus();
            };
            openPredictionDialog('Prediction details', body, [math, use]);
        }

        function calculation(d,p,i){
         const c=$('calc');
         c.innerHTML='<div class="row"><h2 id="calc-title">SARIMA calculation</h2><button data-close>Close</button></div>';
         c.append(modelSteps(d,p,i));
         c.showModal();
        }
        workspace.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button) return;
            const { info, tab, month: selectedMonth, d, p, i } = button.dataset;
            if (info === 'sarima') return openInfo(button, 'SARIMA calculation', modelSteps(disease, place, month, true));
            if (metricHelp[info]) {
                const [title, message] = metricHelp[info];
                return openInfo(button, title, element('p', message));
            }
            if (button.hasAttribute('data-close')) return button.closest('dialog').close();
            if (tab) {
                view = tab;
                renderView();
                workspace.querySelector('[aria-current=true]')?.focus({ preventScroll: true });
            }
            if (selectedMonth !== undefined) {
                month = Number(selectedMonth);
                renderView();
                const card = workspace.querySelector('[data-month="' + month + '"]');
                card.focus({ preventScroll: true });
                openMonthSummary();
            }
            if (d) inspect(d, p, Number(i));
        });
        workspace.addEventListener('change', event => {
            const { field } = event.target.dataset;
            const value = event.target.value;
            if (!field) return;
            switch (field) {
                case 'month': month = Number(value); break;
                case 'span': span = Number(value); break;
                case 'place': place = value; if (value !== all) local = value; break;
                case 'local': local = value; if (place !== all) place = value; break;
                case 'disease': disease = value; break;
            }
            if (view === 'Overview' && !modelsOpen && (field === 'place' || field === 'month')) {
                disease = ranking(place, month)[0];
            }
            renderView();
            const select = workspace.querySelector('[data-field=' + field + ']');
            (select?.parentElement.querySelector('.hi-select-trigger') || select)?.focus({ preventScroll: true });
        });
        forecastBody.replaceChildren(workspace);
        if (role === 'admin') forecastBody.append(compare(data));
        const resize = new ResizeObserver(entries => {
            const width = Math.floor(entries[0].contentRect.width);
            if (width === resize.width) return;
            resize.width = width;
            drawPlots();
        });
        resize.observe(workspace);
        disposeDrawer = () => {
            resize.disconnect();
            clearSelects();
            for (const dialog of workspace.querySelectorAll('dialog[open]')) dialog.close();
        };
        renderView();
    }

    function selectAdminSource(value, focus = false) {
        source.select.value = value;
        history.select.value = '';
        history.wrapper.hidden = true;
        if (focus) source.select.focus({ preventScroll: true });
        return load();
    }

    function adminStatusPanel(title, description, primary, secondary, error = false) {
        const panel = element('section', undefined, 'forecast-admin-state');
        panel.dataset.state = error ? 'error' : 'empty';
        const actions = element('div', undefined, 'forecast-admin-actions');
        for (const [index, [label, action]] of [primary, secondary].filter(Boolean).entries()) {
            const button = element('button', label, 'forecast-action' + (index === 0 ? ' forecast-admin-primary' : ''));
            button.type = 'button';
            button.addEventListener('click', action);
            actions.append(button);
        }
        panel.append(element('h3', title), element('p', description), actions);
        forecastBody.replaceChildren(panel);
        meta.classList.add('forecast-admin-sr-status');
        meta.textContent = title;
    }

    function showUnavailablePublication(selection, hasDrafts) {
        const draftView = selection === 'draft';
        const primary = !draftView && hasDrafts
            ? ['View latest draft', () => selectAdminSource('draft', true)]
            : ['Go to Model Training', () => window.HealthIntelAdminAnalytics.openTab('training')];
        adminStatusPanel(
            draftView ? 'No saved drafts yet' : 'No predictions published yet',
            draftView ? 'Completed training runs will appear here for Admin review.' :
                hasDrafts ? 'A saved draft is ready for Admin review. Published predictions will appear here after an operational version is approved.' :
                    'Complete reporting, then train and review an operational version in Model Training. Published versions will appear here.',
            primary,
            ['View predictive preview', () => selectAdminSource('demo', true)]
        );
    }

    async function load() {
        const token = ++sequence;
        const selection = role === 'admin' ? source.select.value : 'auto';
        let hasDrafts = false;
        meta.classList.remove('forecast-admin-sr-status');
        meta.textContent = 'Loading saved predictions…';
        disposeDrawer();
        forecastBody.replaceChildren();
        host.setAttribute('aria-busy', 'true');
        try {
            const query = new URLSearchParams({ source: selection === 'draft' ? 'published' : selection });
            if (role === 'admin' && selection !== 'demo') {
                const previous = history.select.value;
                const { versions, active } = await request('/versions');
                if (token !== sequence) return;
                if (!Array.isArray(versions) || (active !== null && typeof active !== 'string')) throw Error('Invalid prediction versions.');
                const drafts = versions.filter(version => version.status === 'ready');
                hasDrafts = drafts.length > 0;
                const choices = selection === 'draft' ? drafts : versions.filter(version => version.status === 'published' && version.id !== active);
                const options = choices.map(version => new Option(monthLabel(version.cutoff) + ' cutoff · ' + version.id.slice(0, 8), version.id));
                if (selection === 'published') options.unshift(new Option(active ? 'Current publication' : 'No current publication', ''));
                history.select.replaceChildren(...options);
                history.select.value = choices.some(version => version.id === previous) ? previous : selection === 'draft' ? choices[0]?.id || '' : '';
                history.wrapper.hidden = options.length < 2;
                if (history.select.value) query.set('version', history.select.value);
                else if (!active || selection === 'draft') {
                    showUnavailablePublication(selection, hasDrafts);
                    return;
                }
            }
            const data = await request('/overview?' + query);
            if (token !== sequence) return;
            const isDemo = data.status === 'demonstration';
            const months = data.rows.flatMap(row => row.history.map(observation => observation.month)).sort();
            const coverageStart = months[0], coverageEnd = months.at(-1);
            const formatMonth = period => monthLabel(period, 'long');
            const entry = (label, value) => {
                const item = element('span', undefined, 'forecast-meta-entry');
                item.append(element('small', label), element('strong', value));
                return item;
            };
            const sourceLabel = isDemo ? 'Predictive preview' :
                data.status === 'draft' ? 'Draft · ' + data.source : 'Published operational predictions';
            const status = element('div', undefined, 'forecast-meta-status');
            status.dataset.predictionStatus = data.status;
            status.append(element('strong', sourceLabel, 'forecast-source-badge'),
                element('strong', 'SARIMA + COM-Poisson', 'forecast-model-label'));
            const items = [
                status,
                entry('Prediction period', formatMonth(data.targets[0].target) + ' – ' + formatMonth(data.targets.at(-1).target)),
                entry('Historical coverage', formatMonth(coverageStart) + ' – ' + formatMonth(coverageEnd)),
                entry('Data source', isDemo ? 'Historical study dataset (includes simulated counts)' :
                    data.source === 'dataset-backed preview' ? 'Historical study dataset (includes simulated counts) and confirmed monthly reports' :
                    data.source === 'uploaded preview' ? 'Uploaded dataset' : 'MHO case records from confirmed monthly reports')
            ];
            if (data.cutoff !== coverageEnd) items.push(entry('Last observed', formatMonth(data.cutoff)));
            if (data.missing) items.push(element('p', formatMonth(data.missing) + ' actual report unavailable in this predictive preview. Predictions use available historical patterns.', 'forecast-report-note'));
            if (data.next_update) {
                const { reporting_month, status } = data.next_update;
                const period = formatMonth(reporting_month);
                const statusText = status === 'awaiting_confirmation' ? 'Awaiting confirmed reports for ' + period + '.' :
                    status === 'awaiting_publication' ? period + ' reports are confirmed. The next version is awaiting publication.' :
                        'The next update uses ' + period + ' reports.';
                items.push(element('p', statusText + ' Showing the last published version.', 'forecast-report-note'));
            }
            if (data.expired) items.push(element('p', 'The prediction window has passed. This issued version remains available for review.', 'forecast-report-note'));
            meta.replaceChildren(...items);

            render(data);
        } catch (error) {
            if (token !== sequence) return;
            if (error.code === 'OPERATIONAL_PREDICTIONS_UNPUBLISHED') {
                if (role === 'admin') showUnavailablePublication(selection, hasDrafts);
                else meta.textContent = 'No operational predictions are published yet.';
            } else if (role === 'admin') {
                adminStatusPanel('Couldn’t load predictions', 'Try again to refresh this view.', ['Retry', () => {
                    source.select.focus({ preventScroll: true });
                    void load();
                }], null, true);
            } else {
                meta.textContent = error.message;
            }
        } finally {
            if (token === sequence) host.removeAttribute('aria-busy');
        }
    }



    function onVisible() {
        const next = !!host.getClientRects().length;
        if (next && !visible) void load();
        visible = next;
    }
    const panel = host.closest('[role="tabpanel"], .view-section');
    const view = host.closest('.view-section');
    const observer = new MutationObserver(onVisible);
    observer.observe(panel, { attributes: true, attributeFilter: ['class', 'hidden'] });
    if (view !== panel) observer.observe(view, { attributes: true, attributeFilter: ['class', 'hidden'] });
    onVisible();
})();
