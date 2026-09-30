const { invalid, respond } = require('./service-errors');
const { transaction } = require('./database-transaction');
const { archiveHandler } = require('./record-archive');
const { caseAuditDetails } = require('./case-audit');

function createCaseLifecycleHandlers(db) {
    return {
        archiveCase: archiveHandler(db, 'health_cases', true),
        restoreCase: archiveHandler(db, 'health_cases', false),
    async status(req,res){try{
        const status=req.body.new_status;if(!['Active','Cleared','Deceased'].includes(status))throw invalid('Select a valid case status.');
        const note=req.body.remarks===undefined?'':req.body.remarks;
        if(typeof note!=='string'||note.length>4000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(note))throw invalid('Follow-up remarks must be text of at most 4,000 characters.');
        await transaction(db,async connection=>{
            const [rows]=await connection.execute('SELECT remarks,status FROM health_cases WHERE id=? AND barangay_id=? AND is_archived=FALSE FOR UPDATE',[req.params.id,req.user.barangay_id]);if(!rows.length)throw invalid('Active record not found in your assigned barangay.',404);
            let remarks=rows[0].remarks||'';
            if(note.trim()){const timestamp=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}).format(new Date());remarks+=(remarks?'\n\n':'')+`[${timestamp} PHT | ${req.user.system_id} | ${status}]\n`+note.trim();if(Buffer.byteLength(remarks,'utf8')>65000)throw invalid('This record has too many remarks. Contact the administrator.');}
            await connection.execute('UPDATE health_cases SET status=?,remarks=? WHERE id=? AND barangay_id=?',[status,remarks,req.params.id,req.user.barangay_id]);
            await connection.execute("INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,'BHW','Status Updated',?)",[req.user.system_id,caseAuditDetails(Number(req.params.id),`Case #REC-${req.params.id} · Status: ${rows[0].status} → ${status}${note.trim()?' · Follow-up note appended':''}.`,{before:{status:rows[0].status},after:{status}})]);
        });res.json({success:true,message:'Status updated; any entered follow-up note was saved.'});
    }catch(e){respond(res,e,'The record could not be updated.');}}
    };
}

module.exports = { createCaseLifecycleHandlers };
