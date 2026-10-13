// Consultation information belongs to a visit; returning visits retain the original disease case.
(() => {
    const safe = value => HealthIntelEncoding.escape(value);
    function markup() {
        return `<section><h3>2. Consultation details</h3><p class="hi-field-help">Choose how the patient was seen. Record only information available from the visit.</p><div class="hi-encode-grid">
        <div><label for="swal-transaction">Mode of transaction *</label><select id="swal-transaction"><option value="">Select mode</option><option>Walk-in</option><option>Visited</option><option>Referral</option></select></div>
        <div><label for="swal-nature">Nature of visit *</label><select id="swal-nature"><option value="">Select nature of visit</option><option>New consultation/case</option><option>New admission</option><option>Follow-up visit</option></select></div>
        <div id="swal-referral-fields" class="hi-encode-wide" hidden><div class="hi-encode-grid">
        <div><label for="swal-referred-by">Referred by <span class="hi-field-help">(optional)</span></label><input id="swal-referred-by" maxlength="500" placeholder="Provider or referring facility"></div>
        <div><label for="swal-referral-reason">Reason for referral *</label><textarea id="swal-referral-reason" rows="2" maxlength="1000" placeholder="Copy the reason from the referral"></textarea></div></div></div>
        <div><label for="swal-case-date">Consultation date *</label><input id="swal-case-date" type="date" min="1900-01-01"><p class="hi-field-help">For a new case, this is the date used in disease reports.</p></div>
        <div><label for="swal-time-hour">Consultation time <span class="hi-field-help">(optional)</span></label><div class="hi-consultation-time">
        <input id="swal-time-hour" inputmode="numeric" maxlength="2" placeholder="Hour" aria-label="Consultation hour, 1 to 12">
        <input id="swal-time-minute" inputmode="numeric" maxlength="2" placeholder="Min" aria-label="Consultation minutes, 00 to 59">
        <select id="swal-time-period" aria-label="Consultation AM or PM"><option value="">AM/PM</option><option>AM</option><option>PM</option></select></div><p class="hi-field-help">Use the recorded time in the Philippines.</p></div>
        <div id="swal-existing-case-fields" class="hi-encode-wide" hidden><label for="swal-existing-case">Existing disease case *</label><select id="swal-existing-case"><option value="">Enter patient details to find matching cases</option></select><p id="swal-existing-case-note" class="hi-field-help" role="status">An admission or follow-up adds a visit to the selected case and does not add another disease case.</p></div></div></section>
        <section><h3>3. Measurements</h3><p class="hi-field-help">Record all four measurements from this consultation. These values do not assign a diagnosis or severity.</p><div class="hi-encode-grid">
        <div><label for="swal-bp">Blood pressure (mmHg) *</label><input id="swal-bp" required inputmode="numeric" maxlength="7" placeholder="e.g. 120/80"><p class="hi-field-help">Systolic / diastolic</p></div>
        <div><label for="swal-temperature">Temperature (°C) *</label><input id="swal-temperature" required inputmode="decimal" maxlength="6" placeholder="e.g. 36.5"><p class="hi-field-help">Use degrees Celsius</p></div>
        <div><label for="swal-height">Height (cm) *</label><input id="swal-height" required inputmode="decimal" maxlength="6" placeholder="e.g. 165"><p class="hi-field-help">Use centimetres</p></div>
        <div><label for="swal-weight">Weight (kg) *</label><input id="swal-weight" required inputmode="decimal" maxlength="7" placeholder="e.g. 60.5"><p class="hi-field-help">Use kilograms</p></div></div></section>`;
    }
    function bind(controls) {
        const events=new AbortController(), field=id=>document.getElementById(id), options={signal:events.signal};
        let cases=[],loaded=false,failed=false,closed=false;
        const returning=()=>['New admission','Follow-up visit'].includes(field('swal-nature').value);
        const refresh=()=>{
            if(closed)return;
            field('swal-referral-fields').hidden=field('swal-transaction').value!=='Referral';
            field('swal-existing-case-fields').hidden=!returning();
            field('swal-condition-fields').hidden=returning();
            if(!returning())return;
            const select=field('swal-existing-case'), previous=select.value, lower=s=>String(s||'').trim().toLocaleLowerCase('en');
            const birthdate=HealthIntelDate.parseBirthdate(field('swal-birthdate').value);
            const matching=cases.filter(row=>lower(row.first_name)===lower(field('swal-fname').value)&&lower(row.last_name)===lower(field('swal-lname').value)&&lower(row.suffix)===lower(field('swal-suffix').value)&&String(row.birthdate||'').slice(0,10)===birthdate&&(!row.is_deceased||(row.death_date&&field('swal-case-date').value<=row.death_date)));
            select.replaceChildren(new Option(!loaded?'Loading cases…':matching.length?'Select the original disease case':'No matching case — check name, suffix and birthdate',''));
            matching.forEach(row=>select.add(new Option(`#REC-${row.id} · ${HealthIntelEncoding.conditionLabel(row)} · ${HealthIntelDate.formatCaseDate(row.date_recorded)}`,String(row.id))));
            if(matching.some(row=>String(row.id)===previous))select.value=previous;
            select.disabled=!loaded||failed||!matching.length;
            select._hiSelect?.refresh();
            field('swal-existing-case-note').textContent=failed?'Cases could not be loaded. Close and reopen the form to retry.':'An admission or follow-up adds a visit to the selected case and does not add another disease case.';
        };
        for(const id of ['swal-transaction','swal-nature','swal-existing-case','swal-time-period','swal-suffix'])controls.push(HealthIntelEncoding.enhanceSelect(field(id),{allowEmpty:id==='swal-suffix'}));
        for(const id of ['swal-transaction','swal-nature','swal-suffix'])field(id).addEventListener('change',refresh,options);
        field('swal-case-date').addEventListener('change',refresh,options);
        for(const id of ['swal-fname','swal-lname','swal-birthdate'])field(id).addEventListener('input',refresh,options);
        for(const id of ['swal-time-hour','swal-time-minute','swal-bp','swal-temperature','swal-height','swal-weight']) {
            const input=field(id), allowed=id==='swal-bp'?/[^\d/]/:id.startsWith('swal-time-')?/[^\d]/:/[^\d.]/;
            input.addEventListener('beforeinput',e=>{if(e.inputType==='insertText'&&e.data&&allowed.test(e.data))e.preventDefault();},options);
        }
        fetch('http://localhost:3000/api/patients').then(async response=>{const result=await response.json();if(!response.ok||!result.success)throw Error();cases=result.data;loaded=true;refresh();}).catch(()=>{failed=true;loaded=true;refresh();});
        refresh();
        const consultation=()=>{
            const value=id=>field(id).value.trim(),nature=value('swal-nature');
            if(!value('swal-transaction')||!nature)throw Error('Select the mode of transaction and nature of visit.');
            const hour=value('swal-time-hour'),minute=value('swal-time-minute'),period=value('swal-time-period');
            let time=null;
            if(hour||minute||period){
                if(!/^\d{1,2}$/.test(hour)||Number(hour)<1||Number(hour)>12||!/^\d{1,2}$/.test(minute)||Number(minute)>59||!['AM','PM'].includes(period))throw Error('Complete the consultation hour (1–12), minutes (00–59) and AM/PM, or leave all three blank.');
                time=String(Number(hour)%12+(period==='PM'?12:0)).padStart(2,'0')+':'+minute.padStart(2,'0');
            }
            const caseId=returning()?Number(value('swal-existing-case')):null;
            if(returning()&&(!Number.isSafeInteger(caseId)||caseId<1))throw Error('Select the existing disease case. If it is not recorded yet, first record it as a new consultation/case.');
            if(value('swal-transaction')==='Referral'&&!value('swal-referral-reason'))throw Error('Enter the reason for referral from the available referral information.');
            return {transaction_mode:value('swal-transaction'),nature_of_visit:nature,consultation_time:time,
                referred_by:value('swal-referred-by'),referral_reason:value('swal-referral-reason'),blood_pressure:value('swal-bp'),temperature_c:value('swal-temperature'),height_cm:value('swal-height'),weight_kg:value('swal-weight'),case_id:caseId};
        };
        return {destroy(){closed=true;events.abort();},consultation,payload(){
            validateMeasurements();
            return {visit:consultation(),condition:returning()?{disease:cases.find(row=>row.id===Number(field('swal-existing-case').value)).disease}:HealthIntelEncoding.conditionPayload('swal')};
        }};
    }
    function formError(id,message) {const error=Error(message);error.field=id;return error;}
    function validateMeasurements(prefix='swal') {
        const value=id=>document.getElementById(id.replace(/^swal-/,prefix+'-')).value.trim();
        const match=/^(\d{1,3})\s*\/\s*(\d{1,3})$/.exec(value('swal-bp'));
        if(!match||match.slice(1).some(n=>Number(n)<1||Number(n)>500))throw formError(prefix+'-bp','Enter blood pressure as systolic/diastolic, for example 120/80.');
        for(const [id,label,max] of [['swal-temperature','temperature in °C',100],['swal-height','height in cm',500],['swal-weight','weight in kg',1500]]){
            const raw=value(id);if(!/^\d+(?:\.\d{1,2})?$/.test(raw)||Number(raw)<=0||Number(raw)>max)throw formError(id.replace(/^swal-/,prefix+'-'),`Enter ${label} as a positive number (up to ${max}) with no more than two decimal places.`);
        }
    }
    function wizard(visitControl) {
        const sections=[...document.querySelectorAll('.hi-encode > section')],events=new AbortController();
        let step=0;
        const labels=['Patient','Consultation','Measurements','Disease & notes'];
        const shortLabels=['Patient','Visit','Vitals','Review'];
        const progress=document.getElementById('hi-visit-progress');
        progress.innerHTML=`<p id="hi-visit-step-status" role="status" class="hi-step-status"></p><ol class="hi-visit-steps">${labels.map((label,i)=>`<li aria-label="Step ${i+1}: ${label}" data-short-label="${shortLabels[i]}"><span class="hi-step-number" aria-hidden="true">${i+1}</span><span class="hi-step-label">${label}</span></li>`).join('')}</ol>`;
        const back=document.createElement('button');back.type='button';back.className='hi-visit-back';back.textContent='Back';
        Swal.getActions().prepend(back);
        const clearError=()=>Swal.resetValidationMessage();
        document.querySelector('.hi-encode').addEventListener('input',clearError,{signal:events.signal});
        document.querySelector('.hi-encode').addEventListener('change',clearError,{signal:events.signal});
        const render=()=>{
            sections.forEach((section,i)=>section.hidden=i!==step);
            progress.querySelectorAll('li').forEach((item,i)=>{item.dataset.stage=i===step?'current':i<step?'complete':'pending';if(i===step)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
            document.getElementById('hi-visit-step-status').textContent=`Step ${step+1} of 4 · ${labels[step]}`;
            back.hidden=step===0;Swal.getConfirmButton().textContent=step===3?'Save record':'Continue';
            document.querySelector('.swal2-html-container').scrollTop=0;
            if(step===3){
                const summary=document.getElementById('hi-visit-save-summary'), v=visitControl.consultation();
                summary.textContent=v.case_id?`Saving a ${v.nature_of_visit.toLowerCase()} under case #REC-${v.case_id}. The original disease case count stays the same.`:'Saving one new disease case and its consultation details.';
            }
            sections[step].querySelector('input:not([readonly]),.hi-select-trigger')?.focus({preventScroll:true});
        };
        back.addEventListener('click',()=>{if(Swal.isLoading())return;step=Math.max(0,step-1);Swal.resetValidationMessage();render();},{signal:events.signal});
        const validate=()=>{
            const field=id=>document.getElementById(id),value=id=>field(id).value.trim();
            if(step===0){
                for(const [id,label] of [['swal-lname','family name'],['swal-fname','first name'],['swal-purok','purok / zone']])if(!value(id))throw formError(id,`Enter the patient's ${label}.`);
                const birthdate=HealthIntelDate.parseBirthdate(value('swal-birthdate'));
                if(!birthdate||birthdate>HealthIntelDate.todayInManila())throw formError('swal-birthdate','Enter a real birthdate as MM/DD/YYYY, on or before today.');
                if(value('swal-age')==='')throw formError('swal-birthdate','Check the birthdate; the recorded age must be between 0 and 130.');
            }else if(step===1){
                visitControl.consultation();
                const date=value('swal-case-date'),birthdate=HealthIntelDate.parseBirthdate(value('swal-birthdate'));
                if(!date||date<'1900-01-01'||date>HealthIntelDate.todayInManila()||date<birthdate)throw formError('swal-case-date','Enter a consultation date on or after the birthdate and on or before today.');
            }else if(step===2)validateMeasurements();
        };
        render();
        return {advance(){if(step===3)return false;validate();step++;Swal.resetValidationMessage();render();return true;},destroy(){events.abort();back.remove();}};
    }
    function formatTime(time) {
        if(!time)return 'Time not recorded';
        const [hour,minute]=time.split(':').map(Number);
        return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour<12?'AM':'PM'}`;
    }
    function renderResidentHistory(visits) {
        const container=document.getElementById('profile-visits-list');
        if(!container)return;
        const count=document.getElementById('dossier-visits');if(count)count.textContent=visits.length;
        const summary=document.getElementById('dossier-visit-summary');
        if(summary){const followups=visits.filter(v=>v.nature_of_visit==='Follow-up visit').length,admissions=visits.filter(v=>v.nature_of_visit==='New admission').length;summary.textContent=`${followups} follow-up${followups===1?'':'s'} · ${admissions} admission${admissions===1?'':'s'}`;}
        const measured=(value,unit)=>value==null?'Not recorded':safe(value)+(unit?' '+unit:'');
        container.innerHTML=visits.length?visits.map(v=>`<article class="hi-visit-card">
            <header><div><span class="hi-visit-nature">${safe(v.nature_of_visit)}</span><p class="hi-visit-date">${safe(HealthIntelDate.formatCaseDate(v.consultation_date))} · ${safe(formatTime(v.consultation_time))}</p></div><span class="hi-visit-case-ref">#REC-${Number(v.case_id)}</span></header>
            <p class="hi-visit-condition">${HealthIntelEncoding.conditionCell(v)} <span>· ${safe(v.transaction_mode)}</span></p>
            <dl class="hi-visit-measurements"><div><dt>Blood pressure</dt><dd>${measured(v.blood_pressure,'mmHg')}</dd></div><div><dt>Temperature</dt><dd>${measured(v.temperature_c,'°C')}</dd></div><div><dt>Height</dt><dd>${measured(v.height_cm,'cm')}</dd></div><div><dt>Weight</dt><dd>${measured(v.weight_kg,'kg')}</dd></div></dl>
            ${v.transaction_mode==='Referral'?`<div class="hi-visit-referral"><strong>Referral</strong><p>Referred by: ${safe(v.referred_by||'Not recorded')}</p><p>Reason: ${safe(v.referral_reason||'Not recorded')}</p></div>`:''}
            <div class="hi-visit-notes"><p><strong>Visit severity:</strong> ${safe(v.severity)}</p><p><strong>Symptoms / remarks:</strong> ${safe(v.remarks||'None recorded')}</p></div>
        </article>`).join(''):'<div class="hi-history-empty"><strong>No consultations recorded yet</strong><p>Admissions and follow-ups saved with the updated form will appear here. Older disease cases remain available in the case history above.</p></div>';
    }
    async function show(caseId) {
        Swal.fire({title:`Visits · Case #REC-${caseId}`,customClass:{popup:'hi-dialog'},didOpen:()=>Swal.showLoading()});
        try {
            const response=await fetch(`http://localhost:3000/api/patients/${caseId}/visits`),result=await response.json();
            if(!response.ok||!result.success)throw Error(result.error||'Visit history could not be loaded.');
            const html=result.data.length?result.data.map(visit=>`<section class="hi-review-summary"><strong>${safe(visit.nature_of_visit)}</strong><p>${safe(HealthIntelDate.formatCaseDate(visit.consultation_date))} · ${safe(formatTime(visit.consultation_time))} · ${safe(visit.transaction_mode)}</p>
                <p>BP: ${safe(visit.blood_pressure||'Not measured')} · Temperature: ${safe(visit.temperature_c==null?'Not measured':visit.temperature_c+' °C')}<br>Height: ${safe(visit.height_cm==null?'Not measured':visit.height_cm+' cm')} · Weight: ${safe(visit.weight_kg==null?'Not measured':visit.weight_kg+' kg')}</p>
                ${visit.transaction_mode==='Referral'?`<p>Referred by: ${safe(visit.referred_by||'Not recorded')}<br>Reason: ${safe(visit.referral_reason||'Not recorded')}</p>`:''}<p>Recorded severity: ${safe(visit.severity)}<br>Symptoms / remarks: ${safe(visit.remarks||'None recorded')}</p></section>`).join(''):'<p>No structured visits were recorded for this older case. Its original case details remain in the medical dossier.</p>';
            Swal.fire({title:`Visits · Case #REC-${caseId}`,html:`<div class="hi-review-dialog">${html}</div>`,customClass:{popup:'hi-dialog'},confirmButtonText:'Close',width:680});
        }catch(error){Swal.fire('Visit history unavailable',error.message,'error');}
    }
    window.HealthIntelVisits={markup,bind,show,formatTime,validateMeasurements,wizard,renderResidentHistory};
})();
