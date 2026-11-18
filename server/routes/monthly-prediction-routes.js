const {createMonthlyPredictions}=require('../services/monthly-predictions');
function registerMonthlyPredictionRoutes(app,db,service){
 // Lazy construction keeps existing demonstration and ordinary modules available before local migration/configuration.
 let cached=service;const get=()=>cached||(cached=createMonthlyPredictions(db));
 const handle=work=>async(req,res)=>{if(req.user?.role!=='mho')return res.status(403).json({success:false,error:'MHO access is required.'});try{res.set('Cache-Control','no-store');res.json({success:true,data:await work(get(),req)});}catch(e){res.status(e.status||503).json({success:false,error:e.status?e.message:'The operational monthly workflow is unavailable. Ask the maintainer to check its migration and scientific environment.',code:e.code||'MONTHLY_WORKFLOW_UNAVAILABLE'});}};
 const base='/api/mho/operational-predictions';
 // BHW gets only its own selection and shared dates, without municipal totals.
 const scoped=({overall,context,...data})=>({...data,context:{cutoff:context.cutoff,main_target:context.main_target}});
 const bhw=work=>async(req,res)=>{res.set('Cache-Control','no-store');if(req.user?.role!=='bhw'||!req.user.barangay_id)return res.status(403).json({success:false,error:'Assigned BHW account required.'});try{const [[b]]=await db.execute('SELECT name FROM barangays WHERE id=?',[req.user.barangay_id]);if(!b)throw Object.assign(Error('Assigned barangay unavailable.'),{status:403});const s=get();res.json({success:true,data:await work(s,req,b.name)});}catch(e){res.status(e.status||503).json({success:false,error:e.status?e.message:'Published operational predictions are unavailable.'});}};
 app.get('/api/bhw/operational-predictions/status',bhw(s=>s.publicationStatus()));
 app.get('/api/bhw/operational-predictions/options',bhw(async(s,_r,b)=>{const o=await s.options();if(!o.barangays.includes(b))throw Object.assign(Error('Assigned barangay unavailable.'),{status:403});return {...scoped(o),barangay:b,barangays:[b]};}));
 app.get('/api/bhw/operational-predictions/prediction',bhw((s,r,b)=>{if(Object.keys(r.query).some(k=>k!=='disease'))throw Object.assign(Error('Barangay is fixed by your account.'),{status:400});return s.forecast({disease:r.query.disease,barangay:b}).then(scoped);}));
 app.get(base+'/publication',handle(s=>s.publicationStatus()));
 app.get(base+'/status',handle(s=>s.list()));
 app.get(base+'/reports',handle((s,r)=>s.reports(r.query.month)));
 app.post(base+'/reports',handle((s,r)=>s.confirm(r.body,r.user)));
 app.post(base+'/runs',handle((s,r)=>s.start(r.body,r.user)));
 app.get(base+'/runs/:id',handle((s,r)=>s.review(r.params.id)));
 app.post(base+'/runs/:id/probability',handle((s,r)=>s.prepareProbability(r.params.id,r.body||{},r.user)));
 app.post(base+'/publish',handle((s,r)=>s.publish(r.body,r.user)));
 app.get(base+'/outcomes/:id',handle((s,r)=>s.outcomes(r.params.id)));
 app.get(base+'/options',handle(s=>s.options()));
 app.get(base+'/prediction',handle((s,r)=>s.forecast(r.query)));
}
module.exports={registerMonthlyPredictionRoutes};
