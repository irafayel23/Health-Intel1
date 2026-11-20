const bcrypt = require('bcrypt');
const { normalizeEmail, validPassword } = require('../config/security-config');
const { createFirebaseVerifier } = require('./firebase-verification');
const { invalid, plain, respond } = require('./service-errors');
const { transaction } = require('./database-transaction');
const { ensureInviteCanBeRedeemed, recordAdminInvitationAccepted } = require('./admin-invitations');
const verifyGoogle = createFirebaseVerifier();

const {image,store}=require('./registration-evidence');
const {registrationHistory}=require('./registration-history');
const prefixes={bhw:'BHW',mho:'MHO',admin:'ADM'};
async function nextId(connection,role){
    if(!Object.hasOwn(prefixes,role))throw invalid('Select a valid registration role.');
    const prefix=prefixes[role];
    const [[row]]=await connection.execute("SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(system_id,'-',-1) AS UNSIGNED)),0) AS last_number FROM users WHERE system_id REGEXP ?",['^'+prefix+'-[0-9]+$']);
    const number=Number(row.last_number)+1;if(number>999999999)throw invalid('No further IDs are available for this role.',409);
    return prefix+'-'+String(number).padStart(3,'0');
}

function createRegistrationHandlers(db, {verify=verifyGoogle,evidence=store,invitations}={}) {
    return {
    async previewId(req,res){try{res.json({success:true,next_id:await nextId(db,req.body.role === 'admin' ? null : req.body.role)});}catch(e){respond(res,e,'System ID preview is unavailable.');}},
    async checkEmail(req,res){try{const email=normalizeEmail(req.body.email);if(!email)throw invalid('Enter a valid email address.');const proof=await verify(req.body.firebase_id_token,email);
        if (req.body.admin_invitation !== undefined) {
            if (!invitations) throw invalid('Admin invitations are unavailable.', 403);
            invitations.read(req.body.admin_invitation, email);
        }
        const [rows]=await db.execute('SELECT system_id,status FROM users WHERE LOWER(TRIM(email))=? OR system_id=?',[email,evidence.owner(proof.uid)||'']);const blocked=rows.filter(r=>!['pending','denied'].includes(r.status));res.json({exists:blocked.length>0,registration_status:blocked.length===1&&['pending','approved','suspended'].includes(blocked[0].status)?blocked[0].status:null});}catch(e){respond(res,e,'Email checking is temporarily unavailable.');}},
    async register(req,res){let written;try{
        const body=req.body,role=body.role;if(!Object.hasOwn(prefixes,role))throw invalid('This role cannot be registered through this form.');
        const first=plain(body.first_name,'first name',100),last=plain(body.last_name,'last name',100),employee=plain(body.employee_id,'employee ID',50),email=normalizeEmail(body.email);
        if(!email||!validPassword(body.password))throw invalid('Provide a valid email and a password of at least 8 characters (maximum 72 UTF-8 bytes).');
        if (role === 'admin' && (!invitations || !body.admin_invitation)) throw invalid('LGU Admin accounts require a Superadmin invitation.', 403);
        const invite = role === 'admin' ? invitations.read(body.admin_invitation, email) : null;
        if (role !== 'admin' && body.admin_invitation) throw invalid('An Admin invitation applies only to an LGU Admin account.');
        const proof=await verify(body.firebase_id_token,email);
        if(body.confirm_password!==body.password)throw invalid('Passwords do not match.');
        if(body.review_consent!==true)throw invalid('Confirm consent to private employee ID and selfie review.');
        const photos={employee_photo:await image(body.employee_photo),selfie_photo:await image(body.selfie_photo)};
        const hash=await bcrypt.hash(body.password,10);
        const id=await transaction(db,async connection=>{
            if (invite) await ensureInviteCanBeRedeemed(connection, invitations.read(body.admin_invitation, email));
            const [existing]=await connection.execute('SELECT system_id,status,role FROM users WHERE LOWER(TRIM(email))=? OR system_id=? FOR UPDATE',[email,evidence.owner(proof.uid)||'']);if(existing.length>1||existing.some(r=>!['pending','denied'].includes(r.status)))throw invalid('An account or pending request already exists. Sign in or contact the administrator.',409);
            const previous=existing[0];if(previous&&(previous.role!==role||evidence.read(previous.system_id)?.uid&&evidence.read(previous.system_id).uid!==proof.uid))throw invalid('Contact the administrator to review your previous application.',409);
            let barangay=null;if(role==='bhw'){const name=plain(body.assigned_barangay,'assigned barangay',100).replace(/^Brgy\.\s*/i,'');const [rows]=await connection.execute('SELECT id FROM barangays WHERE name=?',[name]);if(!rows.length)throw invalid('Select a valid assigned barangay.');barangay=rows[0].id;}
            const allocated=previous?.system_id||await nextId(connection,role);
            const [metadata]=previous?await registrationHistory(connection,[previous],evidence):[];
            const submissionCount=previous?(metadata.submission_count||0)+1:1;
            const submission=require('node:crypto').randomUUID();written={id:allocated,previous:evidence.read(allocated),uid:proof.uid,submission};
            evidence.save(allocated,{uid:proof.uid,...photos,submitted_at:new Date().toISOString(),submission,submission_count:submissionCount,consent:true});
            if (previous) {
                await connection.execute("UPDATE users SET first_name=?,last_name=?,barangay_id=?,password_hash=?,status='pending',email=?,employee_id=? WHERE system_id=? AND status IN ('pending','denied')",[first,last,barangay,hash,email,employee,allocated]);
                await connection.execute('INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,?,?,?)',[allocated,role,'Registration Resubmitted',JSON.stringify({summary:'Application resubmitted with new review evidence; awaiting approval.',target_type:'Account',target_id:allocated,outcome:'Succeeded',submission_count:submissionCount})]);
            } else {
                await connection.execute("INSERT INTO users(system_id,first_name,last_name,role,barangay_id,password_hash,status,email,employee_id) VALUES(?,?,?,?,?,?,'pending',?,?)",[allocated,first,last,role,barangay,hash,email,employee||null]);
            }
            if (invite) await recordAdminInvitationAccepted(connection, allocated, invite);
            return allocated;
        },'registration');
        written=null;
        res.json({success:true,system_id:id,message:'Registration submitted for approval. Your official ID is '+id+'.'});
    }catch(e){if(written){try{evidence.restore(written.id,written.previous,written.uid,written.submission);}catch{e=invalid('Registration could not finish. Contact the administrator before retrying.',503);}}respond(res,e,'Registration is temporarily unavailable. Please try again.');}}
    };
}

module.exports = { createRegistrationHandlers, nextId };
