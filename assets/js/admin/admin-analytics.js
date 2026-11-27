(() => {
    const $ = id => document.getElementById('aa-' + id);
    if (!$('map') || !$('tabs')) return;
    const endpoint = () => (window.HealthIntel?.apiOrigin || 'http://localhost:3000') + '/api/admin/analytics';
    const fmt = value => value == null ? '—' : Number(value).toLocaleString('en-PH', {maximumFractionDigits: 1});
    const monthLabels = Array.from({length:12}, (_, i) => new Date(2020, i, 1).toLocaleString('en', {month:'long'}));
    let metadata, dataRequest, upload, preview, map, mapLayers, mapRequest, leafletRequest;

    function node(tag, value) {
        const element = document.createElement(tag);
        if (value != null) element.textContent = value;
        return element;
    }
    function status(id, message, error = false) {
        const output = $(id);
        output.textContent = message;
        output.dataset.error = String(error);
    }
    async function request(part, options = {}) {
        const response = await fetch(endpoint() + part, {signal: AbortSignal.timeout(30000), cache:'no-store', ...options});
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw Error(result.error || (response.status === 413 ? 'Choose a smaller CSV file.' : 'Could not complete this request. Try again.'));
        return result.data;
    }
    function rows(target, values) {
        target.replaceChildren(...values.map(values => {
            const row = node('tr');
            values.forEach(value => {
                const cell = node('td');
                if (value instanceof HTMLElement) cell.append(value);
                else cell.textContent = value;
                row.append(cell);
            });
            return row;
        }));
    }
    function table(headers, values) {
        const shell = node('div');
        shell.className = 'aa-table';
        const table = node('table');
        const header = node('tr');
        headers.forEach(label => {const th = node('th', label); th.scope = 'col'; header.append(th);});
        const head = node('thead');
        head.append(header);
        const body = node('tbody');
        rows(body, values);
        table.append(head, body);
        shell.append(table);
        return shell;
    }
    function select(id, entries, first) {
        const control = $(id);
        const old = control.value;
        control.replaceChildren();
        if (first) control.add(new Option(first, 'all'));
        for (const entry of entries) {
            const [value, label] = Array.isArray(entry) ? entry : [entry, entry];
            control.add(new Option(label, value));
        }
        if (Array.from(control.options).some(item => item.value === old)) control.value = old;
    }
    function coverageLine(value) {
        const describe = periods => periods.length <= 8 ? periods.join(', ') : periods.slice(0, 8).join(', ') + ' and ' + (periods.length - 8) + ' more';
        return [value.gaps.length && 'Missing months: ' + describe(value.gaps), value.partial.length && 'Incomplete months: ' + describe(value.partial)].filter(Boolean).join(' · ');
    }
    function readableMonth(period, style = 'short') {
        const [year, month] = period.split('-').map(Number);
        return new Intl.DateTimeFormat('en-PH', {month:style, year:'numeric', timeZone:'UTC'})
            .format(new Date(Date.UTC(year, month - 1, 1)));
    }
    function monthSpan(first, last) {
        return first === last ? readableMonth(first) : readableMonth(first) + ' – ' + readableMonth(last);
    }
    function renderDatasets(data) {
        const d = data.bundled;
        const history = data.historicalCoverage ?? d;
        $('dataset-summary').replaceChildren(...[['Historical coverage', monthSpan(history.first, history.last)], ['Latest observed', readableMonth(history.last)], ['Cases', fmt(history.cases)], ['Forecast coverage', data.diseases.length+' diseases · '+data.barangays.length+' barangays']].map(([label,value]) => {
            const group = node('div'); group.append(node('dt',label),node('dd',value)); return group;
        }));
        const confirmed = d.reportingUnavailable ? 'Confirmation history is unavailable.' :
            d.latestConfirmed ? 'Operational reports · ' + readableMonth(d.latestConfirmed, 'long') + (data.operationalConfirmation ? ' · ' + data.operationalConfirmation.confirmedBarangays + '/7 barangays confirmed' : '') : 'No confirmed operational reports yet.';
        const complete = d.latestComplete ? 'Latest fully confirmed month: ' + readableMonth(d.latestComplete, 'long') :
            d.latestConfirmed && 'No month has all seven barangays confirmed.';
        const coverage = [confirmed, complete, coverageLine(d)].filter(Boolean);
        $('coverage').replaceChildren(...coverage.map(line => node('span', line)));
        rows($('versions'), data.versions.map(v => [v.label, monthSpan(v.first, v.last), fmt(v.cases), v.trainingRange ? v.trainingRange.months + ' complete months' : 'Needs 45 complete months in a row', new Date(v.created_at).toLocaleString('en-PH', {timeZone:'Asia/Manila'})]));
        $('versions-table').hidden = !data.versions.length;
        status('versions-status', data.versions.length ? '' : 'No uploads yet. Preview a CSV and save it to create a version.');
    }
    async function getData(force = false) {
        if (metadata && !force) return metadata;
        if (!dataRequest) dataRequest = request('/datasets').then(value => {
            metadata = value;
            renderDatasets(value);
            window.HealthIntelMonthlyUpdates?.setDatasets(value.versions);
            for (const id of ['map-disease','published-disease']) select(id, value.diseases, id === 'map-disease' ? 'All study diseases' : null);
            for (const id of ['map-barangay','published-barangay']) select(id, value.barangays, id === 'map-barangay' ? 'All barangays' : null);
            const year = Number(value.current.slice(0,4));
            select('map-year', Array.from({length:year - 2023 + 1},(_,i)=>String(year-i)));
            if (!$('map-month').options.length) {
                updateMapMonths();
                $('map-month').value = value.current.slice(5);
            }
            return value;
        }).finally(() => {dataRequest = null;});
        return dataRequest;
    }
    function updateMapMonths() {
        const year = $('map-year').value;
        const months = monthLabels.map((label, i) => [String(i + 1).padStart(2, '0'), label]);
        select('map-month', months.filter(([month]) => year + '-' + month <= metadata.current));
    }

    async function leaflet() {
        if (window.L) return window.L;
        if (!leafletRequest) {
            leafletRequest = new Promise((resolve, reject) => {
                const script = node('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                const timer = setTimeout(() => {script.remove(); reject(Error('Map could not load. Reopen Heatmap Cases to retry.'));}, 10000);
                script.onload = () => {clearTimeout(timer); resolve(window.L);};
                script.onerror = () => {clearTimeout(timer); script.remove(); reject(Error('Map could not load. Reopen Heatmap Cases to retry.'));};
                document.head.append(script);
            }).catch(error => {leafletRequest = null; throw error;});
        }
        return leafletRequest;
    }
    async function drawMap(result, signal) {
        const L = await leaflet();
        const response = await fetch('assets/img/maps/murcia-pilot-barangays.geojson', {signal});
        if (!response.ok) throw Error('Map boundaries could not load.');
        const geo = await response.json();
        if (signal.aborted) return;
        if (!map) {
            const container = $('map');
            map = L.map(container);
            const fullscreen = window.HealthIntelMapFullscreen.bind(container, () => {
                map.invalidateSize({animate:false});
            });
            L.DomEvent.disableClickPropagation(fullscreen.controls);
            L.DomEvent.disableScrollPropagation(fullscreen.controls);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom:19
            }).addTo(map);
            map.attributionControl.addAttribution('Barangay boundaries: NAMRIA/PSA via OCHA COD-AB');
        }
        const counts = new Map(result.rows.map(row => [row.barangay, row]));
        const markers = L.layerGroup();
        const boundaries = L.geoJSON(geo, {
            filter: feature => counts.has(feature.properties.name),
            style: {color:'#334c79', weight:1.5, dashArray:'5 4', fillOpacity:.05},
            interactive: false,
            onEachFeature: (feature, layer) => {
                const row = counts.get(feature.properties.name);
                const count = row.cases == null ? 'No confirmed count' : fmt(row.cases) + (row.cases === 1 ? ' case' : ' cases');
                const size = $('map').clientWidth < 600 ? 48 : 64;
                const circle = window.HealthIntelMapDetails.marker({activity:{observed_cases:row.cases}},false);
                const marker = L.marker(layer.getBounds().getCenter(), {
                    icon:L.divIcon({className:'heatmap-summary-marker',html:circle,iconSize:[size,size],iconAnchor:[size/2,size/2]}),
                    title:row.barangay + ': ' + count
                }).addTo(markers);
                marker.bindTooltip(node('span',row.barangay), {
                    permanent:true, direction:'bottom', offset:[0,size/2 - 3], className:'aa-map-place'
                });
                const details = node('div');
                details.append(node('strong',row.barangay),node('p',count + ' · ' + readableMonth(result.period,'long')),node('p',row.status));
                marker.bindPopup(details, {offset:[0,-size/2]});
            }
        });
        mapLayers = L.layerGroup([boundaries,markers]).addTo(map);
        $('map').hidden = false;
        map.invalidateSize({pan:false});
        const bounds = boundaries.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, {padding:[32,40], maxZoom:14, animate:false});
    }
    async function loadMap() {
        mapRequest?.abort();
        const requestID = new AbortController();
        mapRequest = requestID;
        const signal = AbortSignal.any([requestID.signal, AbortSignal.timeout(25000)]);
        status('map-status','Loading recorded case counts…');
        if (mapLayers) {map.closePopup(); map.stop(); mapLayers.remove(); mapLayers = null;}
        try {
            await getData();
            if (requestID.signal.aborted) return;
            const params = new URLSearchParams({period:$('map-year').value + '-' + $('map-month').value, disease:$('map-disease').value, barangay:$('map-barangay').value});
            const result = await request('/heatmap?' + params, {signal});
            if (requestID.signal.aborted) return;
            const known = result.rows.filter(row => row.cases != null);
            const label = result.source + ' · ' + result.period + ' · ' + (known.length ? fmt(known.reduce((sum,row)=>sum+row.cases,0)) + ' recorded cases' : 'No confirmed counts');
            status('map-status',label);
            try {
                await drawMap(result, signal);
            } catch (error) {
                if (requestID.signal.aborted) return;
                $('map').hidden = true;
                status('map-status', label + ' · ' + error.message, true);
            }
        } catch (error) {
            if (!requestID.signal.aborted) status('map-status',error.message,true);
        }
    }

    function busy(button, output, work) {
        return async event => {
            event?.preventDefault();
            button.disabled = true;
            try { await work(); } catch (error) {status(output, error.message, true);}
            finally {button.disabled = false;}
        };
    }
    function invalidatePreview() {
        preview = null;
        $('save').disabled = true;
        $('upload-sample').hidden = true;
        status('upload-status','');
    }
    $('upload-file').addEventListener('change',invalidatePreview);
    $('upload-form').addEventListener('submit',busy($('preview'),'upload-status',async () => {
        invalidatePreview();
        const file = $('upload-file').files[0];
        if (!file || file.size > 256000) throw Error('Choose a CSV file up to 250 KB.');
        status('upload-status','Checking CSV…');
        const text = await file.text();
        const result = await request('/datasets/preview',{method:'POST',headers:{'Content-Type':'text/csv'},body:text});
        if ($('upload-file').files[0] !== file) return;
        upload = text;
        preview = result;
        const sampleTable = table(['Month','Barangay','Disease','Cases'], result.sample.map(r=>[r.Date,r.Barangay,r.Disease,fmt(r.Cases)]));
        const sampleNote = result.sample.length < result.rows ?
            'Showing the first ' + fmt(result.sample.length) + ' rows. The whole file was checked.' :
            'Showing all ' + fmt(result.rows) + ' rows.';
        const note = node('p', sampleNote);
        note.className = 'aa-status aa-training-note';
        $('upload-sample').replaceChildren(note, sampleTable);
        $('upload-sample').hidden = false;
        $('save').disabled = false;
        status('upload-status', 'Valid CSV · ' + fmt(result.rows) + ' rows · ' + fmt(result.cases) + ' cases. ' + [coverageLine(result),
            result.trainingRange ? 'Eligible for a SARIMA preview.' : 'Training needs 45 complete months in a row.'
        ].filter(Boolean).join(' · '));
    }));
    $('save').addEventListener('click',async () => {
        if (!preview) return;
        const id = preview.id;
        const text = upload;
        const decision = await Swal.fire({icon:'question',title:'Save this dataset version?',text:'This keeps the existing datasets and published predictions.',showCancelButton:true,focusCancel:true,confirmButtonText:'Save version'});
        if (!decision.isConfirmed || preview?.id !== id) return;
        $('save').disabled = true;
        try {
            const saved = await request('/datasets/save?preview=' + id,{method:'POST',headers:{'Content-Type':'text/csv'},body:text});
            if (preview?.id === id) invalidatePreview();
            status('upload-status',saved.label + ' is saved.');
            await getData(true);
        } catch (error) {
            $('save').disabled = !preview;
            status('upload-status',error.message,true);
        }
    });
    for (const [id, path, name] of [['export','/historical.csv','health-intel-historical-cases.csv'],['template','/template.csv','health-intel-dataset-template.csv']]) {
        $(id).addEventListener('click',busy($(id),'coverage',async () => {
            await window.HealthIntel.download(endpoint() + path, {}, name);
        }));
    }

    const probabilityPercent = new Intl.NumberFormat('en-PH', {style:'percent', maximumFractionDigits:2});
    function showProbability(probability, source) {
        $('cmp').hidden = false;
        const available = probability?.status === 'available';
        $('cmp-metrics').hidden = !available;
        if (!available) {
            status('cmp-status', source === 'demo' ? 'Saved COM-Poisson probabilities are unavailable for this selection.' : 'No verified COM-Poisson probabilities were published for this selection.');
            return;
        }
        const metrics = [
            ['Exactly ' + probability.count + (probability.count === 1 ? ' case' : ' cases'), probabilityPercent.format(probability.exact)],
            ['Within one case of ' + probability.count, probabilityPercent.format(probability.nearby)],
            ['At least one case', probabilityPercent.format(probability.positive)]
        ];
        $('cmp-metrics').replaceChildren(...metrics.map(([label, value]) => {
            const item = node('div');
            item.append(node('dt', label), node('dd', value));
            return item;
        }));
        const interval = probability.range95.join('–');
        status('cmp-status', '95% model interval: ' + interval + ' cases. ' + (source === 'demo' ? 'Experimental probabilities from the synthetic demonstration.' : 'Experimental probabilities based on MHO-reviewed reports.'));
    }
    $('published-form').addEventListener('submit',busy($('published-view'),'published-result',async () => {
        $('cmp').hidden = true;
        status('published-result','Loading the prediction…');
        const query = new URLSearchParams({disease:$('published-disease').value,barangay:$('published-barangay').value});
        const source = $('published-source').value;
        const result = await request('/predictions/' + source + '?' + query);
        const estimated = result.view.production['1'].prediction;
        const label = source === 'demo' ? 'Synthetic demonstration' : 'Operational prediction';
        status('published-result', label + ' · ' + readableMonth(result.context.main_target, 'long') + ' · ' + result.view.label + ' · ' + (estimated == null ? 'Prediction unavailable' : fmt(estimated) + ' estimated cases (SARIMA)') +
            (source === 'published' && !result.current_data_matches ? ' · Source reports have changed since publication' : ''));
        showProbability(result.experimental_probability, source);
    }));
    ['map-month','map-disease','map-barangay'].forEach(id => $(id).addEventListener('change',loadMap));
    $('map-year').addEventListener('change',() => {updateMapMonths(); loadMap();});
    const workspace = document.getElementById('view-admin-analytics');
    const tabs = [...$('tabs').querySelectorAll('[role="tab"]')];
    function selectAnalyticsTab(next) {
        if (next.getAttribute('aria-selected') === 'true') return;
        for (const tab of tabs) {
            const selected = tab === next;
            tab.classList.toggle('active', selected);
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
            document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
        }
        window.HealthIntelMonthlyUpdates?.setActive(next === $('tab-training') && workspace.classList.contains('active'));
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectAnalyticsTab(tab));
        tab.addEventListener('keydown', event => {
            const destinations = {ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1};
            if (!Object.hasOwn(destinations, event.key)) return;
            event.preventDefault();
            const next = tabs[destinations[event.key]];
            selectAnalyticsTab(next);
            next.focus();
        });
    });
    document.addEventListener('DOMContentLoaded', () => {
        if (location.hash !== '#view-admin-training') return;
        selectAnalyticsTab($('tab-training'));
        history.replaceState(history.state, '', '#view-admin-analytics');
    });
    window.HealthIntelAdminAnalytics = {
        openTab(name, period) {
            const tab = $('tab-' + name);
            selectAnalyticsTab(tab);
            const panel = document.getElementById(tab.getAttribute('aria-controls'));
            if (name === 'training') window.HealthIntelMonthlyUpdates?.openReports(period);
            panel.focus();
        },
        activate(view) {
            const analytics = view === 'view-admin-analytics';
            window.HealthIntelMonthlyUpdates?.setActive(analytics && $('tab-training').getAttribute('aria-selected') === 'true');
            if (!analytics && view !== 'view-admin-heatmap') return;
            workspace.closest('.admin-page-scroll')?.scrollTo(0, 0);
            if (view === 'view-admin-heatmap') {
                void loadMap();
                return;
            }
            if (!metadata) status('coverage','Loading historical coverage…');
            void getData().catch(error => {
                status('coverage',error.message,true);
                if (!metadata) status('versions-status','Saved uploads could not be loaded.',true);
            });
        }
    };
})();
