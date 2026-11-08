      // ==========================================
      // DISEASE REGISTRY
      // ==========================================
async function loadDiseases() {
  for (const archived of [false, true]) {
    const body = document.getElementById(archived ? 'disease-archived-table-body' : 'disease-table-body');
    try {
      const response = await fetch('http://localhost:3000/api/diseases' + (archived ? '/archived' : ''));
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error('Catalog unavailable');
      if (!archived) {
        window.adminRegistryChoices = result.data;
        refreshAdminDiseaseFilter();
      }

      const entries = result.data.filter(entry => Number.isSafeInteger(Number(entry.id)) && Number(entry.id) > 0);
      body.innerHTML = entries.map(entry => {
        const name = escapeText(entry.name);
        return `<tr class="admin-disease-row">
          <td><button type="button" class="admin-disease-open" aria-label="View disease details for ${name}">${name}</button><span class="admin-disease-hint" aria-hidden="true">View disease details</span></td>
          <td><span class="admin-case-status" data-status="${archived ? 'archived' : 'available'}">${archived ? 'Archived' : 'Available for new cases'}</span></td>
        </tr>`;
      }).join('') || `<tr><td colspan="2" class="text-center py-12">${archived ? 'No archived disease names.' : 'No active disease names.'}</td></tr>`;
      if (entries.length) {
        body.querySelectorAll('.admin-disease-row').forEach((row, index) => {
          row.addEventListener('click', () => {
            row.querySelector('button').focus({ preventScroll: true });
            return viewDiseaseDetails(entries[index], archived);
          });
        });
      }
    } catch {
      body.innerHTML = '<tr><td colspan="2" class="text-center py-12">Disease names could not be loaded.</td></tr>';
    }
  }
}

async function viewDiseaseDetails(entry, archived) {
  const result = await Swal.fire({
    titleText: 'Disease details',
    customClass: { popup: 'hi-dialog admin-personnel-dialog' },
    html: `<dl class="admin-personnel-facts">
      <div><dt>Disease name</dt><dd>${escapeText(entry.name)}</dd></div>
      <div><dt>Availability</dt><dd>${archived ? 'Archived' : 'Available for new cases'}</dd></div>
    </dl>`,
    showCloseButton: true,
    showCancelButton: true,
    cancelButtonText: 'Close',
    cancelButtonColor: '#475569',
    confirmButtonText: archived ? 'Restore' : 'Archive',
    confirmButtonColor: archived ? '#047857' : '#b91c1c',
    focusCancel: true
  });
  if (result.isConfirmed) {
    const id = Number(entry.id);
    if (archived) restoreDisease(id);
    else archiveDisease(id);
  }
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
          confirmButtonColor: "#b91c1c",
          cancelButtonColor: "#475569",
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
          confirmButtonColor: "#047857",
          cancelButtonColor: "#475569",
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

