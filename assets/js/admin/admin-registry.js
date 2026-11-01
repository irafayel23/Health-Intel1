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
            window.adminRegistryChoices=actData.data;refreshAdminDiseaseFilter();
            actData.data.forEach((d) => {
              actBodyHtmlBuffer += `
                <tr>
                  <td class="font-bold text-slate-900 dark:text-slate-100">${escapeText(d.name)}</td>
                  <td class="text-emerald-700 dark:text-emerald-400 font-bold">Available for new cases</td>
                  <td><button onclick="archiveDisease(${d.id})" class="admin-button-archive-disease !text-red-700 dark:!text-red-300">Archive</button></td>
                </tr>
              `;
            });
          if (actBodyHtmlBuffer === "") {
              actBodyHtmlBuffer = `<tr><td colspan="3" class="text-center py-12 text-slate-600 dark:text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No active disease names. Add a disease name to make it available in consultation forms.</span>
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
                  <td><span class="admin-badge-archived">Archived</span></td>
                  <td><button onclick="restoreDisease(${d.id})" class="admin-button-reevaluate">Restore</button></td>
                </tr>
              `;
            });
          if (arcBodyHtmlBuffer === "") {
              arcBodyHtmlBuffer = `<tr><td colspan="3" class="text-center py-12 text-slate-600 dark:text-slate-400 italic">
<div class="flex flex-col items-center justify-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
<span>No archived disease names.</span>
</div>
</td></tr>`;
          }
          arcBody.innerHTML = arcBodyHtmlBuffer;
          }
        } catch (e) {}
      }

      function openDiseaseModal() {
        document.getElementById("new_disease_name").value = "";
        document.getElementById("disease-form-error").hidden = true;
        HealthIntelModal.open(document.getElementById("diseaseModal"));
      }

      async function saveNewDisease() {
        const input = document.getElementById("new_disease_name");
        const button = document.getElementById("disease-save-button");
        const errorNotice = document.getElementById("disease-form-error");
        if (button.disabled) return;
        errorNotice.hidden = true;
        const payload = { name: input.value.trim() };
        if (!payload.name || payload.name.length > 255) {
          errorNotice.textContent = 'Enter a disease name using 1–255 characters.';
          errorNotice.hidden = false;
          input.focus();
          return;
        }
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');

        try {
        const response = await fetch("http://localhost:3000/api/diseases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'The disease name could not be added.');
        closeModal("diseaseModal");
        Swal.fire({ icon: "success", title: "Disease name added", text: 'Available in BHW and MHO consultation forms.', showConfirmButton: false, timer: 2000 });
        loadDiseases();
        } catch(error) {
          errorNotice.textContent = error.message || 'Please check the form and try again.';
          errorNotice.hidden = false;
          input.focus();
        } finally {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }

      }

      async function archiveDisease(id) {
        Swal.fire({
          title: "Archive disease name?",
          text: "It will no longer be available for new BHW or MHO cases. Existing patient records and histories are retained.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#ef4444",
          cancelButtonColor: "#94a3b8",
          confirmButtonText: "Yes, archive it!"
        }).then(async (result) => {
          if (result.isConfirmed) {
            if (!await saveRegistryAction(id, 'archive')) return;
            loadDiseases();
            Swal.fire({title: "Disease name archived", text: "Existing patient records and histories are retained.", icon: "success", timer: 1500, showConfirmButton: false});
          }
        });
      }
      
      async function restoreDisease(id) {
        Swal.fire({
          title: "Restore disease name?",
          text: "It will be available for new BHW and MHO cases again.",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#10b981",
          cancelButtonColor: "#94a3b8",
          confirmButtonText: "Yes, restore it!"
        }).then(async (result) => {
          if (result.isConfirmed) {
            if (!await saveRegistryAction(id, 'restore')) return;
            loadDiseases();
            Swal.fire({title: "Restored!", text: "Disease is active again.", icon: "success", timer: 1500, showConfirmButton: false});
          }
        });
      }

      async function saveRegistryAction(id, action) {
        try {
          const response = await fetch(`http://localhost:3000/api/diseases/${id}/${action}`, { method: 'PUT' });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.error || 'Disease change could not be saved.');
          return true;
        } catch (error) {
          await Swal.fire('Disease not updated', error.message || 'Please try again.', 'error');
          return false;
        }
      }

