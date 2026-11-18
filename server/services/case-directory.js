const {invalid}=require('./service-errors'),{pagination,pageResult}=require('./list-pagination'),{caseFields}=require('./age-groups');
async function caseDirectory(db,user,input={},archived=false){
 if(!['bhw','admin'].includes(user?.role))throw invalid('Access denied.',403);
 const paging=pagination(input,10),conditions=['h.is_archived=?'],params=[archived?1:0];
 const scope=user.role==='bhw'?user.barangay_id:input.barangay_id;
 if(user.role==='bhw'&&(!scope||(input.barangay_id&&String(input.barangay_id)!==String(scope))))throw invalid('Only your assigned barangay is available.',403);
 if(scope&&scope!=='null'){if(!/^\d+$/.test(String(scope))||!Number.isSafeInteger(+scope)||+scope<1)throw invalid('Invalid barangay.');conditions.push('h.barangay_id=?');params.push(+scope);}
 const scopeWhere=conditions.join(' AND '),scopeParams=[...params];
 for(const [field,max]of [['q',100],['purok',100],['status',30],['severity',30],['year',4],['month',2]])if(input[field]!==undefined&&(typeof input[field]!=='string'||input[field].length>max))throw invalid('Invalid case filter.');
 if(input.q){const pattern='%'+input.q.trim().replace(/[!%_]/g,c=>'!'+c)+'%';conditions.push("(h.patient_name LIKE ? ESCAPE '!' OR COALESCE(NULLIF(h.disease_reported,''),h.disease) LIKE ? ESCAPE '!')");params.push(pattern,pattern);}
 if(input.purok){conditions.push('LOWER(TRIM(h.purok))=?');params.push(input.purok.trim().toLowerCase());}
 for(const [field,allowed]of [['status',['Active','Cleared']],['severity',['Mild','Monitored','High Risk']]])if(input[field]){if(!allowed.includes(input[field]))throw invalid('Invalid case filter.');conditions.push('h.'+field+'=?');params.push(input[field]);}
 if(input.year){if(!/^\d{4}$/.test(input.year)||+input.year<1900||+input.year>9998)throw invalid('Invalid year.');conditions.push('h.date_recorded>=? AND h.date_recorded<?');params.push(input.year+'-01-01',(+input.year+1)+'-01-01');}
 if(input.month){if(!/^\d{1,2}$/.test(input.month)||+input.month<1||+input.month>12)throw invalid('Invalid month.');conditions.push('MONTH(h.date_recorded)=?');params.push(+input.month);}
 const where=' WHERE '+conditions.join(' AND ');
 const [[count]]=await db.execute('SELECT COUNT(*) AS total FROM health_cases h'+where,params),meta=pageResult(count.total,paging);
 const [rows]=await db.execute("SELECT h.*,b.name AS barangay_name,DATE_FORMAT(h.birthdate,'%Y-%m-%d') AS birthdate,DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,DATE_FORMAT((SELECT MAX(cv.consultation_date) FROM case_visits cv WHERE cv.case_id=h.id),'%Y-%m-%d') AS last_consultation FROM health_cases h LEFT JOIN barangays b ON b.id=h.barangay_id"+where+' ORDER BY h.created_at DESC,h.id DESC LIMIT '+meta.page_size+' OFFSET '+meta.offset,params);
 const [facets]=await db.execute('SELECT DISTINCT YEAR(h.date_recorded) AS year FROM health_cases h WHERE '+scopeWhere+' AND h.date_recorded IS NOT NULL ORDER BY year',scopeParams);
 const {offset,...result}=meta;return {...result,data:rows.map(caseFields),years:facets.map(r=>String(r.year))};
}
module.exports={caseDirectory};
