// Only BHW/MHO opt in. Every selector excludes dark mode.
const plugin=require('tailwindcss/plugin');
module.exports=plugin(({addUtilities})=>{
 const root='html:not(.dark) .hi-clinical-readable';
 addUtilities({
  [root+' #view-analytics']: {color:'#0f172a','--muted-foreground':'222.2 47.4% 11.2%'},
  [root]: {'--muted-foreground':'217.2 32.6% 17.5%','--hi-form-text':'#1e293b','--hi-form-muted':'#1e293b'},
  [root+' :is(.walkin-help, .hi-field-help, .hi-encode-intro, .walkin-form-footer p, .hi-visit-date, .hi-visit-case-ref, .hi-visit-notes, .hi-visit-referral, .hi-history-heading>span, .hi-visit-condition>span, .hi-visit-measurements dt, .hi-history-empty)']: {color:'#334155'},
  [root+' :is(.walkin-field label, .hi-encode label, .hi-review-dialog label)']: {color:'#1e293b'},
  [root+' :is(.hi-dialog, .hi-encode, .walkin-form) :is(input, textarea)::placeholder']: {color:'#475569',opacity:'1'},
  [root+' :is(.hi-select-group, .hi-select-empty)']: {color:'#334155'},
  [root+' :is(.hi-followup-case>span, .walkin-page-heading p, .walkin-section-heading p, .walkin-recent-heading p)']: {color:'#334155'},
  [root+' :is(.text-muted-foreground, .text-slate-600, .text-slate-500)']: {color:'#1e293b'},
  [root+' .hi-select-arrow']: {color:'#475569'},
 });
});
