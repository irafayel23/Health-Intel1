const {caseAgeSql,ageGroupSql,ranges}=require('./age-groups');
const { pagination, pageResult } = require('./list-pagination');
const { invalid } = require('./service-errors');

const KPI_CASES = {
    active: "status = 'Active' AND is_archived = FALSE",
    recovered: "status IN ('Cleared','Recovered')",
    highRisk: "status = 'Active' AND is_archived = FALSE AND severity = 'High Risk'"
};

function createDashboardData(db) {
    return {
        async analyticsBarangays() {
            const [rows]=await db.execute('SELECT name FROM barangays ORDER BY name');
            return rows.map(row=>row.name);
        },
        async bhwStats(barangay_id) {
            let baseFilter = `WHERE is_archived = FALSE`;
            let params = [];
            if (barangay_id && barangay_id !== 'null') {
                baseFilter += ` AND barangay_id = ?`;
                params.push(barangay_id);
            }

            const [[total]] = await db.execute(
                `SELECT COUNT(*) as count FROM health_cases ${baseFilter}`,
                params
            );
            const [[active]] = await db.execute(
                `SELECT COUNT(*) as count FROM health_cases ${baseFilter} AND status = 'Active'`,
                params
            );
            const [[cleared]] = await db.execute(
                `SELECT COUNT(*) as count FROM health_cases ${baseFilter} AND status = 'Cleared'`,
                params
            );
            const [[mild]] = await db.execute(
                `SELECT COUNT(*) as count FROM health_cases ${baseFilter} AND status = 'Active' AND severity = 'Mild'`,
                params
            );
            const [[monitored]] = await db.execute(
                `SELECT COUNT(*) as count FROM health_cases ${baseFilter} AND status = 'Active' AND severity = 'Monitored'`,
                params
            );
            const [[high_risk]] = await db.execute(
                `SELECT COUNT(*) as count FROM health_cases ${baseFilter} AND status = 'Active' AND severity = 'High Risk'`,
                params
            );
            return { total, active, cleared, mild, monitored, high_risk };
        },

        async legacyMhoStats() {
            const [[activeResult]] = await db.execute(
                `SELECT COUNT(*) as count FROM health_cases WHERE status = 'Active' AND is_archived = FALSE`
            );
            const [[recoveredResult]] = await db.execute(
                `SELECT COUNT(*) as count FROM health_cases WHERE status IN ('Recovered', 'Cleared') AND is_archived = FALSE`
            );
            const [[highRiskResult]] = await db.execute(
                `SELECT COUNT(*) as count FROM health_cases WHERE status = 'Active' AND disease IN ('Dengue', 'Pneumonia', 'Tuberculosis', 'Animal Bite', 'Animal Bite / Wound') AND is_archived = FALSE`
            );
            return { activeResult, recoveredResult, highRiskResult };
        },

        async demographics() {
            const [diseaseStats] = await db.execute(
                `SELECT disease, COUNT(*) as cases FROM health_cases WHERE status = 'Active' AND is_archived = FALSE GROUP BY disease ORDER BY cases DESC`
            );
            return diseaseStats;
        },

        async diseaseSummary(where) {
            const [rows] = await db.execute(
                `SELECT disease, COUNT(*) as cases FROM health_cases WHERE ${where.sql} GROUP BY disease ORDER BY cases DESC, disease ASC`,
                where.params
            );
            const [[summary]] = await db.execute(
                `SELECT COUNT(*) as total_cases, COALESCE(SUM(${caseAgeSql()} IS NULL OR ${caseAgeSql()} < 0 OR ${caseAgeSql()} > 130),0) as unknown_age_cases, DATE_FORMAT(MIN(date_recorded),'%Y-%m-%d') as first_recorded, DATE_FORMAT(MAX(date_recorded),'%Y-%m-%d') as last_recorded FROM health_cases WHERE ${where.sql}`,
                where.params
            );
            return { rows, summary };
        },

        async forecastSelections(barangay, disease) {
            const [places] = await db.execute('SELECT name FROM barangays WHERE name=?', [barangay]);
            const [categories] = await db.execute(
                'SELECT disease FROM health_cases WHERE disease=? LIMIT 1',
                [disease]
            );
            return { places, categories };
        },

        async kpi(where, recorded, firstLiveDate) {
            const [[counts]] = await db.execute(
                `SELECT COUNT(*) as total,
                        COALESCE(SUM(${KPI_CASES.active}),0) as active,
                        COALESCE(SUM(${KPI_CASES.recovered}),0) as recovered,
                        COALESCE(SUM(${KPI_CASES.highRisk}),0) as highRisk,
                        (SELECT COUNT(*) FROM health_cases WHERE date_recorded >= ? AND ${recorded.sql}) as recordedAfterDataset
                        FROM health_cases WHERE ${where.sql}`,
                [firstLiveDate, ...recorded.params, ...where.params]
            );
            return counts;
        },

        async kpiCases(where, query) {
            if (typeof query.kind !== 'string' || !Object.hasOwn(KPI_CASES, query.kind)) throw invalid('Choose a case list.');
            const paging = pagination(query, 10);
            const selection = `FROM health_cases WHERE (${where.sql}) AND (${KPI_CASES[query.kind]})`;
            const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total ${selection}`, where.params);
            const { offset, ...page } = pageResult(total, paging);
            const [data] = page.total ? await db.execute(`SELECT id AS case_id, resident_id, patient_name, purok,
                COALESCE((SELECT b.name FROM barangays b WHERE b.id = h.barangay_id), 'Not recorded') AS barangay,
                CASE WHEN disease_review_status IN ('Pending','Clarification')
                    THEN COALESCE(NULLIF(disease_reported,''),disease) ELSE disease END AS disease,
                severity, status
                FROM health_cases h WHERE (${where.sql}) AND (${KPI_CASES[query.kind]})
                ORDER BY date_recorded DESC, id DESC LIMIT ? OFFSET ?`, [...where.params, page.page_size, offset]) : [[]];
            return { data, ...page };
        },

        async yearComparison(where, previousYear, currentYear) {
            const [rows] = await db.execute(
                `SELECT disease,
                        SUM(YEAR(date_recorded) = ?) as previous_cases,
                        SUM(YEAR(date_recorded) = ?) as current_cases
                        FROM health_cases WHERE ${where.sql} AND YEAR(date_recorded) IN (?,?)
                        GROUP BY disease ORDER BY COUNT(*) DESC, disease ASC LIMIT 4`,
                [previousYear, currentYear, ...where.params, previousYear, currentYear]
            );
            return rows;
        },

        async analyticsOptions() {
            const [years] = await db.execute("SELECT DISTINCT YEAR(date_recorded) as year FROM health_cases WHERE date_recorded IS NOT NULL ORDER BY year DESC");
            const [barangays] = await db.execute('SELECT name FROM barangays ORDER BY name');
            const [diseases] = await db.execute("SELECT name AS disease FROM disease_registry WHERE status='Active' AND is_archived=0 ORDER BY name");
            return { years: years.map(row => Number(row.year)), barangays: barangays.map(row => row.name), diseases: diseases.map(row => row.disease) };
        },

        async trend(where, year, disease) {
            const monthly = year !== 'all';
            const extra = disease ? ' AND disease = ?' : '';
            const [rows] = await db.execute(
                `SELECT ${monthly ? 'MONTH' : 'YEAR'}(date_recorded) as period, COUNT(*) as cases FROM health_cases WHERE ${where.sql} AND date_recorded IS NOT NULL${extra} GROUP BY period ORDER BY period`,
                [...where.params, ...(disease ? [disease] : [])]
            );
            return rows;
        },

        async diseaseYearComparison(where) {
            const [rows] = await db.execute(
                `SELECT disease, YEAR(date_recorded) as year, COUNT(*) as cases FROM health_cases WHERE ${where.sql} AND date_recorded IS NOT NULL GROUP BY disease, year ORDER BY year, disease`,
                where.params
            );
            return rows;
        },

        async breakdown(where, filters) {
            const [places]=await db.execute('SELECT name FROM barangays ORDER BY name');
            const [barangays]=await db.execute(`SELECT COALESCE(b.name,'Not recorded') AS label, COUNT(*) AS cases
                FROM health_cases h LEFT JOIN barangays b ON b.id=h.barangay_id WHERE ${where.sql}
                GROUP BY label ORDER BY cases DESC,label`,where.params);
            const [ages]=await db.execute(`SELECT ${ageGroupSql(caseAgeSql())} AS label, COUNT(*) AS cases
                FROM health_cases WHERE ${where.sql} GROUP BY label`,where.params);
            const [months]=await db.execute(`SELECT DATE_FORMAT(date_recorded,'%Y-%m') AS label, COUNT(*) AS cases
                FROM health_cases WHERE ${where.sql} AND date_recorded IS NOT NULL GROUP BY label ORDER BY cases DESC,label`,where.params);
            const known=new Map(barangays.map(row=>[row.label,Number(row.cases)]));
            const placeRows=places.filter(row=>filters.barangay==='all'||row.name===filters.barangay).map(row=>({label:row.name,cases:known.get(row.name)||0}));
            for(const row of barangays)if(!placeRows.some(place=>place.label===row.label))placeRows.push(row);
            const ageCounts=new Map(ages.map(row=>[row.label,Number(row.cases)]));
            return {barangays:placeRows.sort((a,b)=>b.cases-a.cases||a.label.localeCompare(b.label)),
                ages:[...Object.keys(ranges),'Not recorded'].map(label=>({label,cases:ageCounts.get(label)||0})),months,
                total_cases:barangays.reduce((sum,row)=>sum+Number(row.cases),0),unknown_age_cases:ageCounts.get('Not recorded')||0};
        },

        async diseaseDistribution(where) {
            const [rows] = await db.execute(
                `SELECT disease, COUNT(*) as count FROM health_cases WHERE ${where.sql} GROUP BY disease ORDER BY count DESC, disease ASC`,
                where.params
            );
            return rows;
        }
    };
}

module.exports = { createDashboardData };
