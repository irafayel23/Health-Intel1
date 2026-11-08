(() => {
    const field=id=>document.getElementById(id),safe=value=>HealthIntelEncoding.escape(value);
    let page=1,pages=1,rows=[],version=0,controller,choicesLoaded=false;
    const name=row=>row.last_name&&row.first_name?`${row.last_name}, ${row.first_name}${row.suffix?' '+row.suffix:''}`:row.patient_name||'Name not recorded';
    const date=value=>value?HealthIntelDate.formatCaseDate(String(value).slice(0,10)):'Not recorded';
    const badge=row=>row.kind==='legacy'?'<span class="hi-vital-badge hi-vital-pending">Unlinked record</span>':row.is_deceased?'<span class="hi-vital-badge hi-vital-deceased">Confirmed deceased</span>':'<span class="text-sm text-muted-foreground">Not confirmed deceased</span>';
    async function request(route,signal){
        const response=await fetch('http://localhost:3000/api'+route,{signal}),result=await response.json();
        if(!response.ok||!result.success)throw Error(result.error||'Patient records could not be loaded.');
        return result;
    }
    async function refresh(reset=false, targetPage=null){
        const requestedPage=reset?1:targetPage??page;
        controller?.abort();controller=new AbortController();const active=controller,current=++version;
        const timeout=setTimeout(()=>active.abort(),15000);
        field('mho-patient-body').setAttribute('aria-busy','true');
        const pager=field('mho-patient-pager');
        field('mho-patient-count').textContent=targetPage===null?'Loading patient records…':`Loading page ${requestedPage}…`;
        if(targetPage===null){
            pager.replaceChildren();
            field('mho-patient-body').innerHTML='<tr><td colspan="5">Loading records…</td></tr>';
        }
        try{
            if(!choicesLoaded){
                const result=await request('/mho/walk-in-options',active.signal);if(current!==version)return;
                for(const row of result.data.barangays)field('mho-patient-barangay').add(new Option(row.name,String(row.id)));
                choicesLoaded=true;
            }
            const result=await request('/mho/patients?'+new URLSearchParams({q:field('mho-patient-search').value.trim(),barangay_id:field('mho-patient-barangay').value,vital:field('mho-patient-vital').value,page:requestedPage}),active.signal);
            if(current!==version)return;rows=result.data;page=result.page;pages=result.page_count;
            field('mho-patient-count').textContent=`${result.total} directory ${result.total===1?'entry':'entries'} · ${result.page_size} per page. Open a history to see recorded details.`;
            field('mho-patient-body').innerHTML=rows.length?rows.map(row=>{
                const kind=row.kind==='resident'?'resident':'legacy',id=Number(row.id),patient=safe(name(row));
                return `<tr data-mho-hint="Show history" data-patient-kind="${kind}" data-patient-id="${id}">
                    <td><button type="button" class="mho-patient-open" aria-label="Show history for ${patient}">${patient}</button><br><small>${kind==='resident'?'RES':'REC'}-${id}${kind==='legacy'?' · Historical case':''}</small></td>
                    <td>${safe(row.barangay_name||'Not recorded')}<br><small>${safe(row.purok||'Purok not recorded')}</small></td>
                    <td><strong>${Number(row.case_count)}</strong> total<br><small>${Number(row.active_count)} active · ${Number(row.archived_count)} archived</small></td>
                    <td>${safe(date(row.last_consultation))}</td><td>${badge(row)}</td>
                </tr>`;
            }).join(''):'<tr><td colspan="5">No matching records. Change the search or reset the filters.</td></tr>';
            renderMhoPages(pager,page,pages,'Patient directory pages');
            if(targetPage!==null)pager.querySelector('[aria-current="page"]')?.focus({preventScroll:true});
        }catch(error){
            if(current!==version)return;
            if(targetPage!==null){
                field('mho-patient-count').textContent=`Page ${requestedPage} could not be loaded. Still showing page ${page}. Select the page to retry.`;
                return;
            }
            rows=[];field('mho-patient-count').textContent=error.name==='AbortError'?'Loading timed out. Use Search to try again.':error.message;
            field('mho-patient-body').innerHTML='<tr><td colspan="5">Directory unavailable. Use Search to retry.</td></tr>';
        }finally{clearTimeout(timeout);if(current===version)field('mho-patient-body').setAttribute('aria-busy','false');}
    }
    async function dossier(kind,id){
        if(!['resident','legacy'].includes(kind)||!Number.isSafeInteger(id)||id<1)return;
        const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),15000);
        Swal.fire({titleText:'Loading patient history',customClass:{popup:'hi-dialog'},didOpen:()=>Swal.showLoading(),willClose:()=>abort.abort()});
        let result;
        try{result=await request(`/mho/patients/${kind}/${id}`,abort.signal);}
        catch(error){if(abort.signal.aborted&&!Swal.isVisible())return;Swal.fire({icon:'error',titleText:'History unavailable',text:error.name==='AbortError'?'Loading timed out. Please try again.':error.message,customClass:{popup:'hi-dialog'}});return;}
        finally{clearTimeout(timeout);}
        const person=result.resident,history=result.history,visits=result.visits;
        const active=history.filter(r=>r.status==='Active'&&!r.is_archived).length,archived=history.filter(r=>r.is_archived).length;
        const age=kind==='resident'?HealthIntelDate.residentAge(person):null;
        const ageText=kind==='legacy'?'Historical identity — not a verified current profile':person.is_deceased?(age==null?'Age at death unknown':`${age} years at death`):(age==null?'Age not recorded':`${age} years old`);
        let tab='cases',historyPage=1;
        function visitAction(item){
            if(kind!=='resident')return '';
            if(item.is_archived)return '<p class="text-sm text-muted-foreground mt-3">Archived case · view only.</p>';
            if(person.is_deceased)return '<p class="text-sm text-muted-foreground mt-3">Confirmed deceased · use the consultation form for an eligible historical visit.</p>';
            if(!person.first_name||!person.last_name||!person.birthdate||!person.barangay_id)return '<p class="text-sm text-muted-foreground mt-3">Complete the patient identity before recording a return visit.</p>';
            return `<button type="button" class="hi-vital-button mt-4 !bg-emerald-700 !text-white !border-emerald-700 hover:!bg-emerald-800" data-return-case="${Number(item.id)}" aria-label="Record follow-up or admission for case REC-${Number(item.id)}">Record follow-up / admission</button>`;
        }
        await Swal.fire({titleText:'Patient history',width:960,customClass:{popup:'hi-dialog mho-patient-history-dialog'},showCloseButton:true,closeButtonAriaLabel:'Close patient history',confirmButtonText:'Close',html:`<div class="text-left text-foreground">
            <div class="rounded-xl border border-border bg-muted p-5 mb-5"><h2 class="text-2xl font-bold mb-2">${safe(name(person))}</h2><p>${safe(person.barangay_name||'Not recorded')} · ${safe(person.purok||'Purok not recorded')}</p><p class="text-sm text-muted-foreground">${safe(ageText)} · Birthdate: ${safe(date(person.birthdate))}</p>${badge({kind,...person})}${person.is_deceased?`<p class="text-sm">Death date: ${safe(date(person.death_date))}</p>`:''}</div>
            ${kind==='legacy'?'<p class="hi-vital-note">This case has no resident link. Only its own recorded details and visits are shown; other matching names are not assumed to be the same person.</p>':''}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">${[[history.length,'Disease cases'],[active,'Active cases'],[archived,'Archived cases'],[visits.length,'Consultations']].map(([count,label])=>`<div class="rounded-xl border border-border bg-card p-4"><strong class="block text-2xl">${Number(count)}</strong><span class="text-sm text-muted-foreground">${label}</span></div>`).join('')}</div>
            <div class="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Patient history"><button id="mho-history-cases-tab" type="button" role="tab" aria-controls="mho-history-panel" class="hi-vital-button aria-selected:bg-emerald-700 aria-selected:text-white aria-selected:border-emerald-700">Disease cases</button><button id="mho-history-visits-tab" type="button" role="tab" aria-controls="mho-history-panel" class="hi-vital-button aria-selected:bg-emerald-700 aria-selected:text-white aria-selected:border-emerald-700">Consultations / visits</button></div>
            <p class="hi-vital-note">Cases include archived records. Admissions and follow-ups remain linked to their original disease case. Older cases may have no structured measurements or visit details.</p>
            <div id="mho-history-panel" role="tabpanel" class="grid gap-4"></div><div class="hi-vital-pagination"><button id="mho-history-prev" type="button" class="hi-vital-button">Previous</button><span id="mho-history-page" role="status"></span><button id="mho-history-next" type="button" class="hi-vital-button">Next</button></div></div>`,didOpen:()=>{
                function render(){
                    const source=tab==='cases'?history:visits,totalPages=Math.max(1,Math.ceil(source.length/10)),items=source.slice((historyPage-1)*10,historyPage*10);
                    for(const key of ['cases','visits']){field(`mho-history-${key}-tab`).setAttribute('aria-selected',String(tab===key));field(`mho-history-${key}-tab`).tabIndex=tab===key?0:-1;}
                    field('mho-history-panel').setAttribute('aria-labelledby',`mho-history-${tab}-tab`);
                    field('mho-history-panel').innerHTML=items.length?items.map(item=>tab==='cases'?`<article class="hi-visit-card"><header><strong>#REC-${Number(item.id)}</strong><span class="text-sm">${safe(item.status)}${item.is_archived?' · Archived':''}</span></header><p class="hi-visit-condition">${HealthIntelEncoding.conditionCell(item)}</p><p class="text-sm text-muted-foreground">Case date: ${safe(date(item.date_recorded))} · Recorded severity: ${safe(item.severity||'Not recorded')}</p><p class="text-sm text-muted-foreground">Age at case: ${safe(item.age_at_case ?? 'Not recorded')} · Age group: ${safe(item.age_group || 'Not recorded')}${item.age_group && item.age_group!=='Not recorded'?' years':''}</p><p class="text-sm mt-3 whitespace-pre-wrap">${safe(item.remarks||'No remarks recorded')}</p><p class="text-xs text-muted-foreground mt-2">Encoded by: ${safe(item.encoded_by||'Not recorded')}</p>${visitAction(item)}</article>`:`<article class="hi-visit-card"><header><strong>${safe(item.nature_of_visit)}</strong><span class="text-sm">#REC-${Number(item.case_id)}</span></header><p class="hi-visit-date">${safe(date(item.consultation_date))} · ${safe(HealthIntelVisits.formatTime(item.consultation_time))} · ${safe(item.transaction_mode)}</p><p class="hi-visit-condition">${HealthIntelEncoding.conditionCell(item)}</p><p class="text-sm text-muted-foreground">Age at visit: ${safe(item.age_at_visit ?? 'Not recorded')} · Age group: ${safe(item.age_group || 'Not recorded')}${item.age_group && item.age_group!=='Not recorded'?' years':''}</p><dl class="hi-visit-measurements">${[[item.blood_pressure,'Blood pressure','mmHg'],[item.temperature_c,'Temperature','°C'],[item.height_cm,'Height','cm'],[item.weight_kg,'Weight','kg']].map(([value,label,unit])=>`<div><dt>${label}</dt><dd>${value==null?'Not recorded':safe(value)+' '+unit}</dd></div>`).join('')}</dl>${item.transaction_mode==='Referral'?`<p class="text-sm mt-3">Referring health worker / facility: ${safe(item.referred_by||'Not recorded')}<br>Referral reason: ${safe(item.referral_reason||'Not recorded')}</p>`:''}<p class="text-sm mt-3 whitespace-pre-wrap">${safe(item.remarks||'No visit remarks recorded')}</p>${HealthIntelVisits.followupHistory(item)}<p class="text-xs text-muted-foreground mt-2">Recorded severity: ${safe(item.severity||'Not recorded')} · Encoded by: ${safe(item.encoded_by||'Not recorded')}</p></article>`).join(''):`<div class="hi-history-empty">No ${tab==='cases'?'linked disease cases':'structured consultations'} recorded. Historical details are not invented.</div>`;
                    field('mho-history-page').textContent=`Page ${historyPage} of ${totalPages} · ${source.length} ${tab==='cases'?'cases':'visits'}`;
                    field('mho-history-prev').disabled=historyPage<=1;field('mho-history-next').disabled=historyPage>=totalPages;
                }
                function select(key){tab=key;historyPage=1;render();}
                for(const key of ['cases','visits']){field(`mho-history-${key}-tab`).addEventListener('click',()=>select(key));field(`mho-history-${key}-tab`).addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'cases':event.key==='End'?'visits':tab==='cases'?'visits':'cases';select(next);field(`mho-history-${next}-tab`).focus();}});}
                field('mho-history-prev').addEventListener('click',()=>{if(historyPage>1){historyPage--;render();}});
                field('mho-history-panel').addEventListener('click',event=>{
                    const button=event.target.closest('[data-return-case]');if(!button)return;
                    const original=history.find(item=>Number(item.id)===Number(button.dataset.returnCase));
                    if(!original||kind!=='resident'||original.is_archived||person.is_deceased)return;
                    Swal.close();window.dispatchEvent(new CustomEvent('health-intel:record-return-visit',{detail:{person:{...person},caseId:Number(original.id)}}));
                });
                field('mho-history-next').addEventListener('click',()=>{historyPage++;render();});render();
            }});
    }
    window.HealthIntelMhoPatients={open:dossier};
    document.addEventListener('DOMContentLoaded',()=>{
        if(!field('view-patient-directory'))return;
        document.querySelector('[data-target="view-patient-directory"]')?.addEventListener('click',()=>refresh());
        field('mho-patient-filters').addEventListener('submit',event=>{event.preventDefault();refresh(true);});
        for(const id of ['mho-patient-barangay','mho-patient-vital'])field(id).addEventListener('change',()=>refresh(true));
        field('mho-patient-reset').addEventListener('click',()=>{field('mho-patient-filters').reset();refresh(true);});
        field('mho-patient-pager').addEventListener('click',event=>{
            const button=event.target.closest('[data-mho-page]');
            if(!button)return;
            const target=Number(button.dataset.mhoPage);
            if(Number.isInteger(target)&&target>=1&&target<=pages&&target!==page)refresh(false,target);
        });
        field('mho-patient-body').addEventListener('click',event=>{const row=event.target.closest('[data-patient-id]');if(row)dossier(row.dataset.patientKind,Number(row.dataset.patientId));});
        for(const event of ['health-intel:cases-changed','health-intel:resident-status-changed'])window.addEventListener(event,()=>{if(!field('view-patient-directory').classList.contains('hidden'))refresh();});
    });
})();
