// Superadmin shared text helper, theme, navigation and session controls.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.

      const escapeText = value => HealthIntelText.escape(value);
      function toggleSuperTheme() {
          HealthIntelTheme.toggle();
      }


      function switchMainView(viewId, btnId) {
        document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
        document.getElementById(btnId).classList.add("active");

        document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
        document.getElementById(viewId).classList.add("active");
        const title=document.getElementById('superadmin-view-title');
        if(title) title.textContent=({'view-dashboard':'Overview','view-users':'Admin Access','view-audit':'Master Ledger','view-db':'Database Backup'})[viewId] || 'Overview';

        if (window.lucide) lucide.createIcons();
      }

      function logout() {
        Swal.fire({
          title: "Log out?",
          text: "Do you want to log out of Health-Intel?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Log out"
        }).then((result) => {
          if (result.isConfirmed) { HealthIntel.clearSession(); window.location.href = "index.html"; }
        });
      }
