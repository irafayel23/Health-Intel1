const {test} = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const PDFDocument = require('pdfkit');
const {registerMhoReportRoutes} = require('../routes/mho-reports');

test('weekly PDFs retain every row, repeat column headings and keep the complete signature together',async()=>{
    const originalText=PDFDocument.prototype.text;
    const events=[];
    PDFDocument.prototype.text=function(value,x,y,options){
        if(!this.qaPageNumber){this.qaPageNumber=1;this.on('pageAdded',()=>{this.qaPageNumber++;});}
        events.push({text:String(value),page:this.qaPageNumber,y:typeof y==='number'?y:this.y,bottom:this.page.height-this.page.margins.bottom});
        return originalText.call(this,value,x,y,options);
    };
    let rows=[];
    const app=express();app.use((req,_res,next)=>{req.user={system_id:'QA-MHO',role:'mho'};next();});
    registerMhoReportRoutes(app,{execute:async sql=>{
        if(sql.startsWith('SELECT disease,'))return [rows];
        if(sql.startsWith('INSERT INTO system_audit_logs'))return [{insertId:1}];
        throw Error('Unexpected query in PDF fixture');
    }});
    const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
    try{
        for(const count of [0,15,45]){
            rows=Array.from({length:count},(_,index)=>({disease:`QA case ${index+1}${count===45?' - a longer reported condition requiring wrapped text in the disease column':''}`,severity:['Mild','Monitored','High Risk'][index%3],status:'Active',date_recorded:'2026-09-30'}));
            events.length=0;
            const response=await fetch(`http://127.0.0.1:${server.address().port}/api/mho/reports/pidsr?week=${count?40:1}&year=2026`);
            assert.equal(response.status,200);const pdf=Buffer.from(await response.arrayBuffer());assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
            const dateRange=events.find(event=>event.text.startsWith('Recorded dates:'));
            assert.ok(dateRange,'Print the actual inclusive record-date range');
            if(!count){assert.match(dateRange.text,/2025/);assert.match(dateRange.text,/2026/);}
            const label=events.find(event=>event.text==='PREPARED FOR REVIEW BY:');
            const caption=events.find(event=>event.text==='Epidemiology Surveillance Officer');
            assert.equal(label.page,caption.page,'Prepared-by label and signature caption must share a page');
            assert.ok(caption.y+14<=caption.bottom,'Signature caption must stay inside the bottom margin');
            if(count===15)assert.equal(caption.page,1,'The original 15-row regression should fit on one page');
            const caseEvents=events.filter(event=>event.text.startsWith('QA case '));
            assert.equal(caseEvents.length,count,'Every case must be rendered exactly once');
            const dataPages=[...new Set(caseEvents.map(event=>event.page))];
            for(const page of dataPages)assert.ok(events.some(event=>event.page===page&&event.text==='Date Recorded'),'Each data page needs column headings');
            for(const event of caseEvents)assert.ok(event.y<event.bottom-30,'Rows must leave room for wrapped text');
            if(count===45)assert.ok(dataPages.length>1,'Long lists must paginate rather than overlap');
            if(count)assert.equal(events.filter(event=>event.text==='TOTAL RECORDED CASES').length,1);
            for (const page of [...new Set(events.map(event=>event.page))]) assert.ok(events.some(event=>event.page===page && event.text==='ACADEMIC SAMPLE - NOT FOR OFFICIAL SUBMISSION'));
            assert.ok(!events.some(event=>event.text==='DEPARTMENT OF HEALTH'));
        }
    }finally{PDFDocument.prototype.text=originalText;await new Promise(resolve=>server.close(resolve));}
});

test('monthly review copies paginate long conditions without losing entries or asserting certification', async () => {
    const originalText = PDFDocument.prototype.text, events = [];
    PDFDocument.prototype.text = function(value, x, y, options) {
        if (!this.qaPageNumber) { this.qaPageNumber=1; this.on('pageAdded',()=>this.qaPageNumber++); }
        events.push({ text:String(value), page:this.qaPageNumber, y:typeof y==='number'?y:this.y, bottom:this.page.height-this.page.margins.bottom });
        return originalText.call(this,value,x,y,options);
    };
    let rows=[];
    const app=express(); app.use((req,_res,next)=>{req.user={system_id:'QA-MHO',role:'mho'};next();});
    registerMhoReportRoutes(app,{execute:async sql=>{
        if(sql.startsWith('SELECT h.disease'))return [rows];
        if(sql.startsWith('INSERT INTO system_audit_logs'))return [{insertId:1}];
        throw Error('Unexpected query');
    }});
    const server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
    try {
        for (const count of [0, 8, 45]) {
            rows=Array.from({length:count},(_,i)=>({disease:`Monthly fixture ${i+1} - long condition requiring wrapping`,category:i===0?'unknown-category':i%2?'mortality':'morbidity',status:'Cleared',count:i+1}));
            events.length=0;
            const response=await fetch(`http://127.0.0.1:${server.address().port}/api/mho/reports/fhsis?month=January&year=2026`);
            assert.equal(response.status,200); await response.arrayBuffer();
            assert.ok(!events.some(e=>/I hereby certify|CERTIFICATION|DEPARTMENT OF HEALTH/.test(e.text)));
            assert.ok(events.some(e=>e.text==='MHO REVIEW'));
            assert.equal(events.filter(e=>e.text.startsWith('Monthly fixture')).length,count);
            for (const page of [...new Set(events.map(e=>e.page))]) assert.ok(events.some(e=>e.page===page&&e.text==='ACADEMIC SAMPLE - NOT FOR OFFICIAL SUBMISSION'));
            const caseEvents=events.filter(e=>e.text.startsWith('Monthly fixture'));
            for(const e of caseEvents) {
                assert.ok(e.y<e.bottom-30);
                assert.ok(events.some(header=>header.page===e.page && header.text==='Recorded condition'));
            }
            if(count) {
                assert.ok(events.some(e=>e.text==='Unclassified'),'Unrecognized categories must not default to Morbidity');
                const total=events.findIndex(e=>e.text==='TOTAL RECORDED ENTRIES');
                assert.equal(events[total+1].text,String(count*(count+1)/2));
            }
        }
    } finally { PDFDocument.prototype.text=originalText; await new Promise(resolve=>server.close(resolve)); }
});
