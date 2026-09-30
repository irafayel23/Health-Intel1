// MHO API-backed descriptive charts, filters and dashboard totals.
// Classic script: load through mho.html; cross-feature functions share its page scope.
      // ==========================================
      // CHART 1 & 2: DYNAMIC FETCH FROM DB
      // ==========================================
      let analyticsRequestId = 0;
      function selectedAnalyticsFilters() {
        return {
          year: document.getElementById('filter-year').value,
          barangay: document.getElementById('filter-barangay').value,
          age: document.getElementById('filter-age').value,
          category: document.getElementById('filter-category').value
        };
      }
      async function fetchYoyAndMortality(filters, requestId) {
        const params = new URLSearchParams(filters);
        const yoyCanvas = document.getElementById('yoyMorbidityChart');
        const mortalityCanvas = document.getElementById('mortalityChart');
        try {
          const [yoyResponse, mortalityResponse] = await Promise.all([
            fetch('http://localhost:3000/api/mho/yoy?' + params),
            fetch('http://localhost:3000/api/mho/mortality?' + params)
          ]);
          const [yoy, mortality] = await Promise.all([yoyResponse.json(), mortalityResponse.json()]);
          if (requestId !== analyticsRequestId) return;
          if (!yoy.success || !mortality.success) throw new Error('Comparison charts are unavailable.');
          document.getElementById('yoy-title').textContent = `Recorded Cases: ${yoy.previous_year} vs ${yoy.current_year}`;
          document.getElementById('yoy-context').textContent = `Uses the selected barangay and recorded age. ${filters.year === 'all' ? 'All Years compares the current calendar year with the previous year. ' : ''}Current-year counts may be incomplete; this chart does not establish an increase or decline in community disease incidence.`;
          document.getElementById('mortality-title').textContent = `Recorded Deaths: ${filters.year === 'all' ? 'All Years' : 'CY ' + filters.year}`;
          if (window.yoyChartInst) window.yoyChartInst.destroy();
          if (window.mortChartInst) window.mortChartInst.destroy();
          window.yoyChartInst = new Chart(yoyCanvas.getContext('2d'), {
            type: 'bar',
            data: { labels: yoy.data.map(row => row.disease), datasets: [
              { label: 'CY ' + yoy.previous_year, data: yoy.data.map(row => Number(row.previous_cases)), backgroundColor: '#3b82f6', borderRadius: 4 },
              { label: 'CY ' + yoy.current_year, data: yoy.data.map(row => Number(row.current_cases)), backgroundColor: '#f59e0b', borderRadius: 4 }
            ] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: !yoy.data.length, text: 'No matching comparison records.' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } }
          });
          window.mortChartInst = new Chart(mortalityCanvas.getContext('2d'), {
            type: 'doughnut',
            data: { labels: mortality.data.map(row => row.disease), datasets: [{ data: mortality.data.map(row => Number(row.count)), backgroundColor: ['#64748b','#ef4444','#f59e0b','#3b82f6','#8b5cf6'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom' }, title: { display: !mortality.data.length, text: 'No matching records marked Deceased.' } } }
          });
        } catch (error) {
          if (requestId !== analyticsRequestId) return;
          if (window.yoyChartInst) { window.yoyChartInst.destroy(); window.yoyChartInst = null; }
          if (window.mortChartInst) { window.mortChartInst.destroy(); window.mortChartInst = null; }
          document.getElementById('yoy-context').textContent = 'Comparison charts could not be loaded. Refresh or try another filter.';
        }
      }



      // ==========================================
      // DATABASE SYNC: Fetch Live Stats from MySQL
      // ==========================================
      async function fetchLiveMHOStats(filters, requestId) {
        const ids = { total: 'stat-total', active: 'stat-active', recovered: 'stat-recovered', highRisk: 'stat-risk' };
        try {
          const response = await fetch('http://localhost:3000/api/mho/kpi?' + new URLSearchParams(filters));
          const result = await response.json();
          if (requestId !== analyticsRequestId) return;
          if (!result.success) throw new Error('Totals are unavailable.');
          for (const [key, id] of Object.entries(ids)) document.getElementById(id).textContent = Number(result[key]).toLocaleString('en-PH');
          document.getElementById('analytics-kpi-context').textContent = 'Totals follow the selected year, barangay and recorded age, across all disease-case outcomes. Statuses reflect the current records; active totals exclude archived records. The Cases/Deaths selector applies to the health profile below.';
        } catch (error) {
          if (requestId !== analyticsRequestId) return;
          for (const id of Object.values(ids)) document.getElementById(id).textContent = 'Unavailable';
          document.getElementById('analytics-kpi-context').textContent = 'Totals could not be loaded. They are not zero counts.';
        }
      }


      // ==========================================
      // EPIDEMIOLOGICAL HEALTH PROFILE (DYNAMIC CHART)
      // ==========================================
      const canvasEl = document.getElementById("dynamicChart");
      const ctxDynamic = canvasEl ? canvasEl.getContext("2d") : null;
      let dynamicChart = null;
      let blueGradient, redGradient;
      if (ctxDynamic) {
          blueGradient = ctxDynamic.createLinearGradient(0, 0, 800, 0);
          blueGradient.addColorStop(0, "rgba(59, 130, 246, 0.6)");
          blueGradient.addColorStop(1, "rgba(37, 99, 235, 0.9)");
          redGradient = ctxDynamic.createLinearGradient(0, 0, 800, 0);
          redGradient.addColorStop(0, "rgba(239, 68, 68, 0.6)");
          redGradient.addColorStop(1, "rgba(185, 28, 28, 0.9)");

          dynamicChart = new Chart(ctxDynamic, {
            type: "bar",
            data: { labels: [], datasets: [{ label: "Cases Recorded", data: [], backgroundColor: blueGradient, borderRadius: 6 }] },
            options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
          });
      }

      async function updateDynamicChart() {
        const filters = selectedAnalyticsFilters();
        const requestId = ++analyticsRequestId;
        const insight = document.getElementById('insight-text');
        const action = document.getElementById('action-text');
        const context = document.getElementById('analytics-data-context');
        insight.textContent = 'Loading the selected records...';
        action.textContent = 'Suggested follow-up will appear after the records load.';
        context.textContent = 'Updating charts and descriptions for the selected filters...';
        for (const id of ['stat-total','stat-active','stat-recovered','stat-risk']) document.getElementById(id).textContent = '...';
        if (dynamicChart) {
          dynamicChart.data.labels = [];
          dynamicChart.data.datasets[0].data = [];
          dynamicChart.update();
        }
        const otherPanels = Promise.all([fetchLiveMHOStats(filters, requestId), fetchYoyAndMortality(filters, requestId)]);
        try {
          const response = await fetch('http://localhost:3000/api/mho/stats?' + new URLSearchParams(filters));
          const result = await response.json();
          if (requestId !== analyticsRequestId) return;
          if (!result.success) throw new Error('The selected records could not be loaded.');
          const description = MHOInsights.describeProfile(result.data, filters, result.summary);
          insight.textContent = description.text;
          action.textContent = description.action;
          const range = result.summary.first_recorded ? ` Matching record dates: ${result.summary.first_recorded} to ${result.summary.last_recorded}.` : '';
          context.textContent = `Counts use recorded dates and recorded ages. Bite and accident categories are excluded. Historical totals retain archived records.${range} Reporting completeness and real/dummy provenance are not established by this chart.`;
          if (dynamicChart) {
            dynamicChart.data.labels = result.data.map(row => row.disease);
            dynamicChart.data.datasets[0].data = result.data.map(row => Number(row.cases));
            dynamicChart.data.datasets[0].label = filters.category === 'mortality' ? 'Records marked Deceased' : 'Recorded disease cases (all outcomes)';
            dynamicChart.data.datasets[0].backgroundColor = filters.category === 'mortality' ? redGradient : blueGradient;
            dynamicChart.options.scales = { x: { beginAtZero: true, ticks: { precision: 0 } } };
            dynamicChart.update();
          }
        } catch (error) {
          if (requestId !== analyticsRequestId) return;
          insight.textContent = 'The selected records could not be loaded. Please refresh or try again.';
          action.textContent = 'Suggested follow-up is unavailable while the data cannot be loaded.';
          context.textContent = 'Data unavailable. A connection error does not mean there are zero cases.';
        } finally { await otherPanels; }
      }
      updateDynamicChart();
