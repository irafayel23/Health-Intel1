(() => {
 'use strict';
 const $=id=>document.getElementById(id),api='/api/admin/operational-predictions';let active=false,timer,statusSequence=0,probabilityTimer,reviewedRun,latestCompletedMonth,loadedReportMonth,reportComplete=false,canPrepare=false,preparing=false,reportSequence=0;
 const node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e;};
 let confirmedCount=null,lastRuns=[],pastRunsKey,progressRun,batchReview,detailReport;
 let reportRows=[],reportWriting=false;
 const selectedReports=new Set();
 const fmt=x=>typeof x==='number'&&Number.isFinite(x)?x.toFixed(2):'Unavailable';
 const lowMemory=text=>text?.startsWith('Insufficient available memory');
 const base=()=>window.HealthIntel?.apiOrigin||'http://localhost:3000';
 async function request(route,body){const response=await fetch(base()+api+route,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await response.json().catch(()=>({}));if(!response.ok||!value.success)throw Error(value.error||'The monthly update service could not complete this request.');return value.data;}
 const message=(text,id='monthly-message')=>{const e=$(id);if(e)e.textContent=text;};
 function button(label,action,primary=false){const b=node('button',primary?'admin-monthly-button admin-monthly-primary':'admin-monthly-button',label);b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await action();}catch(e){message(e.message);}finally{b.disabled=false;}});return b;}
 async function approval(title,text){if(window.Swal)return (await window.Swal.fire({icon:'warning',title,text,showCancelButton:true,confirmButtonText:'Confirm',focusCancel:true,customClass:{popup:'hi-dialog'}})).isConfirmed;return window.confirm(title+'\n'+text);}

 const eligibleReport=report=>!report.confirmed&&!report.pending;
 const reportState=report=>report.pending?'Pending disease review':report.stale?'Changed · review again':report.confirmed?'Confirmed':'Awaiting confirmation';
 const quantity=(count,word)=>count+' '+word+(count===1?'':'s');

 function renderReportSelection(){
    const eligible=reportRows.filter(eligibleReport).length;
    const all=$('monthly-report-all'),review=$('monthly-report-review'),count=selectedReports.size;
    all.disabled=reportWriting||eligible===0;
    all.checked=eligible>0&&count===eligible;
    all.indeterminate=count>0&&count<eligible;
    review.disabled=reportWriting||count===0;
    review.textContent=count?'Review selected ('+count+')':'Review selected';
    $('monthly-report-actions').hidden=reportComplete;
    message(count?quantity(count,'report')+' selected':eligible?'Select reports you’ve reviewed.':'Resolve pending classifications before confirming.','monthly-report-selection');
 }

 function clearReports(){
    reportSequence++;
    loadedReportMonth='';
    reportComplete=false;
    confirmedCount=null;
    reportRows=[];
    selectedReports.clear();
    renderSteps();
    $('monthly-reports').replaceChildren();
    $('monthly-report-grid').hidden=true;
    $('monthly-report-count').hidden=true;
    $('monthly-load-reports').disabled=reportWriting;
    message('','monthly-report-feedback');
 }

 function openReportDetail(report){
    detailReport={report,month:loadedReportMonth};
    message(report.barangay,'monthly-report-detail-title');
    message(monthLabel(loadedReportMonth),'monthly-report-detail-month');
    $('monthly-report-detail-values').replaceChildren(...[
        ['Eligible cases',report.total],['Pending classifications',report.pending],
        ['Outside prediction categories',report.other],['Status',reportState(report)]
    ].map(([label,value])=>{
        const row=node('div');
        row.append(node('dt','',label),node('dd','',value));
        return row;
    }));
    $('monthly-report-reopen').hidden=!report.confirmed;
    $('monthly-report-reopen').disabled=reportWriting;
    $('monthly-report-detail').showModal();
 }

 function renderReportTable(){
    const host=$('monthly-reports');
    const rows=reportRows.map(report=>{
        const row=node('tr'),checkCell=node('td'),label=node('label','admin-monthly-checkbox');
        if(eligibleReport(report)){
            const checkbox=node('input');
            checkbox.type='checkbox';
            checkbox.checked=selectedReports.has(report.barangay);
            checkbox.setAttribute('aria-label','Select '+report.barangay+' report');
            checkbox.addEventListener('change',()=>{
                if(checkbox.checked)selectedReports.add(report.barangay);
                else selectedReports.delete(report.barangay);
                renderReportSelection();
            });
            label.append(checkbox);
            checkCell.append(label);
        }
        const name=node('th');
        name.scope='row';
        const details=node('button','admin-monthly-report-link',report.barangay);
        details.type='button';
        details.setAttribute('aria-label','View '+report.barangay+' report');
        details.addEventListener('click',()=>openReportDetail(report));
        name.append(details);
        const status=node('td'),badge=node('span','admin-monthly-badge',reportState(report));
        badge.dataset.state=report.pending||report.stale?'attention':report.confirmed?'confirmed':'waiting';
        status.append(badge);
        row.append(checkCell,name,node('td','',report.total),status);
        return row;
    });
    host.replaceChildren(...rows);
    renderReportSelection();
 }

 async function loadReports(){
    const month=$('monthly-report-month').value;
    if(!month||month>latestCompletedMonth||(trainingMode()===mixedMode&&month<firstReport)){
        clearReports();
        message('Choose a completed reporting month within the selected history source.','monthly-report-summary');
        return;
    }
    const sequence=++reportSequence;
    const previous=new Map(loadedReportMonth===month?reportRows.filter(r=>selectedReports.has(r.barangay)).map(r=>[r.barangay,r.digest]):[]);
    loadedReportMonth=month;
    reportComplete=false;
    confirmedCount=null;
    renderSteps();
    const summary=$('monthly-report-summary'),load=$('monthly-load-reports'),grid=$('monthly-report-grid'),badge=$('monthly-report-count');
    summary.textContent='Loading barangay reports…';
    load.disabled=true;
    grid.hidden=true;
    badge.hidden=true;
    try{
        const rows=await request('/reports?month='+encodeURIComponent(month));
        if(sequence!==reportSequence)return;
        if(!Array.isArray(rows))throw Error('Unexpected report response.');
        reportRows=rows.slice().sort((a,b)=>Number(a.confirmed)-Number(b.confirmed));
        selectedReports.clear();
        for(const report of reportRows){
            if(eligibleReport(report)&&previous.has(report.barangay)&&previous.get(report.barangay)===report.digest)selectedReports.add(report.barangay);
        }
        confirmedCount=reportRows.filter(r=>r.confirmed&&!r.pending).length;
        reportComplete=confirmedCount===7;
        renderSteps();
        badge.textContent=confirmedCount+' of 7 confirmed';
        badge.dataset.state=reportComplete?'confirmed':'waiting';
        badge.hidden=false;
        const total=reportRows.reduce((sum,report)=>sum+report.total,0);
        const pending=reportRows.reduce((sum,report)=>sum+report.pending,0);
        summary.textContent=quantity(total,'eligible case')+' · '+quantity(pending,'pending classification')+'. '+(reportComplete?'Reporting is complete for this month.':'Review the reports awaiting confirmation.');
        renderReportTable();
        grid.hidden=false;
    }catch(e){
        if(sequence===reportSequence){
            reportRows=[];
            selectedReports.clear();
            $('monthly-reports').replaceChildren();
            summary.textContent='Could not load reports. '+e.message;
        }
    }finally{
        if(sequence===reportSequence)load.disabled=reportWriting;
    }
 }

 function openBatchReview(){
    if(reportWriting||$('monthly-report-grid').hidden)return;
    const reports=reportRows.filter(r=>eligibleReport(r)&&selectedReports.has(r.barangay));
    if(!reports.length)return;
    batchReview={month:loadedReportMonth,reports};
    const cases=reports.reduce((sum,report)=>sum+report.total,0),zeros=reports.filter(report=>report.total===0).length;
    message('Confirm '+quantity(reports.length,'barangay report'),'monthly-report-dialog-title');
    message(monthLabel(batchReview.month)+' · '+quantity(cases,'eligible case')+' · '+quantity(zeros,'zero-case report'),'monthly-report-dialog-summary');
    $('monthly-report-dialog-list').replaceChildren(...reports.map(report=>node('li','',report.barangay+' · '+quantity(report.total,'eligible case'))));
    $('monthly-report-ack').checked=false;
    $('monthly-report-confirm').disabled=true;
    $('monthly-report-dialog').showModal();
 }

 async function saveReportDecision(body,success){
    if(reportWriting||body.month!==loadedReportMonth||body.month!==$('monthly-report-month').value)return;
    reportWriting=true;
    renderReportSelection();
    $('monthly-load-reports').disabled=true;
    message('Saving report review…','monthly-report-feedback');
    try{
        await request('/reports',body);
        if($('monthly-report-month').value===body.month){
            selectedReports.clear();
            message(success,'monthly-report-feedback');
            await loadReports();
        }
    }catch(error){
        if($('monthly-report-month').value===body.month){
            message(error.message,'monthly-report-feedback');
            await loadReports();
        }
    }finally{
        reportWriting=false;
        $('monthly-load-reports').disabled=false;
        renderReportSelection();
    }
 }

 function initializeReportControls(){
    $('monthly-report-all').addEventListener('change',event=>{
        const checked=event.target.checked;
        selectedReports.clear();
        if(checked)for(const report of reportRows)if(eligibleReport(report))selectedReports.add(report.barangay);
        for(const [index,row] of Array.from($('monthly-reports').children).entries()){
            const checkbox=row.querySelector('input');
            if(checkbox)checkbox.checked=selectedReports.has(reportRows[index].barangay);
        }
        renderReportSelection();
    });
    $('monthly-report-review').addEventListener('click',openBatchReview);
    $('monthly-report-cancel').addEventListener('click',()=>$('monthly-report-dialog').close());
    $('monthly-report-ack').addEventListener('change',event=>{$('monthly-report-confirm').disabled=!event.target.checked;});
    $('monthly-report-confirm').addEventListener('click',()=>{
        if(!$('monthly-report-ack').checked||!batchReview)return;
        const {month,reports}=batchReview;
        $('monthly-report-dialog').close();
        $('monthly-load-reports').focus();
        return saveReportDecision({
            month,complete:true,reports:reports.map(({barangay,digest})=>({barangay,digest}))
        },quantity(reports.length,'report')+' confirmed.');
    });
    $('monthly-report-detail-close').addEventListener('click',()=>$('monthly-report-detail').close());
    $('monthly-report-reopen').addEventListener('click',async()=>{
        if(!detailReport||reportWriting)return;
        const {report,month}=detailReport;
        $('monthly-report-detail').close();
        if(!await approval('Reopen this monthly report?',report.barangay+' · '+monthLabel(month)+'. Confirm it again before using this month in training.'))return;
        $('monthly-load-reports').focus();
        return saveReportDecision({month,barangay:report.barangay,complete:false},report.barangay+' report reopened.');
    });
 }
 const mixedMode='dataset_plus_reports';
 const uploadedVersions=new Map();
 const uploadId=()=>{
    const source=$('monthly-history-source').value;
    return source.startsWith('upload:')?source.slice(7):undefined;
 };
 const trainingMode=()=>$('monthly-history-source').value===mixedMode||uploadId()?mixedMode:'operational';
 function setDatasets(versions){
    const source=$('monthly-history-source');
    const selected=source.value;
    uploadedVersions.clear();
    for(const option of [...source.options]){
        if(option.value.startsWith('upload:'))option.remove();
    }
    for(const version of versions){
        if(!version.trainingRange)continue;
        uploadedVersions.set(version.id,version);
        const {start,cutoff}=version.trainingRange;
        source.add(new Option(version.label+' · '+monthLabel(start)+' – '+monthLabel(cutoff)+' (preview)','upload:'+version.id));
    }
    if(uploadedVersions.has(selected.slice(7)))source.value=selected;
    if(source.value!==selected)updateRange();
 }
 const datasetStart='2023-01',firstReport='2026-10';
 const monthIndex=value=>Number(value.slice(0,4))*12+Number(value.slice(5))-1;
 const shiftMonth=(month,delta)=>{
    const index=monthIndex(month)+delta;
    return Math.floor(index/12)+'-'+String(index%12+1).padStart(2,'0');
 };
 const monthLabel=value=>new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T00:00:00Z'));
 function updateRange(){
    const upload=uploadedVersions.get(uploadId());
    const start=$('monthly-start'),cutoffField=$('monthly-cutoff'),cutoff=cutoffField.value;
    const mixed=trainingMode()===mixedMode;
    const reports=$('monthly-report-month');
    reports.min=mixed?firstReport:'1900-01';
    cutoffField.min=upload?shiftMonth(upload.trainingRange.start,44):mixed?firstReport:'1903-09';
    cutoffField.max=upload?upload.trainingRange.cutoff:mixed&&shiftMonth(datasetStart,119)<latestCompletedMonth?shiftMonth(datasetStart,119):latestCompletedMonth;
    start.readOnly=mixed;
    $('monthly-start-field').hidden=mixed;
    $('monthly-dataset-summary').hidden=!mixed;
    $('monthly-history-description').hidden=mixed&&!upload;
    if($('monthly-report-card'))$('monthly-report-card').hidden=Boolean(upload);
    message(upload?'· Saved CSV preview':mixed?'· Dataset-backed preview':'· Operational reports','monthly-target-source');
    renderSteps();
    $('monthly-use-range').hidden=mixed;
    message(mixed?'History starts':'First confirmed month','monthly-start-label');
    message(upload?'This preview uses the saved CSV and stays in Model Training. Published predictions are unaffected.':mixed?'The dataset supplies January 2023 through September 2026. Confirm all seven barangays for each month you add, starting in October 2026.':'Use at least 45 consecutive months of confirmed reports from all seven barangays (3 years and 9 months).','monthly-history-description');
    if(upload){
        start.value=upload.trainingRange.start;
        start.min=start.max=start.value;
    }else if(mixed){
        start.value=datasetStart;start.min=datasetStart;start.max=datasetStart;
        if(reports.value<firstReport&&latestCompletedMonth>=firstReport){reports.value=firstReport;clearReports();}
    }
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(cutoff)||cutoff>cutoffField.max||cutoff<cutoffField.min){
        $('monthly-use-range').disabled=true;
        message('—','monthly-forecast-month');
        message('—','monthly-new-reports');
        message('Choose a valid last completed month.','monthly-range-help');
        return;
    }
    $('monthly-use-range').disabled=false;
    if(!mixed){
        start.min=shiftMonth(cutoff,-119);
        if(start.min<'1900-01')start.min='1900-01';
        start.max=shiftMonth(cutoff,-44);
    }
    const count=start.value?monthIndex(cutoff)-monthIndex(start.value)+1:null;
    const picked=count===null?'':count<1?'The first month must come before the last month. ':count+' months selected. ';
    message('Prediction period · '+monthLabel(shiftMonth(cutoff,1))+' – '+monthLabel(shiftMonth(cutoff,3)),'monthly-forecast-month');
    if(mixed&&!upload)message(cutoff===firstReport?monthLabel(firstReport):monthLabel(firstReport)+' – '+monthLabel(cutoff),'monthly-new-reports');
    message(upload?picked+'Training uses all seven barangays and ten disease categories.':mixed?picked+'Includes '+(monthIndex(cutoff)-monthIndex(firstReport)+1)+' new report month(s). Review the results in Model Training.':
        picked+'A 45-month range ending '+monthLabel(cutoff)+' starts in '+monthLabel(start.max)+'.','monthly-range-help');
 }
 async function review(run,focus=false){clearTimeout(probabilityTimer);reviewedRun=run;const data=await request('/runs/'+run),host=$('monthly-review');if(!host||reviewedRun!==run)return;host.replaceChildren();const mixed=data.mode===mixedMode;
 const heading=node('h3','text-lg font-semibold',mixed?'Dataset-backed forecast preview':'Candidate review');
 heading.tabIndex=-1;
 host.append(heading);
 if(focus)heading.focus();
 if(data.dataset_id)host.append(node('p','text-sm','Saved CSV upload '+data.dataset_id.slice(0,8)+'. Results are for preview in Model Training.'));
 else if(mixed)host.append(node('p','text-sm','Historical dataset through September 2026 and confirmed reports from October 2026 onward. The historical dataset includes generated counts. This preview cannot be published as an operational prediction.'));
 if(!data.overall){host.append(node('p','text-sm',`${data.run.status}: ${data.run.error||'The fitting run has not completed.'}`));return;}
 host.append(node('p','text-sm text-slate-800 dark:text-slate-200',`${data.context.main_target}: ${data.available}/70 accepted SARIMA predictions. ${data.dataset_id?(data.current_data_matches?'Saved CSV verified.':'The saved CSV could not be verified.'):(data.current_data_matches?'Confirmed input records still match.':'Records changed since fitting; reconfirm and prepare a new version.')}`));
 if(mixed&&!data.dataset_id&&data.current_data_matches)host.append(node('p','text-sm','Review the forecasts by disease and barangay below. This dataset-backed preview stays in Model Training. After the forecast month ends, confirm its reports to prepare the following month’s forecast.'));
 const probability=data.probability;
 if(!mixed)host.append(node('p','text-sm text-slate-800 dark:text-slate-200',probability?.status==='prepared'
  ? `COM-Poisson probabilities ${data.run.status==='published'?'published':'prepared'} for ${probability.available}/${Object.keys(probability.by_horizon||{1:true}).length*70} estimates.`
  : probability?.status==='invalid'?'The COM-Poisson probability file could not be verified. Ask the maintainer to check it.'
  : probability?.status==='calculating'?'Calculating COM-Poisson probabilities. You can leave this page and return to review the version.'
  : probability?.status==='failed'?'COM-Poisson probability preparation failed. Retry or publish SARIMA alone.'
  : 'COM-Poisson probability unavailable.'));
 if(probability?.status==='calculating'&&active)probabilityTimer=setTimeout(()=>review(run).catch(e=>message(e.message)),5000);
 if(!mixed&&data.run.status==='ready'&&data.current_data_matches&&data.available>0&&data.context.main_target===shiftMonth(latestCompletedMonth,1)&&!['prepared','invalid','calculating'].includes(probability?.status)){
  host.append(button('Prepare COM-Poisson probabilities',async()=>{
   if(!await approval('Confirm genuine reporting history','I verified that the selected months contain complete, genuine case reports and exclude test and demonstration records. I confirm the final target-month outcomes are still unknown.'))return;
   message('Calculating COM-Poisson probabilities…');
   await request('/runs/'+run+'/probability',{genuine_history_reviewed:true,outcomes_unknown:true});
   await review(run);
   message('');
  }));
 }
 const steps=Object.entries(data.overall['80_20']);
 const scores=node('div','admin-monthly-results');
 const scoreTable=node('table','w-full text-left text-sm');
 const header=scoreTable.createTHead().insertRow();
 for(const text of ['Horizon','Forecast available','Historical scored','Within tolerance','MAE','RMSE','MAPE','Probabilities']){
    const th=node('th','p-3',text);th.scope='col';header.append(th);
 }
 const body=scoreTable.createTBody();
 for(const [h,m] of steps){
    const row=body.insertRow(), available=data.context.availability?.[h] ?? data.available;
    const probabilityCount=data.probability?.by_horizon?.[h] ?? (h==='1'?data.probability?.available:null);
    for(const value of [h+' month'+(h==='1'?'':'s')+' ahead',available+'/70',m.available+'/'+m.attempted,
       fmt(m.within_tolerance_pct)+'%',fmt(m.MAE),fmt(m.RMSE),fmt(m.MAPE_positive_pct)+'%',probabilityCount==null?'Unavailable':probabilityCount+'/70']){
       row.append(node('td','p-3',value));
    }
 }
 scores.append(scoreTable);
 host.append(node('p','text-sm','Model version '+run+' · Last observed '+monthLabel(data.context.cutoff)),scores);
 const targetMonths=Array.from({length:Math.min(3,steps.length)},(_,i)=>monthLabel(shiftMonth(data.context.cutoff,i+1)));
 host.append(node('p','text-sm','Forecast window · '+targetMonths.join(' · ')));
 const technical=node('details','mt-4');technical.append(node('summary','cursor-pointer font-semibold','Technical details and scope-level performance'));
 const wrap=node('div','admin-monthly-results'),table=node('table','w-full text-left text-sm');
 wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Results by disease and barangay');
 const hr=table.createTHead().insertRow();
 for(const text of ['Disease / barangay','First target','Within tolerance','MAE / RMSE / MAPE','Configuration'])hr.append(node('th','p-3',text));
 const rows=table.createTBody();
 for(const s of data.scopes){
    const m=s.metrics,row=rows.insertRow();
    for(const value of [s.disease+' / '+s.barangay,fmt(s.prediction),m.within_tolerance_hits+'/'+m.available,
       fmt(m.MAE)+' / '+fmt(m.RMSE)+' / '+fmt(m.MAPE_positive_pct)+'%',s.configuration+' · '+(s.prediction===null?s.reason:s.annual_supported?'Annual screen supported':'Annual evidence weak or uncertain')])row.append(node('td','p-3',value));
 }
 wrap.append(table);technical.append(wrap);
 for(const [h,m] of Object.entries(data.overall['70_30']||{})){
    technical.append(node('p','text-sm','70/30 · H'+h+' · '+m.available+'/'+m.attempted+' forecasts scored · MAE '+fmt(m.MAE)+' · RMSE '+fmt(m.RMSE)+' · MAPE '+(m.MAPE_positive_pct==null?'Unavailable':fmt(m.MAPE_positive_pct)+'%')));
 }
 host.append(technical);

 const target=data.context.main_target;
 const isPublished=data.run.status==='published';
 const targetEnded=target<shiftMonth(latestCompletedMonth,1);
 if(!mixed&&!isPublished&&targetEnded)host.append(node('p','text-sm','The first prediction month has ended. Prepare a version using newer confirmed reports.'));
 if(!mixed&&data.current_data_matches&&data.available>0&&(isPublished||(!targetEnded&&!['invalid','calculating'].includes(probability?.status)))){
    const counts=data.context.availability||{1:data.available};
    const coverage=[0,1,2].map(offset=>monthLabel(shiftMonth(target,offset))+' · '+(counts[offset+1]??0)+'/70 estimates').join(', ');
    host.append(button(isPublished?'Select this published version (rollback)':'Review and publish this version',async()=>{
        const description=coverage+'. MHO and BHW will see this version after you confirm. Available COM-Poisson probabilities publish with the estimates.';
        if(!await approval(isPublished?'Select this published version?':'Publish this operational version?',description))return;
        await request('/publish',{run_id:run,acknowledged:true,probability_sha256:probability?.sha256||null});
        message('Operational version published.');
        await loadStatus();
        await review(run);
    },true));
 }
 if(data.run.status==='published')host.append(button('Assess actual outcomes',async()=>{const outcome=await request('/outcomes/'+run);const m=outcome.metrics;message(`${outcome.target} observed outcomes (${outcome.evaluation_type.replaceAll('_',' ')}): ${m.available}/${m.attempted} predictions available; MAE ${fmt(m.MAE)}, RMSE ${fmt(m.RMSE)}, within proposed limit ${m.within_tolerance_hits}/${m.available}.`);}));
 }

 function showPublication(state){
    const published=Boolean(state.publication?.run_id);
    const badge=$('monthly-publication');
    badge.textContent=published?'Operational predictions published':'No operational version published';
    badge.dataset.state=published?'confirmed':'waiting';
 }
 function showWorkerStatus(state,title,description='',diagnostic=''){
    $('monthly-environment').dataset.state=state;
    message(title,'monthly-worker-title');
    message(description,'monthly-worker-message');
    message(diagnostic,'monthly-worker-diagnostic');
    $('monthly-worker-details').hidden=!diagnostic;
    if(!diagnostic)$('monthly-worker-details').open=false;
    $('monthly-check-worker').hidden=state!=='attention'&&state!=='paused';
 }
 const isUpdating=run=>['queued','running'].includes(run.status);
 function renderSteps(){
    const cutoff=$('monthly-cutoff').value,mode=trainingMode();
    const matching=lastRuns.filter(run=>run.cutoff===cutoff&&(run.mode||'operational')===mode&&(run.dataset_id||undefined)===uploadId());
    const activeRun=lastRuns.find(isUpdating),updating=Boolean(activeRun);
    const verified=matching.some(run=>['ready','published'].includes(run.status));
    const reportsDone=Boolean(uploadId())||loadedReportMonth===cutoff&&reportComplete;
    const reportsNeedReview=loadedReportMonth===cutoff&&confirmedCount!==null&&!reportsDone;
    const activeStep=updating?'train':reportsNeedReview?'reports':verified?'review':reportsDone?'train':'reports';
    const savedCsv=updating?Boolean(activeRun.dataset_id):Boolean(uploadId());
    const preview=updating?activeRun.mode===mixedMode||savedCsv:mode===mixedMode;
    const reportStatus=savedCsv?'Saved CSV selected':updating?'Confirmed for run':loadedReportMonth===cutoff&&confirmedCount!==null?confirmedCount+' of 7 confirmed':verified?'Confirmed for run':'Awaiting review';
    message(savedCsv?'Use saved CSV':'Confirm reports','monthly-step-source-label');
    message(preview?'Review results':'Review & publish','monthly-step-review-label');
    message(reportStatus,'monthly-step-report-status');
    message(updating?'In progress':verified?'Complete':reportsDone?'Ready to start':'Confirm reports first','monthly-step-training-status');
    message(verified&&!updating?'Results available':'Awaiting results','monthly-step-review-status');
    for(const step of ['reports','train','review']){
        const item=$('monthly-step-'+step);
        item.setAttribute('aria-current',step===activeStep?'step':'false');
        item.dataset.complete=String(step==='reports'?(updating||reportsDone||(!reportsNeedReview&&verified)):step==='train'&&verified&&!updating);
    }
 }
 function trainingFailure(run){
    const reason=run.progress?.message||run.error||'Training ended before results could be verified.';
    return reason.includes('host_memory_pressure')?'Training stopped because available memory was low.':reason;
 }

 function renderTrainingProgress(unavailable=false){
    progressRun=lastRuns.find(isUpdating)||lastRuns[0];
    const run=progressRun,badge=$('monthly-progress-state'),meter=$('monthly-progress-meter'),progress=$('monthly-progress-value');
    const updating=run&&isUpdating(run),ready=run&&['ready','published'].includes(run.status);
    const count=run?.progress?.completed,hasCount=Number.isInteger(count)&&count>=0&&count<=70;
    const verifying=updating&&(count===70||run.progress?.state==='complete');
    let label='',countText='',note='';
    badge.hidden=!run;
    meter.hidden=!updating;
    $('monthly-progress-review').hidden=!ready;
    if(!run){
        message(unavailable?'Training status unavailable':'No training run yet','monthly-progress-context');
        note=unavailable?'Use Check again to refresh training status.':'Start training after selecting a source and history range.';
    }else{
        const source=run.dataset_id?'Saved CSV preview':run.mode===mixedMode?'Dataset-backed preview':'Operational reports';
        message(monthLabel(shiftMonth(run.cutoff,1))+' first prediction month · '+source,'monthly-progress-context');
        badge.dataset.state=ready?'confirmed':updating?'waiting':'failed';
        if(updating){
            label=verifying?'Verifying results':run.status==='queued'?'Queued':hasCount?'Training and testing':'Starting training';
            countText=hasCount?count+' of 70 combinations processed':run.status==='queued'?'Waiting for the training worker to start':'Waiting for the first progress update';
            note=verifying?'The server is checking the saved results before review.':hasCount?'Training and historical testing cover 10 diseases across 7 barangays. Progress updates automatically.':'The request was received. The percentage appears when the worker reports its first count.';
            if(hasCount)progress.value=count;
            else progress.removeAttribute('value');
            message(hasCount?Math.round(count*100/70)+'%':'','monthly-progress-percent');
        }else if(ready){
            label='Ready to review';
            note='Saved results passed verification. Open the version to review its predictions and historical test results.';
        }else{
            label='Training stopped';
            note=trainingFailure(run);
        }
    }
    if(unavailable&&run)note='Showing the last reported status. '+(updating?'Checking again automatically.':'Use Check again to refresh.');
    message(label,'monthly-progress-state');
    message(countText,'monthly-progress-count');
    message(note,'monthly-progress-note');
    const announcement=[label,countText,unavailable?'Training status could not be refreshed.':''].filter(Boolean).join('. ');
    if($('monthly-progress-announcement').textContent!==announcement)message(announcement,'monthly-progress-announcement');
 }

 function renderRun(run,published){
    const line=node('div','admin-monthly-row'),copy=node('div');
    const badge=node('p','admin-monthly-badge',published?'Currently published':run.status==='published'?'Previously published':run.status==='ready'?'Ready to review':'Failed');
    badge.dataset.state=run.status==='failed'?'attention':'confirmed';
    copy.append(node('p','font-semibold',monthLabel(shiftMonth(run.cutoff,1))+' prediction'),badge);
    copy.append(node('p','admin-monthly-run-context',(run.dataset_id?'Saved CSV '+run.dataset_id.slice(0,8):run.mode===mixedMode?'Dataset-backed preview':'Operational reports')+' · History through '+monthLabel(run.cutoff)));
    if(run.status==='failed')copy.append(node('p','text-sm',trainingFailure(run)));
    line.append(copy,button(run.status==='failed'?'View failure details':'Review version',()=>review(run.id,true)));
    return line;
 }
 async function loadStatus(){
    clearTimeout(timer);
    const sequence=++statusSequence;
    const check=$('monthly-check-worker');
    check.disabled=true;
    try{
        const state=await request('/status'),host=$('monthly-runs');
        if(sequence!==statusSequence)return;
        showPublication(state);
        lastRuns=state.runs;
        renderSteps();
        renderTrainingProgress();
        const updating=lastRuns.some(isUpdating);
        canPrepare=state.python_configured===true&&(state.worker_ready===true||state.worker_ready===undefined&&state.worker_platform==='Windows bounded worker')&&!updating;
        $('monthly-create').disabled=!canPrepare||preparing;
        if(updating)showWorkerStatus('running','Update in progress','');
        else if(canPrepare)showWorkerStatus('ready','Training worker ready','');
        else if(lowMemory(state.worker_message))showWorkerStatus('paused','Training temporarily unavailable','You can still review saved predictions.');
        else showWorkerStatus('attention','Training unavailable','You can still confirm monthly reports.',state.worker_message||state.worker_platform||'The server did not report a ready training worker.');
        const verified=lastRuns.filter(run=>!isUpdating(run)&&run.status!=='failed');
        const failed=lastRuns.filter(run=>run.status==='failed');
        const rows=verified.map(run=>renderRun(run,state.publication?.run_id===run.id));
        if(!rows.length)rows.push(node('p','text-sm','Verified versions appear here after training.'));
        host.replaceChildren(...rows);
        $('monthly-past-attempts').hidden=!failed.length;
        message('('+failed.length+')','monthly-past-count');
        const key=JSON.stringify(failed);
        if(key!==pastRunsKey){
            $('monthly-past-runs').replaceChildren(...failed.map(run=>renderRun(run,false)));
            pastRunsKey=key;
        }
        if(updating&&active)timer=setTimeout(loadStatus,10000);
    }catch(e){
        if(sequence!==statusSequence)return;
        renderTrainingProgress(true);
        if(active&&lastRuns.some(isUpdating))timer=setTimeout(loadStatus,10000);
        canPrepare=false;
        $('monthly-create').disabled=true;
        showWorkerStatus('attention','Training status unavailable','Check again to retry.',e.message);
    }finally{if(sequence===statusSequence)check.disabled=false;}
 }
 function setActive(next){
    if(active===next)return;
    active=next;
    if(active){
        if(!uploadId())loadReports().catch(e=>message(e.message));
        if(reviewedRun)review(reviewedRun).catch(e=>message(e.message));
        return loadStatus();
    }
    statusSequence++;
    clearTimeout(probabilityTimer);clearTimeout(timer);
 }

 function openReports(period=latestCompletedMonth){
    const source=$('monthly-history-source');
    if(uploadId()||(trainingMode()===mixedMode&&period<firstReport)){
        source.value='operational';
        updateRange();
    }
    $('monthly-report-month').value=period;
    return loadReports().catch(error=>message(error.message,'monthly-report-summary'));
 }

 function initialize(){
    if(!$('monthly-updates'))return;
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit'}).formatToParts(new Date());
    let year=Number(parts.find(p=>p.type==='year').value),month=Number(parts.find(p=>p.type==='month').value)-1;
    if(!month){month=12;year--;}
    latestCompletedMonth=year+'-'+String(month).padStart(2,'0');
    for(const id of ['monthly-report-month','monthly-cutoff'])$(id).max=latestCompletedMonth;
    $('monthly-cutoff').min='1903-09';
    $('monthly-report-month').value=latestCompletedMonth;
    $('monthly-cutoff').value=latestCompletedMonth;
    updateRange();
    $('monthly-history-source').addEventListener('change',()=>{
        const version=uploadedVersions.get(uploadId());
        $('monthly-cutoff').value=version?.trainingRange.cutoff||latestCompletedMonth;
        updateRange();
    });
    $('monthly-start').addEventListener('input',updateRange);
    $('monthly-cutoff').addEventListener('input',updateRange);
    $('monthly-use-range').addEventListener('click',()=>{$('monthly-start').value=$('monthly-start').max;updateRange();});
    initializeReportControls();
    const refreshReports=()=>{if(loadedReportMonth&&active&&!reportWriting)loadReports();};
    window.addEventListener?.('health-intel:classification-reviewed',refreshReports);
    $('monthly-report-month').addEventListener('change',()=>{clearReports();return loadReports();});
    $('monthly-load-reports').addEventListener('click',loadReports);
    $('monthly-progress-review').addEventListener('click',()=>review(progressRun.id,true).catch(e=>message(e.message,'monthly-progress-note')));
    $('monthly-refresh').addEventListener('click',loadStatus);
    $('monthly-check-worker').addEventListener('click',loadStatus);
    $('monthly-create').addEventListener('click',async()=>{
        if(!canPrepare||preparing)return;
        const tell=text=>message(text,'monthly-prepare-message');
        const b=$('monthly-create'),start=$('monthly-start').value,cutoff=$('monthly-cutoff').value,mode=trainingMode(),dataset_id=uploadId();
        if(!start||!cutoff||start>cutoff||cutoff>latestCompletedMonth){tell('Choose a valid range of completed reporting months.');return;}
        const count=monthIndex(cutoff)-monthIndex(start)+1;
        if(count<45||count>120){tell('Choose 45 to 120 months in a row. Use the 45-month range button for the minimum.');return;}
        if(!dataset_id&&loadedReportMonth>=(mode===mixedMode?firstReport:start)&&loadedReportMonth<=cutoff&&!reportComplete){
            tell('Finish confirming all seven reports for '+loadedReportMonth+' before preparing this update.');
            return;
        }
        preparing=true;
        b.disabled=true;
        tell('');
        try{
            const description=dataset_id?'Train and test SARIMA with the selected saved CSV. Results stay in Model Training.':mode===mixedMode?'Train with the historical dataset and newer confirmed reports. Review the resulting preview below.':'The system checks all selected months for complete reports before starting. Your current predictions stay available while the update runs.';
            if(!await approval('Prepare a new SARIMA update?',description))return;
            if(start!==$('monthly-start').value||cutoff!==$('monthly-cutoff').value||mode!==trainingMode()||dataset_id!==uploadId())return;
            const run=await request('/runs',{start,cutoff,mode,...(dataset_id?{dataset_id}:{})});
            if(run.id&&run.cutoff){
                lastRuns=[{...run,mode,dataset_id},...lastRuns.filter(previous=>previous.id!==run.id)];
                renderSteps();
                renderTrainingProgress();
            }
            tell(['ready','published'].includes(run.status)?'A verified version already exists for this input.':'Training requested. Progress appears at the top of this tab.');
            $('monthly-progress-title').focus();
            await loadStatus();
        }catch(e){
            if(lowMemory(e.message)){
                tell('Training is temporarily unavailable. You can still review saved predictions.');
                await loadStatus();
            }else tell(e.message);
        }finally{preparing=false;b.disabled=!canPrepare;}
    });
    window.HealthIntelMonthlyUpdates={setActive,setDatasets,openReports};
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
