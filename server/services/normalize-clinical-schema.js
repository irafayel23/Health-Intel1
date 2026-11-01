const {VERSION}=require('./normalized-schema');
const q=value=>'`'+value.replace(/`/g,'``')+'`';
async function normalizeClinicalSchema(db) {
    const [[installed]]=await db.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='normalization_migrations'");
    if(installed.n){const [[row]]=await db.execute('SELECT COUNT(*) AS n FROM normalization_migrations WHERE version=?',[VERSION]);if(row.n)return {alreadyApplied:true};}
    const [sourceColumns]=await db.query("SELECT TABLE_NAME,COLUMN_NAME,CHARACTER_SET_NAME,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('health_cases','residents') ORDER BY TABLE_NAME,ORDINAL_POSITION");
    // MySQL's default may differ from the existing tables (for example after an
    // engine upgrade). Moved text keeps its original comparison and sort rules.
    const textSettings=(table,column)=>{
        const field=sourceColumns.find(c=>c.TABLE_NAME===table&&c.COLUMN_NAME===column);
        if(!field?.CHARACTER_SET_NAME||!field.COLLATION_NAME||![field.CHARACTER_SET_NAME,field.COLLATION_NAME].every(v=>/^[a-zA-Z0-9_]+$/.test(v)))throw Error('Source text settings are unavailable.');
        return ` CHARACTER SET ${field.CHARACTER_SET_NAME} COLLATE ${field.COLLATION_NAME}`;
    };
    const caseText=column=>textSettings('health_cases',column);
    if(!sourceColumns.some(c=>c.TABLE_NAME==='health_cases'&&c.COLUMN_NAME==='first_name'))throw Error('Source schema is incomplete or a previous migration was interrupted. Restore the backup before retrying.');
    const [[catalogConflict]]=await db.query("SELECT COUNT(*) AS n FROM disease_registry WHERE COALESCE(is_archived,0)<>IF(status='Archived',1,0)");
    if(catalogConflict.n)throw Error('Catalog archive status conflicts require review before normalization.');
    await db.query(`CREATE TABLE case_condition_reviews (
        case_id INT NOT NULL PRIMARY KEY,
        reported_condition VARCHAR(255)${caseText('disease_reported')} NULL, condition_source VARCHAR(500)${caseText('condition_source')} NULL,
        review_status ENUM('Recorded','Pending','Clarification','Reviewed')${caseText('disease_review_status')} NOT NULL DEFAULT 'Recorded',
        review_note VARCHAR(1000)${caseText('disease_review_note')} NULL, reviewed_by VARCHAR(50)${caseText('disease_reviewed_by')} NULL, reviewed_at DATETIME NULL,
        INDEX idx_condition_review_queue(review_status,case_id),
        CONSTRAINT fk_normalized_review_case FOREIGN KEY(case_id) REFERENCES health_cases(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.query(`CREATE TABLE case_locations (
        case_id INT NOT NULL PRIMARY KEY, barangay_id INT NULL, purok VARCHAR(255)${caseText('purok')} NULL,
        INDEX idx_case_location_barangay(barangay_id),
        CONSTRAINT fk_normalized_location_case FOREIGN KEY(case_id) REFERENCES health_cases(id),
        CONSTRAINT fk_normalized_location_barangay FOREIGN KEY(barangay_id) REFERENCES barangays(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.query(`CREATE TABLE case_source_records (
        case_id INT NOT NULL PRIMARY KEY, has_identity_snapshot TINYINT(1) NOT NULL DEFAULT 0,
        first_name VARCHAR(255)${caseText('first_name')} NULL,last_name VARCHAR(255)${caseText('last_name')} NULL,suffix VARCHAR(20)${caseText('suffix')} NULL,birthdate DATE NULL,
        reported_age INT NULL,source_name VARCHAR(255)${caseText('patient_name')} NULL,condition_label VARCHAR(255)${caseText('disease')} NULL,
        CONSTRAINT fk_normalized_source_case FOREIGN KEY(case_id) REFERENCES health_cases(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.query(`INSERT INTO case_condition_reviews(case_id,reported_condition,condition_source,review_status,review_note,reviewed_by,reviewed_at)
        SELECT id,disease_reported,condition_source,disease_review_status,disease_review_note,disease_reviewed_by,disease_reviewed_at FROM health_cases`);
    await db.query('INSERT INTO case_locations(case_id,barangay_id,purok) SELECT id,barangay_id,purok FROM health_cases');
    const differs=`(r.id IS NULL OR NOT(h.first_name<=>r.first_name) OR NOT(h.last_name<=>r.last_name) OR NOT(h.suffix<=>r.suffix) OR NOT(h.birthdate<=>r.birthdate))`;
    // Keep source identity only when it differs or has no linked resident. Do not merge people.
    await db.query(`INSERT INTO case_source_records(case_id,has_identity_snapshot,first_name,last_name,suffix,birthdate,reported_age,source_name,condition_label)
        SELECT h.id,${differs},IF(${differs},h.first_name,NULL),IF(${differs},h.last_name,NULL),IF(${differs},h.suffix,NULL),IF(${differs},h.birthdate,NULL),
        IF(h.birthdate IS NULL,h.age,NULL),
        IF(h.patient_name<=>TRIM(CONCAT_WS(' ',h.first_name,h.last_name,NULLIF(h.suffix,''))),NULL,h.patient_name),
        IF(h.disease_id IS NOT NULL AND h.disease<=>d.name,NULL,IF(h.disease='Pending classification',NULL,h.disease))
        FROM health_cases h LEFT JOIN residents r ON r.id=h.resident_id LEFT JOIN disease_registry d ON d.id=h.disease_id`);
    await db.query(`ALTER TABLE residents ADD COLUMN reported_age INT NULL, ADD COLUMN source_name VARCHAR(255)${textSettings('residents','patient_name')} NULL`);
    await db.query(`UPDATE residents SET reported_age=IF(birthdate IS NULL,age,NULL),
        source_name=IF(patient_name<=>TRIM(CONCAT_WS(' ',first_name,last_name,NULLIF(suffix,''))),NULL,patient_name)`);
    await db.query('ALTER TABLE residents DROP COLUMN patient_name,DROP COLUMN age');
    const [foreignKeys]=await db.query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='health_cases' AND COLUMN_NAME='barangay_id' AND REFERENCED_TABLE_NAME IS NOT NULL");
    for(const row of foreignKeys)await db.query('ALTER TABLE health_cases DROP FOREIGN KEY '+q(row.CONSTRAINT_NAME));
    const remove=['first_name','last_name','suffix','birthdate','age','patient_name','purok','barangay_id','disease','disease_review_status','disease_reported','condition_source','disease_review_note','disease_reviewed_by','disease_reviewed_at'];
    await db.query('ALTER TABLE health_cases '+remove.map(name=>'DROP COLUMN '+q(name)).join(','));
    await db.query("ALTER TABLE disease_registry DROP COLUMN is_archived,ADD COLUMN is_archived TINYINT(1) GENERATED ALWAYS AS (IF(status='Archived',1,0)) VIRTUAL");
    const identity=field=>`IF(COALESCE(s.has_identity_snapshot,0)=1,s.${field},r.${field})`;
    const birth=identity('birthdate'),name=`COALESCE(s.source_name,TRIM(CONCAT_WS(' ',${identity('first_name')},${identity('last_name')},NULLIF(${identity('suffix')},''))))`;
    const caseExpressions={
        first_name:identity('first_name'),last_name:identity('last_name'),suffix:identity('suffix'),birthdate:birth,
        age:`CASE WHEN ${birth} IS NULL THEN s.reported_age WHEN h.date_recorded>=${birth} THEN TIMESTAMPDIFF(YEAR,${birth},h.date_recorded) ELSE NULL END`,
        patient_name:name,purok:'l.purok',barangay_id:'l.barangay_id',disease:"COALESCE(s.condition_label,d.name,IF(cr.review_status IN ('Pending','Clarification'),'Pending classification',NULL))",
        disease_review_status:"COALESCE(cr.review_status,'Recorded')",disease_reported:'cr.reported_condition',condition_source:'cr.condition_source',disease_review_note:'cr.review_note',disease_reviewed_by:'cr.reviewed_by',disease_reviewed_at:'cr.reviewed_at'
    };
    const caseFields=sourceColumns.filter(c=>c.TABLE_NAME==='health_cases').map(c=>(caseExpressions[c.COLUMN_NAME]||'h.'+q(c.COLUMN_NAME))+' AS '+q(c.COLUMN_NAME));
    await db.query(`CREATE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW case_records AS SELECT ${caseFields.join(',')} FROM health_cases h
        LEFT JOIN residents r ON r.id=h.resident_id LEFT JOIN case_locations l ON l.case_id=h.id
        LEFT JOIN case_condition_reviews cr ON cr.case_id=h.id LEFT JOIN case_source_records s ON s.case_id=h.id
        LEFT JOIN disease_registry d ON d.id=h.disease_id`);
    const residentExpressions={patient_name:"COALESCE(r.source_name,TRIM(CONCAT_WS(' ',r.first_name,r.last_name,NULLIF(r.suffix,''))))",age:"IF(r.birthdate IS NULL,r.reported_age,TIMESTAMPDIFF(YEAR,r.birthdate,DATE(UTC_TIMESTAMP()+INTERVAL 8 HOUR)))"};
    const residentFields=sourceColumns.filter(c=>c.TABLE_NAME==='residents').map(c=>(residentExpressions[c.COLUMN_NAME]||'r.'+q(c.COLUMN_NAME))+' AS '+q(c.COLUMN_NAME));
    await db.query(`CREATE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW resident_records AS SELECT ${residentFields.join(',')} FROM residents r`);
    await db.query('CREATE TABLE IF NOT EXISTS normalization_migrations(version VARCHAR(100) NOT NULL PRIMARY KEY,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
    await db.execute('INSERT INTO normalization_migrations(version) VALUES(?)',[VERSION]);
    const [[counts]]=await db.query('SELECT (SELECT COUNT(*) FROM health_cases) AS cases_count,(SELECT COUNT(*) FROM residents) AS resident_count,(SELECT COUNT(*) FROM case_visits) AS visit_count');
    return {alreadyApplied:false,...counts};
}
module.exports={normalizeClinicalSchema};
