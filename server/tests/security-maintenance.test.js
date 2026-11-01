const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const express=require('express');
const {readDeploymentConfig,configureDeployment}=require('../config/deployment-config');

test('proxy headers cannot override the direct peer when proxy trust is disabled',async t=>{
 const app=express();configureDeployment(app,readDeploymentConfig({}));
 app.get('/peer',(req,res)=>res.json({ip:req.ip}));
 const server=http.createServer(app);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>server.close(r)));
 const response=await fetch(`http://127.0.0.1:${server.address().port}/peer`,{headers:{'X-Forwarded-For':'203.0.113.7'}});
 assert.equal((await response.json()).ip,'127.0.0.1');
 assert.throws(()=>readDeploymentConfig({TRUST_PROXY:'true'}));
});

test('patched proxy parser distinguishes untrusted IPv6 addresses from loopback',()=>{
 const proxy=require('proxy-addr'),trust=proxy.compile('loopback');
 for(const ip of ['127.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(trust(ip),true);
 for(const ip of ['203.0.113.7','::ffff:203.0.113.7','2001:db8::1'])assert.equal(trust(ip),false);
});

test('updated mysql driver retains parameter escaping and defaults local files off',()=>{
 const mysql=require('mysql2');
 const value="x' OR 1=1 --";
 assert.equal(mysql.format('SELECT ? AS value',[value]),"SELECT 'x\\' OR 1=1 --' AS value");
 // Inspect defaults without opening a network connection.
 const path=require('node:path');
 const Config=require(path.join(path.dirname(require.resolve('mysql2')),'lib/connection_config.js'));
 assert.equal(new Config({}).infileStreamFactory,undefined);
});

test('email helper enforces TLS and access restrictions and composes mail with updated Nodemailer',async t=>{
 const mailer=require('nodemailer'),original=mailer.createTransport;
 const keys=['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASSWORD','SMTP_SERVICE','MAIL_FROM'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const modulePath=require.resolve('../config/security-config');
 t.after(()=>{mailer.createTransport=original;delete require.cache[modulePath];for(const k of keys)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];});
 Object.assign(process.env,{SMTP_HOST:'smtp.example.invalid',SMTP_PORT:'587',SMTP_SECURE:'false',SMTP_USER:'sender@example.invalid',SMTP_PASSWORD:'synthetic-only',MAIL_FROM:'Synthetic Test <sender@example.invalid>'});
 let captured;
 mailer.createTransport=options=>{captured=options;return original.call(mailer,{streamTransport:true,buffer:true,newline:'unix'});};
 delete require.cache[modulePath];const security=require('../config/security-config');
 const result=await security.sendEmail({to:'recipient@example.invalid',subject:'Synthetic reset test',text:'Synthetic content only'});
 assert.equal(captured.requireTLS,true);assert.equal(captured.disableFileAccess,true);assert.equal(captured.disableUrlAccess,true);
 assert.match(result.message.toString(),/Subject: Synthetic reset test/);
 process.env.MAIL_FROM='sender@example.invalid\r\nBcc: injected@example.invalid';
 await assert.rejects(security.sendEmail({to:'recipient@example.invalid',text:'Synthetic'}),/EMAIL_CONFIGURATION_INVALID/);
 assert.equal(security.normalizeEmail('user@example.invalid\r\nBcc: x@example.invalid'),null);
});
