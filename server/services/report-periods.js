const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
function bad(message){const error=new Error(message);error.status=400;throw error;}
function yearValue(value){if(typeof value!=='string'||!/^\d{4}$/.test(value)||Number(value)<1900||Number(value)>9998)bad('Select a valid report year.');return Number(value);}
function monthlyPeriod(month,year){const y=yearValue(year),m=months.indexOf(month);if(m<0)bad('Select a valid report month.');return {year:y,month, start:`${y}-${String(m+1).padStart(2,'0')}-01`,end:m===11?`${y+1}-01-01`:`${y}-${String(m+2).padStart(2,'0')}-01`};}
function isoWeekPeriod(week,year){
    if(typeof week!=='string')bad('Select a valid report week and year.');
    const iso=/^(\d{4})-W(\d{2})$/.exec(week);let y,n;
    if(iso){y=yearValue(iso[1]);n=Number(iso[2]);if(year!==undefined&&yearValue(year)!==y)bad('The week and report year disagree.');}
    else{y=yearValue(year);const plain=/^(?:Morbidity Week |Week )?(\d{1,2})$/.exec(week);if(!plain)bad('Select a valid report week.');n=Number(plain[1]);}
    if(n<1||n>53)bad('Select a week from 1 to 53.');
    const jan4=new Date(Date.UTC(y,0,4));jan4.setUTCDate(jan4.getUTCDate()-((jan4.getUTCDay()+6)%7)+(n-1)*7);
    const thursday=new Date(jan4);thursday.setUTCDate(thursday.getUTCDate()+3);if(thursday.getUTCFullYear()!==y)bad('This year does not have the selected ISO week.');
    const end=new Date(jan4);end.setUTCDate(end.getUTCDate()+7);
    return {year:y,week:n,start:jan4.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
module.exports={months,monthlyPeriod,isoWeekPeriod};
