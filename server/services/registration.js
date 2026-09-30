const bcrypt = require('bcrypt');
const { normalizeEmail, validPassword } = require('../config/security-config');
const { createFirebaseVerifier } = require('./firebase-verification');
const { invalid, plain, respond } = require('./service-errors');
const { transaction } = require('./database-transaction');
const verifyGoogle = createFirebaseVerifier();

const prefixes={bhw:'BHW',mho:'MHO',admin:'ADM'};
async function nextId(connection,role){
    if(!Object.hasOwn(prefixes,role))throw invalid('Select a valid registration role.');
    const prefix=prefixes[role];
    const [[row]]=await connection.execute("SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(system_id,'-',-1) AS UNSIGNED)),0) AS last_number FROM users WHERE system_id REGEXP ?",['^'+prefix+'-[0-9]+$']);
    const number=Number(row.last_number)+1;if(number>999999999)throw invalid('No further IDs are available for this role.',409);
    return prefix+'-'+String(number).padStart(3,'0');
}

function createRegistrationHandlers(db) {
    return {
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
    }catch(e){respond(res,e,'Registration is temporarily unavailable. Please try again.');}}
    };
}

module.exports = { createRegistrationHandlers, nextId };
