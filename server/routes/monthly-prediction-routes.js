const {createForecastDemo}=require('../services/forecast-overview');
const D=require('../services/monthly-data');
const {createMonthlyPredictions}=require('../services/monthly-predictions');
const {registerAdminAnalyticsRoutes}=require('./admin-analytics-routes');
function registerMonthlyPredictionRoutes(app,db,service){
 // Lazy construction keeps existing demonstration and ordinary modules available before local migration/configuration.
 let cached=service;const get=()=>cached||(cached=createMonthlyPredictions(db));
 const handle=(role,work)=>async(req,res)=>{if(req.user?.role!==role)return res.status(403).json({success:false,error:(role==='admin'?'Admin':'MHO')+' access is required.'});try{res.set('Cache-Control','no-store');res.json({success:true,data:await work(get(),req)});}catch(e){res.status(e.status||503).json({success:false,error:e.status?e.message:'The operational monthly workflow is unavailable. Ask the maintainer to check its migration and scientific environment.',code:e.code||'MONTHLY_WORKFLOW_UNAVAILABLE'});}};
 registerAdminAnalyticsRoutes(app, db, { reports: (...args) => get().reports(...args), recorded: (...args) => get().recorded(...args), list: (...args) => get().list(...args), review: (...args) => get().review(...args), start: (...args) => get().start(...args), publicationStatus: (...args) => get().publicationStatus(...args), forecast: (...args) => get().forecast(...args) });
 const mho='/api/mho/operational-predictions';
 const admin='/api/admin/operational-predictions';
 // BHW gets only its own selection and shared dates, without municipal totals.
 const scoped=({overall,context,...data})=>({...data,context:{cutoff:context.cutoff,main_target:context.main_target}});
 const bhw=work=>async(req,res)=>{res.set('Cache-Control','no-store');if(req.user?.role!=='bhw'||!req.user.barangay_id)return res.status(403).json({success:false,error:'Assigned BHW account required.'});try{const [[b]]=await db.execute('SELECT name FROM barangays WHERE id=?',[req.user.barangay_id]);if(!D.BARANGAYS.includes(b?.name))throw Object.assign(Error('Assigned barangay unavailable.'),{status:403});const s=get();res.json({success:true,data:await work(s,req,b.name)});}catch(e){res.status(e.status||503).json({success:false,error:e.status?e.message:'Published operational predictions are unavailable.'});}};
 const demo=createForecastDemo();
 const overview=async(s,r,b,allowVersions=false)=>{
  if(Object.keys(r.query).some(key=>!['source','reference',...(b?['barangay_id']:[]),...(allowVersions?['version']:[])].includes(key)))throw D.fail('Unsupported prediction filters.');
  const {source='published',reference,version}=r.query;
  if(b&&!D.BARANGAYS.includes(b))throw D.fail('Assigned barangay unavailable.',403);
  if(!['published','demo','delayed',...(allowVersions?[]:['auto'])].includes(source)||(['published','auto'].includes(source)&&reference!==undefined)||(source!=='published'&&version!==undefined))throw D.fail('Choose a valid prediction source.');
  if(source==='auto'){
   const localReplay=process.env.NODE_ENV!=='production'&&['127.0.0.1','::1','localhost'].includes(process.env.HOST)&&process.env.ENABLE_LOCAL_FORECAST_REPLAY!=='false';
   if(localReplay)return demo('demo',b);
   try{return await s.overview(b);}
   catch(error){
    if(error.code!=='OPERATIONAL_PREDICTIONS_UNPUBLISHED'||process.env.ENABLE_SARIMA_DEMO!=='true')throw error;
    return demo('demo',b);
   }
  }
  return source==='published'?s.overview(b,version):demo(source,b,reference===undefined?undefined:D.month(reference));
 };
 app.get('/api/bhw/operational-predictions/overview',bhw((s,r,b)=>overview(s,r,b)));
 app.get(mho+'/overview',handle('mho',(s,r)=>overview(s,r)));
 app.get(admin+'/overview',handle('admin',(s,r)=>overview(s,r,undefined,true)));
 app.get(admin+'/versions',handle('admin',s=>s.publicationVersions()));
 app.get(admin+'/compare/:id',handle('admin',(s,r)=>s.compareIssued(r.params.id)));

 app.get('/api/bhw/operational-predictions/status',bhw(s=>s.publicationStatus()));
 app.get('/api/bhw/operational-predictions/options',bhw(async(s,_r,b)=>{const o=await s.options();if(!o.barangays.includes(b))throw Object.assign(Error('Assigned barangay unavailable.'),{status:403});return {...scoped(o),barangay:b,barangays:[b]};}));
 app.get('/api/bhw/operational-predictions/prediction',bhw((s,r,b)=>{if(Object.keys(r.query).some(k=>!['disease','barangay_id'].includes(k)))throw Object.assign(Error('Barangay is fixed by your account.'),{status:400});return s.forecast({disease:r.query.disease,barangay:b}).then(scoped);}));
 app.get(mho+'/publication',handle('mho',s=>s.publicationStatus()));
 app.get(admin+'/status',handle('admin',s=>s.list()));
 app.get(admin+'/reports',handle('admin',(s,r)=>s.reports(r.query.month)));
 app.post(admin+'/reports',handle('admin',(s,r)=>s.confirm(r.body,r.user)));
 app.post(admin+'/runs',handle('admin',(s,r)=>s.start(r.body,r.user)));
 app.get(admin+'/runs/:id',handle('admin',(s,r)=>s.review(r.params.id)));
 app.post(admin+'/runs/:id/probability',handle('admin',(s,r)=>s.prepareProbability(r.params.id,r.body||{},r.user)));
 app.post(admin+'/publish',handle('admin',(s,r)=>s.publish(r.body,r.user)));
 app.get(admin+'/outcomes/:id',handle('admin',(s,r)=>s.outcomes(r.params.id)));
 app.get(mho+'/options',handle('mho',s=>s.options()));
 app.get(mho+'/prediction',handle('mho',(s,r)=>s.forecast(r.query)));
}
module.exports={registerMonthlyPredictionRoutes};
