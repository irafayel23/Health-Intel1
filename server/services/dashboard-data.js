function createDashboardData(db) {
    return {
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
                `SELECT COUNT(*) as total_cases, COALESCE(SUM(age IS NULL OR age < 0 OR age > 130),0) as unknown_age_cases, DATE_FORMAT(MIN(date_recorded),'%Y-%m-%d') as first_recorded, DATE_FORMAT(MAX(date_recorded),'%Y-%m-%d') as last_recorded FROM health_cases WHERE ${where.sql}`,
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

        async mortality(where) {
            const [rows] = await db.execute(
                `SELECT disease, COUNT(*) as count FROM health_cases WHERE ${where.sql} GROUP BY disease ORDER BY count DESC, disease ASC LIMIT 5`,
                where.params
            );
            return rows;
        }
    };
}

module.exports = { createDashboardData };
