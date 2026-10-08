
      function escapeText(value) { return window.HealthIntelText.escape(value); }

      lucide.createIcons();
      function toggleAdminTheme() {
          HealthIntelTheme.toggle();
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
        HealthIntelModal.close(document.getElementById(modalId));
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
