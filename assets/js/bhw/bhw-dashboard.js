// BHW dashboard navigation and Brgy Reports historical trend.
function updateBhwDashboardIdentity(userId, barangay) {
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.innerText = value; };
    set('bhw-dashboard-welcome', userId ? `Welcome back, ${userId}` : 'Welcome back');
    set('dynamic-dashboard-subtitle', `Manage visits, follow-ups and reports${barangay ? ` for ${barangay}` : ''}.`);
}

function openBhwDashboardView(target) {
    if (!['view-patients', 'view-resident-profiles', 'view-reports'].includes(target)) return;
    // Reuse the existing navigation handlers, including lazy loading and access scope.
    document.querySelector(`.nav-menu .nav-item[data-target="${target}"]`)?.click();
}

function setBhwDashboardText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function openBhwTodayReport() {
    const input = document.getElementById('bhw-report-date');
    input.max = input.value = HealthIntelDate.todayInManila();
    openBhwDashboardView('view-reports');
    input.focus();
}

let myBhwChart = null;
let bhwDatasetRequest;
async function loadTrendChart() {
    if (myBhwChart) return;
    try {
        // The authenticated endpoint resolves the scope from the BHW account.
        bhwDatasetRequest ??= fetch('http://localhost:3000/api/bhw/dataset-analytics').then(async res => {
            const data = await res.json();
            const counts = data.months;
            if (!res.ok || !data.success || data.source !== 'demonstration_dataset' || !data.filters?.barangay || data.filters.barangay === 'all' ||
                !Array.isArray(counts) || !counts.length || counts.some(row => !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.label) || !Number.isSafeInteger(row.cases) || row.cases < 0) ||
                !Number.isSafeInteger(data.total) || counts.reduce((sum, row) => sum + row.cases, 0) !== data.total) throw new Error('Invalid historical dataset');
            return data;
        }).catch(error => { bhwDatasetRequest = undefined; throw error; });
        const data = await bhwDatasetRequest;
        if (myBhwChart) return;
        const year = data.months.at(-1).label.slice(0, 4);
        const latest = data.months.filter(row => row.label.startsWith(year));
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const displayLabels = latest.map(row => months[Number(row.label.slice(-2)) - 1]);
        const displayData = latest.map(row => row.cases);
        setBhwDashboardText('stat-total', data.total.toLocaleString());
        const canvas = document.getElementById('bhwChart');
        canvas.setAttribute('aria-label', data.filters.barangay + ', ' + year + ' historical monthly cases: ' + displayLabels.map((month, i) => month + ' ' + displayData[i]).join(', ') + '.');
        setBhwDashboardText('bhw-trend-period', displayLabels[0] + '–' + displayLabels.at(-1) + ' ' + year);
        myBhwChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: displayLabels, datasets: [{label:'Historical dataset cases', data:displayData, borderColor:() => document.documentElement.classList.contains('dark') ? '#2dd4bf' : '#0f766e', backgroundColor:() => document.documentElement.classList.contains('dark') ? 'rgba(45,212,191,0.10)' : 'rgba(15,118,110,0.08)', pointBackgroundColor:() => document.documentElement.classList.contains('dark') ? '#2dd4bf' : '#0f766e', pointRadius:3, pointHoverRadius:6, borderWidth:2, fill:true, tension:0}] },
            options: {
                responsive:true, maintainAspectRatio:false,
                interaction:{mode:'index',intersect:false},
                plugins:{legend:{display:false}},
                scales:{y:{beginAtZero:true,ticks:{precision:0},title:{display:true,text:'Cases'}},x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:6},title:{display:true,text:'Month'}}}
            }
        });
        setBhwDashboardText('bhw-trend-status', [data.source_label, data.filters.barangay, 'Through ' + data.months.at(-1).label].join(' · '));
    } catch (error) {
        if (myBhwChart) { myBhwChart.destroy(); myBhwChart = null; }
        setBhwDashboardText('stat-total', '—');
        setBhwDashboardText('bhw-trend-period', 'Unavailable');
        document.getElementById('bhwChart')?.setAttribute('aria-label', 'Historical monthly cases unavailable.');
        setBhwDashboardText('bhw-trend-status', 'The monthly trend could not be loaded. Refresh the page to try again.');
        console.error('Error loading trend chart:', error);
    }
}
