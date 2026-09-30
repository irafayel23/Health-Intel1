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

