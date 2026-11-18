// Browser navigation tracks only allowlisted portal section IDs, never patient data.
(() => {
  if (!window.history?.pushState || !window.history?.replaceState) return;
  function initialize() {
    const sidebar = document.querySelector('#sidebar, #main-sidebar, #superadmin-sidebar');
    if (!sidebar) return;
    const sections = new Map();
    for (const button of sidebar.querySelectorAll('button.nav-item:not(.sign-out)')) {
      const view = button.dataset.target || /^switchMainView\('([a-z0-9-]+)',/.exec(button.getAttribute('onclick') || '')?.[1];
      if (view && document.getElementById(view)) sections.set(view, button);
    }
    if (!sections.size) return;
    let restoring = false;
    const selected = () => [...sections].find(([, button]) => button.classList.contains('active'))?.[0];
    const urlFor = view => window.location.pathname + window.location.search + '#' + view;
    const restore = () => {
      const button = sections.get(window.location.hash.slice(1));
      if (!button) return;
      restoring = true;
      try { button.click(); } finally { restoring = false; }
    };
    const remember = view => {
      if (!sections.has(view) || restoring || selected() !== view || window.location.hash === '#' + view) return;
      window.history.pushState(null, '', urlFor(view));
    };
    for (const [view, button] of sections) button.addEventListener('click', () => remember(view));
    // Overview shortcuts use the same controller without clicking a sidebar button.
    if (typeof window.switchMainView === 'function') {
      const switchView = window.switchMainView;
      window.switchMainView = function (...args) {
        const result = switchView.apply(this, args);
        remember(args[0]);
        return result;
      };
    }
    window.addEventListener('popstate', restore);
    const saved = window.location.hash.slice(1);
    if (sections.has(saved)) restore();
    else if (selected()) window.history.replaceState(null, '', urlFor(selected()));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
