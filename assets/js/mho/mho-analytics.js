// Descriptive case analytics; follow-up visits do not count as new cases.
let analyticsRequestId=0,comparisonRequestId=0,analyticsOptionsRequestId=0,dynamicChart=null;
let analyticsBreakdownDimension='barangay',analyticsBreakdownData=null,analyticsProfileData=null;
const ae=id=>document.getElementById(id);
function selectedAnalyticsFilters(){
    return Object.fromEntries(['year','barangay','age','category'].map(k=>[k,ae('filter-'+k).value]));
}
async function analyticsJson(path,filters){
    const response=await fetch('http://localhost:3000/api/mho/'+path+'?'+new URLSearchParams(filters));
    const result=await response.json();
    if(!response.ok||!result.success)throw Error('Unavailable');
    return result;
}
function analyticsTable(id,headings,rows){
    const target=ae(id);
    target.replaceChildren();
    if(!rows.length){
        target.textContent='No matching records.';
        return;
    }
    const table=document.createElement('table');
    table.className='w-full text-sm text-left';
    const head=table.createTHead().insertRow();
    headings.forEach(text=>{
        const cell=document.createElement('th');
        cell.scope='col';
        cell.className='py-2 pr-4 border-b border-[hsl(var(--border))]';
        cell.textContent=text;
        head.append(cell);
    }
    );
    const body=table.createTBody();
    rows.forEach(values=>{
        const tr=body.insertRow();
        values.forEach(text=>{
            const td=tr.insertCell();
            td.className='py-2 pr-4 border-b border-[hsl(var(--border))]';
            td.textContent=text;
        }
        );
    }
    );
    target.append(table);
}
function replaceAnalyticsChart(key,id,config){
    if(window[key])window[key].destroy();
    window[key]=new Chart(ae(id).getContext('2d'),config);
}
const analyticsCountLabels={
    id:'analyticsCountLabels',afterDatasetsDraw(chart){
        const {
            ctx
        }
        =chart;
        ctx.save();
        ctx.fillStyle=document.documentElement.classList.contains('dark')?'#e2e8f0':'#0f172a';
        ctx.font='600 12px sans-serif';
        chart.getDatasetMeta(0).data.forEach((bar,i)=>{const value=chart.data.datasets[0].data[i];if(value!==null)ctx.fillText(Number(value).toLocaleString('en-PH'),bar.x+8,bar.y+4);});
        ctx.restore();
    }
}
;
const analyticsDonutTotal={
    id:'analyticsDonutTotal',
    afterDraw(chart){
        const arc=chart.getDatasetMeta(0).data[0];
        if(!arc)return;
        const total=chart.data.datasets[0].data.reduce((sum,value)=>sum+Number(value),0);
        const dark=document.documentElement.classList.contains('dark');
        const ctx=chart.ctx;
        ctx.save();
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillStyle=dark?'#f1f5f9':'#0f172a';
        ctx.font='700 24px sans-serif';
        ctx.fillText(total.toLocaleString('en-PH'),arc.x,arc.y-7);
        ctx.fillStyle=dark?'#cbd5e1':'#0f172a';
        ctx.font='500 11px sans-serif';
        ctx.fillText('case records',arc.x,arc.y+15);
        ctx.restore();
    }
};
function renderDescriptiveFindings(){
    if(!analyticsProfileData||!analyticsBreakdownData)return;
    const target=ae('descriptive-findings'),data=analyticsBreakdownData,total=Number(data.total_cases);
    target.replaceChildren();
    if(!total){target.textContent='No matching case records for these filters.';return;}
    MHOInsights.descriptiveFindings(analyticsProfileData,data).forEach(finding=>{
        const item=document.createElement('div');item.className='py-3';
        const term=document.createElement('dt');term.className='text-xs text-[hsl(var(--muted-foreground))]';term.textContent=finding.title;
        const detail=document.createElement('dd');detail.className='mt-1';
        const heading=document.createElement('div');heading.className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1';
        const name=document.createElement('span');name.className='text-sm font-semibold';
        name.textContent=finding.name;name.title=finding.names.join(', ');
        const value=document.createElement('span');value.className='text-xs text-[hsl(var(--muted-foreground))] tabular-nums';
        value.textContent=finding.count?finding.count.toLocaleString('en-PH')+(finding.count===1?' case · ':' cases · ')+finding.share.toFixed(1)+'%'+(finding.tied?' each':''):'—';
        const explanation=document.createElement('p');explanation.className='mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]';
        explanation.textContent=finding.explanation;
        heading.append(name,value);detail.append(heading,explanation);item.append(term,detail);target.append(item);
    });
}
function setAnalyticsBreakdown(dimension){
    analyticsBreakdownDimension=dimension==='age'?'age':'barangay';
    const age=analyticsBreakdownDimension==='age';
    for(const [id,selected]of [['breakdown-barangay-tab',!age],['breakdown-age-tab',age]]){
        const tab=ae(id);tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
        tab.classList.toggle('bg-[hsl(var(--background))]',selected);tab.classList.toggle('shadow-sm',selected);tab.classList.toggle('text-[hsl(var(--muted-foreground))]',!selected);
    }
    ae('breakdown-panel').setAttribute('aria-labelledby',age?'breakdown-age-tab':'breakdown-barangay-tab');
    if(!analyticsBreakdownData)return;
    const data=analyticsBreakdownData,rows=age?data.ages:data.barangays,total=Number(data.total_cases);
    ae('breakdown-chart-wrap').classList.toggle('hidden',!total);
    ae('breakdownChart').setAttribute('aria-label','Recorded case counts by '+(age?'age group':'barangay')+', '+total.toLocaleString('en-PH')+' matching cases');
    ae('breakdown-context').textContent=total?total.toLocaleString('en-PH')+' matching case records. '+(age?Number(data.unknown_age_cases).toLocaleString('en-PH')+' have no usable age. ':'')+'Uses the selected year, barangay, age and outcome. Blank bars mean no matching records.':'No matching case records for this selection.';
    if(total)replaceAnalyticsChart('breakdownChartInst','breakdownChart',{
        type:'bar',plugins:[analyticsCountLabels],data:{labels:rows.map(row=>age&&row.label!=='Not recorded'?row.label+' years':row.label),datasets:[{label:'Recorded cases',data:rows.map(row=>Number(row.cases)||null),backgroundColor:age?'#8b5cf6':'#3b82f6',borderRadius:5,maxBarThickness:24}]},
        options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,animation:false,layout:{padding:{right:44}},plugins:{legend:{display:false},tooltip:{callbacks:{label:item=>Number(item.raw).toLocaleString('en-PH')+' cases · '+(Number(item.raw)/total*100).toFixed(1)+'%'}}},scales:{x:{beginAtZero:true,ticks:{precision:0}},y:{grid:{display:false}}}}
    });
    analyticsTable('breakdown-table',[age?'Age group':'Barangay','Recorded cases','Share'],rows.map(row=>[row.label,Number(row.cases)||'No matching records',total&&Number(row.cases)?(Number(row.cases)/total*100).toFixed(1)+'%':'—']));
}
async function fetchAnalyticsBreakdown(filters,id){
    try{
        const result=await analyticsJson('breakdown',filters);if(id!==analyticsRequestId)return;
        analyticsBreakdownData=result;setAnalyticsBreakdown(analyticsBreakdownDimension);renderDescriptiveFindings();
    }catch{
        if(id!==analyticsRequestId)return;
        ae('breakdown-chart-wrap').classList.add('hidden');ae('breakdown-context').textContent='Case breakdown unavailable. Refresh to try again.';
        ae('breakdown-table').textContent='Data unavailable.';ae('descriptive-findings').textContent='Findings unavailable. Refresh to try again.';
    }
}
async function fetchLiveMHOStats(filters,id){
    const ids={
        total:'stat-total',active:'stat-active',recovered:'stat-recovered',highRisk:'stat-risk'
    }
    ;
    try{
        const result=await analyticsJson('kpi',filters);
        if(id!==analyticsRequestId)return;
        Object.entries(ids).forEach(([key,target])=>ae(target).textContent=Number(result[key]).toLocaleString('en-PH'));
        ae('analytics-kpi-context').textContent='These filters apply to totals, the health profile and trends. Year comparison has its own year choices. Counts are disease cases, not unique patients or visits. Active totals exclude archived records; outcomes reflect current status.';
    }
    catch{
        if(id!==analyticsRequestId)return;
        Object.values(ids).forEach(target=>ae(target).textContent='Unavailable');
        ae('analytics-kpi-context').textContent='Totals unavailable. A connection error does not mean zero cases.';
    }
}
async function fetchAnalyticsTrend(filters,id){
    try{
        const disease=ae('filter-trend-disease').value;
        const result=await analyticsJson('trend',{
            ...filters,...(disease?{
                disease
            }
            :{
            }
            )
        }
        );
        if(id!==analyticsRequestId)return;
        ae('trend-chart-wrap').classList.toggle('hidden',!result.data.length);
        const values=new Map(result.data.map(row=>[Number(row.period),Number(row.cases)])),annual=result.granularity==='annual';
        const periods=annual?(values.size?Array.from({
            length:Math.max(...values.keys())-Math.min(...values.keys())+1
        }
        ,(_,i)=>Math.min(...values.keys())+i):[]):Array.from({
            length:12
        }
        ,(_,i)=>i+1);
        const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const labels=periods.map(p=>annual?String(p)+(p===result.current_year?' · YTD':''):months[p-1]),data=periods.map(p=>values.get(p)??null);
        ae('yoy-title').textContent='Recorded cases over time · '+(annual?'All years':filters.year+(Number(filters.year)===result.current_year?' · Year to date':''));
        ae('yoy-context').textContent=(result.data.length?'Counts use original case dates, not follow-up visits. ':'No matching trend records. ')+(annual?'The current year is partial (YTD). ':'Monthly totals for the selected year. ')+'Gaps mean no matching records, not confirmed zero reporting. Reporting completeness is unverified.';
        replaceAnalyticsChart('yoyChartInst','yoyMorbidityChart',{
            type:'line',data:{
                labels,datasets:[{
                    label:disease||'Recorded cases',data,borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.08)',fill:true,tension:0.15,spanGaps:false,pointRadius:4,borderWidth:2
                }
                ]
            }
            ,options:{
                responsive:true,maintainAspectRatio:false,animation:false,plugins:{
                    legend:{
                        display:false
                    }
                }
                ,scales:{
                    y:{
                        beginAtZero:true,ticks:{
                            precision:0
                        }
                    }
                    ,x:{
                        grid:{
                            display:false
                        }
                    }
                }
            }
        }
        );
        analyticsTable('trend-table',['Period','Recorded cases'],periods.map((p,i)=>[labels[i],data[i]??'No matching records']));
    }
    catch{
        if(id!==analyticsRequestId)return;
        ae('yoy-context').textContent='Trend unavailable. Refresh or try another filter.';
        ae('trend-table').textContent='Data unavailable.';
    }
}
async function fetchAnalyticsMortality(filters,id){
    try{
        const result=await analyticsJson('mortality',filters);
        if(id!==analyticsRequestId)return;
        const rows=result.data,total=rows.reduce((sum,row)=>sum+Number(row.count),0);
        ae('mortality-title').textContent='Cases marked Deceased';
        ae('mortality-chart-wrap').classList.toggle('hidden',!total);
        ae('mortality-empty').classList.toggle('hidden',!!total);
        const colors=['#3b82f6','#8b5cf6','#14b8a6','#f59e0b','#ef4444','#64748b','#ec4899','#6366f1'];
        if(total)replaceAnalyticsChart('mortChartInst','mortalityChart',{
            type:'doughnut',plugins:[analyticsDonutTotal],data:{
                labels:rows.map(row=>row.disease),datasets:[{
                    data:rows.map(row=>Number(row.count)),backgroundColor:rows.map((_,i)=>colors[i%colors.length]),borderWidth:0
                }
                ]
            }
            ,options:{
                responsive:true,maintainAspectRatio:false,animation:false,cutout:'68%',plugins:{
                    legend:{
                        position:'bottom',labels:{
                            usePointStyle:true,padding:14,boxWidth:8
                        }
                    }
                    ,tooltip:{
                        callbacks:{
                            label:item=>`${item.label}: ${item.raw} (${(Number(item.raw)/total*100).toFixed(1)}%)`
                        }
                    }
                }
            }
        }
        );
        analyticsTable('mortality-table',['Condition','Cases','Share'],rows.map(row=>[row.disease,row.count,(Number(row.count)/total*100).toFixed(1)+'%']));
    }
    catch{
        if(id!==analyticsRequestId)return;
        ae('mortality-chart-wrap').classList.add('hidden');
        ae('mortality-empty').classList.add('hidden');
        ae('mortality-title').textContent='Deceased-case data unavailable';
        ae('mortality-table').textContent='Outcome counts unavailable. Refresh to try again.';
    }
}
async function fetchAnalyticsComparison(filters,requestId) {
    const comparisonId=++comparisonRequestId;
    const custom=ae('comparison-years-mode').value==='custom';
    ae('comparison-year-choices').classList.toggle('hidden',!custom);
    const years=custom?[...ae('comparison-year-options').querySelectorAll('input:checked')].map(input=>input.value):[];
    if(window.comparisonChartInst){window.comparisonChartInst.destroy();window.comparisonChartInst=null;}
    ae('comparison-chart-wrap').classList.add('hidden');
    ae('comparison-table').textContent='Loading…';
    if(custom && years.length<2){
        ae('comparison-context').textContent='Choose at least two years to compare.';
        ae('comparison-table').textContent='Choose at least two years to compare.';
        return;
    }
    ae('comparison-context').textContent='Loading selected years…';
    try {
        const result=await analyticsJson('year-comparison',{...filters,year:'all',years:custom?years.join(','):'all',period:ae('comparison-period').value||'calendar'});
        if(requestId!==analyticsRequestId || comparisonId!==comparisonRequestId)return;
        const colors=['#3b82f6','#f59e0b','#06b6d4','#14b8a6','#ec4899','#8b5cf6'];
        const same=result.period==='same';
        const through=new Intl.DateTimeFormat('en-GB',{month:'short',day:'numeric',timeZone:'Asia/Manila'}).format(new Date(result.through+'T00:00:00+08:00'));
        const yearLabel=year=>'CY '+year+(year===result.current_year?' · YTD':same?' · same dates':'');
        const counts=new Map(result.data.map(row=>[row.disease+'|'+row.year,Number(row.cases)]));
        ae('comparison-title').textContent='Recorded cases by disease · '+(custom?result.years.join(' vs '):'All years');
        ae('comparison-chart-wrap').classList.toggle('hidden',!result.data.length);
        ae('comparison-context').textContent=(result.data.length?'Up to four leading categories across the comparison years. ':'No matching comparison records. ')+(same?'1 Jan–'+through+' in every year. ':result.years.includes(result.current_year)?'Calendar totals: the current year is year to date (YTD); previous years cover the full calendar year. ':'Full calendar-year totals. ')+'Blank bars mean no matching records, not confirmed zero community cases. Reporting completeness can differ.';
        ae('comparisonChart').setAttribute('aria-label','Disease counts by year. '+result.years.map(yearLabel).join(', ')+'. '+(same?'January 1 through '+through+' in each year.':'Calendar totals; the current year is partial.'));
        replaceAnalyticsChart('comparisonChartInst','comparisonChart',{
            type:'bar',
            data:{labels:result.diseases,datasets:result.years.map(year=>({
                label:yearLabel(year),data:result.diseases.map(disease=>counts.get(disease+'|'+year)??null),backgroundColor:colors[(year-1900)%colors.length],borderRadius:4,maxBarThickness:36
            }))},
            options:{responsive:true,maintainAspectRatio:false,animation:false,
                plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:10,padding:16}}},
                scales:{y:{beginAtZero:true,ticks:{precision:0}},x:{grid:{display:false},ticks:{callback:function(value){const label=this.getLabelForValue(value);return label.length>24?label.slice(0,23)+'…':label;}}}}
            }
        });
        analyticsTable('comparison-table',['Disease',...result.years.map(yearLabel)],result.diseases.map(disease=>[disease,...result.years.map(year=>counts.get(disease+'|'+year)??'No matching records')]));
    } catch {
        if(requestId!==analyticsRequestId || comparisonId!==comparisonRequestId)return;
        ae('comparison-chart-wrap').classList.add('hidden');
        ae('comparison-context').textContent='Year comparison unavailable. Refresh or try another filter.';
        ae('comparison-table').textContent='Data unavailable.';
    }
}
function updateYearComparison(){
    return fetchAnalyticsComparison(selectedAnalyticsFilters(),analyticsRequestId);
}
function initializeComparisonYears(years){
    const currentYear=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Manila',year:'numeric'}).format(new Date()));
    const available=[...new Set(years.map(Number))].filter(year=>Number.isInteger(year)&&year>=1900&&year<=currentYear).sort((a,b)=>a-b);
    const target=ae('comparison-year-options');
    target.replaceChildren();
    available.forEach((year,index)=>{
        const label=document.createElement('label');
        label.className='inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium';
        const input=document.createElement('input');input.type='checkbox';input.value=String(year);input.checked=index>=available.length-2;
        input.className='h-4 w-4 accent-blue-600';input.addEventListener('change',updateYearComparison);
        const text=document.createElement('span');text.textContent=String(year)+(year===currentYear?' · YTD':'');
        label.append(input,text);target.append(label);
    });
    if(!available.length)target.textContent='No recorded years available.';
}
async function updateDynamicChart(){
    const filters=selectedAnalyticsFilters(),id=++analyticsRequestId;
    analyticsBreakdownData=null;analyticsProfileData=null;
    ae('descriptive-findings').textContent='Loading findings…';ae('breakdown-context').textContent='Loading breakdown…';ae('breakdown-chart-wrap').classList.add('hidden');
    ae('analytics-scope').textContent=(ae('filter-year').selectedOptions?.[0]?.textContent || filters.year)+' · '+(filters.barangay==='all'?'All barangays':filters.barangay);
    ['stat-total','stat-active','stat-recovered','stat-risk'].forEach(target=>ae(target).textContent='…');
    ae('insight-text').textContent='Loading the selected records…';
    ae('action-text').textContent='Loading the recorded-case summary…';
    ae('profile-empty').textContent='Loading…';
    if(dynamicChart){
        dynamicChart.destroy();
        dynamicChart=null;
    }
    ['yoyChartInst','mortChartInst','comparisonChartInst','breakdownChartInst'].forEach(key=>{
        if(window[key]){
            window[key].destroy();
            window[key]=null;
        }
    }
    );
    ae('mortality-empty').classList.add('hidden');
    ae('yoy-context').textContent='Loading selected periods…';
    ['trend-table','mortality-table','profile-table','comparison-table'].forEach(target=>ae(target).textContent='Loading…');
    ae('comparison-context').textContent='Loading selected years…';
    const panels=Promise.all([fetchLiveMHOStats(filters,id),fetchAnalyticsTrend(filters,id),fetchAnalyticsMortality(filters,id),fetchAnalyticsComparison(filters,id),fetchAnalyticsBreakdown(filters,id)]);
    try{
        const result=await analyticsJson('stats',filters);
        if(id!==analyticsRequestId)return;
        analyticsProfileData=result;renderDescriptiveFindings();
        const description=MHOInsights.describeProfile(result.data,filters,result.summary);
        ae('insight-text').textContent=description.text;
        ae('action-text').textContent=description.text;
        ae('profile-chart-wrap').classList.toggle('hidden',!result.data.length);
        ae('profile-empty').textContent=result.data.length?'':'No matching disease cases for this selection.';
        ae('analytics-data-context').textContent='Counts use original case dates and age at that date; follow-up visits do not add disease cases. '+(result.summary.first_recorded?`Recorded dates: ${result.summary.first_recorded} to ${result.summary.last_recorded}.`:'No matching record dates.');
        dynamicChart=new Chart(ae('dynamicChart').getContext('2d'),{
            type:'bar',plugins:[analyticsCountLabels],data:{
                labels:result.data.map(row=>row.disease),datasets:[{
                    label:'Recorded cases',data:result.data.map(row=>Number(row.cases)),backgroundColor:filters.category==='mortality'?'#8b5cf6':'#3b82f6',borderRadius:5,maxBarThickness:32
                }
                ]
            }
            ,options:{
                indexAxis:'y',responsive:true,maintainAspectRatio:false,animation:false,layout:{
                    padding:{
                        right:44
                    }
                }
                ,plugins:{
                    legend:{
                        display:false
                    }
                }
                ,scales:{
                    x:{
                        beginAtZero:true,ticks:{
                            precision:0
                        }
                    }
                    ,y:{
                        grid:{
                            display:false
                        },
                        ticks:{
                            callback:function(value){
                                const label=this.getLabelForValue(value);
                                const limit=this.chart.width<400?16:30;
                                return label.length>limit?label.slice(0,limit-1)+'…':label;
                            }
                        }
                    }
                }
            }
        }
        );
        analyticsTable('profile-table',['Disease / case','Recorded cases'],result.data.map(row=>[row.disease,row.cases]));
    }
    catch{
        if(id!==analyticsRequestId)return;
        ae('insight-text').textContent='The selected records could not be loaded. Please refresh or try again.';
        ae('action-text').textContent='The recorded-case summary is unavailable.';
        ae('profile-empty').textContent='Data unavailable; this is not a zero count.';
        ae('profile-table').textContent='Data unavailable.';
        ae('analytics-data-context').textContent='A connection error does not mean zero cases.';
        ae('descriptive-findings').textContent='Findings unavailable. Refresh to try again.';
    }
    finally{
        await panels;
    }
}
async function initializeMunicipalAnalytics(){
    const optionsId=++analyticsOptionsRequestId;
    try{
        const result=await analyticsJson('analytics-options',{
        }
        ),currentYear=Number(new Intl.DateTimeFormat('en',{
            timeZone:'Asia/Manila',year:'numeric'
        }
        ).format(new Date()));
        if(optionsId!==analyticsOptionsRequestId)return;
        for(const [id,values,label] of [['filter-year',result.years,value=>value===currentYear?value+' · Year to date':'CY '+value],['filter-barangay',result.barangays,value=>value],['filter-trend-disease',result.diseases,value=>value]]){
            const select=ae(id);
            while(select.options.length>1)select.remove(1);
            values.forEach(value=>select.add(new Option(label(value),value)));
        }
        ae('filter-barangay').options[0].textContent='All configured barangays';
        initializeComparisonYears(result.years);
    }
    catch{
        /* Existing year and barangay choices remain available if options fail. */
    }
    if(optionsId===analyticsOptionsRequestId)await updateDynamicChart();
}
for(const dimension of ['barangay','age'])ae('breakdown-'+dimension+'-tab').addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const next=event.key==='Home'?'barangay':event.key==='End'?'age':analyticsBreakdownDimension==='age'?'barangay':'age';
    setAnalyticsBreakdown(next);ae('breakdown-'+next+'-tab').focus();
});
setAnalyticsBreakdown('barangay');
initializeMunicipalAnalytics();
