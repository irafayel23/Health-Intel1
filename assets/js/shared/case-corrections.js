(() => {
    const escape = window.HealthIntelText.escape;
    let busy = false;
    async function open(id) {
        if (busy) return;
        busy = true;
        try {
            const response = await fetch('http://localhost:3000/api/patients/' + id + '/correction');
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'The correction form could not be loaded.');
            const data = result.data;
            const options = [...new Set([data.disease, ...data.diseases].filter(Boolean))].map(name => `<option value="${escape(name)}" ${name === data.disease ? 'selected' : ''}>${escape(name)}</option>`).join('');
            const locked = data.identity_ready ? '' : 'disabled';
            const classificationPending = ['Pending','Clarification'].includes(data.disease_review_status);
            const diseaseLocked = classificationPending ? 'disabled' : locked;
            const note = !data.identity_ready ? 'This historical record needs source/profile review before date or disease changes. Recorded severity can still be corrected.' : data.has_birthdate ? 'Age on the case date is recalculated when the date changes.' : 'No birthdate is recorded. The existing age will be preserved.';
            const saved = await Swal.fire({
                title: 'Correct Case Record', width: 720, customClass:{popup:'hi-dialog hi-correction-dialog'}, confirmButtonText: 'Save correction', showCancelButton: true,
                showLoaderOnConfirm: true, allowOutsideClick: () => !Swal.isLoading(),
                html: `<div class="text-left space-y-4">
                    <p class="text-sm text-slate-600 dark:text-slate-300">Case #REC-${escape(data.id)}. Edit the proposed values below. The original values and your justification are saved in the audit trail.</p>
                    <div class="hi-correction-comparison">
                        <div class="hi-correction-saved">
                            <h3>Saved values <span>(read-only)</span></h3>
                            <dl>
                                <div><dt>Case date</dt><dd>${escape(data.date_recorded || 'Not recorded')}</dd></div>
                                <div><dt>Recorded disease / case</dt><dd>${escape((classificationPending && data.disease_reported) || data.disease || 'Not recorded')}</dd></div>
                                <div><dt>Recorded severity</dt><dd>${escape(data.severity || 'Not recorded')}</dd></div>
                            </dl>
                        </div>
                        <div class="hi-correction-proposed">
                            <h3>Proposed values</h3>
                            <div><label class="block text-sm font-medium" for="correction-date">Case date</label>
                                <input id="correction-date" type="date" class="w-full rounded-lg border px-3 py-2 disabled:opacity-60" value="${escape(data.date_recorded)}" ${locked}></div>
                            <div><label class="block text-sm font-medium" for="correction-disease">Recorded disease / case</label>
                                <select id="correction-disease" class="w-full rounded-lg border px-3 py-2 disabled:opacity-60" ${diseaseLocked}>${options}</select></div>
                            <div><label class="block text-sm font-medium" for="correction-severity">Recorded severity</label>
                                <select id="correction-severity" class="w-full rounded-lg border px-3 py-2"><option value="" disabled hidden ${['Mild','Monitored','High Risk'].includes(data.severity) ? '' : 'selected'}>Select recorded severity</option>${['Mild','Monitored','High Risk'].map(name => `<option ${name === data.severity ? 'selected' : ''}>${name}</option>`).join('')}</select></div>
                        </div>
                    </div>
                    <p class="text-xs text-slate-600 dark:text-slate-300">${escape(note)}${classificationPending ? ' MHO must review the reported condition before its category changes.' : ''}</p>
                    <label class="block text-sm font-medium" for="correction-reason">Justification for correction</label>
                    <textarea id="correction-reason" rows="3" maxlength="1000" class="w-full rounded-lg border px-3 py-2" placeholder="Explain what was entered incorrectly and how you confirmed the correction."></textarea>
                </div>`,
                preConfirm: async () => {
                    const reason = document.getElementById('correction-reason').value.trim();
                    if (reason.length < 5) { Swal.showValidationMessage('Explain the correction using at least 5 characters.'); return false; }
                    try {
                        const response = await fetch('http://localhost:3000/api/patients/' + id + '/correction', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ date_recorded:data.identity_ready ? document.getElementById('correction-date').value : data.date_recorded, disease:document.getElementById('correction-disease').value, severity:document.getElementById('correction-severity').value, reason, version:data.version }) });
                        const result = await response.json();
                        if (!response.ok || !result.success) throw new Error(result.error || 'The correction could not be saved.');
                        return result;
                    } catch (error) { Swal.showValidationMessage(error.message); return false; }
                }
            });
            if (saved.isConfirmed) {
                window.dispatchEvent(new Event('health-intel:cases-changed'));
                window.dispatchEvent(new Event('health-intel:case-corrected'));
                await Swal.fire({icon:'success',title:'Correction saved',text:saved.value.message});
            }
        } catch (error) { await Swal.fire({icon:'error',title:'Correction unavailable',text:error.message}); }
        finally { busy = false; }
    }
    window.HealthIntelCorrections = { open };
})();
