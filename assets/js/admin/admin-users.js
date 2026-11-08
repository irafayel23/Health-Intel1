// The directory endpoints determine which accounts Admin may see.
async function loadUsers() {
  const lists = [
    ['pending-users', 'pending-table-body', 'pending', 3],
    ['active-users', 'active-users-table-body', 'approved', 4],
    ['denied-users', 'denied-table-body', null, 2]
  ];

  for (const [endpoint, tableId, listStatus, columns] of lists) {
    const table = document.getElementById(tableId);
    try {
      const response = await fetch("http://localhost:3000/api/admin/" + endpoint);
      const { success, data } = await response.json();
      if (!response.ok || !success || !Array.isArray(data)) throw new Error('Directory unavailable');

      table.innerHTML = data.map(user => personnelRow(user, listStatus ?? user.status)).join('')
        || personnelTableMessage(columns, 'No accounts in this list.');
      table.querySelectorAll('.admin-personnel-row').forEach((row, index) => {
        const user = data[index];
        row.addEventListener('click', () => {
          row.querySelector('button').focus({ preventScroll: true });
          return openPersonnelDetails(user, listStatus ?? user.status);
        });
      });
    } catch {
      table.innerHTML = personnelTableMessage(columns, 'Accounts could not be loaded.');
    }
  }
}

function personnelTableMessage(columns, message) {
  return `<tr><td colspan="${columns}" class="text-center py-12">${message}</td></tr>`;
}

function personnelStatus(status) {
  const statuses = {
    pending: ['Pending', 'pending'],
    approved: ['Active', 'active bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'],
    suspended: ['Access suspended', 'suspended'],
    denied: ['Registration denied', 'denied']
  };
  return Object.hasOwn(statuses, status) ? statuses[status] : ['Unknown', ''];
}

function personnelRow(user, status) {
  const [label, badge] = personnelStatus(status);
  const id = escapeText(user.system_id);
  const name = escapeText([user.first_name, user.last_name].filter(Boolean).join(' '));
  const role = escapeText(user.role?.toUpperCase());
  const extraCells = status === 'pending' ? `<td>${escapeText(user.employee_id || 'N/A')}</td>`
    : status === 'approved' ? `<td>${role}</td><td>${escapeText(user.assigned_barangay || 'Municipality')}</td>` : '';
  return `<tr class="admin-personnel-row">
    <td>
      <button type="button" class="admin-personnel-open" aria-label="View profile for ${name || id} (${id})">
        <span class="admin-personnel-name">${name || 'Unnamed account'}</span>
        <span class="admin-personnel-id">${id}</span>
      </button>
    </td>
    ${extraCells}
    <td class="admin-personnel-status">
      <span class="admin-badge-${badge}">${label}</span>
      <span class="admin-personnel-hint" aria-hidden="true">View profile</span>
    </td>
  </tr>`;
}

function formatPersonnelDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(date) + ' PHT'
    : '';
}

async function openPersonnelDetails(user, status) {
  const actions = {
    pending: ['Approve', approveUserDirectly, '#1d4ed8'],
    approved: ['Suspend Access', suspendUser, '#b91c1c'],
    suspended: ['Restore Access', restoreSuspended, '#047857'],
    denied: ['Re-evaluate', undoDeny, '#1d4ed8']
  };
  if (!user.system_id || !Object.hasOwn(actions, status)) return;
  const [actionLabel, action, color] = actions[status];
  const facts = [
    ['Full name', [user.first_name, user.last_name].filter(Boolean).join(' ')],
    ['System ID', user.system_id],
    ['Status', personnelStatus(status)[0]],
    ['Email', user.email],
    ['Employee ID', user.employee_id],
    ['Role', user.role?.toUpperCase()],
    ['Assigned barangay', user.assigned_barangay || (status === 'approved' ? 'Municipality' : '')],
    ['Registered', formatPersonnelDate(user.created_at)],
    ['Suspended on', status === 'suspended' ? formatPersonnelDate(user.suspended_at) || 'Date not recorded' : '']
  ];
  const result = await Swal.fire({
    titleText: `Account ${user.system_id}`,
    html: `<dl class="admin-personnel-facts">${facts.filter(([, value]) => value).map(([label, value]) =>
      `<div><dt>${label}</dt><dd>${escapeText(value)}</dd></div>`).join('')}</dl>`,
    customClass: { popup: 'hi-dialog admin-personnel-dialog' },
    showCloseButton: true,
    showCancelButton: true,
    cancelButtonText: 'Close',
    cancelButtonColor: '#475569',
    showDenyButton: status === 'pending',
    denyButtonText: 'Deny registration',
    denyButtonColor: '#b91c1c',
    confirmButtonText: actionLabel,
    confirmButtonColor: color,
    focusCancel: true
  });

  if (result.isConfirmed) return action(user.system_id);
  if (result.isDenied && status === 'pending') {
    const confirmation = await Swal.fire({
      titleText: 'Deny registration?',
      text: `Deny the account request for ${user.system_id}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deny registration',
      confirmButtonColor: '#b91c1c',
      focusCancel: true
    });
    if (confirmation.isConfirmed) return denyUser(user.system_id);
  }
}

      async function approveUserDirectly(temp_id) {
        Swal.fire({
          title: "Approve Employee?", text: `Are you sure you want to approve ${temp_id}?`, icon: "question",
          showCancelButton: true, confirmButtonColor: "#0ea5e9", confirmButtonText: "Yes, Approve"
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              const res = await fetch("http://localhost:3000/api/admin/approve-user", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ temp_system_id: temp_id }),
              });
              const data = await res.json();
              if (data.success) {
                Swal.fire(data.email_delivery==='sent' ? 'Approved' : 'Approved — check email', data.message, data.email_delivery==='sent' ? 'success' : 'info');
                loadUsers();
              } else {
                Swal.fire("Error", data.error || "Failed to approve account.", "error");
              }
            } catch (error) {
              Swal.fire("Error", "Server connection failed.", "error");
            }
          }
        });
      }

      async function denyUser(id) {
        if (await saveUserAction('deny-user', { temp_system_id: id })) loadUsers();
      }
      
      async function undoDeny(id) {
        if (await saveUserAction('undo-deny', { temp_system_id: id })) loadUsers();
      }

      async function suspendUser(id) {
        Swal.fire({
          title: "Suspend User?", text: "This will revoke their access to the system.", icon: "warning",
          showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Yes, Suspend"
        }).then(async (result) => {
          if(result.isConfirmed) {
            if (!await saveUserAction('suspend-user', { system_id: id })) return;
            loadUsers();
            Swal.fire("Suspended", "User access revoked.", "success");
          }
        });
      }

      async function restoreSuspended(id) {
        Swal.fire({
          title: "Restore Access?", text: "This will restore full system access to the user.", icon: "info",
          showCancelButton: true, confirmButtonColor: "#0ea5e9", confirmButtonText: "Yes, Restore"
        }).then(async (result) => {
          if(result.isConfirmed) {
            if (!await saveUserAction('restore-suspended', { system_id: id })) return;
            loadUsers();
            Swal.fire("Restored", "User access restored.", "success");
          }
        });
      }

      async function saveUserAction(action, payload) {
        try {
          const response = await fetch(`http://localhost:3000/api/admin/${action}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.error || 'Account change could not be saved.');
          return true;
        } catch (error) {
          await Swal.fire('Account not updated', error.message || 'Please try again.', 'error');
          return false;
        }
      }

