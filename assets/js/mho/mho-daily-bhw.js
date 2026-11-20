(() => {
    const cards = [...document.querySelectorAll('.mho-case-card[data-case-mode]')];
    const titles = { daily: 'Today’s BHW Activity', active: 'Active cases', recovered: 'Cleared / recovered', highRisk: 'Active high risk' };
    const template = document.getElementById('daily-bhw-template');
    const field = id => document.getElementById('daily-bhw-' + id);
    const safe = value => HealthIntelEncoding.escape(String(value ?? ''));
    const time = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true
    });

    const endpoint = HealthIntel.apiOrigin + '/api/mho/daily-bhw-entries';
    const total = field('total');
    const summary = field('summary');
    function renderTotal(count) {
        total.textContent = count === null ? 'Unavailable' : count.toLocaleString('en-PH');
        total.classList.toggle('text-3xl', count !== null);
        total.classList.toggle('text-base', count === null);
        summary.textContent = count === null ? 'Could not load today’s total. Open to retry.'
            : count === 0 ? 'No BHW entries today across all seven barangays'
            : (count === 1 ? 'BHW entry' : 'BHW entries') + ' today across all seven barangays';
    }
    const calendarDate = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric'
    });
    let rollover, refreshOpenDaily, countVersion = 0;
    function scheduleRollover(delay) {
        clearTimeout(rollover);
        rollover = setTimeout(() => {
            refreshTotal();
            refreshOpenDaily?.();
        }, delay + 100);
    }
    async function refreshTotal() {
        const version = ++countVersion;
        try {
            const response = await fetch(endpoint + '?summary=1', { cache: 'no-store' });
            const result = await response.json();
            if (!response.ok || !result.success || !Number.isSafeInteger(result.total) || result.total < 0) throw Error('Count unavailable');
            if (version !== countVersion) return;
            renderTotal(result.total);
            if (Number.isFinite(result.nextDayInMs) && result.nextDayInMs > 0) scheduleRollover(result.nextDayInMs);
        } catch {
            if (version === countVersion) renderTotal(null);
        }
    }

    function open(trigger, { barangay = '', search = '', entryType = '', page = 1, returnEntry, analytics } = {}) {
        const mode = trigger.dataset.caseMode;
        const daily = mode === 'daily';
        const title = titles[mode];
        if (!daily && !analytics) {
            const { barangay, age } = selectedAnalyticsFilters();
            analytics = { barangay, age, year: 'all' };
        }
        let controller, timer, reloadDaily, leavingForHistory = false;
        Swal.fire({
            titleText: title,
            html: template.innerHTML,
            customClass: { popup: 'hi-dialog mho-patient-history-dialog mho-case-list-dialog' },
            showCloseButton: true,
            closeButtonAriaLabel: 'Close ' + title,
            confirmButtonText: 'Close',
            focusConfirm: false,
            returnFocus: false,
            didOpen() {
                const scope = field('barangay'), searchBox = field('search'), status = field('status');
                const rows = field('rows'), pager = field('pager'), table = field('table');
                const type = field('type');
                window.lucide?.createIcons();
                type.value = entryType;
                field('filters').hidden = !daily;
                searchBox.value = search;
                field('caption').textContent = title;
                if (!daily) {
                    field('date').textContent = [
                        analytics.year === 'all' ? 'All years' : analytics.year,
                        analytics.barangay === 'all' ? 'All barangays' : analytics.barangay,
                        analytics.age === 'all' ? 'All age groups' : analytics.age + ' years'
                    ].join(' · ');
                    field('type-heading').textContent = 'Severity';
                    field('time-heading').textContent = 'Status';
                }
                async function load(requestedPage = 1) {
                    controller?.abort();
                    const active = new AbortController();
                    controller = active;
                    const timeout = setTimeout(() => active.abort(), 15000);
                    const filters = new URLSearchParams(daily ? { barangay, q: search, type: entryType, page: requestedPage } : { ...analytics, kind: mode, page: requestedPage });
                    rows.replaceChildren();
                    table.hidden = true;
                    pager.replaceChildren();
                    status.className = 'mho-case-count';
                    status.textContent = daily ? 'Loading today’s activity…' : 'Loading cases…';
                    try {
                        const response = await fetch(`${daily ? endpoint : HealthIntel.apiOrigin + '/api/mho/kpi-cases'}?${filters}`, { signal: active.signal, cache: 'no-store' });
                        const result = await response.json();
                        if (controller !== active || !status.isConnected) return;
                        if (!response.ok || !result.success) throw Error(result.error || 'Entries could not be loaded.');
                        if (daily && scope.options.length === 1) {
                            for (const name of result.barangays) scope.add(new Option(name, name));
                            scope.value = barangay;
                        }
                        page = result.page;
                        if (daily) {
                            if (!barangay && !search && !entryType) renderTotal(result.total);
                            field('date').textContent = calendarDate.format(new Date(result.date + 'T00:00:00+08:00')) + ' · Philippine time';
                        }
                        const unit = daily ? (result.total === 1 ? 'entry' : 'entries') : (result.total === 1 ? 'case' : 'cases');
                        status.textContent = result.total ? `${result.total.toLocaleString()} ${unit}`
                            : daily ? (search || barangay || entryType ? 'No matching BHW entries today.' : 'No BHW entries recorded today.')
                            : 'No cases match this selection.';
                        status.classList.toggle('mho-case-empty', result.total === 0);
                        rows.innerHTML = result.data.map(row => {
                            const id = Number(row.resident_id || row.case_id);
                            const kind = row.resident_id ? 'resident' : 'legacy';
                            const key = daily ? row.entry_type + '-' + row.entry_id : 'case-' + row.case_id;
                            const details = daily
                                ? `<td>${safe(row.entry_type)}</td><td>${time.format(new Date(Number(row.entered_at) * 1000))}<br><small>Case / visit: ${safe(HealthIntelDate.formatCaseDate(row.clinical_date))}</small></td>`
                                : `<td><span data-severity="${safe(row.severity)}">${safe(row.severity || 'Not recorded')}</span></td><td>${safe(row.status || 'Not recorded')}</td>`;
                            return `<tr data-patient-id="${id}" data-patient-kind="${kind}" data-entry-key="${safe(key)}" data-entry-type="${safe(row.entry_type)}" data-mho-hint="Show patient history">
                                <td><button type="button" class="mho-patient-open text-blue-700 dark:text-blue-300 underline">${safe(row.patient_name || 'Name not recorded')}</button><br><small>REC-${Number(row.case_id)}</small></td>
                                <td>${safe(row.barangay)}<br><small>${safe(row.purok || 'Purok not recorded')}</small></td>
                                <td>${safe(row.disease || 'Not recorded')}</td>${details}
                            </tr>`;
                        }).join('');
                        table.hidden = !result.data.length;
                        if (result.data.length) renderMhoPages(pager, page, result.page_count, title + ' pages');
                        if (returnEntry) {
                            const previous = [...rows.rows].find(row => row.dataset.entryKey === returnEntry);
                            (previous?.querySelector('button') || (daily ? searchBox : status)).focus();
                            returnEntry = undefined;
                        }
                    } catch (error) {
                        if (controller === active && status.isConnected) status.textContent = active.signal.aborted
                            ? 'Loading timed out. Use Refresh to try again.' : error.message;
                    } finally {
                        clearTimeout(timeout);
                    }
                }

                searchBox.addEventListener('input', event => {
                    if (event.isComposing) return;
                    clearTimeout(timer);
                    search = searchBox.value.trim();
                    timer = setTimeout(() => load(), 250);
                });
                scope.addEventListener('change', () => {
                    clearTimeout(timer);
                    barangay = scope.value;
                    load();
                });
                type.addEventListener('change', () => {
                    clearTimeout(timer);
                    entryType = type.value;
                    load();
                });
                if (daily) {
                    reloadDaily = () => { clearTimeout(timer); load(); };
                    refreshOpenDaily = reloadDaily;
                }
                field('refresh').addEventListener('click', () => {
                    clearTimeout(timer);
                    load();
                });
                rows.addEventListener('click', async event => {
                    const row = event.target.closest('[data-patient-id]');
                    if (!row || leavingForHistory) return;
                    leavingForHistory = true;
                    const result = await window.HealthIntelMhoPatients.open(row.dataset.patientKind, Number(row.dataset.patientId), {
                        initialTab: !daily || row.dataset.entryType === 'New case' ? 'cases' : 'visits'
                    });
                    if (result !== 'record-return-visit') open(trigger, { barangay, search, entryType, page, analytics, returnEntry: row.dataset.entryKey });
                });
                pager.addEventListener('click', async event => {
                    const button = event.target.closest('[data-mho-page]');
                    if (button && !button.disabled) {
                        await load(Number(button.dataset.mhoPage));
                        if (status.isConnected) status.focus();
                    }
                });
                status.focus();
                load(page);
            },
            willClose() {
                clearTimeout(timer);
                controller?.abort();
                controller = null;
                if (reloadDaily === refreshOpenDaily) refreshOpenDaily = undefined;
            },
            didClose() {
                if (!leavingForHistory && !Swal.isVisible()) trigger.focus();
            }
        });
    }
    for (const card of cards) card.addEventListener('click', () => open(card));
    window.addEventListener('health-intel:cases-changed', refreshTotal);
    refreshTotal();
})();
