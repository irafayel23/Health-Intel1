
      function escapeText(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

      lucide.createIcons();
      function toggleAdminTheme() {
          const html = document.documentElement;
          html.classList.toggle("dark");
          const isDark = html.classList.contains("dark");
          const btn = document.getElementById("theme-toggle-btn");
          if(btn) btn.innerHTML = isDark ? `<i data-lucide="sun" class="w-4 h-4"></i>` : `<i data-lucide="moon" class="w-4 h-4"></i>`;
          lucide.createIcons();
      }

      window.addEventListener('DOMContentLoaded', () => {
        loadUsers();
        fetchPatientRecords();
        loadArchivedPatients();
        loadDiseases();
        loadAuditLogs(); // Automatically load the audit trail on start
      });

      function switchMainView(viewId, btnId) {
        document.querySelectorAll(".nav-item").forEach((btn) => btn.classList.remove("active"));
        document.getElementById(btnId).classList.add("active");

        document.querySelectorAll(".view-section").forEach((view) => view.classList.remove("active"));
        document.getElementById(viewId).classList.add("active");

        // Refresh logs if the audit tab is clicked
        if(viewId === 'view-audit') {
          loadAuditLogs();
        }
      }

      function switchSubView(module, type) {
        document.getElementById(`btn-${module}-active`)?.classList.remove("active");
        document.getElementById(`btn-${module}-archived`)?.classList.remove("active");
        document.getElementById(`btn-${module}-pending`)?.classList.remove("active");
        
        document.getElementById(`${module}-active-view`) && (document.getElementById(`${module}-active-view`).style.display = "none");
        document.getElementById(`${module}-archived-view`) && (document.getElementById(`${module}-archived-view`).style.display = "none");
        document.getElementById(`${module}-pending-view`) && (document.getElementById(`${module}-pending-view`).style.display = "none");

        document.getElementById(`btn-${module}-${type}`).classList.add("active");
        document.getElementById(`${module}-${type}-view`).style.display = "block";
      }

      function closeModal(modalId) {
        document.getElementById(modalId).classList.add("hidden");
      }

      // ==========================================
      // IAM USER MANAGEMENT 
      // ==========================================
      async function loadUsers() {
        try {
          // Fetch Pending Users
          const pRes = await fetch("http://localhost:3000/api/admin/pending-users");
          const pData = await pRes.json();
          const pTable = document.getElementById("pending-table-body");
          pTable.innerHTML = "";
          let pTableHtmlBuffer = "";
          if (pData.success) {
            pData.data.forEach((u) => {
              pTableHtmlBuffer += `
                <tr>
                  <td><strong>${escapeText(u.system_id)}</strong></td>
                  <td>${escapeText(u.first_name)} ${escapeText(u.last_name)}</td>
                  <td>${escapeText(u.employee_id || 'N/A')}</td>
                  <td><span class="admin-badge-pending">PENDING</span></td>
                  <td>
                    <button onclick="approveUserDirectly(${escapeText(JSON.stringify(u.system_id))})" class="admin-button-approve">Approve</button>
                    <button onclick="denyUser(${escapeText(JSON.stringify(u.system_id))})" class="admin-button-deny">Deny</button>
                  </td>
                </tr>
              `;
            });
          if (pTableHtmlBuffer === "") {
              pTableHtmlBuffer = `<tr><td colspan="12" class="text-center py-12 text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No records found in the database.</span>
</div>
</td></tr>`;
          }
          pTable.innerHTML = pTableHtmlBuffer;
          }

          // Fetch Active Personnel
          const aRes = await fetch("http://localhost:3000/api/admin/active-users");
          const aData = await aRes.json();
          const aTable = document.getElementById("active-users-table-body");
          aTable.innerHTML = "";
          let aTableHtmlBuffer = "";
          if (aData.success) {
            aData.data.forEach((u) => {
              aTableHtmlBuffer += `
                <tr>
                  <td><strong>${escapeText(u.system_id)}</strong></td>
                  <td>${escapeText(u.first_name)} ${escapeText(u.last_name)}</td>
                  <td class="admin-uppercase-role">${u.role}</td>
                  <td>${u.assigned_barangay || 'Municipality'}</td>
                  <td><span class="admin-badge-active">ACTIVE</span></td>
                  <td>
                    <button onclick="suspendUser(${escapeText(JSON.stringify(u.system_id))})" class="admin-button-suspend">Suspend Access</button>
                  </td>
                </tr>
              `;
            });
          if (aTableHtmlBuffer === "") {
              aTableHtmlBuffer = `<tr><td colspan="12" class="text-center py-12 text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No records found in the database.</span>
</div>
</td></tr>`;
          }
          aTable.innerHTML = aTableHtmlBuffer;
          }

          // Fetch Archived Users
          const dRes = await fetch("http://localhost:3000/api/admin/denied-users");
          const dData = await dRes.json();
          const dTable = document.getElementById("denied-table-body");
          dTable.innerHTML = "";
          let dTableHtmlBuffer = "";
          if (dData.success) {
            dData.data.forEach((u) => {
              let badgeHTML = "";
              let btnHTML = "";
              
              if (u.status === 'suspended') {
                badgeHTML = `<span class="admin-badge-suspended">ACCESS SUSPENDED</span>`;
                btnHTML = `<button onclick="restoreSuspended(${escapeText(JSON.stringify(u.system_id))})" class="admin-button-restore-access">Restore Access</button>`;
              } else {
                badgeHTML = `<span class="admin-badge-denied">DENIED REGISTRATION</span>`;
                btnHTML = `<button onclick="undoDeny(${escapeText(JSON.stringify(u.system_id))})" class="admin-button-reevaluate">Re-evaluate</button>`;
              }

              dTableHtmlBuffer += `
                <tr>
                  <td class="font-medium text-slate-700 dark:text-slate-300">${escapeText(u.system_id)}</td>
                  <td class="font-medium text-slate-700 dark:text-slate-300">${escapeText(u.first_name)} ${escapeText(u.last_name)}</td>
                  <td>${badgeHTML}</td>
                  <td>${btnHTML}</td>
                </tr>
              `;
            });
          if (dTableHtmlBuffer === "") {
              dTableHtmlBuffer = `<tr><td colspan="12" class="text-center py-12 text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No records found in the database.</span>
</div>
</td></tr>`;
          }
          dTable.innerHTML = dTableHtmlBuffer;
          }
        } catch (e) {
          console.error("Error loading users:", e);
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
        await fetch("http://localhost:3000/api/admin/deny-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ temp_system_id: id }) });
        loadUsers();
      }
      
      async function undoDeny(id) {
        await fetch("http://localhost:3000/api/admin/undo-deny", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ temp_system_id: id }) });
        loadUsers();
      }

      async function suspendUser(id) {
        Swal.fire({
          title: "Suspend User?", text: "This will revoke their access to the system.", icon: "warning",
          showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Yes, Suspend"
        }).then(async (result) => {
          if(result.isConfirmed) {
            await fetch("http://localhost:3000/api/admin/suspend-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_id: id }) });
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
            await fetch("http://localhost:3000/api/admin/restore-suspended", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_id: id }) });
            loadUsers();
            Swal.fire("Restored", "User access restored.", "success");
          }
        });
      }

      // ==========================================
      // MASTER PATIENT RECORDS
      // ==========================================
      let allPatients = [];
      async function fetchPatientRecords() {
        try {
          const res = await fetch("http://localhost:3000/api/patients");
          if ((await res).ok) {
            allPatients = (await res.clone().json()).data;
            renderPatientTable(allPatients);
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
            <tr>
              <td class="font-bold">#REC-${p.id}</td>
              <td><strong>${escapeText(p.patient_name || p.first_name + " " + p.last_name)}</strong></td>
              <td>${p.age || "N/A"}</td>
              <td class="admin-disease-name ${diseaseClass}">${escapeText(p.disease || "Unknown")}</td>
              <td>${escapeText(p.barangay_name || p.purok || "Unknown")}</td>
              <td><span class="admin-case-status ${statusClass}">${escapeText(statusText)}</span></td>
              
              <td class="text-sky-600 dark:text-sky-400 font-bold text-[0.9rem]">${escapeText(encodedBy)}</td>
              <td class="font-medium text-slate-700 dark:text-slate-300 text-[0.85rem]">${timeString}</td>
              
              <td>
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
          const fullName = (p.patient_name || p.first_name + " " + p.last_name || "").toLowerCase();
          const sysId = `#rec-${p.id}`.toLowerCase();

          const matchesSearch = fullName.includes(searchInput) || sysId.includes(searchInput) || searchInput.replace("#", "") === p.id.toString();
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
          const tbody = document.getElementById("patient-archived-table-body");
          tbody.innerHTML = "";
          let tbodyHtmlBuffer = "";
          if (data.success) {
            const maxArchived = 50;
            const slicedArchived = data.data.slice(0, maxArchived);
            slicedArchived.forEach((p) => {
              let dateObj = p.updated_at ? new Date(p.updated_at) : (p.created_at ? new Date(p.created_at) : new Date());
              let timeString = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              let encodedBy = p.encoded_by || "System";

              tbodyHtmlBuffer += `
                <tr>
                  <td class="font-bold">#REC-${p.id}</td>
                  <td><strong>${escapeText(p.patient_name || p.first_name + " " + p.last_name)}</strong></td>
                  <td>${p.age || "N/A"}</td>
                  <td class="font-bold">${escapeText(p.disease || "Unknown")}</td>
                  <td>${escapeText(p.barangay_name || p.purok || "Unknown")}</td>
                  <td><span class="admin-badge-archived">Archived</span></td>
                  
                  <td class="text-sky-600 dark:text-sky-400 font-bold text-[0.9rem]">${escapeText(encodedBy)}</td>
                  <td class="font-medium text-slate-700 dark:text-slate-300 text-[0.85rem]">${timeString}</td>

                  <td><button onclick="restorePatient(${p.id})" class="admin-button-reevaluate">Restore</button></td>
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
        } catch (e) { console.error(e); }
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

      // ==========================================
      // DISEASE REGISTRY
      // ==========================================
      async function loadDiseases() {
        try {
          const actRes = await fetch("http://localhost:3000/api/diseases");
          const actData = await actRes.json();
          const actBody = document.getElementById("disease-table-body");
          actBody.innerHTML = "";
          let actBodyHtmlBuffer = "";
          if (actData.success) {
            actData.data.forEach((d) => {
              let classificationClass = d.classification === "High Risk" ? "admin-classification-high" : "admin-classification-standard";
              actBodyHtmlBuffer += `
                <tr>
                  <td class="font-bold text-slate-900 dark:text-slate-100">${escapeText(d.name)}</td>
                  <td class="font-medium text-slate-700 dark:text-slate-300">${escapeText(d.category)}</td>
                  <td><span class="admin-classification ${classificationClass}">${escapeText(d.classification)}</span></td>
                  <td class="text-emerald-500 dark:text-emerald-400 font-bold">Active</td>
                  <td><button onclick="archiveDisease(${d.id})" class="admin-button-archive-disease">Archive</button></td>
                </tr>
              `;
            });
          if (actBodyHtmlBuffer === "") {
              actBodyHtmlBuffer = `<tr><td colspan="12" class="text-center py-12 text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No records found in the database.</span>
</div>
</td></tr>`;
          }
          actBody.innerHTML = actBodyHtmlBuffer;
          }

          const arcRes = await fetch("http://localhost:3000/api/diseases/archived");
          const arcData = await arcRes.json();
          const arcBody = document.getElementById("disease-archived-table-body");
          arcBody.innerHTML = "";
          let arcBodyHtmlBuffer = "";
          if (arcData.success) {
            arcData.data.forEach((d) => {
              arcBodyHtmlBuffer += `
                <tr>
                  <td class="font-medium text-slate-700 dark:text-slate-300">${escapeText(d.name)}</td>
                  <td class="font-medium text-slate-700 dark:text-slate-300">${escapeText(d.category)}</td>
                  <td class="font-medium text-slate-700 dark:text-slate-300">${escapeText(d.classification)}</td>
                  <td><span class="admin-badge-archived">Archived</span></td>
                  <td><button onclick="restoreDisease(${d.id})" class="admin-button-reevaluate">Restore</button></td>
                </tr>
              `;
            });
          if (arcBodyHtmlBuffer === "") {
              arcBodyHtmlBuffer = `<tr><td colspan="12" class="text-center py-12 text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No records found in the database.</span>
</div>
</td></tr>`;
          }
          arcBody.innerHTML = arcBodyHtmlBuffer;
          }
        } catch (e) {}
      }

      function openDiseaseModal() {
        document.getElementById("new_disease_name").value = "";
        document.getElementById("diseaseModal").classList.remove("hidden");
      }

      async function saveNewDisease() {
        const payload = {
          name: document.getElementById("new_disease_name").value,
          category: document.getElementById("new_disease_cat").value,
          classification: document.getElementById("new_disease_class").value,
        };
        if (!payload.name) return;

        try {
        await fetch("http://localhost:3000/api/diseases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        closeModal("diseaseModal");
        Swal.fire({ icon: "success", title: "Saved to Database", showConfirmButton: false, timer: 1500 });
        loadDiseases();
        } catch(error) { Swal.fire({icon:'error',title:'Disease not saved',text:error.message || 'Please check the form and try again.'}); }

      }

      async function archiveDisease(id) {
        Swal.fire({
          title: "Archive Disease?",
          text: "It will be moved to the disease archives.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#ef4444",
          cancelButtonColor: "#94a3b8",
          confirmButtonText: "Yes, archive it!"
        }).then(async (result) => {
          if (result.isConfirmed) {
            await fetch(`http://localhost:3000/api/diseases/${id}/archive`, { method: "PUT" });
            loadDiseases();
            Swal.fire({title: "Archived!", text: "Disease has been archived.", icon: "success", timer: 1500, showConfirmButton: false});
          }
        });
      }
      
      async function restoreDisease(id) {
        Swal.fire({
          title: "Restore Disease?",
          text: "It will be available for BHWs again.",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#10b981",
          cancelButtonColor: "#94a3b8",
          confirmButtonText: "Yes, restore it!"
        }).then(async (result) => {
          if (result.isConfirmed) {
            await fetch(`http://localhost:3000/api/diseases/${id}/restore`, { method: "PUT" });
            loadDiseases();
            Swal.fire({title: "Restored!", text: "Disease is active again.", icon: "success", timer: 1500, showConfirmButton: false});
          }
        });
      }

      // ==========================================
      // SECURITY AUDIT TRAIL LOGIC
      // ==========================================
      let allAuditLogs = [];
      let currentAuditPage = 1;
      const AUDIT_PER_PAGE = 8;

      async function loadAuditLogs() {
        try {
          const res = await fetch("http://localhost:3000/api/admin/audit-logs");
          const result = await res.json();
          if (result.success) {
            allAuditLogs = result.data;
            currentAuditPage = 1;
            renderAuditTable();
          }
        } catch (e) {
          console.error("Failed to load audit logs:", e);
        }
      }

      function renderAuditTable() {
        const tbody = document.getElementById("audit-table-body");
        tbody.innerHTML = "";
        let tbodyHtmlBuffer = "";
        
        if (allAuditLogs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="12" class="text-center py-12 text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No records found in the database.</span>
</div>
</td></tr>`;
            document.getElementById("audit-pagination").classList.add("hidden");
            return;
        }

        const startIndex = (currentAuditPage - 1) * AUDIT_PER_PAGE;
        const endIndex = startIndex + AUDIT_PER_PAGE;
        const paginatedData = allAuditLogs.slice(startIndex, endIndex);

        paginatedData.forEach((log) => {
          const date = new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          
          let badgeClass = 'admin-audit-role-default';
          if (log.role === 'BHW') badgeClass = 'admin-audit-role-bhw';
          else if (log.role === 'Admin' || log.role === 'LGU Admin') badgeClass = 'admin-audit-role-admin';
          
          tbodyHtmlBuffer += `
            <tr >
              <td class="whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 text-[0.85rem]">${date}</td>
              <td class="whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">${escapeText(log.user_id)}</td>
              <td class="whitespace-nowrap"><span class="admin-audit-role ${badgeClass}">${escapeText(log.role)}</span></td>
              <td class="whitespace-nowrap text-sky-500 dark:text-sky-400 font-bold">${escapeText(log.action)}</td>
              <td class="whitespace-pre-line font-medium text-slate-700 dark:text-slate-300 text-[0.9rem]">${escapeText(HealthIntelText.auditDetails(log))}</td>
            </tr>
          `;
        });
        tbody.innerHTML = tbodyHtmlBuffer;

        document.getElementById("audit-pagination").classList.remove("hidden");
        const totalPages = Math.ceil(allAuditLogs.length / AUDIT_PER_PAGE);
        document.getElementById("audit-page-info").innerText = `Showing ${startIndex + 1} to ${Math.min(endIndex, allAuditLogs.length)} of ${allAuditLogs.length} entries`;
        
        let buttonsHtml = '';
        
        // Show max 5 buttons (simple pagination logic)
        let startPage = Math.max(1, currentAuditPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        if (currentAuditPage > 1) {
            buttonsHtml += `<button onclick="goToAuditPage(${currentAuditPage - 1})" class="px-3 py-1 rounded text-sm font-medium border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Prev</button>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            let activeClass = i === currentAuditPage ? 'bg-brandBlue text-white border-brandBlue' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700';
            buttonsHtml += `<button onclick="goToAuditPage(${i})" class="px-3 py-1 rounded text-sm font-medium border transition-colors ${activeClass}">${i}</button>`;
        }
        
        if (currentAuditPage < totalPages) {
            buttonsHtml += `<button onclick="goToAuditPage(${currentAuditPage + 1})" class="px-3 py-1 rounded text-sm font-medium border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Next</button>`;
        }
        
        document.getElementById("audit-page-buttons").innerHTML = buttonsHtml;
      }

      function goToAuditPage(page) {
          currentAuditPage = page;
          renderAuditTable();
      }

        function toggleSidebar() {
            const sidebar = document.getElementById("main-sidebar");
            const icon = document.getElementById("sidebar-icon");
            const text = document.getElementById("sidebar-text");
            const labels = document.querySelectorAll(".sidebar-label");

            if (sidebar.classList.contains("w-64")) {
                sidebar.classList.replace("w-64", "w-20");
                if (text) text.classList.add("hidden");
                labels.forEach(l => l.classList.add("hidden"));
                if (icon) icon.setAttribute("data-lucide", "panel-left-open");
            } else {
                sidebar.classList.replace("w-20", "w-64");
                if (text) text.classList.remove("hidden");
                labels.forEach(l => l.classList.remove("hidden"));
                if (icon) icon.setAttribute("data-lucide", "panel-left-close");
            }
            lucide.createIcons();
        }
    