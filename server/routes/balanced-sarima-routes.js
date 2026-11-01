const {createLowCountSarimaDemo}=require('../services/combined-sarima-demo');
function registerBalancedSarimaRoutes(app,service=createLowCountSarimaDemo()){
 const respond=work=>(req,res)=>{
  if(req.user?.role!=='mho')return res.status(403).json({success:false,error:'MHO access is required.',code:'ACCESS_DENIED'});
  try{res.set('Cache-Control','no-store').json({success:true,data:work(req)});}
  catch(error){res.status(error.status||503).json({success:false,error:error.status?error.message:'The saved SARIMA demonstration is unavailable.',code:error.code||'DEMO_UNAVAILABLE'});}
 };
 app.get('/api/mho/sarima-demo/options',respond(()=>service.options()));
 app.get('/api/mho/sarima-demo',respond(req=>service.forecast(req.query)));
}
module.exports={registerBalancedSarimaRoutes};
