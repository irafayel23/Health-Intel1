// Superadmin Master Ledger, Sync and pagination.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.
      let allAuditLogs = [];
      let currentAuditPage = 1;
      const AUDIT_PER_PAGE = 8;



      async function loadAuditLogs() {
        try {
          const res = await fetch("http://localhost:3000/api/superadmin/audit-logs");
          const result = await res.json();
          if (result.success) {
            allAuditLogs = result.data;
            document.getElementById("stat-total-logs").innerText = allAuditLogs.length;
            currentAuditPage = 1;
            renderAuditTable();
          }
        } catch (e) { console.error(e); }
      }

      function renderAuditTable() {
        const tbody = document.getElementById("audit-table-body");
        tbody.innerHTML = "";
        let buffer = "";
        if (allAuditLogs.length === 0) return;

        const startIndex = (currentAuditPage - 1) * AUDIT_PER_PAGE;
        const endIndex = startIndex + AUDIT_PER_PAGE;
        const paginatedData = allAuditLogs.slice(startIndex, endIndex);

        paginatedData.forEach((log) => {
          const date = new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          let badgeClass = 'inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-medium ';
          if (log.role === 'Admin' || log.role === 'LGU Admin') badgeClass += 'text-slate-900 dark:text-white';
          else if (log.role === 'MHO') badgeClass += 'text-slate-700 dark:text-neutral-300';
          else if (log.role === 'Superadmin' || log.role === 'Super Admin') badgeClass += 'text-slate-900 dark:text-neutral-100 border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900';
          else badgeClass += 'text-slate-600 dark:text-neutral-400';

          buffer += `
            <tr class="hover:bg-slate-50 dark:bg-neutral-800/50 transition">
              <td class="p-4 text-slate-700 dark:text-neutral-400 font-mono text-xs whitespace-nowrap">${date}</td>
              <td class="p-4 text-slate-900 dark:text-white font-medium whitespace-nowrap">${escapeText(log.user_id)}</td>
              <td class="p-4 whitespace-nowrap"><span class="${badgeClass}">${escapeText(log.role)}</span></td>
              <td class="p-4 text-slate-700 dark:text-neutral-300 whitespace-nowrap">${escapeText(log.action)}</td>
              <td class="whitespace-pre-line p-4 text-slate-800 dark:text-neutral-300 text-xs">${escapeText(HealthIntelText.auditDetails(log))}</td>
            </tr>
          `;
        });
        tbody.innerHTML = buffer;

        document.getElementById("audit-pagination").classList.remove("hidden");
        const totalPages = Math.ceil(allAuditLogs.length / AUDIT_PER_PAGE);
        document.getElementById("audit-page-info").innerText = `Showing ${startIndex + 1} to ${Math.min(endIndex, allAuditLogs.length)} of ${allAuditLogs.length} entries`;

        let buttonsHtml = '';

        // Prev button (render invisible if disabled to maintain layout width)
        if (currentAuditPage > 1) {
            buttonsHtml += `<button onclick="goToAuditPage(${currentAuditPage - 1})" class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:text-white transition">&lt;</button>`;
        } else {
            buttonsHtml += `<button disabled class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 dark:text-neutral-700 cursor-not-allowed">&lt;</button>`;
        }

        let startPage = Math.max(1, currentAuditPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        for (let i = startPage; i <= endPage; i++) {
            let activeClass = i === currentAuditPage ? 'bg-slate-800 dark:bg-white text-white dark:text-black' : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-neutral-700';
            buttonsHtml += `<button onclick="goToAuditPage(${i})" class="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition ${activeClass}">${i}</button>`;
        }

        // Next button (render invisible if disabled to maintain layout width)
        if (currentAuditPage < totalPages) {
            buttonsHtml += `<button onclick="goToAuditPage(${currentAuditPage + 1})" class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:text-white transition">&gt;</button>`;
        } else {
            buttonsHtml += `<button disabled class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 dark:text-neutral-700 cursor-not-allowed">&gt;</button>`;
        }
        document.getElementById("audit-page-buttons").innerHTML = buttonsHtml;
      }

      function goToAuditPage(page) {
          currentAuditPage = page;
          renderAuditTable();
      }
