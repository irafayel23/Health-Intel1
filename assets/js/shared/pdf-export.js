// PDF libraries are needed only for BHW's client-side report export.
(() => {
    let pending;
    function script(src) {
        return new Promise((resolve, reject) => {
            const tag = document.createElement('script');
            tag.src = src;
            tag.onload = resolve;
            tag.onerror = () => { tag.remove(); reject(new Error('PDF tools could not load. Check the connection and try again.')); };
            document.head.append(tag);
        });
    }
    window.HealthIntelPDF = {
        ensure() {
            if (window.jspdf?.jsPDF?.API?.autoTable) return Promise.resolve();
            if (!pending) pending = (async () => {
                if (!window.jspdf?.jsPDF) await script('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                if (!window.jspdf.jsPDF.API.autoTable) await script('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
            })().finally(() => { pending = null; });
            return pending;
        }
    };
})();
