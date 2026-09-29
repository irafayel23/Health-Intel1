
      // ==========================================
      // DESCRIPTIVE ANALYTICS: INTERACTIVE DATABASE
      // RESTORED HARDCODED PROTOTYPE DATA SO FILTERS WORK!
      // ==========================================
      const healthDatabase = {
        2025: {
          morbidity: {
            all: [
              { disease: "Wounds & Animal Bites", cases: 3674 },
              { disease: "Other Symptoms", cases: 712 },
              { disease: "Upper Resp. Infection (URTI)", cases: 695 },
              { disease: "Influenza", cases: 673 },
              { disease: "Fever (Unknown Origin)", cases: 490 },
              { disease: "Acute Lower Resp. Infection", cases: 344 },
              { disease: "Essential Hypertension", cases: 320 },
              { disease: "Abdominal & Pelvic pain", cases: 212 },
              { disease: "Other Diseases of Skin", cases: 121 },
              { disease: "Urinary Tract Infection", cases: 94 },
            ],
            under5: [
              { disease: "Wounds (inc. Animal bites)", cases: 368 },
              { disease: "Influenza", cases: 224 },
              { disease: "Acute URTI", cases: 210 },
              { disease: "Fever (Unknown Origin)", cases: 133 },
              { disease: "Other Symptoms", cases: 60 },
              { disease: "Unspecified lower resp.", cases: 46 },
              { disease: "Nose/nasal diseases", cases: 40 },
              { disease: "Acute Gastroenteritis", cases: 34 },
              { disease: "Skin Diseases", cases: 33 },
              { disease: "Asthma", cases: 13 },
            ],
            infant: [
              { disease: "Acute URTI", cases: 41 },
              { disease: "Influenza", cases: 41 },
              { disease: "Fever (Unknown Origin)", cases: 13 },
              { disease: "Wounds, All Types", cases: 8 },
              { disease: "Acute Gastroenteritis", cases: 7 },
              { disease: "Skin Diseases", cases: 6 },
              { disease: "Unspecified Acute Lower Resp.", cases: 6 },
              { disease: "Nose/nasal diseases", cases: 4 },
              { disease: "Relapsing fever", cases: 3 },
              { disease: "Other Symptoms", cases: 3 },
            ],
          },
          mortality: {
            all: [
              { disease: "Undetermined Natural Cause", cases: 74 },
              { disease: "Hypertension", cases: 66 },
              { disease: "Tuberculosis", cases: 28 },
              { disease: "Diabetes Mellitus", cases: 22 },
              { disease: "Kidney Disease", cases: 20 },
              { disease: "Cardio Pulmonary Arrest", cases: 20 },
              { disease: "Cancer", cases: 19 },
              { disease: "Pneumonia", cases: 18 },
              { disease: "Accident", cases: 14 },
              { disease: "Wounds, All Types", cases: 10 },
            ],
            under5: [
              { disease: "Fetal Death", cases: 6 },
              { disease: "Pneumonia", cases: 2 },
              { disease: "Prematurity", cases: 1 },
              { disease: "Congenital Anomaly", cases: 1 },
            ],
            infant: [
              { disease: "Fetal Death", cases: 6 },
              { disease: "Prematurity", cases: 1 },
              { disease: "Pneumonia", cases: 1 },
            ],
          },
        },
        2024: {
          morbidity: {
            all: [
              { disease: "Acute Resp. Infection", cases: 2037 },
              { disease: "Animal Bites", cases: 2004 },
              { disease: "Fever (Unknown Origin)", cases: 1396 },
              { disease: "Wound - All Types", cases: 515 },
              { disease: "Body Malaise/Pain", cases: 263 },
              { disease: "Hypertension", cases: 110 },
              { disease: "Acute Gastroenteritis", cases: 99 },
              { disease: "Systemic Viral Infection", cases: 95 },
              { disease: "Skin Diseases", cases: 88 },
              { disease: "Hypersensitivity Reaction", cases: 88 },
            ],
            under5: [
              { disease: "Fever (Unknown Origin)", cases: 488 },
              { disease: "Acute Resp. Infection", cases: 396 },
              { disease: "Cough", cases: 248 },
              { disease: "Animal Bites", cases: 239 },
              { disease: "Wounds, All Types", cases: 64 },
              { disease: "Hypersensitivity Reaction", cases: 37 },
              { disease: "Influenza", cases: 35 },
              { disease: "Skin Diseases", cases: 23 },
              { disease: "Systemic Viral Infection", cases: 21 },
              { disease: "Asthma", cases: 15 },
            ],
            infant: [
              { disease: "Acute Resp. Infection", cases: 133 },
              { disease: "Fever (Unknown Origin)", cases: 95 },
              { disease: "Cough", cases: 60 },
              { disease: "Influenza", cases: 12 },
              { disease: "Acute Gastroenteritis", cases: 9 },
              { disease: "Skin Diseases", cases: 7 },
              { disease: "Hypersensitivity Reaction", cases: 7 },
              { disease: "Systemic Viral Infection", cases: 7 },
              { disease: "Wounds, All Types", cases: 4 },
              { disease: "Whooping Cough", cases: 3 },
            ],
          },
          mortality: {
            all: [
              { disease: "Undetermined Natural Cause", cases: 91 },
              { disease: "Hypertension", cases: 46 },
              { disease: "Cancer", cases: 30 },
              { disease: "Kidney Disease", cases: 27 },
              { disease: "Diabetes Mellitus", cases: 26 },
              { disease: "Pneumonia", cases: 12 },
              { disease: "Tuberculosis", cases: 12 },
              { disease: "Accident", cases: 12 },
              { disease: "COPD", cases: 10 },
              { disease: "Cardiovascular Disease", cases: 8 },
            ],
            under5: [
              { disease: "Fetal Death", cases: 7 },
              { disease: "Pneumonia", cases: 3 },
              { disease: "Prematurity", cases: 1 },
              { disease: "Congenital Anomaly", cases: 1 },
            ],
            infant: [
              { disease: "Fetal Death", cases: 7 },
              { disease: "Prematurity", cases: 1 },
              { disease: "Pneumonia", cases: 1 },
            ],
          },
        },
        2023: {
          morbidity: {
            all: [
              { disease: "Cough", cases: 793 },
              { disease: "Animal Bites", cases: 599 },
              { disease: "URTI", cases: 353 },
              { disease: "Wounds, All Type", cases: 272 },
              { disease: "ARI", cases: 271 },
              { disease: "Fever (Unknown Origin)", cases: 216 },
              { disease: "Hypertension", cases: 213 },
              { disease: "Influenza", cases: 155 },
              { disease: "Acute Gastroenteritis", cases: 155 },
              { disease: "Vertigo", cases: 120 },
            ],
            under5: [
              { disease: "Cough", cases: 171 },
              { disease: "Fever (Unknown Origin)", cases: 83 },
              { disease: "ARI", cases: 82 },
              { disease: "URTI", cases: 66 },
              { disease: "Animal Bites", cases: 46 },
              { disease: "Acute Gastroenteritis", cases: 29 },
              { disease: "Systemic Viral Infection", cases: 17 },
              { disease: "Hand, Foot & Mouth", cases: 12 },
              { disease: "Wounds, All Type", cases: 8 },
              { disease: "Otitis Media", cases: 4 },
            ],
            infant: [
              { disease: "Cough", cases: 64 },
              { disease: "ARI", cases: 29 },
              { disease: "Fever (Unknown Origin)", cases: 20 },
              { disease: "URTI", cases: 12 },
              { disease: "Acute Gastroenteritis", cases: 4 },
              { disease: "Systemic Viral Infection", cases: 3 },
              { disease: "Skin Diseases", cases: 3 },
              { disease: "Carbuncle", cases: 2 },
              { disease: "Hypersensitivity", cases: 2 },
              { disease: "Wound, All Type", cases: 1 },
            ],
          },
          mortality: {
            all: [
              { disease: "Undetermined Natural Cause", cases: 92 },
              { disease: "Hypertension", cases: 60 },
              { disease: "Cardiopulmonary Arrest", cases: 29 },
              { disease: "Kidney Disease", cases: 20 },
              { disease: "Cancer", cases: 19 },
              { disease: "Pneumonia", cases: 15 },
              { disease: "Tuberculosis", cases: 12 },
              { disease: "Accident", cases: 8 },
              { disease: "COPD", cases: 7 },
              { disease: "Asphyxia", cases: 5 },
            ],
            under5: [
              { disease: "Fetal Death", cases: 3 },
              { disease: "Acute Gastroenteritis", cases: 3 },
              { disease: "Pneumonia", cases: 1 },
              { disease: "Prematurity", cases: 1 },
              { disease: "Sepsis", cases: 1 },
            ],
            infant: [
              { disease: "Fetal Death", cases: 3 },
              { disease: "Pneumonia", cases: 1 },
              { disease: "Acute Gastroenteritis", cases: 1 },
              { disease: "Prematurity", cases: 1 },
            ],
          },
        },
      };

      let myChart;

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
      // API FETCH & TOGGLE LOGIC
      // ==========================================
      async function runPredictiveModel() {
        const button = document.getElementById('run-forecast-button');
        if (button.disabled) return;
        const diseaseSelect = document.getElementById('predictive-disease-select');
        const barangaySelect = document.getElementById('predictive-brgy-select');
        const disease = diseaseSelect.value;
        const barangay = barangaySelect.value;
        const summary = document.getElementById('predictive-insight-text');
        const validation = document.getElementById('predictive-validation-status');
        const months = document.getElementById('forecast-months');
        const recommendations = document.getElementById('forecast-recommendations');
        const recommendationStatus = document.getElementById('forecast-recommendation-status');
        months.hidden = recommendations.hidden = true;
        months.replaceChildren();
        recommendations.replaceChildren();
        recommendationStatus.hidden = false;
        recommendationStatus.textContent = 'Preparing suggested follow-up...';
        if (myChart) { myChart.destroy(); myChart = null; }
        button.disabled = diseaseSelect.disabled = barangaySelect.disabled = true;
        button.textContent = 'Generating...';
        summary.textContent = 'Generating demonstration forecast...';
        validation.textContent = 'Pending';
        try {
            const params = new URLSearchParams({ disease, barangay });
            const response = await fetch('http://localhost:3000/api/predict?' + params);
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Unable to generate a forecast.');
            const data = result.data;
            const guidance = MHOInsights.forecastGuidance(data, disease, barangay);
            const futureValues = data.forecast.filter(value => value !== null);
            if (!futureValues.length || !futureValues.every(Number.isFinite)) throw new Error('The forecast contains invalid values.');
            if (myChart) myChart.destroy();
            myChart = new Chart(document.getElementById('predictionChart').getContext('2d'), {
                type: 'line',
                data: {
                    labels: data.dates,
                    datasets: [
                        { label: 'Recorded cases in selected barangay', data: data.historical,
                          borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 3, fill: true, tension: 0.3 },
                        { label: 'Demonstration estimate (validation pending)', data: data.forecast,
                          borderColor: '#ef4444', borderDash: [5,5], borderWidth: 3, pointRadius: 5, fill: false, tension: 0.3 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { title: { display: true, text: `Demonstration forecast: ${disease} in ${barangay}` }, legend: { position: 'bottom' } },
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'Number of cases' } } }
                }
            });
            summary.textContent = guidance.summary;
            for (const entry of guidance.entries) {
                const card = document.createElement('div');
                card.className = 'forecast-month';
                const label = document.createElement('span');
                label.textContent = new Date(entry.date + '-01T12:00:00').toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
                const count = document.createElement('strong');
                count.textContent = entry.value.toLocaleString('en-PH');
                const unit = document.createElement('span');
                unit.textContent = entry.value === 1 ? 'estimated case' : 'estimated cases';
                card.append(label, count, unit);
                months.append(card);
            }
            for (const text of guidance.recommendations) {
                const item = document.createElement('li');
                item.textContent = text;
                recommendations.append(item);
            }
            months.hidden = recommendations.hidden = false;
            recommendationStatus.hidden = true;
        } catch (error) {
            summary.textContent = error.message || 'Unable to generate a forecast. Please try again.';
            recommendationStatus.textContent = 'Suggested follow-up is unavailable because the forecast did not complete.';
        } finally {
            button.disabled = diseaseSelect.disabled = barangaySelect.disabled = false;
            button.textContent = 'Run Forecast';
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



      // ==========================================
      // OFFICIAL DOH PDF GENERATOR (Backend)
      // ==========================================
      async function generateOfficialPDF(reportType) {
        let url;
        if (reportType === 'FHSIS') {
          const params = new URLSearchParams({ month: document.getElementById('fhsis-month').value, year: document.getElementById('fhsis-year').value });
          url = 'http://localhost:3000/api/mho/reports/fhsis?' + params;
        } else if (reportType === 'PIDSR') {
          url = 'http://localhost:3000/api/mho/reports/pidsr?' + new URLSearchParams({week:document.getElementById('pidsr-week').value,year:document.getElementById('pidsr-year').value});
        } else return;
        Swal.fire({ title: 'Generating report...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
          await HealthIntel.download(url, {}, reportType + '_Report.pdf');
          Swal.fire({ icon: 'success', title: 'Download started', text: 'Your ' + reportType + ' PDF is ready.' });
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'Report unavailable', text: error.message });
        }
      }
    

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const icon = document.getElementById("sidebar-icon");
    const text = document.getElementById("sidebar-text");
    const labels = document.querySelectorAll(".sidebar-label");

    if (sidebar.classList.contains("w-64")) {
        sidebar.classList.replace("w-64", "w-20");
        text.classList.add("hidden");
        labels.forEach(l => l.classList.add("hidden"));
        icon.setAttribute("data-lucide", "panel-left-open");
    } else {
        sidebar.classList.replace("w-20", "w-64");
        text.classList.remove("hidden");
        labels.forEach(l => l.classList.remove("hidden"));
        icon.setAttribute("data-lucide", "panel-left-close");
    }
    lucide.createIcons();
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
}

    