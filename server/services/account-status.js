const {registrationHistory}=require('./registration-history');
const { invalid, plain } = require('./service-errors');
const { transaction } = require('./database-transaction');
const { revokeAccountSessions } = require('./session-security');

async function accountStatus(db,req,status,action,{evidence=require('./registration-evidence').store}={}){const id=req.body.temp_system_id||req.body.system_id;return transaction(db,async connection=>{
    const [rows]=await connection.execute('SELECT system_id,email,first_name,status,role FROM users WHERE system_id=? FOR UPDATE',[id]);if(!rows.length)throw invalid('Account not found.',404);
    const account=rows[0];
    if(!['admin','superadmin'].includes(req.user.role) || !['bhw','mho','admin'].includes(account.role))throw invalid('You cannot manage this account role.',403);
    const route=String(req.path).replace(/^\/api(?=\/)/,'');
    const transitions=account.role==='admin'?{
        '/superadmin/approve-admin':['pending','approved'],
        '/admin/deny-user':['pending','denied'],
        '/admin/suspend-user':['approved','suspended'],
        '/admin/restore-suspended':['suspended','approved']
    }:{
        '/admin/approve-user':['pending','approved'],
        '/admin/deny-user':['pending','denied'],
        '/admin/undo-deny':['denied','pending'],
        '/admin/suspend-user':['approved','suspended'],
        '/admin/restore-suspended':['suspended','approved']
    };
    if(account.role==='admin' && req.user.role!=='superadmin')throw invalid('Only Superadmin can manage Admin access.',403);
    const expected=transitions[route];
    // Check the freshly locked row, not the status from an earlier browser view.
    // A stale approval must never serve as a restoration of suspended access.
    if(!expected || account.status!==expected[0] || status!==expected[1])throw invalid('This action no longer matches the account status. Refresh the account list.',409);
    const review=evidence.read(account.system_id);
    if(account.status==='pending'&&review?.submission&&req.body.review_submission!==review.submission)throw invalid('This application was updated. Reopen its details and review the latest submission.',409);
    let submissionCount=review?.submission_count;
    if(status==='denied'&&review){const [metadata]=await registrationHistory(connection,[account],evidence);submissionCount=metadata.submission_count;}
    let reason;
    if(status==='denied')reason=plain(req.body.reason,'rejection reason',500);
    if(account.role==='admin') {
        if(status==='suspended') {
            reason=typeof req.body.reason==='string'?req.body.reason.trim():'';
            if(!reason || reason.length>500 || /[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(reason))throw invalid('Enter a suspension reason (1–500 characters, plain text).');
        }
    }
    if(status==='approved'&&account.status==='pending'&&evidence.read(account.system_id)&&req.body.review_confirmed!==true)throw invalid('Review the employee ID and selfie and confirm the identity check before approval.');
    await connection.execute('UPDATE users SET status=? WHERE system_id=?',[status,account.system_id]);
    await revokeAccountSessions(connection,account.system_id);
    await connection.execute('INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,?,?,?)',[req.user.system_id,req.user.role==='superadmin'?'Superadmin':'Admin',action,JSON.stringify({summary:`${action}: ${account.system_id}.`,target_type:'Account',target_id:account.system_id,outcome:'Succeeded',before:{status:account.status},after:{status},...(reason?{reason,...(submissionCount?{submission_count:submissionCount}:{})}:{})})]);return {...account,registration_submission:submissionCount,...(reason?{rejection_reason:reason,rejection_submission:submissionCount}:{})};
});}

module.exports = { accountStatus };
