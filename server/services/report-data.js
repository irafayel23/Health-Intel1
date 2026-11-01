const {caseAgeSql,ageGroupSql}=require('./age-groups');
function createReportData(db) {
    return {
        async monthly(period) {
            const [rows] = await db.execute(
                `SELECT h.disease,h.status,d.category,${ageGroupSql(caseAgeSql('h'))} AS age_group,COUNT(*) as count FROM health_cases h LEFT JOIN disease_registry d ON d.name=h.disease WHERE h.date_recorded>=? AND h.date_recorded<? GROUP BY h.disease,h.status,d.category,age_group ORDER BY count DESC`,
                [period.start, period.end]
            );
            return rows;
        },

        async weekly(period) {
            const [rows] = await db.execute(
                `SELECT disease, barangay_id, status, severity, date_recorded,${ageGroupSql(caseAgeSql())} AS age_group FROM health_cases WHERE date_recorded>=? AND date_recorded<? ORDER BY date_recorded DESC`,
                [period.start, period.end]
            );
            return rows;
        }
    };
}

module.exports = { createReportData };
