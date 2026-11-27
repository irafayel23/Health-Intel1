// BHW dashboard navigation, live visit activity, and historical case trend.
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

const bhwTrendPanels = {
    dashboard: {chart:'bhwDashboardTrendChart', total:'bhw-dashboard-total', period:'bhw-dashboard-trend-period', status:'bhw-dashboard-trend-status'},
    reports: {chart:'bhwChart', total:'stat-total', period:'bhw-trend-period', status:'bhw-trend-status'}
};
const bhwTrendCharts = new Map();
const bhwChartColor = () => document.documentElement.classList.contains('dark') ? '#2dd4bf' : '#0f766e';
let bhwDatasetRequest;
async function loadTrendChart(view = 'reports') {
    if (bhwTrendCharts.has(view)) return;
    const panel = bhwTrendPanels[view];
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
        if (bhwTrendCharts.has(view)) return;
        const year = data.months.at(-1).label.slice(0, 4);
        const latest = data.months.filter(row => row.label.startsWith(year));
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const displayLabels = latest.map(row => months[Number(row.label.slice(-2)) - 1]);
        const displayData = latest.map(row => row.cases);
        setBhwDashboardText(panel.total, data.total.toLocaleString());
        const canvas = document.getElementById(panel.chart);
        canvas.setAttribute('aria-label', data.filters.barangay + ', ' + year + ' historical monthly cases: ' + displayLabels.map((month, i) => month + ' ' + displayData[i]).join(', ') + '.');
        setBhwDashboardText(panel.period, (latest.length===1 ? displayLabels[0] : displayLabels[0]+'–'+displayLabels.at(-1))+' '+year);
        const chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: displayLabels, datasets: [{label:'Historical dataset cases', data:displayData, borderColor:bhwChartColor, backgroundColor:() => document.documentElement.classList.contains('dark') ? 'rgba(45,212,191,0.10)' : 'rgba(15,118,110,0.08)', pointBackgroundColor:bhwChartColor, pointRadius:3, pointHoverRadius:6, borderWidth:2, fill:true, tension:0}] },
            options: {
                responsive:true, maintainAspectRatio:false,
                interaction:{mode:'index',intersect:false},
                plugins:{legend:{display:false}},
                scales:{y:{beginAtZero:true,ticks:{precision:0},title:{display:true,text:'Cases'}},x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:6},title:{display:true,text:'Month'}}}
            }
        });
        bhwTrendCharts.set(view,chart);
        setBhwDashboardText(panel.status, '');
        document.getElementById(panel.status).hidden = true;
    } catch (error) {
        setBhwDashboardText(panel.total, '—');
        setBhwDashboardText(panel.period, 'Unavailable');
        document.getElementById(panel.chart)?.setAttribute('aria-label', 'Historical monthly cases unavailable.');
        document.getElementById(panel.status).hidden = false;
        setBhwDashboardText(panel.status, 'The monthly trend could not be loaded. Refresh the page to try again.');
        console.error('Error loading trend chart:', error);
    }
}

let bhwActivityRequest=0;
async function loadBhwVisitActivity() {
    const grid=document.getElementById('bhwActivityChart');
    const status=document.getElementById('bhw-activity-status');
    const request=++bhwActivityRequest;
    try {
        const res=await fetch('http://localhost:3000/api/bhw/intakes/activity',{cache:'no-store'});
        const {success,days}=await res.json();
        if(request!==bhwActivityRequest)return;
        if(!res.ok||!success||!Array.isArray(days)||days.length!==14||days.some(day=>
            !/^\d{4}-\d{2}-\d{2}$/.test(day.date)||!Number.isSafeInteger(day.visits)||day.visits<0))throw Error('Invalid visit counts');
        const shortDate=new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',timeZone:'UTC'});
        const labels=days.map(day=>shortDate.format(new Date(day.date+'T00:00:00Z')));
        const values=days.map(day=>day.visits);
        const total=values.reduce((sum,count)=>sum+count,0);
        const today=values.at(-1);
        setBhwDashboardText('bhw-activity-total',total+' '+(total===1?'visit':'visits'));
        status.textContent=total?today+' '+(today===1?'visit':'visits')+' today.':'No patient visits recorded in the last 14 days.';
        grid.replaceChildren(...days.map((day,index)=>{
            const tile=document.createElement('li');
            tile.className='bhw-activity-day';
            const isToday=index===days.length-1;
            tile.dataset.hasVisits=String(day.visits>0);
            if(isToday)tile.setAttribute('aria-current','date');
            const date=document.createElement('time');
            date.dateTime=day.date;
            date.textContent=isToday?'Today':labels[index];
            const count=document.createElement('strong');
            count.textContent=String(day.visits);
            count.setAttribute('aria-label',day.visits+' '+(day.visits===1?'visit':'visits'));
            tile.append(date,count);
            return tile;
        }));
    } catch {
        if(request!==bhwActivityRequest)return;
        grid.replaceChildren();
        setBhwDashboardText('bhw-activity-total','—');
        status.textContent='Visit counts could not be loaded. Reopen the dashboard to try again.';
    }
}
