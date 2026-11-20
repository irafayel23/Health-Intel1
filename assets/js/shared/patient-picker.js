// Existing profile selection is kept in memory and revalidated by the server on save.
(() => {
 const byId=id=>document.getElementById(id),make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
 function bind({prefix,section,fields,identity,barangay,barangayName,onChange=()=>{},busy=()=>false,initialId=null,locked=false}){
  const root=make('div',null,'hi-patient-picker');root.id=prefix+'-patient-picker';
  root.innerHTML=`<div class="hi-picker-intro"><h3>Who is this visit for?</h3><p>Use an existing profile whenever the patient is already registered.</p></div><div class="hi-picker-modes" role="group" aria-label="Patient registration"><button type="button" data-patient-mode="existing" aria-pressed="false"><span class="hi-picker-symbol" aria-hidden="true">⌕</span><span><strong>Existing patient</strong><small>Find a saved patient profile</small></span><span class="hi-picker-check" aria-hidden="true">○</span></button><button type="button" data-patient-mode="new" aria-pressed="true"><span class="hi-picker-symbol" aria-hidden="true">＋</span><span><strong>New patient</strong><small>Register their first patient profile</small></span><span class="hi-picker-check" aria-hidden="true">●</span></button></div><div class="hi-picker-existing" hidden><label for="${prefix}-patient-search">Search name or resident ID</label><input id="${prefix}-patient-search" type="search" maxlength="100" autocomplete="off" placeholder="Type at least 2 characters or RES-ID"><p class="hi-picker-status" role="status" aria-live="polite">Search for a patient to continue.</p><div class="hi-picker-results"></div><div class="hi-picker-profile" hidden></div></div>`;
  fields.before(root);const existing=root.querySelector('.hi-picker-existing'),search=byId(prefix+'-patient-search'),results=root.querySelector('.hi-picker-results'),profile=root.querySelector('.hi-picker-profile'),status=root.querySelector('.hi-picker-status');
  const reviewPanel=make('div',null,'hi-picker-review');reviewPanel.hidden=true;root.append(reviewPanel);
  let approvedReview=null;
  const events=new AbortController(),opts={signal:events.signal};let mode='new',selected=null,draft=null,request=null,timer,version=0,closed=false;
  const controls=Object.values(identity).map(byId),date=byId(prefix==='swal'?'swal-case-date':'walkin-date');
  function clearReview(){approvedReview=null;reviewPanel.hidden=true;reviewPanel.replaceChildren();}
  fields.addEventListener('input',clearReview,opts);
  fields.addEventListener('change',clearReview,opts);
  const name=row=>[row.last_name+',',row.first_name,row.suffix].filter(Boolean).join(' ');
  const age=row=>{if(!date.value||!row.birthdate)return 'Not available';const [y,m,d]=row.birthdate.split('-').map(Number),[cy,cm,cd]=date.value.split('-').map(Number);return String(cy-y-(cm<m||(cm===m&&cd<d)?1:0));};
  function restore(data){for(const [key,id] of Object.entries(identity)){byId(id).value=data?.[key]||'';byId(id)._hiSelect?.refresh();}for(const key of ['first_name','birthdate'])byId(identity[key]).dispatchEvent(new Event('input',{bubbles:true}));if(barangay)byId(barangay).dispatchEvent(new Event('change',{bubbles:true}));}
  function stop(){clearTimeout(timer);request?.abort();version++;}
  function refreshNature(){const nature=byId(prefix==='swal'?'swal-nature':'walkin-nature');for(const option of nature.options)if(option.value==='Follow-up visit')option.disabled=mode==='new';if(mode==='new'&&nature.value==='Follow-up visit'){nature.value='New consultation/case';nature.dispatchEvent(new Event('change',{bubbles:true}));}nature._hiSelect?.refresh();}
  function renderProfile(){profile.replaceChildren();if(!selected)return;const top=make('div',null,'hi-picker-profile-top'),avatar=make('span',(selected.first_name?.[0]||'')+(selected.last_name?.[0]||''),'hi-picker-avatar'),title=make('div');title.append(make('strong',name(selected)),make('p','RES-'+selected.id+' · Existing patient'));top.append(avatar,title);if(!locked){const change=make('button','Change patient','hi-picker-change');change.type='button';change.addEventListener('click',()=>{if(busy())return;selected=null;delete byId(identity.first_name).dataset.residentId;profile.hidden=true;search.hidden=false;root.querySelector('label').hidden=false;status.hidden=false;search.value='';results.replaceChildren();status.textContent='Search for another patient to continue.';restore(null);onChange();search.focus();},opts);top.append(change);}const dl=make('dl',null,'hi-picker-facts');for(const [k,v] of [['Birthdate',selected.birthdate],['Age on consultation date',age(selected)],['Barangay',selected.barangay_name],['Purok / zone',selected.purok],['Linked disease cases',String(selected.case_count)],['Profile action','Use this saved profile']]){const item=make('div');item.append(make('dt',k),make('dd',v||'Not recorded'));dl.append(item);}profile.append(top,dl,make('p','Details come from the saved profile. This does not create another registration.','hi-picker-note'));}
  function choose(row){if(closed||busy())return;if(!row.first_name||!row.last_name||!/^\d{4}-\d{2}-\d{2}$/.test(row.birthdate||'')||!row.purok){status.hidden=false;status.textContent='This profile is missing required identity or address details. Ask the Admin to review it before recording another visit.';return;}stop();selected=row;byId(identity.first_name).dataset.residentId=String(row.id);const [y,m,d]=row.birthdate.split('-');restore({...row,birthdate:`${m}/${d}/${y}`,barangay:String(row.barangay_id)});byId(identity.first_name).dataset.residentId=String(row.id);results.replaceChildren();search.hidden=true;root.querySelector('label').hidden=true;status.hidden=true;profile.hidden=false;renderProfile();onChange();}
  function setMode(next,force=false){if((busy()&&!force)||closed)return;stop();clearReview();if(mode==='new'&&next==='existing')draft=Object.fromEntries(Object.entries(identity).map(([k,id])=>[k,byId(id).value]));mode=next;selected=null;delete byId(identity.first_name).dataset.residentId;fields.hidden=next==='existing';existing.hidden=next!=='existing';profile.hidden=true;search.hidden=false;root.querySelector('label').hidden=false;status.hidden=false;results.replaceChildren();search.value='';status.textContent='Search for a patient to continue.';for(const button of root.querySelectorAll('[data-patient-mode]')){const active=button.dataset.patientMode===mode;button.setAttribute('aria-pressed',String(active));button.querySelector('.hi-picker-check').textContent=active?'●':'○';}if(next==='new'&&draft)restore(draft);else if(next==='existing')restore(null);refreshNature();onChange();}
  async function load(query,select=false){stop();const current=version;request=new AbortController();status.hidden=false;status.textContent='Finding patient profiles…';try{const response=await fetch('http://localhost:3000/api/encoding/residents?'+new URLSearchParams(query),{signal:request.signal}),result=await response.json();if(closed||current!==version)return;if(!response.ok||!result.success)throw Error(result.error||'Patient profiles could not be loaded.');if(select){if(!result.data.length)throw Error('The selected profile is unavailable. Search again.');choose(result.data[0]);return;}results.replaceChildren();status.textContent=result.data.length?`${result.data.length} match${result.data.length===1?'':'es'} shown. Confirm the birthdate and address before choosing.`:'No matching profiles. Try another search or choose New patient.';for(const row of result.data){const button=make('button',null,'hi-picker-result');button.type='button';const content=make('span');content.append(make('strong',name(row)),make('small',`RES-${row.id} · ${row.birthdate||'Birthdate not recorded'} · ${row.barangay_name} · ${row.purok||'Purok not recorded'}`));button.append(content,make('span','→','hi-picker-arrow'));button.addEventListener('click',()=>choose(row),opts);results.append(button);}}catch(error){if(closed||current!==version||error.name==='AbortError')return;results.replaceChildren();status.textContent=error.message||'Profiles could not be loaded. Search again to retry.';}}
  search.addEventListener('input',()=>{stop();results.replaceChildren();selected=null;const q=search.value.trim();if(q.length<2){status.textContent='Type at least 2 characters or the full RES-ID.';return;}timer=setTimeout(()=>load({q}),220);},opts);
  root.querySelectorAll('[data-patient-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.patientMode),opts));
  date.addEventListener('change',()=>{if(selected)renderProfile();},opts);
  function showReview(result){
    clearReview();
    const heading=make('h3','Possible existing patient profiles');
    heading.tabIndex=-1;
    const status=make('p',result.error);status.setAttribute('role','status');
    const candidates=make('div',null,'hi-picker-results');
    for(const row of result.matches){
      const button=make('button',null,'hi-picker-result');button.type='button';
      const content=make('span');
      content.append(make('strong',name(row)),make('small',`RES-${row.id} · ${row.birthdate} · ${row.barangay_name} · ${row.purok||'Purok not recorded'}`));
      button.append(content,make('span','→','hi-picker-arrow'));
      button.addEventListener('click',()=>useExisting(row.id),opts);
      candidates.append(button);
    }
    reviewPanel.append(heading,status,candidates);
    if(result.review){
      const distinct=make('button','Confirm this is a different patient','hi-picker-change');
      distinct.type='button';
      distinct.addEventListener('click',()=>{
        approvedReview=result.review;
        distinct.disabled=true;
        status.textContent='Different patient confirmed. Continue to review and save the new profile.';
        heading.focus();
      },opts);
      reviewPanel.append(distinct);
    }
    reviewPanel.hidden=false;
    heading.focus();
  }
  async function useExisting(id){setMode('existing');await load({id:String(id)},true);}
  refreshNature();if(initialId){useExisting(initialId);if(locked)root.querySelector('.hi-picker-modes').hidden=true;}
  return {payload(){if(mode==='existing'&&!selected){const e=Error('Select an existing patient before continuing.');e.field=search.id;throw e;}return {patient_mode:mode,...(selected?{resident_id:Number(selected.id)}:{}),...(approvedReview?{resident_review:approvedReview}:{})};},showReview,validate(){this.payload();},useExisting,reset(){draft=null;setMode('new',true);},destroy(){closed=true;stop();events.abort();root.remove();fields.hidden=false;delete byId(identity.first_name).dataset.residentId;},get selected(){return selected;}};
 }
 window.HealthIntelPatientPicker={bind};
})();
