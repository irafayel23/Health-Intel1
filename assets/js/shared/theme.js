// Apply the shared preference before paint; keep existing portal toggle hooks.
(() => {
    const key = 'health_intel_theme';
    let saved;
    try { saved = localStorage.getItem(key); } catch { /* Storage may be unavailable. */ }
    if (saved === 'dark' || saved === 'light') document.documentElement.classList.toggle('dark', saved === 'dark');

    function refreshControls() {
        const dark = document.documentElement.classList.contains('dark');
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
            button.setAttribute('aria-pressed', String(dark));
            const icon = button.querySelector('#theme-icon');
            const size = button.querySelector('.w-5') ? 'w-5 h-5' : 'w-4 h-4';
            button.innerHTML = `<i ${icon ? 'id="theme-icon" ' : ''}data-lucide="${dark ? 'sun' : 'moon'}" class="${size}" aria-hidden="true"></i>`;
        });
        window.lucide?.createIcons();
    }
    function toggle() {
        const dark = document.documentElement.classList.toggle('dark');
        try { localStorage.setItem(key, dark ? 'dark' : 'light'); } catch { /* Keep the current page usable. */ }
        refreshControls();
        Object.values(window.Chart?.instances || {}).forEach(chart => chart.update('none'));
    }
    window.HealthIntelTheme = { toggle, refreshControls };
    document.addEventListener('DOMContentLoaded', refreshControls);
    window.addEventListener('storage', event => {
        if (event.key !== key || !['dark', 'light'].includes(event.newValue)) return;
        document.documentElement.classList.toggle('dark', event.newValue === 'dark');
        refreshControls();
        Object.values(window.Chart?.instances || {}).forEach(chart => chart.update('none'));
    });
})();
