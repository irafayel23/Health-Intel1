// Expand the existing Leaflet element, preserving its map state and original place in the portal.
(() => {
    function bind(container,layout) {
        const controls=document.createElement('div');controls.className='heatmap-expand-controls';
        const hint=document.createElement('span');hint.textContent='Esc to exit';hint.hidden=true;
        const button=document.createElement('button');button.type='button';button.className='heatmap-expand-button';button.textContent='Fullscreen';
        const iconOnly=['murciaMap','bhwMap'].includes(container.id);
        if(iconOnly)button.innerHTML="<svg class=\"mho-map-maximize\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3\"/></svg><svg class=\"mho-map-minimize\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M8 3v3a2 2 0 0 1-2 2H3m13-5v3a2 2 0 0 0 2 2h3M3 16h3a2 2 0 0 1 2 2v3m13-5h-3a2 2 0 0 0-2 2v3\"/></svg>";
        if(iconOnly)button.dataset.mhoHint='Open fullscreen map';
        else button.title='Open fullscreen map';
        button.setAttribute('aria-label','Open fullscreen map');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',container.id);
        controls.append(hint,button);container.append(controls);
        let expanded=false,anchor=null,background=[],attributes=null,oldBodyClass=false;
        const render=()=>{if(!iconOnly)button.textContent=expanded?'Exit fullscreen':'Fullscreen';const label=expanded?'Exit fullscreen map':'Open fullscreen map';if(iconOnly)button.dataset.mhoHint=label;else button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-expanded',String(expanded));hint.hidden=!expanded;requestAnimationFrame(layout);};
        function exit(){
            if(!expanded)return;
            expanded=false;container.classList.remove('heatmap-expanded');
            if(anchor?.parentNode){anchor.parentNode.insertBefore(container,anchor);anchor.remove();}anchor=null;
            for(const [name,value] of attributes)value===null?container.removeAttribute(name):container.setAttribute(name,value);
            for(const [element,inert] of background)element.inert=inert;background=[];
            if(!oldBodyClass)document.body.classList.remove('heatmap-is-expanded');
            window.dispatchEvent(new Event('health-intel:map-fullscreen-change'));
            render();button.focus({preventScroll:true});
        }
        function enter(){
            if(expanded)return;
            expanded=true;attributes=['role','aria-modal','aria-label'].map(name=>[name,container.getAttribute(name)]);
            anchor=document.createElement('div');anchor.className='heatmap-fullscreen-placeholder';anchor.setAttribute('aria-hidden','true');
            anchor.style.height=container.getBoundingClientRect().height+'px';container.before(anchor);document.body.append(container);
            background=[...document.body.children].filter(element=>element!==container).map(element=>[element,element.inert]);
            for(const [element] of background)element.inert=true;
            oldBodyClass=document.body.classList.contains('heatmap-is-expanded');document.body.classList.add('heatmap-is-expanded');
            container.classList.add('heatmap-expanded');container.setAttribute('role','dialog');container.setAttribute('aria-modal','true');container.setAttribute('aria-label','Fullscreen barangay heatmap');
            window.dispatchEvent(new Event('health-intel:map-fullscreen-change'));
            render();button.focus({preventScroll:true});
        }
        button.addEventListener('click',()=>expanded?exit():enter());
        controls.addEventListener('click',event=>event.stopPropagation());
        controls.addEventListener('dblclick',event=>event.stopPropagation());
        document.addEventListener('keydown',event=>{
            const typing=event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
            const dialogOpen=document.querySelector?.('dialog[open], .swal2-container');
            if(container.id==='murciaMap'&&event.key.toLowerCase()==='f'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.repeat&&!typing&&!dialogOpen&&(expanded||container.getClientRects().length)){
                event.preventDefault();
                expanded?exit():enter();
                return;
            }
            if(!expanded)return;
            // The native breakdown dialog handles its own focus trap and Escape.
            if(event.target?.closest?.('.heatmap-case-dialog[open]'))return;
            if(event.key==='Escape'){event.preventDefault();event.stopPropagation();exit();return;}
            if(event.key!=='Tab')return;
            const focusable=[...container.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(element=>!element.disabled&&element.tabIndex>=0&&element.getClientRects().length);
            const first=focusable[0]||button,last=focusable.at(-1)||button,active=document.activeElement;
            if(!container.contains(active)||(event.shiftKey&&active===first)||(!event.shiftKey&&active===last)){event.preventDefault();(event.shiftKey?last:first).focus();}
        },true);
        window.addEventListener('pagehide',exit,{once:true});
        return {controls,button,exit};
    }
    window.HealthIntelMapFullscreen={bind};
})();
