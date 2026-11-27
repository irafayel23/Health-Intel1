(() => {
    const labels = {
        saved:'Visit saved', requested:'Awaiting approval', sent:'Sent', acknowledged:'Awaiting arrival',
        arrived:'Awaiting assessment', follow_up:'Barangay follow-up', closed:'Completed'
    };
    async function request(url,method='GET',body) {
        const options = body === undefined ? {method} : {
            method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
        };
        const response = await fetch(url,options);
        const result = await response.json();
        if ((!response.ok || !result.success) && result.code!=='RESIDENT_REVIEW_REQUIRED')
            throw Error(result.error || 'The request could not be completed. Try again.');
        return result;
    }
    function add(parent,tag,text,className) {
        const node=document.createElement(tag);
        node.textContent=text;
        if(className)node.className=className;
        parent.append(node);
        return node;
    }
    function printSlip(row) {
        const slip=window.open('','_blank','popup,width=680,height=640');
        if(!slip)throw Error('Allow pop-ups to open the referral slip.');
        slip.opener=null;
        const doc=slip.document;
        doc.title='Referral INT-'+row.id;
        const main=doc.createElement('main');
        doc.body.append(main);
        add(main,'h1','Health-Intel referral');
        add(main,'p','Referral number · INT-'+row.id);
        add(main,'p','Patient · '+row.patient_name);
        add(main,'p','Referring barangay · '+row.barangay_name);
        add(main,'p','Receiving facility · '+row.destination);
        add(main,'p','Reason for referral · '+row.referral_reason);
        add(main,'p','Issued · '+formatDate(row.sent_at));
        const button=add(main,'button','Print referral slip');
        button.onclick=()=>slip.print();
        const css=doc.createElement('style');
        css.textContent='body{font:16px/1.5 system-ui;padding:24px} @media print{button{display:none}}';
        doc.head.append(css);
    }
    const formatDate=value=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila'});
    const formatDay=value=>new Date(value+'T00:00:00Z').toLocaleDateString('en-PH',
        {month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
    const buttonStyle='hi-referral-action';
    function mountQueue(root,{role,firstPage=1,filters=()=>({}),emptyMessage=()=>'No records on this page.',reopen}) {
        const mho=role==='mho',base=mho?'/api/mho/referrals':'/api/bhw/intakes';
        const find=selector=>root.querySelector(selector);
        const status=find('[data-referral-status]');
        const list=find('[data-referral-list]');
        const pages=find('[data-referral-pages]');
        let page=firstPage,revision=0;
        function action(parent,label,run) {
            const button=add(parent,'button',label,buttonStyle);
            button.type='button';
            button.onclick=async()=>{
                button.disabled=true;
                try { await run(); }
                catch (error) { status.textContent=error.message; }
                finally { button.disabled=false; }
            };
            return button;
        }
        async function save(row,action,extra={}) {
            await request(base+'/'+row.id,'PUT',{action,...extra});
            window.dispatchEvent(new Event('health-intel:referrals-changed'));
        }
        function note(row,key,title,caption,date=false) {
            Swal.fire({
                titleText:title,customClass:{popup:'hi-dialog'},
                html:'<div class="hi-encode"><label for="referral-note">'+caption+'</label><textarea id="referral-note" maxlength="500" rows="3"></textarea>'+
                    (date?'<label for="referral-due">Follow-up date</label><input id="referral-due" type="date">':'')+'</div>',
                showCancelButton:true,confirmButtonText:'Save',showLoaderOnConfirm:true,
                allowOutsideClick:()=>!Swal.isLoading(),allowEscapeKey:()=>!Swal.isLoading(),
                didOpen:()=>{if(date)document.getElementById('referral-due').min=HealthIntelDate.todayInManila();},
                confirmButtonColor:'#047857',
                preConfirm:async()=>{
                    try {
                        await save(row,key,{note:document.getElementById('referral-note').value,due_date:document.getElementById('referral-due')?.value});
                        return true;
                    }catch(error){Swal.showValidationMessage(error.message);return false;}
                }
            }).then(result=>{
                if(reopen)reopen(page);
                else if(result.isConfirmed)load();
            });
        }
        function render(row) {
            const card=add(list,'article','','hi-referral-card');
            const header=add(card,'div','','hi-referral-card-header');
            const identity=add(header,'div','');
            add(identity,'h3',row.patient_name);
            add(identity,'p','#INT-'+row.id+' · '+row.barangay_name+' · '+formatDay(row.visit_date),'hi-referral-meta');
            const badge=add(header,'span',row.state==='arrived'&&row.assessed_at?'Awaiting outcome':labels[row.state],'hi-referral-badge');
            badge.dataset.state=row.state;
            const concern=add(card,'div','','hi-referral-concern');
            add(concern,'strong','Reason for visit');
            add(concern,'p',row.concern);
            if(row.referral_reason)add(card,'p','Referral · '+row.destination+' · '+row.referral_reason,'hi-field-help');
            if(row.case_id)add(card,'p','Linked clinical case · #REC-'+row.case_id,'hi-field-help');
            if(row.outcome)add(card,'p',row.outcome,'mt-2');
            if(row.follow_up_due)add(card,'p','Follow-up due · '+formatDay(row.follow_up_due),'hi-field-help');
            if(row.follow_up_result)add(card,'p','Follow-up note · '+row.follow_up_result,'hi-field-help');
            const milestones=[['sent_at','Sent'],['acknowledged_at','Acknowledged'],['arrived_at','Arrived'],['assessed_at','Assessed'],['closed_at','Completed']];
            const events=milestones.filter(([key])=>row[key]);
            if(events.length){
                const history=add(card,'details','','hi-referral-history');
                add(history,'summary','Referral timeline');
                for(const [key,label] of events)add(history,'p',label+' · '+formatDate(row[key]),'hi-field-help');
            }
            const buttons=add(card,'div','','hi-referral-actions');
            function primary(label,run){action(buttons,label,run).classList.add('hi-referral-primary');}
            const transition=(key,label)=>primary(label,async()=>{await save(row,key);await load();});
            if(mho) {
                if(row.state==='requested')transition('issue','Issue referral');
                if(row.state==='sent')transition('acknowledge','Acknowledge receipt');
                if(row.state==='acknowledged')transition('arrive','Mark patient arrived');
                if(row.state==='arrived') {
                    if(!row.assessed_at)primary('Record clinical assessment',()=>{
                        window.dispatchEvent(new CustomEvent('health-intel:assess-referral',{detail:row}));
                    });
                    action(buttons,'Complete referral',()=>note(row,'complete','Complete referral','Assessment outcome or reason no case was recorded'));
                    action(buttons,'Assign follow-up',()=>note(row,'follow_up','Assign barangay follow-up','Instructions for the barangay health worker',true));
                }
            } else {
                if(row.state==='saved')primary('Request referral',()=>note(row,'request','Request referral to Murcia MHO / RHU','Reason for referral'));
                if(row.state==='follow_up') {
                    action(buttons,'Record follow-up note',()=>note(row,'follow_up_note','Record follow-up note','Contact attempted or needs review'));
                    primary('Complete follow-up',()=>note(row,'follow_up_done','Complete follow-up','Follow-up result'));
                }
            }
            if(row.sent_at)action(buttons,'Print referral slip',()=>printSlip(row));
        }
        async function load(reset=false,targetPage=reset?1:page) {
            if(reset){page=1;list.replaceChildren();pages.replaceChildren();}
            const current=++revision;
            const query=new URLSearchParams({page:targetPage,...filters()});
            status.textContent='Loading…';
            list.setAttribute('aria-busy','true');
            try {
                const result=await request(base+'?'+query);
                if(!root.isConnected||revision!==current)return;
                if(!result.data.length&&targetPage>1)return load(false,targetPage-1);
                page=targetPage;
                list.replaceChildren();pages.replaceChildren();
                status.textContent=result.data.length?'':emptyMessage();
                result.data.forEach(render);
                if(page>1)action(pages,'Previous',()=>load(false,page-1));
                if(result.has_more)action(pages,'Next',()=>load(false,page+1));
            }catch(error){
                if(revision===current)status.textContent=error.message;
            }finally{
                if(revision===current)list.setAttribute('aria-busy','false');
            }
        }
        const refresh=action(find('[data-referral-tools]'),'',()=>load());
        refresh.classList.add('hi-referral-icon-action');
        refresh.setAttribute('aria-label',mho?'Refresh referrals':'Refresh visits and referrals');
        refresh.title='Refresh';
        const icon=document.createElement('i');
        icon.setAttribute('data-lucide','refresh-cw');
        icon.setAttribute('aria-hidden','true');
        refresh.append(icon);
        window.lucide?.createIcons();
        return {load};
    }
    function open(role,firstPage=1) {
        if(role==='mho'){
            document.querySelector('[data-target="view-referrals"]')?.click();
            document.querySelector('[data-referral-view="incoming"]')?.click();
            return;
        }
        Swal.fire({
            titleText:'Visits and referrals',width:760,customClass:{popup:'hi-dialog hi-referral-queue'},
            html:'<div class="hi-referral-body"><div class="hi-referral-toolbar"><p>Review saved visits and follow the referrals sent from your barangay.</p>'+
                '<div data-referral-tools></div></div><p data-referral-status role="status"></p><div data-referral-list class="hi-referral-list"></div><div data-referral-pages class="hi-referral-pages"></div></div>',
            confirmButtonText:'Close',showCloseButton:true,
            didOpen:()=>{
                mountQueue(Swal.getPopup(),{role,firstPage,reopen:page=>open(role,page)}).load();
            }
        });
    }
    function initializeMunicipalReferrals() {
        const section=document.getElementById('view-referrals');
        if(!section)return;
        const barangay=document.getElementById('mho-referral-barangay');
        const procedures={
            incoming:['Incoming referrals','Requests, arrivals, and assessments in progress.','No incoming referrals for this selection.'],
            followups:['Barangay follow-ups','Tasks assigned to BHWs through a referral.','No outstanding barangay follow-ups for this selection.'],
            completed:['Completed referrals','Referrals with a recorded outcome and any required barangay follow-up completed.','No completed referrals for this selection.']
        };
        let view='incoming';
        const buttons=[...section.querySelectorAll('[data-referral-view]')];
        const queue=mountQueue(document.getElementById('mho-referral-queue'),{
            role:'mho',filters:()=>({view,barangay_id:barangay.value}),emptyMessage:()=>procedures[view][2]
        });
        const clinical=document.getElementById('mho-followup-panel');
        const heading=document.getElementById('mho-referral-list-title');
        const help=document.getElementById('mho-referral-list-help');
        let choicesLoaded=false,loadingChoices=false;
        async function loadChoices(){
            if(choicesLoaded||loadingChoices)return;
            loadingChoices=true;
            try {
                const result=await request('/api/mho/walk-in-options');
                for(const option of result.data.barangays)barangay.add(new Option(option.name,option.id));
                choicesLoaded=true;
            }catch{ /* The queue is usable across all barangays when choices are temporarily unavailable. */ }
            finally{loadingChoices=false;}
        }
        function selectView(){
            [heading.textContent,help.textContent]=procedures[view];
            for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.referralView===view));
            clinical.hidden=view!=='followups';
            if(!clinical.hidden)window.dispatchEvent(new Event('health-intel:return-consultations-opened'));
            queue.load(true);
        }
        for(const button of buttons)button.addEventListener('click',()=>{
            const next=button.dataset.referralView;
            if(view===next)return;
            view=next;
            selectView();
        });
        barangay.addEventListener('change',()=>queue.load(true));
        document.querySelector('[data-target="view-referrals"]').addEventListener('click',()=>{
            loadChoices();
            selectView();
        });
        const total=document.getElementById('mho-referrals-action-total');
        const summary=document.getElementById('mho-referrals-action-summary');
        let summaryVersion=0;
        async function refreshSummary(){
            const current=++summaryVersion;
            try{
                const {counts}=await request('/api/mho/referrals/summary');
                if(current!==summaryVersion)return;
                const labels={to_issue:'to issue',to_acknowledge:'to acknowledge',to_assess:'to assess',to_complete:'awaiting outcome'};
                const items=Object.entries(labels);
                total.textContent=items.reduce((sum,[key])=>sum+counts[key],0).toLocaleString('en-PH');
                summary.textContent=items.filter(([key])=>counts[key]).map(([key,label])=>counts[key]+' '+label).join(' · ')||
                    'No referrals need action';
            }catch{
                if(current!==summaryVersion)return;
                total.textContent='—';
                summary.textContent='Counts unavailable. Open referrals to check the queue.';
            }
        }
        document.querySelector('[data-target="view-analytics"]')?.addEventListener('click',refreshSummary);
        window.addEventListener('health-intel:referrals-changed',refreshSummary);
        window.addEventListener('health-intel:cases-changed',()=>{
            refreshSummary();
            if(!section.classList.contains('hidden'))queue.load();
        });
        window.addEventListener('focus',refreshSummary);
        refreshSummary();
    }
    function initializeBhwReferralSummary() {
        const open=document.getElementById('bhw-open-referrals');
        if(!open)return;
        const followups=document.getElementById('bhw-assigned-followups');
        const status=document.getElementById('bhw-referral-summary-status');
        let version=0;
        async function refresh() {
            const current=++version;
            try {
                const {counts}=await request('/api/bhw/intakes/summary');
                if(current!==version)return;
                const values=[counts?.open_referrals,counts?.assigned_followups];
                if(values.some(value=>!Number.isSafeInteger(value)||value<0))throw Error('Referral counts unavailable.');
                [open.textContent,followups.textContent]=values.map(value=>value.toLocaleString('en-PH'));
                status.hidden=true;
            } catch {
                if(current!==version)return;
                open.textContent=followups.textContent='—';
                status.hidden=false;
            }
        }
        document.querySelector('[data-target="view-dashboard"]')?.addEventListener('click',refresh);
        window.addEventListener('health-intel:referrals-changed',refresh);
        window.addEventListener('focus',refresh);
        refresh();
    }
    document.addEventListener('DOMContentLoaded',()=>{
        initializeBhwReferralSummary();
        initializeMunicipalReferrals();
    });
    window.HealthIntelReferrals={request,open};
})();
