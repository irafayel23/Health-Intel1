const CASE_ACTIONS = ['Patient Encoded', 'Walk-in Case Encoded', 'Case Corrected', 'Status Updated', 'Record Archived', 'Record Restored', 'Disease Classification Reviewed', 'Disease Clarification Requested', 'Condition Clarification Supplied', 'Registry Updated'];

// Use explicit references only. Disease/date/name matches cannot prove a link.
function caseIdForAudit(log) {
    if (!CASE_ACTIONS.includes(log.action)) return null;
    try {
        const value = JSON.parse(log.details).case_id;
        if (Number.isSafeInteger(value) && value > 0) return value;
    } catch { /* Older entries used strictly recognizable text references. */ }
    const text = String(log.details || '');
    let match;
    if (['Record Archived', 'Record Restored'].includes(log.action)) {
        match = new RegExp(`^${log.action}: #(\\d+)\\.$`).exec(text);
    } else if (log.action === 'Status Updated') {
        match = /^Updated case #REC-(\d+) to (?:Active|Cleared|Deceased)(?:; follow-up note appended)?\.$/.exec(text);
    }
    const id = match ? Number(match[1]) : null;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function withCaseReference(log) { return { ...log, case_id: caseIdForAudit(log) }; }
function caseAuditDetails(caseId, summary, extra = {}) {
    return JSON.stringify({outcome:'Succeeded',target_type:'Case',target_id:`REC-${caseId}`, ...extra, case_id: caseId, summary });
}
module.exports = { CASE_ACTIONS, caseIdForAudit, withCaseReference, caseAuditDetails };
