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
        const source = document.getElementById('mho-map-source');
        const year = document.getElementById('mho-map-year');
        const month = document.getElementById('mho-map-month');
        const endpoint = HealthIntel.apiOrigin + '/api/mho/reports/historical-counts';
        let periods = [];
        let chosenYear = '';
        let chosenMonth = '';
        const selection = () => source.value === 'live' ? 'live' : year.value && month.value ? year.value + '-' + month.value : 'historical';

        function setOptions(select, options, selected, placeholder) {
            select.replaceChildren(...(options.length ? options.map(([value, label]) => new Option(label, value)) : [new Option(placeholder, '')]));
            select.value = options.some(([value]) => value === selected) ? selected : options[0]?.[0] ?? '';
            select.disabled = !options.length;
        }

        function showMonths() {
            const options = periods.filter(period => period.startsWith(year.value + '-'))
                .map(period => period.slice(5)).reverse().map(value => [value, monthName(value)]);
            setOptions(month, options, chosenMonth || periods[0]?.slice(5), 'Select month');
        }

        function showFilters() {
            if (source.value === 'live') {
                setOptions(year, [], '', 'Current year');
                setOptions(month, [], '', 'Current month');
                return;
            }
            const years = [...new Set(periods.map(period => period.slice(0, 4)))];
            setOptions(year, years.map(value => [value, value]), chosenYear, 'Select year');
            showMonths();
        }

        async function read(requestedPeriod) {
            const [yearValue, monthValue] = requestedPeriod.split('-');
            const query = requestedPeriod === 'historical' ? '' : '?' + new URLSearchParams({ year: yearValue, month: monthValue });
            const response = await fetch(endpoint + query, { signal: AbortSignal.timeout(12000) });
            const result = await response.json();
            if (!response.ok || !result.success || !Array.isArray(result.periods) || !Array.isArray(result.breakdown)) {
                throw new Error('Historical cases are unavailable.');
            }
            periods = [...result.periods].sort().reverse();
            const period = result.year + '-' + result.month;
            if (requestedPeriod !== 'historical' && period !== requestedPeriod) throw new Error('Unexpected historical reporting period.');
            const label = monthName(result.month) + ' ' + result.year;
            const rows = mapCounts(result, label);
            if (requestedPeriod === 'historical' && selection() === 'historical') {
                chosenYear = result.year;
                chosenMonth = result.month;
                showFilters();
            }
            return { rows, label, period, total: result.total };
        }

        source.addEventListener('change', () => { showFilters(); onChange(); });
        year.addEventListener('change', () => {
            chosenYear = year.value;
            showMonths();
            chosenMonth = month.value;
            onChange();
        });
        month.addEventListener('change', () => { chosenMonth = month.value; onChange(); });
        return { selection, read };
    }

    window.HealthIntelMapHistory = { bind, mapCounts };
})();
