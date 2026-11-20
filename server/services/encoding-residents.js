const {invalid}=require('./service-errors');
const {textField}=require('./patient-validation');
function positiveId(value,label){if(!['string','number'].includes(typeof value)||!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)<1)throw invalid('Select a valid '+label+'.');return Number(value);}
async function searchResidents(db,user,query={}){
 if(!['bhw','mho'].includes(user.role))throw invalid('Access denied.',403);
 const scoped=user.role==='bhw'?positiveId(user.barangay_id,'assigned barangay'):null;
 if(scoped&&query.barangay_id!==undefined&&positiveId(query.barangay_id,'barangay')!==scoped)throw invalid('You can only access your assigned barangay.',403);
 const id=query.id===undefined?null:positiveId(query.id,'resident');
 let q='';try{q=textField(query.q||'','Patient search',100,false);}catch(e){throw invalid(e.message);}
 if(!id&&q.length<2)return [];
 const conditions=[],params=[];
 if(scoped){conditions.push('r.barangay_id=?');params.push(scoped);}
 else if(query.barangay_id){conditions.push('r.barangay_id=?');params.push(positiveId(query.barangay_id,'barangay'));}
 if(id){conditions.push('r.id=?');params.push(id);}else{
  const like='%'+q.replace(/[!%_]/g,'!$&')+'%';
  conditions.push("(CONCAT_WS(' ',r.first_name,r.last_name) LIKE ? ESCAPE '!' OR CONCAT_WS(' ',r.last_name,r.first_name) LIKE ? ESCAPE '!' OR CONCAT('RES-',r.id)=?)");params.push(like,like,q.toUpperCase());
 }
 const [rows]=await db.execute(`SELECT r.id,r.first_name,r.last_name,COALESCE(r.suffix,'') AS suffix,
 DATE_FORMAT(r.birthdate,'%Y-%m-%d') AS birthdate,r.purok,r.barangay_id,b.name AS barangay_name,
 (SELECT COUNT(*) FROM health_cases h WHERE h.resident_id=r.id AND h.is_archived=0) AS case_count
 FROM residents r JOIN barangays b ON b.id=r.barangay_id WHERE ${conditions.join(' AND ')}
 ORDER BY r.last_name,r.first_name,r.id LIMIT 20`,params);
 return rows;
}
async function selectedResident(connection,input,patient,barangayId){
 if(input.patient_mode!==undefined&&!['new','existing'].includes(input.patient_mode))throw invalid('Choose New patient or Existing patient.');
 if(input.patient_mode==='existing'&&input.resident_id==null)throw invalid('Select an existing patient.');
 if(input.patient_mode==='new'&&input.resident_id!=null)throw invalid('New patient registration cannot contain an existing resident ID.');
 if(input.resident_id==null)return null;
 const id=positiveId(input.resident_id,'resident');
 const [rows]=await connection.execute("SELECT id,first_name,last_name,COALESCE(suffix,'') AS suffix,DATE_FORMAT(birthdate,'%Y-%m-%d') AS birthdate,purok,barangay_id FROM residents WHERE id=? AND barangay_id=? FOR UPDATE",[id,barangayId]);
 const row=rows[0];if(!row)throw invalid('The selected patient is unavailable in this barangay. Search again.',404);
 const norm=v=>String(v||'').trim().replace(/\s+/gu,' ').toLocaleLowerCase('en');
 if(['first_name','last_name','suffix','birthdate','purok'].some(key=>norm(row[key])!==norm(patient[key])))throw invalid('The selected patient details have changed. Search again before saving.',409);
 return row;
}
const { createHash } = require('node:crypto');

async function reviewNewResident(connection, input, patient, barangayId, actorRole) {
    if (input.patient_mode !== 'new') return;

    const names = [patient.first_name, patient.last_name].map(name => name.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en'));
    // A shared birthdate and either name component are a prompt for human review.
    // A first given name can still match when a middle name was entered with it.
    const scope = actorRole === 'MHO' ? [] : [barangayId];
    const [rows] = await connection.execute(`
        SELECT r.id, r.first_name, r.last_name, COALESCE(r.suffix, '') AS suffix,
            DATE_FORMAT(r.birthdate, '%Y-%m-%d') AS birthdate, r.purok, b.name AS barangay_name
        FROM residents r JOIN barangays b ON b.id = r.barangay_id
        WHERE r.birthdate = ? ${scope.length ? 'AND r.barangay_id = ?' : ''}
          AND (LOWER(TRIM(REGEXP_REPLACE(r.last_name, '[[:space:]]+', ' '))) = ?
               OR LOWER(SUBSTRING_INDEX(TRIM(REGEXP_REPLACE(r.first_name, '[[:space:]]+', ' ')), ' ', 1)) = ?)
        ORDER BY r.id LIMIT 21 FOR UPDATE`,
    [patient.birthdate, ...scope, names[1], names[0].split(' ')[0]]);
    if (!rows.length) return false;

    const review = createHash('sha256').update(JSON.stringify([
        actorRole, barangayId, names, patient.suffix, patient.birthdate, patient.purok, rows
    ])).digest('hex');
    if (rows.length <= 20 && input.resident_review === review) return true;

    const error = invalid(rows.length > 20
        ? 'Too many possible matches. Search by resident ID or ask an authorized staff member to verify the patient.'
        : 'Review these possible patient matches before creating a new profile.', 409);
    error.code = 'RESIDENT_REVIEW_REQUIRED';
    error.matches = rows.slice(0, 20);
    error.review = rows.length <= 20 ? review : null;
    throw error;
}

module.exports={searchResidents,selectedResident,positiveId,reviewNewResident};
