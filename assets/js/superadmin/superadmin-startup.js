// Superadmin initial feature loads and health polling.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.
      window.addEventListener('DOMContentLoaded', () => {
        if (window.location?.hash === '#view-staff' && window.history?.replaceState) {
            window.history.replaceState(null, '', '#view-users');
        }
        loadAdmins();
        loadAuditLogs();
        loadSystemHealth();
        setInterval(loadSystemHealth, 3000);
        setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
      });
