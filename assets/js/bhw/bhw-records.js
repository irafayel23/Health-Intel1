// BHW case state, tables, status updates and archive actions.
// Classic script: load through bhw.html; cross-feature functions share its page scope.

      function bhwSeverityMarkup(value) {
          const label = String(value || '').trim() || 'Not recorded';
          const tone = {'mild':'mild', 'monitored':'monitored', 'high risk':'high-risk'}[label.toLowerCase()] || 'unknown';
          return '<span class="bhw-severity bhw-severity-' + tone + '">' + escapeText(label) + '</span>';
      }

      let allPatients = [];
      let patientPageMeta=null,patientFilterKey='',patientFilterTimer;
      function patientQuery(){const fields={q:'patient-search-input',purok:'patient-filter-purok',status:'patient-filter-status',severity:'patient-filter-severity',year:'patient-filter-year',month:'patient-filter-month'};return Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,document.getElementById(id)?.value||'']));}
      let isViewingArchive = false;
      let currentPage = 1;
      const mobilePatientPaging = window.matchMedia?.('(max-width: 600px)').matches;
      const rowsPerPage = mobilePatientPaging ? 6 : 10;
      let displayedPatientView = null;
      let pendingPatientLoad = null;
      let patientLoadRequestId = 0;


      function patientListMessage(message) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.className = 'px-6 py-8 text-center text-slate-700 dark:text-slate-300';
        cell.textContent = message;
        row.append(cell);
        document.getElementById('patients-table-body').replaceChildren(row);
        document.getElementById('patients-pagination')?.replaceChildren();
      }

      function patientLoadStatus(state, message) {
        const table = document.getElementById('main-patient-table');
        table?.setAttribute('aria-busy', String(state === 'loading'));
        const status = document.getElementById('patient-load-status');
        if (!status) return;
        status.dataset.state = state;
        status.classList.toggle('hidden', state === 'ready');
        status.classList.toggle('flex', state !== 'ready');
        const label = document.getElementById('patient-load-message');
        label.textContent = message;
        label.className = state === 'error'
          ? 'min-w-0 flex-1 text-rose-700 dark:text-rose-300'
          : 'min-w-0 flex-1 text-slate-700 dark:text-slate-300';
        document.getElementById('patient-load-spinner').hidden = state !== 'loading';
        document.getElementById('patient-load-retry').hidden = state !== 'error';
      }

      function loadPatientList(archived, { coalesce = false } = {}) {
        const view = archived ? 'archived' : 'active';
        if (coalesce && pendingPatientLoad?.view === view) return pendingPatientLoad.promise;
        pendingPatientLoad?.controller.abort();
        const request = { id: ++patientLoadRequestId, view, controller: new AbortController() };
        pendingPatientLoad = request;
        const noun = archived ? 'archived records' : 'patient records';
        const hasPreviousList = displayedPatientView === view;
        if (!hasPreviousList) {
          allPatients = [];
          displayedPatientView = null;
          currentPage = 1;
          patientListMessage(`Loading ${noun}…`);
        }
        patientLoadStatus('loading', hasPreviousList ? `Refreshing ${noun}…` : `Loading ${noun}…`);
        const timeout = setTimeout(() => request.controller.abort(), 20000);
        request.promise = (async () => {
          try {
            const base = `http://localhost:3000/api/patients${archived ? '/archived' : ''}`;
            const params=new URLSearchParams({...patientQuery(),page:currentPage,page_size:rowsPerPage});if(window.currentBrgyId)params.set('barangay_id',window.currentBrgyId);const url=base+'?'+params;
            const response = await fetch(url, { signal: request.controller.signal });
            const result = await response.json();
            if (request.id !== patientLoadRequestId) return;
            if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error('Patient list unavailable');
            allPatients = result.data;
            patientPageMeta=result;currentPage=result.page||1;patientFilterKey=JSON.stringify(patientQuery());
            updatePatientFilterOptions();
            displayedPatientView = view;
            renderPatientsTable(allPatients);
            patientLoadStatus('ready', 'Records loaded.');
          } catch (error) {
            if (request.id !== patientLoadRequestId) return;
            const message = hasPreviousList
              ? `Could not refresh ${noun}. Showing the last loaded list. Please retry.`
              : `Could not load ${noun}. Check your connection and try again.`;
            if (!hasPreviousList) patientListMessage('Records are unavailable. Use Retry above to load them.');
            patientLoadStatus('error', message);
          } finally {
            clearTimeout(timeout);
            if (pendingPatientLoad === request) pendingPatientLoad = null;
          }
        })();
        return request.promise;
      }

      function loadPatients(options) { return loadPatientList(isViewingArchive, options); }
      function loadArchivedPatients(options) { return loadPatientList(true, options); }
      function retryPatientLoad() { return loadPatientList(isViewingArchive); }

      // 3. RENDER PATIENTS TABLE & PAGINATION
      function filterTable() {
          const key=JSON.stringify(patientQuery());if(key!==patientFilterKey){currentPage=1;patientFilterKey=key;}
          clearTimeout(patientFilterTimer);pendingPatientLoad?.controller.abort();patientLoadRequestId++;
          patientFilterTimer=setTimeout(()=>loadPatients(),200);
      }

      function residentZoneKey(value) {
          return String(value || '').trim().toLowerCase();
      }

      function refreshResidentPurokOptions() {
          const zones = new Map(HealthIntelEncoding.purokOptions(window.currentBrgyName)
              .map(({value,label})=>[residentZoneKey(value),label]));
          for (const value of (window.residentDirectoryZones || [])) { const key=residentZoneKey(value); if(key&&!zones.has(key))zones.set(key,String(value).trim()); }
          for (const person of [...allPatients, ...(window.allResidents || [])]) {
              const key = residentZoneKey(person.purok);
              if (key && !zones.has(key)) zones.set(key, String(person.purok).trim());
          }
          const choices = [...zones].sort((a,b)=>a[1].localeCompare(b[1], 'en', {numeric:true}));
          for (const id of ['patient-filter-purok','resident-filter-purok']) {
              const select = document.getElementById(id);
              if (!select) continue;
              const selected = residentZoneKey(select.value);
              select.replaceChildren(new Option('All puroks / zones',''),
                  ...choices.map(([key,label])=>new Option(label,key)));
              select.value = zones.has(selected) ? selected : '';
          }
      }

      function updatePatientFilterOptions() {
        for (const [id, values] of [['patient-filter-year', (patientPageMeta?.years ? patientPageMeta.years.map(year=>({date_recorded:year+'-01-01'})) : allPatients).map(p => typeof p.date_recorded === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date_recorded) ? p.date_recorded.slice(0, 4) : '')]]) {
          const select = document.getElementById(id);
          const selected = select.value;
          select.replaceChildren(select.options[0]);
          [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)).forEach(value => select.add(new Option(value, value)));
          select.value = [...select.options].some(option => option.value === selected) ? selected : '';
        }
        refreshResidentPurokOptions();
      }
      function patientFiltersChanged() { currentPage = 1; filterTable(); }
      function clearPatientFilters() {
        for (const id of ['patient-search-input', 'patient-filter-status', 'patient-filter-severity', 'patient-filter-year', 'patient-filter-month', 'patient-filter-purok']) document.getElementById(id).value = '';
        patientFiltersChanged();
      }
      async function openFilteredPatientRecords(status, severity, initialPage = 1) {
        const title = severity ? 'Active high-risk cases' : status + ' cases';
        try {
          const params=new URLSearchParams({page:initialPage,page_size:10,status,...(severity?{severity}:{})});if(window.currentBrgyId)params.set('barangay_id',window.currentBrgyId);const query='?'+params;
          const response = await fetch('/api/patients' + query);
          const result = await response.json();
          if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error();
          let records = result.data;let pageCount=result.page_count||1;
          let page = result.page||initialPage;
          let listClosed = false;
          let finishClosing;
          let openingDetails = false;
          const pageSize = 10;
          const renderPage = () => {
            const container = Swal.getHtmlContainer();
            if (!container) return;
            const pages = pageCount;
            page = Math.max(1, Math.min(page, pages));
            const rows = records.map(record => {
              const id = Number(record.id);
              if (!Number.isSafeInteger(id) || id < 1) return '';
              const hint = Number(record.resident_id) > 0 ? 'See profile' : 'See case details';
              return '<tr class="bhw-popup-row" data-case-id="' + id + '" title="' + hint + '"><td><button type="button" class="bhw-popup-case" data-case-id="' + id + '">' + escapeText(record.patient_name || record.name || 'Not recorded') + '</button><small>#REC-' + id + '</small></td><td>' + escapeText(record.purok || 'Not recorded') + '</td><td>' + escapeText(HealthIntelEncoding.conditionLabel(record)) + '</td><td>' + bhwSeverityMarkup(record.severity) + '</td><td class="' + (record.status === 'Cleared' ? 'bhw-popup-cleared' : 'bhw-popup-active') + '">' + escapeText(record.status === 'Deceased' ? 'Historical outcome' : record.status || 'Not recorded') + '</td></tr>';
            }).join('');
            const pageNumbers = [...new Set([1, pages, ...Array.from({length: 5}, (_, i) => page + i - 2).filter(n => n >= 1 && n <= pages)])].sort((a, b) => a - b);
            let previous = 0;
            const numbers = pageNumbers.map(number => {
              const gap = number - previous > 1 ? '<span aria-hidden="true">&hellip;</span>' : '';
              previous = number;
              return gap + '<button type="button" data-page="' + number + '"' + (number === page ? ' aria-current="page"' : '') + '>' + number + '</button>';
            }).join('');
            container.innerHTML = rows
              ? '<p class="bhw-case-transition-status" role="status"></p><div class="bhw-dashboard-case-list"><table><thead><tr><th>Name</th><th>Purok</th><th>Condition</th><th>Severity</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div><nav class="bhw-popup-pages" aria-label="Case list pages"><button type="button" data-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>Previous</button>' + numbers + '<button type="button" data-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>Next</button></nav>'
              : '<p>No matching cases.</p>';
          };
          await Swal.fire({
            titleText: title,
            width: 1040,
            customClass: {popup: 'bhw-dashboard-popup'},
            showCloseButton: true,
            closeButtonAriaLabel: 'Close case list',
            confirmButtonText: 'Close',
            html: '<div></div>',
            willClose: () => { listClosed = true; },
            didClose: () => finishClosing?.(),
            didOpen: () => {
              const container = Swal.getHtmlContainer();
              container.addEventListener('click', async event => {
                if (openingDetails) return;
                const navigation = event.target.closest('[data-page]');
                if (navigation && !navigation.disabled) {
                  const previousPage=page;page=Number(navigation.dataset.page);params.set('page',page);
                  container.setAttribute('aria-busy','true');container.querySelectorAll('[data-page]').forEach(button=>button.disabled=true);
                  try{const response=await fetch('/api/patients?'+params),next=await response.json();if(Swal.getHtmlContainer()!==container)return;if(!response.ok||!next.success||!Array.isArray(next.data))throw Error();records=next.data;page=next.page;pageCount=next.page_count;renderPage();}
                  catch{page=previousPage;if(Swal.getHtmlContainer()===container){renderPage();container.querySelector('.bhw-case-transition-status').textContent='Could not load that page. Please retry.';}}
                  finally{container.setAttribute('aria-busy','false');}
                  return;
                }
                const button = event.target.closest('[data-case-id]');
                if (!button) return;
                const record = records.find(item => Number(item.id) === Number(button.dataset.caseId));
                if (!record) return;
                openingDetails = true;
                const feedback = container.querySelector('.bhw-case-transition-status');
                feedback.textContent = 'Opening patient details...';
                const reopenList = () => openFilteredPatientRecords(status, severity, page);
                const closeList = async () => {
                  if (listClosed || Swal.getHtmlContainer() !== container) return false;
                  await new Promise(resolve => {
                    finishClosing = resolve;
                    Swal.close();
                  });
                  return true;
                };
                try {
                  const residentId = Number(record.resident_id);
                  if (Number.isSafeInteger(residentId) && residentId > 0) {
                    await viewPatientProfile(residentId, record, reopenList, closeList);
                  } else if (await closeList()) {
                    await viewUnlinkedCase(Number(record.id), record);
                    reopenList();
                  }
                } catch {
                  if (!listClosed) feedback.textContent = 'Patient details could not be loaded. Please try again.';
                } finally {
                  openingDetails = false;
                }
              });
              renderPage();
            }
          });
        } catch {
          await Swal.fire({icon: 'error', titleText: 'Cases unavailable', text: 'Please try again.'});
        }
      }

      function toggleArchiveView() {
          isViewingArchive = !isViewingArchive;
          const btn = document.getElementById("toggle-archive-btn");
          const title = document.getElementById("patients-page-title");

          if (isViewingArchive) {
              btn.innerHTML = "<i data-lucide='arrow-left' class='w-4 h-4'></i> Back to Active Records";
              btn.classList.remove("bg-[hsl(var(--card))]", "text-[hsl(var(--foreground))]");
              btn.classList.add("bg-blue-700", "text-white", "border-blue-700", "hover:bg-blue-800");
              title.innerText = "Archived Patient Records";
              loadArchivedPatients();
          } else {
              btn.innerHTML = "<i data-lucide='archive' class='w-4 h-4'></i> View Archived";
              btn.classList.add("bg-[hsl(var(--card))]", "text-[hsl(var(--foreground))]");
              btn.classList.remove("bg-blue-700", "text-white", "border-blue-700", "hover:bg-blue-800");
              title.innerText = "Patient Records Profiling";
              loadPatients();
          }
          lucide.createIcons();
      }

      function renderPatientsTable(data) {
        const tbody = document.getElementById("patients-table-body");
        const totalPages = patientPageMeta?.page_count||Math.ceil(data.length / rowsPerPage);
        currentPage = Math.max(1,Math.min(currentPage,totalPages || 1));
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const pageData = patientPageMeta?.page_count ? data : data.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-[hsl(var(--muted-foreground))]">No records found.</td></tr>';
        } else {
            tbody.innerHTML = pageData.map((record) => {
                let statusColor = record.status === "Cleared" ? "text-green-700 dark:text-green-400" : (record.status === "Deceased" ? "text-slate-600 dark:text-slate-400" : "text-orange-700 dark:text-orange-400");
                let fullName = record.patient_name || record.first_name + " " + record.last_name || record.name;

                const residentId = Number.isSafeInteger(Number(record.resident_id)) && Number(record.resident_id)>0 ? Number(record.resident_id) : null;

                const caseId = Number(record.id);
                if (!Number.isSafeInteger(caseId) || caseId < 1) return '';
                return `
                  <tr class="bhw-case-row" data-bhw-case="${caseId}" data-bhw-hint="${residentId ? 'See profile' : 'See case details'}">
                    <td class="px-6 py-4"><button type="button" class="bhw-case-open">${escapeText(fullName)}</button><br><small>#REC-${caseId}</small></td>
                    <td class="px-6 py-4">${escapeText(record.purok || 'Not recorded')}</td>
                    <td class="px-6 py-4">${HealthIntelEncoding.conditionCell(record)}</td>
                    <td class="px-6 py-4">${bhwSeverityMarkup(record.severity)}</td>
                    <td class="px-6 py-4 font-semibold ${statusColor}">${escapeText(record.status === "Deceased" ? "Historical outcome" : record.status || (isViewingArchive ? "Archived" : ""))}</td>
                  </tr>`;
            }).join('');
        }
        renderPaginationControls(totalPages);
      }

      function renderPaginationControls(totalPages) {
        const container = document.getElementById("patients-pagination");
        if (!container) return;
        container.innerHTML = "";

        if (totalPages === 0 || (totalPages === 1 && !mobilePatientPaging)) return;

        const addButton=(label,page,disabled=false)=>{
            const btn = document.createElement("button");
            btn.type='button';btn.innerText=label;btn.disabled=disabled;btn.setAttribute('aria-label',label==='Previous'?'Previous page':label==='Next'?'Next page':`Page ${page}`);
            if (page === currentPage && label!=='Previous' && label!=='Next') {
                btn.setAttribute('aria-current','page');
                btn.className = "min-w-9 h-9 px-2 rounded-md bg-blue-600 text-white font-medium flex items-center justify-center text-sm shadow-sm";
            } else {
                btn.className = "min-w-9 h-9 px-2 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] font-medium flex items-center justify-center text-sm transition-colors disabled:opacity-40";
            }
            btn.onclick=()=>{currentPage=page;filterTable();globalThis.HealthIntelPagination?.showStart('patients-table-body');};
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



      function renderBhwCaseActions(container, record, close) {
          container.replaceChildren();
          if (!record) return;
          const id = Number(record.id);
          const archived = record.is_archived == null ? isViewingArchive : Number(record.is_archived) === 1;
          const title = document.createElement('strong');
          title.textContent = 'Case #REC-' + id;
          container.setAttribute('aria-label', 'Actions for case REC-' + id);
          title.className = 'bhw-case-action-label';
          container.append(title);
          const addAction = (label, handler, tone = '') => {
              const button = document.createElement('button');
              button.type = 'button';
              button.className = 'hi-vital-button ' + tone;
              button.textContent = label;
              button.addEventListener('click', () => {
                  close();
                  handler(id);
              });
              container.append(button);
          };
          if (!archived) {
              if (record.status !== 'Deceased') addAction('Update status', updatePatientStatus, 'bhw-case-status');
              if (record.disease_review_status === 'Clarification') addAction('Clarify', supplyConditionClarification);
              addAction('Correct', caseId => HealthIntelCorrections.open(caseId), 'bhw-case-correct');
          }
          addAction(archived ? 'Restore' : 'Archive', caseId => toggleArchiveStatus(caseId, archived), archived ? 'bhw-case-restore' : 'bhw-case-archive');
      }

      document.getElementById('patients-table-body')?.addEventListener('click', event => {
          const row = event.target.closest('[data-bhw-case]');
          if (!row) return;
          const record = allPatients.find(item => Number(item.id) === Number(row.dataset.bhwCase));
          if (!record) return;
          const residentId = Number(record.resident_id);
          if (Number.isSafeInteger(residentId) && residentId > 0) viewPatientProfile(residentId, record);
          else viewUnlinkedCase(Number(record.id));
      });

      function viewUnlinkedCase(caseId, selectedRecord = null) {
          const record=selectedRecord || allPatients.find(item=>Number(item.id)===Number(caseId));
          if(!record)return Swal.fire({icon:'info',title:'Case unavailable',text:'Refresh Patient Records and try again.'});
          const name=record.patient_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Not recorded';
          return Swal.fire({title:'Recorded case details',
              ...(selectedRecord ? {showClass:{popup:'bhw-case-details-enter'}} : {}),
              customClass:{popup:'hi-dialog bhw-case-dialog',confirmButton:'hi-vital-button'},showCloseButton:true,closeButtonAriaLabel:'Close recorded case details',confirmButtonText:'Close',buttonsStyling:false,
              didOpen:()=>{
                  const actions = document.createElement('div');
                  actions.className = 'bhw-case-actions';
                  actions.setAttribute('role', 'group');
                  Swal.getActions().prepend(actions);
                  renderBhwCaseActions(actions, record, () => Swal.close());
              },
              html:`<div class="hi-case-details"><div><strong>Name on case:</strong> ${escapeText(name)}</div><div><strong>Barangay:</strong> ${escapeText(window.currentBrgyName || 'Assigned barangay')}</div><div><strong>Purok / Zone:</strong> ${escapeText(record.purok || 'Not recorded')}</div><div><strong>Case date:</strong> ${escapeText(window.HealthIntelDate.formatCaseDate(record.date_recorded))}</div><div><strong>Disease / case:</strong> ${HealthIntelEncoding.conditionCell(record)}</div><div><strong>Case status:</strong> ${escapeText(record.status === 'Deceased' ? 'Historical outcome' : record.status || 'Not recorded')}</div><div><strong>Recorded severity:</strong> ${bhwSeverityMarkup(record.severity)}</div><div><strong>Remarks:</strong> ${escapeText(record.remarks || 'None recorded')}</div><p>This historical case has no verified resident-profile link. Review its source before linking it to a person.</p></div>`});
      }


      async function updatePatientStatus(id) {
        const result=await Swal.fire({title:'Update Patient Status',
          width:520,customClass:{popup:'hi-dialog'},
          html:'<div class="hi-form"><div><label for="swal-input1">Case status</label><select id="swal-input1"><option value="Active">Active</option><option value="Cleared">Cleared</option></select></div><div><label for="swal-input2">Follow-up notes</label><textarea id="swal-input2" maxlength="4000" rows="4" placeholder="Enter a follow-up note, if any"></textarea><p>New notes are appended to existing remarks.</p></div></div>',
          didOpen:()=>{const current=allPatients.find(record=>Number(record.id)===Number(id));if(current)document.getElementById('swal-input1').value=current.status;},
          showCancelButton:true,confirmButtonText:'Save update',showLoaderOnConfirm:true,allowOutsideClick:()=>!Swal.isLoading(),
          preConfirm:async()=>{try{const response=await fetch(`http://localhost:3000/api/patients/${id}/status`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({new_status:document.getElementById('swal-input1').value,remarks:document.getElementById('swal-input2').value})});const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'The update could not be saved.');return data;}catch(error){Swal.showValidationMessage(error.message || 'The update could not be saved.');return false;}}
        });
        if(result.isConfirmed){Swal.fire('Updated!','The status and entered follow-up notes were saved.','success');loadPatients();loadDashboardStats();loadTrendChart();window.dispatchEvent(new Event('health-intel:cases-changed'));}
      }

      async function toggleArchiveStatus(id, restoring = isViewingArchive) {
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
