
      function showAccountSettings() {
        return window.HealthIntelAccount.open();
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
          const welcomeEl = document.getElementById('mho-analytics-welcome');
          if (welcomeEl) welcomeEl.innerText = `Welcome back, ${userId}`;
        }
      });

