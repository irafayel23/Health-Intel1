// The directory endpoints determine which accounts Admin may see.
const ADMIN_PERSONNEL_PER_PAGE = 10;
const adminPersonnelLists = [
  ['pending-users', 'pending-table-body', 'pending', 3],
  ['active-users', 'active-users-table-body', 'approved', 4],
  ['denied-users', 'denied-table-body', null, 2]
];
const adminPersonnelState = Object.fromEntries(adminPersonnelLists.map(([, id]) => [id, { data: [], page: 1, error: false }]));

async function loadUsers() {
  for (const [endpoint, tableId] of adminPersonnelLists) {
    const state = adminPersonnelState[tableId];
    try {
      const response = await fetch('http://localhost:3000/api/admin/' + endpoint);
      const { success, data } = await response.json();
      if (!response.ok || !success || !Array.isArray(data)) throw new Error('Directory unavailable');
      state.data = data;
      state.error = false;
    } catch {
      state.data = [];
      state.error = true;
    }
    renderAdminPersonnelList(tableId);
  }
}

function renderAdminPersonnelList(tableId, requestedPage = adminPersonnelState[tableId]?.page) {
  const config = adminPersonnelLists.find(([, id]) => id === tableId);
  if (!config) return;
  const [, , listStatus, columns] = config;
  const state = adminPersonnelState[tableId];
  const pages = Math.max(1, Math.ceil(state.data.length / ADMIN_PERSONNEL_PER_PAGE));
  state.page = Math.min(pages, Math.max(1, Number.isInteger(requestedPage) ? requestedPage : 1));
  const start = (state.page - 1) * ADMIN_PERSONNEL_PER_PAGE;
  const visible = state.data.slice(start, start + ADMIN_PERSONNEL_PER_PAGE);
  const table = document.getElementById(tableId);
  table.innerHTML = visible.map(user => personnelRow(user, listStatus ?? user.status)).join('')
    || personnelTableMessage(columns, state.error ? 'Accounts could not be loaded.' : 'No accounts in this list.');
  table.querySelectorAll('.admin-personnel-row').forEach((row, index) => {
    const user = visible[index];
    row.addEventListener('click', () => {
      row.querySelector('button').focus({ preventScroll: true });
      return openPersonnelDetails(user, listStatus ?? user.status);
    });
  });
  const pager = document.getElementById(tableId + '-pagination');
  if (!pager) return;
  if (state.error) { pager.innerHTML = ''; return; }
  const info = state.data.length ? 'Page ' + state.page + ' of ' + pages + ' · Showing ' + (start + 1) + '–' + Math.min(start + ADMIN_PERSONNEL_PER_PAGE, state.data.length) + ' of ' + state.data.length + ' accounts' : '0 accounts';
  const button = (target, label, attrs = '') => '<button type="button" onclick="goToAdminPersonnelPage(&quot;' + tableId + '&quot;, ' + target + ')" ' + attrs + '>' + label + '</button>';
  let controls = '';
  if (state.data.length) {
    controls = button(state.page - 1, 'Previous', state.page === 1 ? 'disabled' : '');
    const first = Math.max(1, Math.min(state.page - 2, pages - 4));
    for (let number = first; number <= Math.min(first + 4, pages); number++) {
      controls += button(number, number, number === state.page ? 'aria-current="page"' : 'aria-label="Page ' + number + '"');
    }
    controls += button(state.page + 1, 'Next', state.page === pages ? 'disabled' : '');
  }
  pager.innerHTML = '<span role="status" aria-live="polite" aria-atomic="true">' + info + '</span><div class="admin-case-page-buttons">' + controls + '</div>';
}

function goToAdminPersonnelPage(tableId, page) {
  if (!Object.hasOwn(adminPersonnelState, tableId)) return;
  renderAdminPersonnelList(tableId, page);
  globalThis.HealthIntelPagination?.showStart(tableId);
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
        <span class="admin-personnel-id">${id}</span>${status==='pending'?registrationSubmissionBadge(user):''}
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
  const review=status==='pending'?await registrationReview(user.system_id):{html:'',required:false};
  const result = await Swal.fire({
    preConfirm:()=>confirmRegistrationReview(review),
    titleText: `Account ${user.system_id}`,
    html: `<dl class="admin-personnel-facts">${facts.filter(([, value]) => value).map(([label, value]) =>
      `<div><dt>${label}</dt><dd>${escapeText(value)}</dd></div>`).join('')}</dl>${review.html}`,
    customClass: { popup: 'hi-dialog admin-personnel-dialog' },
    showCloseButton: true,
    closeButtonAriaLabel: 'Close account details',
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

  if (result.isConfirmed) return action(user.system_id, review.required, review.submission);
  if (result.isDenied && status === 'pending') {
    return denyUser(user.system_id, review.submission);
  }
}

      async function approveUserDirectly(temp_id, reviewConfirmed=false, reviewSubmission) {
        Swal.fire({
          title: "Approve Employee?", text: `Are you sure you want to approve ${temp_id}?`, icon: "question",
          showCancelButton: true, confirmButtonColor: "#0ea5e9", confirmButtonText: "Yes, Approve"
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              const res = await fetch("http://localhost:3000/api/admin/approve-user", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ temp_system_id: temp_id, review_confirmed:reviewConfirmed, review_submission:reviewSubmission }),
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

      async function denyUser(id, reviewSubmission) {
        const decision=await registrationDenial(id,reviewSubmission);
        if(decision.isConfirmed){await loadUsers();registrationDecisionNotice(decision.value);}
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
          if(action==='deny-user')await Swal.fire({icon:data.email_delivery==='sent'?'success':'warning',title:data.email_delivery==='sent'?'Registration declined':'Declined — email not sent',text:data.message,confirmButtonColor:'#007f84'});
          return true;
        } catch (error) {
          await Swal.fire('Account not updated', error.message || 'Please try again.', 'error');
          return false;
        }
      }
