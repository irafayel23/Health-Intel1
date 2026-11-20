const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let css;require('../../tools/styles/select-chevron.cjs').handler({addUtilities:x=>css=x});
test('native dropdown arrows cover all role builds without replacing native controls',()=>{
 const selector=Object.keys(css)[0];assert(selector.includes(':not([multiple]):not([size]):not(.hi-select-native)'));
 assert.equal(css[selector].backgroundSize,'18px 18px');assert.equal(css[selector].paddingRight,'40px');assert(!css[selector].fontSize);assert(!css[selector].fontWeight);
 assert(css['.dark '+selector].backgroundImage.includes('cbd5e1'));
 assert.equal(css['@media (forced-colors:active)'][selector].appearance,'auto');
 for(const role of ['bhw','mho','admin','superadmin'])assert(fs.readFileSync(path.join(__dirname,'../../assets/css',role,role+'-utilities.css'),'utf8').includes('background-size:18px 18px'));
});
