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

      document.addEventListener('DOMContentLoaded', () => {
        initializeMhoReportPeriods();
        return initializeBarangayReport();
      });

      function initializeBarangayReport() {
        const form = document.getElementById('barangay-report-form');
        const place = document.getElementById('barangay-report-place');
        const year = document.getElementById('barangay-report-year');
        const month = document.getElementById('barangay-report-month');
        const download = document.getElementById('barangay-report-download');
        const status = document.getElementById('barangay-report-status');
        const retry = document.getElementById('barangay-report-retry');
        const endpoint = HealthIntel.apiOrigin + '/api/mho/reports/historical-counts';
        const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });
        let periodsByPlace;

        function setOptions(select, values, label = value => value) {
          const previous = select.value;
          select.replaceChildren(...values.map(value => new Option(label(value), value)));
          select.value = values.includes(previous) ? previous : (values[0] ?? '');
          select.disabled = values.length === 0;
        }

        function updateMonths() {
          const months = periodsByPlace[place.value]
            .filter(period => period.startsWith(year.value + '-'))
            .map(period => period.slice(5));
          setOptions(month, months, number => formatter.format(new Date(Date.UTC(2020, Number(number) - 1, 1))));
          download.disabled = months.length === 0;
          status.textContent = '';
        }

        function updateYears() {
          setOptions(year, [...new Set(periodsByPlace[place.value].map(period => period.slice(0, 4)))]);
          updateMonths();
        }

        async function loadPeriods() {
          retry.hidden = true;
          status.textContent = 'Loading report periods…';
          try {
            const response = await fetch(endpoint);
            const data = await response.json();
            const places = Object.keys(data.barangayPeriods ?? {});
            if (!response.ok || !data.success || !places.length) throw new Error();
            periodsByPlace = data.barangayPeriods;
            setOptions(place, places);
            updateYears();
          } catch {
            status.textContent = 'Report periods could not be loaded.';
            retry.hidden = false;
          }
        }

        place.addEventListener('change', updateYears);
        year.addEventListener('change', updateMonths);
        retry.addEventListener('click', loadPeriods);
        form.addEventListener('submit', async event => {
          event.preventDefault();
          if (download.disabled || !place.value || !month.value || !year.value) return;
          const query = new URLSearchParams({ barangay: place.value, month: month.value, year: year.value, format: 'pdf' });
          place.disabled = year.disabled = month.disabled = download.disabled = true;
          status.textContent = 'Preparing PDF…';
          try {
            await HealthIntel.download(endpoint + '?' + query, {}, 'Barangay_Case_Report.pdf');
            status.textContent = 'Download started.';
          } catch (error) {
            status.textContent = error.message || 'The PDF could not be downloaded.';
          } finally {
            place.disabled = year.disabled = month.disabled = download.disabled = false;
          }
        });
        return loadPeriods();
      }

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
