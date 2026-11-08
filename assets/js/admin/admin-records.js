      // ==========================================
      // MASTER PATIENT RECORDS
      // ==========================================
let allPatients = [];
let allArchivedPatients = [];
const adminCasePages = { active: 1, archived: 1 };
const ADMIN_CASES_PER_PAGE = 10;
let adminCaseRequest = 0;

async function fetchPatientRecords() {
  try {
    const response = await fetch("http://localhost:3000/api/patients");
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Cases could not be loaded.');
    allPatients = result.data;
    refreshAdminDiseaseFilter();
    filterData(adminCasePages.active);
  } catch (error) { console.error("Failed to load patients:", error); }
}

async function loadArchivedPatients() {
  try {
    const response = await fetch("http://localhost:3000/api/patients/archived");
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Archived cases could not be loaded.');
    allArchivedPatients = result.data;
    refreshAdminDiseaseFilter();
    filterArchivedPatients(adminCasePages.archived);
  } catch (error) { console.error(error); }
}

window.addEventListener('health-intel:case-corrected', () => { fetchPatientRecords(); loadAuditLogs(); });

function matchesCaseSearch(record, query) {
  const value = query.trim().toLowerCase();
  const idMatch = /^(?:#?rec-?|#)?(\d+)$/.exec(value);
  if (idMatch) return Number(idMatch[1]) === Number(record.id);
  return (record.patient_name || `${record.first_name || ''} ${record.last_name || ''}`).toLowerCase().includes(value);
}

function filterData(page = 1) {
  const query = document.getElementById("search-patient").value;
  const barangay = document.getElementById("filter-table-brgy").value;
  const disease = document.getElementById("filter-table-disease").value.toLowerCase();
  const status = document.getElementById("filter-table-status").value.toLowerCase();
  const matches = allPatients.filter(record =>
    matchesCaseSearch(record, query)
    && (!barangay || String(record.barangay_id) === barangay)
    && (!disease || (record.disease || '').toLowerCase().includes(disease))
    && (!status || (record.status || 'active').toLowerCase() === status)
  );
  renderPatientTable(matches, page);
}

function filterArchivedPatients(page = 1) {
  const query = document.getElementById('search-archived-patient').value;
  renderArchivedPatientTable(allArchivedPatients.filter(record => matchesCaseSearch(record, query)), page);
}

function renderPatientTable(records, page = 1) {
  renderAdminCaseTable(records, 'active', page);
}

function renderArchivedPatientTable(records, page = 1) {
  renderAdminCaseTable(records, 'archived', page);
}

function renderAdminCaseTable(records, list, requestedPage) {
  const archived = list === 'archived';
  const tbody = document.getElementById(archived ? 'patient-archived-table-body' : 'patient-table-body');
  const totalPages = Math.max(1, Math.ceil(records.length / ADMIN_CASES_PER_PAGE));
  const page = Math.min(totalPages, Math.max(1, requestedPage));
  adminCasePages[list] = page;
  const start = (page - 1) * ADMIN_CASES_PER_PAGE;
  tbody.innerHTML = records.slice(start, start + ADMIN_CASES_PER_PAGE).map(record => {
    const id = Number(record.id);
    const caseLabel = `#REC-${id}`;
    const canOpen = Number.isSafeInteger(id) && id > 0;
    const patientName = escapeText(record.patient_name || [record.first_name, record.last_name].filter(Boolean).join(' ') || 'Unnamed patient');
    const status = archived ? 'Archived' : record.status || 'Active';
    const identity = `<span class="admin-case-name">${patientName}</span><span class="admin-case-id">${canOpen ? caseLabel : 'Case ID unavailable'}</span>`;
    const diseaseClass = !archived && (record.disease || '').toLowerCase().includes('bite') ? 'admin-disease-alert' : '';
    const date = new Date(record.updated_at || record.created_at || Date.now()).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const opener = `class="admin-case-row" id="admin-case-row-${id}" onclick="viewAdminCase(${id})"`;
    return `<tr ${canOpen ? opener : ''}>
      <td>${canOpen ? `<button type="button" class="admin-case-open" aria-label="Open case ${caseLabel} for ${patientName}">${identity}</button><span class="admin-case-hint" aria-hidden="true">View case details</span>` : identity}</td>
      <td>${escapeText(record.age ?? 'N/A')}</td>
      <td class="admin-disease-name ${diseaseClass}">${HealthIntelEncoding.conditionCell(record)}</td>
      <td>${escapeText(record.barangay_name || record.purok || 'Unknown')}</td>
      <td><span class="admin-case-status" data-status="${escapeText(status.toLowerCase())}">${escapeText(status)}</span></td>
      <td class="admin-case-meta">${escapeText(record.encoded_by || 'System')}</td>
      <td class="admin-case-meta">${date}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" class="text-center py-12">No matching case records.</td></tr>';

  const pager = document.getElementById(`admin-${list}-case-pages`);
  const info = records.length === 1 ? '1 matching case' : records.length ? `Showing ${start + 1}–${Math.min(start + ADMIN_CASES_PER_PAGE, records.length)} of ${records.length} cases` : '0 matching cases';
  const button = (target, label, attributes = '') => `<button type="button" onclick="goToAdminCasePage('${list}', ${target})" ${attributes}>${label}</button>`;
  const first = Math.max(1, Math.min(page - 2, totalPages - 4));
  let controls = '';
  if (totalPages > 1) {
    controls = button(page - 1, 'Previous', page === 1 ? 'disabled' : '');
    for (let number = first; number <= Math.min(first + 4, totalPages); number++) {
      controls += button(number, number, number === page ? 'aria-current="page"' : `aria-label="Page ${number}"`);
    }
    controls += button(page + 1, 'Next', page === totalPages ? 'disabled' : '');
  }
  pager.innerHTML = `<span role="status">${info}</span><div class="admin-case-page-buttons">${controls}</div>`;
}

function goToAdminCasePage(list, page) {
  if (list === 'archived') filterArchivedPatients(page);
  else filterData(page);
  document.getElementById(`admin-${list}-case-pages`).querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
}

      async function viewAdminCase(id, auditEvent = null) {
          id = Number(id);
          if (!Number.isSafeInteger(id) || id < 1) return;
          const request = ++adminCaseRequest;
          if (!auditEvent) document.getElementById(`admin-case-row-${id}`)?.querySelector('button')?.focus({ preventScroll: true });
          try {
              const response = await fetch(`http://localhost:3000/api/admin/cases/${id}`);
              const result = await response.json();
              if (!response.ok || !result.success) throw new Error(result.error || 'Case could not be loaded.');
              if (request !== adminCaseRequest) return;
              const record = result.case;
              const archived = Boolean(record.is_archived);
              const timestamp = value => new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});
              const fields = [
                  ['Patient',record.patient_name || `${record.first_name || ''} ${record.last_name || ''}`],
                  ['Barangay',record.barangay_name || 'Not recorded'],['Purok / Zone',record.purok || 'Not recorded'],
                  ['Case date',record.date_recorded || 'Not recorded'],['Disease / Case',HealthIntelEncoding.conditionLabel(record)],['Classification review',record.disease_review_status || 'Recorded'],['Reported condition',record.disease_reported || 'Not applicable'],['Condition source',record.condition_source || 'Not recorded'],['Review note',record.disease_review_note || 'None'],
                  ['Recorded severity',record.severity || 'Not recorded'],['Case status',record.status || 'Not recorded'],
                  ['Record location',archived ? 'Archived records' : 'Current records'],
                  ['Encoded by',record.encoded_by || 'Not recorded'],['Resident ID',record.resident_id ? `RES-${record.resident_id}` : 'This case is not linked to a resident profile.'],
                  ['Remarks / Follow-up',record.remarks || 'None recorded']
              ];
              const history = result.history.map(log=>`<li><div><strong>${escapeText(log.action)}</strong> · ${escapeText(log.user_id)} (${escapeText(log.role)})</div><small>${escapeText(timestamp(log.created_at))} · Philippine time</small><p>${escapeText(HealthIntelText.auditDetails(log))}</p></li>`).join('');
              const dialog = await Swal.fire({ title:`Case #REC-${id}`, customClass:{popup:'hi-dialog admin-case-dialog'},
                  html:`<div class="admin-case-detail">${auditEvent ? adminAuditFacts(auditEvent) : ''}<dl>${fields.map(([label,value])=>`<div><dt>${escapeText(label)}</dt><dd>${escapeText(value)}</dd></div>`).join('')}</dl><h3>Recorded case history</h3><p class="admin-case-history-note">Only audit entries with an explicit reference to this case are shown. Older activity without a Case ID cannot be linked reliably.</p><ol class="admin-case-history">${history || '<li>No linked audit entries are available for this case.</li>'}</ol></div>`,
                  showCloseButton: true,
                  showCancelButton: !auditEvent,
                  cancelButtonText: 'Close',
                  cancelButtonColor: '#475569',
                  focusCancel: !auditEvent,
                  confirmButtonText: auditEvent ? 'Close' : archived ? 'Restore' : 'Correct',
                  confirmButtonColor: auditEvent ? '#475569' : archived ? '#047857' : '#1e40af',
                  showDenyButton: !auditEvent && !archived,
                  denyButtonText: 'Archive',
                  denyButtonColor: '#b91c1c',
                  didRender: popup => {
                      if (!auditEvent && !archived) {
                          popup.querySelector('.swal2-confirm').before(popup.querySelector('.swal2-deny'));
                      }
                  }
              });
              if (auditEvent) return;
              if (dialog.isConfirmed) {
                  if (archived) await restorePatient(id);
                  else await HealthIntelCorrections.open(id);
              } else if (dialog.isDenied && !archived) {
                  await archivePatient(id);
              }
          } catch (error) {
              if (request !== adminCaseRequest) return;
              if (auditEvent) return showAdminAuditEvent(auditEvent, true);
              Swal.fire('Case unavailable', error.message || 'Unable to load this case.', 'error');
          }
      }

      async function archivePatient(id) {
        const result = await Swal.fire({
          title: "Archive Patient?",
          text: "This record will be moved to the archives.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#b91c1c",
          cancelButtonColor: "#475569",
          confirmButtonText: "Yes, archive it!",
          showLoaderOnConfirm: true,
          allowOutsideClick: () => !Swal.isLoading(),
          preConfirm: () => saveArchiveAction(id, 'archive')
        });
          if (result.isConfirmed) {
            fetchPatientRecords();
            loadArchivedPatients();
            Swal.fire({title: "Archived!", text: "Record has been archived.", icon: "success", timer: 1500, showConfirmButton: false});
          }
      }

      async function restorePatient(id) {
        const result = await Swal.fire({
          title: "Restore Patient?",
          text: "This record will be moved back to active records.",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#047857",
          cancelButtonColor: "#475569",
          confirmButtonText: "Yes, restore it!",
          showLoaderOnConfirm: true,
          allowOutsideClick: () => !Swal.isLoading(),
          preConfirm: () => saveArchiveAction(id, 'restore')
        });
          if (result.isConfirmed) {
            fetchPatientRecords();
            loadArchivedPatients();
            Swal.fire({title: "Restored!", text: "Record is active again.", icon: "success", timer: 1500, showConfirmButton: false});
          }
      }

      async function saveArchiveAction(id, action) {
        try {
          const response = await fetch(`http://localhost:3000/api/patients/${id}/${action}`, { method: 'PUT' });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.error || 'The record could not be updated.');
          return data;
        } catch (error) {
          Swal.showValidationMessage(error.message || 'The record could not be updated. Try again.');
          return false;
        }
      }


function refreshAdminDiseaseFilter() {
    const filter=document.getElementById('filter-table-disease');if(!filter?.replaceChildren)return;
    const current=filter.value,names=new Set();
    for(const item of window.adminRegistryChoices || [])names.add(item.name);
    filter.replaceChildren(new Option('All diseases',''));
    for(const name of [...names].sort())filter.add(new Option(name,name));
    if(names.has(current))filter.value=current;
}
