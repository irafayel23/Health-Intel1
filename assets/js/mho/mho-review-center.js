// The two review queues retain their forms, filters and permissions.
(() => {
    document.addEventListener('DOMContentLoaded', () => {
        const field = id => document.getElementById(id);
        if (!field('view-review-center')) return;
        const tabs = [field('review-disease-tab'), field('review-resident-tab')];
        const panels = [field('view-disease-review'), field('view-vital-review')];
        let selected = 0;
        function select(index, refresh = true) {
            selected = index;
            tabs.forEach((tab, i) => {
                tab.setAttribute('aria-selected', String(i === index));
                tab.setAttribute('tabindex', i === index ? '0' : '-1');
                panels[i].hidden = i !== index;
            });
            if (refresh) window.dispatchEvent(new Event(index === 0
                ? 'health-intel:disease-review-opened' : 'health-intel:resident-review-opened'));
        }
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => select(index));
            tab.addEventListener('keydown', event => {
                const target = event.key === 'Home' ? 0 : event.key === 'End' ? 1
                    : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 1 - index : null;
                if (target === null) return;
                event.preventDefault();
                select(target);
                tabs[target].focus();
            });
        });
        document.querySelector('[data-target="view-review-center"]')?.addEventListener('click', () => select(selected));
        select(0, false);
    });
})();
