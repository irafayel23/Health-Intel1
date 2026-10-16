// BHW resident directory and linked medical dossiers.
// Classic script: load through bhw.html; cross-feature functions share its page scope.
      function bhwReturnVisitReason(person,record) {
          if(record.is_archived)return 'Archived case · view only.';
          if(person.is_deceased)return 'Confirmed deceased · use the consultation form for an eligible historical visit.';
          const same=(a,b)=>String(a||'').trim().toLocaleLowerCase('en')===String(b||'').trim().toLocaleLowerCase('en');
          if(!Number.isSafeInteger(Number(record.id))||Number(record.id)<1||!person.first_name||!person.last_name||!person.purok||!person.barangay_id||!/^\d{4}-\d{2}-\d{2}$/.test(person.birthdate||'')||
              Number(record.resident_id)!==Number(person.id)||Number(record.barangay_id)!==Number(person.barangay_id)||record.birthdate!==person.birthdate||
              !['first_name','last_name','suffix'].every(key=>same(record[key],person[key])))return 'Review the patient identity before recording a return visit.';
          if(!/^\d{4}-\d{2}-\d{2}$/.test(record.date_recorded||'')||record.date_recorded>HealthIntelDate.todayInManila())return 'Review the original case date before recording a return visit.';
          return '';
      }
      let bhwReturnVisitOpening=false;
      async function recordBhwReturnVisit(residentId,caseId,nature=null) {
          if(bhwReturnVisitOpening)return;
          if(![residentId,caseId].every(id=>Number.isSafeInteger(id)&&id>0))return;
          bhwReturnVisitOpening=true;
          closeProfileModal();
          Swal.fire({title:'Loading original case…',allowOutsideClick:false,allowEscapeKey:false,didOpen:()=>Swal.showLoading()});
          try {
              const response=await fetch(`http://localhost:3000/api/residents/${residentId}/dossier`),result=await response.json();
              if(!response.ok||!result.success)throw Error(result.error||'The patient history could not be loaded. Reopen the profile and try again.');
              const record=result.history.find(row=>Number(row.id)===caseId);
              if(!record||Number(result.resident.id)!==residentId)throw Error('The original case is no longer linked to this resident. Reopen the profile.');
              const reason=bhwReturnVisitReason(result.resident,record);if(reason)throw Error(reason);
              await openAddPatientModal({person:result.resident,caseId,nature,fromTracking:nature==='Follow-up visit'});
          }catch(error){await Swal.fire({icon:'error',title:'Return visit unavailable',text:error.message,customClass:{popup:'hi-dialog'}});}
          finally{bhwReturnVisitOpening=false;}
      }
      // 4. DIRECTORY & PROFILES
      let residentDirectoryPage = 1;
      let residentDirectoryQuery = '';
      let residentDirectoryVitalFilter = 'all';
      const residentProfilesPerPage = 12;
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
          const vitalFilter=document.getElementById('directory-vital-filter')?.value || 'all';
          if (query !== residentDirectoryQuery || vitalFilter !== residentDirectoryVitalFilter) {
              residentDirectoryPage = 1;
              residentDirectoryQuery = query;
              residentDirectoryVitalFilter = vitalFilter;
          }
          const filtered = window.allResidents ? window.allResidents.filter(p => {
             const name = p.patient_name || p.first_name + " " + p.last_name || "";
             return name.toLowerCase().includes(query)&&(vitalFilter==='all'||(vitalFilter==='deceased'?Boolean(p.is_deceased):!p.is_deceased));
          }) : [];
          renderDirectory(filtered);
      }

      function renderDirectory(data) {
        const grid = document.getElementById("resident-grid");
        if(!grid) return;
        const totalPages = Math.ceil(data.length / residentProfilesPerPage);
        residentDirectoryPage = Math.max(1, Math.min(residentDirectoryPage, totalPages || 1));
        const first = (residentDirectoryPage - 1) * residentProfilesPerPage;
        renderResidentPagination(data.length, first, totalPages);

        if (data.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-8 text-center text-[hsl(var(--muted-foreground))]">No residents found.</div>';
            return;
        }

        // Build once: appending with innerHTML reparses every preceding card.
        grid.innerHTML = data.slice(first, first + residentProfilesPerPage).map(res => {
            const patientName = res.patient_name || res.first_name + " " + res.last_name || "Unknown";
            const nameParts = patientName.split(" ");
            const initials = nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length-1][0] : "");

            const residentAge = window.HealthIntelDate?.residentAge ? HealthIntelDate.residentAge(res) : res.age;
            const ageNum = parseInt(residentAge);
            const isSenior = !isNaN(ageNum) && ageNum >= 60;

            return `
              <div class="bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group">
                <div class="w-16 h-16 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex justify-center items-center text-2xl font-bold mb-4 group-hover:scale-110 transition-transform">
                  ${escapeText(initials.toUpperCase())}
                </div>
                <h2 class="font-bold text-lg mb-1 text-[hsl(var(--foreground))]">${escapeText(patientName)}</h2>
                ${window.HealthIntelVital?.badge(res) || ''}
                ${isSenior ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 rounded text-xs font-bold mb-2 inline-block">Senior Citizen</span>' : ''}
                <p class="text-[hsl(var(--muted-foreground))] text-sm mb-4">${escapeText(res.purok)} | ${res.is_deceased?(residentAge==null?'Age at death unknown':escapeText(residentAge)+' yrs at death'):escapeText(residentAge ?? 'N/A')+' yrs'}</p>

                <button onclick="viewPatientProfile('${res.id}')" class="w-full mt-auto py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors">
                  View Medical Dossier<br>
                  <small>(${res.case_count || 0} Records)</small>
                </button>
              </div>
            `;
        }).join('');
      }

      function renderResidentPagination(total, first, totalPages) {
          const count = document.getElementById('resident-page-count');
          if (count) count.textContent = total
              ? `Showing ${first + 1}–${Math.min(first + residentProfilesPerPage, total)} of ${total} residents`
              : 'Showing 0 of 0 residents';
          const container = document.getElementById('resident-pagination');
          if (!container) return;
          container.replaceChildren();
          if (totalPages <= 1) return;
          const addButton = (label, page, disabled = false) => {
              const button = document.createElement('button');
              button.type = 'button'; button.textContent = label; button.disabled = disabled;
              button.setAttribute('aria-label', label === 'Previous' ? 'Previous resident page' : label === 'Next' ? 'Next resident page' : `Resident page ${page}`);
              const selected = page === residentDirectoryPage && label !== 'Previous' && label !== 'Next';
              if (selected) button.setAttribute('aria-current', 'page');
              button.className = selected
                  ? 'min-w-9 h-9 px-2 rounded-md bg-blue-600 text-white font-medium flex items-center justify-center text-sm shadow-sm'
                  : 'min-w-9 h-9 px-2 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] font-medium flex items-center justify-center text-sm transition-colors disabled:opacity-40';
              button.onclick = () => {
                  if (disabled) return;
                  residentDirectoryPage = page;
                  filterDirectory();
                  container.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
              };
              container.append(button);
          };
          addButton('Previous', residentDirectoryPage - 1, residentDirectoryPage === 1);
          const pages = new Set([1, totalPages]);
          for (let page = Math.max(1, residentDirectoryPage - 2); page <= Math.min(totalPages, residentDirectoryPage + 2); page++) pages.add(page);
          let previous = 0;
          for (const page of [...pages].sort((a, b) => a - b)) {
              if (page - previous > 1) {
                  const gap = document.createElement('span'); gap.textContent = '…';
                  gap.setAttribute('aria-hidden', 'true'); gap.className = 'px-1 text-[hsl(var(--muted-foreground))]';
                  container.append(gap);
              }
              addButton(String(page), page); previous = page;
          }
          addButton('Next', residentDirectoryPage + 1, residentDirectoryPage === totalPages);
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
                  document.getElementById("profile-age").innerText = HealthIntelDate.residentAge(data) ?? 'N/A';
                  if(data.is_deceased)document.getElementById('profile-age').innerText=data.death_date?`${HealthIntelDate.residentAge(data) ?? 'N/A'} (at death)`:'Age at death unknown';
                  window.HealthIntelVital?.dossier(data);

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
                      tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-4 text-center text-[hsl(var(--muted-foreground))]">No linked disease cases recorded for this resident. Historical unlinked records are not attached automatically.</td></tr>';
                  } else {
                      history.forEach(record => {
                          let statusColor = record.status === "Cleared" ? "text-green-600 dark:text-green-400" : (record.status === "Deceased" ? "text-slate-500 dark:text-slate-400" : "text-orange-600 dark:text-orange-400");
                  let dateStr = window.HealthIntelDate.formatCaseDate(record.date_recorded);
                          let severityBadge = record.severity === "High Risk" ? `<span class="bg-red-500/10 text-red-500 rounded px-1 text-xs">High Risk</span>` : "";
                          const returnReason=bhwReturnVisitReason(data,record);

                          tbody.innerHTML += `
                            <tr class="border-b border-[hsl(var(--border))]">
                              <td class="px-5 py-4 font-mono text-xs text-[hsl(var(--muted-foreground))]">
                                #REC-${record.id}<br>${dateStr}
                              </td>
                              <td class="px-5 py-4 font-semibold text-[hsl(var(--foreground))]">
                                ${HealthIntelEncoding.conditionCell(record)} <br>${severityBadge}
                              </td>
                              <td class="px-5 py-4 text-[hsl(var(--muted-foreground))] text-sm">${escapeText(record.remarks || "No remarks")}</td>
                              <td class="px-5 py-4 ${statusColor} font-bold text-sm">
                                 ${escapeText(record.status)}
                              </td>
                              <td class="px-5 py-4"><div class="flex flex-col items-start gap-2 min-w-40">
                                <button type="button" class="hi-vital-button" onclick="HealthIntelVisits.show(${Number(record.id)})">View visits</button>
                                ${returnReason?`<p class="text-xs text-[hsl(var(--muted-foreground))]">${escapeText(returnReason)}</p>`:`<button type="button" class="hi-vital-button !bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-700" aria-label="Record follow-up or admission for case REC-${Number(record.id)}" onclick="recordBhwReturnVisit(${Number(data.id)},${Number(record.id)})">Record follow-up / admission</button>`}
                              </div></td>
                            </tr>
                          `;
                      });
                  }
                  if (window.HealthIntelVisits && document.getElementById('profile-visits-list')) HealthIntelVisits.renderResidentHistory(result.visits || []);
                  const modal = document.getElementById("patientProfileModal");
                  HealthIntelModal.open(modal);
              }
          } catch(e) { console.error("Error opening dossier", e); Swal.fire('Dossier unavailable',e.message || 'Please try again later.','error'); }
      }


      function closeProfileModal() {
        const modal = document.getElementById("patientProfileModal");
        HealthIntelModal.close(modal);
      }
