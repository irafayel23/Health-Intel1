// Height-aware desktop compaction; typography and mobile layouts are unchanged.
const plugin=require('tailwindcss/plugin');
module.exports=plugin(({addUtilities})=>addUtilities({
 '@media (min-width:901px) and (max-height:900px)':{
  '.hi-clinical-readable main > header':{height:'56px',minHeight:'56px',flexShrink:'0'},
  '.hi-clinical-readable :is(.mho-page-scroll,.bhw-page-scroll)':{padding:'20px'},
  '.hi-clinical-readable #sidebar .nav-menu':{gap:'4px',paddingTop:'12px',paddingBottom:'12px'},
  '.hi-clinical-readable #sidebar .nav-menu > .nav-item':{marginTop:'0',marginBottom:'0',paddingTop:'10px',paddingBottom:'10px',minHeight:'44px'},
  '.hi-clinical-readable #sidebar > div:last-child':{padding:'12px'},
  '.hi-clinical-readable #sidebar > div:last-child > .mt-4':{marginTop:'8px'},
  '.hi-clinical-readable #view-analytics > :not([hidden]) ~ :not([hidden])':{marginTop:'16px',marginBottom:'0'},
  '.hi-clinical-readable #view-analytics :is(section,aside,div).p-5':{padding:'16px'},
  '.hi-clinical-readable #view-analytics .gap-4':{gap:'12px'},
 }
}));
