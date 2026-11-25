(function (global) {
    'use strict';
    const number = n => n !== null && n !== undefined && n !== '' && Number.isFinite(Number(n)) && Number(n) >= 0 ? Number(n).toLocaleString('en-PH') : '—';
    function monthLabel(period) {
        return /^\d{4}-(0[1-9]|1[0-2])$/.test(period) ?
            new Intl.DateTimeFormat('en-PH',{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(period+'-01T00:00:00Z')) : '—';
    }
    function recent(rows) {
        return Array.isArray(rows) ? [...rows].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||Number(b.id)-Number(a.id)).slice(0,3) : null;
    }
    function time(value) {
        const d=new Date(value);
        return value && Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d)+' PHT' : 'Time not recorded';
    }
    function init(doc,win) {
        const root=doc.getElementById('role-overview');
        const role=root?.getAttribute('data-overview-role');
        if (!['admin','superadmin'].includes(role)) return;
        let version=0,reportPeriod;
        const el=id=>doc.getElementById(id);
        const put=(id,value)=>{if(el(id))el(id).textContent=value;};
        async function read(path) {
            const response=await win.fetch((win.HealthIntel?.apiOrigin||'http://localhost:3000')+path);
            if(!response.ok)throw Error('Overview data unavailable');
            const result=await response.json();
            if(result.success===false)throw Error('Overview data unavailable');
            return result;
        }
        function list(id,rows,empty,kind) {
            const box=el(id);if(!box)return;box.replaceChildren();
            if(rows===null||!rows.length){
                const state=doc.createElement('div');state.className='m-5 flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center dark:border-neutral-600 dark:bg-neutral-800';
                const mark=doc.createElement('span');mark.className='mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200';
                const icon=doc.createElement('i');icon.setAttribute('data-lucide',rows===null?'circle-alert':kind==='activity'?'history':'clipboard-check');icon.setAttribute('aria-hidden','true');icon.className='h-7 w-7';mark.append(icon);
                const title=doc.createElement('p');title.className='text-base font-bold text-slate-900 dark:text-white';title.textContent=rows===null?'Unable to load this panel':kind==='activation'?'No staff awaiting activation':kind==='accounts'?'No requests waiting':'No activity yet';
                const detail=doc.createElement('p');detail.className='mt-2 max-w-xs text-sm font-medium leading-6 text-slate-700 dark:text-slate-200';detail.textContent=rows===null?'Select Refresh overview to try again.':empty;
                state.append(mark,title,detail);box.append(state);win.lucide?.createIcons();return;
            }
            rows.forEach(row=>{
                const wrap=doc.createElement('div');wrap.className='flex items-start gap-4 border-b border-slate-200 px-5 py-5 last:border-0 dark:border-neutral-700';
                const mark=doc.createElement('span');mark.className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-200';
                const icon=doc.createElement('i');icon.setAttribute('data-lucide',kind!=='activity'?'user-round':/login/i.test(row.action||'')?'log-in':/backup/i.test(row.action||'')?'hard-drive-download':'clipboard-list');icon.setAttribute('aria-hidden','true');icon.className='h-5 w-5';mark.append(icon);wrap.append(mark);
                const text=doc.createElement('div');text.className='min-w-0';
                const title=doc.createElement('p');title.className='break-words text-base font-semibold leading-6 text-slate-950 dark:text-white';
                title.textContent=kind!=='activity'?String(row.system_id||'Account'):String(row.action||'Recorded action');
                const detail=doc.createElement('p');detail.className='mt-1.5 break-words text-sm font-medium leading-6 text-slate-700 dark:text-slate-200';
                detail.textContent=kind!=='activity'?`${String(row.role||'admin').toUpperCase()} · ${time(row.created_at)}`:`${row.user_id||'System'} · ${time(row.created_at)}`;
                text.append(title,detail);wrap.append(text);
                if(kind!=='activity'){const badge=doc.createElement('span');badge.className='shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200';badge.textContent=kind==='activation'?'Awaiting activation':'Pending';wrap.append(badge);}
                box.append(wrap);
            });
            win.lucide?.createIcons();
        }
        function renderReports(rows,period) {
            const label=monthLabel(period);
            put('overview-report-month',label==='—'?'Latest closed month':label);
            put('overview-report-period',label==='—'?'Latest closed month':label);
            put('overview-confirmed','—');
            const host=el('overview-report-list');
            host.replaceChildren();
            if(!Array.isArray(rows)||rows.length!==7){
                const empty=doc.createElement('p');
                empty.className='admin-overview-empty';
                empty.textContent='Reporting status could not be loaded. Refresh to try again.';
                host.append(empty);
                return;
            }
            const confirmed=rows.filter(row=>row.confirmed&&!row.pending).length;
            put('overview-confirmed',confirmed+' / 7');
            const entries=doc.createElement('ul');
            for(const row of rows){
                const item=doc.createElement('li');
                const place=doc.createElement('span');
                const badge=doc.createElement('span');
                place.textContent=row.barangay;
                badge.className='admin-overview-badge';
                const complete=row.confirmed&&!row.pending;
                badge.setAttribute('data-state',complete?'confirmed':'pending');
                badge.textContent=row.pending?'Pending classification':row.stale?'Changed · review again':complete?'Confirmed':'Awaiting confirmation';
                item.append(place,badge);
                entries.append(item);
            }
            host.append(entries);
        }
        function open(destination) {
            const map=role==='admin'?{records:['view-data','nav-data'],reports:['view-admin-analytics','nav-admin-analytics'],datasets:['view-admin-analytics','nav-admin-analytics'],catalog:['view-diseases','nav-diseases'],audit:['view-audit','nav-audit']}:{directory:['view-users','nav-users'],accounts:['view-users','nav-users'],activation:['view-users','nav-users'],audit:['view-audit','nav-audit'],backup:['view-db','nav-db']};
            const target=map[destination];if(!target)return;
            win.switchMainView(...target);
            if(role==='admin'&&['reports','datasets'].includes(destination)){
                win.HealthIntelAdminAnalytics?.openTab(destination==='reports'?'training':'datasets',destination==='reports'?reportPeriod:undefined);
                return;
            }
            if(role==='superadmin'&&target[0]==='view-users')win.selectAdminAccess(destination);
            const heading=doc.getElementById(target[0])?.querySelector('h1,h2,h3');
            if(heading){heading.setAttribute('tabindex','-1');heading.focus();}
        }
        root.addEventListener('click',event=>{const button=event.target.closest('[data-overview-open]');if(button&&root.contains(button))open(button.getAttribute('data-overview-open'));});
        async function refresh() {
            const run=++version;el('overview-refresh').disabled=true;
            root.setAttribute('aria-busy','true');put('overview-load-status','Refreshing overview…');
            const paths=role==='admin'?['/api/session','/api/patients','/api/diseases','/api/admin/audit-logs','/api/admin/analytics/datasets']:['/api/session','/api/superadmin/users','/api/superadmin/health','/api/superadmin/audit-logs'];
            const requests=paths.map(read);
            if(role==='admin')requests.push(requests[4].then(({data})=>{
                const period=data?.bundled?.through;
                if(monthLabel(period)==='—')throw Error('Reporting month unavailable');
                return read('/api/admin/operational-predictions/reports?month='+encodeURIComponent(period));
            }));
            const results=await Promise.allSettled(requests);if(run!==version)return;
            const data=i=>results[i].status==='fulfilled'?results[i].value.data:null;
            const session=results[0].status==='fulfilled'?results[0].value.user:null;
            const accountName=role==='superadmin'?'SUPERADMIN-***':'ADM-***';
            put('overview-welcome',session?.system_id?`Welcome back, ${accountName}`:'Welcome to your workspace');
            put('overview-account-id',session?.system_id?accountName:'Account unavailable');
            if(role==='admin'){
                const coverage=data(4)?.bundled;
                put('overview-records',Array.isArray(data(1))?number(data(1).filter(r=>r.status==='Active'&&!Number(r.is_archived)).length):'—');
                put('overview-catalog',Array.isArray(data(2))?number(data(2).length):'—');
                put('overview-latest-month',!coverage||coverage.reportingUnavailable?'—':coverage.latestComplete?monthLabel(coverage.latestComplete):'None yet');
                reportPeriod=coverage?.through;
                renderReports(data(5),reportPeriod);
                list('overview-recent-list',recent(data(3)),'No operational activity has been recorded.','activity');
            }else{
                win.loadSystemHealth?.(results[2].status === 'fulfilled' ? results[2].value : null);
                const users=data(1),health=data(2),admins=Array.isArray(users)?users.filter(u=>String(u.role).toLowerCase()==='admin'):null;
                put('overview-accounts',admins?number(admins.length):'—');
                const awaiting = Array.isArray(users) ? users.filter(user => user.status === 'awaiting_activation') : null;
                put('overview-pending',awaiting ? number(awaiting.length) : '—');
                put('overview-records',health?number(health.total_records):'—');
                put('overview-system-accounts',Array.isArray(users)?number(users.length):'—');
                put('stat-total-logs',health?number(health.total_logs):'—');
                put('overview-hero-title',users?'Your system, organized and within reach':'Your system overview');
                list('overview-pending-list',awaiting?.slice(0,3) ?? null,'Staff appear here after their accounts are issued.','activation');
                list('overview-recent-list',recent(data(3)),'No system activity has been recorded.','activity');
            }
            const failed=results.filter(r=>r.status==='rejected').length;
            put('overview-load-status',failed?'Some overview data could not be loaded. Refresh to retry.':`Updated ${time(new Date().toISOString())}`);
            root.setAttribute('aria-busy','false');el('overview-refresh').disabled=false;
        }
        el('overview-refresh').addEventListener('click',refresh);
        win.HealthIntelOverview={refresh,open};
        if (role !== 'superadmin' || !/^#view-(?:users|staff|audit|db)$/.test(win.location?.hash || '')) void refresh();
    }
    const api={recent,time,number,init};
    if(typeof module==='object'&&module.exports)module.exports=api;
    if(global.document)global.document.addEventListener('DOMContentLoaded',()=>init(global.document,global));
})(typeof window==='object'?window:globalThis);

