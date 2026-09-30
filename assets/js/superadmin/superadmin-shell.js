// Superadmin shared text helper, theme, navigation and session controls.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.

      const escapeText = value => HealthIntelText.escape(value);
      function toggleSuperTheme() {
          const html = document.documentElement;
          html.classList.toggle("dark");
          const isDark = html.classList.contains("dark");
          const btn = document.getElementById("theme-toggle-btn");
          if(btn) btn.innerHTML = isDark ? `<i data-lucide="sun" class="w-5 h-5"></i>` : `<i data-lucide="moon" class="w-5 h-5"></i>`;
          lucide.createIcons();
      }


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
