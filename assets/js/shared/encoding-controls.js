(() => {
    const escape = window.HealthIntelText.escape;
    const UNLISTED = '__condition_not_listed__';
    function enhanceSelect(select, {searchable=false}={}) {
        if (select._hiSelect) return select._hiSelect;
        const events=new AbortController(), on=(el,name,fn)=>el.addEventListener(name,fn,{signal:events.signal});
        const wrap=document.createElement('div');wrap.className='hi-select';
        select.before(wrap);wrap.append(select);select.classList.add('hi-select-native');select.tabIndex=-1;
        const required=select.required,oldHidden=select.getAttribute('aria-hidden');select.required=false;select.setAttribute('aria-hidden','true');
        const label=select.getAttribute('aria-label') || [...(select.labels?.[0]?.childNodes || [])].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim() || 'Choose an option';
        const button=document.createElement('button');button.type='button';button.className='hi-select-trigger';
        button.setAttribute('role','combobox');button.setAttribute('aria-label',label);button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
        const menu=document.createElement('div');menu.className='hi-select-menu';menu.hidden=true;
        const list=document.createElement('div');list.id=select.id+'-list';list.setAttribute('role','listbox');list.setAttribute('aria-label',label);list.className='hi-select-list';
        button.setAttribute('aria-controls',list.id);
        let search=null,active=-1,options=[];
        if(searchable){search=document.createElement('input');search.type='search';search.placeholder='Search conditions…';search.className='hi-select-search';search.setAttribute('aria-label','Search '+label);search.setAttribute('aria-controls',list.id);menu.append(search);}
        menu.append(list);wrap.append(button);document.body.append(menu);
        function close(focus=false){menu.hidden=true;button.setAttribute('aria-expanded','false');button.removeAttribute('aria-activedescendant');search?.removeAttribute('aria-activedescendant');if(focus)button.focus();}
        function setActive(index){if(!options.length)return;active=(index+options.length)%options.length;[...list.querySelectorAll('[role=option]')].forEach((item,i)=>{item.dataset.active=String(i===active);if(i===active){button.setAttribute('aria-activedescendant',item.id);search?.setAttribute('aria-activedescendant',item.id);item.scrollIntoView({block:'nearest'});}});}
        function choose(option){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));close(true);}
        function render(){
            button.replaceChildren();const text=document.createElement('span');text.textContent=select.selectedOptions[0]?.textContent || 'Select';button.append(text);
            const arrow=document.createElement('span');arrow.className='hi-select-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='⌄';button.append(arrow);button.disabled=select.disabled;
            const query=(search?.value||'').trim().toLocaleLowerCase();
            options=[...select.options].filter(o=>!o.disabled&&o.value&&(!query||o.textContent.toLocaleLowerCase().includes(query)||o.value===UNLISTED));
            list.replaceChildren();active=-1;
            options.forEach((option,i)=>{const item=document.createElement('div');item.id=list.id+'-'+i;item.className='hi-select-option';item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.selected));item.textContent=option.textContent;if(option.value===UNLISTED)item.classList.add('hi-select-unlisted');item.addEventListener('click',()=>choose(option));list.append(item);});
            if(!options.length){const empty=document.createElement('p');empty.className='hi-select-empty';empty.textContent='No matching choices';list.append(empty);}
        }
        function open(){if(select.disabled)return;render();menu.hidden=false;const rect=button.getBoundingClientRect();menu.style.width=rect.width+'px';menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-rect.width-8))+'px';const below=innerHeight-rect.bottom-12,above=rect.top-12;const up=below<230&&above>below;menu.style.maxHeight=Math.min(320,Math.max(140,up?above:below))+'px';menu.style.top=up?'auto':rect.bottom+6+'px';menu.style.bottom=up?innerHeight-rect.top+6+'px':'auto';button.setAttribute('aria-expanded','true');if(search){search.value='';render();search.focus();}setActive(Math.max(0,options.findIndex(o=>o.selected)));}
        function keys(event){
            if(['Escape','ArrowDown','ArrowUp','Home','End','Enter'].includes(event.key))event.stopPropagation();
            if(event.key==='Escape'){event.preventDefault();close(true);}
            else if(event.key==='Tab')close();
            else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();if(menu.hidden)open();else setActive(event.key==='Home'?0:event.key==='End'?options.length-1:active+(event.key==='ArrowDown'?1:-1));}
            else if(event.key==='Enter'||(!search&&event.key===' ')){event.preventDefault();if(menu.hidden)open();else if(options[active])choose(options[active]);}
        }
        on(button,'click',()=>menu.hidden?open():close());on(button,'keydown',keys);if(search){on(search,'input',render);on(search,'keydown',keys);}
        on(select,'change',render);on(document,'pointerdown',e=>{if(!wrap.contains(e.target)&&!menu.contains(e.target))close();});
        on(window,'resize',()=>close());window.addEventListener('scroll',e=>{if(!menu.contains(e.target))close();},{capture:true,signal:events.signal});
        const observer=new MutationObserver(render);observer.observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});render();
        const api={refresh:render,destroy(){events.abort();observer.disconnect();menu.remove();button.remove();select.classList.remove('hi-select-native');select.tabIndex=0;select.required=required;if(oldHidden===null)select.removeAttribute('aria-hidden');else select.setAttribute('aria-hidden',oldHidden);wrap.before(select);wrap.remove();delete select._hiSelect;}};select._hiSelect=api;return api;
    }
    function conditionMarkup(prefix){return `<div class="hi-condition-field"><label for="${prefix}-disease">Reported disease / condition *</label><select id="${prefix}-disease" aria-label="Reported disease or condition"><option value="">Loading conditions…</option></select><p class="hi-field-help" id="${prefix}-disease-note">Choose the condition from the available medical information.</p><div id="${prefix}-unlisted" class="hi-unlisted-fields" hidden><label for="${prefix}-reported">Reported condition *</label><input id="${prefix}-reported" maxlength="255" placeholder="Enter the condition exactly as reported"><label for="${prefix}-source">Source / reference *</label><input id="${prefix}-source" maxlength="500" placeholder="For example: clinic referral or patient report"><p class="hi-field-help">This case will be saved for MHO review. Recording it does not establish a diagnosis.</p></div></div>`;}
    function populateConditions(prefix,data){const select=document.getElementById(prefix+'-disease');const current=select.value;select.replaceChildren(new Option('Select reported condition',''));for(const item of data)select.add(new Option(item.name,item.name));select.add(new Option('Condition not listed — submit for review',UNLISTED));if([...select.options].some(o=>o.value===current))select.value=current;select.disabled=false;select._hiSelect?.refresh();}
    function bindCondition(prefix){const select=document.getElementById(prefix+'-disease');const control=enhanceSelect(select,{searchable:true});select.addEventListener('change',()=>{document.getElementById(prefix+'-unlisted').hidden=select.value!==UNLISTED;document.getElementById(prefix+'-disease-note').textContent=select.value===UNLISTED?'Save now; MHO will review the classification.':'Choose the condition from the available medical information.';});return control;}
    function conditionPayload(prefix){const value=document.getElementById(prefix+'-disease').value;if(!value)throw Error('Select a condition, or choose Condition not listed.');if(value!==UNLISTED)return {disease:value,condition_not_listed:false};const reported=document.getElementById(prefix+'-reported').value.trim(),source=document.getElementById(prefix+'-source').value.trim();if(!reported||!source)throw Error('Enter the reported condition and its source.');return {condition_not_listed:true,reported_condition:reported,condition_source:source};}
    const pending=row=>['Pending','Clarification'].includes(row?.disease_review_status);
    function conditionLabel(row){return pending(row)?`${row.disease_reported || 'Unlisted condition'} (${row.disease_review_status==='Clarification'?'Clarification requested':'Needs review'})`:row?.disease || 'Not recorded';}
    function conditionCell(row){return `${escape(pending(row)?row.disease_reported || 'Unlisted condition':row.disease)}${pending(row)?`<span class="hi-review-badge">${row.disease_review_status==='Clarification'?'Clarification requested':'Needs review'}</span>${row.disease_review_note?`<small class="hi-review-note">${escape(row.disease_review_note)}</small>`:''}`:''}`;}
    window.HealthIntelEncoding={enhanceSelect,conditionMarkup,populateConditions,bindCondition,conditionPayload,conditionLabel,conditionCell,escape,pending};
})();
