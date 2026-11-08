
      function escapeText(value) { return window.HealthIntelText.escape(value); }

      lucide.createIcons();
      function toggleAdminTheme() {
          HealthIntelTheme.toggle();
      }

      window.addEventListener('DOMContentLoaded', () => {
        enableAdminRowTooltip();
        loadUsers();
        fetchPatientRecords();
        loadArchivedPatients();
        loadDiseases();
        loadAuditLogs(); // Automatically load the audit trail on start
      });

      function enableAdminRowTooltip() {
        const tooltip = document.getElementById('admin-row-tooltip');
        const rowSelector = '.admin-personnel-row, .admin-case-row, .admin-disease-row, .admin-audit-row';
        const hide = () => tooltip.classList.remove('is-visible');
        document.addEventListener('pointermove', event => {
          if (event.pointerType !== 'mouse' || !event.target.closest(rowSelector)) return hide();
          const left = Math.max(8, Math.min(event.clientX + 14, document.documentElement.clientWidth - tooltip.offsetWidth - 8));
          const below = event.clientY + 18;
          const top = below + tooltip.offsetHeight + 8 <= document.documentElement.clientHeight
            ? below : Math.max(8, event.clientY - tooltip.offsetHeight - 10);
          tooltip.style.left = left + 'px';
          tooltip.style.top = top + 'px';
          tooltip.classList.add('is-visible');
        });
        document.addEventListener('pointerout', event => {
          const row = event.target.closest(rowSelector);
          if (row && !row.contains(event.relatedTarget)) hide();
        });
        document.addEventListener('scroll', hide, true);
        document.addEventListener('click', hide, true);
        document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
        window.addEventListener('blur', hide);
      }

      function switchMainView(viewId, btnId) {
        document.querySelectorAll(".nav-item").forEach((btn) => btn.classList.remove("active"));
        document.getElementById(btnId).classList.add("active");

        document.querySelectorAll(".view-section").forEach((view) => view.classList.remove("active"));
        document.getElementById(viewId).classList.add("active");

        if(viewId==='view-overview')window.HealthIntelOverview?.refresh();

        // Refresh logs if the audit tab is clicked
        if(viewId === 'view-audit') {
          loadAuditLogs();
        }
      }

      function switchSubView(module, type) {
        for (const tab of ['active', 'archived', 'pending']) {
          const button = document.getElementById(`btn-${module}-${tab}`);
          button?.classList.toggle('active', tab === type);
          if (module === 'iam' || module === 'disease') button?.setAttribute('aria-pressed', String(tab === type));
        }
        
        document.getElementById(`${module}-active-view`) && (document.getElementById(`${module}-active-view`).style.display = "none");
        document.getElementById(`${module}-archived-view`) && (document.getElementById(`${module}-archived-view`).style.display = "none");
        document.getElementById(`${module}-pending-view`) && (document.getElementById(`${module}-pending-view`).style.display = "none");

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
