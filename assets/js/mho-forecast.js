// Existing forecast display and request handling; model behavior is unchanged.
// Classic script: load through mho.html; cross-feature functions share its page scope.
      let myChart;


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
