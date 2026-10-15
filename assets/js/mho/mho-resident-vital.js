(() => {
    const field=id=>document.getElementById(id),safe=value=>HealthIntelEncoding.escape(value);
    let rows=[],page=1,pages=1,choicesLoaded=false,requestVersion=0;
    async function request(route,body) {
        const response=await fetch('http://localhost:3000/api'+route,body?{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),result=await response.json();
        if(!response.ok||!result.success)throw Error(result.error||'Resident status could not be loaded or saved.');return result;
    }
    async function refresh() {
        const version=++requestVersion;field('vital-review-count').textContent='Loading resident status…';
        try {
            if(!choicesLoaded){const choices=await request('/mho/walk-in-options');if(version!==requestVersion)return;for(const item of choices.data.barangays){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;field('vital-review-barangay').append(option);}choicesLoaded=true;}
            const result=await request('/mho/resident-status?'+new URLSearchParams({view:field('vital-review-view').value,barangay_id:field('vital-review-barangay').value,page}));
            if(version!==requestVersion)return;rows=result.data;page=result.page;pages=result.page_count;
            const pending=field('vital-review-view').value==='pending';
            field('vital-review-count').textContent=`${result.total} ${pending?'pending reports':'confirmed residents'} in this view. Confirmed deceased residents in selected scope: ${result.confirmed_total}.`;
            field('vital-review-body').innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${safe(r.patient_name||'Resident #'+r.resident_id)}</strong><br><small>Resident #${Number(r.resident_id)}</small></td><td>${safe(r.barangay_name)}</td><td>${safe(r.death_date?HealthIntelDate.formatCaseDate(r.death_date):'Unknown')}</td><td>${safe(r.source)}</td><td><button type="button" class="hi-vital-button" data-vital-review="${Number(r.id)}">${pending?'Review report':'Correct status'}</button></td></tr>`).join(''):'<tr><td colspan="5">No matching resident reports or confirmations.</td></tr>';
            field('vital-review-page').textContent=`Page ${page} of ${pages}`;field('vital-review-prev').disabled=page<=1;field('vital-review-next').disabled=page>=pages;
        }catch(error){if(version!==requestVersion)return;field('vital-review-count').textContent=error.message;field('vital-review-body').innerHTML='<tr><td colspan="5">Status list unavailable. Use Refresh to try again.</td></tr>';field('vital-review-prev').disabled=true;field('vital-review-next').disabled=true;}
    }
    async function review(id) {
        const row=rows.find(r=>r.id===id);if(!row)return;
        const pending=field('vital-review-view').value==='pending',controls=[];
        const result=await Swal.fire({title:pending?'Review resident death report':'Correct confirmed resident status',customClass:{popup:'hi-dialog'},width:650,showCancelButton:true,confirmButtonText:'Save decision',showLoaderOnConfirm:true,allowOutsideClick:()=>!Swal.isLoading(),
            html:`<div class="hi-review-dialog"><div class="hi-review-summary"><strong>${safe(row.patient_name)}</strong> · ${safe(row.barangay_name)}<p>Resident #${Number(row.resident_id)} · Birthdate: ${safe(row.birthdate||'Not recorded')}</p><p>Source: ${safe(row.source)}</p>${row.note?`<p>Report note: ${safe(row.note)}</p>`:''}</div><label for="vital-action">Action *</label><select id="vital-action">${pending?'<option value="confirm">Confirm deceased after checking the source</option><option value="reject">Reject report</option>':'<option value="correct-date">Correct death date</option><option value="clear-deceased">Remove an incorrect deceased confirmation</option>'}</select><div id="vital-date-fields"><label for="vital-date">Confirmed death date</label><input id="vital-date" type="date" min="${safe(row.birthdate||'1900-01-01')}" max="${HealthIntelDate.todayInManila()}" value="${safe(row.death_date||'')}"><p class="hi-field-help">Leave blank if unknown. New visit entry is blocked until MHO records the unknown date.</p></div><p class="hi-field-help">Cases and visits remain available. Removing an incorrect confirmation does not rewrite their outcomes.</p><label for="vital-reason">Decision / correction reason *</label><textarea id="vital-reason" rows="3" maxlength="1000" placeholder="Explain what was checked and why this decision is correct"></textarea></div>`,
            didOpen:()=>{controls.push(HealthIntelEncoding.enhanceSelect(field('vital-action')));field('vital-action').addEventListener('change',()=>field('vital-date-fields').hidden=['reject','clear-deceased'].includes(field('vital-action').value));},willClose:()=>controls.forEach(c=>c.destroy()),
            preConfirm:async()=>{try{
                const reason=field('vital-reason').value.trim();if(reason.length<5)throw Error('Explain the decision using at least five characters.');
                return await request(pending?`/mho/death-reports/${row.id}/review`:`/mho/residents/${row.resident_id}/vital-status`,{action:field('vital-action').value,death_date:field('vital-date').value,version:row.version,reason});
            }catch(error){Swal.showValidationMessage(error.message);return false;}}
        });
        if(result.isConfirmed){await refresh();window.dispatchEvent(new Event('health-intel:resident-status-changed'));Swal.fire({icon:'success',customClass:{popup:'hi-dialog'},title:'Resident status saved',text:'Clinical records were retained. The decision was recorded in the audit history.'});}
    }
    document.addEventListener('DOMContentLoaded',()=>{
        if(!field('view-vital-review'))return;
        window.addEventListener('health-intel:resident-review-opened',refresh);
        for(const id of ['vital-review-view','vital-review-barangay'])field(id).addEventListener('change',()=>{page=1;refresh();});
        field('vital-review-refresh').addEventListener('click',refresh);
        field('vital-review-prev').addEventListener('click',()=>{if(page>1){page--;refresh();}});field('vital-review-next').addEventListener('click',()=>{if(page<pages){page++;refresh();}});
        field('vital-review-body').addEventListener('click',event=>{const button=event.target.closest('[data-vital-review]');if(button)review(Number(button.dataset.vitalReview));});
        field('vital-review-export').addEventListener('click',async()=>{try{
            await HealthIntel.download('http://localhost:3000/api/mho/reports/deceased-residents?'+new URLSearchParams({barangay_id:field('vital-review-barangay').value}),{},'Confirmed_Deceased_Residents.pdf');
            Swal.fire({icon:'success',customClass:{popup:'hi-dialog'},title:'Download started',text:'The registry lists each confirmed deceased resident once. It does not report a cause of death.'});
        }catch(error){Swal.fire({icon:'error',customClass:{popup:'hi-dialog'},title:'Export unavailable',text:error.message});}});
    });
})();
