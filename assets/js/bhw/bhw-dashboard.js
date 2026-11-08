// BHW Daily workspace: presentation of the existing assigned-barangay APIs.
function updateBhwDashboardIdentity(userId, barangay) {
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.innerText = value; };
    set('bhw-dashboard-welcome', userId ? `Welcome back, ${userId}` : 'Welcome back');
    set('dynamic-dashboard-subtitle', `Your recorded cases, trends and everyday tools${barangay ? ` for ${barangay}` : ''}.`);
}

function openBhwDashboardView(target) {
    if (!['view-patients', 'view-heatmap', 'view-reports'].includes(target)) return;
    // Reuse the existing navigation handlers, including lazy loading and access scope.
    document.querySelector(`.nav-menu .nav-item[data-target="${target}"]`)?.click();
}

function setBhwDashboardText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

async function loadDashboardStats() {
    const ids = ['stat-total', 'stat-active', 'stat-cleared', 'stat-high-risk', 'bd-active', 'bd-cleared', 'bd-mild', 'bd-monitored', 'bd-high', 'bd-unknown'];
    try {
        const url = window.currentBrgyId ? `http://localhost:3000/api/bhw-stats?barangay_id=${window.currentBrgyId}` : 'http://localhost:3000/api/bhw-stats';
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('Recorded totals unavailable');
        const values = ['total', 'active', 'cleared', 'mild', 'monitored', 'high_risk'].map(key => data[key]);
        if (values.some(value => value === null || value === '' || !Number.isSafeInteger(Number(value)) || Number(value) < 0)) throw new Error('Invalid recorded totals');
        for (const [id, key] of [['stat-total','total'], ['stat-active','active'], ['stat-cleared','cleared'], ['stat-high-risk','high_risk'], ['bd-active','active'], ['bd-cleared','cleared'], ['bd-mild','mild'], ['bd-monitored','monitored'], ['bd-high','high_risk']]) setBhwDashboardText(id, Number(data[key]).toLocaleString());
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
        setBhwDashboardText('bhw-dashboard-status', unknown < 0 ? 'Recorded severity counts do not reconcile with active cases. Distribution is unavailable.' : 'Assigned-barangay totals · Non-archived cases · All recorded years.');
    } catch (error) {
        ids.forEach(id => setBhwDashboardText(id, '—'));
        const bar = document.getElementById('bhw-severity-bar');
        if (bar) { bar.hidden = true; bar.classList.add('hidden'); }
        const unknownRow = document.getElementById('bhw-unknown-severity');
        if (unknownRow) { unknownRow.hidden = true; unknownRow.classList.add('hidden'); }
        setBhwDashboardText('bhw-dashboard-status', 'Case totals could not be loaded. Refresh the page to try again.');
        console.error('Error loading stats:', error);
    }
}

let myBhwChart = null;
async function loadTrendChart() {
    try {
        const url = window.currentBrgyId ? `http://localhost:3000/api/bhw-trend?barangay_id=${window.currentBrgyId}` : 'http://localhost:3000/api/bhw-trend';
        const res = await fetch(url);
        const result = await res.json();
        if (!res.ok || !result.success || !Array.isArray(result.data)) throw new Error('Monthly cases unavailable');
        const today = new Date();
        const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const displayLabels = monthLabels.slice(0, today.getMonth() + 1);
        const rawCounts = result.data.slice(0, displayLabels.length);
        if (rawCounts.some(value => value === null || value === '')) throw new Error('Missing monthly counts');
        const displayData = rawCounts.map(Number);
        // Preserve an explicit empty response (also used by the existing portal harness).
        if (displayData.length && (displayData.length !== displayLabels.length || displayData.some(value => !Number.isSafeInteger(value) || value < 0))) throw new Error('Invalid monthly counts');
        const canvas = document.getElementById('bhwChart');
        if (myBhwChart) { myBhwChart.destroy(); myBhwChart = null; }
        canvas.setAttribute('aria-label', `${today.getFullYear()} recorded monthly cases: ${displayLabels.map((month, i) => `${month} ${displayData[i] ?? 'unavailable'}`).join(', ')}. Current month may be incomplete.`);
        setBhwDashboardText('bhw-trend-period', `Jan–${displayLabels.at(-1)} ${today.getFullYear()}`);
        myBhwChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: displayLabels, datasets: [{label:'Recorded cases', data:displayData, borderColor:() => document.documentElement.classList.contains('dark') ? '#2dd4bf' : '#0f766e', backgroundColor:() => document.documentElement.classList.contains('dark') ? 'rgba(45,212,191,0.10)' : 'rgba(15,118,110,0.08)', pointBackgroundColor:() => document.documentElement.classList.contains('dark') ? '#2dd4bf' : '#0f766e', pointRadius:3, pointHoverRadius:6, borderWidth:2, fill:true, tension:0}] },
            options: {
                responsive:true, maintainAspectRatio:false,
                interaction:{mode:'index',intersect:false},
                plugins:{legend:{display:false}},
                scales:{y:{beginAtZero:true,ticks:{precision:0},title:{display:true,text:'Cases'}},x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:6},title:{display:true,text:'Month'}}}
            }
        });
        setBhwDashboardText('bhw-trend-status', displayData.length ? 'Current calendar year · Current month may be incomplete · Recorded cases, not predictions.' : 'No monthly case data was returned.');
    } catch (error) {
        if (myBhwChart) { myBhwChart.destroy(); myBhwChart = null; }
        document.getElementById('bhwChart')?.setAttribute('aria-label', 'Monthly recorded cases unavailable.');
        setBhwDashboardText('bhw-trend-status', 'The monthly trend could not be loaded. Refresh the page to try again.');
        console.error('Error loading trend chart:', error);
    }
}
