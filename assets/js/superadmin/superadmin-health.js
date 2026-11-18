// Superadmin health overview and manual service-restart guidance.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.
      async function loadSystemHealth() {
          try {
              const res = await fetch("http://localhost:3000/api/superadmin/health");
              const result = await res.json();

              if(res.ok===false || !result.success)throw Error('Connection check unavailable');
              if (result.success) {
                  const data = result.data;
                  document.getElementById("stat-total-logs").innerText = data.total_logs;
                  document.getElementById("stat-db-size").innerText = data.db_size + " MB";

                  // Format uptime (seconds) into something readable
                  let up = data.uptime;
                  let hours = Math.floor(up / 3600);
                  let minutes = Math.floor((up % 3600) / 60);
                  document.getElementById("stat-uptime").innerText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                  if (up < 60) document.getElementById("stat-uptime").innerText = "< 1m";

                  document.getElementById("status-db").innerText = "Connected";
                  document.getElementById("status-db").className = "text-emerald-700 dark:text-emerald-400 font-bold";
                  document.getElementById("status-api").innerText = "Connected";
                  document.getElementById("status-api").className = "text-emerald-700 dark:text-emerald-400 font-bold";

                  const st = document.getElementById("sys-status-text");
                  if(st) st.innerText = "Server and database responded";
                  const sb = document.getElementById("sys-status-bar");
                  if(sb) sb.className = "h-full bg-emerald-500";
              }
          } catch (e) {
              const st = document.getElementById("sys-status-text");
              if(st) { st.innerText = "Connection check unavailable. Please try again."; st.className = "text-red-700 dark:text-red-400 font-bold text-sm mb-8"; }
              const sb = document.getElementById("sys-status-bar");
              if(sb) sb.className = "h-full bg-red-500";

              const sdb = document.getElementById("status-db");
              if (sdb) {
                  sdb.innerText = "Not verified";
                  sdb.className = "text-red-700 dark:text-red-400 font-bold";
              }
              const sapi = document.getElementById("status-api");
              if (sapi) {
                  sapi.innerText = "Not verified";
                  sapi.className = "text-red-700 dark:text-red-400 font-bold";
              }
          }
      }


      function restartServices() {
        return Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog",
          title: "Manual server restart",
          text: "Restarting from this dashboard is unavailable. On the server computer, stop the backend with Ctrl+C in its terminal, then run npm start from the server folder. Current requests will be interrupted while the backend restarts.",
          icon: "info",
          confirmButtonText: "Understood"
        });
      }
