const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const {invalid}=require('./service-errors');
async function image(value){
 if(typeof value!=='string'||value.length>4200000||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw invalid('Upload a JPG or PNG image, maximum 3 MB.');
 const bytes=Buffer.from(value.slice(value.indexOf(',')+1),'base64');if(bytes.length>3*1024*1024)throw invalid('Each image must be at most 3 MB.');
 try{const input=sharp(bytes,{limitInputPixels:16000000,failOn:'warning'});const meta=await input.metadata();if(!['jpeg','png'].includes(meta.format)||meta.width<200||meta.height<200||meta.pages>1)throw Error();const data=await input.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();return 'data:image/jpeg;base64,'+data.toString('base64');}catch{throw invalid('Use a readable, undamaged JPG or PNG photo at least 200 by 200 pixels.');}
}
function createEvidenceStore(directory=process.env.REGISTRATION_REVIEW_DIRECTORY||path.join(__dirname,'../private/registration-review')){
 function key(){fs.mkdirSync(directory,{recursive:true,mode:0o700});const file=path.join(directory,'storage.key');try{fs.writeFileSync(file,crypto.randomBytes(32),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}const k=fs.readFileSync(file);if(k.length!==32)throw Error('Registration evidence key unavailable');return k;}
 const file=id=>path.join(directory,crypto.createHash('sha256').update(id).digest('hex')+'.enc');
 function read(id){if(!fs.existsSync(file(id)))return null;const b=fs.readFileSync(file(id)),d=crypto.createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());}
 function write(id,value){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),iv),body=Buffer.concat([c.update(JSON.stringify(value)),c.final()]),temp=file(id)+'.'+crypto.randomUUID();fs.writeFileSync(temp,Buffer.concat([iv,c.getAuthTag(),body]),{mode:0o600});fs.renameSync(temp,file(id));}
 return {read,owner:uid=>read('subject:'+uid)?.id,save(id,data){write(id,data);write('subject:'+data.uid,{id});},restore(id,previous,uid,submission){if(read(id)?.submission!==submission)return;if(previous)write(id,previous);else{fs.unlinkSync(file(id));if(read('subject:'+uid)?.id===id)fs.unlinkSync(file('subject:'+uid));}}};
}
const store=createEvidenceStore();module.exports={image,createEvidenceStore,store};
