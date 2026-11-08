const {createMonthlyPredictions}=require('../services/monthly-predictions');
function registerMonthlyPredictionRoutes(app,db,service){
 // Lazy construction keeps existing demonstration and ordinary modules available before local migration/configuration.
 let cached=service;const get=()=>cached||(cached=createMonthlyPredictions(db));
 const handle=work=>async(req,res)=>{if(req.user?.role!=='mho')return res.status(403).json({success:false,error:'MHO access is required.'});try{res.set('Cache-Control','no-store');res.json({success:true,data:await work(get(),req)});}catch(e){res.status(e.status||503).json({success:false,error:e.status?e.message:'The operational monthly workflow is unavailable. Ask the maintainer to check its migration and scientific environment.',code:e.code||'MONTHLY_WORKFLOW_UNAVAILABLE'});}};
 const base='/api/mho/operational-predictions';
 app.get(base+'/status',handle(s=>s.list()));
 app.get(base+'/reports',handle((s,r)=>s.reports(r.query.month)));
 app.post(base+'/reports',handle((s,r)=>s.confirm(r.body,r.user)));
 app.post(base+'/runs',handle((s,r)=>s.start(r.body,r.user)));
 app.get(base+'/runs/:id',handle((s,r)=>s.review(r.params.id)));
 app.post(base+'/publish',handle((s,r)=>s.publish(r.body,r.user)));
 app.get(base+'/outcomes/:id',handle((s,r)=>s.outcomes(r.params.id)));
 app.get(base+'/options',handle(s=>s.options()));
 app.get(base+'/prediction',handle((s,r)=>s.forecast(r.query)));
}
module.exports={registerMonthlyPredictionRoutes};
