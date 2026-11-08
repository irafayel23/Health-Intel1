(function (root) {
    'use strict';
    const number = value => Number(value).toLocaleString('en-PH');
    const month = value => new Date(value + '-01T12:00:00').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

    function describeProfile(rows, filters, summary) {
        const scope = `${filters.barangay === 'all' ? 'the seven pilot barangays' : filters.barangay}, ${filters.year === 'all' ? 'all recorded years' : 'CY ' + filters.year}, ${filters.age === 'all' ? 'all recorded ages' : 'recorded ages ' + filters.age.replace('+', ' and above')}`;
        const deaths = filters.category === 'mortality';
        const unit = deaths ? 'records marked Deceased' : 'recorded disease cases';
        const total = Number(summary.total_cases || 0);
        if (!rows.length || !total) return {
            text: `No ${unit} match ${scope}. This means no matching records were found; it does not establish that there were no cases in the community.`
        };
        const topCount = Number(rows[0].cases);
        const leaders = rows.filter(row => Number(row.cases) === topCount).map(row => row.disease);
        const tied = Number(summary.leading_categories || leaders.length) > 1;
        const names = leaders.slice(0, 3).join(', ') + (Number(summary.leading_categories) > 3 ? ' and other categories' : '');
        const share = (topCount / total * 100).toFixed(1);
        let text = `For ${scope}, there are ${number(total)} ${unit}. ${names} ${tied ? 'share the highest recorded count' : 'has the highest recorded count'}: ${number(topCount)} ${deaths ? 'deaths' : 'cases'}${tied ? ' each' : ''} (${share}% of the filtered total${tied ? ' each' : ''}).`;
        if (filters.age === 'all' && Number(summary.unknown_age_cases)) text += ` ${number(summary.unknown_age_cases)} records have no usable age; these are excluded when a specific age group is selected.`;
        return { text };
    }

    // Describe the same filtered totals as the charts; never infer population risk.
    function descriptiveFindings(profile, breakdown) {
        const total=Number(breakdown.total_cases);
        if (!Number.isFinite(total) || total<=0) return [];
        const unknownAge=Number(breakdown.unknown_age_cases)||0;
        function finding(title, rows, key, format, kind) {
            const ranked=rows.filter(row=>Number.isFinite(Number(row.cases)) && Number(row.cases)>0)
                .slice().sort((a,b)=>Number(b.cases)-Number(a.cases));
            const count=Number(ranked[0]?.cases||0);
            const leaders=ranked.filter(row=>Number(row.cases)===count);
            const names=leaders.map(row=>format(row[key]));
            const tied=leaders.length>1, share=count?count/total*100:null;
            const each=tied?' each':'';
            const amount=`${number(count)} of ${number(total)} matching case ${total===1?'record':'records'} (${share?.toFixed(1)}%${each})`;
            let explanation;
            if (!count) {
                explanation=kind==='age'
                    ? 'No usable age group is recorded for this selection.'
                    : kind==='month'?'No usable case date is recorded for this selection.'
                    : 'No recorded category is available for this selection.';
            } else if (kind==='disease') {
                explanation=`${tied?'Each tied disease category accounts for':'This disease category accounts for'} ${amount}. This describes recorded cases, not community prevalence.`;
            } else if (kind==='barangay') {
                explanation=`${tied?'Each tied barangay accounts for':'This barangay accounts for'} ${amount}. Counts are not adjusted for barangay population.`;
            } else if (kind==='age') {
                explanation=`${tied?'Each tied age group accounts for':'This age group accounts for'} ${amount}.`;
            } else {
                explanation=`${tied?'Each tied month contains':'This month contains'} ${amount}. A recorded peak does not establish a recurring seasonal pattern.`;
            }
            if (kind==='age' && unknownAge) explanation+=` ${number(unknownAge)} records have no usable age; they remain in the percentage denominator.`;
            return {title:title+(tied?' · tied':''),name:names.length?names.slice(0,2).join(', ')+(names.length>2?' +'+(names.length-2)+' more':''):'Not recorded',
                names,count,share,tied,explanation};
        }
        return [
            finding('Leading recorded disease',profile.data,'disease',value=>value,'disease'),
            finding('Highest recorded barangay count',breakdown.barangays,'label',value=>value,'barangay'),
            finding('Largest recorded age group',breakdown.ages.filter(row=>row.label!=='Not recorded'),'label',value=>value==='60+'?'60+ years':value+' years','age'),
            finding('Peak recorded month',breakdown.months,'label',value=>new Intl.DateTimeFormat('en-PH',{month:'short',year:'numeric',timeZone:'Asia/Manila'}).format(new Date(value+'-01T12:00:00+08:00')),'month')
        ];
    }

    function forecastGuidance(data, disease, barangay) {
        const entries = data.forecast.map((value, index) => ({ value, date: data.dates[index] })).filter(entry => entry.value !== null);
        if (!entries.length || entries.some(entry => !Number.isFinite(entry.value) || entry.value < 0)) throw new Error('The forecast contains invalid values.');
        const peak = Math.max(...entries.map(entry => entry.value));
        const peakEntry = entries.find(entry => entry.value === peak);
        const recent = data.historical.filter(value => Number.isFinite(value)).slice(-3);
        const recentMean = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
        const futureMean = entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length;
        const latestMonth = data.dates[data.historical.length - 1];
        const recommendations = [
            `Review the ${disease} reports included through ${month(latestMonth)} for ${barangay}. Confirm which months are complete and check zero counts with the BHW.`,
            peak === 0
                ? 'The displayed estimates round to zero. Continue routine case reporting; a zero estimate does not prove that future cases will be absent.'
                : futureMean > recentMean
                    ? `The estimated monthly average is above the last three displayed months. Review recent case reports and existing readiness plans with the MHO.`
                    : 'Continue routine monitoring and compare each new monthly count with the displayed estimates.',
            'Use these unvalidated estimates as a discussion aid. Confirm current case reports before changing resources or issuing an outbreak alert.'
        ];
        return {
            entries, recommendations,
            summary: `${barangay}: the next ${entries.length} months show ${entries.map(entry => number(entry.value)).join(', ')} estimated ${disease} cases, from ${month(entries[0].date)} to ${month(entries.at(-1).date)}. ${peak === 0 ? 'All displayed estimates round to zero.' : `The highest estimate is ${number(peak)} in ${month(peakEntry.date)}.`}`
        };
    }
    root.MHOInsights = { describeProfile, descriptiveFindings, forecastGuidance };
})(window);
