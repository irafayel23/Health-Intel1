
      function showAccountSettings() {
        const userId = localStorage.getItem('active_user_id') || 'Unknown';
        const isDark = document.documentElement.classList.contains("dark");
        Swal.fire({
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a',
          title: 'Account Info & Security',
          html: `
            <div class="text-left">
              <div class="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-5 mb-6 shadow-sm">
                <div class="flex items-center gap-3 mb-1">
                  <i data-lucide="shield-check" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i>
                  <p class="m-0 text-sm font-semibold text-emerald-800 dark:text-emerald-300">System ID: <span class="font-mono bg-emerald-200/50 dark:bg-emerald-800/50 px-2 py-0.5 rounded text-emerald-900 dark:text-emerald-200">${userId}</span></p>
                </div>
                <div class="flex items-center gap-3">
                  <i data-lucide="badge-check" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i>
                  <p class="m-0 text-sm font-medium text-emerald-700 dark:text-emerald-400">Role: ${userId.startsWith('MHO') ? 'Municipal Health Officer' : 'Barangay Health Worker'}</p>
                </div>
              </div>

              <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
                <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
                  <i data-lucide="key" class="w-4 h-4 text-slate-400 dark:text-slate-500"></i> Change Password
                </h3>

                <div class="space-y-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Current Password</label>
                    <input type="password" id="current-pass" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" placeholder="Enter current password">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">New Password</label>
                    <input type="password" id="new-pass" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" placeholder="Enter new password">
                  </div>
                </div>
              </div>
            </div>
          `,
          didOpen: () => { if (window.lucide) lucide.createIcons(); },
          width: '450px',
          showCancelButton: true,
          confirmButtonText: 'Update Password',
          confirmButtonColor: isDark ? '#047857' : '#0f172a',
          preConfirm: async () => {
            const current_password = document.getElementById('current-pass').value;
            const new_password = document.getElementById('new-pass').value;
            const system_id = localStorage.getItem('active_user_id');

            if(!current_password || !new_password) {
              Swal.showValidationMessage('Please fill in both password fields to update, or cancel to close.');
              return false;
            }

            try {
              const res = await fetch('http://localhost:3000/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ system_id, current_password, new_password })
              });
              const data = await res.json();
              if (!data.success) {
                Swal.showValidationMessage(data.message || 'Update failed');
              }
              return data;
            } catch (err) {
              Swal.showValidationMessage(err.message || 'Server error. Try again later.');
            }
          }
        }).then((result) => {
          if (result.isConfirmed) {
            Swal.fire({
              icon: 'success',
              title: 'Success',
              text: 'Password updated. Please sign in with your new password.'
            }).then(() => { HealthIntel.clearSession(); window.location.replace('index.html'); });
          }
        });
      }

      function showTerms(event) {
        event.preventDefault();
        const isDark = document.documentElement.classList.contains("dark");
        Swal.fire({
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a',
          title: 'Terms & Recognitions',
          html: `<div class="mho-case-details-grid">
            <p><strong>Academic prototype.</strong> Health-Intel is a capstone project, not an official LGU privacy notice or proof of legal compliance.</p>
            <p><strong>Record use.</strong> Authorized health workers encode cases; the MHO reviews summaries and reports; the Admin oversees records and accounts; and the Superadmin maintains system backups.</p>
            <p><strong>User responsibility.</strong> Access and share health information only for approved project work and through authorized procedures.</p>
            <p><strong>Real records.</strong> The responsible LGU and project team need to review how existing real records are handled and provide a complete privacy notice before operational use. It should identify who controls the data, contact details, purposes, lawful basis, recipients, retention, and how people can exercise their rights.</p>
            <p><strong>Project recognitions.</strong> This capstone uses Tailwind CSS, Leaflet.js, Chart.js, and SweetAlert2.</p>
          </div>`,
          confirmButtonColor: isDark ? '#1d4ed8' : '#0f172a'
          });
        }

      document.addEventListener('DOMContentLoaded', () => {
        const userId = localStorage.getItem('active_user_id');
        if (userId) {
          const initialEl = document.getElementById('dropdown-user-initial');
          // if (initialEl) initialEl.innerText = userId.charAt(0).toUpperCase(); // Disabled to preserve the Lucide icon
          const nameEl = document.getElementById('dropdown-user-name');
          if (nameEl) nameEl.innerText = userId;
        }
      });

