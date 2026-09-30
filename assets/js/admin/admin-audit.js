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
              <td class="whitespace-pre-line font-medium text-slate-700 dark:text-slate-300 text-[0.9rem]">${escapeText(HealthIntelText.auditDetails(log))}${Number.isSafeInteger(log.case_id) && log.case_id > 0 ? `<div class="mt-2"><button class="admin-case-view-button" onclick="viewAdminCase(${log.case_id},true)">View case #REC-${log.case_id}</button></div>` : ''}</td>
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

