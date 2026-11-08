
      function escapeText(value) { return window.HealthIntelText.escape(value); }

      function toggleDarkMode() {
        HealthIntelTheme.toggle();
      }

      let sidebarOpen = true;
      function toggleSidebar() {
        sidebarOpen = !sidebarOpen;
        const sidebar = document.getElementById('sidebar');
        const icon = document.getElementById('sidebar-icon');
        const labels = document.querySelectorAll('.sidebar-label');
        const text = document.getElementById('sidebar-text');

        if (sidebarOpen) {
          sidebar.classList.remove('w-20');
          sidebar.classList.add('w-64');
          labels.forEach(l => { l.classList.remove('opacity-0', 'hidden'); l.classList.add('opacity-100'); });
          text.classList.remove('opacity-0', 'hidden'); text.classList.add('opacity-100');
          icon.setAttribute('data-lucide', 'panel-left-close');
        } else {
          sidebar.classList.remove('w-64');
          sidebar.classList.add('w-20');
          labels.forEach(l => { l.classList.remove('opacity-100'); l.classList.add('opacity-0', 'hidden'); });
          text.classList.remove('opacity-100'); text.classList.add('opacity-0', 'hidden');
          icon.setAttribute('data-lucide', 'panel-left-open');
        }
        lucide.createIcons();
        if(typeof map !== 'undefined') {
          setTimeout(() => map.invalidateSize(), 300);
        }
      }



document.addEventListener('DOMContentLoaded', () => {
    const tooltip = document.getElementById('bhw-cursor-tooltip');
    if (!tooltip) return;
    const selector = '[data-bhw-hint], [data-mho-hint]';
    const hide = () => tooltip.classList.remove('is-visible');

    document.addEventListener('pointermove', event => {
        const target = event.target.closest(selector);
        if (event.pointerType !== 'mouse' || !target || target.disabled) return hide();
        tooltip.textContent = target.dataset.bhwHint || target.dataset.mhoHint;
        const { clientWidth, clientHeight } = document.documentElement;
        const left = Math.max(8, Math.min(event.clientX + 14, clientWidth - tooltip.offsetWidth - 8));
        const below = event.clientY + 18;
        const top = below + tooltip.offsetHeight + 8 <= clientHeight ? below : Math.max(8, event.clientY - tooltip.offsetHeight - 10);
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
    window.addEventListener('blur', hide);
    window.addEventListener('health-intel:map-fullscreen-change', hide);
});
