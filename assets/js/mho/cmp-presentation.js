(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.HealthIntelCmpPresentation=factory(root.document);
})(typeof window==='object'?window:this,function(document){
 'use strict';
 const finite=x=>typeof x==='number'&&Number.isFinite(x),close=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<1e-8;
 function validate(result){
  const r=result?.experimental_probability,b=r?.binding,v=result?.view,c=result?.context,p=result?.provenance,f=v?.production?.['1'];
  if(r?.status!=='available'||r.schema!==1||r.experimental!==true||r.policy!=='conditional-pooled-CMP'||b?.cmp_policy!==r.policy||p?.mode!==b.mode||p.version!==b.sarima_version||p.dataset_sha256!==b.dataset_sha256||c?.cutoff!==b.cutoff||f?.cutoff!==b.cutoff||f.target!==b.target||f.horizon!==1||f.actual_model!=='SARIMA'||r.disease!==v.disease||r.barangay!==v.barangay||!close(r.mean,f.prediction)||!finite(r.mean)||r.mean<0||r.count!==Math.floor(r.mean+.5))return null;
  const common=['dataset_sha256','sarima_policy_sha256','cmp_policy_sha256','cmp_source_sha256'];
  let keys;
  if(b.mode==='saved_verified_mixed_demonstration_results'){
   if(c.source_sha256!==b.dataset_sha256)return null;
   keys=['snapshot_sha256','october_sha256','manifest_sha256','results_sha256'];
  }else if(b.mode==='verified_operational_monthly_snapshot'){
   if(c.main_target!==b.target||p.sarima_output_sha256!==b.sarima_output_sha256||p.sarima_policy_sha256!==b.sarima_policy_sha256||
      b.cmp_policy_sha256!=='0cbff37d20f6aaa6b2f494b227c1792dc3eef5b465e2e2ef425e32acf25a9e58'||
      b.cmp_source_sha256!=='89b77ff5ac90875462a39f8e73eba621d75ad377374faf513601e9da1cff9915'||f.fallback)return null;
   keys=['sarima_output_sha256','probability_sha256'];
  }else return null;
  if([...common,...keys].some(key=>!/^[a-f0-9]{64}$/.test(b[key]||'')))return null;
  const a=r.probabilities;if(!Array.isArray(a)||!a.length||a.length>8193||a.some(x=>!finite(x)||x<0||x>1)||!close(a.reduce((s,x)=>s+x,0),1)||!close(a.reduce((s,x,k)=>s+k*x,0),r.mean)||!close(a[r.count]||0,r.exact)||!close(a.slice(Math.max(0,r.count-1),r.count+2).reduce((s,x)=>s+x,0),r.nearby)||!close(1-a[0],r.positive))return null;
  for(const[key,level]of [['range80',.8],['range95',.95]]){let sum=0;const interval=[];for(let k=0;k<a.length;k++){sum+=a[k];if(!interval.length&&sum>=(1-level)/2)interval.push(k);if(sum>=(1+level)/2){interval.push(k);break;}}if(JSON.stringify(r[key])!==JSON.stringify(interval))return null;}
  return r;
 }
 function percent(p){if(!finite(p)||p<0||p>1)return 'Unavailable';return p===0?'0%':p===1?'100%':p<.0001?'<0.01%':p>.9999?'>99.99%':(100*p).toFixed(2)+'%';}
 function probabilityCalculation(result){
  const low=Math.max(0,result.count-1),high=result.count+1;
  const nearby=Array.from({length:high-low+1},(_,i)=>{
   const count=low+i;
   return {count,probability:result.probabilities[count]??0};
  });
  return {low,high,nearby,exact:result.probabilities[result.count]??0,
   total:nearby.reduce((sum,row)=>sum+row.probability,0)};
 }
 if(!document)return {validate,percent,probabilityCalculation};
 const $=id=>document.getElementById(id),txt=(id,x)=>{$(id).textContent=x;};
 const el=(tag,classes,text,id)=>{const n=document.createElement(tag);n.className=classes||'';if(text!==undefined)n.textContent=text;if(id)n.id=id;return n;};
 const estimateModel=$('mho-estimate-model');
 const unroundedId=estimateModel?'mho-estimate-unrounded':'cmp-unrounded';
 let active=false;
 function probabilityInfo(){
  const info=el('details','relative shrink-0',undefined,'cmp-calculation');
  info.hidden=true;
  const button=el('summary','grid h-8 w-8 cursor-pointer list-none place-content-center rounded-full border border-border bg-card text-xs font-bold text-foreground marker:hidden','i');
  button.setAttribute('aria-label','Show the COM-Poisson probability calculation');
  button.title='Show the COM-Poisson probability calculation';
  const panel=el('div','absolute right-0 top-10 z-30 w-72 max-w-[calc(100vw-6rem)] rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-foreground shadow-xl',undefined,'cmp-calculation-panel');
  info.append(button,panel);
  info.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&info.open){info.open=false;button.focus();}
  });
  document.addEventListener('pointerdown',event=>{if(!info.contains(event.target))info.open=false;});
  return info;
 }
 function renderProbabilityInfo(result){
  const info=$('cmp-calculation');
  if(!info)return;
  const panel=$('cmp-calculation-panel');
  info.open=false;
  info.hidden=!result;
  panel.replaceChildren();
  if(!result)return;
  const values=probabilityCalculation(result);
  panel.append(
   el('p','font-semibold','How COM-Poisson gets these probabilities'),
   el('p','mt-2 font-medium',`${result.disease} · ${result.barangay}`),
   el('p','mt-2 tabular-nums',`Expected cases from SARIMA · ${result.mean.toFixed(4)}`)
  );
  if(finite(result.nu)&&result.nu>0){
   panel.append(el('p','mt-2 tabular-nums',`Dispersion (ν) · ${result.nu.toFixed(6)}. This controls how spread out the probabilities are. The fit pools earlier results for this disease.`));
  }
  panel.append(
   el('p','mt-2 rounded-lg bg-muted p-2 tabular-nums',`Exactly ${result.count} cases · ${percent(values.exact)}`),
   el('p','mt-2 font-semibold',`Within one case · ${values.low}–${values.high} cases`)
  );
  const list=el('ul','mt-1 space-y-1 tabular-nums');
  for(const row of values.nearby)list.append(el('li','',`${row.count} cases · ${percent(row.probability)}`));
  panel.append(list,el('p','mt-2 font-semibold tabular-nums',`Combined probability · ${percent(values.total)}`),
   el('p','mt-2','The total is calculated before rounding each percentage.'));
 }
 function enable(on){
  if(!on||active)return;active=true;
  const dash=$('sarima-dashboard'),summary=$('sarima-summary'),history=dash.querySelector('aside');
  dash.className='grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]';
  const notice=el('p','mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100','Experimental model-based probabilities · Validation against new MHO-confirmed monthly outcomes is still required.','cmp-notice');dash.before(notice);
  summary.classList.remove('mt-5');txt('sarima-summary-title','Count and probabilities');
  const months=$('forecast-months');months.className='grid min-w-0 grid-cols-1 gap-4';
  const detail=el('details','mt-4 border-t border-border pt-3');detail.append(el('summary','cursor-pointer text-sm font-semibold text-foreground','Recorded history and SARIMA model details'));
  const oldExplanation=$('sarima-evaluation-summary').parentElement;oldExplanation.hidden=true;
  const content=el('div','mt-3 space-y-3 text-xs leading-relaxed text-foreground');
  content.append(months.querySelector('dl'),$('sarima-main-range'),$('predictive-insight-text'),$('sarima-history-summary'),$('sarima-evaluation-summary'),$('sarima-seasonality-note'));detail.append(content);months.after(detail);
  const card=el('div','space-y-3','', 'cmp-count-probabilities');
  if(estimateModel){
   const heading=el('div','flex items-center justify-between gap-3');
   heading.append(el('h3','text-sm font-bold text-teal-800 dark:text-teal-200','COM-Poisson probabilities','cmp-probability-title'));
   if($('sarima-estimate-info'))heading.append(probabilityInfo());
   card.append(heading);
  }else{
   card.append(el('p','text-xs font-semibold text-blue-800 dark:text-blue-200','Case count: SARIMA · Experimental probabilities: conditional-pooled COM-Poisson'));
   card.append(el('p','text-xs text-foreground','', 'cmp-unrounded'));
  }
  for(const[k,label]of [['exact','Exactly the estimated count'],['nearby','Within one case']]){
   const row=el('div','flex flex-wrap items-center justify-between gap-3 border-b border-border py-3');
   const name=el('div','min-w-0');name.append(el('p','text-sm font-semibold text-foreground',label,'cmp-'+k+'-label'),el('p','mt-1 text-xs text-foreground','COM-Poisson · Estimated probability'));
   row.append(name,el('strong','text-2xl font-bold tabular-nums text-teal-800 dark:text-teal-200','—','cmp-'+k));card.append(row);
  }
  card.append(el('p','rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-foreground dark:bg-slate-900','','cmp-intervals'),el('p','text-xs leading-relaxed text-foreground','Select Predict to see the matching saved probability evidence.','cmp-status'));
  card.lastElementChild.setAttribute('role','status');months.append(card);
  const distribution=el('section','min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6',undefined,'cmp-distribution-panel');distribution.setAttribute('aria-labelledby','cmp-distribution-title');
  distribution.append(el('p','mb-2 text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-200','COM-Poisson probability distribution'),el('h2','text-lg font-bold text-foreground','Possible case counts','cmp-distribution-title'),el('p','mt-2 text-sm leading-relaxed text-foreground','Highlighted counts are within one case of the SARIMA estimate. Hover or focus a bar for its experimental probability.'),el('div','mt-4 min-w-0','','cmp-distribution'),el('p','mt-2 min-h-10 text-xs leading-relaxed text-foreground','Select Predict to view the distribution.','cmp-distribution-readout'));
  dash.append(summary,distribution,history);
  $('cmp-distribution-readout').setAttribute('aria-live','polite');
  history.querySelector('h2').textContent='Historical SARIMA performance';
  history.querySelector('svg').classList.add('hidden');const score=el('p','my-5 text-4xl font-bold tabular-nums text-blue-800 dark:text-blue-200','—','cmp-history-score');history.querySelector('svg').after(score);
  reset();
 }
 function reset(){if(!active)return;renderProbabilityInfo(null);for(const id of ['cmp-exact','cmp-nearby','cmp-history-score'])txt(id,'—');for(const id of [unroundedId,'cmp-intervals'])txt(id,'');if(estimateModel)estimateModel.textContent='SARIMA case estimate';txt('cmp-status','Select Predict to load the matching saved results.');$('cmp-distribution').replaceChildren();txt('cmp-distribution-readout','Select Predict to view the distribution.');}
 function distribution(r){
  let sum=0,last=0;for(let k=0;k<r.probabilities.length;k++){sum+=r.probabilities[k];last=k;if(sum>=.9999)break;}last=Math.max(last,r.count+1,r.range95[1],6);
  const end=Math.min(last,60),p=r.probabilities,ns='http://www.w3.org/2000/svg',n=(tag,a={},text)=>{const x=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(a))x.setAttribute(k,v);if(text!==undefined)x.textContent=text;return x;};
  const svg=n('svg',{viewBox:'0 0 560 260',width:'100%',class:'text-foreground',role:'img','aria-label':`Experimental conditional-pooled COM-Poisson probabilities for ${r.disease} in ${r.barangay}`}),max=Math.max(...p),w=490/(end+1);
  svg.append(n('line',{x1:40,x2:540,y1:222,y2:222,stroke:'#64748b'}));
  for(let k=0;k<=end;k++){
   const prob=p[k]||0,near=k>=Math.max(0,r.count-1)&&k<=r.count+1,h=prob/max*165,x=40+k*w+2;
   const bar=n('rect',{x,y:222-h,width:Math.max(1,w-4),height:Math.max(prob?2:0,h),rx:3,fill:near?'currentColor':'#64748b',class:near?'text-teal-800 dark:text-teal-200':'',tabindex:0,role:'img','aria-label':`${k} cases: ${percent(prob)} experimental probability`});
   const announce=()=>txt('cmp-distribution-readout',`${k} cases · ${percent(prob)} experimental model probability${near?' · nearby range':''}`);bar.addEventListener('focus',announce);bar.addEventListener('pointerenter',announce);bar.append(n('title',{},`${k} cases: ${percent(prob)}`));svg.append(bar);
   svg.append(n('text',{x:x+(w-4)/2,y:240,'text-anchor':'middle',fill:'currentColor','font-size':12},k));
   if(prob>=.02&&end<18)svg.append(n('text',{x:x+(w-4)/2,y:Math.max(15,214-h),'text-anchor':'middle',fill:'currentColor','font-size':11},percent(prob)));
  }
  $('cmp-distribution').replaceChildren(svg);
  const visible=p.slice(0,end+1).reduce((a,b)=>a+b,0);txt('cmp-distribution-readout',`Horizontal axis: case count. Bar height: experimental probability. Shown counts contain ${percent(Math.min(1,visible))} of model mass; calculations retain the full saved distribution.`);
 }
 function render(result,d){
  if(!active)return null;
  const r=validate(result);
  renderProbabilityInfo(r);
  txt('cmp-history-score',finite(d.score)?d.score.toFixed(2)+'%':'Unavailable');txt('cmp-exact-label','Exactly the estimated count');txt('cmp-nearby-label','Within one case');txt(unroundedId,d.available?'Unrounded expected count: '+d.prediction.toFixed(4):estimateModel?'':'SARIMA count unavailable');
  if(!r){txt('cmp-exact','Unavailable');txt('cmp-nearby','Unavailable');txt('cmp-status','Experimental probability unavailable. '+({
   genuine_history_review_required:'This version has no published probability based on MHO-reviewed history.',
   insufficient_prior_prediction_pairs:'There are too few usable earlier SARIMA predictions and confirmed outcomes for this disease.',
   SARIMA_unavailable:'This selection has no accepted SARIMA estimate.',
   zero_mean_positive_training_outcome:'A prior zero estimate was followed by recorded cases, so the frozen calculation could not fit this disease.',
  }[result.experimental_probability?.reason]||'No verified probability is available for this prediction version.'));txt('cmp-intervals','Experimental COM-Poisson intervals unavailable.');$('cmp-distribution').replaceChildren();txt('cmp-distribution-readout','No matching probability distribution is displayed.');return null;}
  txt('sarima-method','SARIMA + COM-Poisson');txt('cmp-exact-label',`Exactly ${r.count} ${r.count===1?'case':'cases'}`);txt('cmp-nearby-label',`${Math.max(0,r.count-1)}–${r.count+1} cases`);txt('cmp-exact',percent(r.exact));txt('cmp-nearby',percent(r.nearby));
  txt('cmp-intervals',`Experimental conditional-pooled COM-Poisson intervals: 80% = ${r.range80.join('–')}; 95% = ${r.range95.join('–')} cases.`);txt('cmp-status','Model-based estimates, not validated real-world probabilities. Historical test performance is shown separately.');distribution(r);
  return {lower:r.range95[0],upper:r.range95[1],label:'Experimental conditional-pooled COM-Poisson 95% model interval'};
 }
 return {enable,reset,render,validate,percent,get active(){return active;}};
});
