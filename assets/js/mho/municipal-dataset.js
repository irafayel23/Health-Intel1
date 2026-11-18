/* Project the preserved monthly CSV into the existing Municipal Analytics charts. */
(function(root) {
    'use strict';
    function create(fetcher) {
        const cache = new Map();
        function read(filters, year = filters.year || 'all', disease = 'all') {
            const query = new URLSearchParams({year: String(year), barangay: filters.barangay || 'all', disease});
            const url = '/api/mho/dataset-analytics?' + query;
            const previous = cache.get(url);
            if (previous && Date.now() - previous.time < 60000) return previous.promise;
            const entry = {time: Date.now()};
            entry.promise = (async () => {
                const response = await fetcher(url);
                const data = await response.json();
                if (!response.ok || !data.success || data.dataset_version !== 'seasonal6200-20261102' || !Number.isSafeInteger(data.total)) throw Error('Dataset counts unavailable');
                return data;
            })().catch(error => { if (cache.get(url) === entry) cache.delete(url); throw error; });
            cache.set(url, entry);
            return entry.promise;
        }
        return async function(path, filters = {}) {
            if (filters.age && filters.age !== 'all' || filters.category && filters.category !== 'morbidity') throw Error('This monthly dataset has no age or outcome records');
            const d = await read(filters, path === 'analytics-options' || path === 'year-comparison' ? 'all' : filters.year || 'all', path === 'trend' ? filters.disease || 'all' : 'all');
            const ranked = d.diseases.map(row => ({disease:row.label, cases:row.cases})).sort((a,b) => b.cases-a.cases || a.disease.localeCompare(b.disease));
            switch(path) {
                case 'analytics-options': return {success:true, years:d.options.years.map(Number), barangays:d.options.barangays, diseases:d.options.diseases};
                case 'kpi': return {success:true,total:d.total,active:null,recovered:null,risk:null,months:d.coverage.months,diseases:d.diseases.filter(r=>r.cases>0).length,barangays:d.barangays.filter(r=>r.cases>0).length};
                case 'stats': return {success:true,data:ranked,summary:{total_cases:d.total,unknown_age_cases:0,leading_categories:ranked.filter(r=>r.cases===ranked[0]?.cases).length,first_recorded:d.coverage.first_month,last_recorded:d.coverage.last_month}};
                case 'breakdown': return {success:true,total_cases:d.total,unknown_age_cases:d.total,ages:[],barangays:d.barangays,months:d.months};
                case 'disease-distribution': return {success:true,data:ranked.map(r=>({disease:r.disease,count:r.cases}))};
                case 'trend': return {success:true,granularity:filters.year==='all'?'annual':'monthly',current_year:null,data:(filters.year==='all'?d.years:d.months).map(r=>({period:Number(filters.year==='all'?r.label:r.label.slice(5)),cases:r.cases}))};
                case 'year-comparison': {
                    const years = filters.years && filters.years !== 'all' ? filters.years.split(',') : d.options.years;
                    if (years.some(y=>!d.options.years.includes(String(y)))) throw Error('Choose a dataset year');
                    const annual = await Promise.all(years.map(y=>read(filters,y)));
                    const diseases = ranked.slice(0,4).map(r=>r.disease);
                    return {success:true,years:years.map(Number),diseases,period:'calendar',through:'2026-09-30',current_year:null,data:annual.flatMap((a,i)=>a.diseases.filter(r=>diseases.includes(r.label)).map(r=>({year:Number(years[i]),disease:r.label,cases:r.cases})))};
                }
                default: throw Error('Unsupported descriptive chart');
            }
        };
    }
    if (typeof module !== 'undefined' && module.exports) module.exports={create};
    else root.MunicipalDataset={create};
})(typeof window !== 'undefined' ? window : globalThis);
