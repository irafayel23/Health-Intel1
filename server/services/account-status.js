const { invalid } = require('./service-errors');
const { transaction } = require('./database-transaction');

async function accountStatus(db,req,status,action){const id=req.body.temp_system_id||req.body.system_id;return transaction(db,async connection=>{
    const [rows]=await connection.execute('SELECT system_id,email,first_name FROM users WHERE system_id=? FOR UPDATE',[id]);if(!rows.length)throw invalid('Account not found.',404);
    await connection.execute('UPDATE users SET status=? WHERE system_id=?',[status,id]);
    await connection.execute('INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,?,?,?)',[req.user.system_id,req.user.role==='superadmin'?'Superadmin':'Admin',action,`${action}: ${id}.`]);return rows[0];
});}

module.exports = { accountStatus };
