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
      }
      document.addEventListener('DOMContentLoaded', () => initializeMhoReportPeriods());

      async function generateOfficialPDF(reportType) {
        let historicalPeriod;
        let url;
        if (reportType === 'FHSIS') {
          const params = new URLSearchParams({ month: document.getElementById('fhsis-month').value, year: document.getElementById('fhsis-year').value });
          historicalPeriod = params;
          url = 'http://localhost:3000/api/mho/reports/fhsis?' + params;
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
