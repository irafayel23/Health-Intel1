const {invalid}=require('./service-errors');
function pagination(input={},defaultSize=25){
 const number=(value,fallback,max)=>{if(value===undefined)return fallback;if(typeof value!=='string'||!/^\d+$/.test(value)||!Number.isSafeInteger(+value)||+value<1||+value>max)throw invalid('Invalid pagination parameter.');return +value;};
 return {page:number(input.page,1,1000000),size:number(input.page_size,defaultSize,100)};
}
function pageResult(total,{page,size}){total=Number(total);const page_count=Math.max(1,Math.ceil(total/size));page=Math.min(page,page_count);return {total,page,page_count,page_size:size,offset:(page-1)*size};}
module.exports={pagination,pageResult};
