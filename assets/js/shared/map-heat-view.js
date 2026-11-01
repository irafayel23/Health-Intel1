// Heat weights describe recorded totals at barangay centers, never case locations.
(() => {
    function prepare(rows) {
        const valid=rows.filter(row=>row.lat!==null&&row.lng!==null&&row.cases!==null&&row.lat!==''&&row.lng!==''&&row.cases!==''&&
            Number.isFinite(Number(row.lat))&&Math.abs(Number(row.lat))<=90&&Number.isFinite(Number(row.lng))&&Math.abs(Number(row.lng))<=180&&
            Number.isSafeInteger(Number(row.cases))&&Number(row.cases)>=0);
        const max=Math.max(0,...valid.map(row=>Number(row.cases)));
        return {max,omitted:rows.length-valid.length,total:valid.reduce((sum,row)=>sum+Number(row.cases),0),
            points:valid.filter(row=>Number(row.cases)>0).map(row=>[Number(row.lat),Number(row.lng),Number(row.cases)/max])};
    }
    let plugin;
    function loadPlugin(){
        if(window.L?.heatLayer)return Promise.resolve();
        if(!plugin)plugin=new Promise((resolve,reject)=>{
            const script=document.createElement('script');script.src='assets/js/vendor/leaflet-heat/leaflet-heat.js';
            script.onload=()=>window.L?.heatLayer?resolve():reject(Error('Heat library unavailable'));
            script.onerror=()=>{script.remove();reject(Error('Heat library unavailable'));};document.head.append(script);
        }).catch(error=>{plugin=null;throw error;});
        return plugin;
    }
    function bind(map,container,{onChange=()=>{}}={}){
        let mode='summary',layer=null,rows=[],busy=false,request=0,hasData=false;
        const controls=document.createElement('div');controls.className='heatmap-view-switch';controls.setAttribute('role','group');controls.setAttribute('aria-label','Map display');
        const summary=document.createElement('button'),heat=document.createElement('button');
        for(const [button,label] of [[summary,'Barangay Summary'],[heat,'Heat View']]){button.type='button';button.textContent=label;controls.append(button);}
        const legend=document.createElement('div');legend.className='heatmap-intensity-legend';legend.hidden=true;legend.setAttribute('role','status');
        container.append(controls,legend);L.DomEvent.disableClickPropagation(controls);L.DomEvent.disableScrollPropagation(controls);L.DomEvent.disableClickPropagation(legend);
        const severityLegend=container.parentElement.querySelector('.heatmap-legend');
        function draw(){
            const data=prepare(rows);
            if(layer&&map.hasLayer(layer))layer.setLatLngs(data.points);
            summary.setAttribute('aria-pressed',String(mode==='summary'));heat.setAttribute('aria-pressed',String(mode==='heat'));
            heat.disabled=busy||!hasData;
            container.classList.toggle('heatmap-heat-view',mode==='heat');
            if(severityLegend)severityLegend.hidden=mode==='heat';
            legend.hidden=mode!=='heat';
            legend.replaceChildren();
            const title=document.createElement('strong');title.textContent='Recorded case intensity';
            const ramp=document.createElement('div');ramp.className='heatmap-intensity-ramp';ramp.setAttribute('aria-hidden','true');
            const scale=document.createElement('div');scale.className='heatmap-intensity-scale';
            const low=document.createElement('span'),high=document.createElement('span');low.textContent='Fewer';high.textContent=`More · highest barangay: ${data.max} cases`;scale.append(low,high);
            const note=document.createElement('p');note.textContent=data.max?'Weighted barangay centers; not street-level locations or outbreak risk.':data.omitted?'No positive totals with valid coordinates; unavailable entries are omitted.':'No active cases in the loaded totals; no heat is drawn.';
            legend.append(title,ramp,scale,note);
            if(data.omitted){const missing=document.createElement('p');missing.textContent=`${data.omitted} barangay total(s) unavailable or without valid coordinates; omitted from heat.`;legend.append(missing);}
        }
        summary.addEventListener('click',()=>{request++;mode='summary';if(layer&&map.hasLayer(layer))map.removeLayer(layer);draw();onChange(mode);});
        heat.addEventListener('click',async()=>{
            if(busy)return;const version=++request;busy=true;heat.disabled=true;heat.textContent='Loading…';
            try{
                await loadPlugin();
                if(version!==request)return;
                // Disable zoom-based fading: this is a relative barangay-total view,
                // so the highest loaded count must remain legible on mobile too.
                if(!layer)layer=L.heatLayer(prepare(rows).points,{radius:55,blur:35,max:1,maxZoom:0,minOpacity:0.12,
                    gradient:{0.2:'#2563eb',0.4:'#14b8a6',0.6:'#a3e635',0.8:'#facc15',1:'#ef4444'}});
                mode='heat';if(!map.hasLayer(layer))layer.addTo(map);draw();onChange(mode);
            }catch(error){
                mode='summary';draw();legend.hidden=false;legend.textContent='Heat View could not load. Barangay Summary remains available; select Heat View to retry.';
            }finally{busy=false;heat.disabled=!hasData;heat.textContent='Heat View';}
        });
        draw();
        // Leaflet.heat 0.2.0 sizes its canvas on attachment. Reattach on container
        // resize so device rotation/fullscreen changes cannot leave a stale canvas.
        return {update(data){rows=data;hasData=true;draw();},resize(){if(layer&&mode==='heat'&&map.hasLayer(layer)){map.removeLayer(layer);layer.addTo(map);draw();}}};
    }
    window.HealthIntelHeatView={prepare,bind};
})();
