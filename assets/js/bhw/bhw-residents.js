// BHW resident directory and linked medical dossiers.
// Classic script: load through bhw.html; cross-feature functions share its page scope.
      function bhwReturnVisitReason(person,record) {
          if(record.is_archived)return 'Archived case · view only.';
          if(person.is_deceased || record.status === 'Deceased')return 'Historical record. Consultations are view only.';
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
      const residentProfilesPerPage = window.matchMedia?.('(max-width: 600px)').matches ? 6 : 12;
      let residentRequest=0,residentController,residentMeta={total:0,page_count:1};
      let residentTimer;
      async function loadResidentDirectory() {
          residentController?.abort();residentController=new AbortController();const controller=residentController,id=++residentRequest;
          const grid=document.getElementById('resident-grid');if(!grid)return;
          grid.setAttribute('aria-busy','true');
          if(!window.residentDirectoryZones){try{const response=await fetch('http://localhost:3000/api/bhw/puroks',{signal:controller.signal}),result=await response.json();if(response.ok&&result.success){window.residentDirectoryZones=result.data;refreshResidentPurokOptions();}}catch{}}
          const params=new URLSearchParams({page:residentDirectoryPage,page_size:residentProfilesPerPage,q:document.getElementById('directory-search').value.trim(),purok:document.getElementById('resident-filter-purok').value,age_group:document.getElementById('resident-filter-age').value});
          if(window.currentBrgyId)params.set('barangay_id',window.currentBrgyId);
          const timer=setTimeout(()=>controller.abort(),15000);
          try{
              const response=await fetch('http://localhost:3000/api/residents?'+params,{signal:controller.signal}),result=await response.json();
              if(id!==residentRequest)return;
              if(!response.ok||!result.success||!Array.isArray(result.data))throw Error('Unavailable');
              residentMeta=result;residentDirectoryPage=result.page;residentDirectoryQuery=JSON.stringify(['q','purok','age_group'].map(key=>params.get(key)));window.allResidents=result.data;
              renderDirectory(result.data);
          }catch(error){if(id!==residentRequest)return;grid.textContent='Resident profiles could not be loaded. Use Refresh residents to retry.';document.getElementById('resident-pagination')?.replaceChildren();document.getElementById('resident-page-count').textContent='Records unavailable';}
          finally{clearTimeout(timer);if(id===residentRequest)grid.setAttribute('aria-busy','false');}
      }

      function residentAgeGroup(person) {
          const recordedAge = window.HealthIntelDate ? HealthIntelDate.residentAge(person) : person.age;
          const age = Number(recordedAge);
          if (person.is_deceased || recordedAge == null || String(recordedAge).trim() === '' || !Number.isInteger(age) || age < 0 || age > 130) return 'unknown';
          if (age < 13) return 'child';
          if (age < 18) return 'teen';
          return age < 60 ? 'adult' : 'senior';
      }

      function clearResidentFilters() {
          for (const id of ['directory-search','resident-filter-purok','resident-filter-age']) document.getElementById(id).value = '';
          filterDirectory();
      }

      function filterDirectory() {
          const filterKey=JSON.stringify(['directory-search','resident-filter-purok','resident-filter-age'].map(id=>document.getElementById(id).value));
          if(filterKey!==residentDirectoryQuery){residentDirectoryPage=1;residentDirectoryQuery=filterKey;}
          clearTimeout(residentTimer);residentController?.abort();residentRequest++;
          residentTimer=setTimeout(()=>loadResidentDirectory(),200);
      }

      function renderDirectory(data) {
        const grid = document.getElementById("resident-grid");
        if(!grid) return;
        const totalPages = residentMeta.page_count;
        residentDirectoryPage = Math.max(1, Math.min(residentDirectoryPage, totalPages || 1));
        const first = (residentDirectoryPage - 1) * residentProfilesPerPage;
        renderResidentPagination(residentMeta.total, first, totalPages);

        if (data.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-8 text-center text-[hsl(var(--muted-foreground))]">No residents found.</div>';
            return;
        }

        // Build once: appending with innerHTML reparses every preceding card.
        grid.innerHTML = data.map(res => {
            const patientName = res.patient_name || res.first_name + " " + res.last_name || "Unknown";
            const nameParts = patientName.split(" ");
            const initials = nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length-1][0] : "");

            const residentAge = window.HealthIntelDate?.residentAge ? HealthIntelDate.residentAge(res) : res.age;
            const ageNum = parseInt(residentAge);
            const isSenior = !isNaN(ageNum) && ageNum >= 60;
            const caseCount = Number(res.case_count) || 0;

            return `
              <div class="bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group">
                <div class="w-16 h-16 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex justify-center items-center text-2xl font-bold mb-4 group-hover:scale-110 transition-transform">
                  ${escapeText(initials.toUpperCase())}
                </div>
                <h2 class="font-bold text-lg mb-1 text-[hsl(var(--foreground))]">${escapeText(patientName)}</h2>
                ${isSenior ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 rounded text-xs font-bold mb-2 inline-block">Senior Citizen</span>' : ''}
                <p class="text-[hsl(var(--muted-foreground))] text-sm mb-4">${escapeText(res.purok)} | ${res.is_deceased?'Historical profile':escapeText(residentAge ?? 'N/A')+' yrs'}</p>

                <button type="button" onclick="viewPatientProfile('${Number(res.id)}')" class="bhw-dossier-link w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors">
                  View Medical Dossier
                  <small>(${caseCount} ${caseCount===1?'Record':'Records'})</small>
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
                  globalThis.HealthIntelPagination?.showStart('resident-grid');
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

      let patientProfileRequest = 0;
      let bhwPatientHistory;
      let bhwProfileTabTouched;
      const bhwProfileTabs = ['bhw-visit-tab','bhw-case-tab'];
      function selectBhwProfileTab(index, userSelected = true) {
          if (userSelected) bhwProfileTabTouched = true;
          bhwProfileTabs.forEach((id, position) => {
              const tab = document.getElementById(id);
              const selected = index === position;
              tab.setAttribute('aria-selected', String(selected));
              tab.tabIndex = selected ? 0 : -1;
              document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
          });
      }
      document.getElementById('bhw-profile-tabs')?.addEventListener('keydown', event => {
          const current = bhwProfileTabs.indexOf(event.target.id);
          if (current<0 || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
          const next = event.key==='Home' ? 0 : event.key==='End' ? 1 : 1-current;
          event.preventDefault();
          selectBhwProfileTab(next);
          document.getElementById(bhwProfileTabs[next]).focus();
      });
      async function viewPatientProfile(residentId, selectedCase = null, onClose = null, beforeOpen = null) {
          if (!Number.isSafeInteger(Number(residentId)) || Number(residentId)<=0) {
              Swal.fire('Resident link unavailable', 'This historical case has no linked resident profile. Ask the Admin to review the source record; the system will not guess the identity.', 'info');
              return;
          }
          const request = ++patientProfileRequest;
          try {
              const res = await fetch(`http://localhost:3000/api/residents/${residentId}/dossier`);
              const result = await res.json();
              if(request !== patientProfileRequest) return;
              if(res.ok && result.success) {
                  if (beforeOpen && !await beforeOpen()) return;
                  if(request !== patientProfileRequest) return;
                  const data = result.resident;
                  const history = result.history;

                  let patientName = data.patient_name || data.first_name + " " + data.last_name || "Unknown";
                  const nameParts = patientName.split(" ");
                  const initials = nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length-1][0] : "");

                  document.getElementById("profile-initials").innerText = initials.toUpperCase();
                  document.getElementById("profile-name").innerText = patientName;
                  document.getElementById("profile-purok").innerText = data.purok || "Unknown";
                  const age = HealthIntelDate.residentAge(data);
                  document.getElementById('profile-age').innerText = data.is_deceased ? 'Historical profile' : age ?? 'Age not recorded';
                  document.getElementById('profile-age-unit').hidden = Boolean(data.is_deceased) || age == null;

                  const tbody = document.getElementById("profile-history-body");
                  tbody.innerHTML = history.length ? history.map(record => `
                    <li class="bhw-previous-case">
                      <div class="bhw-previous-case-copy">
                        <p class="bhw-previous-case-id">REC-${Number(record.id)} · ${escapeText(HealthIntelDate.formatCaseDate(record.date_recorded))}</p>
                        <h3>${HealthIntelEncoding.conditionCell(record)}</h3>
                        <p class="bhw-previous-case-meta"><span>${escapeText(record.status === "Deceased" ? "Historical outcome" : record.status || "Status not recorded")}</span>${record.remarks ? " · "+escapeText(record.remarks) : ""}</p>
                      </div>
                      <button type="button" class="hi-vital-button" onclick="HealthIntelVisits.show(${Number(record.id)})" aria-label="View visits for case REC-${Number(record.id)}">View visits</button>
                    </li>`).join("") : '<li class="bhw-previous-case-empty">No previous cases are linked to this patient.</li>';
                  HealthIntelCaseDownload.mount(document.getElementById("bhw-case-download"), history, selectedCase);
                  document.getElementById("bhw-profile-case-count").textContent = String(history.length);
                  bhwProfileTabTouched = false;
                  selectBhwProfileTab(selectedCase ? 1 : 0, false);
                  const modal = document.getElementById("patientProfileModal");
                  modal.querySelector(".bhw-profile-content").scrollTop = 0;
                  const visits = document.getElementById("bhw-profile-history");
                  visits.dataset.residentId = String(Number(residentId));
                  visits.dataset.readOnly = String(Boolean(data.is_deceased));
                  bhwPatientHistory ??= HealthIntelReferrals.mountPatientHistory(visits);
                  bhwPatientHistory.load(true).then(visitCount => {
                      if (visitCount !== 0 || !history.length || selectedCase || bhwProfileTabTouched ||
                          request !== patientProfileRequest || modal.classList.contains('hidden')) return;
                      const focusInHistory = visits.contains(document.activeElement);
                      selectBhwProfileTab(1, false);
                      if (focusInHistory || document.activeElement?.id === 'bhw-visit-tab') document.getElementById('bhw-case-tab').focus();
                  });
                  modal.classList.toggle('bhw-case-profile-transition', Boolean(beforeOpen));
                  if (onClose) {
                    const observer = new MutationObserver(() => {
                      if (modal.classList.contains('hidden')) {
                        observer.disconnect();
                        onClose();
                      }
                    });
                    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
                  }
                  HealthIntelModal.open(modal);
              } else {
                  throw new Error(result.error || 'Please try again later.');
              }
          } catch (error) {
              if (request !== patientProfileRequest) return;
              if (beforeOpen) throw error;
              Swal.fire('Patient profile unavailable', error.message || 'Please try again later.', 'error');
          }
      }


      function closeProfileModal() {
        const modal = document.getElementById("patientProfileModal");
        HealthIntelModal.close(modal);
      }
