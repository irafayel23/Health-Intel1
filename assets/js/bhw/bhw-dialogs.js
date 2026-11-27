      function openAddPatientModal(returnVisit = null) {
        const controls = [];
        const requestKey = crypto.randomUUID();
        let patientPicker;
        const field = id => document.getElementById(id);
        const value = id => field(id).value.trim();
        function showVisitStep(showVisit) {
          field('intake-patient-step').hidden=showVisit;
          field('intake-visit-step').hidden=!showVisit;
          Swal.resetValidationMessage();
          Swal.getConfirmButton().textContent=showVisit
            ? (value('intake-action')==='refer'?'Request referral':'Save visit')
            : 'Continue';
          if(showVisit) {
            field('intake-patient-summary').textContent=
              [value('swal-fname'),value('swal-lname'),value('swal-suffix')].filter(Boolean).join(' ');
            field('swal-case-date').focus();
          } else {
            const search=field('swal-patient-search');
            const target=search?.offsetParent?search:field('intake-patient-heading');
            target.focus();
          }
          Swal.getHtmlContainer().scrollTop=0;
        }
        return Swal.fire({
          title: returnVisit ? 'Record barangay follow-up' : 'Record patient visit',
          width: 780,
          customClass: { popup:'hi-dialog hi-encode-dialog hi-bhw-entry-dialog hi-patient-visit-dialog' },
          html: `<div class="hi-encode"><p class="hi-encode-intro">Record the patient's information and what they report. The receiving clinician records the assessment.</p>
          <section id="intake-patient-step" class="hi-bhw-patient-step">
          <p id="intake-patient-heading" class="hi-intake-step-label" tabindex="-1">Step 1 of 2 · Patient</p>
          <div id="swal-patient-fields" class="hi-encode-grid">
          <div class="hi-encode-wide hi-patient-name-grid"><div><label for="swal-lname">Family name *</label><input id="swal-lname" maxlength="100" autocomplete="family-name" placeholder="Family name"></div>
          <div><label for="swal-fname">First name *</label><input id="swal-fname" maxlength="100" autocomplete="given-name" placeholder="First name"></div>
          <div class="hi-suffix-field"><label for="swal-suffix">Suffix</label><select id="swal-suffix"><option value="">None</option><option>Jr.</option><option>Sr.</option><option>I</option><option>II</option><option>III</option><option>IV</option><option>V</option><option>VI</option><option>VII</option><option>VIII</option><option>IX</option><option>X</option></select></div></div>
          <div><label for="swal-birthdate">Birthdate *</label><div class="hi-bhw-birthdate"><input id="swal-birthdate" type="text" inputmode="numeric" maxlength="10" placeholder="MM/DD/YYYY" aria-describedby="swal-birthdate-help"><input id="swal-birthdate-picker" type="date" min="1900-01-01" tabindex="-1" aria-hidden="true" hidden><button id="swal-birthdate-calendar" type="button" aria-label="Choose birthdate from calendar" hidden><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg></button></div><p id="swal-birthdate-help" class="hi-field-help">MM/DD/YYYY · Auto-format</p></div>
          <div><label for="swal-age">Age on visit date</label><input id="swal-age" readonly placeholder="From birthdate"></div>
          <div><label for="swal-assigned-barangay">Assigned barangay</label><input id="swal-assigned-barangay" readonly></div>
          <div><label for="swal-purok">Purok / zone *</label><input id="swal-purok" maxlength="100" placeholder="Type or choose"></div></div></section>
          <section id="intake-visit-step" hidden>
          <div class="hi-intake-visit-header">
            <div><p class="hi-intake-step-label">Step 2 of 2 · Visit details</p>
            <h3 id="intake-patient-summary"></h3></div>
            <button id="intake-back" type="button" class="hi-visit-back"><span aria-hidden="true">←</span> Back to patient</button>
          </div>
          <div class="hi-encode-grid"><div><label for="swal-case-date">Visit date *</label><input id="swal-case-date" type="date"></div>
          <div class="hi-encode-wide"><label for="intake-concern">Reason for visit *</label><textarea id="intake-concern" maxlength="1000" rows="3" placeholder="Enter the patient’s stated concern"></textarea></div>
          <div class="hi-encode-wide"><label for="intake-action">Next step</label><select id="intake-action"><option value="save">Save visit</option><option value="refer">Request referral</option></select></div>
          <div id="intake-referral" class="hi-encode-wide" hidden><p class="hi-field-help">Receiving facility · Murcia Municipal Health Office / RHU</p><label for="intake-reason">Reason for referral *</label><textarea id="intake-reason" maxlength="500" rows="2"></textarea></div>
          </div></section></div>`,
          confirmButtonText:'Continue', confirmButtonColor:'#047857', showCancelButton:true,
          cancelButtonText:'Close', showCloseButton:true, showLoaderOnConfirm:true,
          allowOutsideClick:()=>!Swal.isLoading(), allowEscapeKey:()=>!Swal.isLoading(),
          didOpen:()=>{
            const date=field('swal-case-date'), birthdate=field('swal-birthdate');
            date.max=HealthIntelDate.todayInManila();
            date.value=date.max;
            field('swal-assigned-barangay').value=window.currentBrgyName || 'Assigned barangay';
            function updateAge() {
              const birth=HealthIntelDate.parseBirthdate(birthdate.value);
              const visit=date.value;
              const age=field('swal-age');
              age.value='';
              if(!birth || !visit || birth>visit)return;
              const years=Number(visit.slice(0,4))-Number(birth.slice(0,4))-Number(visit.slice(5)<birth.slice(5));
              if(years<=130)age.value=String(years);
            }
            birthdate.addEventListener('input',updateAge);
            date.addEventListener('change',updateAge);
            controls.push(HealthIntelDate.bindNumericBirthdate(birthdate));
            if(!returnVisit) {
              bindBhwBirthdatePicker(birthdate,date,field('swal-birthdate-picker'),field('swal-birthdate-calendar'));
              controls.push(HealthIntelEncoding.bindPurokSuggestions(field('swal-purok'),()=>window.currentBrgyName));
            }
            patientPicker=HealthIntelPatientPicker.bind({
              prefix:'swal',section:document.querySelector('.hi-bhw-patient-step'),fields:field('swal-patient-fields'),
              identity:{first_name:'swal-fname',last_name:'swal-lname',suffix:'swal-suffix',birthdate:'swal-birthdate',purok:'swal-purok'},
              busy:()=>Swal.isLoading(),initialId:returnVisit?Number(returnVisit.person.id):null,locked:Boolean(returnVisit),preferExisting:true,
              onChange:updateAge
            });
            controls.push(patientPicker);
            field('intake-back').addEventListener('click',()=>showVisitStep(false));
            field('intake-action').addEventListener('change',()=>{
              const referral=value('intake-action')==='refer';
              field('intake-referral').hidden=!referral;
              Swal.getConfirmButton().textContent=referral?'Request referral':'Save visit';
            });
          },
          willClose:()=>controls.forEach(control=>control.destroy()),
          preConfirm:async()=>{
            try {
              const identity=patientPicker.payload();
              const birthdate=HealthIntelDate.parseBirthdate(value('swal-birthdate'));
              if(!birthdate)throw Error('Enter a valid birthdate as MM/DD/YYYY.');
              if(!value('swal-fname')||!value('swal-lname')||!value('swal-purok'))
                throw Error('Complete the patient’s first name, family name and purok before continuing.');
              if(field('intake-visit-step').hidden){
                if(birthdate>HealthIntelDate.todayInManila())throw Error('Enter a birthdate on or before today.');
                showVisitStep(true);
                return false;
              }
              const payload={...identity,request_key:requestKey,
                first_name:value('swal-fname'),last_name:value('swal-lname'),suffix:value('swal-suffix'),purok:value('swal-purok'),
                birthdate,visit_date:value('swal-case-date'),concern:value('intake-concern'),
                request_referral:value('intake-action')==='refer',referral_reason:value('intake-reason'),
                source_case_id:returnVisit?.caseId};
              const close=Swal.getCloseButton();
              close.disabled=true;
              try {
                const result=await HealthIntelReferrals.request('/api/bhw/intakes','POST',payload);
                if(result.code==='RESIDENT_REVIEW_REQUIRED'){
                  showVisitStep(false);
                  patientPicker.showReview(result);
                  return false;
                }
                return result;
              } finally { close.disabled=false; }
            } catch (error) { Swal.showValidationMessage(error.message);return false; }
          }
        }).then(({isConfirmed,value:result})=>{
          if(!isConfirmed){
            if(returnVisit&&!returnVisit.fromTracking)viewPatientProfile(returnVisit.person.id);
            return;
          }
          Swal.fire({icon:'success',titleText:result.state==='requested'?'Referral requested':'Visit saved',
            text:'Reference #INT-'+result.id,confirmButtonColor:'#047857',customClass:{popup:'hi-dialog'}});
        });
      }

      function bindBhwBirthdatePicker(input, consultationDate, picker, button) {
        if(typeof picker.showPicker!=='function')return;
        picker.hidden=false;
        button.hidden=false;
        input.parentElement.classList.add('has-picker');
        button.addEventListener('click',()=>{
          picker.max=consultationDate.value && consultationDate.value<=consultationDate.max ? consultationDate.value : consultationDate.max;
          const birthdate=HealthIntelDate.parseBirthdate(input.value);
          picker.value=birthdate && birthdate<=picker.max ? birthdate : '';
          picker.showPicker();
        });
        picker.addEventListener('change',()=>{
          if(picker.value && !picker.validity.valid)return;
          const [year,month,day]=picker.value.split('-');
          input.value=year ? [month,day,year].join('/') : '';
          input.dispatchEvent(new Event('input',{bubbles:true}));
        });
      }

      function bindBhwMeasurementEntry() {
        const fields = [
          ['swal-bp-systolic', /^[0-9]{0,3}$/],
          ['swal-bp-diastolic', /^[0-9]{0,3}$/],
          ['swal-temperature', /^(?:[0-9]{1,3}(?:[.][0-9]{0,2})?)?$/],
          ['swal-height', /^(?:[0-9]{1,3}(?:[.][0-9]{0,2})?)?$/],
          ['swal-weight', /^(?:[0-9]{1,4}(?:[.][0-9]{0,2})?)?$/]
        ];
        for(const [id,format] of fields){
          const input=document.getElementById(id);
          const fits=text=>format.test(input.value.slice(0,input.selectionStart)+text+input.value.slice(input.selectionEnd));
          input.addEventListener('beforeinput',event=>{
            if(event.inputType.startsWith('insert') && event.data && !fits(event.data))event.preventDefault();
          });
          input.addEventListener('paste',event=>{
            if(!fits(event.clipboardData.getData('text')))event.preventDefault();
          });
        }
      }

      async function generateBHWTodayReport() {
        return HealthIntelDailyReports.download('bhw');
      }

      async function generateBHWReport(type) {
        Swal.fire({
          title: 'Generating PDF...',
          html: 'Please wait while we load the selected period and generate the case list.',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });

        try {
          const month=document.getElementById('bhw-report-month').value;
          const year=document.getElementById('bhw-report-year').value;
          if (type === 'MONTHLY' && typeof HistoricalReports !== 'undefined') {
            const historicalPdf = await HistoricalReports.pdfUrl('bhw', year, month);
            if (historicalPdf) {
              await HealthIntel.download(historicalPdf, {}, 'FHSIS_Report_' + (month === 'all' ? 'Annual' : month) + '_' + year + '.pdf');
              Swal.fire({ icon: 'success', title: 'Download started' });
              return;
            }
          }
          if (month === 'all') {
            throw new Error(type === 'MONTHLY' ? 'The historical dataset has no months for this year.' : 'Choose a single month for the surveillance log.');
          }
          const brgy_id = window.currentBrgyId;
          if(!brgy_id)throw new Error('Your assigned barangay is still loading. Please try again.');
          const chosenPurok=document.getElementById('bhw-purok-filter').value;
          const params=new URLSearchParams({month,year,type,purok:chosenPurok});
          const res = await fetch('http://localhost:3000/api/bhw/report-data?' + params);
          const result = await res.json();

          if(!result.success) throw new Error("DB Error");

          await HealthIntelPDF.ensure();
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();

          const brgyName = window.currentBrgyName || 'Blumentritt';

          doc.setFontSize(16);
          doc.text(`Barangay Health Station - ${brgyName}`, 14, 20);
          doc.setFontSize(12);
          doc.text(type === 'MONTHLY' ? `Barangay Monthly Case List (${month} ${year})` : `Barangay Surveillance Case Log (${month} ${year})`, 14, 30);

          const records=type==='SURVEILLANCE' && chosenPurok!=='All Puroks' ? result.data.filter(p=>p.purok===chosenPurok) : result.data;
          if(type==='SURVEILLANCE' && chosenPurok!=='All Puroks') doc.text(`Purok / Zone: ${chosenPurok}`,14,37);
          const data = records.map(p => [
            p.patient_name || 'N/A',
            p.age_at_case === undefined ? (p.age ?? 'Not recorded') : (p.age_at_case ?? 'Not recorded'),
            p.age_group || 'Not recorded',
            p.purok || 'N/A',
            HealthIntelEncoding.conditionLabel(p),
            p.status || 'Active',
            p.date_recorded ? new Date(p.date_recorded).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'}) : 'Not recorded'
          ]);

          doc.autoTable({
            startY: 40,
            head: [['Patient Name', 'Age at case', 'Age group (years)', 'Purok', 'Diagnosis', 'Status', 'Date']],
            body: data.length ? data : [[{ content: `No recorded cases match ${month} ${year}${type === 'SURVEILLANCE' && chosenPurok !== 'All Puroks' ? ` in ${chosenPurok}` : ''}.`, colSpan: 7 }]],
            theme: 'striped',
            headStyles: { fillColor: type === 'MONTHLY' ? [2, 132, 199] : [234, 88, 12] }
          });

          doc.save(`BHW_Report_${brgyName}_${type}_${month}_${year}.pdf`);
          Swal.fire(data.length ? 'Report downloaded' : 'No matching cases', data.length ? `${data.length} recorded cases included for ${month} ${year}.` : `The downloaded PDF states that no cases match ${month} ${year} and the selected location. Check the case date and report filters.`, data.length ? 'success' : 'info');
        } catch (e) {
          console.error(e);
          Swal.fire('Error', e.message || 'Failed to generate report. Please try again.', 'error');
        }
      }

      document.addEventListener('DOMContentLoaded', () => {
          const today = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'long', year: 'numeric' }).formatToParts(new Date());
          const month = document.getElementById('bhw-report-month');
          const year = document.getElementById('bhw-report-year');
          if (month) {
              month.value = today.find(part => part.type === 'month').value;
              const surveillanceDownload = document.getElementById('bhw-surveillance-download');
              const syncSurveillance = () => { surveillanceDownload.disabled = month.value === 'all'; };
              month.addEventListener('change', syncSurveillance);
              syncSurveillance();
          }
          if (year) {
              const currentYear = today.find(part => part.type === 'year').value;
              if (![...year.options].some(option => option.value === currentYear)) {
                  const option = document.createElement('option'); option.value = currentYear; option.textContent = currentYear; year.prepend(option);
              }
              year.value = currentYear;
          }
      });

      function showAccountSettings() {
        return window.HealthIntelAccount.open();
      }

      function showTerms(event) {
        event.preventDefault();
        Swal.fire({
            title: 'Terms & Recognitions',
            html: `<div class="hi-form">
              <p><strong>Academic prototype.</strong> Health-Intel is a capstone project, not an official LGU privacy notice or proof of legal compliance.</p>
              <p><strong>Record use.</strong> Authorized health workers encode cases; the MHO reviews summaries and reports; the Admin oversees records and accounts; and the Superadmin maintains system backups.</p>
              <p><strong>User responsibility.</strong> Access and share health information only for approved project work and through authorized procedures.</p>
              <p><strong>Real records.</strong> The responsible LGU and project team need to review how existing real records are handled and provide a complete privacy notice before operational use. It should identify who controls the data, contact details, purposes, lawful basis, recipients, retention, and how people can exercise their rights.</p>
              <p><strong>Project recognitions.</strong> This capstone uses Tailwind CSS, Leaflet.js, Chart.js, and SweetAlert2.</p>
            </div>`,
            customClass: { popup: 'hi-dialog' },
            confirmButtonText: 'Close',
            confirmButtonColor: '#2563eb'
        });
      }

async function supplyConditionClarification(id) {
  const row=allPatients.find(item=>item.id===id);if(!row)return;const safe=HealthIntelEncoding.escape;
  Swal.fire({title:`Clarify case #REC-${id}`,customClass:{popup:'hi-dialog'},showCancelButton:true,confirmButtonText:'Send clarification',showLoaderOnConfirm:true,
    html:`<div class="hi-review-dialog"><p class="hi-review-summary">${safe(row.disease_review_note)}</p><label for="clarify-condition">Reported condition</label><input id="clarify-condition" maxlength="255" value="${safe(row.disease_reported)}"><label for="clarify-source">Source / reference</label><input id="clarify-source" maxlength="500" value="${safe(row.condition_source)}"></div>`,
    preConfirm:async()=>{try{const response=await fetch(`http://localhost:3000/api/patients/${id}/condition-clarification`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({reported_condition:document.getElementById('clarify-condition').value,condition_source:document.getElementById('clarify-source').value})});const result=await response.json();if(!response.ok||!result.success)throw Error(result.error);return result;}catch(error){Swal.showValidationMessage(error.message);return false;}}
  }).then(result=>{if(result.isConfirmed){loadPatients();window.dispatchEvent(new Event('health-intel:cases-changed'));Swal.fire('Clarification sent','MHO can now review the updated information.','success');}});
}
