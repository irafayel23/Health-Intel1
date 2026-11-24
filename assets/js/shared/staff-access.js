(() => {
    const base = 'http://localhost:3000/api/';
    const field = 'mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 bg-transparent';
    const escape = value => HealthIntelText.escape(String(value ?? ''));
    const checked = '<label class="flex gap-2 items-start"><input type="checkbox" name="identity_checked" required> I verified the employee in person.</label>';

    async function request(path, body) {
        const response = await fetch(base + path, {
            ...(body ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)} : {}),
            signal: AbortSignal.timeout(body ? 30000 : 10000)
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw Error(result.error || 'Please try again.');
        return result;
    }

    const roster = () => request('superadmin/staff-roster').then(result => result.data);
    const barangays = () => request('superadmin/staff-barangays').then(result => result.data);
    const option = (value, label) => '<option value="' + escape(value) + '">' + escape(label) + '</option>';
    const name = employee => [employee.first_name, employee.last_name, employee.employee_id].join(' · ');

    async function formDialog(title, confirmButtonText, setup, save) {
        let ready = false;
        const result = await Swal.fire({
            title, confirmButtonText, showCancelButton:true, cancelButtonText:'Close',
            confirmButtonColor:'#047857', showLoaderOnConfirm:true,
            allowOutsideClick: () => !Swal.isLoading(),
            html:'<form class="grid gap-3 text-left text-sm"><p role="status">Loading…</p></form>',
            didOpen: async popup => {
                const form = popup.querySelector('form');
                form.addEventListener('submit', event => { event.preventDefault(); Swal.clickConfirm(); });
                Swal.disableConfirmButton();
                try {
                    await setup(form);
                    if (!form.isConnected) return;
                    ready = true;
                    Swal.enableConfirmButton();
                } catch (error) {
                    if (form.isConnected) form.querySelector('[role="status"]').textContent = error.message;
                }
            },
            preConfirm: async () => {
                const form = Swal.getHtmlContainer().querySelector('form');
                if (!ready || !form.reportValidity()) return false;
                const data = Object.fromEntries(new FormData(form));
                for (const box of form.querySelectorAll('input[type="checkbox"]')) data[box.name] = box.checked;
                try {
                    return await save(data);
                } catch (error) {
                    Swal.showValidationMessage(error.message);
                    return false;
                }
            }
        });
        return result.isConfirmed ? result.value : null;
    }

    const showDone = (title, text) => Swal.fire({icon:'success', title, text, confirmButtonColor:'#047857'});

    async function addRosterEntry() {
        const result = await formDialog('Add roster entry', 'Save employee', async form => {
            const options = await barangays();
            form.innerHTML = `
                <p>Check the employee’s ID and assignment against the HRIS roster.</p>
                <div class="grid gap-3 sm:grid-cols-2">
                  <label>First name<input class="${field}" name="first_name" maxlength="100" required></label>
                  <label>Last name<input class="${field}" name="last_name" maxlength="100" required></label>
                  <label>Employee ID<input class="${field}" name="employee_id" maxlength="50" required></label>
                  <label>Role<select class="${field}" name="role" required><option value="">Choose role</option><option value="bhw">BHW</option><option value="mho">MHO</option><option value="admin">Admin</option></select></label>
                </div>
                <label hidden>Assigned barangay<select class="${field}" name="barangay_id" disabled><option value="">Choose barangay</option>${options.map(row => option(row.id,row.name)).join('')}</select></label>
                <label>Verified Gmail (optional)<input class="${field}" type="email" name="email" maxlength="255" autocomplete="off"></label>
                ${checked}`;
            form.elements.role.addEventListener('change', () => {
                const isBhw = form.elements.role.value === 'bhw';
                const assignment = form.elements.barangay_id;
                assignment.parentElement.hidden = assignment.disabled = !isBhw;
                assignment.required = isBhw;
                form.elements.email.parentElement.hidden = form.elements.email.disabled = form.elements.role.value === 'admin';
            });
        }, data => request('superadmin/staff-roster', data));
        if (result) await showDone('Employee saved', 'You can now select this employee when creating a staff account.');
    }

    async function reviewAdminAccess(superadmin = false) {
        let rows;
        const selected = await formDialog('Admin access reviews', 'Continue', async form => {
            rows = await request('staff-admin-reviews').then(result => result.data);
            if (!rows.length && !superadmin) throw Error('There are no requests awaiting review.');
            form.innerHTML = `
              <label>Action<select class="${field}" name="action">${rows.length ? '<option value="review">Approve a request</option>' : ''}${superadmin ? '<option value="request">Request Admin review</option>' : ''}</select></label>`;
        }, async data => data);
        if (!selected) return;
        const reviewing = selected.action === 'review';
        const result = await formDialog(reviewing ? 'Approve Admin access' : 'Request Admin review',
            reviewing ? 'Approve access' : 'Send for review', async form => {
                const choices = reviewing ? rows : (await roster()).filter(row => row.role === 'admin' && !row.admin_review);
                if (!choices.length) throw Error('Add an Admin to the verified staff roster first.');
                form.innerHTML = `
                    <label>Employee<select class="${field}" name="employee_id" required><option value="">Choose employee</option>${choices.map(row =>
                        option(row.employee_id, reviewing ? name(row) + ' · requested by ' + row.requester : name(row))).join('')}</select></label>
                    ${reviewing ? checked : '<p>A different active reviewer normally approves Admin access.</p>'}
                    ${reviewing && superadmin ? '<label class="flex gap-2 items-start"><input type="checkbox" name="bootstrap"> Use the one-time first Admin exception</label>' : ''}`;
            }, data => request(reviewing ? 'staff-admin-reviews' : 'superadmin/staff-admin-reviews', data));
        if (result) await showDone(reviewing ? 'Admin access reviewed' : 'Review requested',
            reviewing ? 'Superadmin can now issue this account in person.' : 'The request is in the Admin access review queue.');
    }

    async function resetStaffAccess(account) {
        const result = await formDialog('Reset staff password', 'Generate reset code', async form => {
            form.innerHTML = '<p>Reset the password for <strong>' + escape(account.system_id) +
                '</strong>. This ends active sessions and removes access with the old password immediately.</p>' + checked;
        }, data => request('superadmin/staff-reset', {...data, system_id:account.system_id}));
        if (!result) return;
        const {system_id, code, expires_at} = result.data;
        await Swal.fire({
            icon:'success', title:'Reset code ready', confirmButtonText:'Done',
            html:'<p>Hand this code to the employee in person. They select <strong>Use HRIS reset code</strong> on the sign-in page.</p>' +
                '<p class="mt-3"><strong>' + escape(system_id) + '</strong><br><code class="break-all">' + escape(code) +
                '</code></p><p>Expires ' + escape(new Date(expires_at).toLocaleTimeString('en-PH', {timeZone:'Asia/Manila'})) + ' PHT</p>',
            didOpen: () => pulseAccountLists()
        });
    }

    async function transferStaffBarangay(account) {
        const result = await formDialog('Change barangay', 'Save assignment', async form => {
            const options = (await barangays()).filter(row => row.name !== account.assigned_barangay);
            form.innerHTML = `<p>The employee keeps the same System ID. Existing sessions end when the assignment changes.</p>
                <label>New barangay<select name="barangay_id" class="${field}" required><option value="">Choose barangay</option>${options.map(row => option(row.id,row.name)).join('')}</select></label>
                <label>Reason<textarea class="${field}" name="reason" maxlength="300" required></textarea></label>${checked}`;
        }, data => request('superadmin/staff-transfer', {...data, system_id:account.system_id}));
        if (result) {
            pulseAccountLists();
            await showDone('Barangay updated', 'The change was recorded in the Activity Log.');
        }
    }

    function pulseAccountLists() {
        void window.loadAdmins?.();
        void window.loadAuditLogs?.();
    }

    window.HealthIntelStaffAccess = {request, roster, addRosterEntry, reviewAdminAccess, resetStaffAccess, transferStaffBarangay};
})();
