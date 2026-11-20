// BHW Daily workspace: historical counts and live status use separate assigned-barangay APIs.
function updateBhwDashboardIdentity(userId, barangay) {
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.innerText = value; };
    set('bhw-dashboard-welcome', userId ? `Welcome back, ${userId}` : 'Welcome back');
    set('dynamic-dashboard-subtitle', `Your recorded cases, trends and everyday tools${barangay ? ` for ${barangay}` : ''}.`);
}

function openBhwDashboardView(target) {
    if (!['view-patients', 'view-reports'].includes(target)) return;
    // Reuse the existing navigation handlers, including lazy loading and access scope.
    document.querySelector(`.nav-menu .nav-item[data-target="${target}"]`)?.click();
}

function setBhwDashboardText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

async function loadDashboardStats() {
    const ids = ['stat-active', 'stat-cleared', 'stat-high-risk', 'bd-active', 'bd-cleared', 'bd-mild', 'bd-monitored', 'bd-high', 'bd-unknown'];
    try {
        const url = window.currentBrgyId ? `http://localhost:3000/api/bhw-stats?barangay_id=${window.currentBrgyId}` : 'http://localhost:3000/api/bhw-stats';
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('Recorded totals unavailable');
        const values = ['total', 'active', 'cleared', 'mild', 'monitored', 'high_risk'].map(key => data[key]);
        if (values.some(value => value === null || value === '' || !Number.isSafeInteger(Number(value)) || Number(value) < 0)) throw new Error('Invalid recorded totals');
        for (const [id, key] of [['stat-active','active'], ['stat-cleared','cleared'], ['stat-high-risk','high_risk'], ['bd-active','active'], ['bd-cleared','cleared'], ['bd-mild','mild'], ['bd-monitored','monitored'], ['bd-high','high_risk']]) setBhwDashboardText(id, Number(data[key]).toLocaleString());
        const active = Number(data.active), mild = Number(data.mild), monitored = Number(data.monitored), high = Number(data.high_risk);
        const unknown = active - mild - monitored - high;
        const bar = document.getElementById('bhw-severity-bar');
        if (bar) {
            bar.hidden = unknown < 0;
            bar.classList.toggle('hidden', unknown < 0);
            bar.setAttribute('aria-label', `${mild} mild, ${monitored} monitored, ${high} high risk${unknown > 0 ? `, ${unknown} not classified` : ''}; ${active} active cases.`);
        }
        for (const [id, count] of [['bhw-mild-bar',mild], ['bhw-monitored-bar',monitored], ['bhw-high-bar',high], ['bhw-unknown-bar',Math.max(0, unknown)]]) {
            const el = document.getElementById(id);
            if (el) el.style.width = `${active > 0 ? count / active * 100 : 0}%`;
        }
        const unknownRow = document.getElementById('bhw-unknown-severity');
        if (unknownRow) { unknownRow.hidden = unknown <= 0; unknownRow.classList.toggle('hidden', unknown <= 0); }
        setBhwDashboardText('bd-unknown', Math.max(0, unknown).toLocaleString());
        setBhwDashboardText('bhw-dashboard-status', unknown < 0 ? 'Recorded severity counts do not reconcile with active cases. Distribution is unavailable.' : 'Status and severity use live, non-archived records.');
    } catch (error) {
        ids.forEach(id => setBhwDashboardText(id, '—'));
        const bar = document.getElementById('bhw-severity-bar');
        if (bar) { bar.hidden = true; bar.classList.add('hidden'); }
        const unknownRow = document.getElementById('bhw-unknown-severity');
        if (unknownRow) { unknownRow.hidden = true; unknownRow.classList.add('hidden'); }
        setBhwDashboardText('bhw-dashboard-status', 'Live status and severity could not be loaded. Refresh the page to try again.');
        console.error('Error loading stats:', error);
    }
}

let myBhwChart = null;
let bhwDatasetRequest;
async function loadTrendChart() {
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
        const year = data.months.at(-1).label.slice(0, 4);
        const latest = data.months.filter(row => row.label.startsWith(year));
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const displayLabels = latest.map(row => months[Number(row.label.slice(-2)) - 1]);
        const displayData = latest.map(row => row.cases);
        setBhwDashboardText('stat-total', data.total.toLocaleString());
        const canvas = document.getElementById('bhwChart');
        if (myBhwChart) { myBhwChart.destroy(); myBhwChart = null; }
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
