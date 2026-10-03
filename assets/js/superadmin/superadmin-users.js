// Superadmin Admin-account directory and access management.
// Classic script: loaded through superadmin.html; existing hooks are retained.
let adminAccounts = [];
let adminRefreshVersion = 0;
const adminStates = {
    approved: {label:'Active',action:'Suspend',next:'suspended',color:'text-emerald-700 dark:text-emerald-400'},
    pending: {label:'Pending',action:'Approve',next:'approved',color:'text-amber-700 dark:text-amber-400'},
    suspended: {label:'Suspended',action:'Restore',next:'approved',color:'text-slate-600 dark:text-neutral-400'},
    denied: {label:'Denied',color:'text-red-700 dark:text-red-400'}
};
const adminState = status => adminStates[status] || {label:'Unknown',color:'text-slate-600 dark:text-neutral-400'};
const adminName = user => [user.first_name,user.last_name].filter(Boolean).join(' ') || 'Name not recorded';
const adminTime = value => {
    const date = new Date(value);
    return value && Number.isFinite(date.getTime())
        ? new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}).format(date)+' PHT'
        : 'Not recorded';
};

async function loadAdmins() {
    const version = ++adminRefreshVersion;
    const status = document.getElementById('admin-list-status');
    status.textContent = 'Loading Admin accounts…';
    adminAccounts = [];
    document.getElementById('user-table-body').innerHTML = '<tr><td colspan="5" class="p-6 text-center">Loading Admin accounts…</td></tr>';
    try {
        const res = await fetch('http://localhost:3000/api/superadmin/users');
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.data)) throw Error('Admin accounts could not be loaded.');
        if (version !== adminRefreshVersion) return;
        adminAccounts = data.data.filter(user=>String(user.role).toLowerCase()==='admin');
        renderAdmins();
    } catch (error) {
        if (version !== adminRefreshVersion) return;
        status.textContent = 'Could not load Admin accounts. Try Refresh.';
        document.getElementById('user-table-body').innerHTML = '<tr><td colspan="5" class="p-6 text-center text-red-700 dark:text-red-400">Admin accounts could not be loaded. Please try again.</td></tr>';
    }
}

function renderAdmins() {
    const search = document.getElementById('admin-search').value.trim().toLowerCase();
    const status = document.getElementById('admin-status-filter').value;
    const rows = adminAccounts.filter(user=>(!status || user.status===status) && (!search ||
        [user.system_id,adminName(user),user.email,user.employee_id].some(value=>String(value || '').toLowerCase().includes(search))));
    document.getElementById('admin-list-status').textContent = `${rows.length} of ${adminAccounts.length} Admin accounts match.`;
    document.getElementById('user-table-body').innerHTML = rows.length ? rows.map(user=>{
        const state = adminState(user.status), id = escapeText(JSON.stringify(user.system_id));
        const action = state.action ? `<button onclick="toggleAdminStatus(${id}, '${state.next}')" class="whitespace-nowrap px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-medium">${state.action}</button>`
            : '<span class="text-xs text-slate-500 dark:text-neutral-400">No action available</span>';
        return `<tr class="border-b border-slate-200 dark:border-neutral-800">
            <td class="p-4 min-w-[180px] max-w-xs break-words"><p class="font-semibold text-slate-900 dark:text-white">${escapeText(adminName(user))}</p><p class="mt-1 text-xs text-slate-600 dark:text-neutral-400">${escapeText(user.system_id)}</p></td>
            <td class="p-4 max-w-xs break-all text-slate-700 dark:text-neutral-300">${escapeText(user.email || 'Email not recorded')}</td>
            <td class="p-4"><span class="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-neutral-800 ${state.color} text-xs font-medium">${state.label}</span></td>
            <td class="p-4 text-xs text-slate-600 dark:text-neutral-400">${escapeText(adminTime(user.created_at))}</td>
            <td class="sticky right-0 z-10 bg-white dark:bg-neutral-900 p-4 border-l border-slate-300 dark:border-neutral-800"><div class="flex flex-col gap-2 items-stretch"><button onclick="viewAdminAccount(${id})" class="whitespace-nowrap px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs">View details</button>${action}</div></td>
        </tr>`;
    }).join('') : '<tr><td colspan="5" class="p-6 text-center text-slate-600 dark:text-neutral-400">'+(adminAccounts.length?'No Admin accounts match your search.':'No Admin accounts are registered.')+'</td></tr>';
}

async function toggleAdminStatus(id, newStatus) {
    const user = adminAccounts.find(account=>account.system_id===id);
    const state = user && adminState(user.status);
    if (!state?.action || state.next!==newStatus) return;
    const suspension = newStatus==='suspended';
    const result = await Swal.fire({
        titleText: `${state.action} ${id}?`,
        text: suspension ? 'This Admin will lose access until restored. Enter the reason for the saved account history.'
            : user.status==='pending' ? 'Approve this Admin account for access to Health-Intel?' : 'Restore access for this suspended Admin account?',
        icon:'question',showCancelButton:true,confirmButtonText:state.action,cancelButtonText:'Cancel',
        ...(suspension ? {input:'textarea',inputLabel:'Suspension reason',inputPlaceholder:'Explain why access is being suspended',inputAttributes:{maxlength:'500'},
            inputValidator:value=>!validAdminReason(value)?'Enter a reason (1–500 characters, plain text).':undefined} : {})
    });
    if (!result.isConfirmed) return;
    if (suspension && !validAdminReason(result.value)) return;
    try {
        const endpoint = suspension ? 'admin/suspend-user' : user.status==='pending' ? 'superadmin/approve-admin' : 'admin/restore-suspended';
        const res = await fetch('http://localhost:3000/api/'+endpoint,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({system_id:id,...(suspension?{reason:result.value.trim()}:{})})
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw Error(data.error || 'The account could not be updated.');
        await Promise.all([loadAdmins(),loadAuditLogs()]);
        await Swal.fire({title:'Account updated',text:`${id}: ${adminState(newStatus).label}. The access change was saved in account history.`,icon:'success'});
    } catch (error) {
        await loadAdmins();
        await Swal.fire({title:'Account update failed',text:error.message || 'Please try again.',icon:'error'});
    }
}

function validAdminReason(value) {
    return typeof value==='string' && value.trim().length>0 && value.trim().length<=500 && !/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
}

async function viewAdminAccount(id) {
    try {
        const response = await fetch('http://localhost:3000/api/superadmin/admins/'+encodeURIComponent(id)+'/history');
        const result = await response.json();
        if (!response.ok || !result.success || !result.data || !Array.isArray(result.data.events)) throw Error(result.error || 'Account history could not be loaded.');
        const {account,events,has_more} = result.data;
        const field = (label,value)=>`<div><dt class="text-xs text-neutral-400">${escapeText(label)}</dt><dd class="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">${escapeText(value || 'Not recorded')}</dd></div>`;
        const history = events.map(event=>{
            const data = ledgerPayload(event);
            const statusChange = data.before?.status && data.after?.status
                ? `<p class="mt-2">${escapeText(adminState(data.before.status).label)} → ${escapeText(adminState(data.after.status).label)}</p>` : '';
            return `<article class="rounded-xl border border-neutral-700 p-4 mb-3 [overflow-wrap:anywhere]"><p class="font-semibold">${escapeText(event.action)} · ${escapeText(event.outcome)}</p><p class="mt-1 text-xs text-neutral-400">${escapeText(adminTime(event.created_at))} · ${escapeText(event.user_id)} (${escapeText(event.role)})</p>${statusChange}<p class="mt-2 whitespace-pre-wrap">${escapeText(HealthIntelText.auditDetails(event))}</p>${data.reason?`<p class="mt-2 whitespace-pre-wrap"><strong>Reason:</strong> ${escapeText(data.reason)}</p>`:event.action==='User Suspended'?'<p class="mt-2 text-sm text-neutral-400">Suspension reason was not recorded.</p>':''}</article>`;
        }).join('');
        await Swal.fire({titleText:`Admin account ${account.system_id}`,width:760,confirmButtonText:'Close',
            html:`<div class="text-left text-sm max-h-[65vh] overflow-y-auto pr-2 text-inherit"><dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">${field('Name',adminName(account))}${field('Email',account.email)}${field('Account ID',account.system_id)}${field('Employee ID',account.employee_id)}${field('Current status',adminState(account.status).label)}${field('Registered',adminTime(account.created_at))}</dl><h3 class="font-semibold text-lg mb-2">Account access history</h3><p class="text-neutral-400 mb-4">Saved access changes and authentication events explicitly linked to this account. Older activity may not have an account reference.${has_more?' Showing the latest 100 events; older saved events remain in Master Ledger.':''}</p>${history || '<p>No linked access events have been recorded.</p>'}</div>`});
    } catch (error) {
        await Swal.fire({title:'Account history unavailable',text:error.message || 'Please try again.',icon:'error'});
    }
}
