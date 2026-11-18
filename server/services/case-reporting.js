const {invalid,plain,respond}=require('./service-errors');
const {transaction}=require('./database-transaction');
const {createSystemAudit}=require('./system-audit');

const excludedAction='Case Reporting Excluded';
const includedAction='Case Reporting Included';

function reportingExcluded(caseIdExpression) {
    return `COALESCE((SELECT a.action = '${excludedAction}'
        FROM system_audit_logs a
        WHERE a.action IN ('${excludedAction}','${includedAction}')
          AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(a.details),a.details,NULL),'$.case_id'))=CAST(${caseIdExpression} AS CHAR)
        ORDER BY a.id DESC LIMIT 1),0)`;
}

function registerCaseReportingDecision(app,db) {
    app.put('/api/mho/cases/:id/reporting-eligibility',async(req,res)=>{
        try {
            if(req.user?.role!=='mho')throw invalid('MHO review is required.',403);
            const id=Number(req.params.id);
            const {excluded,expectedExcluded}=req.body || {};
            if(!Number.isSafeInteger(id)||id<1||typeof excluded!=='boolean'||typeof expectedExcluded!=='boolean')
                throw invalid('Choose a valid case and reporting decision.');
            const reason=plain(req.body.reason,'justification',1000);
            if(reason.length<5)throw invalid('Enter a justification of at least 5 characters.');
            await transaction(db,async connection=>{
                const [[record]]=await connection.execute('SELECT id FROM health_cases WHERE id=? FOR UPDATE',[id]);
                if(!record)throw invalid('Case not found.',404);
                const [[state]]=await connection.execute(`SELECT ${reportingExcluded('?')} AS excluded`,[id]);
                const current=Boolean(Number(state.excluded));
                if(current!==expectedExcluded)throw invalid('The reporting decision changed. Reopen this case and try again.',409);
                if(excluded===current)return;
                await createSystemAudit(connection).record(req.user,excluded?excludedAction:includedAction,{
                    summary:excluded?'Case excluded from monthly reporting.':'Case restored to monthly reporting.',
                    target_type:'Case',target_id:'REC-'+id,case_id:id,outcome:'Succeeded',reason,
                    before:{reporting_excluded:current},after:{reporting_excluded:excluded}
                });
            });
            res.json({success:true,excluded});
        } catch(error) { respond(res,error,'The reporting decision could not be saved.'); }
    });
}
module.exports={reportingExcluded,registerCaseReportingDecision};

