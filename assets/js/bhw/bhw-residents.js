// BHW resident directory and linked visit and referral history.
// Classic script: load through bhw.html; cross-feature functions share its page scope.
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

      function residentZoneKey(value) {
          return String(value || '').trim().toLowerCase();
      }

      function refreshResidentPurokOptions() {
          const zones = new Map(HealthIntelEncoding.purokOptions(window.currentBrgyName)
              .map(({value,label})=>[residentZoneKey(value),label]));
          for (const value of (window.residentDirectoryZones || [])) { const key=residentZoneKey(value); if(key&&!zones.has(key))zones.set(key,String(value).trim()); }
          for (const person of (window.allResidents || [])) {
              const key = residentZoneKey(person.purok);
              if (key && !zones.has(key)) zones.set(key, String(person.purok).trim());
          }
          const choices = [...zones].sort((a,b)=>a[1].localeCompare(b[1], 'en', {numeric:true}));
          const select = document.getElementById('resident-filter-purok');
          const selected = residentZoneKey(select.value);
          select.replaceChildren(new Option('All puroks / zones',''),
              ...choices.map(([key,label])=>new Option(label,key)));
          select.value = zones.has(selected) ? selected : '';
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
            const patientName = String(res.patient_name || [res.first_name, res.last_name].filter(Boolean).join(' ')).trim() || 'Name not recorded';
            const nameParts = patientName.split(/\s+/);
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
                ${isSenior ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 rounded text-xs font-bold mb-2 inline-block">Senior Citizen</span>' : ''}
                <p class="text-[hsl(var(--muted-foreground))] text-sm mb-4">${escapeText(res.purok)} | ${res.is_deceased?'Historical profile':escapeText(residentAge ?? 'N/A')+' yrs'}</p>

                <button type="button" onclick="viewPatientProfile('${Number(res.id)}')" class="bhw-dossier-link w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors">
                  View resident record
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

      let bhwPatientHistory;
      function viewPatientProfile(residentId) {
          const data = (window.allResidents || []).find(person => Number(person.id) === Number(residentId));
          if (!data) return Swal.fire('Resident profile unavailable', 'Refresh the resident list and try again.', 'info');
          const name = String(data.patient_name || [data.first_name, data.last_name].filter(Boolean).join(' ')).trim() || 'Name not recorded';
          const parts = name.split(/\s+/);
          document.getElementById('profile-initials').textContent = (parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
          document.getElementById('profile-name').textContent = name;
          document.getElementById('profile-purok').textContent = data.purok || 'Purok not recorded';
          const age = HealthIntelDate.residentAge(data);
          document.getElementById('profile-age').textContent = data.is_deceased ? 'Historical profile' : age ?? 'Age not recorded';
          document.getElementById('profile-age-unit').hidden = Boolean(data.is_deceased) || age == null;
          const modal = document.getElementById('patientProfileModal');
          const visits = document.getElementById('bhw-profile-history');
          visits.dataset.residentId = String(data.id);
          visits.dataset.readOnly = String(Boolean(data.is_deceased));
          modal.querySelector('.bhw-profile-content').scrollTop = 0;
          bhwPatientHistory ??= HealthIntelReferrals.mountPatientHistory(visits);
          bhwPatientHistory.load(true);
          HealthIntelModal.open(modal);
      }
      function closeProfileModal() {
        const modal = document.getElementById("patientProfileModal");
        HealthIntelModal.close(modal);
      }
