
      function openAddPatientModal() {
        Swal.fire({
          title: "New Resident Health Record",
          width: "600px",
          html: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-semibold text-[hsl(var(--foreground))]">First Name *</label>
                    <input id="swal-fname" class="w-full px-4 py-2.5 bg-transparent border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="e.g. Juan">
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-semibold text-[hsl(var(--foreground))]">Last Name *</label>
                    <input id="swal-lname" class="w-full px-4 py-2.5 bg-transparent border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="e.g. Dela Cruz">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-4">
                <div class="flex flex-col gap-1.5">
                    <label for="swal-birthdate" class="text-sm font-semibold text-[hsl(var(--foreground))]">Birthdate (MM/DD/YYYY) *</label>
                    <input id="swal-birthdate" type="text" inputmode="numeric" autocomplete="bday" maxlength="10" placeholder="MM/DD/YYYY" class="w-full px-4 py-2.5 bg-transparent border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-semibold text-[hsl(var(--foreground))]">Age on Case Date (Auto-Computed)</label>
                    <input id="swal-age" type="number" class="w-full px-4 py-2.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] opacity-70 cursor-not-allowed outline-none" readonly placeholder="--">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-4">
                <div class="flex flex-col gap-1.5">
                    <label for="swal-case-date" class="text-sm font-semibold text-[hsl(var(--foreground))]">Case Date *</label>
                    <input id="swal-case-date" type="date" min="1900-01-01" class="w-full px-4 py-2.5 bg-transparent border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] outline-none [color-scheme:light] dark:[color-scheme:dark]">
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="swal-severity" class="text-sm font-semibold text-[hsl(var(--foreground))]">Recorded Severity *</label>
                    <select id="swal-severity" class="w-full px-4 py-2.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] outline-none">
                        <option value="">Select recorded severity</option>
                        <option value="Mild">Mild</option><option value="Monitored">Monitored</option><option value="High Risk">High Risk</option>
                    </select>
                    <p class="text-xs text-[hsl(var(--muted-foreground))]">Choose the severity actually assessed for this case. The map uses it for color; it does not diagnose an outbreak.</p>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-semibold text-[hsl(var(--foreground))]">Purok / Zone within your barangay *</label>
                    <input id="swal-purok" maxlength="100" class="w-full px-4 py-2.5 bg-transparent border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:border-blue-500 outline-none" placeholder="Enter the actual purok / zone">
                    <p class="text-xs text-[hsl(var(--muted-foreground))]">Assigned barangay: <span id="swal-assigned-barangay"></span></p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-semibold text-[hsl(var(--foreground))]">Diagnosed Disease / Case *</label>
                    <input list="disease-options" id="swal-disease" class="w-full px-4 py-2.5 bg-transparent border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="Select an existing category">
                    <datalist id="disease-options"></datalist>
                    <p id="swal-disease-notice" class="text-xs text-[hsl(var(--muted-foreground))]">Loading case categories...</p>
                </div>
            </div>
            <div class="flex flex-col gap-1.5 text-left">
                <label class="text-sm font-semibold text-[hsl(var(--foreground))]">Symptoms / Remarks</label>
                <textarea id="swal-remarks" class="w-full px-4 py-3 bg-transparent border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all min-h-[80px] resize-y" placeholder="Any additional notes..."></textarea>
            </div>
`,
          customClass: { popup: "hi-dialog" },
          confirmButtonText: "Save Record",
          confirmButtonColor: "#007bff",
          showCancelButton: true,
          showLoaderOnConfirm: true,
          allowOutsideClick: () => !Swal.isLoading(),
          didOpen: () => {
             const bd = document.getElementById('swal-birthdate');
             const age = document.getElementById('swal-age');
             const caseDate = document.getElementById('swal-case-date');
             const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
             const today = ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
             caseDate.max = today;
             caseDate.value = today;
             document.getElementById('swal-assigned-barangay').textContent=window.currentBrgyName || 'Loading…';
             function refreshAge() {
                 const birthdate=window.HealthIntelDate.parseBirthdate(bd.value);
                 if (!birthdate || !caseDate.value) { age.value=''; return; }
                 const [by,bm,day] = birthdate.split('-').map(Number);
                 const [cy,cm,cd] = caseDate.value.split('-').map(Number);
                 const value = cy-by-(cm<bm||(cm===bm&&cd<day)?1:0);
                 age.value = value>=0 && value<=130 ? value : '';
             }
             bd.addEventListener('input',refreshAge);
             caseDate.addEventListener('change',refreshAge);
             fetch('http://localhost:3000/api/bhw/encoding-options').then(response=>response.json()).then(result=>{
                 const choices=document.getElementById('disease-options');
                 const notice=document.getElementById('swal-disease-notice');
                 if(!choices||!notice) return;
                 if(!result.success) throw new Error('Disease choices are unavailable.');
                 for(const item of result.data) { const option=document.createElement('option'); option.value=item.name; choices.append(option); }
                 notice.textContent='All recorded categories are eligible, not only the ten forecast diseases. Ask Admin to add a new category; historical names need registry review.';
             }).catch(()=>{ const notice=document.getElementById('swal-disease-notice'); if(notice) notice.textContent='Disease choices could not be loaded. Close this form and try again.'; });
          },
          preConfirm: async () => {
            const f = document.getElementById("swal-fname").value;
            const l = document.getElementById("swal-lname").value;
            const birthdateText = document.getElementById("swal-birthdate").value;
            const b = window.HealthIntelDate.parseBirthdate(birthdateText);
            const a = document.getElementById("swal-age").value;
            const p = document.getElementById("swal-purok").value;
            const d = document.getElementById("swal-disease").value;
            const r = document.getElementById("swal-remarks").value;
            const caseDate = document.getElementById('swal-case-date').value;
            const severity = document.getElementById('swal-severity').value;
            if (birthdateText.trim() && !b) { Swal.showValidationMessage('Enter a real birthdate as MM/DD/YYYY, for example 05/14/2000.'); return false; }
            if (!f.trim() || !l.trim() || !b || !p || !d.trim() || !caseDate || !severity || a === '') {
              Swal.showValidationMessage("Please fill out all required fields (*)");
              return false; 
            }
            const payload = {
              first_name: f, 
              last_name: l, 
              patient_name: `${f} ${l}`, 
              birthdate: b, 
              age: a, 
              purok: p, 
              disease: d, 
              remarks: r,
              date_recorded: caseDate,
              severity,
              status: "Active",
              encoded_by: localStorage.getItem('active_user_id') || "Unknown BHW"
            };
            try {
                const response = await fetch('http://localhost:3000/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
                const result = await response.json();
                if(!result.success) throw new Error(result.error || 'The record could not be saved.');
                return result;
            } catch(error) { Swal.showValidationMessage(error.message || 'The record could not be saved. Please try again.'); return false; }
          },
        }).then(async (result) => {
          if (result.isConfirmed) {
                Swal.fire("Saved!", "Patient recorded successfully.", "success");
                isViewingArchive ? loadArchivedPatients() : loadPatients();
                loadDashboardStats();
              loadTrendChart();
              loadPurokChoices();
              window.dispatchEvent(new Event('health-intel:cases-changed'));
          }
        });
      }

      async function generateBHWReport(type) {
        Swal.fire({
          title: 'Generating PDF...',
          html: 'Please wait while we connect to the database and generate the certified report.',
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
            p.disease || 'N/A', 
            p.status || 'Active', 
            p.date_recorded ? new Date(p.date_recorded).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'}) : 'Not recorded'
          ]);
          
          doc.autoTable({
            startY: 40,
            head: [['Patient Name', 'Age', 'Purok', 'Diagnosis', 'Status', 'Date']],
            body: data,
            theme: 'striped',
            headStyles: { fillColor: type === 'MONTHLY' ? [2, 132, 199] : [234, 88, 12] }
          });
          
          doc.save(`BHW_Report_${brgyName}_${type}_${month}_${year}.pdf`);
          Swal.fire('Success', 'Report successfully generated and downloaded.', 'success');
        } catch (e) {
          console.error(e);
          Swal.fire('Error', e.message || 'Failed to generate report. Please try again.', 'error');
        }
      }

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
  