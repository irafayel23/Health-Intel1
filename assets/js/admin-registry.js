      // ==========================================
      // DISEASE REGISTRY
      // ==========================================
      async function loadDiseases() {
        try {
          const actRes = await fetch("http://localhost:3000/api/diseases");
          const actData = await actRes.json();
          const actBody = document.getElementById("disease-table-body");
          actBody.innerHTML = "";
          let actBodyHtmlBuffer = "";
          if (actData.success) {
            actData.data.forEach((d) => {
              let classificationClass = d.classification === "High Risk" ? "admin-classification-high" : "admin-classification-standard";
              actBodyHtmlBuffer += `
                <tr>
                  <td class="font-bold text-slate-900 dark:text-slate-100">${escapeText(d.name)}</td>
                  <td class="font-medium text-slate-700 dark:text-slate-300">${escapeText(d.category)}</td>
                  <td><span class="admin-classification ${classificationClass}">${escapeText(d.classification)}</span></td>
                  <td class="text-emerald-500 dark:text-emerald-400 font-bold">Active</td>
                  <td><button onclick="archiveDisease(${d.id})" class="admin-button-archive-disease">Archive</button></td>
                </tr>
              `;
            });
          if (actBodyHtmlBuffer === "") {
              actBodyHtmlBuffer = `<tr><td colspan="12" class="text-center py-12 text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No records found in the database.</span>
</div>
</td></tr>`;
          }
          actBody.innerHTML = actBodyHtmlBuffer;
          }

          const arcRes = await fetch("http://localhost:3000/api/diseases/archived");
          const arcData = await arcRes.json();
          const arcBody = document.getElementById("disease-archived-table-body");
          arcBody.innerHTML = "";
          let arcBodyHtmlBuffer = "";
          if (arcData.success) {
            arcData.data.forEach((d) => {
              arcBodyHtmlBuffer += `
                <tr>
                  <td class="font-medium text-slate-700 dark:text-slate-300">${escapeText(d.name)}</td>
                  <td class="font-medium text-slate-700 dark:text-slate-300">${escapeText(d.category)}</td>
                  <td class="font-medium text-slate-700 dark:text-slate-300">${escapeText(d.classification)}</td>
                  <td><span class="admin-badge-archived">Archived</span></td>
                  <td><button onclick="restoreDisease(${d.id})" class="admin-button-reevaluate">Restore</button></td>
                </tr>
              `;
            });
          if (arcBodyHtmlBuffer === "") {
              arcBodyHtmlBuffer = `<tr><td colspan="12" class="text-center py-12 text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No records found in the database.</span>
</div>
</td></tr>`;
          }
          arcBody.innerHTML = arcBodyHtmlBuffer;
          }
        } catch (e) {}
      }

      function openDiseaseModal() {
        document.getElementById("new_disease_name").value = "";
        document.getElementById("diseaseModal").classList.remove("hidden");
      }

      async function saveNewDisease() {
        const payload = {
          name: document.getElementById("new_disease_name").value,
          category: document.getElementById("new_disease_cat").value,
          classification: document.getElementById("new_disease_class").value,
        };
        if (!payload.name) return;

        try {
        await fetch("http://localhost:3000/api/diseases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        closeModal("diseaseModal");
        Swal.fire({ icon: "success", title: "Saved to Database", showConfirmButton: false, timer: 1500 });
        loadDiseases();
        } catch(error) { Swal.fire({icon:'error',title:'Disease not saved',text:error.message || 'Please check the form and try again.'}); }

      }

      async function archiveDisease(id) {
        Swal.fire({
          title: "Archive Disease?",
          text: "It will be moved to the disease archives.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#ef4444",
          cancelButtonColor: "#94a3b8",
          confirmButtonText: "Yes, archive it!"
        }).then(async (result) => {
          if (result.isConfirmed) {
            await fetch(`http://localhost:3000/api/diseases/${id}/archive`, { method: "PUT" });
            loadDiseases();
            Swal.fire({title: "Archived!", text: "Disease has been archived.", icon: "success", timer: 1500, showConfirmButton: false});
          }
        });
      }
      
      async function restoreDisease(id) {
        Swal.fire({
          title: "Restore Disease?",
          text: "It will be available for BHWs again.",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#10b981",
          cancelButtonColor: "#94a3b8",
          confirmButtonText: "Yes, restore it!"
        }).then(async (result) => {
          if (result.isConfirmed) {
            await fetch(`http://localhost:3000/api/diseases/${id}/restore`, { method: "PUT" });
            loadDiseases();
            Swal.fire({title: "Restored!", text: "Disease is active again.", icon: "success", timer: 1500, showConfirmButton: false});
          }
        });
      }

