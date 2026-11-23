(() => {
    document.addEventListener('DOMContentLoaded', () => {
        const panel = document.querySelector('[data-historical-report]');
        if (!panel) return;
        const form = panel.querySelector('form');
        const year = form.elements.year;
        const month = form.elements.month;
        const download = panel.querySelector('[data-download]');
        const status = panel.querySelector('[role="status"]');
        const summary = panel.querySelector('[data-summary]');
        const monthly = panel.querySelector('[data-monthly]');
        const breakdown = panel.querySelector('[data-breakdown]');
        const endpoint = HealthIntel.apiOrigin + '/api/' + panel.dataset.historicalReport + '/reports/historical-counts';
        const dateFormat = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        let periods;
        let resultQuery;

        const dateLabel = period => dateFormat.format(new Date(period + '-01T00:00:00Z'));
        function populateMonths(selected = 'all') {
            const options = periods.filter(period => period.startsWith(year.value))
                .map(period => new Option(dateLabel(period), period.slice(5)));
            month.replaceChildren(new Option('All months in this year', 'all'), ...options);
            month.value = options.some(option => option.value === selected) ? selected : 'all';
        }

        function populateTable(table, rows) {
            const body = table.tBodies[0];
            body.replaceChildren();
            for (const values of rows) {
                const row = body.insertRow();
                for (const value of values) row.insertCell().textContent = value;
            }
        }

        async function load() {
            if (form.getAttribute('aria-busy') === 'true') return;
            form.setAttribute('aria-busy', 'true');
            download.disabled = true;
            summary.hidden = true;
            status.textContent = 'Loading historical counts…';
            const query = periods ? new URLSearchParams({ year: year.value, month: month.value }) : new URLSearchParams();
            for (const control of form.elements) control.disabled = true;
            try {
                const response = await fetch(endpoint + '?' + query);
                const data = await response.json();
                if (!periods) {
                    periods = data.periods;
                    year.replaceChildren(...[...new Set(periods.map(period => period.slice(0, 4)))].map(value => new Option(value, value)));
                    year.value = data.year;
                    populateMonths(data.month);
                }
                populateTable(monthly, data.monthly.map(row => [dateLabel(row.period), row.cases]));
                populateTable(breakdown, data.breakdown.map(row => [row.barangay, row.disease, row.cases]));
                resultQuery = new URLSearchParams({ year: data.year, month: data.month, format: 'pdf' });
                const periodLabel = data.month === 'all' ? data.year + ' (' + data.monthly.length + ' months covered)' : dateLabel(data.year + '-' + data.month);
                status.textContent = periodLabel + ' · ' + data.scope + ' · ' + data.total.toLocaleString() + ' cases';
                summary.hidden = false;
                download.disabled = false;
            } catch (error) {
                status.textContent = error.message || 'Historical counts could not be loaded.';
            } finally {
                form.removeAttribute('aria-busy');
                for (const control of form.elements) control.disabled = !periods && control !== form.querySelector('button');
            }
        }

        panel.addEventListener('toggle', () => { if (panel.open && !periods) load(); });
        year.addEventListener('change', () => { populateMonths(); load(); });
        month.addEventListener('change', load);
        form.addEventListener('submit', event => { event.preventDefault(); load(); });
        download.addEventListener('click', async () => {
            try {
                await HealthIntel.download(endpoint + '?' + resultQuery, {}, 'Historical_Case_Counts.pdf');
            } catch (error) {
                status.textContent = error.message || 'Could not download this report.';
            }
        });
    });
})();
