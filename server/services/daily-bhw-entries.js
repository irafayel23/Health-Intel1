const { BARANGAYS } = require('./seasonal6200-sarima-demo');
const { todayPeriod } = require('./report-periods');
const { pagination, pageResult } = require('./list-pagination');
const { invalid } = require('./service-errors');

const ENTRY_TYPES = ['New case', 'Follow-up visit', 'New admission'];

async function dailyBhwEntries(db, query, now = new Date()) {
    const period = todayPeriod(now);
    const barangay = query.barangay ?? '';
    if (barangay !== '' && !BARANGAYS.includes(barangay)) throw invalid('Choose a participating barangay.');
    const type = query.type ?? '';
    if (type !== '' && !ENTRY_TYPES.includes(type)) throw invalid('Choose a valid entry type.');
    const input = query.q ?? '';
    if (typeof input !== 'string' || input.length > 100) throw invalid('Enter a search of up to 100 characters.');
    const search = input.trim();
    const paging = pagination(query, 10);
    const bounds = [period.start, period.end].map(date => Date.parse(date + 'T00:00:00+08:00') / 1000);
    const scope = BARANGAYS.map(() => '?').join(', ');
    const inPeriod = alias => `${alias}.created_at >= FROM_UNIXTIME(?) AND ${alias}.created_at < FROM_UNIXTIME(?)`;
    // Older and newer tables use different utf8mb4 collations on Azure.
    const bhw = alias => `JOIN users u ON u.system_id = ${alias}.encoded_by COLLATE utf8mb4_general_ci AND u.role = 'bhw'`;
    const condition = "CASE WHEN h.disease_review_status IN ('Pending', 'Clarification') THEN COALESCE(NULLIF(h.disease_reported, ''), h.disease) ELSE h.disease END";
    const entries = `SELECT b.name AS barangay, h.id AS entry_id, h.id AS case_id, h.resident_id,
        h.patient_name, h.purok, ${condition} AS disease, 'New case' AS entry_type,
        DATE_FORMAT(h.date_recorded, '%Y-%m-%d') AS clinical_date, UNIX_TIMESTAMP(h.created_at) AS entered_at
        FROM health_cases h JOIN barangays b ON b.id = h.barangay_id ${bhw('h')}
        WHERE ${inPeriod('h')} AND b.name IN (${scope})
        UNION ALL
        SELECT b.name, v.id, h.id, h.resident_id, h.patient_name, h.purok, ${condition}, v.nature_of_visit,
        DATE_FORMAT(v.consultation_date, '%Y-%m-%d'), UNIX_TIMESTAMP(v.created_at)
        FROM case_visits v JOIN health_cases h ON h.id = v.case_id JOIN barangays b ON b.id = h.barangay_id ${bhw('v')}
        WHERE ${inPeriod('v')} AND b.name IN (${scope})
            AND v.nature_of_visit IN ('Follow-up visit', 'New admission')`;
    const params = [...bounds, ...BARANGAYS, ...bounds, ...BARANGAYS];
    const filters = [];
    if (barangay) {
        filters.push('barangay = ?');
        params.push(barangay);
    }
    if (type) {
        filters.push('entry_type = ?');
        params.push(type);
    }
    if (search) {
        const id = /^(REC|RES)-?(\d+)$/i.exec(search);
        if (id) {
            filters.push(id[1].toUpperCase() === 'REC' ? 'case_id = ?' : 'resident_id = ?');
            params.push(id[2]);
        } else {
            filters.push('LOCATE(LOWER(?), LOWER(patient_name)) > 0');
            params.push(search);
        }
    }
    const selection = `FROM (${entries}) AS entries ${filters.length ? 'WHERE ' + filters.join(' AND ') : ''}`;
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total ${selection}`, params);
    const meta = pageResult(total, paging);
    const [data] = meta.total && query.summary !== '1' ? await db.execute(`SELECT * ${selection}
        ORDER BY entered_at DESC, entry_type, entry_id DESC LIMIT ? OFFSET ?`,
    [...params, meta.page_size, meta.offset]) : [[]];
    const { offset, ...page } = meta;
    return { date: period.start, nextDayInMs: bounds[1] * 1000 - now.getTime(), barangays: BARANGAYS, data, ...page };
}

module.exports = { dailyBhwEntries };
