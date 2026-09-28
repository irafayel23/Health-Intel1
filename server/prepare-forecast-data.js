// Review and prepare aggregate CSVs. This tool never inserts or updates database records.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { validDate, todayInManila } = require('./patient-validation');

const columns = ['Month','Barangay','Disease','Cases','SourceType','SourceReference','ReportingStatus'];
const csv = (rows, headers) => stringify(rows, { header:true, columns:headers, escape_formulas:true });
function prepare(rows, { barangays, registry, aliases=[], sourceType, sourceReference, today=todayInManila() }) {
    if (!['real','synthetic','unverified'].includes(sourceType) || !sourceReference?.trim()) throw new Error('Specify real, synthetic or unverified and a source reference. A declaration is not independent verification.');
    const active = new Set(registry.filter(r=>r.status==='Active' && !r.is_archived).map(r=>r.name));
    const mapping = new Map();
    for (const alias of aliases) {
        if (alias.Decision !== 'approved') continue;
        if (!alias.Reviewer?.trim() || !validDate(alias.ReviewDate) || alias.ReviewDate>today || !active.has(alias.CanonicalName)) throw new Error('Approved mappings need a reviewer, valid review date and active canonical disease.');
        if (mapping.has(alias.OriginalName)) throw new Error('Duplicate approved mapping.');
        mapping.set(alias.OriginalName, alias.CanonicalName);
    }
    const groups = new Map(), review = [];
    rows.forEach((r,index)=>{
        const issue = reason=>review.push({Row:index+2,Date:r.Date||'',Barangay:r.Barangay||'',Disease:r.Disease||'',Cases:r.Cases||'',Reason:reason});
        const rawDate=String(r.Date||'').trim();
        const monthly=/^\d{4}-\d{2}$/.test(rawDate);
        const date=monthly ? rawDate+'-01' : rawDate;
        if (!validDate(date) || date>today || date<'1900-01-01') return issue('Invalid or future date');
        const barangay=String(r.Barangay||'').trim();
        if (!barangays.includes(barangay)) return issue('Unknown barangay; review exact spelling');
        if (!/^\d+$/.test(String(r.Cases??'').trim()) || !Number.isSafeInteger(Number(r.Cases))) return issue('Cases must be a nonnegative whole number');
        const name=String(r.Disease||'').trim();
        if (/bite|accident|injury|trauma|fracture|wound/i.test(name)) return issue('Excluded from disease forecasting: injury/bite category');
        const disease=mapping.get(name) || name;
        if (!active.has(disease)) return issue('Unreviewed disease name or archived category; approve mapping first');
        const reporting=r.ReportingStatus?.trim() || 'unknown';
        if (!['complete','partial','unknown'].includes(reporting)) return issue('ReportingStatus must be complete, partial or unknown');
        const key=JSON.stringify([date.slice(0,7),barangay,disease]);
        const group=groups.get(key) || {Month:date.slice(0,7),Barangay:barangay,Disease:disease,Cases:0,SourceType:sourceType,SourceReference:sourceReference,ReportingStatus:reporting,entries:[]};
        group.entries.push({row:index+2,date,monthly,raw:r});
        group.Cases+=Number(r.Cases);
        if (!Number.isSafeInteger(group.Cases)) group.invalid=true;
        if (group.ReportingStatus!==reporting) group.ReportingStatus='unknown';
        groups.set(key,group);
    });
    const prepared=[];
    for (const group of groups.values()) {
        const dates=group.entries.map(e=>e.date);
        if (group.invalid || new Set(dates).size!==dates.length || (group.entries.length>1 && group.entries.some(e=>e.monthly))) {
            for (const e of group.entries) review.push({Row:e.row,Date:e.raw.Date,Barangay:e.raw.Barangay,Disease:e.raw.Disease,Cases:e.raw.Cases,Reason:'Possible duplicate or overlapping monthly/daily totals; not summed'});
        } else { const {entries,invalid,...record}=group; prepared.push(record); }
    }
    prepared.sort((a,b)=>a.Month.localeCompare(b.Month)||a.Barangay.localeCompare(b.Barangay)||a.Disease.localeCompare(b.Disease));
    const coverage=[];
    const series=new Map();
    for (const row of prepared) { const key=JSON.stringify([row.Barangay,row.Disease]); if(!series.has(key)) series.set(key,[]); series.get(key).push(row); }
    for (const records of series.values()) {
        const byMonth=new Map(records.map(r=>[r.Month,r]));
        let month=records[0].Month;
        const end=records.at(-1).Month;
        while(month<=end) {
            const found=byMonth.get(month);
            coverage.push({Month:month,Barangay:records[0].Barangay,Disease:records[0].Disease,Cases:found?found.Cases:'',ReportingStatus:found?found.ReportingStatus:'missing report'});
            const next=new Date(month+'-01T00:00:00Z'); next.setUTCMonth(next.getUTCMonth()+1); month=next.toISOString().slice(0,7);
        }
    }
    return { prepared,review,coverage,metadata:{ sourceType,sourceReference,sourceVerification:'User-declared; verify against source documents',inputRows:rows.length,preparedMonths:prepared.length,heldRows:review.length,missingMonths:coverage.filter(r=>r.ReportingStatus==='missing report').length,eligibleForRealDataEvaluation:sourceType==='real' && review.length===0 && coverage.length>0 && coverage.every(r=>r.ReportingStatus==='complete'),note:'Eligibility here is a data-quality check, not proof of sufficient history or model accuracy. Missing reports remain blank. Synthetic results are demonstrations.'} };
}
async function main() {
    require('./security-config').loadEnvironment();
    const args=process.argv.slice(2), option=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
    const out=path.resolve(option('--output') || path.join(__dirname,'../analysis/data_preparation',new Date().toISOString().replace(/[:.]/g,'-')));
    const mysql=require('mysql2/promise');
    const db=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'health_intel'});
    let files;
    try {
        const [registry]=await db.query('SELECT name,status,is_archived FROM disease_registry');
        if(args.includes('--review')) {
            const [names]=await db.query('SELECT disease AS OriginalName,COUNT(*) AS CaseRecords FROM health_cases GROUP BY disease ORDER BY disease');
            files={'disease-name-review.csv':csv(names.map(r=>({...r,RegistryStatus:registry.find(d=>d.name===r.OriginalName)?.status||'Not registered',CanonicalName:'',Decision:'pending',Reviewer:'',ReviewDate:''})),['OriginalName','CaseRecords','RegistryStatus','CanonicalName','Decision','Reviewer','ReviewDate']), 'monthly-data-template.csv':'Date,Barangay,Disease,Cases,ReportingStatus\r\n'};
        } else {
            const input=option('--input'); if(!input) throw new Error('Usage: npm run data:prepare -- --input FILE --source-type real|synthetic|unverified --source-ref REFERENCE [--aliases FILE] [--output NEW_FOLDER]');
            const bytes=fs.readFileSync(path.resolve(input));
            const rows=parse(bytes,{columns:true,bom:true,skip_empty_lines:true});
            if(!rows.length || !['Date','Barangay','Disease','Cases'].every(k=>Object.hasOwn(rows[0],k))) throw new Error('CSV requires Date, Barangay, Disease, Cases.');
            const [barangays]=await db.query('SELECT name FROM barangays');
            const aliases=option('--aliases')?parse(fs.readFileSync(option('--aliases')),{columns:true,bom:true,skip_empty_lines:true}):[];
            const result=prepare(rows,{barangays:barangays.map(r=>r.name),registry,aliases,sourceType:option('--source-type'),sourceReference:option('--source-ref')});
            result.metadata.sourceSHA256=crypto.createHash('sha256').update(bytes).digest('hex');
            result.metadata.createdAt=new Date().toISOString();
            files={'monthly-preview.csv':csv(result.prepared,columns),'coverage.csv':csv(result.coverage,['Month','Barangay','Disease','Cases','ReportingStatus']),'review-required.csv':csv(result.review,['Row','Date','Barangay','Disease','Cases','Reason']),'provenance.json':JSON.stringify(result.metadata,null,2)+'\n'};
            console.log(JSON.stringify(result.metadata));
        }
    } finally {await db.end();}
    // Each run creates a new folder, protecting source files and earlier reviews.
    if(fs.existsSync(out)) throw new Error('Output folder already exists. Choose a new folder.');
    fs.mkdirSync(out,{recursive:true});
    for(const [name,contents] of Object.entries(files)) fs.writeFileSync(path.join(out,name),contents,{flag:'wx'});
    console.log('Review files saved to '+out+'. No database records changed.');
}
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={prepare,csv};
