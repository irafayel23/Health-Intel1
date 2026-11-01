const age=require('../../assets/js/shared/age-groups');
function prefix(alias){if(!['','h','v'].includes(alias))throw Error('Invalid age SQL alias');return alias?alias+'.':'';}
function caseAgeSql(alias=''){
    const p=prefix(alias);
    return `(CASE WHEN ${p}birthdate IS NULL THEN ${p}age WHEN ${p}birthdate>='1900-01-01' AND ${p}date_recorded>=${p}birthdate THEN TIMESTAMPDIFF(YEAR,${p}birthdate,${p}date_recorded) ELSE NULL END)`;
}
function visitAgeSql(){return `(CASE WHEN h.birthdate>='1900-01-01' AND v.consultation_date>=h.birthdate THEN TIMESTAMPDIFF(YEAR,h.birthdate,v.consultation_date) ELSE NULL END)`;}
function ageGroupSql(expression){return `(CASE ${Object.entries(age.ranges).map(([label,[min,max]])=>`WHEN ${expression} BETWEEN ${min} AND ${max} THEN '${label}'`).join(' ')} ELSE 'Not recorded' END)`;}
module.exports={...age,caseAgeSql,visitAgeSql,ageGroupSql};
