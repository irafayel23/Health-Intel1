// Read-only system-wide ledger; classic script loaded through superadmin.html.
let allAuditLogs = [];
let currentAuditPage = 1;
const AUDIT_PER_PAGE = 8;
function ledgerDate(value) {
    const date = new Date(value);
    if(!Number.isFinite(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
}
function ledgerTime(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}).format(date)+' PHT' : 'Not recorded';
}
function ledgerValue(id) { return document.getElementById(id)?.value || ''; }
function ledgerRows() {
    const search=ledgerValue('ledger-search').trim().toLowerCase(), role=ledgerValue('ledger-role'), action=ledgerValue('ledger-action');
    const from=ledgerValue('ledger-from'), to=ledgerValue('ledger-to');
    if(from && to && from>to) return [];
    return allAuditLogs.filter(log=> {
        const date=ledgerDate(log.created_at);
        return (!role || log.role===role) && (!action || log.action===action)
            && (!from || date>=from) && (!to || (date && date<=to))
            && (!search || [log.user_id,log.target_id,log.case_id?`REC-${log.case_id}`:''].some(value=>String(value || '').toLowerCase().includes(search)));
    });
}
function ledgerOptions(id,key,label) {
    const select=document.getElementById(id);
    if(!select) return;
    const selected=select.value;
    const values=[...new Set(allAuditLogs.map(log=>log[key]).filter(Boolean))].sort();
    select.innerHTML=`<option value="">${label}</option>`+values.map(value=>`<option value="${escapeText(value)}">${escapeText(value)}</option>`).join('');
    select.value=values.includes(selected)?selected:'';
}
async function loadAuditLogs() {
    const status=document.getElementById('ledger-status');
    if(status) status.textContent='Loading saved events…';
    try {
        const response=await fetch('http://localhost:3000/api/superadmin/audit-logs');
        const result=await response.json();
        if(!response.ok || !result.success || !Array.isArray(result.data)) throw Error('Ledger unavailable');
        allAuditLogs=result.data;
        document.getElementById('stat-total-logs').innerText=allAuditLogs.length;
        ledgerOptions('ledger-role','role','All roles');
        ledgerOptions('ledger-action','action','All actions');
        filterLedger();
    } catch(error) {
        if(status) status.textContent='Could not refresh the ledger. Previously loaded entries may be out of date; try Sync again.';
        console.error('Ledger refresh failed.');
    }
}
function filterLedger() { currentAuditPage=1; renderAuditTable(); }
function clearLedgerFilters() {
    for(const id of ['ledger-search','ledger-role','ledger-action','ledger-from','ledger-to']) document.getElementById(id).value='';
    filterLedger();
}
function renderAuditTable() {
    const rows=ledgerRows(), status=document.getElementById('ledger-status');
    const invalid=ledgerValue('ledger-from') && ledgerValue('ledger-to') && ledgerValue('ledger-from')>ledgerValue('ledger-to');
    if(status) status.textContent=invalid?'Choose a through date on or after the from date.':`${rows.length} of ${allAuditLogs.length} saved events match. Times use Philippine time. Read-only history.`;
    const tbody=document.getElementById('audit-table-body'), pagination=document.getElementById('audit-pagination');
    if(!rows.length) {
        tbody.innerHTML='<tr><td colspan="6" class="p-8 text-center text-slate-500 dark:text-neutral-400">'+(invalid?'Invalid date range.':allAuditLogs.length?'No events match these filters.':'No saved audit events.')+'</td></tr>';
        pagination.classList.add('hidden');
        document.getElementById('audit-page-info').innerText='Showing 0 events';
        document.getElementById('audit-page-buttons').innerHTML='';
        return;
    }
    const totalPages=Math.ceil(rows.length/AUDIT_PER_PAGE);
    currentAuditPage=Math.max(1,Math.min(currentAuditPage,totalPages));
    const start=(currentAuditPage-1)*AUDIT_PER_PAGE;
    tbody.innerHTML=rows.slice(start,start+AUDIT_PER_PAGE).map(log=>{
        const id=Number(log.id), validId=Number.isSafeInteger(id)&&id>0;
        const outcome=log.outcome || 'Not recorded';
        const color=outcome==='Failed'?'text-red-600 dark:text-red-400':outcome==='Succeeded'?'text-emerald-700 dark:text-emerald-400':'text-slate-600 dark:text-neutral-400';
        return `<tr ${validId?`tabindex="0" aria-label="Open ledger event ${id} details" onclick="openLedgerRow(event, ${id})" onkeydown="openLedgerRow(event, ${id})" class="cursor-pointer border-b border-slate-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-neutral-800 dark:hover:bg-neutral-800"`:'class="border-b border-slate-200 dark:border-neutral-800"'}>
            <td class="p-3 text-xs break-words"><div class="hi-ledger-cell">${escapeText(ledgerTime(log.created_at))}</div></td>
            <td class="p-3 break-words"><div class="hi-ledger-cell">${escapeText(log.user_id)}</div></td>
            <td class="p-3 break-words"><div class="hi-ledger-cell">${escapeText(log.role)}</div></td>
            <td class="p-3 [overflow-wrap:anywhere]"><p class="hi-ledger-action font-medium">${escapeText(log.action)}</p><p class="hi-ledger-summary text-xs text-slate-600 dark:text-neutral-400">${escapeText(HealthIntelText.auditDetails(log))}</p>${validId?'<span class="hi-ledger-hint" aria-hidden="true">Open event details</span>':''}</td>
            <td class="p-3 text-xs [overflow-wrap:anywhere]"><div class="hi-ledger-cell">${escapeText(log.target_type?`${log.target_type}: ${log.target_id || 'Not recorded'}`:'Not recorded')}</div></td>
            <td class="p-3 text-xs break-words ${color}"><div class="hi-ledger-cell">${escapeText(outcome)}</div></td>
        </tr>`;
    }).join('');
    pagination.classList.remove('hidden');
    document.getElementById('audit-page-info').innerText=`Showing ${start+1} to ${Math.min(start+AUDIT_PER_PAGE,rows.length)} of ${rows.length} matching events`;
    let buttons='';
    const button=(page,label,selected=false,disabled=false)=>`<button ${disabled?'disabled':''} onclick="goToAuditPage(${page})" class="rounded-lg px-3 py-2 text-sm ${selected?'bg-slate-800 text-white dark:bg-white dark:text-black':'bg-slate-100 dark:bg-neutral-800'}">${label}</button>`;
    buttons+=button(currentAuditPage-1,'Prev',false,currentAuditPage===1);
    const first=Math.max(1,Math.min(currentAuditPage-2,totalPages-4));
    for(let page=first;page<=Math.min(totalPages,first+4);page++) buttons+=button(page,page,page===currentAuditPage);
    buttons+=button(currentAuditPage+1,'Next',false,currentAuditPage===totalPages);
    document.getElementById('audit-page-buttons').innerHTML=buttons;
}
function goToAuditPage(page) { currentAuditPage=page; renderAuditTable(); }
function openLedgerRow(event, id) {
    if (event.target.closest('button, a, input, select, textarea')) return;
    if (event.type === 'keydown') {
        if (!['Enter', ' '].includes(event.key) || event.target !== event.currentTarget) return;
        event.preventDefault();
    }
    return viewLedgerEvent(id);
}
function ledgerPayload(log) {
    try { const value=JSON.parse(log.details); return value && typeof value==='object' && !Array.isArray(value)?value:{}; } catch { return {}; }
}
function viewLedgerEvent(id) {
    const log=allAuditLogs.find(row=>Number(row.id)===id);
    if(!log) return;
    const data=ledgerPayload(log);
    const field=(label,value)=>`<dl class="hi-ledger-detail-row"><dt>${escapeText(label)}</dt><dd>${escapeText(typeof value==='object'?JSON.stringify(value,null,2):value ?? 'Not recorded')}</dd></dl>`;
    let html=field('Actor',`${log.user_id} (${log.role})`)+field('Time',ledgerTime(log.created_at))+field('Action',log.action)
        +field('Outcome',log.outcome || 'Not recorded')+field('Affected record',log.target_type?`${log.target_type}: ${log.target_id || 'Not recorded'}`:'Not recorded')
        +field('Recorded details',HealthIntelText.auditDetails(log));
    for(const [key,label] of Object.entries({reason:'Reason',attribution:'Attribution',before:'Previous values',after:'New values',period:'Report period',barangay_id:'Barangay ID',purok:'Purok / zone',record_count:'Recorded case count',delivery:'Export confirmation'})) {
        if(data[key]!==undefined && data[key]!==null) html+=field(label,data[key]);
    }
    if(!data.before && !data.after) html+='<p class="mb-4 text-sm">Previous/new values were not recorded for this event.</p>';
    const related=log.target_type && log.target_id ? allAuditLogs.filter(row=>row.target_type===log.target_type && row.target_id===log.target_id) : [];
    const renderRelated = page => {
        const total=Math.max(1,Math.ceil(related.length/5));
        return '<div class="hi-related-event-list" role="region" aria-label="Related event cards">'+related.slice((page-1)*5,page*5).map(row=>`<article class="hi-related-event"><p class="hi-related-event-title">${escapeText(row.action)} · ${escapeText(row.outcome || 'Not recorded')}</p><p class="hi-related-event-time">${escapeText(ledgerTime(row.created_at))} · ${escapeText(row.user_id)}</p><p class="hi-related-event-details">${escapeText(HealthIntelText.auditDetails(row))}</p></article>`).join('')+'</div>'
            + renderHistoryPagination(page, total, `${related.length} loaded events`, 'Related ledger event pages');
    };
    if(related.length) html+='<h3 class="font-bold mt-5 mb-3">Recent events for this reference</h3><div data-ledger-history>'+renderRelated(1)+'</div>';
    return Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog",title:`Ledger event #${id}`,customClass:{container:'hi-ledger-modal-host',popup:'hi-ledger-modal'},html:`<div class="text-left text-sm text-inherit">${html}</div>`,width:760,confirmButtonText:'Close',didOpen:()=>{
        const scrollBody=Swal.getHtmlContainer();
        scrollBody.tabIndex=0;
        const container=scrollBody.querySelector('[data-ledger-history]');
        if(!container)return;
        container.addEventListener('click',event=>{
            const button=event.target.closest('[data-history-page]');
            if(!button || !container.contains(button) || button.disabled)return;
            const page=Number(button.dataset.historyPage);
            if(!Number.isInteger(page) || page<1 || page>Math.ceil(related.length/5))return;
            const body=Swal.getHtmlContainer(), top=body.scrollTop;
            const height=container.offsetHeight;
            if(height) container.style.minHeight=Math.max(height,parseFloat(container.style.minHeight)||0)+'px';
            container.innerHTML=renderRelated(page);
            container.querySelector('[aria-current="page"]')?.focus({preventScroll:true});
            body.scrollTop=top;
        });
    }});
}
