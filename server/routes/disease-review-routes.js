const {plain,invalid,transaction,respond}=require('../services/qa-fixes');
const {caseAuditDetails}=require('../services/case-audit');
const {PENDING_DISEASE,reviewVersion}=require('../services/disease-review');

function registerDiseaseReviewRoutes(app, db) {
    app.put('/api/patients/:id/condition-clarification', async (req,res) => {
        try {
            const reported=plain(req.body.reported_condition,'reported condition',255);
            const source=plain(req.body.condition_source,'condition source',500);
            await transaction(db,async connection=>{
                const [[row]]=await connection.execute('SELECT * FROM health_cases WHERE id=? AND barangay_id=? FOR UPDATE',[req.params.id,req.user.barangay_id]);
                if(!row) throw invalid('Case not found.',404);
                if(row.is_archived || row.disease_review_status!=='Clarification') throw invalid('Refresh the record. This case is not awaiting clarification.',409);
                await connection.execute("UPDATE health_cases SET disease_reported=?,condition_source=?,disease_review_status='Pending' WHERE id=?",[reported,source,row.id]);
                await connection.execute("INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,'BHW','Condition Clarification Supplied',?)",[req.user.system_id,caseAuditDetails(row.id,`Clarification supplied for case #REC-${row.id}.`,{before:{reported:row.disease_reported,source:row.condition_source},after:{reported,source}})]);
            });
            res.json({success:true});
        } catch(error) {respond(res,error,'The clarification could not be saved.');}
    });
    app.get('/api/mho/disease-reviews', async (req, res) => {
        try {
            const [data] = await db.execute(`SELECT h.id,h.patient_name,h.barangay_id,b.name AS barangay_name,
                DATE_FORMAT(h.date_recorded,'%Y-%m-%d') AS date_recorded,h.severity,h.status,h.is_archived,
                h.disease_reported,h.condition_source,h.disease_review_status,h.disease_review_note,h.encoded_by
                FROM health_cases h LEFT JOIN barangays b ON b.id=h.barangay_id
                WHERE h.disease_review_status IN ('Pending','Clarification') ORDER BY h.created_at,h.id`);
            res.json({ success:true, data:data.map(row=>({...row,version:reviewVersion(row)})), pending_count:data.length });
        } catch(error) { respond(res,error,'Disease reviews could not be loaded.'); }
    });
    app.put('/api/mho/disease-reviews/:id', async (req, res) => {
        try {
            const id = Number(req.params.id), input = req.body || {};
            if (!Number.isSafeInteger(id) || id < 1) throw invalid('Select a valid case ID.');
            if (!['existing','new','clarification'].includes(input.action)) throw invalid('Select a review action.');
            const note = plain(input.note,'review note',1000);
            const result = await transaction(db, async connection => {
                // All registry additions serialize on the same lock used by Admin.
                const [[initial]] = await connection.execute('SELECT barangay_id FROM health_cases WHERE id=?',[id]);
                if (!initial) throw invalid('Case not found.',404);
                await connection.execute('SELECT id FROM barangays WHERE id=? FOR UPDATE',[initial.barangay_id]);
                const [[row]] = await connection.execute('SELECT * FROM health_cases WHERE id=? FOR UPDATE',[id]);
                if (!['Pending','Clarification'].includes(row.disease_review_status)) throw invalid('This case has already been reviewed. Refresh the list.',409);
                if(input.version!==reviewVersion(row)) throw invalid('This case changed. Refresh the list and reopen its review.',409);
                if (row.is_archived) throw invalid('Restore the archived case before resolving its classification.',409);
                if (input.action === 'clarification') {
                    await connection.execute("UPDATE health_cases SET disease_review_status='Clarification',disease_review_note=?,disease_reviewed_by=?,disease_reviewed_at=NOW() WHERE id=?",[note,req.user.system_id,id]);
                    await connection.execute("INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,'MHO','Disease Clarification Requested',?)",[req.user.system_id,caseAuditDetails(id,`Case #REC-${id} needs clarification.`,{note})]);
                    return {review_status:'Clarification'};
                }
                let registry;
                if (input.action === 'new') {
                    const name = plain(input.name,'new condition name',255);
                    if (name.toLowerCase() === PENDING_DISEASE.toLowerCase()) throw invalid('Choose the actual condition name.');
                    const [duplicates] = await connection.execute('SELECT id,status,is_archived FROM disease_registry WHERE LOWER(TRIM(name))=LOWER(?)',[name]);
                    if (duplicates.length) throw invalid('This name exists in the active or archived registry. Select it or ask Admin to restore it.',409);
                    // Category/classification are legacy metadata, not patient severity or an official mapping.
                    const [created] = await connection.execute("INSERT INTO disease_registry(name,category,classification,status,is_archived) VALUES(?,'morbidity','Standard','Active',0)",[name]);
                    registry = {id:created.insertId,name};
                    await connection.execute("INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,'MHO','Registry Updated',?)",[req.user.system_id,caseAuditDetails(id,`Approved a new condition category for case #REC-${id}.`,{disease_id:registry.id})]);
                } else {
                    const registryId = Number(input.disease_id);
                    if (!Number.isSafeInteger(registryId) || registryId < 1) throw invalid('Select an existing condition.');
                    const [[selected]] = await connection.execute("SELECT id,name FROM disease_registry WHERE id=? AND status='Active' AND is_archived=0 FOR UPDATE",[registryId]);
                    if (!selected) throw invalid('The selected condition is unavailable. Refresh the registry.');
                    registry = selected;
                }
                const [duplicates] = await connection.execute(`SELECT id FROM health_cases WHERE id<>? AND barangay_id=? AND disease=? AND date_recorded=? AND
                    (resident_id=? OR (first_name=? AND last_name=? AND birthdate=?)) LIMIT 1`,[id,row.barangay_id,registry.name,row.date_recorded,row.resident_id,row.first_name,row.last_name,row.birthdate]);
                if (duplicates.length) throw invalid('Another case matches this resident, condition and date. Review the duplicate before classifying.',409);
                await connection.execute("UPDATE health_cases SET disease=?,disease_id=?,disease_review_status='Reviewed',disease_review_note=?,disease_reviewed_by=?,disease_reviewed_at=NOW() WHERE id=?",[registry.name,registry.id,note,req.user.system_id,id]);
                await connection.execute("INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,'MHO','Disease Classification Reviewed',?)",[req.user.system_id,caseAuditDetails(id,`Classification reviewed for case #REC-${id}.`,{before:{disease:row.disease,review_status:row.disease_review_status},after:{disease:registry.name,disease_id:registry.id},note})]);
                return {review_status:'Reviewed',disease:registry.name};
            },'disease-registry');
            res.json({success:true,id,...result});
        } catch(error) { respond(res,error,'The review could not be saved. No partial change was kept.'); }
    });
}
module.exports={registerDiseaseReviewRoutes};
