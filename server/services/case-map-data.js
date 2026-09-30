function createCaseMapData(db) {
    return {
        async trend(barangay_id) {
            let baseFilter = `WHERE is_archived = FALSE AND YEAR(date_recorded) = YEAR(CURDATE())`;
            let params = [];
            if (barangay_id && barangay_id !== 'null') {
                baseFilter += ` AND barangay_id = ?`;
                params.push(barangay_id);
            }

            const query = `
                        SELECT MONTH(date_recorded) as month, COUNT(*) as count
                        FROM health_cases
                        ${baseFilter}
                        GROUP BY MONTH(date_recorded)
                        ORDER BY month ASC
                    `;
            const [rows] = await db.execute(query, params);

            // Initialize 12 months with 0
            let monthlyData = new Array(12).fill(0);
            rows.forEach((row) => {
                monthlyData[row.month - 1] = row.count;
            });

            // Get the last 5 months based on current month, or just Jan-May if it's early in the year?
            // Let's just return the whole year and let frontend decide, or return Jan-May.
            // Actually, just returning the whole 12 months is standard.
            return monthlyData;
        },

        async heatmap(disease) {
            const query = `
                        SELECT b.id as barangay_id, b.name as barangay_name, b.latitude, b.longitude,
                            COUNT(h.id) as cases,
                            SUM(CASE WHEN h.severity = 'Mild' THEN 1 ELSE 0 END) as mild,
                            SUM(CASE WHEN h.severity = 'Monitored' THEN 1 ELSE 0 END) as monitored,
                            SUM(CASE WHEN h.severity = 'High Risk' THEN 1 ELSE 0 END) as high_risk,
                            SUM(CASE WHEN h.disease_review_status IN ('Pending','Clarification') THEN 1 ELSE 0 END) as pending_classification
                        FROM barangays b
                        LEFT JOIN health_cases h ON h.barangay_id = b.id AND h.status = 'Active' AND h.is_archived = FALSE AND (? = '' OR h.disease = ?)
                        GROUP BY b.id, b.name, b.latitude, b.longitude
                    `;
            const [rows] = await db.execute(query, [disease, disease]);
            const [diseaseRows] = await db.execute(
                `
                        SELECT h.barangay_id, h.severity,
                            COALESCE(NULLIF(TRIM(h.disease), ''), 'Not recorded') AS disease,
                            COUNT(*) AS cases
                        FROM health_cases h
                        WHERE h.status = 'Active' AND h.is_archived = FALSE
                            AND h.severity IN ('Mild', 'Monitored', 'High Risk')
                            AND (? = '' OR h.disease = ?)
                        GROUP BY h.barangay_id, h.severity, COALESCE(NULLIF(TRIM(h.disease), ''), 'Not recorded')
                        ORDER BY h.barangay_id, h.severity, cases DESC, disease ASC
                    `,
                [disease, disease]
            );
            const diseasesByBarangay = new Map();
            const severityKeys = { Mild: 'mild', Monitored: 'monitored', 'High Risk': 'high_risk' };
            for (const row of diseaseRows) {
                const key = String(row.barangay_id);
                if (!diseasesByBarangay.has(key))
                    diseasesByBarangay.set(key, { mild: [], monitored: [], high_risk: [] });
                diseasesByBarangay
                    .get(key)
                    [severityKeys[row.severity]].push({ disease: row.disease, cases: Number(row.cases) });
            }
            const data = rows.map((r) => {
                const cases = Number(r.cases);
                const severityCounts = {
                    mild: Number(r.mild),
                    monitored: Number(r.monitored),
                    high_risk: Number(r.high_risk)
                };
                severityCounts.unknown = Math.max(
                    0,
                    cases - severityCounts.mild - severityCounts.monitored - severityCounts.high_risk
                );

                let risk = 'No active cases';
                let color = '#64748b';
                let colorReason = 'No active, non-archived cases are recorded.';
                if (severityCounts.high_risk > 0) {
                    risk = 'High Risk';
                    color = '#dc2626';
                    colorReason = 'At least one active case is recorded as High Risk.';
                } else if (severityCounts.monitored > 0) {
                    risk = 'Monitored';
                    color = '#ea580c';
                    colorReason = 'At least one active case is Monitored; none is recorded as High Risk.';
                } else if (severityCounts.unknown > 0) {
                    risk = 'Severity incomplete';
                    color = '#7c3aed';
                    colorReason = 'Some active cases have missing or unrecognized severity.';
                } else if (cases > 0) {
                    risk = 'Mild';
                    color = '#16a34a';
                    colorReason = 'All active cases are recorded as Mild.';
                }

                return {
                    id: r.barangay_id,
                    name: r.barangay_name,
                    lat: parseFloat(r.latitude),
                    lng: parseFloat(r.longitude),
                    cases,
                    pending_classification: Number(r.pending_classification),
                    severity_counts: severityCounts,
                    diseases_by_severity: diseasesByBarangay.get(String(r.barangay_id)) || {
                        mild: [],
                        monitored: [],
                        high_risk: []
                    },
                    high_risk_diseases: diseasesByBarangay.get(String(r.barangay_id))?.high_risk || [],
                    risk: risk,
                    color: color,
                    color_reason: colorReason
                };
            });
            return data;
        }
    };
}

module.exports = { createCaseMapData };
