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
        if(title) title.textContent=({'view-dashboard':'Superadmin Portal','view-users':'Admin Access','view-audit':'Master Ledger','view-db':'Database Backup'})[viewId] || 'Overview';

        if(viewId==='view-dashboard')window.HealthIntelOverview?.refresh();
        if (window.lucide) lucide.createIcons();
      }

      async function logout() {
        try { await HealthIntel.logout(); window.location.href = "index.html"; }
        catch { Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog",icon:'error',title:'Still signed in',text:'The server could not confirm sign out. Check your connection and try again.'}); }
      }

      window.addEventListener('DOMContentLoaded', () => {
        const tooltip = document.getElementById('superadmin-row-tooltip');
        const rows = '#user-table-body tr[tabindex="0"], #audit-table-body tr[tabindex="0"]';
        const hide = () => tooltip.classList.remove('is-visible');

        document.addEventListener('pointermove', event => {
          if (event.pointerType !== 'mouse') return hide();
          const hint = event.target.closest(rows)?.querySelector('.hi-admin-access-hint, .hi-ledger-hint');
          if (!hint) return hide();
          if (tooltip.textContent !== hint.textContent) tooltip.textContent = hint.textContent;
          const { clientWidth, clientHeight } = document.documentElement;
          const left = Math.max(8, Math.min(event.clientX + 14, clientWidth - tooltip.offsetWidth - 8));
          const below = event.clientY + 18;
          const top = below + tooltip.offsetHeight + 8 <= clientHeight
            ? below : Math.max(8, event.clientY - tooltip.offsetHeight - 10);
          tooltip.style.left = left + 'px';
          tooltip.style.top = top + 'px';
          tooltip.classList.add('is-visible');
        });
        document.addEventListener('pointerout', event => {
          const row = event.target.closest(rows);
          if (row && !row.contains(event.relatedTarget)) hide();
        });
        document.addEventListener('scroll', hide, true);
        document.addEventListener('click', hide, true);
        document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
        window.addEventListener('blur', hide);
      });
