const {store}=require('./registration-evidence');
async function registrationHistory(db,accounts,evidence=store){
 const ids=accounts.filter(a=>a.system_id&&evidence.read(a.system_id)).map(a=>a.system_id);
 if(!ids.length)return accounts;
 const [events]=await db.execute(`SELECT action,details,timestamp AS created_at FROM system_audit_logs WHERE action IN ('Registration Submitted','Registration Resubmitted','User Request Denied') AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(details),details,'{}'),'$.target_type'))='Account' AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(details),details,'{}'),'$.outcome'))='Succeeded' AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(details),details,'{}'),'$.target_id')) IN (${ids.map(()=>'?').join(',')}) ORDER BY timestamp ASC,id ASC`,ids);
 return accounts.map(account=>{
  const e=evidence.read(account.system_id);if(!e)return account;
  const history=events.flatMap(event=>{let d;try{d=JSON.parse(event.details);}catch{return [];}return d.target_id===account.system_id?[{action:event.action,date:event.created_at,reason:d.reason||null,submission:d.submission_count||null}]:[];});
  // Photo-backed requests predate counters, but every resubmission in that flow was audited.
  const count=e.submission_count||1+history.filter(h=>h.action==='Registration Resubmitted').length;
  if(account.created_at)history.unshift({action:'Application created',date:account.created_at,reason:null,submission:1});
  const previous=history.filter(h=>h.action==='User Request Denied').at(-1);
  return {...account,submission_count:count,last_submitted_at:e.submitted_at,previous_rejection_reason:previous?.reason||null,registration_history:history};
 });
}
module.exports={registrationHistory};
