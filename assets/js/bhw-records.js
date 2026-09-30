
      lucide.createIcons();
      
      let allPatients = [];
      let isViewingArchive = false;
      let currentPage = 1;
      const rowsPerPage = 10;

      // 1. SIDEBAR TAB SWITCHING
      const navButtons = document.querySelectorAll(".nav-menu .nav-item");
      const viewSections = document.querySelectorAll(".view-section");

      navButtons.forEach((button) => {
        if (button.classList.contains("sign-out")) return;

        button.addEventListener("click", () => {
          navButtons.forEach((btn) => btn.classList.remove("active"));
          button.classList.add("active");

          const targetId = button.getAttribute("data-target");
          if (targetId === 'view-resident-profiles') loadResidentDirectory();
          viewSections.forEach((view) => {
            view.classList.add("hidden"); view.classList.remove("block"); view.classList.remove("flex");
          });
          
          const view = document.getElementById(targetId);
          if (view) {
              view.classList.remove("hidden"); if(view.classList.contains("flex-col")){ view.classList.add("flex"); } else { view.classList.add("block"); }

          }
        });
      });

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

      async function loadPurokChoices() {
        const filter=document.getElementById('bhw-purok-filter');
        if(!filter)return;
        try {
          const response=await fetch('http://localhost:3000/api/bhw/puroks');
          const result=await response.json();
          if(!response.ok||!result.success)throw new Error('Purok choices unavailable');
          const selected=filter.value;
          filter.replaceChildren();
          const all=document.createElement('option');all.value='All Puroks';all.textContent='All Puroks / Zones in your barangay';filter.append(all);
          for(const name of result.data){const option=document.createElement('option');option.value=name;option.textContent=name;filter.append(option);}
          if(result.data.includes(selected))filter.value=selected;
        }catch(error){console.error('Purok choices unavailable',error);}
      }

      window.addEventListener('health-intel:case-corrected', () => {
          loadPatients(); loadDashboardStats(); loadTrendChart(); loadResidentDirectory();
      });
      window.addEventListener('health-intel:cases-changed', loadResidentDirectory);

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

      async function loadDashboardStats() {
          try {
            const url = window.currentBrgyId ? `http://localhost:3000/api/bhw-stats?barangay_id=${window.currentBrgyId}` : 'http://localhost:3000/api/bhw-stats';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
              document.getElementById("stat-total").innerText = data.total;
              document.getElementById("stat-active").innerText = data.active;
              document.getElementById("stat-cleared").innerText = data.cleared;
              document.getElementById("stat-high-risk").innerText = data.high_risk;
  
              document.getElementById("bd-cleared").innerText = data.cleared;
              document.getElementById("bd-mild").innerText = data.mild;
              document.getElementById("bd-monitored").innerText = data.monitored;
              document.getElementById("bd-high").innerText = data.high_risk;
            }
          } catch (e) { console.error("Error loading stats:", e); }
      }

      // 3. RENDER PATIENTS TABLE & PAGINATION
      function filterTable() {
          if (typeof event !== 'undefined' && event && event.type === 'keyup') currentPage = 1;
          const searchInput = document.getElementById("patient-search-input");
          const query = searchInput ? searchInput.value.toLowerCase() : "";
          
          let filtered = allPatients.filter(p => {
              const patientName = p.patient_name || p.first_name + " " + p.last_name || p.name || "";
              const nameMatch = patientName.toLowerCase().includes(query);
              const diseaseMatch = p.disease ? p.disease.toLowerCase().includes(query) : false;
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
                    <td class="px-6 py-4 text-slate-600 dark:text-slate-400">${escapeText(record.disease)}</td>
                    <td class="px-6 py-4 font-semibold ${statusColor}">${record.status || (isViewingArchive ? "Archived" : "")}</td>
                    <td class="px-6 py-4">
                        <div class="patient-row-actions">
                            <button onclick="${residentId ? `viewPatientProfile(${residentId})` : `viewUnlinkedCase(${record.id})`}" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-xs shadow-sm transition-colors">${residentId ? 'Profile' : 'Case details'}</button>
                            ${!isViewingArchive ? `<button onclick="updatePatientStatus(${record.id})" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium text-xs shadow-sm transition-colors">Update Status</button>` : ""}
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

      // 4. DIRECTORY & PROFILES
      async function loadResidentDirectory() {
          try {
              const url = window.currentBrgyId ? `http://localhost:3000/api/residents?barangay_id=${window.currentBrgyId}` : "http://localhost:3000/api/residents";
              const response = await fetch(url);
              const result = await response.json();
              if (result.success) {
                  window.allResidents = result.data;
                  filterDirectory();
              }
          } catch(e) {
              console.error("Error loading directory", e);
          }
      }

      function filterDirectory() {
          const query = document.getElementById("directory-search").value.toLowerCase();
          const filtered = window.allResidents ? window.allResidents.filter(p => {
             const name = p.patient_name || p.first_name + " " + p.last_name || "";
             return name.toLowerCase().includes(query);
          }) : [];
          renderDirectory(filtered);
      }

      function renderDirectory(data) {
        const grid = document.getElementById("resident-grid");
        if(!grid) return;
        grid.innerHTML = "";
        
        if (data.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-8 text-center text-[hsl(var(--muted-foreground))]">No residents found.</div>';
            return;
        }

        data.forEach(res => {
            const patientName = res.patient_name || res.first_name + " " + res.last_name || "Unknown";
            const nameParts = patientName.split(" ");
            const initials = nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length-1][0] : "");
            
            const ageNum = parseInt(res.age);
            const isSenior = !isNaN(ageNum) && ageNum >= 60;
            
            grid.innerHTML += `
              <div class="bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group">
                <div class="w-16 h-16 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex justify-center items-center text-2xl font-bold mb-4 group-hover:scale-110 transition-transform">
                  ${escapeText(initials.toUpperCase())}
                </div>
                <h3 class="font-bold text-lg mb-1 text-[hsl(var(--foreground))]">${escapeText(patientName)}</h3>
                ${isSenior ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 rounded text-xs font-bold mb-2 inline-block">Senior Citizen</span>' : ''}
                <p class="text-[hsl(var(--muted-foreground))] text-sm mb-4">${escapeText(res.purok)} | ${res.age} yrs</p>
                
                <button onclick="viewPatientProfile('${res.id}')" class="w-full mt-auto py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors">
                  View Medical Dossier<br>
                  <small class="opacity-80">(${res.case_count || 0} Records)</small>
                </button>
              </div>
            `;
        });
      }

      async function viewPatientProfile(residentId) {
          if (!Number.isSafeInteger(Number(residentId)) || Number(residentId)<=0) {
              Swal.fire('Resident link unavailable', 'This historical case has no linked resident profile. Ask the Admin to review the source record; the system will not guess the identity.', 'info');
              return;
          }
          try {
              // Now we call the real backend endpoint for dossiers
              const res = await fetch(`http://localhost:3000/api/residents/${residentId}/dossier`);
              const result = await res.json();
              if(result.success) {
                  const data = result.resident;
                  const history = result.history;

                  let patientName = data.patient_name || data.first_name + " " + data.last_name || "Unknown";
                  const nameParts = patientName.split(" ");
                  const initials = nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length-1][0] : "");
                  
                  document.getElementById("profile-initials").innerText = initials.toUpperCase();
                  document.getElementById("profile-name").innerText = patientName;
                  document.getElementById("profile-purok").innerText = data.purok || "Unknown";
                  document.getElementById("profile-age").innerText = data.age || "N/A";

                                      const tbody = document.getElementById("profile-history-body");
                    tbody.innerHTML = "";

                    // Calculate stats
                    const totalCases = history.length;
                    const activeCases = history.filter(h => h.status === 'Active').length;
                    const highRisk = history.filter(h => h.severity === 'High Risk').length;
                    
                    if (document.getElementById("dossier-total")) {
                        document.getElementById("dossier-total").innerText = totalCases;
                        document.getElementById("dossier-active").innerText = activeCases;
                        document.getElementById("dossier-risk").innerText = highRisk;
                    }
                    
                    if(history.length === 0) {
                      tbody.innerHTML = '<tr><td colspan="4" class="px-5 py-4 text-center text-slate-500">No records found</td></tr>';
                  } else {
                      history.forEach(record => {
                          let statusColor = record.status === "Cleared" ? "text-green-600 dark:text-green-400" : (record.status === "Deceased" ? "text-slate-500 dark:text-slate-400" : "text-orange-600 dark:text-orange-400");
                  let dateStr = window.HealthIntelDate.formatCaseDate(record.date_recorded);
                          let severityBadge = record.severity === "High Risk" ? `<span class="bg-red-500/10 text-red-500 rounded px-1 text-xs">High Risk</span>` : "";

                          tbody.innerHTML += `
                            <tr class="border-b border-[hsl(var(--border))]">
                              <td class="px-5 py-4 font-mono text-xs text-[hsl(var(--muted-foreground))]">
                                #REC-${record.id}<br>${dateStr}
                              </td>
                              <td class="px-5 py-4 font-semibold text-[hsl(var(--foreground))]">
                                ${escapeText(record.disease)} <br>${severityBadge}
                              </td>
                              <td class="px-5 py-4 text-[hsl(var(--muted-foreground))] text-sm">${escapeText(record.remarks || "No remarks")}</td>
                              <td class="px-5 py-4 ${statusColor} font-bold text-sm">
                                 ${escapeText(record.status)}
                              </td>
                            </tr>
                          `;
                      });
                  }
                  const modal = document.getElementById("patientProfileModal");
                  modal.classList.remove("hidden"); 
                  modal.style.display = "flex";
              }
          } catch(e) { console.error("Error opening dossier", e); Swal.fire('Dossier unavailable',e.message || 'Please try again later.','error'); }
      }

      function viewUnlinkedCase(caseId) {
          const record=allPatients.find(item=>Number(item.id)===Number(caseId));
          if(!record)return Swal.fire({icon:'info',title:'Case unavailable',text:'Refresh Patient Records and try again.'});
          const name=record.patient_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Not recorded';
          Swal.fire({title:'Recorded case details',customClass:{popup:'hi-dialog'},confirmButtonText:'Close',
              html:`<div class="hi-case-details"><div><strong>Name on case:</strong> ${escapeText(name)}</div><div><strong>Barangay:</strong> ${escapeText(window.currentBrgyName || 'Assigned barangay')}</div><div><strong>Purok / Zone:</strong> ${escapeText(record.purok || 'Not recorded')}</div><div><strong>Case date:</strong> ${escapeText(window.HealthIntelDate.formatCaseDate(record.date_recorded))}</div><div><strong>Disease / case:</strong> ${escapeText(record.disease || 'Not recorded')}</div><div><strong>Case status:</strong> ${escapeText(record.status || 'Not recorded')}</div><div><strong>Recorded severity:</strong> ${escapeText(record.severity || 'Not recorded')}</div><div><strong>Remarks:</strong> ${escapeText(record.remarks || 'None recorded')}</div><p>This historical case has no verified resident-profile link. Review its source before linking it to a person.</p></div>`});
      }

      function closeProfileModal() {
        const modal = document.getElementById("patientProfileModal");
        modal.classList.add("hidden");
        modal.style.display = "none";
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

      // 5. CHART & MAP LOGIC
      let myBhwChart = null;
      async function loadTrendChart() {
          try {
              const url = window.currentBrgyId ? `http://localhost:3000/api/bhw-trend?barangay_id=${window.currentBrgyId}` : 'http://localhost:3000/api/bhw-trend';
              const res = await fetch(url);
              const result = await res.json();
              if (result.success) {
                  const ctx = document.getElementById("bhwChart").getContext("2d");
                  if (myBhwChart) myBhwChart.destroy();
                  
                  // Get the months up to current month to match standard UI, or just show Jan-May if it's currently early in the year
                  // Let's just dynamically grab Jan through the current month
                  const currentMonthIndex = new Date().getMonth(); 
                  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  
                  const displayLabels = monthLabels.slice(0, currentMonthIndex + 1);
                  const displayData = result.data.slice(0, currentMonthIndex + 1);

                  myBhwChart = new Chart(ctx, {
                      type: "line",
                      data: {
                          labels: displayLabels,
                          datasets: [{ label: "Cases", data: displayData, borderColor: "#0ea5e9", backgroundColor: "rgba(14, 165, 233, 0.1)", fill: true, tension: 0.4 }]
                      },
                      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, suggestedMax: 10 }, x: { grid: { display: false } } } }
                  });
              }
          } catch(e) { console.error("Error loading trend chart:", e); }
      }

      document.addEventListener("DOMContentLoaded", async () => {
        const userId = localStorage.getItem("active_user_id");
        if (userId) {
          const nameEl = document.getElementById('dropdown-user-name');
          if (nameEl) nameEl.innerText = userId;
          try {
            const res = await fetch(`http://localhost:3000/api/bhw/context?system_id=${userId}`);
            const result = await res.json();
            if (result.success) {
              window.currentBrgyId = result.data.barangay_id;
              window.currentBrgyName = result.data.barangay_name;
              
              const brgyDisplay = window.currentBrgyName || "Unknown Barangay";
              document.getElementById("dynamic-portal-title").innerText = `Barangay Health Worker Portal — ${brgyDisplay}`;
              const subtitle = document.getElementById("dynamic-dashboard-subtitle");
              if (subtitle) subtitle.innerText = `Real-time insights for ${brgyDisplay}.`;
            }
          } catch(e) { console.error("Error fetching context:", e); }
        }

        loadDashboardStats();
        loadTrendChart();
        loadPatients();
        loadPurokChoices();
        loadResidentDirectory();
      });
