(() => {
    const byId=id=>document.getElementById(id);
    const today=()=>HealthIntelDate.todayInManila();
    const format=value=>new Intl.DateTimeFormat('en-PH',{
        timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'
    }).format(new Date(value));
    const dateAtSubmission=value=>new Intl.DateTimeFormat('en-CA',{
        timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'
    }).format(new Date(value));
    async function json(url,options) {
        return (await fetch(url,options)).json();
    }

    const bhwDate=byId('bhw-report-date');
    if(bhwDate) {
        const send=byId('daily-submission-send');
        const message=byId('daily-submission-status');
        const endpoint='/api/bhw/reports/daily-submission';
        let pending=0, preview, saving=false;
        async function refresh() {
            const request=++pending;
            preview=null;
            send.disabled=true;
            if(!bhwDate.value){message.textContent='Choose a report date.';return;}
            message.textContent='Loading reported totals…';
            try {
                const data=await json(endpoint+'?'+new URLSearchParams({date:bhwDate.value}));
                if(request!==pending)return;
                preview=data;
                const totals=`${data.case_count} cases · ${data.consultation_count} consultations`;
                const saved=data.submission;
                const changed=saved&&(saved.case_count!==data.case_count||saved.consultation_count!==data.consultation_count);
                message.textContent=saved ? `${totals}. Last submitted ${format(saved.submitted_at)}.${changed?' Totals have changed.':''}` : `${totals}. Awaiting submission.`;
                send.textContent=changed?'Resubmit Report':saved?'Report Submitted':'Submit Report';
                send.disabled=saving||Boolean(saved&&!changed);
            } catch(error) {if(request===pending)message.textContent=error.message;}
        }
        send.addEventListener('click',async()=>{
            const data=preview;
            if(saving||!data||data.date!==bhwDate.value)return;
            if(!await Swal.fire({title:'Submit Daily Report?',text:`${data.date} · ${data.case_count} cases · ${data.consultation_count} consultations. Confirm the totals, including a zero-case day when reporting is complete.`,
                icon:'question',showCancelButton:true,confirmButtonText:'Submit report'}).then(result=>result.isConfirmed))return;
            if(data!==preview||data.date!==bhwDate.value)return;
            saving=true;
            send.disabled=true;
            try {
                await json(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({date:data.date,case_count:data.case_count,consultation_count:data.consultation_count})});
                await refresh();
            } catch(error) {
                await refresh();
                message.textContent=error.message;
            } finally {
                saving=false;
                const s=preview?.submission;
                send.disabled=!preview||Boolean(s&&s.case_count===preview.case_count&&s.consultation_count===preview.consultation_count);
            }
        });
        bhwDate.addEventListener('change',refresh);
        document.querySelector('[data-daily-today="bhw"]').addEventListener('click',()=>queueMicrotask(refresh));
        document.querySelector('[data-target="view-reports"]').addEventListener('click',refresh);
        window.addEventListener('hashchange',()=>{if(location.hash==='#view-reports')refresh();});
        window.addEventListener('DOMContentLoaded',()=>{if(location.hash==='#view-reports')refresh();});
    }

    const adminDate=byId('admin-report-date');
    if(adminDate) {
        const barangay=byId('admin-report-barangay'), body=byId('admin-report-rows'), message=byId('admin-report-status');
        let request=0, records=[], reportDate='';
        adminDate.value=adminDate.max=today();
        async function viewReport(row,date,status) {
            const details=[date,status];
            if(row.submitted_at) {
                details.push(`${row.case_count} cases · ${row.consultation_count} consultations`,
                    `Last submitted ${format(row.submitted_at)} Philippine time.`);
                if(!row.has_pdf)details.push('This earlier submission saved totals only.');
            } else details.push('The barangay has yet to submit this report.');
            const result=await Swal.fire({
                titleText:`${row.name} daily report`, text:details.join(' · '),
                confirmButtonText:row.has_pdf?'Download Report PDF':'Close',
                showCancelButton:Boolean(row.has_pdf),cancelButtonText:'Close',returnFocus:true
            });
            if(result.isConfirmed&&row.has_pdf) {
                try {
                    const query=new URLSearchParams({date,barangay_id:row.id});
                    await HealthIntel.download('/api/admin/reports/daily-submissions/pdf?'+query);
                } catch(error) { await Swal.fire({icon:'error',titleText:'Report unavailable',text:error.message}); }
            }
        }
        function render() {
            const list=records.filter(row=>!barangay.value||String(row.id)===barangay.value);
            body.replaceChildren();
            for(const row of list) {
                const submitted=row.submitted_at!==null;
                const late=submitted&&dateAtSubmission(row.first_submitted_at)>reportDate;
                const status=submitted?(row.case_count===0?'Submitted with zero cases':'Submitted')+(late?' · Late':'')
                    :reportDate===today()?'Awaiting submission':'Missing';
                const tr=body.insertRow();
                tr.className='border-b border-slate-200 dark:border-slate-800';
                const date=reportDate;
                const open=document.createElement('button');
                open.type='button';
                open.className='admin-report-open';
                open.textContent=row.name;
                open.setAttribute('aria-label',`View report for ${row.name}`);
                tr.addEventListener('click',()=>viewReport(row,date,status));
                const nameCell=tr.insertCell();
                nameCell.className='p-3';
                nameCell.append(open);
                for(const value of [status,row.case_count??'—',row.consultation_count??'—',submitted?format(row.submitted_at):'—']) {
                    const cell=tr.insertCell();cell.className='p-3';cell.textContent=value;
                }
            }
            if(records.length)message.textContent=`${list.filter(row=>row.submitted_at).length} of ${list.length} barangays submitted.`;
        }
        async function refresh() {
            const current=++request;
            records=[];
            body.replaceChildren();
            adminDate.max=today();
            if(!adminDate.value){message.textContent='Choose a report date.';return;}
            message.textContent='Loading report submissions…';
            try {
                const result=await json('/api/admin/reports/daily-submissions?'+new URLSearchParams({date:adminDate.value}));
                if(current!==request)return;
                records=result.data;reportDate=result.date;
                const selected=barangay.value;
                barangay.replaceChildren(new Option('All barangays',''),...records.map(row=>new Option(row.name,row.id)));
                if(records.some(row=>String(row.id)===selected))barangay.value=selected;
                render();
                if(!records.length)message.textContent='No barangays are configured.';
            } catch(error) {if(current===request)message.textContent=error.message;}
        }
        byId('nav-reports').addEventListener('click',refresh);
        byId('admin-report-refresh').addEventListener('click',refresh);
        adminDate.addEventListener('change',refresh);
        barangay.addEventListener('change',render);
        window.addEventListener('DOMContentLoaded',()=>{if(location.hash==='#view-report-management')refresh();});
    }
})();
