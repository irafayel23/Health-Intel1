// Follow-up tracking stays inside the existing directories; visits remain the source of truth.
(() => {
    const safe=value=>HealthIntelEncoding.escape(value),date=value=>HealthIntelDate.formatCaseDate(value);
    function latestVisit(visits,caseId){return visits.filter(v=>Number(v.case_id)===Number(caseId)).sort((a,b)=>String(b.consultation_date).localeCompare(String(a.consultation_date))||Number(b.id)-Number(a.id))[0];}
    function init(role){
        const field=suffix=>document.getElementById(role+'-'+suffix),mount=field('followup-tabs'),panel=field('followup-panel'),directory=field('directory-panel');
        if(!mount||!panel||!directory)return;
        const label=role==='bhw'?'All residents':'All patients';
        mount.innerHTML=`<div class="hi-directory-tabs" role="tablist" aria-label="Directory views"><button id="${role}-directory-tab" type="button" role="tab" aria-selected="true" aria-controls="${role}-directory-panel">${label}</button><button id="${role}-followup-tab" type="button" role="tab" aria-selected="false" aria-controls="${role}-followup-panel" tabindex="-1">Follow-up tracking</button></div>`;
        panel.innerHTML=`<div class="hi-followup-heading"><div><h2>Follow-up tracking</h2><p>Return dates from the latest recorded consultation for each disease case.</p></div><button type="button" class="hi-vital-button" id="${role}-followup-refresh">Refresh follow-ups</button></div>
        <p class="hi-field-help">A later consultation replaces the earlier plan. Archived cases and deceased residents are excluded. Past due means no later consultation is recorded; it does not confirm a missed appointment.</p>
        <form id="${role}-followup-search-form" class="hi-followup-search"><label for="${role}-followup-search">Patient name or record ID<input id="${role}-followup-search" type="search" maxlength="100" placeholder="Search name, RES-12 or REC-34"></label>${role==='mho'?`<label for="${role}-followup-barangay">Barangay<select id="${role}-followup-barangay"><option value="all">All barangays</option></select></label>`:''}<button type="submit" class="hi-vital-button">Search follow-ups</button><button type="button" class="hi-vital-button" id="${role}-followup-reset">Reset follow-up filters</button></form>
        <div class="hi-followup-filters" role="group" aria-label="Follow-up due dates">${[['today','Due today'],['upcoming','Upcoming'],['past','Past due']].map(([key,text])=>`<button type="button" data-followup-bucket="${key}" aria-pressed="${key==='today'}">${text} <span data-followup-count="${key}">—</span></button>`).join('')}</div>
        <p id="${role}-followup-status" class="hi-vital-note" role="status" aria-live="polite"></p><button type="button" class="hi-vital-button" id="${role}-followup-retry" hidden>Retry follow-ups</button><div id="${role}-followup-list" class="hi-followup-list" aria-busy="false"></div>
        <div class="hi-vital-pagination"><button type="button" class="hi-vital-button" id="${role}-followup-prev" disabled>Previous follow-up page</button><span id="${role}-followup-page" role="status"></span><button type="button" class="hi-vital-button" id="${role}-followup-next" disabled>Next follow-up page</button></div>`;
        let bucket='today',page=1,pages=1,rows=[],version=0,requestController,choicesLoaded=role!=='mho',opening=false,lastToday='';
        const list=field('followup-list'),tabs=[field('directory-tab'),field('followup-tab')];
        const visible=()=>!panel.hidden&&!panel.closest('.view-section').classList.contains('hidden');
        async function request(path,signal){const response=await fetch('http://localhost:3000/api'+path,{signal}),result=await response.json();if(!response.ok||!result.success)throw Error(result.error||'Follow-ups could not be loaded.');return result;}
        function updateButtons(){for(const button of panel.querySelectorAll('[data-followup-bucket]'))button.setAttribute('aria-pressed',String(button.dataset.followupBucket===bucket));}
        async function refresh(reset=false){
            if(reset)page=1;
            requestController?.abort();requestController=new AbortController();const current=++version,active=requestController,timer=setTimeout(()=>active.abort(),15000);
            rows=[];list.setAttribute('aria-busy','true');list.innerHTML='<p class="hi-history-empty">Loading follow-up plans…</p>';field('followup-status').textContent='Loading follow-ups…';field('followup-retry').hidden=true;field('followup-prev').disabled=field('followup-next').disabled=true;
            try{
                if(!choicesLoaded){const result=await request('/mho/walk-in-options',active.signal);if(current!==version)return;for(const item of result.data.barangays)field('followup-barangay').add(new Option(item.name,String(item.id)));choicesLoaded=true;}
                const params=new URLSearchParams({bucket,page,q:field('followup-search').value.trim()});if(role==='mho')params.set('barangay_id',field('followup-barangay').value);
                const result=await request('/'+role+'/followups?'+params,active.signal);if(current!==version)return;
                rows=result.data;page=result.page;pages=result.page_count;lastToday=result.today;
                for(const element of panel.querySelectorAll('[data-followup-count]'))element.textContent=String(result.counts[element.dataset.followupCount]);
                field('followup-status').textContent=`${result.total} ${bucket==='today'?'due today':bucket==='past'?'past due':'upcoming'} · Philippines date: ${date(result.today)} · One plan per disease case.`;
                list.innerHTML=rows.length?rows.map(row=>{
                    const instructions=row.followup_instructions||'No instructions recorded.',long=instructions.length>160;
                    return `<article class="hi-followup-card"><div class="hi-followup-card-top"><div><h3>${safe(row.patient_name||'Name not recorded')}</h3><p>${safe(row.barangay_name||'Barangay not recorded')} · ${safe(row.purok||'Purok not recorded')}</p></div><span class="hi-followup-date" data-due="${bucket}">${bucket==='today'?'Due today':bucket==='past'?'Past due':'Upcoming'} · ${safe(date(row.next_followup_date))}</span></div>
                    <p class="hi-followup-case">${HealthIntelEncoding.conditionCell(row)} <span>· REC-${Number(row.case_id)} · ${safe(row.status)}</span></p><p class="hi-field-help">Plan recorded at consultation: ${safe(date(row.consultation_date))}</p>
                    <p class="hi-followup-copy">${safe(long?instructions.slice(0,160)+'…':instructions)}</p>${long?`<details class="hi-followup-details"><summary>Read full instructions</summary><p class="hi-followup-copy">${safe(instructions)}</p></details>`:''}
                    <div class="hi-followup-card-actions"><button type="button" class="hi-vital-button hi-followup-record" data-followup-case="${Number(row.case_id)}" ${row.can_record?'':'disabled'} aria-label="Record follow-up for case REC-${Number(row.case_id)}">Record follow-up</button>${!row.can_record?`<span class="hi-field-help">${safe(row.blocked_reason)}</span>`:''}</div></article>`;
                }).join(''):'<div class="hi-history-empty"><strong>No matching follow-ups</strong><p>Try another due-date filter or change your search. A consultation without a next return date has no pending plan.</p></div>';
                field('followup-page').textContent=`Page ${page} of ${pages}`;field('followup-prev').disabled=page<=1;field('followup-next').disabled=page>=pages;
            }catch(error){if(current!==version)return;field('followup-status').textContent=error.name==='AbortError'?'Loading timed out. Retry to refresh follow-ups.':error.message;list.innerHTML='';field('followup-page').textContent='';field('followup-retry').hidden=false;for(const element of panel.querySelectorAll('[data-followup-count]'))element.textContent='—';}
            finally{clearTimeout(timer);if(current===version)list.setAttribute('aria-busy','false');}
        }
        function select(index){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(index===i));tab.tabIndex=index===i?0:-1;});directory.hidden=index!==0;panel.hidden=index!==1;if(index===1)refresh();else{requestController?.abort();++version;}}
        tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(i));tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-i;select(next);tabs[next].focus();}});});
        for(const button of panel.querySelectorAll('[data-followup-bucket]'))button.addEventListener('click',()=>{bucket=button.dataset.followupBucket;updateButtons();refresh(true);});
        field('followup-search-form').addEventListener('submit',event=>{event.preventDefault();refresh(true);});
        field('followup-barangay')?.addEventListener('change',()=>refresh(true));
        field('followup-reset').addEventListener('click',()=>{field('followup-search-form').reset();bucket='today';updateButtons();refresh(true);});
        for(const key of ['followup-refresh','followup-retry'])field(key).addEventListener('click',()=>refresh());
        field('followup-prev').addEventListener('click',()=>{if(page>1){page--;refresh();}});field('followup-next').addEventListener('click',()=>{if(page<pages){page++;refresh();}});
        list.addEventListener('click',async event=>{
            const button=event.target.closest('[data-followup-case]'),row=button&&rows.find(item=>Number(item.case_id)===Number(button.dataset.followupCase));if(!row?.can_record||opening)return;
            opening=true;button.disabled=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
            try{
                const result=await request(role==='bhw'?`/residents/${row.resident_id}/dossier`:`/mho/patients/resident/${row.resident_id}`,controller.signal);
                const original=result.history.find(item=>Number(item.id)===Number(row.case_id)),latest=latestVisit(result.visits,row.case_id),person=result.resident;
                if(!original||original.is_archived||original.status==='Deceased'||person.is_deceased||Number(latest?.id)!==Number(row.visit_id)||!latest.next_followup_date)throw Error('This plan changed or is no longer pending. Refresh follow-ups before recording a return.');
                if(role==='bhw')await recordBhwReturnVisit(Number(row.resident_id),Number(row.case_id),'Follow-up visit');
                else window.dispatchEvent(new CustomEvent('health-intel:record-return-visit',{detail:{person,caseId:Number(row.case_id),nature:'Follow-up visit'}}));
            }catch(error){await Swal.fire({icon:'info',titleText:'Refresh the follow-up plan',text:error.name==='AbortError'?'Loading timed out. Try again.':error.message,customClass:{popup:'hi-dialog'}});}
            finally{clearTimeout(timer);opening=false;button.disabled=!row.can_record;if(visible())refresh();}
        });
        document.querySelector(`[data-target="${role==='bhw'?'view-resident-profiles':'view-patient-directory'}"]`)?.addEventListener('click',()=>{if(!panel.hidden)refresh();});
        for(const event of ['health-intel:cases-changed','health-intel:resident-status-changed'])window.addEventListener(event,()=>{if(visible())refresh();});
        window.addEventListener('focus',()=>{if(visible()&&lastToday!==HealthIntelDate.todayInManila())refresh();});
    }
    document.addEventListener('DOMContentLoaded',()=>{init('bhw');init('mho');});
    window.HealthIntelFollowups={latestVisit};
})();
