// Focus and background isolation for the existing custom portal overlays.
(() => {
    let current = null;
    const focusable = modal => [...modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
        .filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
    function close(modal) {
        if (!current || current.modal !== modal) return;
        const state = current;
        current = null;
        modal.classList.add('hidden');
        modal.style.display = 'none';
        state.background.forEach(([node, inert]) => { node.inert = inert; });
        if (state.trigger?.isConnected) state.trigger.focus();
    }
    function open(modal) {
        if (current?.modal === modal) return;
        if (current) close(current.modal);
        const trigger = document.activeElement;
        const background = [...document.body.children].filter(node => node !== modal && !node.contains(modal))
            .map(node => [node, node.inert]);
        background.forEach(([node]) => { node.inert = true; });
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        current = { modal, trigger, background };
        (modal.querySelector('[data-modal-initial-focus]') || focusable(modal)[0] || modal).focus();
    }
    document.addEventListener('keydown', event => {
        if (!current || document.querySelector('.swal2-container')) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            close(current.modal);
        } else if (event.key === 'Tab') {
            const items = focusable(current.modal), first = items[0], last = items[items.length - 1];
            if (!first) { event.preventDefault(); current.modal.focus(); }
            else if (event.shiftKey && (document.activeElement === first || !current.modal.contains(document.activeElement))) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !current.modal.contains(document.activeElement))) {
                event.preventDefault(); first.focus();
            }
        }
    });
    window.HealthIntelModal = { open, close };
})();
