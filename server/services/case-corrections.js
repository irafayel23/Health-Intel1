const crypto = require('node:crypto');
const { invalid, plain, respond } = require('./service-errors');
const { transaction } = require('./database-transaction');
const { validDate, ageOnDate, todayInManila } = require('./patient-validation');
const fields = "id,barangay_id,resident_id,first_name,last_name,DATE_FORMAT(birthdate,'%Y-%m-%d') AS birthdate,DATE_FORMAT(date_recorded,'%Y-%m-%d') AS date_recorded,disease,disease_review_status,disease_reported,condition_source,disease_id,severity,age,status,remarks,is_archived,updated_at";
const version = row => crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex');
async function diseases(db, current) {
    const [registry] = await db.query('SELECT name,status,is_archived FROM disease_registry');
    const [history] = await db.query("SELECT DISTINCT disease AS name FROM health_cases WHERE disease IS NOT NULL AND disease<>'' AND disease_review_status NOT IN ('Pending','Clarification')");
    const normalized = name => name.trim().toLowerCase();
    const archived = new Set(registry.filter(r => r.status === 'Archived' || r.is_archived).map(r => normalized(r.name)));
    const names = new Set([...registry.filter(r => r.status === 'Active' && !r.is_archived).map(r => r.name), ...history.filter(r => !archived.has(normalized(r.name))).map(r => r.name)]);
    if (current) names.add(current);
    return [...names].sort();
}
function handlers(db) {
    function scope(req) { return req.user.role === 'bhw' ? { sql: ' AND barangay_id=?', params: [req.user.barangay_id] } : { sql: '', params: [] }; }
    return {
        async get(req, res) {
            try {
                const filter = scope(req);
                const [rows] = await db.execute('SELECT ' + fields + ' FROM health_cases WHERE id=?' + filter.sql, [req.params.id, ...filter.params]);
                const row = rows[0];
                if (!row) throw invalid('Case not found.', 404);
                if (row.is_archived) throw invalid('Restore this archived record before correcting it.', 409);
                res.json({ success: true, data: { id: row.id, date_recorded: row.date_recorded, disease: row.disease, disease_review_status:row.disease_review_status, disease_reported:row.disease_reported, severity: row.severity, age: row.age, has_birthdate: Boolean(row.birthdate), identity_ready: Boolean(row.resident_id || (row.first_name && row.last_name && row.birthdate)), version: version(row), diseases: await diseases(db, row.disease) } });
            } catch (error) { respond(res, error, 'The correction form could not be loaded.'); }
        },
        async save(req, res) {
            try {
                const input = req.body || {};
                const disease = plain(input.disease, 'disease category', 255);
                if(typeof input.reason !== 'string' || input.reason.length > 1000 || /[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(input.reason)) throw invalid('Enter a text reason of at most 1,000 characters.');
                const reason = input.reason.trim();
                if (reason.length < 5) throw invalid('Explain the correction using at least 5 characters.');
                if (input.date_recorded !== null && (!validDate(input.date_recorded) || input.date_recorded < '1900-01-01' || input.date_recorded > todayInManila())) throw invalid('Select a valid case date from 1900 through today.');
                if (!['Mild', 'Monitored', 'High Risk'].includes(input.severity)) throw invalid('Select a valid recorded severity.');
                if (typeof input.version !== 'string' || !/^[a-f0-9]{64}$/.test(input.version)) throw invalid('Reopen the correction form to load the latest record.', 409);
                const result = await transaction(db, async connection => {
                    const filter = scope(req);
                    const [initial] = await connection.execute('SELECT barangay_id FROM health_cases WHERE id=?' + filter.sql, [req.params.id, ...filter.params]);
                    if (!initial.length) throw invalid('Case not found.', 404);
                    // Use the same barangay lock order as encoding to protect duplicate checks.
                    await connection.execute('SELECT id FROM barangays WHERE id=? FOR UPDATE', [initial[0].barangay_id]);
                    const [rows] = await connection.execute('SELECT ' + fields + ' FROM health_cases WHERE id=?' + filter.sql + ' FOR UPDATE', [req.params.id, ...filter.params]);
                    const row = rows[0];
                    if (!row || row.barangay_id !== initial[0].barangay_id) throw invalid('The record changed. Reopen the correction form.', 409);
                    if (row.is_archived) throw invalid('Restore this archived record before correcting it.', 409);
                    if (version(row) !== input.version) throw invalid('Someone updated this record. Close and reopen the form before saving your correction.', 409);
                    if (input.date_recorded === null && row.date_recorded !== null) throw invalid('An existing case date cannot be cleared.');
                    if (['Pending','Clarification'].includes(row.disease_review_status) && disease !== row.disease) throw invalid('MHO must review this condition before its disease category can be changed.');
                    if (disease !== row.disease && !(await diseases(connection)).includes(disease)) throw invalid('Select an existing, non-archived disease category.');
                    let age = row.age;
                    if (input.date_recorded !== row.date_recorded && row.birthdate) {
                        if (!validDate(row.birthdate) || row.birthdate > input.date_recorded) throw invalid('The case date must be on or after the recorded birthdate.');
                        age = ageOnDate(row.birthdate, input.date_recorded);
                        if (age < 0 || age > 130) throw invalid('The corrected case date would give an invalid age. Review the source birthdate.');
                    }
                    if (input.date_recorded === row.date_recorded && disease === row.disease && input.severity === row.severity) throw invalid('Change the case date, disease or recorded severity before saving.');
                    let duplicateSql = 'SELECT id FROM health_cases WHERE id<>? AND barangay_id=? AND disease=? AND date_recorded=? AND ';
                    let duplicateParams = [row.id, row.barangay_id, disease, input.date_recorded];
                    if (row.resident_id && row.first_name && row.last_name && row.birthdate) { duplicateSql += '(resident_id=? OR (first_name=? AND last_name=? AND birthdate=?))'; duplicateParams.push(row.resident_id, row.first_name, row.last_name, row.birthdate); }
                    else if (row.resident_id) { duplicateSql += 'resident_id=?'; duplicateParams.push(row.resident_id); }
                    else if (row.first_name && row.last_name && row.birthdate) { duplicateSql += 'first_name=? AND last_name=? AND birthdate=?'; duplicateParams.push(row.first_name, row.last_name, row.birthdate); }
                    else if (disease !== row.disease || input.date_recorded !== row.date_recorded) throw invalid('This historical case lacks enough verified identity details for a date or disease correction. Review its source/profile first; severity can still be corrected.', 409);
                    else duplicateSql = null;
                    if (duplicateSql) { const [duplicates] = await connection.execute(duplicateSql + ' AND (? IS NULL OR disease_reported=?) LIMIT 1', [...duplicateParams, ['Pending','Clarification'].includes(row.disease_review_status)?row.disease_reported:null, ['Pending','Clarification'].includes(row.disease_review_status)?row.disease_reported:null]); if (duplicates.length) throw invalid('This correction would match another case for the same resident, disease and date. Review the existing record.', 409); }
                    let diseaseId=row.disease_id,reviewStatus=row.disease_review_status;
                    if(disease!==row.disease){const [registry]=await connection.execute("SELECT id FROM disease_registry WHERE name=? AND status='Active' AND is_archived=0",[disease]);diseaseId=registry[0]?.id||null;reviewStatus='Recorded';}
                    await connection.execute('UPDATE health_cases SET disease_id=?,disease_review_status=?,date_recorded=?,disease=?,severity=?,age=? WHERE id=?', [diseaseId,reviewStatus,input.date_recorded,disease,input.severity,age,row.id]);
                    const before = { date_recorded: row.date_recorded, disease: row.disease, severity: row.severity, age: row.age };
                    const after = { date_recorded: input.date_recorded, disease, severity: input.severity, age };
                    await connection.execute('INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,?,?,?)', [req.user.system_id, req.user.role === 'bhw' ? 'BHW' : 'Admin', 'Case Corrected', JSON.stringify({ case_id: row.id, reason, before, after })]);
                    return { age, age_preserved: !row.birthdate };
                });
                res.json({ success: true, ...result, message: 'Correction saved with its reason and previous values in the audit trail.' });
            } catch (error) { respond(res, error, 'The correction could not be saved. No partial change was kept.'); }
        }
    };
}
module.exports = { handlers };
