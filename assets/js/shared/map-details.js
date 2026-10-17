// Aggregate-only presentation shared by BHW and MHO. Never infer a disease or an outbreak.
(() => {
    const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const severities = [['mild','Mild'],['monitored','Monitored'],['high_risk','High Risk']];

    function render(barangay, refreshedAt, titleId) {
        const counts = Object.fromEntries([...severities,['unknown','Unknown']].map(([key]) => [key,count(barangay.severity_counts?.[key])]));
        const total = count(barangay.cases), groups = barangay.diseases_by_severity || {high_risk:barangay.high_risk_diseases || []};
        const columns = counts.unknown ? [...severities,['unknown','Unknown']] : severities;
        const rows = new Map();
        for (const [key] of columns) for (const item of groups[key] || []) {
            const disease = String(item.disease ?? '').trim() || 'Not recorded';
            if (!rows.has(disease)) rows.set(disease,{disease,mild:0,monitored:0,high_risk:0,unknown:0,total:0});
            const row = rows.get(disease), cases = count(item.cases);row[key] += cases;row.total += cases;
        }
        const sorted = [...rows.values()].sort((a,b) => b.total-a.total || a.disease.localeCompare(b.disease));
        // Older API responses omit disease detail for unknown severities. Keep those counts explicit.
        const missing = {disease:'Breakdown unavailable',total:0};
        for (const [key] of columns) {missing[key] = Math.max(0,counts[key]-sorted.reduce((sum,row) => sum+row[key],0));missing.total += missing[key];}
        if (missing.total) sorted.push(missing);
        const tone = counts.high_risk ? 'high' : counts.monitored ? 'monitored' : counts.unknown ? 'incomplete' : total ? 'mild' : 'none';
        const color = {high:'red',monitored:'orange',incomplete:'purple',mild:'green',none:'gray'}[tone];
        const metric = ([key,label]) => `<div class="heatmap-metric heatmap-metric-${key}"><dt><span class="heatmap-details-dot" aria-hidden="true"></span>${label}</dt><dd>${counts[key]}</dd></div>`;
        let x=0;
        const segments = [...severities,['unknown','Unknown']].map(([key]) => {const start=x;x+=counts[key];return counts[key]?`<rect class="heatmap-segment-${key}" x="${start}" y="0" width="${counts[key]}" height="8"></rect>`:'';}).join('');
        const breakdown = sorted.length ? `<div class="heatmap-table-scroll" role="region" tabindex="0" aria-label="Disease breakdown table"><table class="heatmap-disease-table"><caption>Active cases by recorded severity</caption><thead><tr><th scope="col">Disease</th>${columns.map(([,label])=>`<th scope="col">${label}</th>`).join('')}<th scope="col">Total</th></tr></thead><tbody>${sorted.map(row=>`<tr${row===missing?' class="heatmap-breakdown-missing"':''}><th scope="row">${escape(row.disease)}</th>${columns.map(([key])=>`<td>${row[key]}</td>`).join('')}<td><strong>${row.total}</strong></td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Total</th>${columns.map(([key])=>`<td>${counts[key]}</td>`).join('')}<td>${total}</td></tr></tfoot></table></div>` : '<p class="heatmap-details-empty">No active disease cases recorded.</p>';
        return `<header class="heatmap-info-header"><div><p class="heatmap-details-eyebrow">Barangay summary</p><h3 id="${escape(titleId)}">${escape(barangay.name)}</h3></div><button type="button" class="heatmap-info-close" aria-label="Close barangay details">&times;</button></header>
            <div class="heatmap-info-body" role="region" tabindex="0" aria-label="Barangay case summary">
                <div class="heatmap-details-total"><strong>${total}</strong><span>Active ${total===1?'case':'cases'}</span></div>
                <dl class="heatmap-metrics">${severities.map(metric).join('')}</dl>
                ${counts.unknown?`<p class="heatmap-details-notice">${counts.unknown} ${counts.unknown===1?'case has':'cases have'} unknown severity. Included in the active total.</p>`:''}
                ${x?`<svg class="heatmap-composition" viewBox="0 0 ${x} 8" preserveAspectRatio="none" aria-hidden="true">${segments}</svg>`:''}
                <section class="heatmap-breakdown"><h4>Disease breakdown</h4>${breakdown}${missing.total?`<p class="heatmap-details-note">Disease details are unavailable for ${missing.total} ${missing.total===1?'case':'cases'} in this map summary. Counts remain included above.</p>`:''}</section>
                ${count(barangay.pending_classification)?`<p class="heatmap-details-notice">${count(barangay.pending_classification)} active ${count(barangay.pending_classification)===1?'case needs':'cases need'} disease classification review. Included in the totals above.</p>`:''}
                <aside class="heatmap-color-reason heatmap-color-${tone}"><strong>Why ${color}?</strong><p>${escape(barangay.color_reason)}</p></aside>
                <p class="heatmap-details-note">Colors summarize recorded case severity, not disease ratings or outbreak risk.</p>
                <footer class="heatmap-details-footer"><p>Updated ${escape(refreshedAt)} <span>(Philippine time)</span></p><p>Barangay totals only · Circles are not outbreak boundaries.</p></footer>
            </div>`;
    }
    window.HealthIntelMapDetails={render};
})();
