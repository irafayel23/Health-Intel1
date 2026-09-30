const { encodingClassification } = require('./disease-review');
const { ageOnDate, todayInManila } = require('./patient-validation');
const { transaction } = require('./database-transaction');
const { invalid } = require('./service-errors');
const { caseAuditDetails } = require('./case-audit');

function createCaseEncoding(db) {
    return {
        async save(patient, input, brgy_id, systemId, actorRole) {
            return transaction(db, async (connection) => {
                const [selectedBarangays] = await connection.execute(
                    'SELECT id,name FROM barangays WHERE id=? FOR UPDATE',
                    [brgy_id]
                );
                if (!selectedBarangays.length) {
                    throw invalid('Select an existing barangay.');
                }
                const classification = await encodingClassification(connection, input, patient);
                patient.disease = classification.disease;
                const [duplicates] = await connection.execute(
                    'SELECT id FROM health_cases WHERE barangay_id=? AND first_name=? AND last_name=? AND birthdate=? AND disease=? AND date_recorded=? AND (? IS NULL OR disease_reported=?) LIMIT 1',
                    [
                        brgy_id,
                        patient.first_name,
                        patient.last_name,
                        patient.birthdate,
                        patient.disease,
                        patient.date_recorded,
                        classification.reported,
                        classification.reported
                    ]
                );
                if (duplicates.length) {
                    const error = invalid(
                        'A matching case already exists for this person, disease and date. Review the existing record before encoding again.',
                        409
                    );
                    error.code = 'POSSIBLE_DUPLICATE';
                    throw error;
                }
                const [residents] = await connection.execute(
                    'SELECT id FROM residents WHERE first_name=? AND last_name=? AND birthdate=? AND barangay_id=? AND purok=? LIMIT 2',
                    [patient.first_name, patient.last_name, patient.birthdate, brgy_id, patient.purok]
                );
                if (residents.length > 1) {
                    throw invalid(
                        'Multiple matching resident profiles need review. Ask the Admin to check them before saving.',
                        409
                    );
                }
                let resident_id = residents[0]?.id;
                if (!resident_id) {
                    const [resident] = await connection.execute(
                        'INSERT INTO residents (first_name,last_name,patient_name,birthdate,age,purok,barangay_id) VALUES (?,?,?,?,?,?,?)',
                        [
                            patient.first_name,
                            patient.last_name,
                            patient.patient_name,
                            patient.birthdate,
                            ageOnDate(patient.birthdate, todayInManila()),
                            patient.purok,
                            brgy_id
                        ]
                    );
                    resident_id = resident.insertId;
                }
                const [result] = await connection.execute(
                    'INSERT INTO health_cases (resident_id,first_name,last_name,patient_name,birthdate,age,purok,disease,remarks,status,encoded_by,barangay_id,date_recorded,severity,disease_id,disease_review_status,disease_reported,condition_source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [
                        resident_id,
                        patient.first_name,
                        patient.last_name,
                        patient.patient_name,
                        patient.birthdate,
                        patient.age,
                        patient.purok,
                        patient.disease,
                        patient.remarks,
                        patient.status,
                        systemId,
                        brgy_id,
                        patient.date_recorded,
                        patient.severity,
                        classification.disease_id,
                        classification.review,
                        classification.reported,
                        classification.source
                    ]
                );
                await connection.execute(
                    'INSERT INTO system_audit_logs (user_id,role,action,details) VALUES (?,?,?,?)',
                    [
                        systemId,
                        actorRole,
                        actorRole === 'MHO' ? 'Walk-in Case Encoded' : 'Patient Encoded',
                        caseAuditDetails(
                            result.insertId,
                            `Created case #REC-${result.insertId} · ${selectedBarangays[0].name} · Case date: ${patient.date_recorded} · Saved.`,
                            { barangay_id: brgy_id, review_status: classification.review }
                        )
                    ]
                );
                return { id: result.insertId, review_status: classification.review };
            });
        }
    };
}

module.exports = { createCaseEncoding };
