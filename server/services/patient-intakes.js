const { ageOnDate, todayInManila, textField, validDate, validateSuffix } = require('./patient-validation');
const { positiveId, selectedResident, reviewNewResident } = require('./encoding-residents');
const { guardResidentVisit } = require('./resident-vital');
const { transaction } = require('./database-transaction');
const { invalid, plain } = require('./service-errors');

async function migratePatientIntakes(db) {
    const [tables]=await db.query("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patient_intakes'");
    if(tables.length)return;
    await db.query(`CREATE TABLE IF NOT EXISTS patient_intakes (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        request_key CHAR(36) NOT NULL,
        resident_id INT NOT NULL,
        barangay_id INT NOT NULL,
        visit_date DATE NOT NULL,
        concern VARCHAR(1000) NOT NULL,
        recorded_by VARCHAR(50) NOT NULL,
        source_case_id INT NULL,
        destination VARCHAR(120) NULL,
        referral_reason VARCHAR(500) NULL,
        state ENUM('saved','requested','sent','acknowledged','arrived','follow_up','closed') NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME NULL,
        acknowledged_at DATETIME NULL,
        arrived_at DATETIME NULL,
        assessed_at DATETIME NULL,
        assessed_by VARCHAR(50) NULL,
        case_id INT NULL,
        outcome VARCHAR(500) NULL,
        follow_up_due DATE NULL,
        follow_up_result VARCHAR(500) NULL,
        closed_at DATETIME NULL,
        UNIQUE KEY intake_request (recorded_by,request_key),
        INDEX intake_barangay (barangay_id,id),
        INDEX intake_queue (state,id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

function demographics(body) {
    try {
        const first_name = textField(body.first_name, 'First name', 100);
        const last_name = textField(body.last_name, 'Family name', 100);
        const suffix = validateSuffix(body.suffix);
        const purok = textField(body.purok, 'Purok / zone', 100).replace(/\s+/gu, ' ');
        const { birthdate, visit_date } = body;
        if (!validDate(birthdate) || !validDate(visit_date) || visit_date > todayInManila() ||
            visit_date < '1900-01-01' || birthdate > visit_date || ageOnDate(birthdate, visit_date) > 130)
            throw Error('Check the birthdate and visit date.');
        return { first_name, last_name, suffix, purok, birthdate, visit_date,
            patient_name: [first_name,last_name,suffix].filter(Boolean).join(' ') };
    } catch (error) { throw invalid(error.message); }
}

async function audit(connection, user, id, action) {
    await connection.execute('INSERT INTO system_audit_logs (user_id,role,action,details) VALUES (?,?,?,?)',
        [user.system_id, user.role === 'bhw' ? 'BHW' : 'MHO', action, JSON.stringify({ intake_id:id })]);
}

async function saveIntake(db, user, input) {
    const patient = demographics(input);
    const barangay = positiveId(user.barangay_id, 'assigned barangay');
    const concern = plain(input.concern, 'reason for visit', 1000);
    const reason = input.request_referral === true ? plain(input.referral_reason, 'referral reason', 500) : null;
    const sourceCase = input.source_case_id == null ? null : positiveId(input.source_case_id, 'original case');
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(input.request_key)))
        throw invalid('Reopen the intake form before saving.');
    if (!['new','existing'].includes(input.patient_mode)) throw invalid('Choose a patient profile.');

    return transaction(db, async connection => {
        const [[scope]] = await connection.execute('SELECT id FROM barangays WHERE id=? FOR UPDATE', [barangay]);
        if (!scope) throw invalid('The assigned barangay is unavailable.', 403);
        const [[saved]] = await connection.execute('SELECT id,state FROM patient_intakes WHERE recorded_by=? AND request_key=?',
            [user.system_id,input.request_key]);
        if (saved) return saved;
        const resident = await selectedResident(connection,input,patient,barangay);
        let residentId = resident?.id;
        if (residentId) await guardResidentVisit(connection,residentId,patient.visit_date);
        if (sourceCase) {
            const [[original]] = await connection.execute(
                'SELECT id FROM health_cases WHERE id=? AND resident_id=? AND barangay_id=? AND is_archived=0',
                [sourceCase,residentId ?? 0,barangay]);
            if (!original) throw invalid('The original case is unavailable for this patient.',404);
        }
        if (!residentId) {
            await reviewNewResident(connection,input,patient,barangay,'BHW');
            const [created] = await connection.execute(
                'INSERT INTO residents (first_name,last_name,patient_name,birthdate,age,purok,barangay_id,suffix) VALUES (?,?,?,?,?,?,?,?)',
                [patient.first_name,patient.last_name,patient.patient_name,patient.birthdate,
                    ageOnDate(patient.birthdate,todayInManila()),patient.purok,barangay,patient.suffix]);
            residentId = created.insertId;
        }
        const state = reason ? 'requested' : 'saved';
        const [record] = await connection.execute(
            'INSERT INTO patient_intakes (request_key,resident_id,barangay_id,visit_date,concern,recorded_by,source_case_id,destination,referral_reason,state) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [input.request_key,residentId,barangay,patient.visit_date,concern,user.system_id,sourceCase,
                reason ? 'Murcia Municipal Health Office / RHU' : null,reason,state]);
        await audit(connection,user,record.insertId,reason ? 'Referral Requested' : 'Barangay Intake Saved');
        return { id:record.insertId,state };
    }, input.patient_mode === 'new' ? 'new-resident-registration' : undefined);
}

const referralViews = {
    incoming: "i.state IN ('requested','sent','acknowledged','arrived')",
    followups: "i.state='follow_up'",
    completed: "i.state='closed'"
};

async function referralSummary(db) {
    const [[row]] = await db.query(`SELECT
        COALESCE(SUM(state='requested'),0) AS to_issue,
        COALESCE(SUM(state='sent'),0) AS to_acknowledge,
        COALESCE(SUM(state='arrived' AND assessed_at IS NULL),0) AS to_assess,
        COALESCE(SUM(state='arrived' AND assessed_at IS NOT NULL),0) AS to_complete
        FROM patient_intakes WHERE state IN ('requested','sent','arrived')`);
    return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,Number(value)]));
}

async function bhwReferralSummary(db, user) {
    const barangay=positiveId(user.barangay_id,'assigned barangay');
    const [[row]]=await db.execute(`SELECT
        COALESCE(SUM(i.state IN ('requested','sent','acknowledged','arrived')),0) AS open_referrals,
        COALESCE(SUM(i.state='follow_up'),0) AS assigned_followups
        FROM patient_intakes i WHERE i.barangay_id=?`,[barangay]);
    return {open_referrals:Number(row.open_referrals),assigned_followups:Number(row.assigned_followups)};
}

async function listIntakes(db,user,page,{view,barangay}={}) {
    const bhw = user.role === 'bhw';
    const conditions = [bhw ? 'i.barangay_id=?' : "i.state<>'saved'"];
    const params = bhw ? [positiveId(user.barangay_id,'assigned barangay')] : [];
    if(!bhw && view!==undefined) {
        if(typeof view!=='string'||!Object.hasOwn(referralViews,view))throw invalid('Choose a valid referral list.');
        conditions.push(referralViews[view]);
    }
    if(!bhw && barangay!==undefined && barangay!=='all') {
        conditions.push('i.barangay_id=?');
        params.push(positiveId(barangay,'barangay'));
    }
    const offset = (page-1)*20;
    const orderByView = {
        incoming: "(i.state='acknowledged'),i.id DESC",
        followups: 'i.follow_up_due,i.id DESC',
        completed: 'i.closed_at DESC,i.id DESC'
    };
    const order = (!bhw && view && orderByView[view]) || "(i.state IN ('saved','closed')),i.id DESC";
    const [rows] = await db.execute(`SELECT i.id,i.resident_id,i.barangay_id,i.source_case_id,i.state,
        DATE_FORMAT(i.visit_date,'%Y-%m-%d') AS visit_date,i.concern,i.destination,i.referral_reason,
        i.sent_at,i.acknowledged_at,i.arrived_at,i.assessed_at,i.case_id,i.outcome,i.closed_at,
        DATE_FORMAT(i.follow_up_due,'%Y-%m-%d') AS follow_up_due,i.follow_up_result,
        r.patient_name,b.name AS barangay_name
        FROM patient_intakes i JOIN residents r ON r.id=i.resident_id JOIN barangays b ON b.id=i.barangay_id
        WHERE ${conditions.join(' AND ')} ORDER BY ${order} LIMIT 21 OFFSET ${offset}`,params);
    return { data:rows.slice(0,20), has_more:rows.length>20 };
}

const actions = {
    issue: { from:'requested', to:'sent', time:'sent_at', audit:'Referral Issued' },
    acknowledge: { from:'sent', to:'acknowledged', time:'acknowledged_at', audit:'Referral Acknowledged' },
    arrive: { from:'acknowledged', to:'arrived', time:'arrived_at', audit:'Referral Arrival Recorded' },
    complete: { from:'arrived', to:'closed', time:'closed_at', audit:'Referral Completed' },
    follow_up: { from:'arrived', to:'follow_up', audit:'Barangay Follow-up Assigned' },
    follow_up_done: { from:'follow_up', to:'closed', time:'closed_at', audit:'Barangay Follow-up Completed' },
    follow_up_note: { from:'follow_up', to:'follow_up', audit:'Barangay Follow-up Updated' },
    request: { from:'saved', to:'requested', audit:'Referral Requested' }
};
async function changeIntake(db,user,id,input) {
    const name = input.action;
    const action = Object.hasOwn(actions,name) && actions[name];
    const barangayAction = ['request','follow_up_done','follow_up_note'].includes(name);
    if (!action || (user.role === 'bhw') !== barangayAction) throw invalid('This action is unavailable for your role.',403);
    return transaction(db,async connection => {
        const [[record]] = await connection.execute('SELECT * FROM patient_intakes WHERE id=? FOR UPDATE',[id]);
        if (!record || (barangayAction && Number(record.barangay_id)!==Number(user.barangay_id)))
            throw invalid('The intake is unavailable.',404);
        if (record.state!==action.from) throw invalid('The referral changed. Refresh the list before continuing.',409);
        const fields = ['state=?'];
        const params = [action.to];
        if (action.time) fields.push(action.time+'=NOW()');
        if (name==='complete'||name==='follow_up') {
            fields.push('outcome=?');params.push(plain(input.note,'outcome or follow-up instructions',500));
            if (!record.assessed_at) {
                fields.push('assessed_at=NOW()','assessed_by=?');
                params.push(user.system_id);
            }
        }
        if (name==='follow_up') {
            if (!validDate(input.due_date)||input.due_date<todayInManila()) throw invalid('Select a valid follow-up date.');
            fields.push('follow_up_due=?');params.push(input.due_date);
        }
        if (name==='follow_up_done'||name==='follow_up_note') {
            fields.push('follow_up_result=?');params.push(plain(input.note,'follow-up note',500));
        }
        if (name==='request') {
            fields.push('destination=?','referral_reason=?');
            params.push('Murcia Municipal Health Office / RHU',plain(input.note,'referral reason',500));
        }
        await connection.execute('UPDATE patient_intakes SET '+fields.join(',')+' WHERE id=?',[...params,id]);
        await audit(connection,user,id,action.audit);
    });
}

async function lockReferralAssessment(connection,input,barangay,actorRole) {
    if (input.intake_id == null) return null;
    if (actorRole !== 'MHO') throw invalid('Only MHO clinical entry can assess a referral.',403);
    const id = positiveId(input.intake_id,'referral');
    const [[record]] = await connection.execute('SELECT * FROM patient_intakes WHERE id=? FOR UPDATE',[id]);
    if (!record || Number(record.barangay_id)!==barangay || Number(record.resident_id)!==Number(input.resident_id))
        throw invalid('The patient and barangay must match the original referral.',409);
    if (record.state!=='arrived'||record.assessed_at) throw invalid('Only an arrived referral awaiting assessment can be assessed.',409);
    return id;
}

async function linkReferralAssessment(connection,id,caseId,systemId) {
    if (!id) return;
    await connection.execute('UPDATE patient_intakes SET case_id=?,assessed_at=NOW(),assessed_by=? WHERE id=?',[caseId,systemId,id]);
    await audit(connection,{role:'mho',system_id:systemId},id,'Referral Assessment Recorded');
}

module.exports = { migratePatientIntakes,saveIntake,listIntakes,changeIntake,lockReferralAssessment,linkReferralAssessment,referralSummary,bhwReferralSummary };
