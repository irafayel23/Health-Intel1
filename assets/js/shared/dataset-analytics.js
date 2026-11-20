/* Shared historical view. Operational widgets retain their existing endpoints. */
(() => {
    const host = document.getElementById('dataset-analytics');
    if (!host) return;
    const role = host.dataset.role, operational = document.getElementById('operational-analytics');
    const label = 'Demonstration Dataset — Synthetic Historical Data';
    const cardClass = 'rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm min-w-0';
    const controlClass = 'w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-sm focus-visible:ring-2 focus-visible:ring-blue-500';
    host.innerHTML = `<section class="${cardClass}"><label class="block text-sm font-semibold" for="analytics-source">Analytics source</label><select id="analytics-source" class="${controlClass} mt-2"><option value="dataset">Historical demonstration dataset</option><option value="operational">Live operational data</option></select><p id="analytics-source-note" class="mt-3 text-sm" role="status"></p></section><div id="dataset-panels" class="space-y-5"><section class="${cardClass}"><h2 class="text-xl font-bold">Historical case overview</h2><p class="mt-2 text-sm">${label}</p><div id="dataset-filters" class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4"></div><p id="dataset-status" class="mt-3 text-sm" role="status" aria-live="polite">Loading historical counts…</p></section><div id="dataset-summary" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div><div id="dataset-charts" class="grid grid-cols-1 xl:grid-cols-2 gap-5"></div></div>`;
    const byId = id => document.getElementById(id), controls = {}, charts = [];
    let requestId = 0;
    function select(key, title, first) {
        const wrap = document.createElement('label');
        wrap.className = 'block text-sm font-semibold';
        wrap.textContent = title;
        const input = document.createElement('select');
        input.id = 'dataset-' + key; input.className = controlClass + ' mt-2';
        if (first) input.add(new Option(first, 'all'));
        wrap.append(input); byId('dataset-filters').append(wrap); controls[key] = input;
        input.addEventListener('change', load);
    }
    select('year', 'Historical year', 'All historical years');
    select('disease', 'Disease', 'All 10 diseases');
    select('barangay', role === 'bhw' ? 'Assigned barangay' : 'Barangay', role === 'mho' ? 'All seven barangays' : null);
    if (role === 'bhw') controls.barangay.disabled = true;
    function element(tag, text, cls) {
        const node = document.createElement(tag); node.textContent = text;
        if (cls) node.className = cls;
        return node;
    }
    function clearResults() {
        charts.splice(0).forEach(chart => chart.destroy());
        byId('dataset-summary').replaceChildren(); byId('dataset-charts').replaceChildren();
    }
    function chart(title, rows, type) {
        const section = element('section', '', cardClass);
        section.append(element('h3', title, 'text-lg font-bold'), element('p', label, 'text-xs mt-2'));
        const wrap = element('div', '', 'relative h-64 mt-4');
        const canvas = document.createElement('canvas');
        canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', title + '. ' + label + '. Values are in the data table below.');
        wrap.append(canvas); section.append(wrap);
        const details = document.createElement('details'); details.className = 'mt-4';
        details.append(element('summary', 'View ' + title.toLowerCase() + ' data', 'cursor-pointer font-semibold text-sm'));
        const table = document.createElement('table'); table.className = 'w-full text-sm text-left mt-3';
        table.append(element('caption', label, 'text-xs text-left mb-2'));
        const head = table.createTHead().insertRow();
        for (const title of ['Category / month', 'Cases']) { const th = element('th', title, 'p-2 border-b border-[hsl(var(--border))]'); th.scope = 'col'; head.append(th); }
        const body = table.createTBody();
        rows.forEach(row => { const tr = body.insertRow(); tr.append(element('th', row.label, 'p-2 border-b border-[hsl(var(--border))] font-medium'), element('td', row.cases.toLocaleString(), 'p-2 border-b border-[hsl(var(--border))]')); tr.firstChild.scope = 'row'; });
        details.append(table); section.append(details); byId('dataset-charts').append(section);
        if (typeof Chart !== 'function') { wrap.hidden = true; details.open = true; return; }
        charts.push(new Chart(canvas.getContext('2d'), {
            type, data: { labels: rows.map(row => row.label), datasets: [{ label: 'Historical demonstration cases', data: rows.map(row => row.cases), borderColor: '#2563eb', backgroundColor: type === 'line' ? 'rgba(37,99,235,0.12)' : '#2563eb', borderWidth: 2, tension: 0, fill: type === 'line', pointRadius: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, animation: false, indexAxis: type === 'bar' ? 'y' : 'x', plugins: { legend: { display: false } }, scales: { [type === 'bar' ? 'x' : 'y']: { beginAtZero: true, ticks: { precision: 0 } } } }
        }));
    }
    async function load() {
        const id = ++requestId;
        clearResults(); byId('dataset-status').textContent = 'Loading historical counts…';
        byId('dataset-panels').setAttribute('aria-busy', 'true');
        const query = new URLSearchParams({ year: controls.year.value, disease: controls.disease.value });
        if (role === 'mho') query.set('barangay', controls.barangay.value);
        try {
            const response = await fetch('/api/' + role + '/dataset-analytics?' + query);
            const data = await response.json();
            if (id !== requestId) return;
            if (!response.ok || !data.success || data.source_label !== label || !Number.isSafeInteger(data.total)) throw Error('Historical dataset unavailable. Try changing a filter or reload. Operational data remains separate.');
            for (const [key, values] of Object.entries(data.options)) {
                const field = controls[key === 'years' ? 'year' : key === 'diseases' ? 'disease' : 'barangay'];
                if (field.dataset.loaded) continue;
                values.forEach(value => field.add(new Option(value, value))); field.dataset.loaded = 'true';
            }
            const scope = data.filters.barangay === 'all' ? 'All seven barangays' : data.filters.barangay;
            byId('dataset-status').textContent = `${scope} · ${data.coverage.first_month} through ${data.coverage.last_month}. Ages, severity and outcomes are not recorded in this monthly dataset.`;
            for (const [title, value] of [['Historical cases', data.total], ['Months represented', data.coverage.months]]) {
                const card = element('section', '', cardClass);
                card.append(element('h3', title, 'text-sm font-semibold'), element('p', value.toLocaleString(), 'text-3xl font-bold my-2 text-blue-700 dark:text-blue-400'), element('p', label, 'text-xs')); byId('dataset-summary').append(card);
            }
            chart('Monthly case trend', data.months, 'line');
            chart('Disease distribution', data.diseases, 'bar');
            if (role === 'mho') chart('Barangay distribution', data.barangays, 'bar');
            chart('Annual case totals', data.years, 'bar');
        } catch (error) {
            if (id === requestId) { clearResults(); byId('dataset-status').textContent = error.message || 'Historical counts unavailable. This is not a zero count.'; }
        } finally {
            if (id === requestId) byId('dataset-panels').removeAttribute('aria-busy');
        }
    }
    function switchSource() {
        const dataset = byId('analytics-source').value === 'dataset';
        byId('dataset-panels').classList.toggle('hidden', !dataset);
        operational.classList.toggle('hidden', dataset);
        byId('analytics-source-note').textContent = dataset ? label + '. Separate from operational records and predictions.' : 'Live operational data — database records. Record provenance and duplicate review are pending. Historical demonstration counts are excluded from this view.';
        if (!dataset) {
            if (role === 'mho' && typeof initializeMunicipalAnalytics === 'function') initializeMunicipalAnalytics();
            if (role === 'bhw' && typeof loadDashboardStats === 'function') { loadDashboardStats(); loadTrendChart(); }
        } else charts.forEach(chart => chart.resize());
    }
    byId('analytics-source').addEventListener('change', switchSource);
    switchSource(); load();
})();
