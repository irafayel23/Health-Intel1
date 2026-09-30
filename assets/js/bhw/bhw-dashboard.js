// BHW dashboard totals and trend chart.
// Classic script: load through bhw.html; cross-feature functions share its page scope.
      async function loadDashboardStats() {
          try {
            const url = window.currentBrgyId ? `http://localhost:3000/api/bhw-stats?barangay_id=${window.currentBrgyId}` : 'http://localhost:3000/api/bhw-stats';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
              document.getElementById("stat-total").innerText = data.total;
              document.getElementById("stat-active").innerText = data.active;
              document.getElementById("stat-cleared").innerText = data.cleared;
              document.getElementById("stat-high-risk").innerText = data.high_risk;

              document.getElementById("bd-cleared").innerText = data.cleared;
              document.getElementById("bd-mild").innerText = data.mild;
              document.getElementById("bd-monitored").innerText = data.monitored;
              document.getElementById("bd-high").innerText = data.high_risk;
            }
          } catch (e) { console.error("Error loading stats:", e); }
      }


      // 5. CHART & MAP LOGIC
      let myBhwChart = null;
      async function loadTrendChart() {
          try {
              const url = window.currentBrgyId ? `http://localhost:3000/api/bhw-trend?barangay_id=${window.currentBrgyId}` : 'http://localhost:3000/api/bhw-trend';
              const res = await fetch(url);
              const result = await res.json();
              if (result.success) {
                  const ctx = document.getElementById("bhwChart").getContext("2d");
                  if (myBhwChart) myBhwChart.destroy();

                  // Get the months up to current month to match standard UI, or just show Jan-May if it's currently early in the year
                  // Let's just dynamically grab Jan through the current month
                  const currentMonthIndex = new Date().getMonth();
                  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                  const displayLabels = monthLabels.slice(0, currentMonthIndex + 1);
                  const displayData = result.data.slice(0, currentMonthIndex + 1);

                  myBhwChart = new Chart(ctx, {
                      type: "line",
                      data: {
                          labels: displayLabels,
                          datasets: [{ label: "Cases", data: displayData, borderColor: "#0ea5e9", backgroundColor: "rgba(14, 165, 233, 0.1)", fill: true, tension: 0.4 }]
                      },
                      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, suggestedMax: 10 }, x: { grid: { display: false } } } }
                  });
              }
          } catch(e) { console.error("Error loading trend chart:", e); }
      }
