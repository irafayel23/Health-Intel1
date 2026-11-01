(() => {
    const busy=new Set();
    function initialize(){
        for(const role of ['bhw','mho']){
            const input=document.getElementById(role+'-report-date');if(!input)continue;
            input.max=HealthIntelDate.todayInManila();input.value=input.max;
            input.addEventListener('focus',()=>{input.max=HealthIntelDate.todayInManila();});
            document.querySelector(`[data-daily-today="${role}"]`)?.addEventListener('click',()=>{input.max=HealthIntelDate.todayInManila();input.value=input.max;input.focus();});
        }
    }
    async function download(role){
        if(!['bhw','mho'].includes(role)||busy.has(role))return;
        const input=document.getElementById(role+'-report-date'),button=document.getElementById(role+'-daily-download'),date=input?.value;
        const parsed=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+'T00:00:00Z'):null;
        if(!parsed||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date<'1900-01-01'||date>HealthIntelDate.todayInManila()){
            await Swal.fire({icon:'error',title:'Choose a report date',text:'Select today or an earlier valid date in the Philippines.'});input?.focus();return;
        }
        busy.add(role);if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
        Swal.fire({title:'Preparing daily report...',text:'Report date: '+date,allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
        try{
            await HealthIntel.download(`http://localhost:3000/api/${role}/reports/daily?`+new URLSearchParams({date}),{},`${role.toUpperCase()}_Daily_${date}.pdf`);
            await Swal.fire({icon:'success',title:'Download started',text:'The daily case and consultation summary for '+date+' is ready.'});
        }catch(error){await Swal.fire({icon:'error',title:'Report unavailable',text:error.message||'Please try again.'});}
        finally{busy.delete(role);if(button){button.disabled=false;button.removeAttribute('aria-busy');}}
    }
    document.addEventListener('DOMContentLoaded',initialize);
    window.HealthIntelDailyReports={download};
})();
