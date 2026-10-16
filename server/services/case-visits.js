const { validDate } = require('./patient-validation');
const { invalid, plain } = require('./service-errors');
const { caseAuditDetails } = require('./case-audit');
const {guardResidentVisit,guardResidentIdentity}=require('./resident-vital');

const TRANSACTIONS = ['Walk-in', 'Visited', 'Referral'];
const NATURES = ['New consultation/case', 'New admission', 'Follow-up visit'];

function validateVisit(input, consultationDate) {
    if (input === undefined) return null; // HTTP encoding routes require visits; legacy service callers may omit them.
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('Enter valid consultation details.');
    if (!TRANSACTIONS.includes(input.transaction_mode)) throw invalid('Select the mode of transaction.');
    if (!NATURES.includes(input.nature_of_visit)) throw invalid('Select the nature of visit.');
    const consultation_time = input.consultation_time === undefined || input.consultation_time === '' ? null : input.consultation_time;
    if (consultation_time !== null && (typeof consultation_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(consultation_time))) throw invalid('Enter the consultation time with hour, minutes and AM/PM.');
    const referral = input.transaction_mode === 'Referral';
    const referred_by = referral ? plain(input.referred_by, 'referred by', 500, true) : '';
    const referral_reason = referral ? plain(input.referral_reason, 'reason for referral', 1000) : '';
    const measurement = (key, label, maximum) => {
        const raw = input[key];
        if (raw === undefined || raw === null || raw === '' || (typeof raw === 'string' && !raw.trim())) throw invalid(`Enter ${label.toLowerCase()}; measurements are required for this visit.`);
        if (!['string', 'number'].includes(typeof raw) || !/^\d+(?:\.\d{1,2})?$/.test(String(raw))) throw invalid(`Enter a numeric ${label.toLowerCase()} with up to two decimal places.`);
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0 || value > maximum) throw invalid(`Check ${label.toLowerCase()}; enter a positive value no greater than ${maximum}.`);
        return value;
    };
    let blood_pressure = input.blood_pressure === undefined || input.blood_pressure === '' ? null : input.blood_pressure;
    if (blood_pressure === null) throw invalid('Enter blood pressure as systolic/diastolic; measurements are required for this visit.');
    if (blood_pressure !== null) {
        if (typeof blood_pressure !== 'string') throw invalid('Enter blood pressure as systolic/diastolic, for example 120/80.');
        const match = /^\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*$/.exec(blood_pressure);
        if (!match || match.slice(1).some(n => Number(n) < 1 || Number(n) > 500)) throw invalid('Enter blood pressure as two positive numbers, for example 120/80.');
        blood_pressure = `${Number(match[1])}/${Number(match[2])}`;
    }
    const case_id = input.case_id;
    if (input.nature_of_visit !== NATURES[0] && (!Number.isSafeInteger(case_id) || case_id < 1)) throw invalid('Select the existing disease case for this admission or follow-up.');
    if (input.nature_of_visit === NATURES[0] && case_id != null) throw invalid('A new case cannot be linked as a follow-up.');
    const next_followup_date = input.next_followup_date === undefined || input.next_followup_date === null || input.next_followup_date === '' ? null : input.next_followup_date;
    if (next_followup_date !== null && (!validDate(next_followup_date) || next_followup_date < '1900-01-01')) throw invalid('Enter a valid next follow-up date.');
    if (next_followup_date && consultationDate && next_followup_date < consultationDate) throw invalid('The next follow-up date must be on or after the consultation date.');
    const rawInstructions = input.followup_instructions;
    if (rawInstructions != null && (typeof rawInstructions !== 'string' || rawInstructions.length > 2000 || /[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(rawInstructions))) throw invalid('Enter valid follow-up instructions (maximum 2000 characters).');
    const followup_instructions = (rawInstructions || '').trim();
    return { transaction_mode: input.transaction_mode, nature_of_visit: input.nature_of_visit, consultation_time,
        next_followup_date, followup_instructions,
        referred_by, referral_reason, blood_pressure,
        temperature_c: measurement('temperature_c', 'Temperature in °C', 100),
        height_cm: measurement('height_cm', 'Height in cm', 500), weight_kg: measurement('weight_kg', 'Weight in kg', 1500), case_id };
}

async function migrateCaseVisits(db) {
    for (const table of ['residents', 'health_cases']) {
        const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);
        if (!columns.some(c => c.Field === 'suffix')) await db.query(`ALTER TABLE ${table} ADD COLUMN suffix VARCHAR(20) NOT NULL DEFAULT ''`);
    }
    await db.query(`CREATE TABLE IF NOT EXISTS case_visits (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, case_id INT NOT NULL,
        consultation_date DATE NOT NULL, consultation_time TIME NULL,
        transaction_mode ENUM('Walk-in','Visited','Referral') NOT NULL,
        nature_of_visit ENUM('New consultation/case','New admission','Follow-up visit') NOT NULL,
        referred_by VARCHAR(500) NULL, referral_reason VARCHAR(1000) NULL,
        blood_pressure VARCHAR(7) NULL, temperature_c DECIMAL(5,2) NULL,
        height_cm DECIMAL(6,2) NULL, weight_kg DECIMAL(7,2) NULL,
        severity ENUM('Mild','Monitored','High Risk') NOT NULL, remarks TEXT NULL,
        encoded_by VARCHAR(50) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_case_visits_case_date (case_id, consultation_date, id),
        CONSTRAINT fk_case_visits_case FOREIGN KEY (case_id) REFERENCES health_cases(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [visitColumns] = await db.query('SHOW COLUMNS FROM case_visits');
    if (!visitColumns.some(c => c.Field === 'next_followup_date')) await db.query('ALTER TABLE case_visits ADD COLUMN next_followup_date DATE NULL');
    if (!visitColumns.some(c => c.Field === 'followup_instructions')) await db.query('ALTER TABLE case_visits ADD COLUMN followup_instructions VARCHAR(2000) NULL');
}

async function saveVisit(connection, caseId, patient, visit, systemId) {
    const [result] = await connection.execute(`INSERT INTO case_visits
        (case_id,consultation_date,consultation_time,transaction_mode,nature_of_visit,referred_by,referral_reason,blood_pressure,temperature_c,height_cm,weight_kg,severity,remarks,encoded_by,next_followup_date,followup_instructions)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [caseId, patient.date_recorded, visit.consultation_time, visit.transaction_mode, visit.nature_of_visit,
        visit.referred_by || null, visit.referral_reason || null, visit.blood_pressure, visit.temperature_c, visit.height_cm, visit.weight_kg, patient.severity, patient.remarks || null, systemId, visit.next_followup_date || null, visit.followup_instructions || null]);
    return result.insertId;
}

async function saveExistingVisit(connection, patient, visit, barangayId, systemId, actorRole) {
    const [rows] = await connection.execute(`SELECT *, DATE_FORMAT(birthdate,'%Y-%m-%d') AS birthdate,
        DATE_FORMAT(date_recorded,'%Y-%m-%d') AS date_recorded FROM health_cases WHERE id=? AND barangay_id=? FOR UPDATE`, [visit.case_id, barangayId]);
    const existing = rows[0];
    if (!existing || existing.is_archived) throw invalid('Select an available case in the patient’s recorded barangay.', 404);
    const normalized = value => String(value || '').trim().toLocaleLowerCase('en');
    if (normalized(existing.first_name) !== normalized(patient.first_name) || normalized(existing.last_name) !== normalized(patient.last_name)
        || normalized(existing.suffix) !== normalized(patient.suffix) || !validDate(existing.birthdate) || existing.birthdate !== patient.birthdate)
        throw invalid('The selected case does not match the patient name, suffix and birthdate. Review the patient details.', 409);
    if (patient.date_recorded < existing.date_recorded) throw invalid('The visit date cannot be earlier than the original case date.');
    await guardResidentVisit(connection,existing.resident_id,patient.date_recorded);
    await guardResidentIdentity(connection,patient,barangayId);
    const [duplicates] = await connection.execute(`SELECT id FROM case_visits WHERE case_id=? AND consultation_date=?
        AND COALESCE(TIME_FORMAT(consultation_time,'%H:%i'),'')=COALESCE(?,'') AND nature_of_visit=? LIMIT 1`, [existing.id, patient.date_recorded, visit.consultation_time, visit.nature_of_visit]);
    if (duplicates.length) throw invalid('This visit is already recorded for that case, date and time. Review the visit history.', 409);
    const visitId = await saveVisit(connection, existing.id, patient, visit, systemId);
    await connection.execute('INSERT INTO system_audit_logs (user_id,role,action,details) VALUES (?,?,?,?)',
        [systemId, actorRole, 'Case Visit Recorded', caseAuditDetails(existing.id, `${visit.nature_of_visit} recorded for case #REC-${existing.id}. Disease case count unchanged.`, {visit_id: visitId})]);
    return {id: existing.id, visit_id: visitId, new_case: false, review_status: existing.disease_review_status};
}

async function caseVisits(db, caseId, user) {
    const [cases] = await db.execute('SELECT id FROM health_cases WHERE id=?' + (user.role === 'bhw' ? ' AND barangay_id=?' : ''), user.role === 'bhw' ? [caseId, user.barangay_id] : [caseId]);
    if (!cases.length) throw invalid('Case not found.', 404);
    const [rows] = await db.execute(`SELECT *,DATE_FORMAT(consultation_date,'%Y-%m-%d') AS consultation_date,
        DATE_FORMAT(next_followup_date,'%Y-%m-%d') AS next_followup_date,
        TIME_FORMAT(consultation_time,'%H:%i') AS consultation_time FROM case_visits WHERE case_id=? ORDER BY consultation_date DESC,consultation_time DESC,id DESC`, [caseId]);
    return rows;
}

module.exports = { validateVisit, migrateCaseVisits, saveVisit, saveExistingVisit, caseVisits };
