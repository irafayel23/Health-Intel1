// Shared individual case export for the BHW and MHO resident profiles.
(() => {
    function mount(container, cases, selectedCase = null) {
        container.replaceChildren();
        if (!cases.length) return;

        const form = document.createElement('form');
        form.className = 'hi-case-download';
        const label = document.createElement('label');
        label.textContent = 'Case to download';
        const select = document.createElement('select');
        select.add(new Option('Choose a case', ''));
        for (const record of cases) {
            const date = record.date_recorded || 'Date not recorded';
            select.add(new Option(`REC-${record.id} · ${HealthIntelEncoding.conditionLabel(record)} · ${date}`,record.id));
        }
        if (cases.length === 1) select.value = String(cases[0].id);
        else if (selectedCase && cases.some(record => Number(record.id) === Number(selectedCase.id))) {
            select.value = String(selectedCase.id);
        }

        const button = document.createElement('button');
        button.type = 'submit';
        button.className = 'hi-vital-button';
        button.textContent = 'Download case PDF';
        button.disabled = !select.value;
        const status = document.createElement('p');
        status.setAttribute('role','status');

        select.addEventListener('change',() => {
            button.disabled = !select.value;
            status.textContent = '';
        });
        form.addEventListener('submit',async event => {
            event.preventDefault();
            if (button.disabled) return;
            const id = select.value;
            select.disabled = button.disabled = true;
            status.textContent = 'Preparing PDF…';
            try {
                await HealthIntel.download(HealthIntel.apiOrigin + '/api/patients/' + encodeURIComponent(id) + '/case-summary.pdf', {}, 'Health-Intel-REC-' + id + '.pdf');
                status.textContent = 'PDF sent to your browser for download.';
            } catch (error) {
                status.textContent = error.message || 'The PDF could not be downloaded. Please try again.';
            } finally {
                select.disabled = button.disabled = false;
            }
        });
        label.append(select);
        form.append(label,button,status);
        container.append(form);
    }
    window.HealthIntelCaseDownload = {mount};
})();

