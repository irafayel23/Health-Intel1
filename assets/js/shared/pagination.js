(() => {
    'use strict';

    function showStart(content, dialogBody) {
        const results = typeof content === 'string' ? document.getElementById(content) : content;
        if (!results) return;
        const target = results.closest('table') || results;
        if (!target.getClientRects().length) return;

        if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
        target.focus({preventScroll:true});

        if (dialogBody) {
            const top = target.getBoundingClientRect().top - dialogBody.getBoundingClientRect().top;
            dialogBody.scrollTop += top - dialogBody.clientTop;
        } else {
            target.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
        }
    }

    globalThis.HealthIntelPagination = {showStart};
})();
