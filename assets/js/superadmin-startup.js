// Superadmin initial feature loads and health polling.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.
      window.addEventListener('DOMContentLoaded', () => {
        loadAdmins();
        loadAuditLogs();
        loadSystemHealth();
        setInterval(loadSystemHealth, 3000);
        setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
      });
