(function (global) {
    'use strict';
    const number = n => n !== null && n !== undefined && n !== '' && Number.isFinite(Number(n)) && Number(n) >= 0 ? Number(n).toLocaleString('en-PH') : '—';
    function accountSummary(pending, active, inactive) {
        if (![pending, active, inactive].every(Array.isArray)) return null;
        return {total:new Set([...pending,...active,...inactive].map(u=>u.system_id)).size,pending:pending.length,active:active.length};
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
        let version=0;
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
                const icon=doc.createElement('i');icon.setAttribute('data-lucide',rows===null?'circle-alert':kind==='accounts'?'clipboard-check':'history');icon.setAttribute('aria-hidden','true');icon.className='h-7 w-7';mark.append(icon);
                const title=doc.createElement('p');title.className='text-base font-bold text-slate-900 dark:text-white';title.textContent=rows===null?'Unable to load this panel':kind==='accounts'?'No requests waiting':'No activity yet';
                const detail=doc.createElement('p');detail.className='mt-2 max-w-xs text-sm font-medium leading-6 text-slate-700 dark:text-slate-200';detail.textContent=rows===null?'Select Refresh overview to try again.':empty;
                state.append(mark,title,detail);box.append(state);win.lucide?.createIcons();return;
            }
            rows.forEach(row=>{
                const wrap=doc.createElement('div');wrap.className='flex items-start gap-4 border-b border-slate-200 px-5 py-5 last:border-0 dark:border-neutral-700';
                const mark=doc.createElement('span');mark.className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-200';
                const icon=doc.createElement('i');icon.setAttribute('data-lucide',kind==='accounts'?'user-round':/login/i.test(row.action||'')?'log-in':/backup/i.test(row.action||'')?'hard-drive-download':'clipboard-list');icon.setAttribute('aria-hidden','true');icon.className='h-5 w-5';mark.append(icon);wrap.append(mark);
                const text=doc.createElement('div');text.className='min-w-0';
                const title=doc.createElement('p');title.className='break-words text-base font-semibold leading-6 text-slate-950 dark:text-white';
                title.textContent=kind==='accounts'?String(row.system_id||'Account'):String(row.action||'Recorded action');
                const detail=doc.createElement('p');detail.className='mt-1.5 break-words text-sm font-medium leading-6 text-slate-700 dark:text-slate-200';
                detail.textContent=kind==='accounts'?`${String(row.role||'admin').toUpperCase()} · ${time(row.created_at)}`:`${row.user_id||'System'} · ${time(row.created_at)}`;
                text.append(title,detail);wrap.append(text);
                if(kind==='accounts'){const badge=doc.createElement('span');badge.className='shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200';badge.textContent='Pending';wrap.append(badge);}
                box.append(wrap);
            });
            win.lucide?.createIcons();
        }
        function open(destination) {
            const map=role==='admin'?{accounts:['view-iam','nav-iam'],pending:['view-iam','nav-iam'],records:['view-data','nav-data'],catalog:['view-diseases','nav-diseases'],audit:['view-audit','nav-audit']}:{directory:['view-users','nav-users'],accounts:['view-users','nav-users'],pending:['view-users','nav-users'],audit:['view-audit','nav-audit'],backup:['view-db','nav-db']};
            const target=map[destination];if(!target)return;
            win.switchMainView(...target);
            if(role==='admin'&&['accounts','pending'].includes(destination))win.switchSubView('iam',destination==='pending'?'pending':'active');
            if(role==='superadmin'&&target[0]==='view-users')win.selectAdminAccess(destination);
            const heading=doc.getElementById(target[0])?.querySelector('h1,h2,h3');
            if(heading){heading.setAttribute('tabindex','-1');heading.focus();}
        }
        root.addEventListener('click',event=>{const button=event.target.closest('[data-overview-open]');if(button&&root.contains(button))open(button.getAttribute('data-overview-open'));});
        async function refresh() {
            const run=++version;el('overview-refresh').disabled=true;
            root.setAttribute('aria-busy','true');put('overview-load-status','Refreshing overview…');
            const paths=role==='admin'?['/api/session','/api/admin/pending-users','/api/admin/active-users','/api/admin/denied-users','/api/patients','/api/diseases','/api/admin/audit-logs']:['/api/session','/api/superadmin/users','/api/superadmin/health','/api/superadmin/audit-logs'];
            const results=await Promise.allSettled(paths.map(read));if(run!==version)return;
            const data=i=>results[i].status==='fulfilled'?results[i].value.data:null;
            const session=results[0].status==='fulfilled'?results[0].value.user:null;
            const accountName=role==='superadmin'?'SUPERADMIN-***':'ADM-***';
            put('overview-welcome',session?.system_id?`Welcome back, ${accountName}`:'Welcome to your workspace');
            put('overview-account-id',session?.system_id?accountName:'Account unavailable');
            if(role==='admin'){
                const summary=accountSummary(data(1),data(2),data(3));
                put('overview-accounts',summary?number(summary.total):'—');
                put('overview-pending',Array.isArray(data(1))?number(data(1).length):'—');
                put('overview-records',Array.isArray(data(4))?number(data(4).filter(r=>r.status==='Active'&&!Number(r.is_archived)).length):'—');
                put('overview-catalog',Array.isArray(data(5))?number(data(5).length):'—');
                const pending=data(1);
                put('overview-hero-title',Array.isArray(pending)?pending.length?`${pending.length} account request${pending.length===1?' needs':'s need'} your review`:'Your approval queue is clear':'Review your account requests');
                list('overview-pending-list',Array.isArray(pending)?pending.slice(0,3):null,'No pending BHW or MHO registrations.','accounts');
                list('overview-recent-list',recent(data(6)),'No operational activity has been recorded.','activity');
            }else{
                const users=data(1),health=data(2),admins=Array.isArray(users)?users.filter(u=>String(u.role).toLowerCase()==='admin'):null;
                put('overview-accounts',admins?number(admins.filter(u=>u.status!=='pending').length):'—');
                put('overview-pending',admins?number(admins.filter(u=>u.status==='pending').length):'—');
                put('overview-records',health?number(health.total_records):'—');
                put('overview-system-accounts',Array.isArray(users)?number(users.length):'—');
                put('stat-total-logs',health?number(health.total_logs):'—');
                put('overview-hero-title',admins?admins.some(u=>u.status==='pending')?'Administrator access needs review':'Your system, organized and within reach':'Your system overview');
                list('overview-pending-list',admins?admins.filter(u=>u.status==='pending').slice(0,3):null,'No administrator requests are awaiting approval.','accounts');
                list('overview-recent-list',recent(data(3)),'No system activity has been recorded.','activity');
            }
            const failed=results.filter(r=>r.status==='rejected').length;
            put('overview-load-status',failed?'Some overview data could not be loaded. Refresh to retry.':`Updated ${time(new Date().toISOString())}`);
            root.setAttribute('aria-busy','false');el('overview-refresh').disabled=false;
        }
        el('overview-refresh').addEventListener('click',refresh);
        win.HealthIntelOverview={refresh,open};
        refresh();
    }
    const api={accountSummary,recent,time,number,init};
    if(typeof module==='object'&&module.exports)module.exports=api;
    if(global.document)global.document.addEventListener('DOMContentLoaded',()=>init(global.document,global));
})(typeof window==='object'?window:globalThis);

