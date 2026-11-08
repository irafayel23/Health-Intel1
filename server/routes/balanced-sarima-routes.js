const {createLowCountSarimaDemo}=require('../services/seasonal6200-sarima-demo');
function registerBalancedSarimaRoutes(app,service=createLowCountSarimaDemo()){
 const respond=work=>(req,res)=>{
  if(req.user?.role!=='mho')return res.status(403).json({success:false,error:'MHO access is required.',code:'ACCESS_DENIED'});
  try{res.set('Cache-Control','no-store').json({success:true,data:work(req)});}
  catch(error){res.status(error.status||503).json({success:false,error:error.status?error.message:'The saved SARIMA demonstration is unavailable.',code:error.code||'DEMO_UNAVAILABLE'});}
 };
 app.get('/api/mho/sarima-demo/options',respond(()=>service.options()));
 app.get('/api/mho/sarima-demo',respond(req=>service.forecast(req.query)));
}

function registerBhwSarimaRoutes(app, db, service = createLowCountSarimaDemo()) {
    const handle = work => async (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (req.user?.role !== 'bhw' || !req.user.barangay_id) {
            return res.status(403).json({ success: false, error: 'A BHW account with an assigned barangay is required.' });
        }
        try {
            const [rows] = await db.execute('SELECT name FROM barangays WHERE id=?', [req.user.barangay_id]);
            const barangay = rows[0]?.name;
            const options = service.options();
            if (!options.barangays.includes(barangay)) {
                return res.status(404).json({ success: false, error: 'Saved predictions are unavailable for your assigned barangay.' });
            }
            res.json({ success: true, data: work(req, barangay, options) });
        } catch (error) {
            res.status(error.status || 503).json({
                success: false,
                error: error.status ? error.message : 'Saved predictions are temporarily unavailable.'
            });
        }
    };
    const base = '/api/bhw/sarima-demo';
    app.get(base + '/options', handle((_req, barangay, options) => ({ barangay, diseases: options.diseases })));
    app.get(base, handle((req, barangay) => {
        if (Object.keys(req.query).some(key => !['disease', 'barangay_id'].includes(key))) {
            throw Object.assign(new Error('Select a study disease. The barangay is set by your account.'), { status: 400 });
        }
        const { context, view } = service.forecast({ disease: req.query.disease, barangay });
        return { context: { cutoff: context.cutoff }, view };
    }));
}

module.exports={registerBalancedSarimaRoutes,registerBhwSarimaRoutes};
