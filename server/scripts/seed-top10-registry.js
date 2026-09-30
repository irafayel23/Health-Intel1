// Case categories from the current 2023–2025 demonstration data. These labels
// match existing health_cases strings; they are not a clinical taxonomy.
const TOP_TEN_CASE_NAMES = [
    'Influenza',
    'All types of skin disease',
    'ARI',
    'Infection all types',
    'Hypertension',
    'Fever unknown origin',
    'Vertigo',
    'URTI',
    'Cough',
    'Acute Gastroenteritis'
];

async function seedTopTen(db) {
    const connection = await db.getConnection();
    const added = [];
    const existing = [];
    try {
        await connection.beginTransaction();
        for (const name of TOP_TEN_CASE_NAMES) {
            const [rows] = await connection.execute('SELECT id,status,is_archived FROM disease_registry WHERE LOWER(TRIM(name))=LOWER(?) FOR UPDATE', [name]);
            if (rows.length) {
                existing.push({ name, status: rows[0].status });
                continue;
            }
            await connection.execute('INSERT INTO disease_registry (name,category,classification,status,is_archived) VALUES (?,\'morbidity\',\'Standard\',\'Active\',0)', [name]);
            added.push(name);
        }
        if (added.length) {
            await connection.execute('INSERT INTO system_audit_logs (user_id,role,action,details) VALUES (NULL,\'System\',\'Registry Categories Seeded\',?)',
                [`Added ${added.length} current demonstration top-ten case categories (2023–2025): ${added.join(', ')}. Requested by the project owner; clinical classification remains for Admin review.`]);
        }
        await connection.commit();
        return { added, existing };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

if (require.main === module) {
    const { db } = require('../server');
    seedTopTen(db).then(result => console.log(JSON.stringify(result, null, 2)))
        .catch(error => { console.error(error.code || error.message); process.exitCode = 1; })
        .finally(() => db.end());
}

module.exports = { TOP_TEN_CASE_NAMES, seedTopTen };
