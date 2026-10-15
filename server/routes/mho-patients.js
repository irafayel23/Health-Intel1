const {createMhoPatients}=require('../services/mho-patients');
const {respond}=require('../services/service-errors');
function registerMhoPatientRoutes(app,db){
    const patients=createMhoPatients(db);
    app.get('/api/mho/patients',async(req,res)=>{
        try{res.json({success:true,...await patients.list(req.query)});}
        catch(error){respond(res,error,'Patient directory could not be loaded. Please try again.');}
    });
    for(const kind of ['resident','legacy'])app.get('/api/mho/patients/'+kind+'/:id',async(req,res)=>{
        try{res.json({success:true,...await patients.dossier(kind,req.params.id)});}
        catch(error){respond(res,error,'Patient history could not be loaded. Please try again.');}
    });
}
module.exports={registerMhoPatientRoutes};
