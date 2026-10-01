const { invalid, respond } = require('./service-errors');
const { transaction } = require('./database-transaction');

function archiveHandler(db,table,archived){return async(req,res)=>{try{
    await transaction(db,async connection=>{
        const scoped=table==='health_cases'&&req.user.role==='bhw';
        const params=scoped?[req.params.id,req.user.barangay_id]:[req.params.id];
        const filter='id=?'+(scoped?' AND barangay_id=?':'');
        const [rows]=await connection.execute(`SELECT id,is_archived FROM ${table} WHERE ${filter} FOR UPDATE`,params);if(!rows.length)throw invalid('Record not found.',404);
        if(table==='disease_registry')await connection.execute(`UPDATE disease_registry SET is_archived=?,status=?,deleted_at=${archived?'NOW()':'NULL'} WHERE ${filter}`,[archived,archived?'Archived':'Active',...params]);
        else await connection.execute(`UPDATE health_cases SET is_archived=?,deleted_at=${archived?'NOW()':'NULL'} WHERE ${filter}`,[archived,...params]);
        const role={bhw:'BHW',admin:'Admin',superadmin:'Superadmin'}[req.user.role];
        const action=(table==='health_cases'?'Record':'Disease')+(archived?' Archived':' Restored');
        const details={summary:`${action}: #${req.params.id}.`,outcome:'Succeeded',target_type:table==='health_cases'?'Case':'Registry entry',target_id:table==='health_cases'?`REC-${req.params.id}`:String(req.params.id),before:{is_archived:Boolean(rows[0].is_archived)},after:{is_archived:archived},...(table==='health_cases'?{case_id:Number(req.params.id)}:{})};
        await connection.execute('INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,?,?,?)',[req.user.system_id,role,action,JSON.stringify(details)]);
    });res.json({success:true,message:archived?'Record archived.':'Record restored.'});
}catch(e){respond(res,e,'The record could not be changed.');}};}

module.exports = { archiveHandler };
