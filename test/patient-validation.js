function todayInManila() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    return ['year','month','day'].map(type => parts.find(part=>part.type===type).value).join('-');
}
function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
function ageOnDate(birthdate, date) {
    const [by,bm,bd]=birthdate.split('-').map(Number);
    const [cy,cm,cd]=date.split('-').map(Number);
    return cy-by-(cm<bm || (cm===bm && cd<bd) ? 1 : 0);
}
function textField(value, label, max, required=true) {
    if (!required && (value === undefined || value === null)) return '';
    if (typeof value !== 'string') throw new Error(`${label} is required.`);
    const text=value.trim();
    if ((required && !text) || text.length>max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text) || (required && /[<>\r\n]/.test(text))) throw new Error(`Enter a valid ${label.toLowerCase()} (maximum ${max} characters).`);
    return text;
}
function validatePatient(body) {
    const first_name=textField(body.first_name,'First name',100);
    const last_name=textField(body.last_name,'Last name',100);
    const purok=textField(body.purok,'Purok / zone',100);
    const disease=textField(body.disease,'Disease category',255);
    const remarks=textField(body.remarks,'Remarks',4000,false);
    const birthdate=body.birthdate;
    const date_recorded=body.date_recorded;
    if (!validDate(birthdate) || !validDate(date_recorded)) throw new Error('Select a valid birthdate and case date.');
    if (date_recorded<'1900-01-01') throw new Error('The case date must be 1900 or later.');
    if (date_recorded>todayInManila()) throw new Error('The case date cannot be in the future.');
    if (birthdate>date_recorded) throw new Error('Birthdate must be on or before the case date.');
    const age=ageOnDate(birthdate,date_recorded);
    if (age<0 || age>130) throw new Error('Check the birthdate and case date; the recorded age must be between 0 and 130.');
    if (!['Mild','Monitored','High Risk'].includes(body.severity)) throw new Error('Select the recorded severity: Mild, Monitored or High Risk.');
    const status=body.status === undefined ? 'Active' : body.status;
    if (!['Active','Cleared','Deceased'].includes(status)) throw new Error('Select a valid case status.');
    return {first_name,last_name,patient_name:first_name+' '+last_name,birthdate,age,purok,disease,remarks,date_recorded,severity:body.severity,status};
}
module.exports = { todayInManila, validDate, ageOnDate, validatePatient };
