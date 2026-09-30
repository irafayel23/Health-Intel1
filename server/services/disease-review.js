const {plain,invalid}=require('./qa-fixes');
const { caseAuditDetails } = require('./case-audit');
const PENDING_DISEASE = 'Pending classification';
const reviewVersion = row => require('crypto').createHash('sha256').update(JSON.stringify([
    row.id,row.disease_reported,row.condition_source,row.disease_review_status,row.disease_review_note,row.is_archived
])).digest('hex');
const columns = {
    disease_id: 'INT NULL',
    disease_review_status: "ENUM('Recorded','Pending','Clarification','Reviewed') NOT NULL DEFAULT 'Recorded'",
    disease_reported: 'VARCHAR(255) NULL',
    condition_source: 'VARCHAR(500) NULL',
    disease_review_note: 'VARCHAR(1000) NULL',
    disease_reviewed_by: 'VARCHAR(50) NULL',
    disease_reviewed_at: 'DATETIME NULL'
};

// Additive, repeatable migration. Existing disease text and case IDs are preserved.
async function migrateDiseaseReview(db) {
    const [present] = await db.query('SHOW COLUMNS FROM health_cases');
    const existing = new Set(present.map(row => row.Field));
    for (const [name, type] of Object.entries(columns)) {
        if (!existing.has(name)) await db.query(`ALTER TABLE health_cases ADD COLUMN ${name} ${type}`);
    }
    const [keys] = await db.query('SHOW INDEX FROM health_cases');
    if (!keys.some(key => key.Key_name === 'idx_disease_review_queue')) {
        await db.query('ALTER TABLE health_cases ADD INDEX idx_disease_review_queue (disease_review_status,is_archived,id)');
    }
    const [constraints] = await db.query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='health_cases' AND CONSTRAINT_NAME='fk_case_disease_registry'");
    if (!constraints.length) await db.query('ALTER TABLE health_cases ADD CONSTRAINT fk_case_disease_registry FOREIGN KEY (disease_id) REFERENCES disease_registry(id)');
}

async function encodingClassification(db, body, patient) {
    if (body.condition_not_listed === true) {
        return { disease: PENDING_DISEASE, disease_id: null, review: 'Pending',
            reported: plain(body.reported_condition, 'reported condition', 255),
            source: plain(body.condition_source, 'condition source (for example a referral or patient report)', 500) };
    }
    if (body.condition_not_listed !== undefined && body.condition_not_listed !== false) throw invalid('Choose a valid condition option.');
    const [rows] = await db.execute('SELECT id,name,status,is_archived FROM disease_registry WHERE name=?', [patient.disease]);
    const selected = rows.find(row => row.status === 'Active' && !row.is_archived);
    if (!selected || patient.disease === PENDING_DISEASE) throw invalid('Select an active registry condition, or choose Condition not listed.');
    return { disease: selected.name, disease_id: selected.id, review: 'Recorded', reported: null, source: null };
}

module.exports={PENDING_DISEASE,migrateDiseaseReview,encodingClassification,reviewVersion};
