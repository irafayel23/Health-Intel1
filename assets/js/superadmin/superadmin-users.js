const staffDeliveryStatus = {
    sent: 'The mail provider accepted the message. Check the employee’s inbox or spam folder.',
    failed: 'The email could not be sent. The activation details can still be copied.',
    auth_failed: 'Gmail rejected the sender login. The activation details can still be copied.',
    not_configured: 'Email delivery is unavailable. The activation details can still be copied.',
    sending: 'Delivery status has not been confirmed.',
    recipient_rejected: 'The mail service rejected the recipient. Confirm the address or hand over the details in person.',
    smtp_unavailable: 'The mail server did not respond. The activation details can still be copied.',
    unconfirmed: 'The server did not confirm that an email was sent. You can copy the code or request a new one.'
};

async function cancelStaffAccount(staff) {
    const result = await Swal.fire({
        icon: 'warning',
        title: 'Cancel staff account?',
        text: `Cancel ${staff.system_id} for ${adminName(staff)}? Its activation code will stop working and its saved email can be used again.`,
        showCancelButton: true, cancelButtonText: 'Keep account', focusCancel: true,
        confirmButtonText: 'Cancel staff account', confirmButtonColor: '#b91c1c',
        showLoaderOnConfirm: true, allowOutsideClick: () => !Swal.isLoading(),
        preConfirm: async () => {
            try {
                const response = await fetch('http://localhost:3000/api/superadmin/staff-accounts/cancel', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ system_id: staff.system_id })
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw Error(result.error || 'Could not cancel the staff account.');
                return true;
            } catch (error) {
                Swal.showValidationMessage(error.message);
                return false;
            }
        }
    });
    if (!result.isConfirmed) return;
    void loadAdmins();
    await Swal.fire({
        icon: 'success', title: 'Staff account canceled',
        text: 'The activation code was invalidated and the cancellation was recorded in the Activity Log.'
    });
}

async function createStaffAccount(staff) {
    const inputStyle = 'mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white';
    let barangays = [];
    try {
        if (!staff || staff.role === 'bhw') {
            const response = await fetch('http://localhost:3000/api/superadmin/staff-barangays');
            const result = await response.json();
            if (!response.ok || !result.success || !Array.isArray(result.data)) throw Error();
            barangays = result.data;
        }
    } catch {
        return Swal.fire({ icon: 'error', title: 'Could not load barangays', text: 'Try opening staff account creation again.' });
    }
    const result = await Swal.fire({
        title: staff ? 'New activation code' : 'Create staff account',
        ...(staff ? {width: 520, customClass: {popup: 'hi-staff-code-dialog'}} : {}),
        html: `<form class="grid gap-3 text-left text-sm">
            ${staff ? `<div class="hi-staff-code-summary">
                <strong>${escapeText(adminName(staff))}</strong>
                <span>${escapeText([staff.system_id, staff.role === 'admin' ? 'Admin' : staff.role.toUpperCase(), staff.assigned_barangay].filter(Boolean).join(' · '))}</span>
            </div><p>A new code replaces the previous one.</p>` : `
            <p class="rounded-xl bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100">Verify the employee’s ID and assignment in person before issuing a code.</p>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="font-semibold">First name<input class="${inputStyle}" name="first_name" maxlength="100" required></label>
              <label class="font-semibold">Last name<input class="${inputStyle}" name="last_name" maxlength="100" required></label>
              <label class="font-semibold">Employee ID<input class="${inputStyle}" name="employee_id" maxlength="50" required></label>
              <label class="font-semibold">Role<select class="${inputStyle}" name="role" required><option value="" disabled selected>Choose role</option><option value="bhw">BHW</option><option value="mho">MHO</option><option value="admin">Admin</option></select></label>
            </div>
            <label class="font-semibold" data-assignment hidden>Assigned barangay<select class="${inputStyle}" name="barangay_id"><option value="">Choose barangay</option></select></label>`}
            <label class="font-semibold">How should the employee receive the code?
              <select class="${inputStyle}" name="delivery_method">
                <option value="manual">In person</option>
                <option value="email">Send to the employee’s Gmail</option>
              </select>
            </label>
            <div data-delivery-email hidden>
              <label class="font-semibold">${staff?.delivery_email ? 'Saved Gmail' : 'Employee’s Gmail'}<input class="${inputStyle}" type="email" name="delivery_email" autocomplete="off" maxlength="255" placeholder="name@gmail.com" disabled></label>
              <p class="mt-1 text-sm">${staff?.delivery_email
                ? escapeText(staffDeliveryStatus[staff.last_email_delivery] || 'The saved address will be reused.')
                : 'Confirm the address with the employee before sending.'}</p>
            </div>
            <label class="flex items-start gap-2 font-medium"><input type="checkbox" name="identity_checked" required> I checked the employee’s ID and assignment in person.</label>
        </form>`,
        confirmButtonText: staff ? 'Get new code' : 'Create account', showCancelButton: true, cancelButtonText: 'Close',
        showDenyButton: Boolean(staff), denyButtonText: 'Cancel staff account', denyButtonColor: '#b91c1c',
        confirmButtonColor: '#047857', showLoaderOnConfirm: true, allowOutsideClick: () => !Swal.isLoading(),
        didOpen: popup => {
            const form = popup.querySelector('form');
            form.addEventListener('submit', event => { event.preventDefault(); Swal.clickConfirm(); });
            const { role, barangay_id, delivery_method, delivery_email } = form.elements;
            const updateDelivery = () => {
                const byEmail = delivery_method.value === 'email';
                form.querySelector('[data-delivery-email]').hidden = !byEmail;
                delivery_email.disabled = !byEmail;
                delivery_email.required = byEmail;
            };
            delivery_method.addEventListener('change', updateDelivery);
            if (!staff) {
                barangays.forEach(barangay => barangay_id.add(new Option(barangay.name, barangay.id)));
                const updateAssignment = () => {
                    form.querySelector('[data-assignment]').hidden = role.value !== 'bhw';
                    barangay_id.required = role.value === 'bhw';
                };
                role.addEventListener('change', updateAssignment);
                updateAssignment();
            }
            if (staff?.delivery_email) {
                delivery_email.value = staff.delivery_email;
                delivery_email.readOnly = true;
                delivery_method.value = 'email';
            }
            updateDelivery();
        },
        preConfirm: async () => {
            const form = Swal.getHtmlContainer().querySelector('form');
            if (!form.reportValidity()) return false;
            const fields = ['first_name', 'last_name', 'employee_id', 'role', 'barangay_id'];
            const data = Object.fromEntries(fields.map(name => [name, staff?.[name] ?? form.elements[name]?.value]));
            if (staff?.role === 'bhw') data.barangay_id = barangays.find(barangay => barangay.name === staff.assigned_barangay)?.id;
            data.delivery_method = form.elements.delivery_method.value;
            if (data.delivery_method === 'email') data.delivery_email = form.elements.delivery_email.value;
            data.identity_checked = form.elements.identity_checked.checked;
            if (staff) data.reissue_system_id = staff.system_id;
            try {
                const response = await fetch('http://localhost:3000/api/superadmin/staff-accounts', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw Error(result.error || 'Account could not be issued.');
                return {...result, delivery_method: data.delivery_method, requested_recipient: data.delivery_email};
            } catch (error) {
                Swal.showValidationMessage(error.message);
                return false;
            }
        }
    });
    if (result.isDenied && staff) return cancelStaffAccount(staff);
    if (!result.isConfirmed) return;
    const { system_id, code, expires_at, email_delivery, delivery_recipient, delivery_method, requested_recipient } = result.value;
    const manual = delivery_method === 'manual';
    const sent = delivery_method === 'email' && email_delivery === 'sent';
    const recipient = delivery_recipient || requested_recipient;
    const deliveryNote = manual
        ? 'Give the System ID and code to the employee in person.'
        : staffDeliveryStatus[email_delivery] || staffDeliveryStatus.unconfirmed;
    const title = sent ? 'Activation email sent' : manual ? 'Ready for in-person handoff'
        : email_delivery && email_delivery !== 'manual' ? 'Activation email not sent' : 'Email delivery unconfirmed';
    selectAdminAccess('directory');
    void loadAdmins();
    await Swal.fire({
        title,
        width: 510,
        customClass: { popup: 'hi-staff-code-dialog hi-staff-code-result' },
        icon: sent || manual ? 'success' : 'warning',
        html: `<div class="hi-staff-result-content">
            ${!manual && recipient ? `<p><strong>Recipient</strong> ${escapeText(recipient)}</p>` : ''}
            <p>${escapeText(deliveryNote)}</p>
            <dl class="hi-staff-result-details">
              <div><dt>System ID</dt><dd>${escapeText(system_id)}</dd></div>
              <div><dt>Expires</dt><dd>${escapeText(adminTime(expires_at))}</dd></div>
              <div class="hi-staff-result-code"><dt>One-time activation code</dt><dd>${escapeText(code)}</dd></div>
            </dl>
            <div class="hi-staff-result-copy">
              <button type="button" data-copy-activation>Copy activation details</button>
              <p role="status" data-copy-status></p>
            </div>
        </div>`,
        didOpen: popup => {
            const status = popup.querySelector('[data-copy-status]');
            popup.querySelector('[data-copy-activation]').addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(`System ID: ${system_id}\nActivation code: ${code}`);
                    status.textContent = 'Activation details copied.';
                } catch {
                    status.textContent = 'Select and copy the System ID and code above.';
                }
            });
        },
        confirmButtonText: 'Done', confirmButtonColor: '#047857', allowOutsideClick: false
    });
}

// Superadmin Admin-account directory and access management.
// Classic script: loaded through superadmin.html; existing hooks are retained.
let systemAccounts = [];
let adminLoadState = 'loading';
let adminRefreshVersion = 0;
const accountsPerPage = 8;
const adminStates = {
    approved: {label:'Active',action:'Suspend',detailsAction:'Suspend Access',next:'suspended'},
    pending: {label:'Pending',action:'Approve',next:'approved'},
    suspended: {label:'Suspended',action:'Restore',detailsAction:'Restore Access',next:'approved'},
    denied: {label:'Denied'},
    awaiting_activation: {label:'Awaiting activation'}
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
    document.getElementById('admin-search').value = '';
    document.getElementById('admin-role-filter').value = view === 'accounts' ? 'admin' : '';
    document.getElementById('admin-status-filter').value = view === 'activation' ? 'awaiting_activation' : '';
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
    if (adminLoadState !== 'ready') {
        const message = adminLoadState === 'loading' ? 'Loading accounts…' : 'Accounts could not be loaded. Try Refresh.';
        pager.innerHTML = '';
        listStatus.textContent = message;
        table.innerHTML = `<tr><td colspan="4" class="p-6 text-center">${message}</td></tr>`;
        return;
    }

    const search = document.getElementById('admin-search').value.trim().toLowerCase();
    const status = document.getElementById('admin-status-filter').value;
    const role = document.getElementById('admin-role-filter').value;
    const rows = systemAccounts.filter(user => (!status || user.status === status) && (!role || user.role === role) && (!search ||
        [user.system_id, adminName(user), user.assigned_barangay, user.email, user.employee_id]
            .some(value => String(value || '').toLowerCase().includes(search))));
    listStatus.textContent = `${rows.length} of ${systemAccounts.length} staff accounts match.`;
    const empty = systemAccounts.length ? 'No matching staff accounts.' : 'No staff accounts are registered.';
    const totalPages = Math.ceil(rows.length / accountsPerPage);
    page = Math.max(1, Math.min(page, totalPages));
    const start = (page - 1) * accountsPerPage;
    pager.innerHTML = totalPages > 1 ? renderHistoryPagination(page, totalPages, `Showing ${start+1}–${Math.min(start+accountsPerPage,rows.length)} of ${rows.length}`, 'Account list pages') : '';
    table.innerHTML = rows.length ? rows.slice(start,start+accountsPerPage).map(user=>{
        const state = adminState(user.status), id = escapeText(JSON.stringify(user.system_id));
        const row = ` tabindex="0" aria-label="Open account ${escapeText(user.system_id)} details" onclick="openAdminRow(event, ${id})" onkeydown="openAdminRow(event, ${id})" class="hi-admin-access-row"`;
        const assignment = user.role==='bhw' ? user.assigned_barangay || 'Not assigned' : 'Municipality';
        return `<tr${row}>
            <td class="p-4"><p class="font-semibold text-slate-900 dark:text-white">${escapeText(adminName(user))}</p><p class="mt-1 text-xs text-slate-600 dark:text-neutral-400">${escapeText(user.system_id)}</p>${user.status==='pending'?registrationSubmissionBadge(user):''}</td>
            <td class="p-4 text-slate-700 dark:text-neutral-300">${escapeText(user.role==='admin' ? 'Admin' : user.role.toUpperCase())}</td>
            <td class="p-4"><span class="hi-admin-access-status" data-status="${escapeText(user.status)}">${state.label}</span></td>
            <td class="p-4 text-xs text-slate-600 dark:text-neutral-400">${escapeText(assignment)}<span class="hi-admin-access-hint" aria-hidden="true">Open account details</span></td>
        </tr>`;
    }).join('') : `<tr><td colspan="4" class="p-6 text-center text-slate-600 dark:text-neutral-400">${empty}</td></tr>`;
}

function pageAdminAccounts(event) {
    const button = event.target.closest('[data-history-page]');
    if (!button || button.disabled) return;
    const page = Number(button.dataset.historyPage);
    if (!Number.isInteger(page) || page < 1) return;
    renderAdmins(page);
    globalThis.HealthIntelPagination?.showStart('user-table-body');
}

async function toggleAdminStatus(id, newStatus, user = systemAccounts.find(account=>account.role==='admin' && account.system_id===id)) {
    const state = user && adminState(user.status);
    const decline = user?.role==='admin' && user.status==='pending' && newStatus==='denied';
    if (!decline && (!state?.action || state.next!==newStatus)) return;
    if(decline){const decision=await registrationDenial(id,user.review_submission);if(decision.isConfirmed){await Promise.all([loadAdmins(),loadAuditLogs()]);registrationDecisionNotice(decision.value);}return;}
    const action = state.action;
    const suspension = newStatus==='suspended';
    const result = await Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog",
        titleText: `${action} ${id}?`,
        text: suspension ? 'This Admin will lose access until restored. Enter the reason for the saved account history.'
            : user.status==='pending' ? 'Approve this Admin account for access to Health-Intel?' : 'Restore access for this suspended Admin account?',
        icon:'question',showCancelButton:true,confirmButtonText:action,cancelButtonText:'Cancel',
        ...(suspension ? {input:'textarea',inputLabel:'Suspension reason',inputPlaceholder:'Explain why access is being suspended',inputAttributes:{maxlength:'500'},
            inputValidator:value=>!validAdminReason(value)?'Enter a reason (1–500 characters, plain text).':undefined} : {})
    });
    if (!result.isConfirmed) return;
    if (suspension && !validAdminReason(result.value)) return;
    try {
        const endpoint = suspension ? 'admin/suspend-user' : user.status==='pending' ? 'superadmin/approve-admin' : 'admin/restore-suspended';
        const res = await fetch('http://localhost:3000/api/'+endpoint,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({system_id:id,...(user?.review_confirmed===true?{review_confirmed:true,review_submission:user.review_submission}:{}),...(suspension?{reason:result.value.trim()}:{})})
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
    const staff = systemAccounts.find(account => account.system_id === id);
    if (staff?.status === 'awaiting_activation') return createStaffAccount(staff);
    return staff?.role === 'admin' ? viewAdminAccount(id) : viewDirectoryAccount(id);
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
        const review=pending?await registrationReview(id):{html:'',required:false};
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
        const decision = await Swal.fire({preConfirm:()=>confirmRegistrationReview(review),showCloseButton:true, closeButtonAriaLabel:"Close dialog",titleText:`Admin account ${account.system_id}`,width:760,confirmButtonText:state.detailsAction || state.action || 'Close',
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
                    globalThis.HealthIntelPagination?.showStart(container, container.parentElement);
                });
            },
            html:`<div class="text-left text-sm max-h-[65vh] overflow-y-auto pr-2 text-inherit"><dl class="hi-admin-account-facts grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">${accessField('Name',adminName(account))}${accessField('Email',account.email)}${accessField('Account ID',account.system_id)}${accessField('Employee ID',account.employee_id)}${accessField('Current status',adminState(account.status).label)}${accessField('Registered',adminTime(account.created_at))}</dl>${review.html}<h3 class="font-semibold text-lg mb-2">Account access history</h3><p class="text-neutral-600 dark:text-neutral-400 mb-4">Saved access changes and authentication events explicitly linked to this account. Older activity may not have an account reference.${has_more?' Showing the latest 100 events; older saved events remain in the Activity Log.':''}</p><div data-history-content>${renderPage(1)}</div></div>`});
        if (pending && decision?.isDenied) await toggleAdminStatus(account.system_id, 'denied', {...account, role:'admin',review_submission:review.submission});
        if (canManage && decision?.isConfirmed) await toggleAdminStatus(account.system_id, state.next, {...account,review_confirmed:review.required,review_submission:review.submission});
    } catch (error) {
        await Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog",title:'Account history unavailable',text:error.message || 'Please try again.',icon:'error'});
    }
}
