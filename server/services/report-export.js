const { createSystemAudit } = require('./system-audit');
const { createCaseRecords } = require('./case-records');
const { monthlyPeriod } = require('./report-periods');
const { invalid } = require('./service-errors');

function createReportExport(db) {
    const audit = createSystemAudit(db);
    return {
        async bhw(user, query) {
            if(!['MONTHLY','SURVEILLANCE'].includes(query.type)) throw invalid('Select a valid report type.');
            const period = monthlyPeriod(query.month,query.year);
            if(query.purok !== undefined && (typeof query.purok!=='string' || query.purok.length>100 || /[\x00-\x1f]/.test(query.purok))) throw invalid('Select a valid purok.');
            const purok = query.type==='SURVEILLANCE' && query.purok && query.purok!=='All Puroks' ? query.purok : null;
            const rows = await createCaseRecords(db).patients({barangay_id:user.barangay_id,month:query.month,year:query.year,include_archived:'true'});
            const selected = purok ? rows.filter(row=>row.purok===purok) : rows;
            await audit.record(user,'Report Data Exported', {summary:`Released ${selected.length} cases for BHW ${query.type.toLowerCase()} report (${period.start} to ${period.end}, end exclusive).`,outcome:'Succeeded',target_type:'Report',target_id:`BHW ${query.type}`,period:{start:period.start,end_exclusive:period.end},barangay_id:user.barangay_id,purok,record_count:selected.length,delivery:'Server released report data; the PDF is generated in the browser. File saving is not verified.'});
            return selected;
        },
        async prepared(user, type, period, count) {
            await audit.record(user,'Report Export Prepared',{summary:`Prepared data for ${type} report: ${count} recorded cases (${period.start} to ${period.end}, end exclusive).`,outcome:'Prepared',target_type:'Report',target_id:type,period:{start:period.start,end_exclusive:period.end},record_count:count,delivery:'Report data prepared for a PDF response. Rendering, browser download and file saving are not verified.'});
        },
        async failed(user, type, error) {
            await audit.record(user,'Report Export Failed',{summary:`${type} report could not be exported.`,outcome:'Failed',target_type:'Report',target_id:type,reason:error.status===400?'Invalid report selection':'Report preparation failed'});
        }
    };
}
module.exports = { createReportExport };
