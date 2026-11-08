// Superadmin Admin-account directory and access management.
// Classic script: loaded through superadmin.html; existing hooks are retained.
let systemAccounts = [];
let adminAccessView = 'accounts';
let adminLoadState = 'loading';
let adminRefreshVersion = 0;
const accountsPerPage = 8;
const adminStates = {
    approved: {label:'Active',action:'Suspend',detailsAction:'Suspend Access',next:'suspended'},
    pending: {label:'Pending',action:'Approve',next:'approved'},
    suspended: {label:'Suspended',action:'Restore',detailsAction:'Restore Access',next:'approved'},
    denied: {label:'Denied'}
};
const adminState = status => adminStates[status] || {label:'Unknown'};
const adminName = user => [user.first_name,user.last_name].filter(Boolean).join(' ') || 'Name not recorded';
const adminTime = value => {
    const date = new Date(value);
    return value && Number.isFinite(date.getTime())
        ? new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}).format(date)+' PHT'
        : 'Not recorded';
};

function selectAdminAccess(view) {
    adminAccessView = view;
    const directory = view === 'directory';
    const pending = view === 'pending';
    for (const choice of ['directory','accounts','pending']) {
        document.getElementById('admin-view-'+choice).setAttribute('aria-pressed', String(choice===view));
    }
    document.getElementById('admin-access-description').textContent = directory
        ? 'Browse BHW, MHO and Admin accounts by status. BHW and MHO requests are reviewed in the Admin portal.'
        : pending ? 'Select a pending Admin registration to review, approve or decline it.'
        : 'Review LGU Admin accounts. Select a row to view details and manage access.';
    document.getElementById('admin-search').value = '';
    document.getElementById('admin-status-filter').value = '';
    document.getElementById('admin-role-filter').value = '';
    document.getElementById('admin-role-field').hidden = !directory;
    document.getElementById('admin-status-field').hidden = pending;
    document.getElementById('admin-pending-option').hidden = !directory;
    document.getElementById('admin-account-heading').textContent = directory ? 'System account' : 'Admin account';
    document.getElementById('admin-email-heading').textContent = directory ? 'Role' : 'Email';
    document.getElementById('admin-date-heading').textContent = directory ? 'Assigned barangay' : 'Registered';
    renderAdmins();
}

async function loadAdmins() {
    const version = ++adminRefreshVersion;
    adminLoadState = 'loading';
    renderAdmins();
    try {
        const res = await fetch('http://localhost:3000/api/superadmin/users');
        const result = await res.json();
        if (!res.ok || !result.success || !Array.isArray(result.data)) throw Error('Accounts could not be loaded.');
        if (version !== adminRefreshVersion) return;
        systemAccounts = result.data;
        adminLoadState = 'ready';
    } catch (error) {
        if (version !== adminRefreshVersion) return;
        adminLoadState = 'error';
    }
    renderAdmins();
}

function renderAdmins(page = 1) {
    const listStatus = document.getElementById('admin-list-status');
    const table = document.getElementById('user-table-body');
    const pager = document.getElementById('admin-account-pager');
    const pendingCount = document.getElementById('admin-pending-count');
    if (adminLoadState !== 'ready') {
        const message = adminLoadState === 'loading' ? 'Loading accounts…' : 'Accounts could not be loaded. Try Refresh.';
        pendingCount.textContent = '';
        pager.innerHTML = '';
        listStatus.textContent = message;
        table.innerHTML = `<tr><td colspan="4" class="p-6 text-center">${message}</td></tr>`;
        return;
    }

    const directory = adminAccessView === 'directory';
    const pending = adminAccessView === 'pending';
    const admins = systemAccounts.filter(user=>user.role==='admin');
    pendingCount.textContent = admins.filter(user=>user.status==='pending').length;
    const scope = directory ? systemAccounts : admins.filter(user=>(user.status==='pending')===pending);
    const search = document.getElementById('admin-search').value.trim().toLowerCase();
    const status = document.getElementById('admin-status-filter').value;
    const role = document.getElementById('admin-role-filter').value;
    const rows = scope.filter(user=>(pending || !status || user.status===status) && (!directory || !role || user.role===role) && (!search ||
        [user.system_id,adminName(user),...(directory ? [user.assigned_barangay] : [user.email,user.employee_id])].some(value=>String(value || '').toLowerCase().includes(search))));
    const label = directory ? 'system accounts' : pending ? 'pending requests' : 'Admin accounts';
    listStatus.textContent = `${rows.length} of ${scope.length} ${label} match.`;
    const empty = scope.length ? 'No matching '+label+'.'
        : pending ? 'No administrator requests awaiting approval.' : 'No '+label+' are registered.';
    const totalPages = Math.ceil(rows.length / accountsPerPage);
    page = Math.max(1, Math.min(page, totalPages));
    const start = (page - 1) * accountsPerPage;
    pager.innerHTML = totalPages > 1 ? renderHistoryPagination(page, totalPages, `Showing ${start+1}–${Math.min(start+accountsPerPage,rows.length)} of ${rows.length}`, 'Account list pages') : '';
    table.innerHTML = rows.length ? rows.slice(start,start+accountsPerPage).map(user=>{
        const state = adminState(user.status), id = escapeText(JSON.stringify(user.system_id));
        const row = ` tabindex="0" aria-label="Open account ${escapeText(user.system_id)} details" onclick="openAdminRow(event, ${id})" onkeydown="openAdminRow(event, ${id})" class="hi-admin-access-row"`;
        const assignment = user.role==='bhw' ? user.assigned_barangay || 'Not assigned' : 'Municipality';
        return `<tr${row}>
            <td class="p-4"><p class="font-semibold text-slate-900 dark:text-white">${escapeText(adminName(user))}</p><p class="mt-1 text-xs text-slate-600 dark:text-neutral-400">${escapeText(user.system_id)}</p></td>
            <td class="p-4 text-slate-700 dark:text-neutral-300">${escapeText(directory ? (user.role==='admin' ? 'Admin' : user.role.toUpperCase()) : user.email || 'Email not recorded')}</td>
            <td class="p-4"><span class="hi-admin-access-status" data-status="${escapeText(user.status)}">${state.label}</span></td>
            <td class="p-4 text-xs text-slate-600 dark:text-neutral-400">${escapeText(directory ? assignment : adminTime(user.created_at))}<span class="hi-admin-access-hint" aria-hidden="true">Open account details</span></td>
        </tr>`;
    }).join('') : `<tr><td colspan="4" class="p-6 text-center text-slate-600 dark:text-neutral-400">${empty}</td></tr>`;
}

function pageAdminAccounts(event) {
    const button = event.target.closest('[data-history-page]');
    if (!button || button.disabled) return;
    const page = Number(button.dataset.historyPage);
    if (!Number.isInteger(page) || page < 1) return;
    renderAdmins(page);
    event.currentTarget.querySelector('[aria-current="page"]')?.focus();
}

async function toggleAdminStatus(id, newStatus, user = systemAccounts.find(account=>account.role==='admin' && account.system_id===id)) {
    const state = user && adminState(user.status);
    const decline = user?.role==='admin' && user.status==='pending' && newStatus==='denied';
    if (!decline && (!state?.action || state.next!==newStatus)) return;
    const action = decline ? 'Decline' : state.action;
    const suspension = newStatus==='suspended';
    const result = await Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog",
        titleText: `${action} ${id}?`,
        text: suspension ? 'This Admin will lose access until restored. Enter the reason for the saved account history.'
            : decline ? 'Decline this administrator registration?' : user.status==='pending' ? 'Approve this Admin account for access to Health-Intel?' : 'Restore access for this suspended Admin account?',
        icon:'question',showCancelButton:true,confirmButtonText:action,cancelButtonText:'Cancel',
        ...(decline ? {focusCancel:true,customClass:{confirmButton:'hi-admin-access-action-approved'}} : {}),
        ...(suspension ? {input:'textarea',inputLabel:'Suspension reason',inputPlaceholder:'Explain why access is being suspended',inputAttributes:{maxlength:'500'},
            inputValidator:value=>!validAdminReason(value)?'Enter a reason (1–500 characters, plain text).':undefined} : {})
    });
    if (!result.isConfirmed) return;
    if (suspension && !validAdminReason(result.value)) return;
    try {
        const endpoint = suspension ? 'admin/suspend-user' : decline ? 'admin/deny-user' : user.status==='pending' ? 'superadmin/approve-admin' : 'admin/restore-suspended';
        const res = await fetch('http://localhost:3000/api/'+endpoint,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({system_id:id,...(suspension?{reason:result.value.trim()}:{})})
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw Error(data.error || 'The account could not be updated.');
        await Promise.all([loadAdmins(),loadAuditLogs()]);
        await Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog",title:'Account updated',text:`${id}: ${adminState(newStatus).label}. The access change was saved in account history.`,icon:'success'});
    } catch (error) {
        await loadAdmins();
        await Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog",title:'Account update failed',text:error.message || 'Please try again.',icon:'error'});
    }
}

function validAdminReason(value) {
    return typeof value==='string' && value.trim().length>0 && value.trim().length<=500 && !/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
}


function openAdminRow(event, id) {
    if (event.target.closest('button, a, input, select, textarea')) return;
    if (event.type === 'keydown') {
        if (!['Enter', ' '].includes(event.key) || event.target !== event.currentTarget) return;
        event.preventDefault();
    }
    return adminAccessView === 'directory' ? viewDirectoryAccount(id) : viewAdminAccount(id);
}

function historyPageNumbers(page, total) {
    const pages = [...new Set([1, total, page - 1, page, page + 1])]
        .filter(value => value >= 1 && value <= total).sort((a,b) => a-b);
    const result = [];
    pages.forEach((value,index) => {
        if (index && value - pages[index-1] > 1) result.push(null);
        result.push(value);
    });
    return result;
}

function renderHistoryPagination(page, total, countLabel, navLabel) {
    const button = (label, number, disabled = false) => `<button type="button" data-history-page="${number}" ${disabled ? 'disabled' : ''} ${typeof label === 'number' ? `aria-label="Page ${number}"` : ''} ${label === page ? 'aria-current="page"' : ''} class="hi-related-page">${label}</button>`;
    const controls = total > 1
        ? `<nav class="hi-related-pages" aria-label="${navLabel}">${button('Previous', page - 1, page === 1)}${historyPageNumbers(page, total).map(number => number === null ? '<span aria-hidden="true">…</span>' : button(number, number)).join('')}${button('Next', page + 1, page === total)}</nav>`
        : '';
    return `<div class="hi-history-pagination"><p role="status">Page ${page} of ${total} · ${countLabel}</p>${controls}</div>`;
}
const accessField = (label,value)=>`<div><dt class="text-xs">${escapeText(label)}</dt><dd class="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">${escapeText(value || 'Not recorded')}</dd></div>`;

function viewDirectoryAccount(id) {
    const account = systemAccounts.find(user=>user.system_id===id);
    if (!account) return;
    return Swal.fire({titleText:`Account ${id}`,width:760,showCloseButton:true,closeButtonAriaLabel:'Close dialog',confirmButtonText:'Close',
        html:`<div class="text-left text-sm max-h-[65vh] overflow-y-auto pr-2 text-inherit"><dl class="hi-admin-account-facts grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">${accessField('Name',adminName(account))}${accessField('Account ID',account.system_id)}${accessField('Role',account.role.toUpperCase())}${accessField('Assigned barangay',account.role==='bhw' ? account.assigned_barangay || 'Not assigned' : 'Municipality')}${accessField('Current status',adminState(account.status).label)}${accessField('Registered',adminTime(account.created_at))}</dl></div>`});
}

async function viewAdminAccount(id) {
    try {
        const response = await fetch('http://localhost:3000/api/superadmin/admins/'+encodeURIComponent(id)+'/history');
        const result = await response.json();
        if (!response.ok || !result.success || !result.data || !Array.isArray(result.data.events)) throw Error(result.error || 'Account history could not be loaded.');
        const {account,events,has_more} = result.data;
        const state = adminState(account.status);
        const canManage = Boolean(state.action);
        const pending = account.status==='pending';
        const renderPage = page => {
            const totalPages = Math.max(1, Math.ceil(events.length / 5));
            const history = events.slice((page-1)*5, page*5).map(event=>{
                const data = ledgerPayload(event);
                const statusChange = data.before?.status && data.after?.status
                    ? `<p class="mt-2">${escapeText(adminState(data.before.status).label)} → ${escapeText(adminState(data.after.status).label)}</p>` : '';
                return `<article class="rounded-xl border border-slate-200 dark:border-neutral-700 p-4 mb-3 [overflow-wrap:anywhere]"><p class="font-semibold">${escapeText(event.action)} · ${escapeText(event.outcome)}</p><p class="mt-1 text-xs text-neutral-600 dark:text-neutral-400">${escapeText(adminTime(event.created_at))} · ${escapeText(event.user_id)} (${escapeText(event.role)})</p>${statusChange}<p class="mt-2 whitespace-pre-wrap">${escapeText(HealthIntelText.auditDetails(event))}</p>${data.reason?`<p class="mt-2 whitespace-pre-wrap"><strong>Reason:</strong> ${escapeText(data.reason)}</p>`:event.action==='User Suspended'?'<p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Suspension reason was not recorded.</p>':''}</article>`;
            }).join('');
            return `${history || '<p>No linked access events have been recorded.</p>'}`
                + renderHistoryPagination(page, totalPages, `${events.length} recorded events`, 'Account access history pages');
        };
        const decision = await Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog",titleText:`Admin account ${account.system_id}`,width:760,confirmButtonText:state.detailsAction || state.action || 'Close',
            showCancelButton:canManage,cancelButtonText:'Close',focusCancel:canManage,
            ...(pending ? {showDenyButton:true,denyButtonText:'Decline',denyButtonColor:'#b91c1c'} : {}),
            ...(canManage ? {customClass:{confirmButton:'hi-admin-access-action-'+account.status}} : {}),
            didOpen: () => {
                const container = Swal.getHtmlContainer().querySelector('[data-history-content]');
                container.addEventListener('click', event => {
                    const button = event.target.closest('[data-history-page]');
                    if (!button || !container.contains(button) || button.disabled) return;
                    const page = Number(button.dataset.historyPage);
                    if (!Number.isInteger(page) || page < 1 || page > Math.ceil(events.length / 5)) return;
                    container.innerHTML = renderPage(page);
                    container.querySelector('[aria-current="page"]')?.focus();
                    container.scrollIntoView({block:'nearest'});
                });
            },
            html:`<div class="text-left text-sm max-h-[65vh] overflow-y-auto pr-2 text-inherit"><dl class="hi-admin-account-facts grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">${accessField('Name',adminName(account))}${accessField('Email',account.email)}${accessField('Account ID',account.system_id)}${accessField('Employee ID',account.employee_id)}${accessField('Current status',adminState(account.status).label)}${accessField('Registered',adminTime(account.created_at))}</dl><h3 class="font-semibold text-lg mb-2">Account access history</h3><p class="text-neutral-600 dark:text-neutral-400 mb-4">Saved access changes and authentication events explicitly linked to this account. Older activity may not have an account reference.${has_more?' Showing the latest 100 events; older saved events remain in Master Ledger.':''}</p><div data-history-content>${renderPage(1)}</div></div>`});
        if (pending && decision?.isDenied) await toggleAdminStatus(account.system_id, 'denied', {...account, role:'admin'});
        if (canManage && decision?.isConfirmed) await toggleAdminStatus(account.system_id, state.next, account);
    } catch (error) {
        await Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog",title:'Account history unavailable',text:error.message || 'Please try again.',icon:'error'});
    }
}
