const {invalid}=require('./service-errors');
const {pagination,pageResult}=require('./list-pagination');
async function residentDirectory(db,user,input={}){
 if(!['bhw','mho','admin'].includes(user?.role))throw invalid('Access denied.',403);
 const paging=pagination(input,12),conditions=[],params=[];
 const scope=user.role==='bhw'?user.barangay_id:input.barangay_id;
 if(user.role==='bhw'&&(!scope||(input.barangay_id&&String(input.barangay_id)!==String(scope))))throw invalid('Only your assigned barangay is available.',403);
 if(scope&&scope!=='null'){if(!/^\d+$/.test(String(scope))||!Number.isSafeInteger(+scope)||+scope<1)throw invalid('Invalid barangay.');conditions.push('r.barangay_id=?');params.push(+scope);}
 const text=(key,max)=>{const v=input[key]??'';if(typeof v!=='string'||v.length>max)throw invalid('Invalid directory filter.');return v.trim();};
 const search=text('q',100),zone=text('purok',100),age=text('age_group',12);
 if(search){conditions.push("COALESCE(r.patient_name,CONCAT_WS(' ',r.first_name,r.last_name,r.suffix)) LIKE ? ESCAPE '!'");params.push('%'+search.replace(/[!%_]/g,c=>'!'+c)+'%');}
 if(zone){conditions.push('LOWER(TRIM(r.purok))=?');params.push(zone.toLowerCase());}
 const ageSql="(CASE WHEN r.birthdate IS NOT NULL THEN TIMESTAMPDIFF(YEAR,r.birthdate,DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+08:00'))) ELSE r.age END)";
 const bands={child:[0,12],teen:[13,17],adult:[18,59],senior:[60,130]};
 if(age){if(age==='unknown')conditions.push('('+ageSql+' IS NULL OR '+ageSql+'<0 OR '+ageSql+'>130)');else if(bands[age]){conditions.push(ageSql+' BETWEEN ? AND ?');params.push(...bands[age]);}else throw invalid('Invalid age group.');}
 const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
 const [[count]]=await db.execute('SELECT COUNT(*) AS total FROM residents r'+where,params);
 const meta=pageResult(count.total,paging);
 const [rows]=await db.execute("SELECT r.*,DATE_FORMAT(r.birthdate,'%Y-%m-%d') AS birthdate,COALESCE(v.is_deceased,0) AS is_deceased,(SELECT COUNT(*) FROM health_cases h WHERE h.resident_id=r.id) AS case_count FROM residents r LEFT JOIN resident_vital_status v ON v.resident_id=r.id"+where+' ORDER BY r.last_name,r.first_name,r.id LIMIT '+meta.page_size+' OFFSET '+meta.offset,params);
 const {offset,...result}=meta;return {...result,data:rows};
}
module.exports={residentDirectory};
