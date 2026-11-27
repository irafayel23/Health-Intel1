const { migratePatientIntakes, saveIntake, listIntakes, changeIntake, referralSummary, bhwReferralSummary, bhwVisitActivity } = require('../services/patient-intakes');
const { positiveId } = require('../services/encoding-residents');
const { respond } = require('../services/service-errors');

function registerPatientIntakeRoutes(app,db) {
    let migration;
    function route(handler) {
        return async (req,res) => {
            try {
                migration ??= migratePatientIntakes(db).catch(error => { migration = null; throw error; });
                await migration;
                await handler(req,res);
            } catch (error) {
                if (error.code==='RESIDENT_REVIEW_REQUIRED')
                    return res.status(409).json({success:false,code:error.code,error:error.message,matches:error.matches,review:error.review});
                respond(res,error,'The intake or referral could not be processed. Please try again.');
            }
        };
    }
    app.get(['/api/bhw/intakes','/api/mho/referrals'],route(async (req,res) => {
        const page = req.query.page === undefined ? 1 : Math.min(100000,positiveId(req.query.page,'page'));
        res.json({success:true,...await listIntakes(db,req.user,page,{view:req.query.view,barangay:req.query.barangay_id})});
    }));
    app.get('/api/bhw/intakes/activity',route(async (req,res) => {
        res.set('Cache-Control','no-store').json({success:true,days:await bhwVisitActivity(db,req.user)});
    }));
    app.get('/api/bhw/intakes/summary',route(async (req,res) => {
        res.set('Cache-Control','no-store').json({success:true,counts:await bhwReferralSummary(db,req.user)});
    }));
    app.get('/api/mho/referrals/summary',route(async (_req,res) => {
        res.json({success:true,counts:await referralSummary(db)});
    }));
    app.post('/api/bhw/intakes',route(async (req,res) => {
        res.status(201).json({success:true,...await saveIntake(db,req.user,req.body ?? {})});
    }));
    app.put(['/api/bhw/intakes/:id','/api/mho/referrals/:id'],route(async (req,res) => {
        await changeIntake(db,req.user,positiveId(req.params.id,'intake'),req.body ?? {});
        res.json({success:true});
    }));
}
module.exports = { registerPatientIntakeRoutes };
