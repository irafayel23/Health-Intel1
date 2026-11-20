const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let css;require('../../tools/styles/laptop-spacing.cjs').handler({addUtilities:x=>css=x});
test('laptop compaction changes spacing without scaling text or affecting mobile',()=>{
 const key=Object.keys(css)[0];assert.equal(key,'@media (min-width:901px) and (max-height:900px)');
 for(const [selector,values]of Object.entries(css[key])){assert(selector.startsWith('.hi-clinical-readable'));for(const property of Object.keys(values))assert(!/font|color|zoom|transform/i.test(property));}
 const nav=css[key]['.hi-clinical-readable #sidebar .nav-menu > .nav-item'];assert.equal(nav.minHeight,'44px');assert.equal(nav.marginBottom,'0');
 for(const role of ['bhw','mho'])assert(fs.readFileSync(path.join(__dirname,'../../assets/css',role,role+'-utilities.css'),'utf8').includes('max-height:900px'));
});
