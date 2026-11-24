// Preserve links to the old staff view and initialize sidebar icons.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.
      window.addEventListener('DOMContentLoaded', () => {
        if (window.location?.hash === '#view-staff' && window.history?.replaceState) {
            window.history.replaceState(null, '', '#view-users');
        }
        setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
      });
