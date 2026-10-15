const {invalid}=require('./service-errors');
const {createCaseRecords}=require('./case-records');

function positive(value,label) {
    if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)<1)throw invalid('Select a valid '+label+'.');
    return Number(value);
}
function createMhoPatients(db) {
    const records=createCaseRecords(db);
    return {
        async list(input) {
            const page=input.page===undefined?1:positive(input.page,'page');
            if(typeof input.q!=='undefined' && typeof input.q!=='string')throw invalid('Enter a text search.');
            const search=(input.q||'').trim();if(search.length>100)throw invalid('Search using no more than 100 characters.');
            const barangay=input.barangay_id && input.barangay_id!=='all'?positive(input.barangay_id,'barangay'):null;
            const vital=input.vital||'all';if(!['all','living','deceased'].includes(vital))throw invalid('Select a valid resident status.');
            const base=`SELECT 'resident' AS kind,r.id,r.patient_name,r.first_name,r.last_name,r.suffix,
                DATE_FORMAT(r.birthdate,'%Y-%m-%d') AS birthdate,r.age,r.purok,r.barangay_id,b.name AS barangay_name,
                COALESCE(v.is_deceased,0) AS is_deceased,DATE_FORMAT(v.death_date,'%Y-%m-%d') AS death_date
                FROM residents r LEFT JOIN barangays b ON b.id=r.barangay_id LEFT JOIN resident_vital_status v ON v.resident_id=r.id
                UNION ALL
                SELECT 'legacy',h.id,h.patient_name,h.first_name,h.last_name,h.suffix,
                DATE_FORMAT(h.birthdate,'%Y-%m-%d'),h.age,h.purok,h.barangay_id,b.name,NULL,NULL
                FROM health_cases h LEFT JOIN barangays b ON b.id=h.barangay_id WHERE h.resident_id IS NULL`;
            const conditions=[],params=[];
            if(barangay){conditions.push('d.barangay_id=?');params.push(barangay);}
            if(vital!=='all'){conditions.push('d.kind=\'resident\' AND d.is_deceased=?');params.push(vital==='deceased'?1:0);}
            if(search){conditions.push("(COALESCE(d.patient_name,CONCAT_WS(' ',d.first_name,d.last_name,d.suffix)) LIKE ? ESCAPE '!' OR CONCAT(IF(d.kind='resident','RES-','REC-'),d.id) LIKE ? ESCAPE '!')");const pattern='%'+search.replace(/[!%_]/g,c=>'!'+c)+'%';params.push(pattern,pattern);}
            const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
            const [[count]]=await db.execute('SELECT COUNT(*) AS total FROM ('+base+') d'+where,params);
            const pages=Math.max(1,Math.ceil(count.total/25)),current=Math.min(page,pages);
            const [rows]=await db.execute('SELECT d.* FROM ('+base+') d'+where+' ORDER BY d.last_name,d.first_name,d.kind,d.id LIMIT 25 OFFSET '+((current-1)*25),params);
            // History totals are calculated only for this page, rather than loading every patient history.
            for(const kind of ['resident','legacy']){
                const selected=rows.filter(row=>row.kind===kind);if(!selected.length)continue;
                const key=kind==='resident'?'resident_id':'id';
                const [stats]=await db.execute(`SELECT h.${key} AS lookup_id,COUNT(DISTINCT h.id) AS case_count,
                    COUNT(DISTINCT CASE WHEN h.status='Active' AND h.is_archived=0 THEN h.id END) AS active_count,
                    COUNT(DISTINCT CASE WHEN h.is_archived=1 THEN h.id END) AS archived_count,
                    DATE_FORMAT(MAX(CASE WHEN v.consultation_date IS NULL THEN h.date_recorded WHEN h.date_recorded IS NULL THEN v.consultation_date ELSE GREATEST(v.consultation_date,h.date_recorded) END),'%Y-%m-%d') AS last_consultation
                    FROM health_cases h LEFT JOIN case_visits v ON v.case_id=h.id WHERE h.${key} IN (${selected.map(()=>'?').join(',')}) GROUP BY h.${key}`,selected.map(row=>row.id));
                const byId=new Map(stats.map(row=>[row.lookup_id,row]));
                for(const row of selected)Object.assign(row,{case_count:0,active_count:0,archived_count:0,last_consultation:null},byId.get(row.id)||{});
            }
            return {data:rows,total:Number(count.total),page:current,page_count:pages,page_size:25};
        },
        async dossier(kind,value) {
            const id=positive(value,kind==='resident'?'resident':'case');
            if(kind==='resident'){
                const rows=await records.residentById(id);if(!rows.length)throw invalid('Resident profile not found.',404);
                const [barangays]=await db.execute('SELECT name FROM barangays WHERE id=?',[rows[0].barangay_id]);
                return {kind,resident:{...rows[0],barangay_name:barangays[0]?.name||'Not recorded'},history:await records.residentHistory(id,{role:'mho'}),visits:await records.residentVisits(id,{role:'mho'})};
            }
            const cases=await records.caseById(id);if(!cases.length||cases[0].resident_id!==null)throw invalid('Unlinked historical case not found. Refresh the directory.',404);
            const [visits]=await db.execute("SELECT v.*,DATE_FORMAT(v.consultation_date,'%Y-%m-%d') AS consultation_date,TIME_FORMAT(v.consultation_time,'%H:%i') AS consultation_time,h.disease,h.disease_reported,h.disease_review_status FROM case_visits v JOIN health_cases h ON h.id=v.case_id WHERE v.case_id=? ORDER BY v.consultation_date DESC,v.id DESC",[id]);
            return {kind,resident:{...cases[0],is_deceased:null,death_date:null},history:cases,visits};
        }
    };
}
module.exports={createMhoPatients};
