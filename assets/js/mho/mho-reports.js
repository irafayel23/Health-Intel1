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
        const week = document.getElementById('pidsr-week');
        const year = document.getElementById('pidsr-year');
        function updateWeeks() {
          const dec28 = new Date(Date.UTC(Number(year.value), 11, 28));
          dec28.setUTCDate(dec28.getUTCDate() + 3 - ((dec28.getUTCDay() + 6) % 7));
          const lastWeek = Math.ceil(((dec28 - Date.UTC(Number(year.value), 0, 1)) / 86400000 + 1) / 7);
          week.options[52].disabled = lastWeek !== 53;
          if (Number(week.value) > lastWeek) week.value = String(lastWeek);
        }
        year.addEventListener('change', updateWeeks);
        updateWeeks();
      });

      async function generateOfficialPDF(reportType) {
        let historicalPeriod;
        let url;
        if (reportType === 'FHSIS') {
          const params = new URLSearchParams({ month: document.getElementById('fhsis-month').value, year: document.getElementById('fhsis-year').value });
          historicalPeriod = params;
          url = 'http://localhost:3000/api/mho/reports/fhsis?' + params;
        } else if (reportType === 'PIDSR') {
          url = 'http://localhost:3000/api/mho/reports/pidsr?' + new URLSearchParams({week:document.getElementById('pidsr-week').value,year:document.getElementById('pidsr-year').value});
        } else if (reportType === 'TODAY') {
          return HealthIntelDailyReports.download('mho');
        } else return;
        Swal.fire({ title: 'Generating report...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
          if (historicalPeriod && typeof HistoricalReports !== 'undefined') {
            const month = historicalPeriod.get('month');
            const historicalPdf = await HistoricalReports.pdfUrl('mho', historicalPeriod.get('year'), month);
            if (month === 'all' && !historicalPdf) throw new Error('The historical dataset has no months for this year.');
            url = historicalPdf || url;
          }
          await HealthIntel.download(url, {}, reportType + '_Report.pdf');
          Swal.fire({ icon: 'success', title: 'Download started', text: 'Your ' + reportType + ' PDF is ready.' });
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'Report unavailable', text: error.message });
        }
      }
