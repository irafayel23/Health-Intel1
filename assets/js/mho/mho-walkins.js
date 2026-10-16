(() => {
    const api='http://localhost:3000',field=id=>document.getElementById(id),value=id=>field(id).value.trim();
    const todayInManila=()=>HealthIntelDate.todayInManila();
    let categories=[],matches=[],optionsReady=false,isSaving=false,matchTimer,matchRequest,matchVersion=0,recentVersion=0,returnCase=null,openVersion=0;
    const returning=()=>returnCase!==null||['New admission','Follow-up visit'].includes(value('walkin-nature'));
    function showStatus(message,state='info') {
        const status=field('walkin-status');status.textContent=message;status.dataset.state=state;status.hidden=!message;
    }
    function fail(id,message){const error=Error(message);error.field=id;throw error;}
    function focusField(id){const input=field(id);(input?.parentElement.querySelector('.hi-select-trigger')||input)?.focus();}
    function clearFieldErrors() {
        field('mho-walkin-form').querySelectorAll('.walkin-field-error').forEach(node=>node.remove());
        field('mho-walkin-form').querySelectorAll('[aria-invalid="true"]').forEach(input=>{
            input.removeAttribute('aria-invalid');
            const described=(input.getAttribute('aria-describedby')||'').split(' ').filter(id=>id&&!id.endsWith('-error'));
            described.length?input.setAttribute('aria-describedby',described.join(' ')):input.removeAttribute('aria-describedby');
        });
    }
    function fieldError(id,message) {
        const input=field(id);if(!input)return;
        const parent=input.closest('.walkin-field'),note=document.createElement('p');note.id=id+'-error';note.className='walkin-field-error';note.textContent=message;parent.append(note);
        for(const control of [input,parent.querySelector('.hi-select-trigger')].filter(Boolean)){
            control.setAttribute('aria-invalid','true');control.setAttribute('aria-describedby',((control.getAttribute('aria-describedby')||'')+' '+note.id).trim());
        }
        focusField(id);
    }
    function updateAge() {
        const birthdate=HealthIntelDate.parseBirthdate(value('walkin-birthdate')),date=value('walkin-date');
        field('walkin-age').value='';
        if(!birthdate||!date||birthdate>date)return;
        const [by,bm,bd]=birthdate.split('-').map(Number),[cy,cm,cd]=date.split('-').map(Number);
        const age=cy-by-(cm<bm||(cm===bm&&cd<bd)?1:0);
        if(age>=0&&age<=130)field('walkin-age').value=String(age);
    }
    function addOption(select,value,label){const option=document.createElement('option');option.value=String(value);option.textContent=label;select.append(option);}
    function renderCategories(){HealthIntelEncoding.populateConditions('walkin',categories);}
    async function loadOptions() {
        const response=await fetch(`${api}/api/mho/walk-in-options`),result=await response.json();
        if(!response.ok||!result.success)throw Error(result.error||'Form choices could not be loaded.');
        const barangay=field('walkin-barangay'),previous=barangay.value;
        barangay.replaceChildren();addOption(barangay,'','Select resident barangay');
        for(const item of result.data.barangays)addOption(barangay,item.id,item.name);
        if(result.data.barangays.some(row=>String(row.id)===previous))barangay.value=previous;
        categories=result.data.diseases;renderCategories();barangay._hiSelect?.refresh();
        optionsReady=!!result.data.barangays.length;field('walkin-save').disabled=!optionsReady||isSaving;
        field('walkin-retry-options').hidden=true;showStatus('');scheduleMatches();
    }
    function optionsFailed(error) {
        optionsReady=false;field('walkin-save').disabled=true;field('walkin-retry-options').hidden=false;
        field('walkin-disease-note').textContent='Choices could not be loaded. Use Retry loading choices before saving.';
        showStatus(error.message||'Form choices could not be loaded.','error');
    }
    function updateSummary() {
        const selected=matches.find(row=>String(row.id)===value('walkin-existing-case'));
        field('walkin-save-summary').textContent=returning()
            ?selected?value('walkin-nature')?`Saving a ${value('walkin-nature').toLowerCase()} under #REC-${selected.id} · ${HealthIntelEncoding.conditionLabel(selected)}. The original disease case count, status and severity stay unchanged.`
                :`Choose admission or follow-up for #REC-${selected.id} · ${HealthIntelEncoding.conditionLabel(selected)}. Enter measurements and notes from this visit.`
                :'Select the original disease case. This consultation will appear in resident history without adding another disease case.'
            :'Saving one new disease case and its consultation details to the selected resident barangay.';
        if(returning()&&selected)field('walkin-existing-case-note').textContent=HealthIntelEncoding.caseSummary(selected,value('walkin-nature'));
    }
    function matchChoices(label,rows=[]) {
        const select=field('walkin-existing-case');select.replaceChildren();addOption(select,'',label);
        for(const row of rows)select.add(HealthIntelEncoding.caseOption(row));
        select.disabled=!rows.length;select._hiSelect?.refresh();updateSummary();
    }
    function visitFields() {
        const referral=value('walkin-transaction')==='Referral';
        field('walkin-referral-fields').hidden=!referral;field('walkin-referral-reason').required=referral;
        field('walkin-existing-case-fields').hidden=!returning();field('walkin-condition-fields').hidden=returning();
        field('walkin-save').textContent=returning()?'Save consultation':'Save disease case';updateSummary();
    }
    function scheduleMatches() {
        clearTimeout(matchTimer);matchRequest?.abort();const version=++matchVersion;matches=[];
        field('walkin-retry-matches').hidden=true;matchChoices('Enter patient details to find a case');
        if(!returning())return;
        const birthdate=HealthIntelDate.parseBirthdate(value('walkin-birthdate'));
        if(!value('walkin-first')||!value('walkin-last')||!birthdate||!value('walkin-barangay')){
            field('walkin-existing-case-note').textContent='Enter the family name, first name, suffix, birthdate and resident barangay above.';return;
        }
        matchChoices('Finding matching cases…');field('walkin-existing-case-note').textContent='Looking up this patient in the selected barangay…';
        const identity={first_name:value('walkin-first'),last_name:value('walkin-last'),suffix:value('walkin-suffix'),birthdate,barangay_id:value('walkin-barangay'),consultation_date:value('walkin-date')};
        const target=returnCase;if(target!==null)identity.case_id=target;
        matchTimer=setTimeout(async()=>{
            matchRequest=new AbortController();
            try {
                const response=await fetch(`${api}/api/mho/walk-in-matches`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(identity),signal:matchRequest.signal}),result=await response.json();
                if(version!==matchVersion)return;
                if(!response.ok||!result.success)throw Error(result.error||'Matching cases could not be loaded.');
                matches=result.data;matchChoices(matches.length?'Select the original disease case':'No matching available case',matches);
                if(target!==null){
                    const selected=matches.find(row=>Number(row.id)===target&&row.date_recorded<=identity.consultation_date);
                    if(selected){field('walkin-existing-case').value=String(target);field('walkin-existing-case')._hiSelect?.refresh();updateSummary();}
                    else{matches=[];matchChoices('Selected case unavailable');}
                }
                field('walkin-existing-case-note').textContent=matches.length?'Up to 50 matching cases, newest original case first. Compare the case ID, original date, status and last consultation before choosing. The system does not choose automatically.':'No available case matches these details. Check the identity and barangay, or record the original disease case first.';
                if(target!==null)field('walkin-existing-case-note').textContent=matches.length?HealthIntelEncoding.caseSummary(matches.find(row=>Number(row.id)===target),value('walkin-nature')):'The selected case no longer matches this identity or visit date, or is archived. Check the details before saving.';
            }catch(error){
                if(version!==matchVersion||error.name==='AbortError')return;
                matchChoices('Matching cases unavailable');field('walkin-retry-matches').hidden=false;
                field('walkin-existing-case-note').textContent='Matching cases could not be loaded. Use Retry matching cases.';
            }
        },250);
    }
    function consultation() {
        const mode=value('walkin-transaction'),nature=value('walkin-nature');
        if(!['Walk-in','Visited','Referral'].includes(mode))fail('walkin-transaction','Select the mode of transaction.');
        if(!['New consultation/case','New admission','Follow-up visit'].includes(nature))fail('walkin-nature','Select the nature of visit.');
        const hour=value('walkin-time-hour'),minute=value('walkin-time-minute'),period=value('walkin-time-period');let time=null;
        if(hour||minute||period){
            if(!/^\d{1,2}$/.test(hour)||Number(hour)<1||Number(hour)>12||!/^\d{1,2}$/.test(minute)||Number(minute)>59||!['AM','PM'].includes(period))fail('walkin-time-hour','Complete the hour (1–12), minutes (00–59) and AM/PM, or leave all three blank.');
            time=String(Number(hour)%12+(period==='PM'?12:0)).padStart(2,'0')+':'+minute.padStart(2,'0');
        }
        const original=returning()?matches.find(row=>String(row.id)===value('walkin-existing-case')):null;
        if(returning()&&!original)fail('walkin-existing-case','Select a matching original disease case before saving this visit.');
        if(mode==='Referral'&&!value('walkin-referral-reason'))fail('walkin-referral-reason','Enter the reason from the referral information.');
        HealthIntelVisits.validateMeasurements('walkin');
        let condition;
        try {condition=original?{disease:original.disease}:HealthIntelEncoding.conditionPayload('walkin');}
        catch(error){error.field='walkin-disease';throw error;}
        return {visit:{transaction_mode:mode,nature_of_visit:nature,consultation_time:time,case_id:original?Number(original.id):null,
            ...HealthIntelVisits.followupPayload('walkin',value('walkin-date')),
            referred_by:mode==='Referral'?value('walkin-referred-by'):'',referral_reason:mode==='Referral'?value('walkin-referral-reason'):'',
            blood_pressure:value('walkin-bp'),temperature_c:value('walkin-temperature'),height_cm:value('walkin-height'),weight_kg:value('walkin-weight')},
            condition};
    }
    async function loadRecent() {
        const version=++recentVersion,body=field('walkin-recent-body');body.replaceChildren();
        const loading=body.insertRow().insertCell();loading.colSpan=6;loading.textContent='Loading recent consultations…';
        try {
            const response=await fetch(`${api}/api/mho/walk-in-cases`),result=await response.json();
            if(version!==recentVersion)return;
            if(!response.ok||!result.success)throw Error(result.error||'Recent consultations could not be loaded.');
            body.replaceChildren();
            const visits=result.visits||[],legacy=result.data.filter(row=>!row.has_visits);
            for(const [rows,isVisit] of [[visits,true],[legacy,false]])for(const item of rows){
                const row=body.insertRow(),date=HealthIntelDate.formatCaseDate(isVisit?item.consultation_date:item.date_recorded);
                const cells=[isVisit?`${date} · ${HealthIntelVisits.formatTime(item.consultation_time)}`:date,item.patient_name||'Not recorded',item.barangay_name,
                    isVisit?`${item.nature_of_visit} · ${item.transaction_mode}`:'Older case · no visit details',HealthIntelEncoding.conditionLabel(item),`#REC-${isVisit?item.case_id:item.id}`];
                for(const text of cells)row.insertCell().textContent=text??'Not recorded';
            }
            if(!body.children.length){const cell=body.insertRow().insertCell();cell.colSpan=6;cell.textContent='No consultations or older cases entered by this account yet.';}
        }catch(error){if(version!==recentVersion)return;body.replaceChildren();const cell=body.insertRow().insertCell();cell.colSpan=6;cell.textContent=error.message||'Recent consultations could not be loaded.';}
    }
    function bindViews() {
        const tabs=[field('walkin-record-tab'),field('walkin-recent-tab')],panels=[field('walkin-record-panel'),field('walkin-recent-panel')];
        function select(index) {
            tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.setAttribute('tabindex',i===index?'0':'-1');panels[i].hidden=i!==index;});
            const scroller=field('view-history').closest('.mho-page-scroll');
            if(scroller)scroller.scrollTop=0;else field('view-history').scrollIntoView({block:'start'});
            if(index===1)loadRecent();
        }
        tabs.forEach((tab,index)=>{
            tab.addEventListener('click',()=>select(index));
            tab.addEventListener('keydown',event=>{
                const target=event.key==='Home'?0:event.key==='End'?1:['ArrowLeft','ArrowRight'].includes(event.key)?1-index:null;
                if(target===null)return;event.preventDefault();select(target);tabs[target].focus();
            });
        });
    }
    async function openReturnVisit(detail){
        const current=++openVersion,person=detail?.person,caseId=detail?.caseId;
        if(isSaving||!person||person.is_deceased||!Number.isSafeInteger(caseId)||caseId<1)return;
        const draftIds=['walkin-first','walkin-last','walkin-suffix','walkin-birthdate','walkin-barangay','walkin-purok','walkin-time-hour','walkin-time-minute','walkin-time-period','walkin-existing-case','walkin-referred-by','walkin-referral-reason','walkin-bp','walkin-temperature','walkin-height','walkin-weight','walkin-disease','walkin-reported','walkin-source','walkin-severity','walkin-remarks'];
        const hasDraft=[...draftIds,'walkin-next-followup','walkin-followup-instructions'].some(id=>value(id))||value('walkin-transaction')!=='Walk-in'||value('walkin-nature')!=='New consultation/case'||value('walkin-date')!==todayInManila();
        if(hasDraft){
            const answer=await Swal.fire({icon:'question',titleText:'Replace unfinished consultation?',text:'The current form has entered details. Replace them with this patient and start a fresh visit?',showCancelButton:true,confirmButtonText:'Start fresh visit',cancelButtonText:'Keep current form',customClass:{popup:'hi-dialog'}});
            if(!answer.isConfirmed||current!==openVersion)return;
        }
        if(current!==openVersion||isSaving)return;
        document.querySelector('[data-target="view-history"]')?.click();field('walkin-record-tab').click();
        if(!optionsReady){try{await loadOptions();}catch(error){optionsFailed(error);return;}}
        if(current!==openVersion||isSaving)return;
        clearTimeout(matchTimer);matchRequest?.abort();++matchVersion;clearFieldErrors();
        field('mho-walkin-form').reset();returnCase=caseId;field('walkin-unlisted').hidden=true;
        for(const [id,entry] of [['walkin-first',person.first_name],['walkin-last',person.last_name],['walkin-suffix',person.suffix||''],['walkin-purok',person.purok||'']])field(id).value=entry||'';
        const birth=String(person.birthdate||'').slice(0,10).split('-');field('walkin-birthdate').value=birth.length===3?`${birth[1]}/${birth[2]}/${birth[0]}`:'';
        field('walkin-date').max=todayInManila();field('walkin-date').value=field('walkin-date').max;field('walkin-age').value='';
        if(!field('walkin-nature').querySelector('option[value=""]')){const option=new Option('Select admission or follow-up','');field('walkin-nature').prepend(option);}
        field('walkin-nature').value='';
        showStatus('Patient details filled. Choose admission or follow-up and enter new measurements and notes; previous visit values are not copied.');
        try{
            if(current!==openVersion)return;
            field('walkin-barangay').value=String(person.barangay_id);
            for(const id of ['walkin-suffix','walkin-barangay','walkin-nature','walkin-transaction','walkin-severity','walkin-time-period','walkin-disease'])field(id)._hiSelect?.refresh();
            updateAge();visitFields();scheduleMatches();focusField('walkin-nature');
        }catch(error){optionsFailed(error);}
    }
    document.addEventListener('DOMContentLoaded',()=>{
        const form=field('mho-walkin-form');if(!form)return;
        field('walkin-followup-plan').innerHTML=HealthIntelVisits.followupMarkup('walkin');
        bindViews();
        const save=field('walkin-save'),date=field('walkin-date');date.max=todayInManila();date.value=date.max;
        for(const name of ['input','change'])form.addEventListener(name,()=>{clearFieldErrors();if(field('walkin-status').dataset.state==='error')showStatus('');});
        HealthIntelDate.bindNumericBirthdate(field('walkin-birthdate'));
        field('walkin-birthdate').addEventListener('input',updateAge);date.addEventListener('change',updateAge);
        date.addEventListener('change',scheduleMatches);
        HealthIntelEncoding.bindCondition('walkin');HealthIntelEncoding.enhanceSelect(field('walkin-barangay'),{searchable:true});
        for(const id of ['walkin-severity','walkin-transaction','walkin-nature','walkin-time-period','walkin-existing-case','walkin-suffix'])HealthIntelEncoding.enhanceSelect(field(id),{allowEmpty:['walkin-suffix','walkin-time-period'].includes(id),searchable:id==='walkin-existing-case',searchPlaceholder:'Search case ID, disease or date…'});
        field('walkin-transaction').addEventListener('change',visitFields);
        field('walkin-nature').addEventListener('change',()=>{if(value('walkin-nature')==='New consultation/case')returnCase=null;visitFields();scheduleMatches();});
        const identityChanged=()=>{returnCase=null;++openVersion;visitFields();scheduleMatches();};
        for(const id of ['walkin-first','walkin-last','walkin-birthdate'])field(id).addEventListener('input',identityChanged);
        for(const id of ['walkin-suffix','walkin-barangay'])field(id).addEventListener('change',identityChanged);
        window.addEventListener('health-intel:record-return-visit',event=>openReturnVisit(event.detail));
        field('walkin-existing-case').addEventListener('change',updateSummary);
        for(const id of ['walkin-time-hour','walkin-time-minute','walkin-bp','walkin-temperature','walkin-height','walkin-weight']){
            const allowed=id==='walkin-bp'?/[^\d/]/:id.startsWith('walkin-time-')?/[^\d]/:/[^\d.]/;
            field(id).addEventListener('beforeinput',event=>{if(event.inputType==='insertText'&&event.data&&allowed.test(event.data))event.preventDefault();});
        }
        window.addEventListener('health-intel:classification-reviewed',()=>{loadOptions().catch(optionsFailed);loadRecent();});
        field('walkin-retry-options').addEventListener('click',()=>loadOptions().catch(optionsFailed));
        field('walkin-retry-matches').addEventListener('click',scheduleMatches);
        document.querySelector('[data-target="view-history"]')?.addEventListener('click',loadRecent);
        visitFields();loadOptions().catch(optionsFailed);loadRecent();
        form.addEventListener('submit',async event=>{
            event.preventDefault();if(save.disabled||isSaving)return;clearFieldErrors();
            let payload;
            try {
                for(const [id,label] of [['walkin-last','family name'],['walkin-first','first name'],['walkin-purok','purok / zone']])if(!value(id))fail(id,`Enter the patient's ${label}.`);
                const birthdate=HealthIntelDate.parseBirthdate(value('walkin-birthdate'));
                if(!birthdate)fail('walkin-birthdate','Enter a real birthdate as MM/DD/YYYY.');
                if(!value('walkin-date')||value('walkin-date')<'1900-01-01'||value('walkin-date')>todayInManila()||value('walkin-age')==='')fail('walkin-date','Check the consultation date and birthdate; the age must be between 0 and 130.');
                if(!value('walkin-barangay'))fail('walkin-barangay','Select the resident barangay.');
                if(!value('walkin-severity'))fail('walkin-severity','Select the recorded visit severity.');
                const details=consultation();
                payload={first_name:value('walkin-first'),last_name:value('walkin-last'),suffix:value('walkin-suffix'),birthdate,
                    date_recorded:value('walkin-date'),barangay_id:Number(value('walkin-barangay')),purok:value('walkin-purok'),
                    ...details.condition,visit:details.visit,severity:value('walkin-severity'),remarks:value('walkin-remarks'),status:'Active'};
            }catch(error){showStatus(error.message,'error');if(error.field)fieldError(error.field,error.message);return;}
            isSaving=true;save.disabled=true;showStatus('Saving case / consultation…');
            try {
                const response=await fetch(`${api}/api/mho/walk-in-cases`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),result=await response.json();
                if(!response.ok||!result.success)throw Error(result.error||'The consultation could not be saved.');
                returnCase=null;++openVersion;form.reset();field('walkin-nature').querySelector('option[value=""]')?.remove();field('walkin-unlisted').hidden=true;date.value=todayInManila();
                for(const id of ['walkin-disease','walkin-severity','walkin-barangay','walkin-suffix','walkin-nature','walkin-transaction','walkin-time-period'])field(id).dispatchEvent(new Event('change',{bubbles:true}));
                updateAge();renderCategories();visitFields();scheduleMatches();
                showStatus(result.new_case===false?`Consultation saved under #REC-${result.id}. Disease case totals are unchanged.`:`Case #REC-${result.id} and its consultation saved.${result.review_status==='Pending'?' The condition needs MHO review.':' Assigned to the selected barangay.'}`,'success');
                await loadRecent();window.dispatchEvent(new Event('health-intel:cases-changed'));
                if(typeof window.updateDynamicChart==='function')window.updateDynamicChart();
            }catch(error){showStatus(error.message||'The consultation could not be saved. Please try again.','error');}
            finally{isSaving=false;save.disabled=!optionsReady;}
        });
    });
})();
