// Responsive navigation shared by the four connected portals.
// Shared desktop collapse control and independent mobile drawer state.
(() => {
    function initialize() {
        const sidebar = document.querySelector('#sidebar, #main-sidebar, #superadmin-sidebar');
        const toggle = document.querySelector('[data-portal-menu]');
        const main = document.querySelector('main');
        if (!sidebar || !toggle || !main) return;
        const compact = window.matchMedia('(max-width: 900px)');
        let collapsed = false; // Start expanded on every portal visit.
        const brand = sidebar.querySelector('.hi-sidebar-logo')?.parentElement;
        const desktop = document.querySelector('[data-desktop-sidebar]') || document.createElement('button');
        desktop.type = 'button';
        desktop.className = 'hi-desktop-menu';
        desktop.setAttribute('aria-controls', sidebar.id);
        desktop.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>';
        if (brand) {
            brand.classList.add('hi-sidebar-brand');
            brand.append(desktop);
        }
        const tooltip = document.createElement('div');
        tooltip.className = 'hi-nav-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        tooltip.id = 'hi-navigation-tooltip';
        tooltip.hidden = true;
        document.body.append(tooltip);
        const hideTooltip = () => { tooltip.hidden = true; };
        sidebar.querySelectorAll('.nav-item, [onclick="logout()"], a[onclick*="logout"]').forEach(item => {
            const label = item.textContent.trim().replace(/\s+/g, ' ');
            if (!label) return;
            if (!item.getAttribute('aria-label')) item.setAttribute('aria-label', label);
            const show = () => {
                if (compact.matches || !collapsed) return;
                const bounds = item.getBoundingClientRect();
                tooltip.textContent = label;
                tooltip.style.left = `${bounds.right + 10}px`;
                tooltip.style.top = `${Math.max(8, Math.min(bounds.top, window.innerHeight - 48))}px`;
                tooltip.hidden = false;
            };
            item.addEventListener('mouseenter', show);
            item.addEventListener('focus', show);
            item.addEventListener('mouseleave', hideTooltip);
            item.addEventListener('blur', hideTooltip);
            item.addEventListener('click', hideTooltip);
        });
        sidebar.addEventListener('scroll', hideTooltip, true);
        const backdrop = document.createElement('button');
        backdrop.type = 'button';
        backdrop.className = 'hi-menu-backdrop';
        backdrop.setAttribute('aria-label', 'Close navigation');
        backdrop.tabIndex = -1;
        backdrop.hidden = true;
        document.body.append(backdrop);
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'hi-menu-close';
        close.textContent = 'Close menu';
        sidebar.prepend(close);
        let open = false;
        toggle.setAttribute('aria-controls', sidebar.id);
        sidebar.setAttribute('aria-label', 'Portal navigation');

        function synchronize() {
            const mobile = compact.matches;
            const mapExpanded = document.body.classList.contains('heatmap-is-expanded');
            sidebar.inert = mapExpanded || (mobile && !open);
            main.inert = mapExpanded || (mobile && open);
            document.body.classList.toggle('hi-menu-open', mobile && open);
            backdrop.hidden = !mobile || !open;
            sidebar.classList.toggle('hi-sidebar-collapsed', !mobile && collapsed);
            desktop.setAttribute('aria-expanded', String(!collapsed));
            desktop.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            desktop.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
            toggle.setAttribute('aria-expanded', String(mobile ? open : !collapsed));
            toggle.setAttribute('aria-label', mobile ? 'Open navigation' : 'Toggle sidebar');
            if (mobile) {
                sidebar.setAttribute('role', 'dialog');
                sidebar.setAttribute('aria-modal', 'true');
            } else {
                sidebar.removeAttribute('role');
                sidebar.removeAttribute('aria-modal');
            }
        }
        function dismiss(restoreFocus = true) {
            open = false;
            synchronize();
            if (restoreFocus) toggle.focus();
        }
        window.toggleSidebar = function () {
            if (!compact.matches) {
                collapsed = !collapsed;
                hideTooltip();
                synchronize();
                window.dispatchEvent(new Event('resize'));
                return;
            }
            open = !open;
            synchronize();
            if (open) close.focus();
            else toggle.focus();
        };
        if (!desktop.getAttribute('onclick')) desktop.addEventListener('click', () => window.toggleSidebar());
        close.addEventListener('click', () => dismiss());
        backdrop.addEventListener('click', () => dismiss());
        sidebar.addEventListener('click', event => {
            if (compact.matches && event.target.closest('.nav-item')) dismiss();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') hideTooltip();
            if (!compact.matches || !open) return;
            // Let account/confirmation dialogs own their keyboard while visible.
            if (document.querySelector('.swal2-container')) return;
            if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
            if (event.key !== 'Tab') return;
            const items = [...sidebar.querySelectorAll('button, a[href], input, select, [tabindex="0"]')]
                .filter(node => !node.disabled && !node.hidden && node.getClientRects().length);
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        });
        compact.addEventListener('change', () => {
            const wasOpen = open;
            open = false;
            hideTooltip();
            synchronize();
            if (wasOpen) toggle.focus();
        });
        window.addEventListener('health-intel:map-fullscreen-change', () => { hideTooltip(); synchronize(); });
        synchronize();
        // Tables keep every column; scrolling is local, never across the page.
        document.querySelectorAll('table').forEach(table => {
            const region = table.parentElement;
            region.classList.add('hi-table-scroll');
            if (!region.hasAttribute('tabindex')) region.tabIndex = 0;
            if (!region.hasAttribute('role')) region.setAttribute('role', 'region');
            if (!region.hasAttribute('aria-label')) region.setAttribute('aria-label', 'Scrollable records table');
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
    else initialize();
})();
