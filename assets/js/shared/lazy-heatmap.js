// Load GIS code only after its view is opened. A failed load can be retried.
(() => {
    const section = document.getElementById('view-heatmap');
    if (!section) return;
    const summaryOnly = section.querySelector('[data-map-mode="summary"]') !== null;
    let pending;
    let ready = false;
    function script(src) {
        return new Promise((resolve, reject) => {
            const element = document.createElement('script');
            element.src = src;
            element.onload = resolve;
            element.onerror = () => { element.remove(); reject(new Error('Map library unavailable')); };
            document.head.append(element);
        });
    }
    function load() {
        if (ready || pending || section.classList.contains('hidden')) return;
        const status = document.getElementById('heatmap-status');
        if (status) status.textContent = 'Loading map…';
        pending = (async () => {
            if (!window.L) await script('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
            if (!window.HealthIntelMapFullscreen) await script('assets/js/shared/map-fullscreen.js?v=20261108-bhw-icons');
            if (!window.HealthIntelMapDetails) await script('assets/js/shared/map-details.js?v=20261123-map-periods');
            if (!summaryOnly && !window.HealthIntelMapBreakdown) await script('assets/js/shared/map-case-breakdown.js?v=20261115-map-summary');
            if (!summaryOnly && !window.HealthIntelHeatView) await script('assets/js/shared/map-heat-view.js?v=20261123-map-periods');
            if (!summaryOnly && !window.HealthIntelMapHistory) await script('assets/js/mho/mho-map-history.js?v=20261123-map-filters');
            await script('assets/js/shared/health-map.js?v=20261123-map-filters');
            ready = true;
        })().catch(() => {
            if (status) status.textContent = 'Map could not load. Open another tab, then return to retry.';
        }).finally(() => { pending = null; });
    }
    new MutationObserver(load).observe(section, { attributes: true, attributeFilter: ['class'] });
    load();
})();
