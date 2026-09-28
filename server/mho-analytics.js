// Shared filters keep the MHO charts, totals and descriptions on the same records.
const ageRanges = { '0-5': [0, 5], '6-12': [6, 12], '13-17': [13, 17], '18-59': [18, 59], '60+': [60, 130] };

function analyticsFilters(query) {
    const year = query.year === undefined ? 'all' : query.year;
    const age = query.age === undefined ? 'all' : query.age;
    const barangay = query.barangay === undefined ? 'all' : query.barangay;
    const category = query.category === undefined ? 'morbidity' : query.category;
    if (typeof year !== 'string' || (year !== 'all' && (!/^\d{4}$/.test(year) || Number(year) < 1900)) ||
        typeof age !== 'string' || (age !== 'all' && !Object.hasOwn(ageRanges, age)) ||
        typeof barangay !== 'string' || !barangay.trim() || barangay.length > 255 ||
        !['morbidity', 'mortality'].includes(category)) {
        const error = new Error('Select a valid year, barangay, age group and category.');
        error.status = 400;
        throw error;
    }
    return { year, age, barangay, category };
}

function caseWhere(filters, { includeYear = true, deathsOnly = false } = {}) {
    const clauses = ["disease NOT LIKE '%bite%'", "disease NOT LIKE '%accident%'"];
    const params = [];
    if (includeYear && filters.year !== 'all') {
        clauses.push('YEAR(date_recorded) = ?'); params.push(Number(filters.year));
    }
    if (filters.barangay !== 'all') {
        clauses.push('barangay_id = (SELECT id FROM barangays WHERE name = ? LIMIT 1)'); params.push(filters.barangay);
    }
    if (filters.age !== 'all') {
        clauses.push('age BETWEEN ? AND ?'); params.push(...ageRanges[filters.age]);
    }
    if (deathsOnly) clauses.push("status = 'Deceased'");
    return { sql: clauses.join(' AND '), params };
}

function sendAnalyticsError(res, error) {
    res.status(error.status || 500).json({ success: false, error: error.status ? error.message : 'Unable to load the selected analytics.' });
}

module.exports = { analyticsFilters, caseWhere, sendAnalyticsError };
