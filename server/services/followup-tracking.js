const {invalid}=require('./service-errors');
const {todayInManila}=require('./patient-validation');

// Consultation dates determine chronology; the last saved visit breaks same-day ties.
// A backdated entry cannot reactivate an older plan. No consultation or plan is rewritten.
async function listFollowups(db,user,input={}) {
    if(!['bhw','mho'].includes(user.role))throw invalid('Your role does not have access to follow-up tracking.',403);
    const bucket=input.bucket||'today';
    if(!['today','upcoming','past'].includes(bucket))throw invalid('Select a valid follow-up filter.');
    if(input.q!==undefined&&typeof input.q!=='string')throw invalid('Enter a text search.');
    const q=(input.q||'').trim();if(q.length>100)throw invalid('Search using no more than 100 characters.');
    const positive=(value,label)=>{if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)<1)throw invalid('Select a valid '+label+'.');return Number(value);};
    const page=input.page===undefined?1:positive(input.page,'page');
    const barangay=user.role==='bhw'?positive(user.barangay_id,'assigned barangay'):input.barangay_id&&input.barangay_id!=='all'?positive(input.barangay_id,'barangay'):null;
    const today=todayInManila(),params=[];
    const conditions=["h.is_archived=0", "h.status<>'Deceased'", 'COALESCE(s.is_deceased,0)=0', 'v.next_followup_date>=v.consultation_date'];
    if(barangay){conditions.push('h.barangay_id=?');params.push(barangay);}
    if(q){const pattern='%'+q.replace(/[!%_]/g,c=>'!'+c)+'%';conditions.push("(COALESCE(r.patient_name,h.patient_name) LIKE ? ESCAPE '!' OR CONCAT('REC-',h.id) LIKE ? ESCAPE '!' OR CONCAT('RES-',r.id) LIKE ? ESCAPE '!')");params.push(pattern,pattern,pattern);}
    const from=`FROM health_cases h JOIN case_visits v ON v.id=(SELECT latest.id FROM case_visits latest WHERE latest.case_id=h.id ORDER BY latest.consultation_date DESC,latest.id DESC LIMIT 1) LEFT JOIN residents r ON r.id=h.resident_id
        LEFT JOIN resident_vital_status s ON s.resident_id=r.id LEFT JOIN barangays b ON b.id=h.barangay_id WHERE ${conditions.join(' AND ')}`;
    const [[totals]]=await db.execute(`SELECT COALESCE(SUM(v.next_followup_date=?),0) today,COALESCE(SUM(v.next_followup_date>?),0) upcoming,COALESCE(SUM(v.next_followup_date<?),0) past ${from}`,[today,today,today,...params]);
    const counts=Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,Number(value)]));
    const total=counts[bucket],pages=Math.max(1,Math.ceil(total/12)),current=Math.min(page,pages),operator={today:'=',upcoming:'>',past:'<'}[bucket];
    const [rows]=await db.execute(`SELECT h.id case_id,h.resident_id,COALESCE(r.patient_name,h.patient_name) patient_name,
        h.disease,h.disease_reported,h.disease_review_status,h.status,h.barangay_id,b.name barangay_name,COALESCE(r.purok,h.purok) purok,
        v.id visit_id,DATE_FORMAT(v.consultation_date,'%Y-%m-%d') consultation_date,DATE_FORMAT(v.next_followup_date,'%Y-%m-%d') next_followup_date,v.followup_instructions,
        r.first_name rf,r.last_name rl,r.suffix rs,DATE_FORMAT(r.birthdate,'%Y-%m-%d') rb,r.barangay_id rg,
        h.first_name hf,h.last_name hl,h.suffix hs,DATE_FORMAT(h.birthdate,'%Y-%m-%d') hb
        ${from} AND v.next_followup_date${operator}? ORDER BY v.next_followup_date,h.id LIMIT 12 OFFSET ${(current-1)*12}`,[...params,today]);
    const same=(a,b)=>String(a||'').trim().toLocaleLowerCase('en')===String(b||'').trim().toLocaleLowerCase('en');
    const data=rows.map(({rf,rl,rs,rb,rg,hf,hl,hs,hb,...row})=>{
        const can_record=Boolean(row.resident_id&&rf&&rl&&rb&&row.purok&&rg===row.barangay_id&&same(rf,hf)&&same(rl,hl)&&same(rs,hs)&&rb===hb);
        return {...row,can_record,blocked_reason:can_record?'':'Review the resident link and recorded identity before recording a return visit.'};
    });
    return {data,counts,total,page:current,page_count:pages,page_size:12,today,bucket};
}
module.exports={listFollowups};
