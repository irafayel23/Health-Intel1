(() => {
    const safe=value=>HealthIntelEncoding.escape(value);
    function badge(r) {
        return r.is_deceased?'<span class="hi-vital-badge hi-vital-deceased">Deceased · MHO confirmed</span>':r.death_report_status==='Pending'?'<span class="hi-vital-badge hi-vital-pending">Death reported · pending review</span>':'';
    }
    function dossier(r) {
        const panel=document.getElementById('profile-vital-status');if(!panel)return;
        panel.innerHTML=`<div><strong>Resident status</strong><p>${badge(r)||'Not confirmed deceased'}</p>${r.is_deceased?`<p>Death date: ${safe(r.death_date?HealthIntelDate.formatCaseDate(r.death_date):'Unknown')} · Confirmed by ${safe(r.confirmed_by)}</p><p>Clinical history is retained. Death confirmation does not establish its cause.</p>`:r.death_report_status==='Pending'?'<p>MHO must confirm this report. Disease case status remains separate.</p>':r.death_report_status==='Rejected'?`<p>Previous report rejected: ${safe(r.death_report_review_reason)}</p>`:r.death_report_status==='Corrected'?'<p>The previous death confirmation was corrected. History remains available.</p>':''}</div>${!r.is_deceased&&r.death_report_status!=='Pending'?'<button type="button" class="hi-vital-button" id="profile-report-death">Report deceased</button>':''}`;
        document.getElementById('profile-report-death')?.addEventListener('click',()=>report(r));
    }
    async function report(r) {
        window.closeProfileModal?.();
        const result=await Swal.fire({title:'Report resident deceased',customClass:{popup:'hi-dialog'},showCancelButton:true,confirmButtonText:'Submit for MHO review',showLoaderOnConfirm:true,allowOutsideClick:()=>!Swal.isLoading(),
            html:`<div class="hi-review-dialog"><div class="hi-review-summary">${safe(r.patient_name)} · Resident #${Number(r.id)}<p>This submits a report. It does not confirm death or change disease cases.</p></div><label for="death-report-date">Reported death date</label><input id="death-report-date" type="date" min="${safe(String(r.birthdate||'1900-01-01').slice(0,10))}" max="${HealthIntelDate.todayInManila()}"><p class="hi-field-help">Leave blank if unknown. Do not enter an estimated date.</p><label for="death-report-source">Source / reference *</label><input id="death-report-source" maxlength="500" placeholder="Where the death information was confirmed or reported"><label for="death-report-note">Additional note</label><textarea id="death-report-note" maxlength="1000" rows="3"></textarea></div>`,
            preConfirm:async()=>{try{
                const source=document.getElementById('death-report-source').value.trim();if(!source)throw Error('Record the source or reference for MHO to review.');
                const response=await fetch(`http://localhost:3000/api/residents/${r.id}/death-report`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({death_date:document.getElementById('death-report-date').value,source,note:document.getElementById('death-report-note').value.trim()})}),data=await response.json();
                if(!response.ok||!data.success)throw Error(data.error||'Report could not be submitted.');return data;
            }catch(error){Swal.showValidationMessage(error.message);return false;}}
        });
        if(result.isConfirmed){await Swal.fire({icon:'success',customClass:{popup:'hi-dialog'},title:'Submitted for MHO review',text:'Records were retained. MHO must confirm the resident’s death status.'});window.loadResidentDirectory?.();}
        window.viewPatientProfile?.(r.id);
    }
    window.HealthIntelVital={badge,dossier};
})();
