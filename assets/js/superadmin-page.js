
      const escapeText = value => HealthIntelText.escape(value);
      function toggleSuperTheme() {
          const html = document.documentElement;
          html.classList.toggle("dark");
          const isDark = html.classList.contains("dark");
          const btn = document.getElementById("theme-toggle-btn");
          if(btn) btn.innerHTML = isDark ? `<i data-lucide="sun" class="w-5 h-5"></i>` : `<i data-lucide="moon" class="w-5 h-5"></i>`;
          lucide.createIcons();
      }

      let allAuditLogs = [];
      let currentAuditPage = 1;
      const AUDIT_PER_PAGE = 8;

      
      async function loadSystemHealth() {
          try {
              const res = await fetch("http://localhost:3000/api/superadmin/health");
              const result = await res.json();
              
              if (result.success) {
                  const data = result.data;
                  document.getElementById("stat-total-logs").innerText = data.total_logs;
                  document.getElementById("stat-active-admins").innerText = data.total_users;
                  document.getElementById("stat-db-size").innerText = data.db_size + " MB";
                  
                  // Format uptime (seconds) into something readable
                  let up = data.uptime;
                  let hours = Math.floor(up / 3600);
                  let minutes = Math.floor((up % 3600) / 60);
                  document.getElementById("stat-uptime").innerText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                  if (up < 60) document.getElementById("stat-uptime").innerText = "< 1m";

                  document.getElementById("status-db").innerText = "Connected";
                  document.getElementById("status-db").className = "text-emerald-500 font-bold";
                  document.getElementById("status-api").innerText = "Connected";
                  document.getElementById("status-api").className = "text-emerald-500 font-bold";
                  
                  const st = document.getElementById("sys-status-text");
                  if(st) st.innerText = "All core modules operational";
                  const sb = document.getElementById("sys-status-bar");
                  if(sb) sb.className = "h-full bg-emerald-500";
              }
          } catch (e) {
              const st = document.getElementById("sys-status-text");
              if(st) { st.innerText = "CRITICAL: Database connection lost"; st.className = "text-red-500 font-bold text-sm mb-8"; }
              const sb = document.getElementById("sys-status-bar");
              if(sb) sb.className = "h-full bg-red-500";
              
              const sdb = document.getElementById("status-db");
              if (sdb) {
                  sdb.innerText = "Disconnected";
                  sdb.className = "text-red-500 font-bold";
              }
              const sapi = document.getElementById("status-api");
              if (sapi) {
                  sapi.innerText = "Offline";
                  sapi.className = "text-red-500 font-bold";
              }
          }
      }

      window.addEventListener('DOMContentLoaded', () => {
        loadAdmins();
        loadAuditLogs();
        loadSystemHealth();
        setInterval(loadSystemHealth, 3000);
        setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
      });

      function switchMainView(viewId, btnId) {
        document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
        document.getElementById(btnId).classList.add("active");
        
        document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
        document.getElementById(viewId).classList.add("active");
        
        if (window.lucide) lucide.createIcons();
      }

      function logout() {
        Swal.fire({
          title: "System Disconnect",
          text: "Are you sure you want to terminate session?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Terminate"
        }).then((result) => {
          if (result.isConfirmed) { HealthIntel.clearSession(); window.location.href = "index.html"; }
        });
      }

      async function loadAdmins() {
        try {
          const res = await fetch("http://localhost:3000/api/superadmin/users");
          const data = await res.json();
          const tbody = document.getElementById("user-table-body");
          tbody.innerHTML = "";
          
          if (data.success) {
            let buffer = "";
            const admins = data.data.filter(u => u.role.toLowerCase() === "admin");
            if (document.getElementById("stat-active-admins")) document.getElementById("stat-active-admins").innerText = admins.length;
            admins.forEach(user => {
              let statusBadge = user.status === 'approved' 
                ? '<span class="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-white text-xs font-medium">Active</span>' 
                : '<span class="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-500 text-xs font-medium">Suspended</span>';
              
              let actionBtn = user.status === 'approved' 
                ? `<button onclick="toggleAdminStatus(${escapeText(JSON.stringify(user.system_id))}, 'suspended')" class="px-4 py-1.5 rounded-full border border-slate-300 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-neutral-800 text-xs font-medium transition">Suspend</button>`
                : `<button onclick="toggleAdminStatus(${escapeText(JSON.stringify(user.system_id))}, 'approved')" class="px-4 py-1.5 rounded-full border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-neutral-800 text-xs font-medium transition">Restore</button>`;
              
              buffer += `
                <tr class="hover:bg-slate-50 dark:bg-neutral-800/50 transition">
                  <td class="p-4 text-slate-900 dark:text-white font-medium">${escapeText(user.system_id)}</td>
                  <td class="p-4 text-slate-800 dark:text-neutral-300 capitalize">${escapeText(user.role)}</td>
                  <td class="p-4">${statusBadge}</td>
                  <td class="p-4 text-slate-700 dark:text-neutral-400 text-xs font-mono">${new Date(user.created_at).toLocaleDateString()}</td>
                  <td class="p-4 text-right">${actionBtn}</td>
                </tr>
              `;
            });
            tbody.innerHTML = buffer;
          }
        } catch (e) {
          console.error(e);
        }
      }

      async function toggleAdminStatus(id, newStatus) {
        try {
          const url = newStatus === 'approved' ? `http://localhost:3000/api/superadmin/approve-admin` : `http://localhost:3000/api/admin/suspend-user`;
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ system_id: id })
          });
          loadAdmins();
        } catch (e) { console.error(e); }
      }

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

      async function backupDB() {
        const button = document.getElementById('backup-download-button');
        if (button.disabled) return;
        button.disabled = true;
        try {
          const result = await Swal.fire({
            title: 'Database Backup',
            html: '<p>Choose a password of 12-128 characters. Keep it to open the encrypted ZIP.</p>' +
              '<input id="backup-password" type="password" class="swal2-input" placeholder="Backup password" autocomplete="new-password">' +
              '<input id="backup-password-confirm" type="password" class="swal2-input" placeholder="Confirm password" autocomplete="new-password">',
            showCancelButton: true, confirmButtonText: 'Create backup',
            preConfirm: () => {
              const password = document.getElementById('backup-password').value;
              const confirmation = document.getElementById('backup-password-confirm').value;
              if (password.length < 12 || password.length > 128) { Swal.showValidationMessage('Use between 12 and 128 characters.'); return false; }
              if (password !== confirmation) { Swal.showValidationMessage('The passwords must match.'); return false; }
              return password;
            }
          });
          if (!result.isConfirmed) return;
          Swal.fire({ title: 'Creating backup...', text: 'Preparing the database tables and records.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          await HealthIntel.download('http://localhost:3000/api/superadmin/backup', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: result.value })
          }, 'health_intel_backup.zip');
          Swal.fire({ title: 'Download started', text: 'Keep your backup password to open the encrypted ZIP.', icon: 'success' });
        } catch (error) {
          Swal.fire({ title: 'Backup failed', text: error.message, icon: 'error' });
        } finally {
          button.disabled = false;
        }
      }
      
      function restartServices() {
        Swal.fire({
          title: "Restart Services",
          text: "This will momentarily disconnect all active sessions. Proceed?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Force Restart"
        }).then((result) => {
          if (result.isConfirmed) {
            Swal.fire({title: "Services Restarted", icon: "success", timer: 1500, showConfirmButton: false});
          }
        });
      }
    