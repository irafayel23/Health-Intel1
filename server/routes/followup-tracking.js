const {listFollowups}=require('../services/followup-tracking');
const {respond}=require('../services/service-errors');
function registerFollowupTracking(app,db){
    for(const role of ['bhw','mho'])app.get('/api/'+role+'/followups',async(req,res)=>{
        try{res.json({success:true,...await listFollowups(db,req.user,req.query)});}
        catch(error){respond(res,error,'Follow-up tracking could not be loaded. Please try again.');}
    });
}
module.exports={registerFollowupTracking};
