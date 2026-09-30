      function openAddPatientModal() {
        const controls=[];
        Swal.fire({title:'New patient case',width:720,customClass:{popup:'hi-dialog hi-encode-dialog'},
          html:`<div class="hi-encode"><p class="hi-encode-intro">Record the patient details, then choose the reported condition. Fields marked * are required.</p>
          <section><h3>1. Patient details</h3><div class="hi-encode-grid">
          <div><label for="swal-fname">First name *</label><input id="swal-fname" maxlength="100" autocomplete="given-name" placeholder="First name"></div>
          <div><label for="swal-lname">Last name *</label><input id="swal-lname" maxlength="100" autocomplete="family-name" placeholder="Last name"></div>
          <div><label for="swal-birthdate">Birthdate *</label><input id="swal-birthdate" inputmode="numeric" maxlength="10" placeholder="MM/DD/YYYY"></div>
          <div><label for="swal-age">Age on case date</label><input id="swal-age" readonly placeholder="Calculated from birthdate"></div>
          <div class="hi-encode-wide"><label for="swal-purok">Purok / zone *</label><input id="swal-purok" maxlength="100" placeholder="Enter the purok or zone"><p class="hi-field-help">Assigned barangay: <span id="swal-assigned-barangay"></span></p></div></div></section>
          <section><h3>2. Case details</h3><div class="hi-encode-grid">
          <div><label for="swal-case-date">Case date *</label><input id="swal-case-date" type="date" min="1900-01-01"></div>
          <div><label for="swal-severity">Recorded severity *</label><select id="swal-severity"><option value="">Select severity</option><option>Mild</option><option>Monitored</option><option>High Risk</option></select></div>
          <div class="hi-encode-wide">${HealthIntelEncoding.conditionMarkup('swal')}</div>
          <div class="hi-encode-wide"><label for="swal-remarks">Symptoms / remarks</label><textarea id="swal-remarks" maxlength="4000" rows="3" placeholder="Optional follow-up information"></textarea><p class="hi-field-help">Severity describes this case. It does not declare an outbreak.</p></div></div></section></div>`,
          confirmButtonText:'Save case',confirmButtonColor:'#2563eb',showCancelButton:true,showLoaderOnConfirm:true,allowOutsideClick:()=>!Swal.isLoading(),
          didOpen:()=>{
            const field=id=>document.getElementById(id),date=field('swal-case-date'),bd=field('swal-birthdate');
            const todayParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
            date.max=['year','month','day'].map(type=>todayParts.find(part=>part.type===type).value).join('-');date.value=date.max;
            field('swal-assigned-barangay').textContent=window.currentBrgyName || 'Your assigned barangay';
            const age=()=>{const b=HealthIntelDate.parseBirthdate(bd.value);let value='';if(b&&date.value&&b<=date.value){const [by,bm,day]=b.split('-').map(Number),[cy,cm,cd]=date.value.split('-').map(Number);const n=cy-by-(cm<bm||(cm===bm&&cd<day)?1:0);if(n<=130)value=n;}field('swal-age').value=value;};
            bd.addEventListener('input',age);date.addEventListener('change',age);
            controls.push(HealthIntelEncoding.enhanceSelect(field('swal-severity')),HealthIntelEncoding.bindCondition('swal'));
            field('swal-disease').disabled=true;
            fetch('http://localhost:3000/api/bhw/encoding-options').then(r=>r.json()).then(result=>{if(!result.success)throw Error();if(field('swal-disease'))HealthIntelEncoding.populateConditions('swal',result.data);}).catch(()=>{if(field('swal-disease-note'))field('swal-disease-note').textContent='Choices could not be loaded. Close and reopen the form to retry.';});
          },
          willClose:()=>controls.forEach(control=>control.destroy()),
          preConfirm:async()=>{
            try{
              const value=id=>document.getElementById(id).value.trim(),birthdate=HealthIntelDate.parseBirthdate(value('swal-birthdate'));
              if(!birthdate)throw Error('Enter a real birthdate as MM/DD/YYYY.');
              if(!value('swal-fname')||!value('swal-lname')||!value('swal-purok')||!value('swal-case-date')||!value('swal-severity')||value('swal-age')==='')throw Error('Complete the required patient details, case date and severity.');
              const payload={first_name:value('swal-fname'),last_name:value('swal-lname'),birthdate,purok:value('swal-purok'),date_recorded:value('swal-case-date'),severity:value('swal-severity'),remarks:value('swal-remarks'),status:'Active',...HealthIntelEncoding.conditionPayload('swal')};
              const response=await fetch('http://localhost:3000/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),result=await response.json();
              if(!response.ok||!result.success)throw Error(result.error||'The case could not be saved.');return result;
            }catch(error){Swal.showValidationMessage(error.message);return false;}
          }
        }).then(result=>{if(result.isConfirmed){Swal.fire({icon:'success',title:`Case #REC-${result.value.id} saved`,text:result.value.review_status==='Pending'?'The reported condition is awaiting MHO review.':'The patient case was recorded.'});isViewingArchive?loadArchivedPatients():loadPatients();loadDashboardStats();loadTrendChart();loadPurokChoices();window.dispatchEvent(new Event('health-intel:cases-changed'));}});
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
          const params=new URLSearchParams({barangay_id:brgy_id,month,year,include_archived:'true'});
          const res = await fetch('http://localhost:3000/api/patients?' + params);
          const result = await res.json();

          if(!result.success) throw new Error("DB Error");

          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();

          const brgyName = window.currentBrgyName || 'Blumentritt';

          doc.setFontSize(16);
          doc.text(`Barangay Health Station - ${brgyName}`, 14, 20);
          doc.setFontSize(12);
          doc.text(type === 'MONTHLY' ? `Barangay Monthly Case List (${month} ${year})` : `Barangay Surveillance Case Log (${month} ${year})`, 14, 30);

          const chosenPurok=document.getElementById('bhw-purok-filter').value;
          const records=type==='SURVEILLANCE' && chosenPurok!=='All Puroks' ? result.data.filter(p=>p.purok===chosenPurok) : result.data;
          if(type==='SURVEILLANCE' && chosenPurok!=='All Puroks') doc.text(`Purok / Zone: ${chosenPurok}`,14,37);
          const data = records.map(p => [
            p.patient_name || 'N/A',
            p.age ?? 'N/A',
            p.purok || 'N/A',
            HealthIntelEncoding.conditionLabel(p),
            p.status || 'Active',
            p.date_recorded ? new Date(p.date_recorded).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'}) : 'Not recorded'
          ]);

          doc.autoTable({
            startY: 40,
            head: [['Patient Name', 'Age', 'Purok', 'Diagnosis', 'Status', 'Date']],
            body: data.length ? data : [[{ content: `No recorded cases match ${month} ${year}${type === 'SURVEILLANCE' && chosenPurok !== 'All Puroks' ? ` in ${chosenPurok}` : ''}.`, colSpan: 6 }]],
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
        const userId = localStorage.getItem('active_user_id') || 'Unknown';
        const isDark = document.documentElement.classList.contains("dark");
        Swal.fire({
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a',
          title: 'Account Info & Security',
          html: `
            <div class="text-left">
              <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 rounded-xl p-5 mb-6 shadow-sm">
                <div class="flex items-center gap-3 mb-1">
                  <i data-lucide="shield-check" class="w-5 h-5 text-blue-600 dark:text-blue-400"></i>
                  <p class="m-0 text-sm font-semibold text-blue-800 dark:text-blue-300">System ID: <span class="font-mono bg-blue-200/50 dark:bg-blue-800/50 px-2 py-0.5 rounded text-blue-900 dark:text-blue-200">${userId}</span></p>
                </div>
                <div class="flex items-center gap-3">
                  <i data-lucide="badge-check" class="w-5 h-5 text-blue-600 dark:text-blue-400"></i>
                  <p class="m-0 text-sm font-medium text-blue-700 dark:text-blue-400">Role: ${userId.startsWith('MHO') ? 'Municipal Health Officer' : 'Barangay Health Worker'}</p>
                </div>
              </div>

              <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
                <h4 class="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
                  <i data-lucide="key" class="w-4 h-4 text-slate-400 dark:text-slate-500"></i> Change Password
                </h4>

                <div class="space-y-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Current Password</label>
                    <input type="password" id="current-pass" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="Enter current password">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">New Password</label>
                    <input type="password" id="new-pass" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="Enter new password">
                  </div>
                </div>
              </div>
            </div>
          `,
          didOpen: () => { if (window.lucide) lucide.createIcons(); },
          width: '450px',
          showCancelButton: true,
          confirmButtonText: 'Update Password',
          confirmButtonColor: isDark ? '#3b82f6' : '#0f172a',
          preConfirm: async () => {
            const current_password = document.getElementById('current-pass').value;
            const new_password = document.getElementById('new-pass').value;
            const system_id = localStorage.getItem('active_user_id');

            if(!current_password || !new_password) {
              Swal.showValidationMessage('Please fill in both password fields to update, or cancel to close.');
              return false;
            }

            try {
              const res = await fetch('http://localhost:3000/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ system_id, current_password, new_password })
              });
              const data = await res.json();
              if (!data.success) {
                Swal.showValidationMessage(data.message || 'Update failed');
              }
              return data;
            } catch (err) {
              Swal.showValidationMessage(err.message || 'Server error. Try again later.');
            }
          }
        }).then((result) => {
          if (result.isConfirmed) {
            Swal.fire({
              icon: 'success',
              title: 'Success',
              text: 'Password updated. Please sign in with your new password.'
            }).then(() => { HealthIntel.clearSession(); window.location.replace('index.html'); });
          }
        });
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
