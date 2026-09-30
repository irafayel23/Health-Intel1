// BHW case state, tables, status updates and archive actions.
// Classic script: load through bhw.html; cross-feature functions share its page scope.

      let allPatients = [];
      let isViewingArchive = false;
      let currentPage = 1;
      const rowsPerPage = 10;


      // 2. DATA FETCHING (FIXED TO MATCH BACKEND)
      async function loadPatients() {
        try {
          const url = window.currentBrgyId ? `http://localhost:3000/api/patients?barangay_id=${window.currentBrgyId}` : 'http://localhost:3000/api/patients';
          const response = await fetch(url);
          const result = await response.json();
          if (result.success) {
            allPatients = result.data;
            filterTable();
          }
        } catch (e) {
          console.error("Error loading patients:", e);
        }
      }


      async function loadArchivedPatients() {
        try {
          const url = window.currentBrgyId ? `http://localhost:3000/api/patients/archived?barangay_id=${window.currentBrgyId}` : 'http://localhost:3000/api/patients/archived';
          const response = await fetch(url);
          const result = await response.json();
          if (result.success) {
            allPatients = result.data;
            filterTable();
          }
        } catch (error) {
          console.error("Failed to load archived", error);
        }
      }


      // 3. RENDER PATIENTS TABLE & PAGINATION
      function filterTable() {
          if (typeof event !== 'undefined' && event && event.type === 'keyup') currentPage = 1;
          const searchInput = document.getElementById("patient-search-input");
          const query = searchInput ? searchInput.value.toLowerCase() : "";

          let filtered = allPatients.filter(p => {
              const patientName = p.patient_name || p.first_name + " " + p.last_name || p.name || "";
              const nameMatch = patientName.toLowerCase().includes(query);
              const diseaseMatch = HealthIntelEncoding.conditionLabel(p).toLowerCase().includes(query);
              return nameMatch || diseaseMatch;
          });
          renderPatientsTable(filtered);
      }

      function toggleArchiveView() {
          isViewingArchive = !isViewingArchive;
          const btn = document.getElementById("toggle-archive-btn");
          const title = document.getElementById("patients-page-title");

          if (isViewingArchive) {
              btn.innerHTML = "<i data-lucide='arrow-left' class='w-4 h-4'></i> Back to Active Records";
              btn.classList.remove("bg-[hsl(var(--card))]", "text-[hsl(var(--foreground))]");
              btn.classList.add("bg-orange-500", "text-white", "border-orange-500", "hover:bg-orange-600");
              title.innerText = "Archived Patient Records";
              loadArchivedPatients();
          } else {
              btn.innerHTML = "<i data-lucide='archive' class='w-4 h-4'></i> View Archived";
              btn.classList.add("bg-[hsl(var(--card))]", "text-[hsl(var(--foreground))]");
              btn.classList.remove("bg-orange-500", "text-white", "border-orange-500", "hover:bg-orange-600");
              title.innerText = "Patient Records Profiling";
              loadPatients();
          }
          lucide.createIcons();
      }

      function renderPatientsTable(data) {
        const tbody = document.getElementById("patients-table-body");
        tbody.innerHTML = "";

        const totalPages = Math.ceil(data.length / rowsPerPage);
        currentPage = Math.max(1,Math.min(currentPage,totalPages || 1));
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const pageData = data.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-[hsl(var(--muted-foreground))]">No records found.</td></tr>';
        } else {
            pageData.forEach((record) => {
                let statusColor = record.status === "Cleared" ? "text-green-600 dark:text-green-400" : (record.status === "Deceased" ? "text-slate-500 dark:text-slate-400" : "text-orange-600 dark:text-orange-400");
                let fullName = record.patient_name || record.first_name + " " + record.last_name || record.name;

                const residentId = Number.isSafeInteger(Number(record.resident_id)) && Number(record.resident_id)>0 ? Number(record.resident_id) : null;

                tbody.innerHTML += `
                  <tr class="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors">
                    <td class="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">${escapeText(fullName)}</td>
                    <td class="px-6 py-4 text-slate-600 dark:text-slate-400">${escapeText(record.purok || 'Not recorded')}</td>
                    <td class="px-6 py-4 text-slate-600 dark:text-slate-400">${HealthIntelEncoding.conditionCell(record)}</td>
                    <td class="px-6 py-4 font-semibold ${statusColor}">${record.status || (isViewingArchive ? "Archived" : "")}</td>
                    <td class="px-6 py-4">
                        <div class="patient-row-actions">
                            <button onclick="${residentId ? `viewPatientProfile(${residentId})` : `viewUnlinkedCase(${record.id})`}" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-xs shadow-sm transition-colors">${residentId ? 'Profile' : 'Case details'}</button>
                            ${!isViewingArchive ? `<button onclick="updatePatientStatus(${record.id})" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium text-xs shadow-sm transition-colors">Update Status</button>` : ""}
                            ${!isViewingArchive && record.disease_review_status==='Clarification' ? `<button onclick="supplyConditionClarification(${record.id})" class="hi-review-actions">Clarify</button>` : ""}
                            ${!isViewingArchive ? `<button onclick="HealthIntelCorrections.open(${record.id})" class="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-md font-medium text-xs transition-colors">Correct</button>` : ""}
                            <button onclick="toggleArchiveStatus(${record.id})" class="px-3 py-1.5 ${isViewingArchive ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded-md font-medium text-xs shadow-sm transition-colors">${isViewingArchive ? "Restore" : "Archive"}</button>
                        </div>
                    </td>
                  </tr>
                `;
            });
        }
        renderPaginationControls(totalPages);
      }

      function renderPaginationControls(totalPages) {
        const container = document.getElementById("patients-pagination");
        if (!container) return;
        container.innerHTML = "";

        if (totalPages <= 1) return;

        const addButton=(label,page,disabled=false)=>{
            const btn = document.createElement("button");
            btn.type='button';btn.innerText=label;btn.disabled=disabled;btn.setAttribute('aria-label',label==='Previous'?'Previous page':label==='Next'?'Next page':`Page ${page}`);
            if (page === currentPage && label!=='Previous' && label!=='Next') {
                btn.setAttribute('aria-current','page');
                btn.className = "min-w-9 h-9 px-2 rounded-md bg-blue-600 text-white font-medium flex items-center justify-center text-sm shadow-sm";
            } else {
                btn.className = "min-w-9 h-9 px-2 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] font-medium flex items-center justify-center text-sm transition-colors disabled:opacity-40";
            }
            btn.onclick=()=>{currentPage=page;filterTable();};
            container.appendChild(btn);
        };
        addButton('Previous',currentPage-1,currentPage===1);
        const pages=new Set([1,totalPages]);
        for(let page=Math.max(1,currentPage-2);page<=Math.min(totalPages,currentPage+2);page++)pages.add(page);
        let previous=0;
        for(const page of [...pages].sort((a,b)=>a-b)){
            if(page-previous>1){const gap=document.createElement('span');gap.textContent='…';gap.className='px-1 text-[hsl(var(--muted-foreground))]';container.append(gap);}
            addButton(String(page),page);
            previous=page;
        }
        addButton('Next',currentPage+1,currentPage===totalPages);
      }


      function viewUnlinkedCase(caseId) {
          const record=allPatients.find(item=>Number(item.id)===Number(caseId));
          if(!record)return Swal.fire({icon:'info',title:'Case unavailable',text:'Refresh Patient Records and try again.'});
          const name=record.patient_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Not recorded';
          Swal.fire({title:'Recorded case details',customClass:{popup:'hi-dialog'},confirmButtonText:'Close',
              html:`<div class="hi-case-details"><div><strong>Name on case:</strong> ${escapeText(name)}</div><div><strong>Barangay:</strong> ${escapeText(window.currentBrgyName || 'Assigned barangay')}</div><div><strong>Purok / Zone:</strong> ${escapeText(record.purok || 'Not recorded')}</div><div><strong>Case date:</strong> ${escapeText(window.HealthIntelDate.formatCaseDate(record.date_recorded))}</div><div><strong>Disease / case:</strong> ${HealthIntelEncoding.conditionCell(record)}</div><div><strong>Case status:</strong> ${escapeText(record.status || 'Not recorded')}</div><div><strong>Recorded severity:</strong> ${escapeText(record.severity || 'Not recorded')}</div><div><strong>Remarks:</strong> ${escapeText(record.remarks || 'None recorded')}</div><p>This historical case has no verified resident-profile link. Review its source before linking it to a person.</p></div>`});
      }


      async function updatePatientStatus(id) {
        const result=await Swal.fire({title:'Update Patient Status',
          width:520,customClass:{popup:'hi-dialog'},
          html:'<div class="hi-form"><div><label for="swal-input1">Case status</label><select id="swal-input1"><option value="Active">Active</option><option value="Cleared">Cleared</option><option value="Deceased">Deceased</option></select></div><div><label for="swal-input2">Follow-up notes</label><textarea id="swal-input2" maxlength="4000" rows="4" placeholder="Enter a follow-up note, if any"></textarea><p>New notes are appended to existing remarks.</p></div></div>',
          didOpen:()=>{const current=allPatients.find(record=>Number(record.id)===Number(id));if(current)document.getElementById('swal-input1').value=current.status;},
          showCancelButton:true,confirmButtonText:'Save update',showLoaderOnConfirm:true,allowOutsideClick:()=>!Swal.isLoading(),
          preConfirm:async()=>{try{const response=await fetch(`http://localhost:3000/api/patients/${id}/status`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({new_status:document.getElementById('swal-input1').value,remarks:document.getElementById('swal-input2').value})});const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'The update could not be saved.');return data;}catch(error){Swal.showValidationMessage(error.message || 'The update could not be saved.');return false;}}
        });
        if(result.isConfirmed){Swal.fire('Updated!','The status and entered follow-up notes were saved.','success');loadPatients();loadDashboardStats();loadTrendChart();window.dispatchEvent(new Event('health-intel:cases-changed'));}
      }

      async function toggleArchiveStatus(id) {
          const restoring = isViewingArchive;
          const result = await Swal.fire({
            title: restoring ? "Restore Case?" : "Archive Case?",
            text: restoring ? "This will return the case to active records." : "This will hide the case from active views.",
            icon: "warning",
            customClass: { popup: 'hi-dialog' },
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, proceed!",
            showLoaderOnConfirm: true,
            allowOutsideClick: () => !Swal.isLoading(),
            preConfirm: async () => {
              try {
                const endpoint = restoring ? "restore" : "archive";
                const response = await fetch(`http://localhost:3000/api/patients/${id}/${endpoint}`, { method: "PUT" });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.error || 'The case could not be changed.');
                return data;
              } catch (error) {
                Swal.showValidationMessage(error.message || 'The case could not be changed. Please try again.');
                return false;
              }
            }
          });
          if (!result.isConfirmed) return;
          Swal.fire(restoring ? "Restored!" : "Archived!", "", "success");
          if (restoring) loadArchivedPatients();
          else loadPatients();
          loadDashboardStats();
          loadTrendChart();
          window.dispatchEvent(new Event('health-intel:cases-changed'));
      }
