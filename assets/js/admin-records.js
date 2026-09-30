      // ==========================================
      // MASTER PATIENT RECORDS
      // ==========================================
      let allPatients = [];
      let allArchivedPatients = [];
      async function fetchPatientRecords() {
        try {
          const res = await fetch("http://localhost:3000/api/patients");
          if ((await res).ok) {
            allPatients = (await res.clone().json()).data;
            filterData();
          }
        } catch (e) {
          console.error("Failed to load patients:", e);
        }
      }

      window.addEventListener('health-intel:case-corrected', () => { fetchPatientRecords(); loadAuditLogs(); });

      function renderPatientTable(data) {
        const tbody = document.getElementById("patient-table-body");
        tbody.innerHTML = "";
        let tbodyHtmlBuffer = "";
        const maxResults = 50;
        const slicedData = data.slice(0, maxResults);
        slicedData.forEach((p) => {
          let diseaseClass = (p.disease || "").toLowerCase().includes("bite") ? "admin-disease-alert" : "";
          let statusText = p.status || "Active";
          let statusClass = statusText.toLowerCase() === "active" ? "admin-status-active" : "admin-status-resolved";

          let dateObj = p.updated_at ? new Date(p.updated_at) : (p.created_at ? new Date(p.created_at) : new Date());
          let timeString = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          let encodedBy = p.encoded_by || "System";

          tbodyHtmlBuffer += `
            <tr id="admin-case-row-${p.id}">
              <td class="font-bold">#REC-${p.id}</td>
              <td><strong>${escapeText(p.patient_name || p.first_name + " " + p.last_name)}</strong></td>
              <td>${p.age || "N/A"}</td>
              <td class="admin-disease-name ${diseaseClass}">${escapeText(p.disease || "Unknown")}</td>
              <td>${escapeText(p.barangay_name || p.purok || "Unknown")}</td>
              <td><span class="admin-case-status ${statusClass}">${escapeText(statusText)}</span></td>
              
              <td class="text-sky-600 dark:text-sky-400 font-bold text-[0.9rem]">${escapeText(encodedBy)}</td>
              <td class="font-medium text-slate-700 dark:text-slate-300 text-[0.85rem]">${timeString}</td>
              
              <td>
                <button onclick="viewAdminCase(${p.id})" class="admin-case-view-button">View case</button>
                <button onclick="archivePatient(${p.id})" class="admin-button-archive-patient">Archive</button>
                <button class="rounded border border-sky-600 px-2 py-1 text-sky-600" onclick="HealthIntelCorrections.open(${p.id})">Correct</button>
              </td>
            </tr>
          `;
        });
        if (tbodyHtmlBuffer === "") {
            tbodyHtmlBuffer = `<tr><td colspan="12" class="text-center py-12 text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No records found in the database.</span>
</div>
</td></tr>`;
        }
        tbody.innerHTML = tbodyHtmlBuffer;
      }

      function filterData() {
        const searchInput = document.getElementById("search-patient").value.toLowerCase();
        const brgyQuery = document.getElementById("filter-table-brgy").value.toLowerCase();
        const diseaseQuery = document.getElementById("filter-table-disease").value.toLowerCase();
        const statusQuery = document.getElementById("filter-table-status").value.toLowerCase();

        const filteredData = allPatients.filter((p) => {
          const matchesSearch = matchesCaseSearch(p, searchInput);
          const matchesBrgy = brgyQuery === "" || (p.barangay_id && p.barangay_id.toString() === brgyQuery);
          const matchesDisease = diseaseQuery === "" || (p.disease || "").toLowerCase().includes(diseaseQuery);
          const matchesStatus = statusQuery === "" || (p.status || "active").toLowerCase() === statusQuery;

          return matchesSearch && matchesBrgy && matchesDisease && matchesStatus;
        });

        renderPatientTable(filteredData);
      }

      async function loadArchivedPatients() {
        try {
          const res = await fetch("http://localhost:3000/api/patients/archived");
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || 'Archived cases could not be loaded.');
          allArchivedPatients = data.data;
          filterArchivedPatients();
        } catch (e) { console.error(e); }
      }

      function matchesCaseSearch(record, query) {
          const value = query.trim().toLowerCase();
          const idMatch = /^(?:#?rec-?|#)?(\d+)$/.exec(value);
          if (idMatch) return Number(idMatch[1]) === Number(record.id);
          return (record.patient_name || `${record.first_name || ''} ${record.last_name || ''}`).toLowerCase().includes(value);
      }

      function filterArchivedPatients() {
          const query = document.getElementById('search-archived-patient').value;
          renderArchivedPatientTable(allArchivedPatients.filter(record=>matchesCaseSearch(record,query)));
      }

      function renderArchivedPatientTable(records) {
          const tbody = document.getElementById("patient-archived-table-body");
          tbody.innerHTML = "";
          let tbodyHtmlBuffer = "";
            const maxArchived = 50;
            const slicedArchived = records.slice(0, maxArchived);
            slicedArchived.forEach((p) => {
              let dateObj = p.updated_at ? new Date(p.updated_at) : (p.created_at ? new Date(p.created_at) : new Date());
              let timeString = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              let encodedBy = p.encoded_by || "System";

              tbodyHtmlBuffer += `
                <tr id="admin-case-row-${p.id}">
                  <td class="font-bold">#REC-${p.id}</td>
                  <td><strong>${escapeText(p.patient_name || p.first_name + " " + p.last_name)}</strong></td>
                  <td>${p.age || "N/A"}</td>
                  <td class="font-bold">${escapeText(p.disease || "Unknown")}</td>
                  <td>${escapeText(p.barangay_name || p.purok || "Unknown")}</td>
                  <td><span class="admin-badge-archived">Archived</span></td>
                  
                  <td class="text-sky-600 dark:text-sky-400 font-bold text-[0.9rem]">${escapeText(encodedBy)}</td>
                  <td class="font-medium text-slate-700 dark:text-slate-300 text-[0.85rem]">${timeString}</td>

                  <td><button onclick="viewAdminCase(${p.id})" class="admin-case-view-button">View case</button><button onclick="restorePatient(${p.id})" class="admin-button-reevaluate">Restore</button></td>
                </tr>
              `;
            });
          if (tbodyHtmlBuffer === "") {
              tbodyHtmlBuffer = `<tr><td colspan="12" class="text-center py-12 text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No records found in the database.</span>
</div>
</td></tr>`;
          }
          tbody.innerHTML = tbodyHtmlBuffer;
      }

      async function viewAdminCase(id, fromAudit = false) {
          if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) return;
          try {
              const response = await fetch(`http://localhost:3000/api/admin/cases/${id}`);
              const result = await response.json();
              if (!response.ok || !result.success) throw new Error(result.error || 'Case could not be loaded.');
              const record = result.case;
              await Promise.all([fetchPatientRecords(), loadArchivedPatients()]);
              // Use the freshly fetched case, even if it is older than the table's
              // first 50 results, or was archived since the audit was loaded.
              allPatients = allPatients.filter(item=>Number(item.id)!==Number(record.id));
              allArchivedPatients = allArchivedPatients.filter(item=>Number(item.id)!==Number(record.id));
              (record.is_archived ? allArchivedPatients : allPatients).unshift(record);
              switchMainView('view-data','nav-data');
              switchSubView('data',record.is_archived ? 'archived' : 'active');
              for (const field of ['filter-table-brgy','filter-table-disease','filter-table-status']) document.getElementById(field).value = '';
              document.getElementById('search-patient').value = record.is_archived ? '' : `REC-${record.id}`;
              document.getElementById('search-archived-patient').value = record.is_archived ? `REC-${record.id}` : '';
              filterData(); filterArchivedPatients();
              const row = document.getElementById(`admin-case-row-${record.id}`);
              row?.classList.add('admin-case-focused');
              row?.scrollIntoView({block:'center',behavior:'smooth'});
              const timestamp = value => new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});
              const fields = [
                  ['Patient',record.patient_name || `${record.first_name || ''} ${record.last_name || ''}`],
                  ['Barangay',record.barangay_name || 'Not recorded'],['Purok / Zone',record.purok || 'Not recorded'],
                  ['Case date',record.date_recorded || 'Not recorded'],['Disease / Case',record.disease || 'Not recorded'],
                  ['Recorded severity',record.severity || 'Not recorded'],['Case status',record.status || 'Not recorded'],
                  ['Record location',record.is_archived ? 'Archived records' : 'Current records'],
                  ['Encoded by',record.encoded_by || 'Not recorded'],['Resident ID',record.resident_id ? `RES-${record.resident_id}` : 'This case is not linked to a resident profile.'],
                  ['Remarks / Follow-up',record.remarks || 'None recorded']
              ];
              const history = result.history.map(log=>`<li><div><strong>${escapeText(log.action)}</strong> · ${escapeText(log.user_id)} (${escapeText(log.role)})</div><small>${escapeText(timestamp(log.created_at))} · Philippine time</small><p>${escapeText(HealthIntelText.auditDetails(log))}</p></li>`).join('');
              const dialog = await Swal.fire({ title:`Case #REC-${record.id}`, width:900, customClass:{popup:'hi-dialog admin-case-dialog'},
                  html:`<div class="admin-case-detail"><dl>${fields.map(([label,value])=>`<div><dt>${escapeText(label)}</dt><dd>${escapeText(value)}</dd></div>`).join('')}</dl><h3>Recorded case history</h3><p class="admin-case-history-note">Only audit entries with an explicit reference to this case are shown. Older activity without a Case ID cannot be linked reliably.</p><ol class="admin-case-history">${history || '<li>No linked audit entries are available for this case.</li>'}</ol></div>`,
                  confirmButtonText:'Close', showDenyButton:fromAudit, denyButtonText:'Back to audit', denyButtonColor:'#475569' });
              if (dialog.isDenied) switchMainView('view-audit','nav-audit');
          } catch (error) { Swal.fire('Case unavailable',error.message || 'Unable to load this case.','error'); }
      }

      async function archivePatient(id) {
        Swal.fire({
          title: "Archive Patient?",
          text: "This record will be moved to the archives.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#ef4444",
          cancelButtonColor: "#94a3b8",
          confirmButtonText: "Yes, archive it!"
        }).then(async (result) => {
          if (result.isConfirmed) {
            await fetch(`http://localhost:3000/api/patients/${id}/archive`, { method: "PUT" });
            fetchPatientRecords();
            loadArchivedPatients();
            Swal.fire({title: "Archived!", text: "Record has been archived.", icon: "success", timer: 1500, showConfirmButton: false});
          }
        });
      }

      async function restorePatient(id) {
        Swal.fire({
          title: "Restore Patient?",
          text: "This record will be moved back to active records.",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#10b981",
          cancelButtonColor: "#94a3b8",
          confirmButtonText: "Yes, restore it!"
        }).then(async (result) => {
          if (result.isConfirmed) {
            await fetch(`http://localhost:3000/api/patients/${id}/restore`, { method: "PUT" });
            fetchPatientRecords();
            loadArchivedPatients();
            Swal.fire({title: "Restored!", text: "Record is active again.", icon: "success", timer: 1500, showConfirmButton: false});
          }
        });
      }

