(() => {
    const api = 'http://localhost:3000';
    const field = id => document.getElementById(id);
    let categories = [];
    function showStatus(message, state = 'info') {
        const status = field('walkin-status');
        status.textContent = message;
        status.dataset.state = state;
        status.hidden = !message;
    }
    const todayInManila = () => {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(new Date());
        return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
    };

    function updateAge() {
        const birthdate = window.HealthIntelDate.parseBirthdate(field('walkin-birthdate').value);
        const caseDate = field('walkin-date').value;
        const ageField = field('walkin-age');
        ageField.value = '';
        if (!birthdate || !caseDate || birthdate > caseDate) return;
        const [by, bm, bd] = birthdate.split('-').map(Number);
        const [cy, cm, cd] = caseDate.split('-').map(Number);
        const age = cy - by - (cm < bm || (cm === bm && cd < bd) ? 1 : 0);
        if (age >= 0 && age <= 130) ageField.value = String(age);
    }

    function addOption(select, value, label) {
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = label;
        select.append(option);
    }

    function renderCategories() {
        const select = field('walkin-disease');
        const search = field('walkin-disease-search').value.trim().toLocaleLowerCase();
        const includeHistory = field('walkin-show-history').checked || Boolean(search);
        const selected = select.value;
        select.replaceChildren();
        addOption(select, '', 'Select diagnosed disease / case');
        const groups = [
            { title: 'Current registry', items: categories.filter(item => item.registry_status === 'Active') },
            { title: 'Historical names — verify diagnosis', items: includeHistory ? categories.filter(item => item.registry_status !== 'Active') : [] }
        ];
        let count = 0;
        for (const group of groups) {
            const matches = group.items.filter(item => item.name.toLocaleLowerCase().includes(search));
            if (!matches.length) continue;
            const optgroup = document.createElement('optgroup');
            optgroup.label = group.title;
            for (const item of matches) addOption(optgroup, item.name, item.name);
            select.append(optgroup);
            count += matches.length;
        }
        if (!count) addOption(select, '', 'No matching category');
        if ([...select.options].some(option => option.value === selected && option.value)) select.value = selected;
        const current = categories.filter(item => item.registry_status === 'Active').length;
        const historical = categories.length - current;
        field('walkin-disease-note').textContent = search
            ? `${count} matching ${count === 1 ? 'category' : 'categories'}. Clear search to see current registry choices.`
            : `${current} current registry ${current === 1 ? 'choice' : 'choices'}${historical ? `; ${historical} historical ${historical === 1 ? 'name' : 'names'} available through search or the checkbox` : ''}. Ask the Admin to register a new category.`;
    }

    async function loadOptions() {
        const response = await fetch(`${api}/api/mho/walk-in-options`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Walk-in form choices could not be loaded.');
        const barangay = field('walkin-barangay');
        barangay.replaceChildren();
        addOption(barangay, '', 'Select resident barangay');
        for (const item of result.data.barangays) addOption(barangay, item.id, item.name);
        categories = result.data.diseases;
        renderCategories();
        field('walkin-retry-options').hidden = true;
        field('walkin-save').disabled = !result.data.barangays.length || !result.data.diseases.length;
        showStatus('');
    }

    function optionsFailed(error) {
        const barangay = field('walkin-barangay');
        const disease = field('walkin-disease');
        barangay.replaceChildren();
        disease.replaceChildren();
        addOption(barangay, '', 'Barangays unavailable');
        addOption(disease, '', 'Categories unavailable');
        field('walkin-save').disabled = true;
        field('walkin-retry-options').hidden = false;
        field('walkin-disease-note').textContent = 'The form choices could not be loaded. Check the server connection and try again.';
        showStatus(error.message || 'Walk-in form choices could not be loaded.', 'error');
    }

    async function loadRecent() {
        const body = field('walkin-recent-body');
        body.replaceChildren();
        try {
            const response = await fetch(`${api}/api/mho/walk-in-cases`);
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Recent entries could not be loaded.');
            if (!result.data.length) {
                const row = body.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 5;
                cell.textContent = 'No walk-in cases encoded by this account yet.';
                return;
            }
            for (const item of result.data) {
                const row = body.insertRow();
                for (const value of [window.HealthIntelDate.formatCaseDate(item.date_recorded), item.patient_name || 'Not recorded', item.barangay_name, item.disease, item.status || 'Not recorded']) {
                    row.insertCell().textContent = value ?? 'Not recorded';
                }
            }
        } catch (error) {
            const row = body.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5;
            cell.textContent = error.message || 'Recent entries could not be loaded.';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const form = field('mho-walkin-form');
        if (!form) return;
        const save = field('walkin-save');
        const date = field('walkin-date');
        date.max = todayInManila();
        date.value = date.max;
        field('walkin-birthdate').addEventListener('input', updateAge);
        date.addEventListener('change', updateAge);
        field('walkin-disease-search').addEventListener('input', renderCategories);
        field('walkin-show-history').addEventListener('change', renderCategories);
        field('walkin-retry-options').addEventListener('click', () => loadOptions().catch(optionsFailed));
        loadOptions().catch(optionsFailed);
        loadRecent();
        document.querySelector('[data-target="view-history"]')?.addEventListener('click', loadRecent);

        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (save.disabled) return;
            const birthdate = window.HealthIntelDate.parseBirthdate(field('walkin-birthdate').value);
            if (!birthdate) { showStatus('Enter a real birthdate as MM/DD/YYYY.', 'error'); return; }
            if (!field('walkin-age').value) { showStatus('Check the birthdate and case date.', 'error'); return; }
            const payload = {
                first_name: field('walkin-first').value.trim(),
                last_name: field('walkin-last').value.trim(),
                birthdate,
                date_recorded: date.value,
                barangay_id: Number(field('walkin-barangay').value),
                purok: field('walkin-purok').value.trim(),
                disease: field('walkin-disease').value,
                severity: field('walkin-severity').value,
                remarks: field('walkin-remarks').value,
                status: 'Active'
            };
            save.disabled = true;
            showStatus('Saving walk-in case…');
            try {
                const response = await fetch(`${api}/api/mho/walk-in-cases`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error || 'The case could not be saved.');
                form.reset();
                date.value = todayInManila();
                updateAge();
                renderCategories();
                showStatus(`Walk-in case #${result.id} was saved. It is assigned to the selected barangay.`, 'success');
                await loadRecent();
                window.dispatchEvent(new Event('health-intel:cases-changed'));
                if (typeof window.updateDynamicChart === 'function') window.updateDynamicChart();
            } catch (error) {
                showStatus(error.message || 'The case could not be saved. Please try again.', 'error');
            } finally { save.disabled = false; }
        });
    });
})();
