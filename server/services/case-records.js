const { monthlyPeriod } = require('./report-periods');
const { CASE_ACTIONS, withCaseReference } = require('./case-audit');
const {textField,validDate,validateSuffix}=require('./patient-validation');
const {invalid}=require('./service-errors');
const {vitalSelect,vitalJoins}=require('./resident-vital');

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

        async encodingChoices(barangayId=null) {
            const [rows] = await db.execute(
                "SELECT id,name FROM disease_registry WHERE status='Active' AND is_archived=0 ORDER BY name"
            );
            const [counts]=await db.execute("SELECT disease,COUNT(*) AS recorded_count FROM health_cases WHERE COALESCE(disease_review_status,'Recorded') NOT IN ('Pending','Clarification')"+(barangayId===null?'':' AND barangay_id=?')+' GROUP BY disease',barangayId===null?[]:[barangayId]);
            const totals=new Map(),key=value=>String(value||'').trim().toLocaleLowerCase('en');
            for(const row of counts)totals.set(key(row.disease),(totals.get(key(row.disease))||0)+Number(row.recorded_count));
            return rows.map(row=>({...row,registry_status:'Active',recorded_count:totals.get(key(row.name))||0}))
                .sort((a,b)=>b.recorded_count-a.recorded_count||a.name.localeCompare(b.name,'en')||a.id-b.id)
                .map((row,index)=>({...row,top_rank:row.recorded_count>0&&index<10?index+1:null}));
        },

        async barangays() {
            const [rows] = await db.execute('SELECT id,name FROM barangays ORDER BY name');
            return rows;
        },

        async recentWalkIns(systemId) {
            const [rows] = await db.execute(
                `SELECT h.id,h.patient_name,h.purok,h.disease,h.disease_review_status,h.disease_reported,h.severity,h.status,DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,b.name AS barangay_name,
                        EXISTS(SELECT 1 FROM case_visits v WHERE v.case_id=h.id) AS has_visits
                        FROM health_cases h JOIN barangays b ON b.id=h.barangay_id
                        WHERE h.encoded_by=? AND h.is_archived=FALSE ORDER BY h.created_at DESC,h.id DESC LIMIT 25`,
                [systemId]
            );
            return rows;
        },

        async recentMhoVisits(systemId) {
            const [rows]=await db.execute(`SELECT v.id,v.case_id,v.nature_of_visit,v.transaction_mode,
                DATE_FORMAT(v.consultation_date,'%Y-%m-%d') AS consultation_date,TIME_FORMAT(v.consultation_time,'%H:%i') AS consultation_time,
                h.patient_name,h.disease,h.disease_review_status,h.disease_reported,b.name AS barangay_name
                FROM case_visits v JOIN health_cases h ON h.id=v.case_id JOIN barangays b ON b.id=h.barangay_id
                WHERE v.encoded_by=? ORDER BY v.created_at DESC,v.id DESC LIMIT 25`,[systemId]);
            return rows;
        },

        async matchingWalkIns(input) {
            if(!input||typeof input!=='object'||Array.isArray(input))throw invalid('Enter the patient identity and resident barangay.');
            let first,last,suffix;
            try {first=textField(input.first_name,'First name',100);last=textField(input.last_name,'Family name',100);suffix=validateSuffix(input.suffix);}
            catch(error){throw invalid(error.message);}
            if(typeof input.barangay_id!=='string'||!/^\d+$/.test(input.barangay_id)||!Number.isSafeInteger(Number(input.barangay_id))||Number(input.barangay_id)<1||!validDate(input.birthdate))throw invalid('Enter the patient name, suffix, birthdate and resident barangay to find an existing case.');
            const date=input.consultation_date||require('./patient-validation').todayInManila();
            if(!validDate(date))throw invalid('Select a valid consultation date.');
            const target=input.case_id;
            if(target!==undefined&&(!Number.isSafeInteger(target)||target<1))throw invalid('Select a valid original case.');
            const [rows]=await db.execute(`SELECT h.id,h.disease,h.disease_review_status,h.disease_reported,h.status,
                DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,
                DATE_FORMAT((SELECT MAX(cv.consultation_date) FROM case_visits cv WHERE cv.case_id=h.id),'%Y-%m-%d') AS last_consultation,
                COALESCE(v.is_deceased,0) AS is_deceased,DATE_FORMAT(v.death_date,'%Y-%m-%d') AS death_date
                FROM health_cases h LEFT JOIN resident_vital_status v ON v.resident_id=h.resident_id
                WHERE h.first_name=? AND h.last_name=? AND h.suffix=? AND h.birthdate=? AND h.barangay_id=? AND h.is_archived=0
                AND h.date_recorded<=? AND (COALESCE(v.is_deceased,0)=0 OR (v.death_date IS NOT NULL AND ?<=v.death_date))
                ${target===undefined?'':'AND h.id=?'}
                ORDER BY h.date_recorded DESC,h.id DESC LIMIT 50`,[first,last,suffix,input.birthdate,Number(input.barangay_id),date,date,...(target===undefined?[]:[target])]);
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
            let query = `SELECT h.*,DATE_FORMAT(h.birthdate,'%Y-%m-%d') AS birthdate,DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,DATE_FORMAT((SELECT MAX(cv.consultation_date) FROM case_visits cv WHERE cv.case_id=h.id),'%Y-%m-%d') AS last_consultation, b.name as barangay_name,COALESCE(v.is_deceased,0) AS is_deceased,DATE_FORMAT(v.death_date,'%Y-%m-%d') AS death_date FROM health_cases h LEFT JOIN barangays b ON h.barangay_id = b.id LEFT JOIN resident_vital_status v ON v.resident_id=h.resident_id WHERE ${historical ? '1=1' : 'h.is_archived = FALSE'}`;
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
                        SELECT r.*,DATE_FORMAT(r.birthdate,'%Y-%m-%d') AS birthdate, ${vitalSelect}, (SELECT COUNT(*) FROM health_cases h WHERE h.resident_id=r.id) as case_count
                        FROM residents r
                        ${vitalJoins}
                        WHERE 1=1
                    `;
            let params = [];
            if (barangay_id && barangay_id !== 'null') {
                query += ` AND r.barangay_id = ?`;
                params.push(barangay_id);
            }
            query += ` ORDER BY r.last_name ASC, r.first_name ASC`;

            const [rows] = await db.execute(query, params);
            return rows;
        },

        async residentById(residentId) {
            const [residentRows] = await db.execute(`SELECT r.*,DATE_FORMAT(r.birthdate,'%Y-%m-%d') AS birthdate,${vitalSelect} FROM residents r ${vitalJoins} WHERE r.id=?`, [residentId]);
            return residentRows;
        },

        async residentHistory(residentId, user) {
            const historySql =
                "SELECT h.*,DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,DATE_FORMAT(h.birthdate,'%Y-%m-%d') AS birthdate,DATE_FORMAT((SELECT MAX(cv.consultation_date) FROM case_visits cv WHERE cv.case_id=h.id),'%Y-%m-%d') AS last_consultation FROM health_cases h WHERE resident_id = ?" +
                (user.role === 'bhw' ? ' AND barangay_id = ?' : '') +
                ' ORDER BY date_recorded DESC';
            const [historyRows] = await db.execute(
                historySql,
                user.role === 'bhw' ? [residentId, user.barangay_id] : [residentId]
            );
            return historyRows;
        },

        async residentVisits(residentId, user) {
            const [rows] = await db.execute(`SELECT v.*,h.disease,h.disease_review_status,h.disease_reported,
                DATE_FORMAT(v.consultation_date,'%Y-%m-%d') AS consultation_date,
                TIME_FORMAT(v.consultation_time,'%H:%i') AS consultation_time
                FROM case_visits v JOIN health_cases h ON h.id=v.case_id WHERE h.resident_id=?` +
                (user.role==='bhw'?' AND h.barangay_id=?':'') + ' ORDER BY v.consultation_date DESC,v.consultation_time DESC,v.id DESC',
                user.role==='bhw'?[residentId,user.barangay_id]:[residentId]);
            return rows;
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
