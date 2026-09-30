window.HealthIntelText={
    escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
    auditDetails(log){
        try { const data=JSON.parse(log.details); if(Number.isSafeInteger(data.case_id)&&data.case_id>0&&typeof data.summary==='string')return data.summary; } catch { /* Legacy text and correction entries are formatted below. */ }
        if(log.action!=='Case Corrected')return log.details;
        try{
            const data=JSON.parse(log.details);
            if(!Number.isInteger(data.case_id)||!data.before||!data.after||typeof data.reason!=='string')return log.details;
            const labels={date_recorded:'Case date',disease:'Disease',severity:'Recorded severity',age:'Age on case date'};
            const changes=Object.entries(labels).filter(([key])=>data.before[key]!==data.after[key]).map(([key,label])=>`${label}: ${data.before[key]??'Not recorded'} → ${data.after[key]??'Not recorded'}`);
            return [`Case #REC-${data.case_id}`, ...changes, `Reason: ${data.reason}`].join('\n');
        }catch{return log.details;}
    }
};
