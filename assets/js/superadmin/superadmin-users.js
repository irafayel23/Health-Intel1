// Superadmin Admin-account listing and approval/status actions.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.
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
