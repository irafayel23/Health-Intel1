'use strict';
const {DISEASES}=require('./seasonal6200-sarima-demo');
const {FIRST_LIVE_CASE_DATE}=require('./dataset-analytics');
const DAY=86400000;
const iso=stamp=>new Date(stamp).toISOString().slice(0,10);
function periods(now=new Date()) {
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const value=type=>parts.find(part=>part.type===type).value;
    const end=Date.parse(`${value('year')}-${value('month')}-${value('day')}T00:00:00Z`)+DAY;
    const current={start:`${value('year')}-${value('month')}-01`,end:iso(end),through:iso(end-DAY)};
    return {start:current.start,end:current.end,current};
}
function band(current) {
    if(!Number.isSafeInteger(current)||current<0)throw Error('Invalid recorded case count.');
    const level=current===0?-1:current<=10?0:current<=20?1:2;
    return {current,level,label:level<0?'No recorded cases':['Mild','Monitored','High Risk'][level],tone:level<0?'none':['mild','monitored','high_risk'][level]};
}
function assess(rows,barangayId,disease='',now=new Date()) {
    const period=periods(now);
    const unavailable=reason=>({status:'unavailable',label:'Not assessed',tone:'none',period,reason});
    if(period.start<FIRST_LIVE_CASE_DATE)return unavailable('The monthly period starts before live recording began.');
    if(disease&&!DISEASES.includes(disease))return unavailable('This condition is outside the ten case-activity categories.');
    const names=disease?[disease]:DISEASES;
    const counts=new Map(names.map(name=>[name,0]));
    let pending=0,other=0;
    for(const row of rows) {
        if(Number(row.barangay_id)!==Number(barangayId))continue;
        if(disease&&row.disease!==disease)continue;
        const n=Number(row.cases),date=row.date_recorded;
        if(!Number.isSafeInteger(n)||n<0||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||iso(Date.parse(date+'T00:00:00Z'))!==date)
            throw Error('Invalid case-activity aggregate.');
        if(date<period.start||date>=period.end)continue;
        if(['Pending','Clarification'].includes(row.disease_review_status)){pending+=n;continue;}
        if(!counts.has(row.disease)){other+=n;continue;}
        counts.set(row.disease,counts.get(row.disease)+n);
    }
    const details=[...counts].map(([name,current])=>({disease:name,...band(current)}));
    details.sort((a,b)=>b.level-a.level||b.current-a.current||a.disease.localeCompare(b.disease));
    const classifiedCases=details.reduce((sum,row)=>sum+row.current,0);
    const observed_cases=disease?classifiedCases:classifiedCases+pending+other;
    const overall=band(observed_cases);
    const assessed=!(disease&&pending>0&&overall.level<1);
    return {status:assessed?'assessed':'unavailable',label:assessed?overall.label:'Not assessed',tone:assessed?overall.tone:'none',
        level:assessed?overall.level:null,period,details,observed_cases,pending_cases:pending,other_cases:other,
        reason:!assessed?'MHO Disease Review must resolve pending records before this disease can receive a low case-volume band.':
            observed_cases===0?'No eligible new case records were found in the current calendar month through today.':
            `${observed_cases} new recorded cases this month fall in the ${overall.level===0?'1-10':overall.level===1?'11-20':'21+'} case-volume band (${overall.label}).`,
        scope:disease||'All recorded conditions',provisional:true,method:'fixed-case-volume',thresholds:{mild_max:10,monitored_min:11,monitored_max:20,high_min:21}};

}
module.exports={periods,band,assess};
