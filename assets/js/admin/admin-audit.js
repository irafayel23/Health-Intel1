let allAuditLogs = [];
let currentAuditPage = 1;
const AUDIT_PER_PAGE = 8;

async function loadAuditLogs() {
  try {
    const response = await fetch("http://localhost:3000/api/admin/audit-logs");
    const result = await response.json();
    if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error('Audit entries could not be loaded.');
    allAuditLogs = result.data;
    currentAuditPage = 1;
    renderAuditTable();
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    document.getElementById('audit-page-info').textContent = 'Could not refresh audit entries.';
  }
}

function formatAuditTime(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })
    : 'Time not recorded';
}

function renderAuditTable() {
  const start = (currentAuditPage - 1) * AUDIT_PER_PAGE;
  const rows = allAuditLogs.slice(start, start + AUDIT_PER_PAGE);
  const tbody = document.getElementById('audit-table-body');
  tbody.innerHTML = rows.map((log, index) => {
    let badge = 'admin-audit-role-default';
    if (log.role === 'BHW') badge = 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200';
    else if (log.role === 'Admin' || log.role === 'LGU Admin') badge = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200';
    const action = escapeText(log.action || 'Event');
    const reference = Number.isSafeInteger(log.case_id) && log.case_id > 0 ? ' · #REC-' + log.case_id : '';
    return `<tr class="admin-audit-row" onclick="openAdminAuditEvent(${start + index}, this)">
      <td><span class="admin-audit-cell">${escapeText(formatAuditTime(log.created_at))}</span></td>
      <td><span class="admin-audit-cell">${escapeText(log.user_id || 'Not recorded')}</span></td>
      <td><span class="admin-audit-cell"><span class="admin-audit-role ${badge}">${escapeText(log.role || 'Not recorded')}</span></span></td>
      <td><button type="button" class="admin-audit-open admin-audit-cell" aria-label="View details for ${action}${reference}">${action}${reference}</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="4" class="text-center py-12">No audit entries found.</td></tr>';

  const totalPages = Math.ceil(allAuditLogs.length / AUDIT_PER_PAGE);
  const end = start + rows.length;
  document.getElementById('audit-page-info').textContent = rows.length
    ? `Showing ${start + 1}–${end} of ${allAuditLogs.length} entries` : '0 entries';
  const buttons = document.getElementById('audit-page-buttons');
  const first = Math.max(1, Math.min(currentAuditPage - 2, totalPages - 4));
  const button = (page, label, attributes = '') => `<button type="button" onclick="goToAuditPage(${page})" ${attributes}>${label}</button>`;
  let controls = '';
  if (totalPages > 1) {
    controls = button(currentAuditPage - 1, 'Previous', currentAuditPage === 1 ? 'disabled' : '');
    for (let page = first; page <= Math.min(first + 4, totalPages); page++) {
      controls += button(page, page, page === currentAuditPage ? 'aria-current="page"' : `aria-label="Page ${page}"`);
    }
    controls += button(currentAuditPage + 1, 'Next', currentAuditPage === totalPages ? 'disabled' : '');
  }
  buttons.innerHTML = controls;
}

function goToAuditPage(page) {
  if (!Number.isInteger(page) || page < 1 || page > Math.ceil(allAuditLogs.length / AUDIT_PER_PAGE)) return;
  ++adminCaseRequest;
  currentAuditPage = page;
  renderAuditTable();
  document.getElementById('audit-page-buttons').querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
}

function adminAuditFacts(log) {
  const fields = [
    ['Timestamp', formatAuditTime(log.created_at) + ' (Philippine time)'],
    ['User ID', log.user_id],
    ['Role', log.role],
    ['Action executed', log.action],
    ['System details', HealthIntelText.auditDetails(log)]
  ];
  return `<dl>${fields.map(([label, value]) =>
    `<div><dt>${label}</dt><dd>${escapeText(value || 'Not recorded')}</dd></div>`).join('')}</dl>`;
}

function showAdminAuditEvent(log, caseUnavailable = false) {
  return Swal.fire({
    titleText: 'Audit event details',
    html: `<div class="admin-case-detail">${caseUnavailable ? '<p>The linked case could not be opened.</p>' : ''}${adminAuditFacts(log)}</div>`,
    customClass: { popup: 'hi-dialog admin-case-dialog' },
    showCloseButton: true,
    confirmButtonText: 'Close',
    confirmButtonColor: '#475569'
  });
}

function openAdminAuditEvent(index, row) {
  const log = allAuditLogs[index];
  if (!log) return;
  row.querySelector('button')?.focus({ preventScroll: true });
  if (Number.isSafeInteger(log.case_id) && log.case_id > 0) return viewAdminCase(log.case_id, log);
  ++adminCaseRequest;
  return showAdminAuditEvent(log);
}
