// MHO report download actions.
// Classic script: load through mho.html; cross-feature functions share its page scope.



      // ==========================================
      // MHO report summaries (Backend); official mappings remain unvalidated.
      // ==========================================
      function initializeMhoReportPeriods(today = HealthIntelDate.todayInManila()) {
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const date = new Date(today + 'T00:00:00Z');
        const selectYear = (id, year) => {
          const select = document.getElementById(id);
          const value = String(year);
          if (![...select.options].some(option => option.value === value)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.prepend(option);
          }
          select.value = value;
        };
        document.getElementById('fhsis-month').value = months[date.getUTCMonth()];
        selectYear('fhsis-year', date.getUTCFullYear());
        const thursday = new Date(date);
        thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
        const isoYear = thursday.getUTCFullYear();
        const week = Math.ceil(((thursday - Date.UTC(isoYear, 0, 1)) / 86400000 + 1) / 7);
        document.getElementById('pidsr-week').value = String(week);
        selectYear('pidsr-year', isoYear);
      }
      document.addEventListener('DOMContentLoaded', () => {
        initializeMhoReportPeriods();
        const trigger = document.getElementById('pidsr-preview');
        if (!trigger) return;
        const week = document.getElementById('pidsr-week');
        const year = document.getElementById('pidsr-year');
        const status = document.getElementById('pidsr-preview-status');
        const counts = document.getElementById('pidsr-preview-counts');
        const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'UTC' });
        function updateWeeks() {
          const dec28 = new Date(Date.UTC(Number(year.value), 11, 28));
          dec28.setUTCDate(dec28.getUTCDate() + 3 - ((dec28.getUTCDay() + 6) % 7));
          const lastWeek = Math.ceil(((dec28 - Date.UTC(Number(year.value), 0, 1)) / 86400000 + 1) / 7);
          week.options[52].disabled = lastWeek !== 53;
          if (Number(week.value) > lastWeek) week.value = String(lastWeek);
          status.textContent = '';
          counts.replaceChildren();
        }
        year.addEventListener('change', updateWeeks);
        week.addEventListener('change', updateWeeks);
        updateWeeks();
        trigger.addEventListener('click', async () => {
          trigger.disabled = week.disabled = year.disabled = true;
          counts.replaceChildren();
          status.textContent = 'Loading weekly counts…';
          try {
            const query = new URLSearchParams({ week: week.value, year: year.value, format: 'summary' });
            const response = await fetch(HealthIntel.apiOrigin + '/api/mho/reports/pidsr?' + query);
            const data = await response.json();
            const start = date.format(new Date(data.start + 'T00:00:00Z'));
            const end = date.format(new Date(data.end + 'T00:00:00Z'));
            status.textContent = start + ' – ' + end + ' · ' + data.total + ' recorded cases';
            for (const row of data.counts) {
              const item = document.createElement('li');
              item.textContent = row.disease + ': ' + row.cases;
              counts.append(item);
            }
          } catch (error) {
            status.textContent = error.message || 'Weekly counts could not be loaded.';
          } finally {
            trigger.disabled = week.disabled = year.disabled = false;
          }
        });
      });

      async function generateOfficialPDF(reportType) {
        let url;
        if (reportType === 'FHSIS') {
          const params = new URLSearchParams({ month: document.getElementById('fhsis-month').value, year: document.getElementById('fhsis-year').value });
          url = 'http://localhost:3000/api/mho/reports/fhsis?' + params;
        } else if (reportType === 'PIDSR') {
          url = 'http://localhost:3000/api/mho/reports/pidsr?' + new URLSearchParams({week:document.getElementById('pidsr-week').value,year:document.getElementById('pidsr-year').value});
        } else if (reportType === 'TODAY') {
          return HealthIntelDailyReports.download('mho');
        } else return;
        Swal.fire({ title: 'Generating report...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
          await HealthIntel.download(url, {}, reportType + '_Report.pdf');
          Swal.fire({ icon: 'success', title: 'Download started', text: 'Your ' + reportType + ' PDF is ready.' });
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'Report unavailable', text: error.message });
        }
      }
