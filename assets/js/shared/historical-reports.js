const HistoricalReports = (() => {
    const months = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('en-US', {
        month: 'long', timeZone: 'UTC'
    }).format(new Date(Date.UTC(2020, index, 1))));

    async function pdfUrl(role, year, monthName) {
        const monthIndex = months.indexOf(monthName);
        if (monthIndex < 0) return null;
        const endpoint = HealthIntel.apiOrigin + '/api/' + role + '/reports/historical-counts';
        const response = await fetch(endpoint);
        const data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.periods)) {
            throw new Error(data.error || 'Historical reporting periods could not be loaded.');
        }
        const month = String(monthIndex + 1).padStart(2, '0');
        if (!data.periods.includes(year + '-' + month)) return null;
        return endpoint + '?' + new URLSearchParams({ month, year, format: 'pdf' });
    }

    return { pdfUrl };
})();
