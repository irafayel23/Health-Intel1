const {caseAgeSql,ageGroupSql,ranges}=require('./age-groups');
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

        async kpi(where) {
            const [[counts]] = await db.execute(
                `SELECT COUNT(*) as total,
                        COALESCE(SUM(status = 'Active' AND is_archived = FALSE),0) as active,
                        COALESCE(SUM(status IN ('Cleared','Recovered')),0) as recovered,
                        COALESCE(SUM(status = 'Active' AND is_archived = FALSE AND severity = 'High Risk'),0) as highRisk
                        FROM health_cases WHERE ${where.sql}`,
                where.params
            );
            return counts;
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
            const [diseases] = await db.execute("SELECT DISTINCT disease FROM health_cases WHERE disease NOT LIKE '%bite%' AND disease NOT LIKE '%accident%' ORDER BY disease");
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

        async mortality(where) {
            const [rows] = await db.execute(
                `SELECT disease, COUNT(*) as count FROM health_cases WHERE ${where.sql} GROUP BY disease ORDER BY count DESC, disease ASC`,
                where.params
            );
            return rows;
        }
    };
}

module.exports = { createDashboardData };
