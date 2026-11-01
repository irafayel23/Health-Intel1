// Read models preserve the API shape while physical tables hold each fact once.
const VERSION = '20261019_core_normalization_v1';
const CORE = new Set(['resident_id','disease_id','remarks','status','severity','encoded_by','date_recorded','created_at','updated_at','deleted_at','is_archived']);
const REVIEW = {disease_review_status:'review_status',disease_reported:'reported_condition',condition_source:'condition_source',disease_review_note:'review_note',disease_reviewed_by:'reviewed_by',disease_reviewed_at:'reviewed_at'};
const IDENTITY = ['first_name','last_name','suffix','birthdate'];
const quote = value => '`'+value.replace(/`/g,'``')+'`';
const equal = (a,b) => (a == null ? null : String(a)) === (b == null ? null : String(b));
const fullName = row => [row.first_name,row.last_name,row.suffix].filter(v=>v!=null&&v!=='').join(' ');
const sourceName = row => row.patient_name == null || row.patient_name===fullName(row) ? null : row.patient_name;

function readSql(sql) {
    if (!/^\s*(SELECT|WITH)\b/i.test(sql)) return sql;
    return sql.replace(/\b(FROM|JOIN)\s+`?(health_cases|residents)`?(?=\s|$|[),;])/gi,(_all,verb,table)=>verb+' '+(table.toLowerCase()==='health_cases'?'case_records':'resident_records'));
}
async function insertValues(db,table,values) {
    const entries=Object.entries(values).filter(([,value])=>value!==undefined);
    return db.execute(`INSERT INTO ${quote(table)} (${entries.map(([key])=>quote(key)).join(',')}) VALUES (${entries.map(()=>'?').join(',')})`,entries.map(([,value])=>value));
}
async function upsert(db,table,key,id,values) {
    if (!Object.keys(values).length) return;
    const entries=Object.entries(values);
    return db.execute(`INSERT INTO ${quote(table)} (${quote(key)},${entries.map(([name])=>quote(name)).join(',')}) VALUES (?,${entries.map(()=>'?').join(',')}) ON DUPLICATE KEY UPDATE ${entries.map(([name])=>`${quote(name)}=VALUES(${quote(name)})`).join(',')}`,[id,...entries.map(([,value])=>value)]);
}
async function label(db,row) {
    if (!Object.hasOwn(row,'disease')) return undefined;
    if (row.disease_id!=null) {
        const [[d]]=await db.execute('SELECT name FROM disease_registry WHERE id=?',[row.disease_id]);
        if (d&&row.disease===d.name) return null;
    }
    if (row.disease==='Pending classification') return null;
    return row.disease;
}
async function insertResident(db,row) {
    const values={...row,reported_age:row.birthdate?null:(row.age??null),source_name:sourceName(row)};
    delete values.patient_name;delete values.age;
    return insertValues(db,'residents',values);
}
async function insertCase(db,row) {
    const allowed=new Set([...CORE,...Object.keys(REVIEW),...IDENTITY,'age','patient_name','purok','barangay_id','disease']);
    if(Object.keys(row).some(key=>!allowed.has(key)))throw Error('Unsupported normalized case field.');
    const [result]=await insertValues(db,'health_cases',Object.fromEntries(Object.entries(row).filter(([key])=>CORE.has(key))));
    const id=result.insertId;
    await insertValues(db,'case_locations',{case_id:id,barangay_id:row.barangay_id??null,purok:row.purok??null});
    const review=Object.fromEntries(Object.entries(REVIEW).filter(([old])=>Object.hasOwn(row,old)).map(([old,key])=>[key,row[old]]));
    await insertValues(db,'case_condition_reviews',{case_id:id,review_status:'Recorded',...review});
    let resident;
    if(row.resident_id!=null)[[resident]]=await db.execute("SELECT first_name,last_name,suffix,DATE_FORMAT(birthdate,'%Y-%m-%d') AS birthdate FROM residents WHERE id=?",[row.resident_id]);
    const snapshot=!resident||IDENTITY.some(key=>!equal(row[key],resident[key]));
    const diseaseLabel=await label(db,row),name=sourceName(row),reportedAge=row.birthdate?null:(row.age??null);
    if(snapshot||diseaseLabel!=null||name!=null||reportedAge!=null)await insertValues(db,'case_source_records',{
        case_id:id,has_identity_snapshot:snapshot?1:0,
        ...Object.fromEntries(IDENTITY.map(key=>[key,snapshot?(row[key]??null):null])),
        reported_age:reportedAge,source_name:name,condition_label:diseaseLabel??null
    });
    return [result];
}
function parseInsert(sql,params) {
    const match=/^\s*INSERT\s+INTO\s+(residents|health_cases)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*;?\s*$/i.exec(sql);
    if(!match)return null;
    const columns=match[2].split(',').map(v=>v.trim().replace(/`/g,''));
    if(!match[3].split(',').every(v=>v.trim()==='?')||columns.length!==params.length)throw Error('Normalized writes require a single parameterized row.');
    return {table:match[1].toLowerCase(),row:Object.fromEntries(columns.map((key,i)=>[key,params[i]]))};
}
function parseUpdate(sql,params) {
    const m=/^\s*UPDATE\s+health_cases\s+SET\s+(.+?)\s+WHERE\s+(.+?)\s*;?\s*$/is.exec(sql);
    if(!m)return null;
    let offset=0;const values={};
    for(const assignment of m[1].split(',')) {
        const a=/^\s*`?(\w+)`?\s*=\s*(\?|NULL|NOW\(\)|'[^']*')\s*$/i.exec(assignment);
        if(!a)throw Error('Unsupported normalized case update.');
        values[a[1]]=a[2]==='?'?params[offset++]:/^NULL$/i.test(a[2])?null:/^NOW/i.test(a[2])?new Date():a[2].slice(1,-1);
    }
    return {values,where:m[2],params:params.slice(offset)};
}
async function updateCases(db,update) {
    const [rows]=await db.execute('SELECT id,disease_id,birthdate FROM case_records WHERE '+update.where+' FOR UPDATE',update.params);
    const allowed=new Set([...CORE,...Object.keys(REVIEW),'disease','age','barangay_id','purok']);
    if(Object.keys(update.values).some(key=>!allowed.has(key)))throw Error('Unsupported normalized case field.');
    for(const row of rows) {
        const core=Object.fromEntries(Object.entries(update.values).filter(([key])=>CORE.has(key)));
        core.updated_at=update.values.updated_at||new Date();
        await db.execute('UPDATE health_cases SET '+Object.keys(core).map(key=>quote(key)+'=?').join(',')+' WHERE id=?',[...Object.values(core),row.id]);
        const review=Object.fromEntries(Object.entries(update.values).filter(([key])=>REVIEW[key]).map(([key,value])=>[REVIEW[key],value]));
        await upsert(db,'case_condition_reviews','case_id',row.id,review);
        const location=Object.fromEntries(Object.entries(update.values).filter(([key])=>['barangay_id','purok'].includes(key)));
        if(Object.keys(location).length)await upsert(db,'case_locations','case_id',row.id,location);
        const source={};
        if(Object.hasOwn(update.values,'age'))source.reported_age=row.birthdate?null:update.values.age;
        if(Object.hasOwn(update.values,'disease'))source.condition_label=await label(db,{...row,...update.values});
        await upsert(db,'case_source_records','case_id',row.id,source);
    }
    return [{affectedRows:rows.length,changedRows:rows.length}];
}

function createDatabaseFacade(pool) {
    let detection;
    const ready=()=>detection||(detection=pool.query("SELECT COUNT(*) AS present FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='normalization_migrations'").then(async([[r]])=>{
        if(!r.present)return false;
        const [[v]]=await pool.execute('SELECT COUNT(*) AS present FROM normalization_migrations WHERE version=?',[VERSION]);return Boolean(v.present);
    }));
    function wrap(target,isConnection=false) {
        let inTransaction=false;
        const facade={normalizedSchema:false,rawDatabase:target};
        async function invoke(method,sql,params=[]) {
            const normalized=await ready();facade.normalizedSchema=normalized;
            if(!normalized)return target[method](sql,params);
            const insert=parseInsert(sql,params),update=parseUpdate(sql,params);
            if(insert||update) {
                const work=connection=>insert?(insert.table==='residents'?insertResident(connection,insert.row):insertCase(connection,insert.row)):updateCases(connection,update);
                if(isConnection&&inTransaction)return work(target);
                const connection=isConnection?target:await pool.getConnection();
                try{await connection.beginTransaction();const result=await work(connection);await connection.commit();return result;}
                catch(error){await connection.rollback();throw error;}
                finally{if(!isConnection)connection.release();}
            }
            if(/^\s*(INSERT\s+INTO|UPDATE)\s+(residents|health_cases)\b/i.test(sql))throw Error('Unsupported write to normalized clinical tables.');
            return target[method](readSql(sql),params);
        }
        facade.query=(sql,params)=>invoke('query',sql,params);
        facade.execute=(sql,params)=>invoke('execute',sql,params);
        facade.getConnection=async()=>{await ready();return wrap(await pool.getConnection(),true);};
        facade.beginTransaction=async()=>{await target.beginTransaction();inTransaction=true;};
        facade.commit=async()=>{await target.commit();inTransaction=false;};
        facade.rollback=async()=>{await target.rollback();inTransaction=false;};
        facade.release=()=>target.release();
        facade.end=()=>target.end();
        facade.schemaReady=ready;
        return facade;
    }
    return wrap(pool);
}
module.exports={VERSION,CORE,REVIEW,readSql,parseInsert,parseUpdate,createDatabaseFacade};
