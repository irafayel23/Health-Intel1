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
          if (targetId === 'view-patients') { isViewingArchive ? loadArchivedPatients({ coalesce: true }) : loadPatients({ coalesce: true }); }
          if (targetId === 'view-reports') loadPurokChoices();
          viewSections.forEach((view) => {
            view.classList.add("hidden"); view.classList.remove("block"); view.classList.remove("flex");
          });

          const view = document.getElementById(targetId);
          if (view) {
              view.classList.remove("hidden"); if(view.classList.contains("flex-col")){ view.classList.add("flex"); } else { view.classList.add("block"); }

          }
        });
      });


      let purokChoicesRequest = 0;
      async function loadPurokChoices() {
        const filter=document.getElementById('bhw-purok-filter');
        if(!filter)return;
<<<<<<< HEAD
        const request=++purokChoicesRequest;
        const selected=filter.value || 'All Puroks';
        const choices=new Map(HealthIntelEncoding.purokOptions(window.currentBrgyName)
          .map(({value,label})=>[value,label]));
        for(const person of [...allPatients,...(window.allResidents || [])]){
          const value=String(person.purok || '').trim();
          if(value&&!choices.has(value))choices.set(value,value);
        }
        const render=()=>{
          const all=document.createElement('option');
          all.value='All Puroks';all.textContent='All puroks in your barangay';
          const options=[...choices].sort((a,b)=>a[1].localeCompare(b[1],'en',{numeric:true}))
            .map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;});
          filter.replaceChildren(all,...options);
          filter.value=choices.has(selected)?selected:'All Puroks';
        };
        render();
        filter.disabled=true;
        try{
          const response=await fetch('http://localhost:3000/api/bhw/puroks');
          const result=await response.json();
          if(request!==purokChoicesRequest)return;
          if(!response.ok||!result.success||!Array.isArray(result.data))throw Error('Purok choices could not be loaded.');
          for(const value of result.data)if(typeof value==='string'&&value.trim())choices.set(value,value);
          render();
        }catch(error){if(request===purokChoicesRequest)console.error('Could not refresh report puroks',error);}
        finally{if(request===purokChoicesRequest)filter.disabled=false;}
=======
        const all=document.createElement('option');
        all.value='All Puroks';all.textContent='All puroks in your barangay';
        filter.replaceChildren(all);filter.value='All Puroks';
>>>>>>> 77e33a469de54a41ddaeb994c2f5451c516ee426
      }

      function refreshBHWSupportingViews() {
          // Opening a tab always reads fresh data; hidden views need no background rebuild.
          const residents = document.getElementById('view-resident-profiles');
          const reports = document.getElementById('view-reports');
          if (residents && !residents.classList.contains('hidden')) loadResidentDirectory();
          if (reports && !reports.classList.contains('hidden')) loadPurokChoices();
      }

      window.addEventListener('health-intel:case-corrected', () => {
          // The correction dialog also emits cases-changed for supporting views.
          loadPatients(); loadDashboardStats(); loadTrendChart();
      });
      window.addEventListener('health-intel:cases-changed', refreshBHWSupportingViews);


      document.addEventListener("DOMContentLoaded", async () => {
        const userId = sessionStorage.getItem("active_user_id");
        if (userId) {
          const nameEl = document.getElementById('dropdown-user-name');
          if (nameEl) nameEl.innerText = userId;
          try {
            const res = await fetch(`http://localhost:3000/api/bhw/context?system_id=${userId}`);
            const result = await res.json();
            if (result.success) {
              window.currentBrgyId = result.data.barangay_id;
              window.currentBrgyName = result.data.barangay_name;
              if (window.allResidents) refreshResidentPurokOptions();

              const brgyDisplay = window.currentBrgyName || "Unknown Barangay";
              document.getElementById("dynamic-portal-title").innerText = `Barangay Health Worker Portal — ${brgyDisplay}`;
              updateBhwDashboardIdentity(userId, brgyDisplay);
            }
          } catch(e) { console.error("Error fetching context:", e); }
        }

        loadDashboardStats();
        loadTrendChart();
        // Hidden record and resident views load when opened.
      });
