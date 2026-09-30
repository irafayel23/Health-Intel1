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
    const todayInManila = () => window.HealthIntelDate.todayInManila();

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

    function renderCategories() { HealthIntelEncoding.populateConditions('walkin',categories); }

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
        field('walkin-save').disabled = !result.data.barangays.length;
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
                for (const value of [window.HealthIntelDate.formatCaseDate(item.date_recorded), item.patient_name || 'Not recorded', item.barangay_name, HealthIntelEncoding.conditionLabel(item), item.status || 'Not recorded']) {
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
        HealthIntelEncoding.bindCondition('walkin');
        HealthIntelEncoding.enhanceSelect(field('walkin-barangay'),{searchable:true});
        HealthIntelEncoding.enhanceSelect(field('walkin-severity'));
        window.addEventListener('health-intel:classification-reviewed',()=>{loadOptions().catch(optionsFailed);loadRecent();});
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
            let condition;
            try { condition=HealthIntelEncoding.conditionPayload('walkin'); } catch(error) { showStatus(error.message,'error');return; }
            if(!field('walkin-barangay').value||!field('walkin-severity').value){showStatus('Select the barangay and recorded severity.','error');return;}
            const payload = {
                first_name: field('walkin-first').value.trim(),
                last_name: field('walkin-last').value.trim(),
                birthdate,
                date_recorded: date.value,
                barangay_id: Number(field('walkin-barangay').value),
                purok: field('walkin-purok').value.trim(),
                ...condition,
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
                field('walkin-unlisted').hidden=true;
                for(const id of ['walkin-disease','walkin-severity','walkin-barangay'])field(id).dispatchEvent(new Event('change',{bubbles:true}));
                date.value = todayInManila();
                updateAge();
                renderCategories();
                showStatus(`Case #REC-${result.id} saved.${result.review_status==='Pending'?' The condition needs MHO review.':' It is assigned to the selected barangay.'}`, 'success');
                await loadRecent();
                window.dispatchEvent(new Event('health-intel:cases-changed'));
                if (typeof window.updateDynamicChart === 'function') window.updateDynamicChart();
            } catch (error) {
                showStatus(error.message || 'The case could not be saved. Please try again.', 'error');
            } finally { save.disabled = false; }
        });
    });
})();
