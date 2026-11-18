// Display-only synthetic analytics. No residents, cases or database rows are written.
const {analyticsFilters,comparisonSelection}=require('./mho-analytics');
const {todayPeriod}=require('./report-periods');
const {group,ranges}=require('./age-groups');
const {DISEASES:diseases}=require('./seasonal6200-sarima-demo');
function sampleAnalytics(endpoint,query,places,now=new Date()){
    const filters=analyticsFilters(query),through=todayPeriod(now).start,currentYear=Number(through.slice(0,4));
    const years=Array.from({length:4},(_,i)=>currentYear-3+i),barangays=[...new Set(places)].sort(),records=[];
    for(const year of years)for(let d=0;d<diseases.length;d++)for(let n=0;n<43-d*3+(year-years[0])*2;n++){
        if(!barangays.length)continue;
        const month=n%(year===currentYear?Number(through.slice(5,7)):12)+1;
        const date=`${year}-${String(month).padStart(2,'0')}-${year===currentYear&&month===Number(through.slice(5,7))&&Number(through.slice(8))<3?'01':'03'}`;
        records.push({date,year,month,disease:diseases[d],barangay:barangays[(n+d)%barangays.length],age:group([3,9,15,32,48,67,null][(n*3+d)%7]),
            status:d<5&&n<d+2?'Deceased':year===currentYear&&n%5===0?'Active':'Cleared',severity:n%11===0?'High Risk':n%4===0?'Monitored':'Mild'});
    }
    const scoped=records.filter(row=>(filters.barangay==='all'||row.barangay===filters.barangay)&&(filters.age==='all'||row.age===filters.age));
    const inYear=scoped.filter(row=>filters.year==='all'||row.year===Number(filters.year));
    const selected=inYear.filter(row=>filters.category!=='mortality'||row.status==='Deceased');
    function count(rows,key){const counts=new Map();for(const row of rows){const name=key(row);counts.set(name,(counts.get(name)||0)+1);}return [...counts].map(([label,cases])=>({label,cases})).sort((a,b)=>b.cases-a.cases||String(a.label).localeCompare(String(b.label)));}
    const metadata={success:true,sample:true,filters,current_year:currentYear};
    if(endpoint==='analytics-options')return {...metadata,years:[...years].reverse(),barangays,diseases};
    if(endpoint==='kpi')return {...metadata,total:inYear.length,active:inYear.filter(row=>row.status==='Active').length,recovered:inYear.filter(row=>row.status==='Cleared').length,highRisk:inYear.filter(row=>row.status==='Active'&&row.severity==='High Risk').length};
    if(endpoint==='stats'){
        const rows=count(selected,row=>row.disease).map(({label,cases})=>({disease:label,cases})),dates=selected.map(row=>row.date).sort();
        return {...metadata,data:rows.slice(0,10),summary:{total_cases:selected.length,unknown_age_cases:selected.filter(row=>row.age==='Not recorded').length,leading_categories:rows.filter(row=>row.cases===rows[0]?.cases).length,first_recorded:dates[0]||null,last_recorded:dates.at(-1)||null}};
    }
    if(endpoint==='breakdown'){
        const placeCounts=new Map(count(selected,row=>row.barangay).map(row=>[row.label,row.cases]));
        const ageCounts=new Map(count(selected,row=>row.age).map(row=>[row.label,row.cases]));
        return {...metadata,barangays:barangays.filter(name=>filters.barangay==='all'||name===filters.barangay).map(label=>({label,cases:placeCounts.get(label)||0})).sort((a,b)=>b.cases-a.cases||a.label.localeCompare(b.label)),
            ages:[...Object.keys(ranges),'Not recorded'].map(label=>({label,cases:ageCounts.get(label)||0})),months:count(selected,row=>row.date.slice(0,7)),total_cases:selected.length,unknown_age_cases:ageCounts.get('Not recorded')||0};
    }
    if(endpoint==='mortality')return {...metadata,data:count(inYear.filter(row=>row.status==='Deceased'),row=>row.disease).map(({label,cases})=>({disease:label,count:cases}))};
    if(endpoint==='trend'){
        if(query.disease!==undefined&&(typeof query.disease!=='string'||!query.disease.trim()||query.disease.length>255)){const error=Error('Invalid disease filter.');error.status=400;throw error;}
        return {...metadata,granularity:filters.year==='all'?'annual':'monthly',data:count(inYear.filter(row=>!query.disease||row.disease===query.disease),row=>filters.year==='all'?row.year:row.month).map(({label,cases})=>({period:label,cases})).sort((a,b)=>a.period-b.period)};
    }
    if(endpoint==='year-comparison'){
        const selection=comparisonSelection(query,filters,now),chosen=selection.years||years;
        const rows=scoped.filter(row=>chosen.includes(row.year)&&(selection.period!=='same'||row.date.slice(5)<=through.slice(5)));
        const leading=count(rows,row=>row.disease).slice(0,4).map(row=>row.label);
        return {...metadata,years:chosen,period:selection.period,through,diseases:leading,data:count(rows.filter(row=>leading.includes(row.disease)),row=>row.disease+'|'+row.year).map(({label,cases})=>({disease:label.split('|')[0],year:Number(label.split('|')[1]),cases}))};
    }
    throw Error('Unknown sample analytics panel');
}
module.exports={sampleAnalytics};
