// Aggregate-only presentation shared by BHW and MHO. Never infer a disease or an outbreak.
(() => {
    const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const severities = [['mild','Mild'],['monitored','Monitored'],['high_risk','High Risk']];

    function composition(barangay) {
        const total=count(barangay.cases);
        const counts=Object.fromEntries(severities.map(([key])=>[key,count(barangay.severity_counts?.[key])]));
        const known=Object.values(counts).reduce((sum,n)=>sum+n,0);
        // A missing or inconsistent breakdown must not imply that unclassified cases are Mild.
        if(known>total) for(const [key] of severities) counts[key]=0;
        counts.unknown=total-Object.values(counts).reduce((sum,n)=>sum+n,0);
        const segments=[...severities,['unknown','Unknown']].filter(([key])=>counts[key]>0).map(([key,label])=>({key,label,cases:counts[key],percent:total?counts[key]/total*100:0}));
        return {total,counts,segments};
    }

    function classification(barangay) {
        const activity=barangay.activity;
        if(activity?.status==='assessed'&&activity.provisional===true&&['none','mild','monitored','high_risk'].includes(activity.tone))
            return {tone:activity.tone,label:{none:'No recorded cases',mild:'Mild',monitored:'Monitored',high_risk:'High Risk'}[activity.tone]};
        return {tone:'none',label:'Not assessed'};
    }

    function activityMarkup(barangay) {
        const activity=barangay.activity, state=classification(barangay);
        const period=activity?.period?.current;
        const line=(label,value)=>`<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`;
        const dates=period?`${period.start} to ${period.through} (Philippine dates)`:'Unavailable';
        const details=activity?.details||[];
        return `<section class="heatmap-surveillance" aria-label="Barangay case volume">
            <h4>Barangay case-activity classification</h4><p class="heatmap-assessment-label"><span class="heatmap-assessment-dot heatmap-assessment-${state.tone}" aria-hidden="true"></span>${state.label}</p>
            <p class="heatmap-details-note">Locally configured case-volume bands · not official outbreak-risk thresholds.</p>
            <dl>${line('Assessment scope',activity?.scope||'Unavailable')}${line('Current month through today',dates)}${line('New recorded cases',activity?.observed_cases??'Unavailable')}
            ${line('Mild (green)','1-10 cases')}${line('Monitored (orange)','11-20 cases')}${line('High Risk (red)','21 or more cases')}${line('Zero cases','Neutral gray')}</dl>
            <p class="heatmap-details-note"><strong>Why this color:</strong> ${escape(activity?.reason||'Case-activity data is unavailable. Refresh the map to retry.')}</p>
            <details class="heatmap-activity-method"><summary>Calculation and tracked disease bands</summary>
            <p class="heatmap-details-note">The circle uses the same month-to-date total shown at its center: 0 = neutral gray, 1-10 = Mild (green), 11-20 = Monitored (orange), and 21 or more = High Risk (red). The overall total includes eligible cases awaiting disease review and cases outside the ten tracked categories. Each disease row below uses the same ranges for its own count. Previous months and individual patient severity do not change these bands.</p>
            ${details.length?`<div class="heatmap-table-scroll" role="region" tabindex="0" aria-label="Statistical disease activity"><table class="heatmap-disease-table"><thead><tr><th>Disease</th><th>This month</th><th>Band</th></tr></thead><tbody>${details.map(row=>`<tr><td>${escape(row.disease)}</td><td>${count(row.current)}</td><td>${escape(row.label)}</td></tr>`).join('')}</tbody></table></div>`:''}
            <p class="heatmap-details-note">Local case records only; the generated forecasting dataset is not used. Valid archived and cleared cases remain in their original recording period. Excluded test and duplicate records are left out. Pending classifications do not contribute to a disease-specific band. Follow-up visits do not add cases. Dates use the recorded case date, not symptom onset.</p>
            <p class="heatmap-details-note">A day with no record contributes zero recorded cases, not proof of complete reporting or absence of illness. The ranges are locally chosen display bands; they do not adjust for disease, seasonality or population. Individual High Risk severity never sets the map color. MHO must investigate signals.</p>
            ${activity?.pending_cases||activity?.other_cases?`<p class="heatmap-details-notice">${count(activity.pending_cases)} current cases await classification; ${count(activity.other_cases)} are outside these ten categories. MHO staff review pending classifications in Disease Review.</p>`:''}
            </details>
        </section>`;
    }

    function marker(barangay) {
        const state=classification(barangay);
        const total=Number.isSafeInteger(barangay.activity?.observed_cases)?count(barangay.activity.observed_cases):count(barangay.cases);
        const caption=barangay.activity?.period?'this month':'active';
        return `<svg class="heatmap-donut" viewBox="0 0 88 88" aria-hidden="true"><circle class="heatmap-donut-surface" cx="44" cy="44" r="41"></circle><g class="heatmap-donut-rings"><circle class="heatmap-ring-${state.tone}" cx="44" cy="44" r="35"></circle></g><text class="heatmap-donut-total" x="44" y="44">${total}</text><text class="heatmap-donut-caption" x="44" y="59">${caption}</text></svg>`;
    }

    function summary(barangay) {
        const {total,counts}=composition(barangay);
        return `${barangay.name}: locally configured barangay case volume ${classification(barangay).label}. ${count(barangay.activity?.observed_cases)} new recorded cases this month. ${total} active ${total===1?'case':'cases'}. ${counts.mild} Mild, ${counts.monitored} Monitored, ${counts.high_risk} High Risk${counts.unknown?`, ${counts.unknown} unknown severity`:''}.`;
    }

    function render(barangay, refreshedAt, titleId) {
        const {counts} = composition(barangay);
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
        const metric = ([key,label]) => `<div class="heatmap-metric heatmap-metric-${key}"><dt><span class="heatmap-details-dot" aria-hidden="true"></span>${label}</dt><dd>${counts[key]}</dd></div>`;
        let x=0;
        const segments = [...severities,['unknown','Unknown']].map(([key]) => {const start=x;x+=counts[key];return counts[key]?`<rect class="heatmap-segment-${key}" x="${start}" y="0" width="${counts[key]}" height="8"></rect>`:'';}).join('');
        const breakdown = sorted.length ? `<div class="heatmap-table-scroll" role="region" tabindex="0" aria-label="Disease breakdown table"><table class="heatmap-disease-table"><caption>Active cases by recorded severity</caption><thead><tr><th scope="col">Disease</th>${columns.map(([,label])=>`<th scope="col">${label}</th>`).join('')}<th scope="col">Total</th></tr></thead><tbody>${sorted.map(row=>`<tr${row===missing?' class="heatmap-breakdown-missing"':''}><th scope="row">${escape(row.disease)}</th>${columns.map(([key])=>`<td>${row[key]}</td>`).join('')}<td><strong>${row.total}</strong></td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Total</th>${columns.map(([key])=>`<td>${counts[key]}</td>`).join('')}<td>${total}</td></tr></tfoot></table></div>` : '<p class="heatmap-details-empty">No active disease cases recorded.</p>';
        return `<header class="heatmap-info-header"><div><p class="heatmap-details-eyebrow">Barangay summary</p><h3 id="${escape(titleId)}">${escape(barangay.name)}</h3></div><button type="button" class="heatmap-info-close" aria-label="Close barangay details">&times;</button></header>
            <div class="heatmap-info-body" role="region" tabindex="0" aria-label="Barangay case summary">
                <h4 class="heatmap-patient-heading">Individual patient severity</h4>
                <div class="heatmap-details-total"><strong>${total}</strong><span>Currently active ${total===1?'case':'cases'}<br>All recording dates</span></div>
                <dl class="heatmap-metrics">${severities.map(metric).join('')}</dl>
                ${counts.unknown?`<p class="heatmap-details-notice">${counts.unknown} ${counts.unknown===1?'case has':'cases have'} unknown severity. Included in the active total.</p>`:''}
                ${x?`<svg class="heatmap-composition" viewBox="0 0 ${x} 8" preserveAspectRatio="none" aria-hidden="true">${segments}</svg>`:''}
                <section class="heatmap-breakdown"><h4>Disease breakdown</h4>${breakdown}${missing.total?`<p class="heatmap-details-note">Disease details are unavailable for ${missing.total} ${missing.total===1?'case':'cases'} in this map summary. Counts remain included above.</p>`:''}</section>
                ${count(barangay.pending_classification)?`<p class="heatmap-details-notice">${count(barangay.pending_classification)} active ${count(barangay.pending_classification)===1?'case needs':'cases need'} disease classification review. Included in the totals above.</p>`:''}
                ${activityMarkup(barangay)}
                <p class="heatmap-details-note">Circle color shows locally configured case volume; its center counts new recorded cases in the current calendar month through today. Individual patient severity and current active totals are separate. This does not confirm an outbreak.</p>
                <footer class="heatmap-details-footer"><p>Updated ${escape(refreshedAt)} <span>(Philippine time)</span></p><p>Barangay totals only · Circles are not outbreak boundaries.</p></footer>
            </div>`;
    }
    window.HealthIntelMapDetails={render,marker,composition,summary,classification};
})();
