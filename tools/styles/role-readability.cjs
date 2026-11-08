// Shared opt-in readability for the four role builds. Dark-mode rules are untouched.
const plugin = require('tailwindcss/plugin');
module.exports = plugin(({addUtilities}) => {
  const root = 'html:not(.dark) .hi-role-readable';
  addUtilities({
    [root]: {color:'#1e293b'},
    [root+' :is(.text-slate-400, .text-slate-500, .text-slate-600, .text-neutral-400, .text-neutral-500, .text-neutral-600, .text-gray-400, .text-gray-500, .text-gray-600)']: {color:'#334155'},
    [root+' :is(input, textarea)::placeholder']: {color:'#475569',opacity:'1'},
    [root+' :is(.text-emerald-500, .text-emerald-600, .text-green-500, .text-green-600)']: {color:'#047857'},
    [root+' :is(.text-red-500, .text-red-600)']: {color:'#b91c1c'},
    [root+' :is(.admin-case-detail dt, .admin-case-history-note, .admin-case-history small)']: {color:'#334155'},
    [root+' :is(.admin-table-highlight, .admin-case-view-button)']: {color:'#075985'},
    [root+' :is(.admin-disease-alert, .admin-classification-high, .admin-button-archive-patient, .admin-button-archive-disease)']: {color:'#b91c1c'},
    [root+' .swal2-html-container']: {color:'#334155 !important'},
    [root+' .swal2-html-container :is(label, dt)']: {color:'#334155'},
    [root+' .swal2-input-label']: {color:'#334155'},
  });
});
