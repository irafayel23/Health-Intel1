      function openAddPatientModal(returnVisit=null) {
        const controls=[];
        let visitControl, wizard;
        return Swal.fire({title:returnVisit?'Record follow-up / admission':'Patient case / visit',width:940,customClass:{popup:'hi-dialog hi-encode-dialog'},
          html:`<div class="hi-encode"><p class="hi-encode-intro">${returnVisit?`Patient details are filled from the resident profile. This visit stays linked to #REC-${Number(returnVisit.caseId)}. Enter new measurements and notes.`:'Record a disease case or a visit linked to an existing case.'} Fields marked * are required.</p><div id="hi-visit-progress"></div>
          <section class="hi-bhw-patient-step"><h3>1. Patient details</h3><div class="hi-encode-grid">
          <div class="hi-encode-wide hi-patient-name-grid"><div><label for="swal-lname">Family name *</label><input id="swal-lname" maxlength="100" autocomplete="family-name" placeholder="Family name"></div>
          <div><label for="swal-fname">First name *</label><input id="swal-fname" maxlength="100" autocomplete="given-name" placeholder="First name"></div>
          <div class="hi-suffix-field"><label for="swal-suffix">Suffix</label><select id="swal-suffix"><option value="">None</option><option>Jr.</option><option>Sr.</option><option>I</option><option>II</option><option>III</option><option>IV</option><option>V</option><option>VI</option><option>VII</option><option>VIII</option><option>IX</option><option>X</option></select></div></div>
          <div><label for="swal-birthdate">Birthdate *</label><div class="hi-bhw-birthdate"><input id="swal-birthdate" type="text" inputmode="numeric" maxlength="10" placeholder="MM/DD/YYYY" aria-describedby="swal-birthdate-help"><input id="swal-birthdate-picker" type="date" min="1900-01-01" tabindex="-1" aria-hidden="true" hidden><button id="swal-birthdate-calendar" type="button" aria-label="Choose birthdate from calendar" hidden><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg></button></div><p id="swal-birthdate-help" class="hi-field-help">MM/DD/YYYY · Slashes are added automatically.</p></div>
          <div><label for="swal-age">Age on consultation date</label><input id="swal-age" readonly placeholder="Calculated from birthdate"></div>
          <div class="hi-encode-wide"><label for="swal-purok">Purok / zone *</label><input id="swal-purok" maxlength="100" placeholder="Enter the purok or zone"><p class="hi-field-help">Assigned barangay: <span id="swal-assigned-barangay"></span></p></div></div></section>
          ${HealthIntelVisits.markup()}
          <section><h3>4. Disease and visit notes</h3><div class="hi-encode-grid">
          <p id="hi-visit-save-summary" class="hi-encode-wide hi-save-summary"></p>
          <div class="hi-encode-wide" id="swal-condition-fields">${HealthIntelEncoding.conditionMarkup('swal')}</div>
          <div class="hi-encode-wide"><label for="swal-severity">Recorded severity *</label><select id="swal-severity"><option value="">Select severity</option><option>Mild</option><option>Monitored</option><option>High Risk</option></select></div>
          <div class="hi-encode-wide"><label for="swal-remarks">Symptoms / remarks</label><textarea id="swal-remarks" maxlength="4000" rows="3" placeholder="Notes from this consultation"></textarea><p class="hi-field-help">${returnVisit?'Severity describes this visit; the original case severity stays unchanged.':'Severity describes this case. It does not declare an outbreak.'}</p></div>${HealthIntelVisits.followupMarkup('swal')}</div></section></div>`,
          confirmButtonText:'Save record',confirmButtonColor:'#2563eb',showCancelButton:true,showLoaderOnConfirm:true,allowOutsideClick:()=>!Swal.isLoading(),
          didOpen:()=>{
            controls.push(HealthIntelVisits.bindBloodPressure('swal'));
            bindBhwMeasurementEntry();
            const field=id=>document.getElementById(id),date=field('swal-case-date'),bd=field('swal-birthdate');
            date.max=window.HealthIntelDate.todayInManila();date.value=date.max;
            field('swal-assigned-barangay').textContent=window.currentBrgyName || 'Your assigned barangay';
            controls.push(HealthIntelDate.bindNumericBirthdate(bd));
            if(!returnVisit)bindBhwBirthdatePicker(bd,date,field('swal-birthdate-picker'),field('swal-birthdate-calendar'));
            const age=()=>{const b=HealthIntelDate.parseBirthdate(bd.value);let value='';if(b&&date.value&&b<=date.value){const [by,bm,day]=b.split('-').map(Number),[cy,cm,cd]=date.value.split('-').map(Number);const n=cy-by-(cm<bm||(cm===bm&&cd<day)?1:0);if(n<=130)value=n;}field('swal-age').value=value;};
            bd.addEventListener('input',age);date.addEventListener('change',age);
            if(returnVisit){
              const person=returnVisit.person,[year,month,day]=person.birthdate.split('-');
              for(const [id,value] of [['swal-fname',person.first_name],['swal-lname',person.last_name],['swal-birthdate',`${month}/${day}/${year}`],['swal-purok',person.purok]]){field(id).value=value;field(id).readOnly=true;}
              field('swal-suffix').value=person.suffix||'';field('swal-suffix').disabled=true;
              [...field('swal-nature').options].find(option=>option.value==='New consultation/case').disabled=true;
              if(returnVisit.nature==='Follow-up visit')field('swal-nature').value='Follow-up visit';
              date.nextElementSibling.textContent='Date of this visit; the original case date stays unchanged.';
              age();
            }
            controls.push(HealthIntelEncoding.enhanceSelect(field('swal-severity')),HealthIntelEncoding.bindCondition('swal'));
            visitControl=HealthIntelVisits.bind(controls,returnVisit?{caseId:returnVisit.caseId,residentId:Number(returnVisit.person.id)}:null);controls.push(visitControl);
            wizard=HealthIntelVisits.wizard(visitControl,{initialStep:returnVisit?1:0,patientLabel:returnVisit?[returnVisit.person.first_name,returnVisit.person.last_name,returnVisit.person.suffix].filter(Boolean).join(' '):''});controls.push(wizard);
            field('swal-disease').disabled=true;
            fetch('http://localhost:3000/api/bhw/encoding-options').then(r=>r.json()).then(result=>{if(!result.success)throw Error();if(field('swal-disease'))HealthIntelEncoding.populateConditions('swal',result.data);}).catch(()=>{if(field('swal-disease-note'))field('swal-disease-note').textContent='Choices could not be loaded. Close and reopen the form to retry.';});
          },
          willClose:()=>controls.forEach(control=>control.destroy()),
          preConfirm:async()=>{
            try{
              if(wizard.advance())return false;
              const value=id=>document.getElementById(id).value.trim(),birthdate=HealthIntelDate.parseBirthdate(value('swal-birthdate'));
              if(!birthdate)throw Error('Enter a real birthdate as MM/DD/YYYY.');
              if(!value('swal-fname')||!value('swal-lname')||!value('swal-purok')||!value('swal-case-date')||!value('swal-severity')||value('swal-age')==='')throw Error('Complete the required patient details, case date and severity.');
              const details=visitControl.payload();
              const payload={first_name:value('swal-fname'),last_name:value('swal-lname'),suffix:value('swal-suffix'),birthdate,purok:value('swal-purok'),date_recorded:value('swal-case-date'),severity:value('swal-severity'),remarks:value('swal-remarks'),status:'Active',visit:details.visit,...details.condition};
              const response=await fetch('http://localhost:3000/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),result=await response.json();
              if(!response.ok||!result.success)throw Error(result.error||'The case could not be saved.');return result;
            }catch(error){Swal.showValidationMessage(error.message);if(error.field)document.getElementById(error.field)?.focus();return false;}
          }
        }).then(result=>{if(result.isConfirmed){Swal.fire({icon:'success',title:result.value.new_case===false?`Visit saved · Case #REC-${result.value.id}`:`Case #REC-${result.value.id} saved`,text:result.value.new_case===false?'The visit was added to the original disease case. Disease totals are unchanged.':result.value.review_status==='Pending'?'The reported condition is awaiting MHO review.':'The patient case and consultation were recorded.'});isViewingArchive?loadArchivedPatients():loadPatients();loadDashboardStats();loadTrendChart();window.dispatchEvent(new Event('health-intel:cases-changed'));}else if(returnVisit&&!returnVisit.fromTracking)viewPatientProfile(returnVisit.person.id);});
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
          if (month) month.value = today.find(part => part.type === 'month').value;
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
