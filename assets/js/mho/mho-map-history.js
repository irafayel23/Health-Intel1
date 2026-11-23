(() => {
    const monthLabel = new Intl.DateTimeFormat('en-PH', { month: 'long', timeZone: 'UTC' });
    const monthName = month => monthLabel.format(new Date(Date.UTC(2020, Number(month) - 1, 1)));

    function mapCounts(result, period) {
        const counts = new Map();
        for (const { barangay, disease, cases } of result.breakdown) {
            if (!Number.isSafeInteger(cases) || cases < 0) throw new Error('Invalid historical case count.');
            if (!counts.has(barangay)) counts.set(barangay, { name: barangay, cases: 0, historical: { period, diseases: [] } });
            const row = counts.get(barangay);
            row.cases += cases;
            row.historical.diseases.push({ disease, cases });
        }
        if (!counts.size || [...counts.values()].reduce((sum, row) => sum + row.cases, 0) !== result.total) {
            throw new Error('Historical map counts do not match the report.');
        }
        return [...counts.values()];
    }

    function bind(onChange) {
        const year = document.getElementById('mho-map-year');
        const month = document.getElementById('mho-map-month');
        const status = document.getElementById('mho-map-period-status');
        const endpoint = HealthIntel.apiOrigin + '/api/mho/reports/historical-counts';
        let livePeriod = HealthIntelDate.todayInManila().slice(0, 7);
        let periods = [];
        let loaded = false;
        let pending;
        const displayedPeriod = () => year.value + '-' + month.value;
        const selection = () => displayedPeriod() === livePeriod ? 'live' : displayedPeriod();

        function setOptions(select, values, selected, label) {
            select.replaceChildren(...values.map(value => new Option(label(value), value)));
            select.value = values.includes(selected) ? selected : values[0];
            select.disabled = values.length < 2;
        }

        function showMonths(keepMonth) {
            const months = [...new Set([...periods, livePeriod].filter(period => period.startsWith(year.value + '-'))
                .map(period => period.slice(5)))].sort().reverse();
            setOptions(month, months, keepMonth, value =>
                monthName(value) + (year.value + '-' + value === livePeriod ? ' (live)' : ''));
        }

        function showPeriods(preferredPeriod) {
            const [preferredYear, preferredMonth] = preferredPeriod.split('-');
            const years = [...new Set([...periods, livePeriod].map(period => period.slice(0, 4)))].sort().reverse();
            setOptions(year, years, preferredYear, value => value);
            showMonths(preferredMonth);
        }

        function syncLivePeriod() {
            const current = HealthIntelDate.todayInManila().slice(0, 7);
            if (current === livePeriod) return;
            const previous = displayedPeriod();
            const followLive = previous === livePeriod;
            livePeriod = current;
            showPeriods(followLive ? current : previous);
        }

        async function fetchCounts(query = '') {
            const response = await fetch(endpoint + query, { signal: AbortSignal.timeout(12000) });
            const result = await response.json();
            if (!response.ok || !result.success || !Array.isArray(result.periods) || !Array.isArray(result.breakdown)) {
                throw new Error('Historical cases are unavailable.');
            }
            return result;
        }

        function loadPeriods() {
            if (loaded || pending) return pending;
            pending = fetchCounts().then(result => {
                periods = [...result.periods].sort();
                showPeriods(displayedPeriod());
                status.textContent = '';
                status.hidden = true;
                loaded = true;
            }).catch(() => {
                status.textContent = 'Past months could not load. Use Refresh map to retry.';
                status.hidden = false;
            }).finally(() => { pending = null; });
            return pending;
        }

        async function read(requestedPeriod) {
            const [year, month] = requestedPeriod.split('-');
            const result = await fetchCounts('?' + new URLSearchParams({ year, month }));
            const period = result.year + '-' + result.month;
            if (period !== requestedPeriod) throw new Error('Unexpected reporting period.');
            const label = monthName(month) + ' ' + year;
            return { rows: mapCounts(result, label), label, period, total: result.total };
        }

        showPeriods(livePeriod);
        year.addEventListener('change', () => { showMonths(month.value); onChange(); });
        month.addEventListener('change', onChange);
        return { selection, read, loadPeriods, syncLivePeriod };
    }

    window.HealthIntelMapHistory = { bind };
})();
