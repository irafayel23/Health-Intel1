// Responsive navigation shared by the four connected portals.
// Desktop keeps each portal's existing collapse handler and state.
(() => {
    function initialize() {
        const sidebar = document.querySelector('#sidebar, #main-sidebar, #superadmin-sidebar');
        const toggle = document.querySelector('[data-portal-menu]');
        const main = document.querySelector('main');
        if (!sidebar || !toggle || !main) return;
        const compact = window.matchMedia('(max-width: 900px)');
        const desktopToggle = window.toggleSidebar;
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
            sidebar.inert = mobile && !open;
            main.inert = mobile && open;
            document.body.classList.toggle('hi-menu-open', mobile && open);
            backdrop.hidden = !mobile || !open;
            toggle.setAttribute('aria-expanded', String(mobile ? open : sidebar.classList.contains('w-64')));
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
                if (typeof desktopToggle === 'function') desktopToggle();
                synchronize();
                return;
            }
            open = !open;
            synchronize();
            if (open) close.focus();
            else toggle.focus();
        };
        close.addEventListener('click', () => dismiss());
        backdrop.addEventListener('click', () => dismiss());
        sidebar.addEventListener('click', event => {
            if (compact.matches && event.target.closest('.nav-item')) dismiss();
        });
        document.addEventListener('keydown', event => {
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
            synchronize();
            if (wasOpen) toggle.focus();
        });
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
