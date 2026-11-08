// Native selects retain native keyboard/touch behavior; only their arrow changes.
const plugin=require('tailwindcss/plugin');
const icon=color=>`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;
module.exports=plugin(({addUtilities})=>{
 const selector='.hi-role-readable select:not([multiple]):not([size]):not(.hi-select-native)';
 addUtilities({
  [selector]:{appearance:'none',WebkitAppearance:'none',backgroundImage:icon('475569'),backgroundRepeat:'no-repeat',backgroundPosition:'right 12px center',backgroundSize:'18px 18px',paddingRight:'40px'},
  ['.dark '+selector]:{backgroundImage:icon('cbd5e1')},
  '@media (forced-colors:active)':{[selector]:{appearance:'auto',WebkitAppearance:'auto',backgroundImage:'none',paddingRight:'12px'}},
 });
});
