// One age-group definition for encounter histories, analytics and report exports.
(function(root,factory){
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.HealthIntelAge=factory();
})(typeof window!=='undefined'?window:globalThis,function(){
    const ranges=Object.freeze({'0-5':[0,5],'6-12':[6,12],'13-17':[13,17],'18-59':[18,59],'60+':[60,130]});
    const unknown='Not recorded';
    function validAge(value){return (typeof value==='number'||(typeof value==='string'&&/^\d+$/.test(value)))&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<=130?Number(value):null;}
    function validDate(value){
        if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01')return false;
        const date=new Date(value+'T00:00:00Z');
        return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
    }
    function ageOnDate(birthdate,date){
        if(!validDate(birthdate)||!validDate(date)||birthdate>date)return null;
        const [by,bm,bd]=birthdate.split('-').map(Number),[y,m,d]=date.split('-').map(Number);
        return validAge(y-by-(m<bm||(m===bm&&d<bd)?1:0));
    }
    function group(age){const value=validAge(age);return value===null?unknown:Object.keys(ranges).find(key=>value>=ranges[key][0]&&value<=ranges[key][1])||unknown;}
    function caseAge(row){return row.birthdate?ageOnDate(row.birthdate,row.date_recorded):validAge(row.age);}
    function caseFields(row){const age_at_case=caseAge(row);return {...row,age_at_case,age_group:group(age_at_case)};}
    function visitFields(row){const age_at_visit=ageOnDate(row.birthdate,row.consultation_date);return {...row,age_at_visit,age_group:group(age_at_visit)};}
    function describe(age){const value=validAge(age);return value===null?'Age group: '+unknown:`Age at encounter: ${value} · Age group: ${group(value)} years`;}
    return {ranges,unknown,validAge,ageOnDate,group,caseAge,caseFields,visitFields,describe};
});
