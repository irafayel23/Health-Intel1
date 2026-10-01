const { caseIdForAudit } = require('./case-audit');

const MASTER_ONLY_ACTIONS = ['Login Succeeded', 'Login Failed', 'Login Rate Limited', 'Password Changed', 'Password Reset', 'Report Export Prepared', 'Report Export Failed', 'Report Data Exported'];
const roles = {bhw:'BHW', mho:'MHO', admin:'Admin', superadmin:'Superadmin'};
function actor(user) {
    return user ? {system_id:user.system_id, role:roles[user.role] || user.role} : {system_id:'Unauthenticated', role:'Unauthenticated'};
}
function createSystemAudit(db) {
    return {
        async record(user, action, details) {
            const identity = actor(user);
            // Callers construct fixed metadata. Never serialize a request, password, token or PDF rows.
            await db.execute('INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,?,?,?)',
                [identity.system_id, identity.role, action, JSON.stringify(details)]);
        }
    };
}
function auditMetadata(log) {
    let details = {};
    try { const parsed = JSON.parse(log.details); if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) details = parsed; } catch {}
    const caseId = caseIdForAudit(log);
    let targetType = details.target_type || (caseId ? 'Case' : null);
    let targetId = details.target_id || (caseId ? `REC-${caseId}` : null);
    if(!targetId && ['User Approved','User Suspended','User Request Denied','Denial Undone','Access Restored','Admin Approved'].includes(log.action)) {
        const prefix = `${log.action}: `;
        if(String(log.details).startsWith(prefix) && String(log.details).endsWith('.')) {
            targetType = 'Account'; targetId = log.details.slice(prefix.length,-1);
        }
    }
    if(!targetId && ['Disease Archived','Disease Restored'].includes(log.action)) {
        const match = /^Disease (?:Archived|Restored): #(\d+)\.$/.exec(log.details);
        if(match) { targetType='Registry entry'; targetId=match[1]; }
    }
    return {...log, case_id:caseId, target_type:targetType, target_id:targetId,
        outcome:['Succeeded','Failed','Prepared'].includes(details.outcome)?details.outcome:'Not recorded'};
}
module.exports = { createSystemAudit, auditMetadata, MASTER_ONLY_ACTIONS };
