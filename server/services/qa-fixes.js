const crypto=require('node:crypto');
const bcrypt=require('bcrypt');
const {normalizeEmail,validPassword}=require('../config/security-config');
const {createFirebaseVerifier}=require('./firebase-verification');
const {caseAuditDetails}=require('./case-audit');
const verifyGoogle=createFirebaseVerifier();
function invalid(message,status=400){const error=new Error(message);error.status=status;return error;}
function plain(value,label,max,optional=false){
    if(optional&&(value===undefined||value===null||value===''))return '';
    if(typeof value!=='string')throw invalid(`Enter a valid ${label}.`);
    const text=value.trim();
    if(!text||text.length>max||/[<>\x00-\x1f\x7f]/.test(text))throw invalid(`Enter a valid ${label} (maximum ${max} characters).`);
    return text;
}
async function transaction(db,action,lockLabel){
    const connection=await db.getConnection();let lock,started=false;
    try{
        if(lockLabel){const [[database]]=await connection.query('SELECT DATABASE() AS name');lock='health-intel:'+crypto.createHash('sha256').update(database.name+':'+lockLabel).digest('hex').slice(0,40);const [[result]]=await connection.execute('SELECT GET_LOCK(?,10) AS acquired',[lock]);if(result.acquired!==1)throw invalid('Another request is being processed. Please try again.',503);}
        await connection.beginTransaction();started=true;
        const result=await action(connection);await connection.commit();started=false;return result;
    }catch(error){if(started)await connection.rollback();throw error;}
    finally{try{if(lock)await connection.execute('SELECT RELEASE_LOCK(?)',[lock]);}finally{connection.release();}}
}
const prefixes={bhw:'BHW',mho:'MHO',admin:'ADM'};
async function nextId(connection,role){
    if(!Object.hasOwn(prefixes,role))throw invalid('Select a valid registration role.');
    const prefix=prefixes[role];
    const [[row]]=await connection.execute("SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(system_id,'-',-1) AS UNSIGNED)),0) AS last_number FROM users WHERE system_id REGEXP ?",['^'+prefix+'-[0-9]+$']);
    const number=Number(row.last_number)+1;if(number>999999999)throw invalid('No further IDs are available for this role.',409);
    return prefix+'-'+String(number).padStart(3,'0');
}
function respond(res,error,fallback){res.status(error.status||(error.code==='ER_DUP_ENTRY'?409:503)).json({success:false,error:error.status?error.message:error.code==='ER_DUP_ENTRY'?'This email or disease name is already registered.':fallback});}
function archiveHandler(db,table,archived){return async(req,res)=>{try{
    await transaction(db,async connection=>{
        const scoped=table==='health_cases'&&req.user.role==='bhw';
        const params=scoped?[req.params.id,req.user.barangay_id]:[req.params.id];
        const filter='id=?'+(scoped?' AND barangay_id=?':'');
        const [rows]=await connection.execute(`SELECT id FROM ${table} WHERE ${filter} FOR UPDATE`,params);if(!rows.length)throw invalid('Record not found.',404);
        if(table==='disease_registry')await connection.execute(`UPDATE disease_registry SET is_archived=?,status=?,deleted_at=${archived?'NOW()':'NULL'} WHERE ${filter}`,[archived,archived?'Archived':'Active',...params]);
        else await connection.execute(`UPDATE health_cases SET is_archived=?,deleted_at=${archived?'NOW()':'NULL'} WHERE ${filter}`,[archived,...params]);
        const role={bhw:'BHW',admin:'Admin',superadmin:'Superadmin'}[req.user.role];
        const action=(table==='health_cases'?'Record':'Disease')+(archived?' Archived':' Restored');
        await connection.execute('INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,?,?,?)',[req.user.system_id,role,action,`${action}: #${req.params.id}.`]);
    });res.json({success:true,message:archived?'Record archived.':'Record restored.'});
}catch(e){respond(res,e,'The record could not be changed.');}};}
async function accountStatus(db,req,status,action){const id=req.body.temp_system_id||req.body.system_id;return transaction(db,async connection=>{
    const [rows]=await connection.execute('SELECT system_id,email,first_name FROM users WHERE system_id=? FOR UPDATE',[id]);if(!rows.length)throw invalid('Account not found.',404);
    await connection.execute('UPDATE users SET status=? WHERE system_id=?',[status,id]);
    await connection.execute('INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,?,?,?)',[req.user.system_id,req.user.role==='superadmin'?'Superadmin':'Admin',action,`${action}: ${id}.`]);return rows[0];
});}
function handlers(db){return {
    archiveCase:archiveHandler(db,'health_cases',true),restoreCase:archiveHandler(db,'health_cases',false),archiveDisease:archiveHandler(db,'disease_registry',true),restoreDisease:archiveHandler(db,'disease_registry',false),
    async previewId(req,res){try{res.json({success:true,next_id:await nextId(db,req.body.role)});}catch(e){respond(res,e,'System ID preview is unavailable.');}},
    async checkEmail(req,res){try{const email=normalizeEmail(req.body.email);if(!email)throw invalid('Enter a valid email address.');await verifyGoogle(req.body.firebase_id_token,email);const [rows]=await db.execute('SELECT system_id FROM users WHERE LOWER(TRIM(email))=?',[email]);res.json({exists:rows.length>0});}catch(e){respond(res,e,'Email checking is temporarily unavailable.');}},
    async register(req,res){try{
        const body=req.body,role=body.role;if(!Object.hasOwn(prefixes,role))throw invalid('This role cannot be registered through this form.');
        const first=plain(body.first_name,'first name',100),last=plain(body.last_name,'last name',100),employee=plain(body.employee_id,'employee ID',50,true),email=normalizeEmail(body.email);
        if(!email||!validPassword(body.password))throw invalid('Provide a valid email and a password of at least 8 characters (maximum 72 UTF-8 bytes).');
        await verifyGoogle(body.firebase_id_token,email);
        const hash=await bcrypt.hash(body.password,10);
        const id=await transaction(db,async connection=>{
            const [existing]=await connection.execute('SELECT system_id FROM users WHERE LOWER(TRIM(email))=?',[email]);if(existing.length)throw invalid('This email is already registered. Please sign in or contact the administrator.',409);
            let barangay=null;if(role==='bhw'){const name=plain(body.assigned_barangay,'assigned barangay',100).replace(/^Brgy\.\s*/i,'');const [rows]=await connection.execute('SELECT id FROM barangays WHERE name=?',[name]);if(!rows.length)throw invalid('Select a valid assigned barangay.');barangay=rows[0].id;}
            const allocated=await nextId(connection,role);
            await connection.execute("INSERT INTO users(system_id,first_name,last_name,role,barangay_id,password_hash,status,email,employee_id) VALUES(?,?,?,?,?,?,'pending',?,?)",[allocated,first,last,role,barangay,hash,email,employee||null]);return allocated;
        },'registration');
        res.json({success:true,system_id:id,message:'Registration submitted for approval. Your official ID is '+id+'.'});
    }catch(e){respond(res,e,'Registration is temporarily unavailable. Please try again.');}},
    async disease(req,res){try{
        const name=plain(req.body.name,'disease name',255),classification=plain(req.body.classification,'classification',50);const category=req.body.category;
        if(name.toLowerCase()==='pending classification')throw invalid('This name is reserved for unclassified cases. Enter an actual condition name.');
        if(!['morbidity','mortality'].includes(category))throw invalid('Select morbidity or mortality.');
        await transaction(db,async connection=>{
            const [rows]=await connection.execute('SELECT id FROM disease_registry WHERE LOWER(TRIM(name))=LOWER(?)',[name]);if(rows.length)throw invalid('This disease name already exists. Review the active or archived registry.',409);
            await connection.execute('INSERT INTO disease_registry(name,category,classification) VALUES(?,?,?)',[name,category,classification]);
            await connection.execute("INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,'Admin','Registry Updated',?)",[req.user.system_id,`Added disease ${name} (${classification}).`]);
        },'disease-registry');res.json({success:true,message:'Disease added to registry.'});
    }catch(e){respond(res,e,'The disease could not be saved.');}},
    async status(req,res){try{
        const status=req.body.new_status;if(!['Active','Cleared','Deceased'].includes(status))throw invalid('Select a valid case status.');
        const note=req.body.remarks===undefined?'':req.body.remarks;
        if(typeof note!=='string'||note.length>4000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(note))throw invalid('Follow-up remarks must be text of at most 4,000 characters.');
        await transaction(db,async connection=>{
            const [rows]=await connection.execute('SELECT remarks,status FROM health_cases WHERE id=? AND barangay_id=? AND is_archived=FALSE FOR UPDATE',[req.params.id,req.user.barangay_id]);if(!rows.length)throw invalid('Active record not found in your assigned barangay.',404);
            let remarks=rows[0].remarks||'';
            if(note.trim()){const timestamp=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}).format(new Date());remarks+=(remarks?'\n\n':'')+`[${timestamp} PHT | ${req.user.system_id} | ${status}]\n`+note.trim();if(Buffer.byteLength(remarks,'utf8')>65000)throw invalid('This record has too many remarks. Contact the administrator.');}
            await connection.execute('UPDATE health_cases SET status=?,remarks=? WHERE id=? AND barangay_id=?',[status,remarks,req.params.id,req.user.barangay_id]);
            await connection.execute("INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,'BHW','Status Updated',?)",[req.user.system_id,caseAuditDetails(Number(req.params.id),`Case #REC-${req.params.id} · Status: ${rows[0].status} → ${status}${note.trim()?' · Follow-up note appended':''}.`,{before:{status:rows[0].status},after:{status}})]);
        });res.json({success:true,message:'Status updated; any entered follow-up note was saved.'});
    }catch(e){respond(res,e,'The record could not be updated.');}}
};}
module.exports={handlers,nextId,plain,transaction,respond,invalid,accountStatus};
