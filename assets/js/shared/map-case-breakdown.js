// Read-only distribution of the exact aggregate response used by the map.
(() => {
    const severityKeys = ['mild', 'monitored', 'high_risk', 'unknown'];
    const count = value => value !== null && !(typeof value === 'string' && !value.trim()) && typeof value !== 'boolean' &&
        Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
    const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const number = value => value.toLocaleString('en-PH');
    const emptySeverity = () => ({mild:0,monitored:0,high_risk:0,unknown:0});
    const severityLabels = {mild:'Mild',monitored:'Monitored',high_risk:'High Risk',unknown:'Unknown'};

    function prepare(rows) {
        const diseases = new Map();
        const severityTotals = emptySeverity(), missingSeverity = emptySeverity();
        let total = 0, missing = 0, omitted = 0;
        for (const row of Array.isArray(rows) ? rows : []) {
            const cases = count(row?.cases);
            if (cases === null) { omitted++; continue; }
            total += cases;
            const recorded = emptySeverity();
            for (const key of ['mild','monitored','high_risk']) recorded[key] = count(row.severity_counts?.[key]) ?? 0;
            const known = recorded.mild + recorded.monitored + recorded.high_risk;
            if (known > cases) for (const key of severityKeys) recorded[key] = 0;
            recorded.unknown = cases - recorded.mild - recorded.monitored - recorded.high_risk;
            for (const key of severityKeys) severityTotals[key] += recorded[key];
            const entries = [];
            const detailedSeverity = emptySeverity();
            let detailed = 0, invalid = false;
            for (const key of severityKeys) {
                const group = row.diseases_by_severity?.[key] ?? [];
                if (!Array.isArray(group)) { invalid = true; break; }
                let subtotal = 0;
                for (const item of group) {
                    const n = count(item?.cases);
                    if (n === null) { invalid = true; break; }
                    const name = String(item.disease ?? '').trim() || 'Disease not recorded';
                    subtotal += n;
                    entries.push([name, n, key]);
                }
                if (subtotal > recorded[key]) invalid = true;
                detailedSeverity[key] = subtotal;
                detailed += subtotal;
            }
            // Never scale down or silently inflate an inconsistent response.
            if (invalid || detailed > cases) {
                missing += cases;
                for (const key of severityKeys) missingSeverity[key] += recorded[key];
                continue;
            }
            for (const [name, n, key] of entries) if (n) {
                if (!diseases.has(name)) diseases.set(name,{name,cases:0,severities:emptySeverity(),unavailable:false});
                const item=diseases.get(name);item.cases+=n;item.severities[key]+=n;
            }
            missing += cases - detailed;
            for (const key of severityKeys) missingSeverity[key] += recorded[key] - detailedSeverity[key];
        }
        const items = [...diseases.values()];
        if (missing) items.push({name:'Disease detail unavailable', cases:missing, severities:missingSeverity, unavailable:true});
        items.sort((a,b) => b.cases-a.cases || a.name.localeCompare(b.name));
        items.forEach(item => {item.percent = total ? item.cases / total * 100 : 0;});
        const segments = items.slice(0,6).map((item,index) => ({...item, color:index}));
        if (items.length > 6) {
            const cases = items.slice(6).reduce((sum,item) => sum + item.cases,0);
            segments.push({name:'Other diseases / categories', cases, percent:cases/total*100, color:6});
        }
        return {total, missing, omitted, severityTotals, barangays:(Array.isArray(rows)?rows.length:0)-omitted, items, segments};
    }

    function render(data, refreshedAt, stale) {
        let offset = 0;
        const rings = data.segments.map(item => {
            const start=offset; offset+=item.percent;
            return `<circle class="map-distribution-color-${item.color}" cx="120" cy="120" r="91" pathLength="100" stroke-dasharray="${item.percent} ${100-item.percent}" stroke-dashoffset="${-start}"></circle>`;
        }).join('');
        const legend = data.segments.map(item => `<li><span class="map-distribution-swatch map-distribution-color-${item.color}" aria-hidden="true"></span><span>${escape(item.name)}</span><strong>${item.percent.toFixed(1)}%</strong></li>`).join('');
        const badges = item => severityKeys.filter(key=>key!=='unknown'||item.severities[key]).map(key=>`<span class="map-severity-badge map-severity-${key}">${severityLabels[key]} <b>${number(item.severities[key])}</b></span>`).join('');
        const rows = data.items.map((item,index) => `<tr><th scope="row"><span class="map-distribution-rank">${index+1}</span>${escape(item.name)}<div class="map-disease-severities" aria-label="Recorded severity counts">${badges(item)}</div></th><td>${number(item.cases)}</td><td>${item.percent.toFixed(1)}%</td></tr>`).join('');
        const summary = severityKeys.filter(key=>key!=='unknown'||data.severityTotals[key]).map(key=>`<div class="map-severity-summary-item map-severity-${key}"><dt>${severityLabels[key]}</dt><dd>${number(data.severityTotals[key])}</dd></div>`).join('');
        return `<p class="map-distribution-scope">${data.barangays} ${data.barangays===1?'barangay':'barangays'} in the current map · Active, non-archived cases</p>
            ${stale?'<p class="map-distribution-warning" role="status">Refresh failed. These are the last successfully loaded totals.</p>':''}
            ${data.omitted?`<p class="map-distribution-warning">${data.omitted} barangay ${data.omitted===1?'total is':'totals are'} unavailable and excluded. This is a partial breakdown.</p>`:''}
            ${data.total?`<dl class="map-severity-summary" aria-label="Overall recorded severity">${summary}</dl>`:''}
            ${data.total?`<div class="map-distribution-grid"><div class="map-distribution-chart"><svg viewBox="0 0 240 240" role="img" aria-label="${number(data.total)} active cases. Disease counts and shares are in the adjacent table."><circle class="map-distribution-track" cx="120" cy="120" r="91"></circle><g class="map-distribution-rings">${rings}</g><text class="map-distribution-total" x="120" y="116">${number(data.total)}</text><text class="map-distribution-caption" x="120" y="142">active cases</text></svg><ul class="map-distribution-key" aria-label="Chart categories">${legend}</ul></div>
            <div class="map-distribution-table-wrap" tabindex="0" role="region" aria-label="Disease counts and percentages"><table class="map-distribution-table"><caption>Disease and recorded severity</caption><thead><tr><th scope="col">Disease / condition</th><th scope="col">Cases</th><th scope="col">Share</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th scope="row">Total</th><td>${number(data.total)}</td><td>100%</td></tr></tfoot></table></div></div>`:
            `<div class="map-distribution-empty"><strong>${data.omitted?'No usable totals available':'No active cases recorded'}</strong><p>${data.omitted?'Refresh the map to try again.':'The breakdown will appear when active case records are available.'}</p></div>`}
            ${data.missing?`<p class="map-distribution-warning">Disease detail is unavailable or inconsistent for ${number(data.missing)} cases. They remain included in the total; no disease category is inferred.</p>`:''}
            <footer class="map-distribution-footer"><p>Severity describes individual recorded cases. One disease can include several severity levels; unknown severity is never treated as Mild.</p><p>Share = disease cases ÷ total active cases × 100. Displayed shares are rounded; all counts are retained.</p><p>Recorded cases only — not predictions or outbreak-risk ratings.${refreshedAt?' Updated '+escape(refreshedAt)+' (Philippine time).':''}</p></footer>`;
    }

    function bind(container, {onOpen=()=>{}}={}) {
        let rows=[], refreshedAt='', stale=false;
        const button=document.createElement('button');
        button.type='button'; button.className='heatmap-breakdown-control'; button.textContent='Case Breakdown'; button.disabled=true;
        const dialog=document.createElement('dialog'); dialog.className='heatmap-case-dialog'; dialog.id=container.id+'-case-breakdown';
        dialog.setAttribute('aria-labelledby',dialog.id+'-title');
        button.setAttribute('aria-haspopup','dialog'); button.setAttribute('aria-controls',dialog.id); button.setAttribute('aria-expanded','false');
        dialog.innerHTML=`<header class="map-distribution-header"><div><p>MAP INSIGHTS</p><h2 id="${dialog.id}-title">Case Breakdown</h2></div><button type="button" class="map-distribution-close" aria-label="Close case breakdown">×</button></header><div class="map-distribution-body"></div>`;
        container.append(button,dialog);
        L.DomEvent.disableClickPropagation(button); L.DomEvent.disableScrollPropagation(dialog); L.DomEvent.disableClickPropagation(dialog);
        const body=dialog.querySelector('.map-distribution-body'),close=dialog.querySelector('.map-distribution-close');
        const draw=()=>{body.innerHTML=render(prepare(rows),refreshedAt,stale);};
        button.addEventListener('click',()=>{onOpen();draw();dialog.showModal();button.setAttribute('aria-expanded','true');close.focus();});
        close.addEventListener('click',()=>dialog.close());
        dialog.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');button.focus({preventScroll:true});});
        dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
        return {
            update(data, timestamp){
                rows=Array.isArray(data)?data:[];refreshedAt=timestamp;stale=false;button.disabled=false;
                if(dialog.open){
                    const scroll=body.scrollTop, table=body.querySelector('.map-distribution-table-wrap');
                    const focused=table===document.activeElement, left=table?.scrollLeft||0;
                    draw();body.scrollTop=scroll;
                    const replacement=body.querySelector('.map-distribution-table-wrap');
                    if(replacement){replacement.scrollLeft=left;if(focused)replacement.focus({preventScroll:true});}
                    else if(focused)close.focus({preventScroll:true});
                }
            },
            markStale(){stale=true;if(dialog.open)draw();}
        };
    }
    window.HealthIntelMapBreakdown={prepare,render,bind};
})();
