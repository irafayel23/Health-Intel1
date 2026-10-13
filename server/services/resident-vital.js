const {transaction}=require('./database-transaction');
const {invalid,plain}=require('./service-errors');
const {validDate,todayInManila}=require('./patient-validation');
const {createSystemAudit}=require('./system-audit');

async function migrateResidentVital(db) {
    await db.query(`CREATE TABLE IF NOT EXISTS resident_death_reports (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,resident_id INT NOT NULL,
        reported_death_date DATE NULL,source VARCHAR(500) NOT NULL,note VARCHAR(1000) NULL,
        reported_by VARCHAR(50) NOT NULL,reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status ENUM('Pending','Confirmed','Rejected','Corrected') NOT NULL DEFAULT 'Pending',
        reviewed_by VARCHAR(50) NULL,reviewed_at TIMESTAMP NULL,review_reason VARCHAR(1000) NULL,
        INDEX idx_death_report_resident_state(resident_id,status,id),INDEX idx_death_report_state(status,id),
        CONSTRAINT fk_death_report_resident FOREIGN KEY(resident_id) REFERENCES residents(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.query(`CREATE TABLE IF NOT EXISTS resident_vital_status (
        resident_id INT NOT NULL PRIMARY KEY,is_deceased BOOLEAN NOT NULL DEFAULT FALSE,
        death_date DATE NULL,report_id INT NULL,confirmed_by VARCHAR(50) NULL,confirmed_at TIMESTAMP NULL,
        version INT NOT NULL DEFAULT 0,
        CONSTRAINT fk_vital_resident FOREIGN KEY(resident_id) REFERENCES residents(id),
        CONSTRAINT fk_vital_report FOREIGN KEY(report_id) REFERENCES resident_death_reports(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
function deathDate(value,birthdate) {
    if(value===undefined||value===null||value==='')return null;
    if(!validDate(value)||value<'1900-01-01'||value>todayInManila()||(birthdate&&value<String(birthdate).slice(0,10)))throw invalid('Enter a death date from 1900 through today, on or after the birthdate, or leave it blank if unknown.');
    return value;
}
async function lockResident(connection,id,user) {
    if(!Number.isSafeInteger(id)||id<1)throw invalid('Select a valid resident.');
    const [rows]=await connection.execute(`SELECT id,barangay_id,DATE_FORMAT(birthdate,'%Y-%m-%d') AS birthdate FROM residents WHERE id=?${user.role==='bhw'?' AND barangay_id=?':''} FOR UPDATE`,user.role==='bhw'?[id,user.barangay_id]:[id]);
    if(!rows.length)throw invalid('Resident not found.',404);
    return rows[0];
}
async function vitalRow(connection,id) {
    await connection.execute('INSERT IGNORE INTO resident_vital_status(resident_id) VALUES(?)',[id]);
    return (await connection.execute(`SELECT *,DATE_FORMAT(death_date,'%Y-%m-%d') AS death_date FROM resident_vital_status WHERE resident_id=? FOR UPDATE`,[id]))[0][0];
}
async function guardResidentVisit(connection,residentId,date) {
    if(!residentId)return;
    // Every death confirmation/correction and visit save locks the resident first.
    await connection.execute('SELECT id FROM residents WHERE id=? FOR UPDATE',[residentId]);
    const [rows]=await connection.execute(`SELECT is_deceased,DATE_FORMAT(death_date,'%Y-%m-%d') AS death_date FROM resident_vital_status WHERE resident_id=? FOR UPDATE`,[residentId]);
    const status=rows[0];
    if(status?.is_deceased&&(!status.death_date||date>status.death_date))throw invalid(status.death_date?`This resident is confirmed deceased. Only historical records dated on or before ${status.death_date} can be added.`:'This resident is confirmed deceased with an unknown death date. MHO must record the date before another historical consultation can be added.',409);
}
const vitalSelect=`COALESCE(v.is_deceased,0) AS is_deceased,DATE_FORMAT(v.death_date,'%Y-%m-%d') AS death_date,
    COALESCE(v.version,0) AS vital_version,v.confirmed_by,DATE_FORMAT(v.confirmed_at,'%Y-%m-%d') AS death_confirmed_date,
    dr.status AS death_report_status,dr.id AS death_report_id,dr.review_reason AS death_report_review_reason,
    dr.source AS death_source`;
const vitalJoins=`LEFT JOIN resident_vital_status v ON v.resident_id=r.id
    LEFT JOIN resident_death_reports dr ON dr.id=(SELECT MAX(d.id) FROM resident_death_reports d WHERE d.resident_id=r.id)`;

async function guardResidentIdentity(connection,patient,barangayId) {
    const [rows]=await connection.execute('SELECT id FROM residents WHERE first_name=? AND last_name=? AND birthdate=? AND suffix=? AND barangay_id=? FOR UPDATE',[patient.first_name,patient.last_name,patient.birthdate,patient.suffix,barangayId]);
    for(const row of rows)await guardResidentVisit(connection,row.id,patient.date_recorded);
}
function createResidentVital(db) {
    return {
        async report(user,id,input) {
            if(user.role!=='bhw')throw invalid('Only BHW can submit a resident death report.',403);
            const source=plain(input.source,'confirmation source',500),note=plain(input.note,'report note',1000,true);
            return transaction(db,async c=>{
                const resident=await lockResident(c,id,user),date=deathDate(input.death_date,resident.birthdate),current=await vitalRow(c,id);
                if(current.is_deceased)throw invalid('This resident is already confirmed deceased.',409);
                const [pending]=await c.execute("SELECT id FROM resident_death_reports WHERE resident_id=? AND status='Pending' FOR UPDATE",[id]);
                if(pending.length)throw invalid('A death report is already awaiting MHO review.',409);
                const [saved]=await c.execute('INSERT INTO resident_death_reports(resident_id,reported_death_date,source,note,reported_by) VALUES(?,?,?,?,?)',[id,date,source,note||null,user.system_id]);
                await createSystemAudit(c).record(user,'Resident Death Reported',{summary:'Resident death report submitted for MHO confirmation.',outcome:'Succeeded',target_type:'Resident',target_id:String(id),report_id:saved.insertId,death_date:date});
                return {id:saved.insertId,status:'Pending'};
            });
        },
        async review(user,id,input) {
            if(user.role!=='mho')throw invalid('Only MHO can review resident death reports.',403);
            if(!Number.isSafeInteger(id)||id<1||!['confirm','reject'].includes(input.action))throw invalid('Select a valid report and review action.');
            const reason=plain(input.reason,'review reason',1000);if(reason.length<5)throw invalid('Explain the review decision using at least five characters.');
            return transaction(db,async c=>{
                const [lookup]=await c.execute('SELECT resident_id FROM resident_death_reports WHERE id=?',[id]);if(!lookup.length)throw invalid('Report not found.',404);
                const resident=await lockResident(c,lookup[0].resident_id,user),current=await vitalRow(c,resident.id);
                const [[report]]=await c.execute("SELECT *,DATE_FORMAT(reported_death_date,'%Y-%m-%d') AS reported_death_date FROM resident_death_reports WHERE id=? FOR UPDATE",[id]);
                if(report.status!=='Pending'||current.is_deceased)throw invalid('This report has changed. Refresh the review list.',409);
                const date=input.action==='confirm'?deathDate(input.death_date===undefined?report.reported_death_date:input.death_date,resident.birthdate):null;
                const status=input.action==='confirm'?'Confirmed':'Rejected';
                await c.execute('UPDATE resident_death_reports SET status=?,reviewed_by=?,reviewed_at=NOW(),review_reason=? WHERE id=?',[status,user.system_id,reason,id]);
                if(status==='Confirmed')await c.execute('UPDATE resident_vital_status SET is_deceased=TRUE,death_date=?,report_id=?,confirmed_by=?,confirmed_at=NOW(),version=version+1 WHERE resident_id=?',[date,id,user.system_id,resident.id]);
                await createSystemAudit(c).record(user,status==='Confirmed'?'Resident Death Confirmed':'Resident Death Report Rejected',{summary:`Resident death report ${status.toLowerCase()}; disease cases and visits retained.`,outcome:'Succeeded',target_type:'Resident',target_id:String(resident.id),report_id:id,death_date:date,reason});
                return {status,resident_id:resident.id};
            });
        },
        async correct(user,id,input) {
            if(user.role!=='mho')throw invalid('Only MHO can correct a confirmed resident death status.',403);
            if(!['clear-deceased','correct-date'].includes(input.action)||!Number.isSafeInteger(input.version))throw invalid('Select an action and reopen the latest resident status.');
            const reason=plain(input.reason,'correction reason',1000);if(reason.length<5)throw invalid('Explain the correction using at least five characters.');
            return transaction(db,async c=>{
                const resident=await lockResident(c,id,user),current=await vitalRow(c,id);
                if(!current.is_deceased||input.version!==current.version)throw invalid('This resident status has changed. Refresh and reopen it.',409);
                const date=input.action==='correct-date'?deathDate(input.death_date,resident.birthdate):null;
                if(input.action==='correct-date'&&date===current.death_date)throw invalid('The death date has not changed.');
                const deceased=input.action==='correct-date';
                await c.execute('UPDATE resident_vital_status SET is_deceased=?,death_date=?,version=version+1 WHERE resident_id=?',[deceased,date,id]);
                if(!deceased)await c.execute("UPDATE resident_death_reports SET status='Corrected' WHERE id=?",[current.report_id]);
                await createSystemAudit(c).record(user,'Resident Death Status Corrected',{summary:'Confirmed resident death status corrected; clinical history retained.',outcome:'Succeeded',target_type:'Resident',target_id:String(id),reason,before:{is_deceased:Boolean(current.is_deceased),death_date:current.death_date},after:{is_deceased:deceased,death_date:date}});
                return {is_deceased:deceased,death_date:date};
            });
        },
        async list(query={},exportAll=false) {
            const view=query.view||'pending',page=Number(query.page||1),barangay=query.barangay_id||'all';
            if(!['pending','deceased'].includes(view)||!Number.isSafeInteger(page)||page<1||page>1000000||typeof barangay!=='string'||(barangay!=='all'&&!/^[1-9]\d*$/.test(barangay)))throw invalid('Select valid resident-status filters.');
            const params=[],scope=barangay==='all'?'':' AND r.barangay_id=?';if(scope)params.push(Number(barangay));
            const from=view==='pending'?`resident_death_reports dr JOIN residents r ON r.id=dr.resident_id JOIN barangays b ON b.id=r.barangay_id WHERE dr.status='Pending'${scope}`:`resident_vital_status v JOIN residents r ON r.id=v.resident_id JOIN barangays b ON b.id=r.barangay_id LEFT JOIN resident_death_reports dr ON dr.id=v.report_id WHERE v.is_deceased=TRUE${scope}`;
            const [[count]]=await db.execute('SELECT COUNT(*) AS total FROM '+from,params);
            const [[people]]=await db.execute(`SELECT COUNT(*) AS total FROM resident_vital_status v JOIN residents r ON r.id=v.resident_id WHERE v.is_deceased=TRUE${scope}`,params);
            const selected=view==='pending'?`dr.id AS id,dr.resident_id,dr.source,dr.note,dr.reported_by,DATE_FORMAT(dr.reported_death_date,'%Y-%m-%d') AS death_date`:`r.id AS id,r.id AS resident_id,v.version,dr.source,DATE_FORMAT(v.death_date,'%Y-%m-%d') AS death_date,v.confirmed_by,DATE_FORMAT(v.confirmed_at,'%Y-%m-%d') AS confirmed_date`;
            const pageCount=Math.max(1,Math.ceil(count.total/25)),bounded=Math.min(page,pageCount);
            const [rows]=await db.execute(`SELECT ${selected},r.patient_name,b.name AS barangay_name,DATE_FORMAT(r.birthdate,'%Y-%m-%d') AS birthdate FROM ${from} ORDER BY ${view==='pending'?'dr.id':'r.id'} DESC${exportAll?'':` LIMIT 25 OFFSET ${(bounded-1)*25}`}`,params);
            return {data:rows,total:count.total,confirmed_total:people.total,page:bounded,page_count:pageCount};
        }
    };
}
module.exports={migrateResidentVital,createResidentVital,guardResidentVisit,guardResidentIdentity,vitalSelect,vitalJoins};
