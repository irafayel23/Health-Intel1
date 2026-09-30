const { monthlyPeriod } = require('./report-periods');
const { CASE_ACTIONS, withCaseReference } = require('./case-audit');

function createCaseRecords(db) {
    return {
        async context(system_id) {
            const [rows] = await db.execute(
                `
                        SELECT u.first_name, u.barangay_id, b.name as barangay_name
                        FROM users u
                        LEFT JOIN barangays b ON u.barangay_id = b.id
                        WHERE u.system_id = ?`,
                [system_id]
            );
            return rows;
        },

        async encodingChoices() {
            const [rows] = await db.execute(
                "SELECT id,name FROM disease_registry WHERE status='Active' AND is_archived=0 ORDER BY name"
            );
            return rows.map((row) => ({ ...row, registry_status: 'Active' }));
        },

        async barangays() {
            const [rows] = await db.execute('SELECT id,name FROM barangays ORDER BY name');
            return rows;
        },

        async recentWalkIns(systemId) {
            const [rows] = await db.execute(
                `SELECT h.id,h.patient_name,h.purok,h.disease,h.disease_review_status,h.disease_reported,h.severity,h.status,DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,b.name AS barangay_name
                        FROM health_cases h JOIN barangays b ON b.id=h.barangay_id
                        WHERE h.encoded_by=? AND h.is_archived=FALSE ORDER BY h.created_at DESC,h.id DESC LIMIT 25`,
                [systemId]
            );
            return rows;
        },

        async puroks(barangayId) {
            const [rows] = await db.execute(
                `SELECT DISTINCT TRIM(purok) AS name FROM (
                        SELECT purok FROM health_cases WHERE barangay_id=?
                        UNION ALL SELECT purok FROM residents WHERE barangay_id=?
                    ) AS local_puroks WHERE purok IS NOT NULL AND TRIM(purok)<>'' ORDER BY name`,
                [barangayId, barangayId]
            );
            return rows;
        },

        async caseById(id) {
            const [cases] = await db.execute(
                `SELECT h.*, b.name AS barangay_name,
                        DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,
                        DATE_FORMAT(h.birthdate,'%Y-%m-%d') AS birthdate
                        FROM health_cases h LEFT JOIN barangays b ON b.id=h.barangay_id WHERE h.id=?`,
                [id]
            );
            return cases;
        },

        async caseHistory(id) {
            const [logs] = await db.execute(
                `SELECT id,user_id,role,action,details,timestamp AS created_at
                        FROM system_audit_logs WHERE action IN (${CASE_ACTIONS.map(() => '?').join(',')}) ORDER BY timestamp DESC,id DESC`,
                CASE_ACTIONS
            );
            const history = logs.map(withCaseReference).filter((log) => log.case_id === id);
            return history;
        },

        async patients(input) {
            const { barangay_id } = input;
            const period =
                input.month !== undefined || input.year !== undefined
                    ? monthlyPeriod(input.month, input.year)
                    : null;
            const historical = period && input.include_archived === 'true';
            let query = `SELECT h.*, b.name as barangay_name FROM health_cases h LEFT JOIN barangays b ON h.barangay_id = b.id WHERE ${historical ? '1=1' : 'h.is_archived = FALSE'}`;
            let params = [];
            if (period) {
                query += ' AND h.date_recorded>=? AND h.date_recorded<?';
                params.push(period.start, period.end);
            }
            if (barangay_id && barangay_id !== 'null') {
                query += ` AND h.barangay_id = ?`;
                params.push(barangay_id);
            }
            query += ` ORDER BY created_at DESC`;

            const [rows] = await db.execute(query, params);
            return rows;
        },

        async residents(barangay_id) {
            // Get residents + count of their health cases
            let query = `
                        SELECT r.*, COUNT(h.id) as case_count
                        FROM residents r
                        LEFT JOIN health_cases h ON r.id = h.resident_id
                        WHERE 1=1
                    `;
            let params = [];
            if (barangay_id && barangay_id !== 'null') {
                query += ` AND r.barangay_id = ?`;
                params.push(barangay_id);
            }
            query += ` GROUP BY r.id ORDER BY r.last_name ASC, r.first_name ASC`;

            const [rows] = await db.execute(query, params);
            return rows;
        },

        async residentById(residentId) {
            const [residentRows] = await db.execute('SELECT * FROM residents WHERE id = ?', [residentId]);
            return residentRows;
        },

        async residentHistory(residentId, user) {
            const historySql =
                'SELECT * FROM health_cases WHERE resident_id = ?' +
                (user.role === 'bhw' ? ' AND barangay_id = ?' : '') +
                ' ORDER BY date_recorded DESC';
            const [historyRows] = await db.execute(
                historySql,
                user.role === 'bhw' ? [residentId, user.barangay_id] : [residentId]
            );
            return historyRows;
        },

        async archivedPatients(barangay_id) {
            let query = `SELECT h.*, b.name as barangay_name FROM health_cases h LEFT JOIN barangays b ON h.barangay_id = b.id WHERE h.is_archived = TRUE`;
            let params = [];
            if (barangay_id && barangay_id !== 'null') {
                query += ` AND h.barangay_id = ?`;
                params.push(barangay_id);
            }
            query += ` ORDER BY deleted_at DESC`;

            const [rows] = await db.execute(query, params);
            return rows;
        }
    };
}

module.exports = { createCaseRecords };
