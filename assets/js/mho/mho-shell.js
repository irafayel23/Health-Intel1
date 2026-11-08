// MHO sidebar and theme controls.
// Classic script: load through mho.html; cross-feature functions share its page scope.
// Desktop navigation stays visible. portal-navigation.js wraps this hook
// to open and close the drawer on mobile only.
function toggleSidebar() {}

function toggleDarkMode() {
    HealthIntelTheme.toggle();
}

document.addEventListener('DOMContentLoaded', () => {
    const tooltip = document.getElementById('mho-cursor-tooltip');
    const selector = '[data-mho-hint]';
    const hide = () => tooltip.classList.remove('is-visible');

    document.addEventListener('pointermove', event => {
        const target = event.target.closest(selector);
        if (event.pointerType !== 'mouse' || !target || target.disabled) return hide();
        tooltip.textContent = target.dataset.mhoHint;
        const {clientWidth,clientHeight} = document.documentElement;
        const left = Math.max(8, Math.min(event.clientX + 14, clientWidth - tooltip.offsetWidth - 8));
        const below = event.clientY + 18;
        const top = below + tooltip.offsetHeight + 8 <= clientHeight
            ? below : Math.max(8, event.clientY - tooltip.offsetHeight - 10);
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.classList.add('is-visible');
    });
    document.addEventListener('pointerout', event => {
        const target = event.target.closest(selector);
        if (target && !target.contains(event.relatedTarget)) hide();
    });
    document.addEventListener('scroll', hide, true);
    document.addEventListener('click', hide, true);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
    window.addEventListener('blur', hide);
    window.addEventListener('health-intel:map-fullscreen-change', hide);
});

function renderMhoPages(host, page, total, label) {
    const pages = [...new Set([1, page - 1, page, page + 1, total])]
        .filter(value => value >= 1 && value <= total).sort((a, b) => a - b);
    const controls = pages.map((number, index) => {
        const gap = index && number - pages[index - 1] > 1 ? '<span aria-hidden="true">…</span>' : '';
        return gap + `<button type="button" data-mho-page="${number}" aria-label="Page ${number}" ${number === page ? 'aria-current="page"' : ''}>${number}</button>`;
    }).join('');
    host.innerHTML = `<span role="status">Page ${page} of ${total}</span><nav aria-label="${label}">${controls}</nav>`;
}
