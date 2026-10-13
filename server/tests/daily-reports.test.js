const {test}=require('node:test');
const assert=require('node:assert/strict');
const PDFDocument=require('pdfkit');
const express=require('express');
const {todayPeriod}=require('../services/report-periods');
const {dailyReportPdf}=require('../services/daily-report');
const {registerDailyReportRoutes}=require('../routes/daily-reports');

test('today follows the Manila day, including midnight, leap days and year boundaries',()=>{
    for(const [instant,start,end] of [
        ['2026-10-13T15:59:59.999Z','2026-10-13','2026-10-14'],
        ['2026-10-13T16:00:00Z','2026-10-14','2026-10-15'],
        ['2026-12-31T16:00:00Z','2027-01-01','2027-01-02'],
        ['2028-02-28T16:00:00Z','2028-02-29','2028-03-01']
    ])assert.deepEqual(todayPeriod(new Date(instant)),{start,end,timeZone:'Asia/Manila'});
});

test('daily PDFs paginate both sections, retain every row and label zero activity honestly',async()=>{
    const original=PDFDocument.prototype.text,events=[];
    PDFDocument.prototype.text=function(value,x,y,options){
        if(!this.qaPage){this.qaPage=1;this.on('pageAdded',()=>this.qaPage++);}
        events.push({text:String(value),page:this.qaPage,y:typeof y==='number'?y:this.y,height:this.heightOfString(String(value),options),bottom:this.page.height-this.page.margins.bottom});
        return original.call(this,value,x,y,options);
    };
    try {
        for(const count of [0,45]){
            events.length=0;
            const cases=Array.from({length:count},(_,i)=>({barangay:'Synthetic Barangay',condition_label:`Case fixture ${i+1} - long recorded condition requiring text to wrap in its table column`,status:'Cleared',severity:'High Risk',count:1}));
            const visits=Array.from({length:count},(_,i)=>({barangay:'Synthetic Barangay',condition_label:`Visit fixture ${i+1}`,nature_of_visit:'Follow-up visit',transaction_mode:'Referral',count:2}));
            const pdf=await dailyReportPdf({cases,visits,scopeLabel:'All barangays',caseCount:count,visitCount:count*2},todayPeriod(new Date('2026-10-13T00:00:00Z')),'mho');
            assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
            assert.ok(events.some(e=>e.text.includes(`Recorded disease cases: ${count}    |    Consultations: ${count*2}`)));
            assert.equal(events.filter(e=>e.text.startsWith('Case fixture ')).length,count);
            assert.equal(events.filter(e=>e.text.startsWith('Visit fixture ')).length,count);
            for(const e of events.filter(e=>/^(Case|Visit) fixture /.test(e.text))){
                assert.ok(e.y+e.height<=e.bottom,'Wrapped rows must remain inside the page margin');
                assert.ok(events.some(header=>header.page===e.page&&header.text==='Recorded condition'));
            }
            for(const page of new Set(events.map(e=>e.page)))assert.ok(events.some(e=>e.page===page&&e.text==='ACADEMIC SAMPLE - NOT FOR OFFICIAL SUBMISSION'));
            if(!count){assert.ok(events.some(e=>e.text.startsWith('No disease cases')));assert.ok(events.some(e=>e.text.startsWith('No structured consultations')));}
            else assert.ok(new Set(events.map(e=>e.page)).size>2);
        }
    }finally{PDFDocument.prototype.text=original;}
});

test('failed daily reports return an honest error and audit failure without database details',async()=>{
    const app=express(),audits=[];
    app.use((req,_res,next)=>{req.user={system_id:'QA-BHW',role:'bhw',barangay_id:1};next();});
    registerDailyReportRoutes(app,{execute:async(sql,params)=>{
        if(sql.startsWith('INSERT INTO system_audit_logs')){audits.push(params);return [{}];}
        throw Error('Synthetic private database error');
    }});
    const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    try{
        const response=await fetch(`http://127.0.0.1:${server.address().port}/api/bhw/reports/today`);
        assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await response.json()),/private database/);
        assert.equal(audits[0][2],'Report Export Failed');
    }finally{await new Promise(r=>server.close(r));}
});
