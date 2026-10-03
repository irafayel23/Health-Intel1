const { invalid } = require('./service-errors');
const { transaction } = require('./database-transaction');

async function accountStatus(db,req,status,action){const id=req.body.temp_system_id||req.body.system_id;return transaction(db,async connection=>{
    const [rows]=await connection.execute('SELECT system_id,email,first_name,status,role FROM users WHERE system_id=? FOR UPDATE',[id]);if(!rows.length)throw invalid('Account not found.',404);
    const account=rows[0];
    let reason;
    if(account.role==='admin') {
        if(req.user.role!=='superadmin')throw invalid('Only Superadmin can manage Admin access.',403);
        const transitions={
            '/superadmin/approve-admin': ['pending','approved'],
            '/admin/suspend-user': ['approved','suspended'],
            '/admin/restore-suspended': ['suspended','approved']
        };
        const expected=transitions[String(req.path).replace(/^\/api(?=\/)/,'')];
        if(!expected || account.status!==expected[0] || status!==expected[1])throw invalid('This action no longer matches the account status. Refresh Admin Access.',409);
        if(status==='suspended') {
            reason=typeof req.body.reason==='string'?req.body.reason.trim():'';
            if(!reason || reason.length>500 || /[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(reason))throw invalid('Enter a suspension reason (1–500 characters, plain text).');
        }
    }
    await connection.execute('UPDATE users SET status=? WHERE system_id=?',[status,account.system_id]);
    await connection.execute('INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,?,?,?)',[req.user.system_id,req.user.role==='superadmin'?'Superadmin':'Admin',action,JSON.stringify({summary:`${action}: ${account.system_id}.`,target_type:'Account',target_id:account.system_id,outcome:'Succeeded',before:{status:account.status},after:{status},...(reason?{reason}:{})})]);return account;
});}

module.exports = { accountStatus };
