// Shared filters keep the MHO charts, totals and descriptions on the same records.
const {ranges:ageRanges,caseAgeSql}=require('./age-groups');
const {todayPeriod}=require('./report-periods');

function comparisonSelection(query, filters, now=new Date()) {
    const through=todayPeriod(now).start,currentYear=Number(through.slice(0,4));
    const period=query.period===undefined?'calendar':query.period;
    let years=query.years===undefined?(filters.year==='all'?null:[Number(filters.year)-1,Number(filters.year)]):null;
    if (!['calendar','same'].includes(period) ||
        (query.years!==undefined && (typeof query.years!=='string' ||
        (query.years!=='all' && !/^\d{4}(,\d{4}){1,29}$/.test(query.years))))) {
        const error=new Error('Choose at least two valid comparison years and a comparison period.');error.status=400;throw error;
    }
    if(query.years!==undefined && query.years!=='all') {
        years=[...new Set(query.years.split(',').map(Number))].sort((a,b)=>a-b);
        if(years.length<2 || years.some(year=>year<1900 || year>currentYear)) {
            const error=new Error('Choose at least two different years through the current year.');error.status=400;throw error;
        }
    }
    return {years,period,through,currentYear};
}

function analyticsFilters(query) {
    const year = query.year === undefined ? 'all' : query.year;
    const month = query.month ?? 'all';
    const age = query.age === undefined ? 'all' : query.age;
    const barangay = query.barangay === undefined ? 'all' : query.barangay;
    const category = query.category === undefined ? 'morbidity' : query.category;
    if (typeof year !== 'string' || (year !== 'all' && (!/^\d{4}$/.test(year) || Number(year) < 1900)) ||
        typeof month !== 'string' || (month !== 'all' && !/^(0[1-9]|1[0-2])$/.test(month)) ||
        typeof age !== 'string' || (age !== 'all' && !Object.hasOwn(ageRanges, age)) ||
        typeof barangay !== 'string' || !barangay.trim() || barangay.length > 255 ||
        category !== 'morbidity') {
        const error = new Error('Select a valid year, month, barangay, age group and category.');
        error.status = 400;
        throw error;
    }
    return { year, ...(month === 'all' ? {} : { month }), age, barangay, category };
}

function caseWhere(filters, { includeYear = true, allConditions = false } = {}) {
    const clauses = allConditions ? ['1=1'] : ["disease NOT LIKE '%bite%'", "disease NOT LIKE '%accident%'"];
    const params = [];
    if (includeYear && filters.year === 'all' && filters.month) {
        clauses.push('MONTH(date_recorded) = ?');
        params.push(Number(filters.month));
    }
    if (includeYear && filters.year !== 'all') {
        if (filters.month) {
            const start = filters.year + '-' + filters.month + '-01';
            const nextMonth = Number(filters.month) + 1;
            const end = nextMonth === 13
                ? (Number(filters.year) + 1) + '-01-01'
                : filters.year + '-' + String(nextMonth).padStart(2, '0') + '-01';
            clauses.push('date_recorded >= ? AND date_recorded < ?');
            params.push(start, end);
        } else {
            clauses.push('YEAR(date_recorded) = ?');
            params.push(Number(filters.year));
        }
    }
    if (filters.barangay !== 'all') {
        clauses.push('barangay_id = (SELECT id FROM barangays WHERE name = ? LIMIT 1)'); params.push(filters.barangay);
    }
    if (filters.age !== 'all') {
        clauses.push(caseAgeSql()+' BETWEEN ? AND ?'); params.push(...ageRanges[filters.age]);
    }
    return { sql: clauses.join(' AND '), params };
}

function sendAnalyticsError(res, error) {
    res.status(error.status || 500).json({ success: false, error: error.status ? error.message : 'Unable to load the selected analytics.' });
}

module.exports = { analyticsFilters, caseWhere, comparisonSelection, sendAnalyticsError };
