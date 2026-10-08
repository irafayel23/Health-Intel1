// BHW resident directory and linked medical dossiers.
// Classic script: load through bhw.html; cross-feature functions share its page scope.
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
                <h2 class="font-bold text-lg mb-1 text-[hsl(var(--foreground))]">${escapeText(patientName)}</h2>
                ${isSenior ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 rounded text-xs font-bold mb-2 inline-block">Senior Citizen</span>' : ''}
                <p class="text-[hsl(var(--muted-foreground))] text-sm mb-4">${escapeText(res.purok)} | ${res.age} yrs</p>

                <button onclick="viewPatientProfile('${res.id}')" class="w-full mt-auto py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors">
                  View Medical Dossier<br>
                  <small>(${res.case_count || 0} Records)</small>
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
                  document.getElementById("profile-age").innerText = data.age ?? "N/A";

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
                                ${HealthIntelEncoding.conditionCell(record)} <br>${severityBadge}
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
                  HealthIntelModal.open(modal);
              }
          } catch(e) { console.error("Error opening dossier", e); Swal.fire('Dossier unavailable',e.message || 'Please try again later.','error'); }
      }


      function closeProfileModal() {
        const modal = document.getElementById("patientProfileModal");
        HealthIntelModal.close(modal);
      }
