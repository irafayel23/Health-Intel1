// Show monthly counts with larger halos at barangay centers.
(() => {
    function prepare(rows) {
        const points = [];
        for (const row of rows) {
            if (row.lat === null || row.lng === null || row.lat === '' || row.lng === '' ||
                !Number.isFinite(Number(row.lat)) || Math.abs(Number(row.lat)) > 90 ||
                !Number.isFinite(Number(row.lng)) || Math.abs(Number(row.lng)) > 180) continue;
            const cases = row.historical ? row.cases : row.activity?.observed_cases;
            if (!Number.isSafeInteger(cases) || cases <= 0) continue;
            const radius = 12 + 42 * Math.sqrt(cases / (cases + 20));
            points.push({ lat: Number(row.lat), lng: Number(row.lng), cases, radius });
        }
        return points;
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
            const points = prepare(rows);
            if(layer&&map.hasLayer(layer))map.removeLayer(layer);
            layer=null;
            if(mode==='heat'){
                layer=L.layerGroup(points.map(point=>L.circleMarker([point.lat,point.lng],{
                    radius:point.radius,stroke:false,fill:true,fillColor:'#2dd4bf',fillOpacity:0.55,
                    className:'heatmap-volume-halo',interactive:false,bubblingMouseEvents:false
                }))).addTo(map);
            }
            summary.setAttribute('aria-pressed',String(mode==='summary'));heat.setAttribute('aria-pressed',String(mode==='heat'));
            heat.disabled=!hasData;container.classList.toggle('heatmap-heat-view',mode==='heat');
            if(summaryLegend)summaryLegend.hidden=mode==='heat';legend.hidden=mode!=='heat';legend.replaceChildren();
            const title = document.createElement('strong');
            title.textContent = 'Cases this month';
            const note = document.createElement('p');
            note.textContent = points.length ? 'Larger halos show higher case counts.' : 'No positive case counts to display.';
            legend.append(title, note);
        }
        summary.addEventListener('click',()=>{mode='summary';draw();onChange(mode);});
        heat.addEventListener('click',()=>{if(!hasData)return;mode='heat';draw();onChange(mode);});
        draw();
        return {update(data){rows=data;hasData=true;draw();},resize(){if(mode==='heat')draw();}};
    }
    window.HealthIntelHeatView={prepare,bind};
})();
