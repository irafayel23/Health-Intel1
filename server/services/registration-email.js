const {escapeHtml}=require('../config/security-config');

function registrationEmail(decision,account){
 if(!['approved','denied'].includes(decision))throw Error('Invalid registration email decision');
 const approved=decision==='approved',color=approved?'#047857':'#9a3412',tint=approved?'#ecfdf5':'#fff7ed';
 const title=approved?'Your account is approved':'Registration not approved';
 const count=account.rejection_submission||account.registration_submission;
 const submission=Number.isSafeInteger(count)&&count>0?'Submission '+count:null;
 const id=String(account.system_id||'Not recorded'),name=String(account.first_name||'Applicant');
 const role={bhw:'Barangay Health Worker',mho:'Municipal Health Officer',admin:'Administrator'}[account.role]||null;
 const reason=String(account.rejection_reason||'Please contact your account administrator for the correction details.');
 const description=approved?'Your Health-Intel access request has been reviewed and approved. You can now sign in.':'Your Health-Intel access request'+(submission?' — '+submission+' —':'')+' was declined. Please correct the item below before submitting again.';
 const next=approved?'Open your Health-Intel sign-in page. Enter your System ID and the password you created during registration.':'Correct the information or photos described above, then open Register account in Health-Intel. You may register again using the same Google account.';
 const rows=[['System ID',id],...(role?[['Role',role]]:[]),...(submission?[['Application',submission]]:[])];
 const details=rows.map(([label,value])=>'<tr><th scope="row" align="left" style="padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:400;color:#475569;">'+label+'</th><td align="right" style="padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;color:#0f172a;overflow-wrap:anywhere;">'+escapeHtml(value)+'</td></tr>').join('');
 const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f1f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:12px;">
 <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#fff;border:1px solid #dce5eb;border-top:4px solid #1d4ed8;border-radius:10px;">
 <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;"><p style="margin:0;font-size:15px;font-weight:700;color:#10364b;">MURCIA MAIN · Primary Care Facility</p><p style="margin:5px 0 0;font-size:12px;color:#475569;">HEALTH-INTEL · Account Notifications</p></td></tr>
 <tr><td style="padding:18px 20px 10px;"><h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:${color};">${title}</h1><p style="margin:0;font-size:15px;line-height:1.5;">Hello ${escapeHtml(name)}, ${approved?'you can now sign in to Health-Intel.':'your access request'+(submission?' — '+escapeHtml(submission):'')+' was declined.'}</p></td></tr>
 <tr><td style="padding:0 20px 12px;"><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${details}</table></td></tr>
 ${approved?'':'<tr><td style="padding:0 20px 14px;"><p style="margin:0;padding:12px 14px;background:'+tint+';border-left:3px solid '+color+';border-radius:6px;font-size:14px;line-height:1.6;color:#334155;overflow-wrap:anywhere;white-space:pre-line;"><strong style="color:'+color+';">Reason and correction instructions</strong><br>'+escapeHtml(reason)+'</p></td></tr>'}
 <tr><td style="padding:0 20px 16px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">${approved?'Sign in with your System ID and the password you created during registration.':'Correct the issue above, then choose <strong>Register account</strong> in Health-Intel. You may resubmit using the same Google account.'}</p></td></tr>
 <tr><td style="padding:12px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;"><p style="margin:0;font-size:11px;line-height:1.5;color:#64748b;">Automated notification · Never share your password. For help, contact your account administrator.</p></td></tr>
 </table></td></tr></table></body></html>`;
 return {subject:approved?'Health-Intel account approved':'Health-Intel registration needs correction'+(submission?' — '+submission:''),html,text:[title,'Hello '+name+',',description,...rows.map(([k,v])=>k+': '+v),...(approved?[]:['Reason: '+reason]),next,'Never share your password or send employee ID/selfie photos by email.','Automated Health-Intel account notification.'].join('\n\n'),attachments:[]};
}
module.exports={registrationEmail};
