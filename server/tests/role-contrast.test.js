const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const plugin=require('../../tools/styles/role-readability.cjs');
let rules;plugin.handler({addUtilities:value=>{rules=value;}});
function luminance(hex){return hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);}
function ratio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
test('readability styles are restricted to light mode in the authorized role pages',()=>{
 for(const selector of Object.keys(rules))assert(selector.startsWith('html:not(.dark) .hi-role-readable'));
 for(const role of ['admin','superadmin']){
  assert(fs.readFileSync(path.join(root,role+'.html'),'utf8').includes('hi-role-readable'));
  assert(fs.readFileSync(path.join(root,'tools/styles',role+'.config.cjs'),'utf8').includes("require('./role-readability.cjs')"));
 }
 for(const role of ['bhw','mho'])assert(fs.readFileSync(path.join(root,role+'.html'),'utf8').includes('hi-role-readable'));
 assert(fs.readFileSync(path.join(root,'tools/styles/tailwind.config.cjs'),'utf8').includes("require('./role-readability.cjs')"));
});
test('selected secondary, placeholder and status colors meet 4.5:1 on their light surfaces',()=>{
 for(const [fg,bgs] of [['334155',['ffffff','f1f5f9']],['475569',['ffffff','f1f5f9']],['047857',['ffffff','ecfdf5']],['b91c1c',['ffffff','fee2e2']],['075985',['ffffff','f0f9ff']]])
  for(const bg of bgs)assert(ratio(fg,bg)>=4.5,fg+' on '+bg);
 const placeholder=Object.entries(rules).find(([s])=>s.endsWith('::placeholder'))[1];
 assert.equal(placeholder.opacity,'1');assert.equal(placeholder.color,'#475569');
});
test('role builds contain compiled light-mode rules, caption sizing and modal contrast',()=>{
 for(const role of ['admin','superadmin']){
  const css=fs.readFileSync(path.join(root,'assets/css',role,role+'-utilities.css'),'utf8');
  assert(css.includes('html:not(.dark) .hi-role-readable'));
  assert(css.includes('.swal2-html-container'));assert(css.includes('.text-xs'));
 }
 
 assert(!Object.values(rules).some(v=>v.display||v.pointerEvents));
});

test('BHW/MHO forms use scoped readable tokens and accept written or verbal referral wording',()=>{
 let clinical;require('../../tools/styles/clinical-readability.cjs').handler({addUtilities:x=>{clinical=x;}});
 for(const selector of Object.keys(clinical))assert(selector.startsWith('html:not(.dark) .hi-clinical-readable'));
 for(const role of ['bhw','mho']){
  const html=fs.readFileSync(path.join(root,role+'.html'),'utf8');assert(html.includes('hi-clinical-readable'));
  const css=fs.readFileSync(path.join(root,'assets/css',role,role+'-utilities.css'),'utf8');assert(css.includes('.hi-clinical-readable'));assert(css.includes('--hi-form-muted:#1e293b'));
 }
 for(const file of ['mho.html','assets/js/shared/patient-visits.js']){
  const source=fs.readFileSync(path.join(root,file),'utf8');assert(source.includes('Referring health worker / facility'));assert(source.includes('If verbal, indicate'));assert(!source.includes('Copy the reason from the referral'));
 }
});

test('color-only readability preserves original component font sizes and weights',()=>{
 const sources=['role-readability.cjs','clinical-readability.cjs'];
 for(const name of sources){const source=fs.readFileSync(path.join(root,'tools/styles',name),'utf8');assert(!/fontSize:|fontWeight:|lineHeight:/.test(source));}
});


test('Superadmin contrast overrides are light-only and do not enlarge typography',()=>{
 const postcss=require('../../tools/styles/node_modules/postcss');
 const css=postcss.parse(fs.readFileSync(path.join(root,'assets/css/superadmin/superadmin-page.css'),'utf8'));
 let count=0;css.walkRules(rule=>{
  if(!rule.selector.startsWith('html:not(.dark) .hi-superadmin-dialogs'))return;
  count++;for(const decl of rule.nodes)if(decl.type==='decl')assert(['color','opacity'].includes(decl.prop),decl.prop);
 });assert.equal(count,4);
 for(const fg of ['0f172a','1e293b','334155'])for(const bg of ['ffffff','f1f5f9','eff6ff'])assert(ratio(fg,bg)>=4.5,fg+' on '+bg);
});
