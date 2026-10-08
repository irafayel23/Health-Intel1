// BHW navigation, context startup and cross-feature refresh events.
// Classic script: load through bhw.html; cross-feature functions share its page scope.

      lucide.createIcons();

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
          if (targetId === 'view-patients') { isViewingArchive ? loadArchivedPatients({ coalesce: true }) : loadPatients({ coalesce: true }); loadPurokChoices(); }
          viewSections.forEach((view) => {
            view.classList.add("hidden"); view.classList.remove("block"); view.classList.remove("flex");
          });

          const view = document.getElementById(targetId);
          if (view) {
              view.classList.remove("hidden"); if(view.classList.contains("flex-col")){ view.classList.add("flex"); } else { view.classList.add("block"); }

          }
        });
      });


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
        // Hidden record and resident views load when opened.
      });
