// Fixed monthly case-volume colors at barangay centers, never individual case locations.
(() => {
    const colors={mild:'#16a34a',monitored:'#d97706',high_risk:'#dc2626'};
    function prepare(rows) {
        let omitted=0,total=0;
        const points=[];
        for(const row of rows){
            const activity=row.activity;
            if(row.lat===null||row.lng===null||row.lat===''||row.lng===''||!Number.isFinite(Number(row.lat))||Math.abs(Number(row.lat))>90||!Number.isFinite(Number(row.lng))||Math.abs(Number(row.lng))>180||
                activity?.status!=='assessed'||activity.method!=='fixed-case-volume'||!Number.isSafeInteger(activity.observed_cases)||activity.observed_cases<0||
                (activity.observed_cases>0&&!colors[activity.tone])){omitted++;continue;}
            total+=activity.observed_cases;
            if(activity.observed_cases)points.push({lat:Number(row.lat),lng:Number(row.lng),cases:activity.observed_cases,color:colors[activity.tone]});
        }
        return {points,total,omitted};
    }
    function bind(map,container,{onChange=()=>{}}={}){
        let mode='summary',layer=null,rows=[],hasData=false;
        const controls=document.createElement('div');controls.className='heatmap-view-switch';controls.setAttribute('role','group');controls.setAttribute('aria-label','Map display');
        const summary=document.createElement('button'),heat=document.createElement('button');
        for(const [button,label] of [[summary,'Barangay Summary'],[heat,'Heat View']]){button.type='button';button.textContent=label;controls.append(button);}
        const legend=document.createElement('div');legend.className='heatmap-intensity-legend';legend.hidden=true;legend.setAttribute('role','status');
        container.append(controls,legend);L.DomEvent.disableClickPropagation(controls);L.DomEvent.disableScrollPropagation(controls);L.DomEvent.disableClickPropagation(legend);
        const summaryLegend=container.parentElement.querySelector('.heatmap-legend');
        function draw(){
            const data=prepare(rows);
            if(layer&&map.hasLayer(layer))map.removeLayer(layer);
            layer=null;
            if(mode==='heat'){
                // Separate vector halos keep neighboring counts from adding into a false higher band.
                layer=L.layerGroup(data.points.map(point=>L.circleMarker([point.lat,point.lng],{
                    radius:38,stroke:false,fill:true,fillColor:point.color,fillOpacity:0.65,
                    className:'heatmap-volume-halo',interactive:false,bubblingMouseEvents:false
                }))).addTo(map);
            }
            summary.setAttribute('aria-pressed',String(mode==='summary'));heat.setAttribute('aria-pressed',String(mode==='heat'));
            heat.disabled=!hasData;container.classList.toggle('heatmap-heat-view',mode==='heat');
            if(summaryLegend)summaryLegend.hidden=mode==='heat';legend.hidden=mode!=='heat';legend.replaceChildren();
            const title=document.createElement('strong');title.textContent='Monthly case-volume bands';
            const ramp=document.createElement('div');ramp.className='heatmap-intensity-ramp';ramp.setAttribute('aria-hidden','true');
            const scale=document.createElement('div');scale.className='heatmap-intensity-scale';
            for(const label of ['Mild · 1–10','Monitored · 11–20','High Risk · 21+']){const item=document.createElement('span');item.textContent=label;scale.append(item);}
            const note=document.createElement('p');note.textContent='Current calendar month through today. Fixed colors match Barangay Summary; halos do not blend counts. Barangay centers only, not case locations or outbreak boundaries.';
            legend.append(title,ramp,scale,note);
            if(!data.points.length){const empty=document.createElement('p');empty.textContent='No positive assessed monthly totals; no colored halos are drawn.';legend.append(empty);}
            if(data.omitted){const missing=document.createElement('p');missing.textContent=`${data.omitted} barangay assessment(s) unavailable or without valid coordinates; omitted.`;legend.append(missing);}
        }
        summary.addEventListener('click',()=>{mode='summary';draw();onChange(mode);});
        heat.addEventListener('click',()=>{if(!hasData)return;mode='heat';draw();onChange(mode);});
        draw();
        return {update(data){rows=data;hasData=true;draw();},resize(){if(mode==='heat')draw();}};
    }
    window.HealthIntelHeatView={prepare,bind};
})();
