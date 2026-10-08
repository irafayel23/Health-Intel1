const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.resolve(__dirname, '../../assets/js/shared', name), 'utf8');

function themeFixture(storage = new Map()) {
    const classes = new Set(), events = {}, attributes = {};
    const button = { innerHTML:'', querySelector:()=>({}), setAttribute:(key, value)=>{ attributes[key]=value; } };
    const document = {
        documentElement: { classList: {
            contains: key => classes.has(key),
            toggle(key, force) { const on=force ?? !classes.has(key); on?classes.add(key):classes.delete(key); return on; }
        } },
        querySelectorAll:()=>[button], addEventListener:(key, fn)=>{ events[key]=fn; }
    };
    let updates = 0;
    const context = { document, localStorage:{ getItem:key=>storage.get(key), setItem:(key,value)=>storage.set(key,value) },
        addEventListener:(key, fn)=>{ events[key]=fn; }, Chart:{instances:{one:{update(){updates++;}}}}, lucide:{createIcons(){}} };
    context.window=context;
    vm.runInNewContext(read('theme.js'), context);
    return {context, document, attributes, button, storage, events, updates:()=>updates};
}

test('saved theme survives reload, labels describe the next action, and existing charts refresh', () => {
    const f=themeFixture(new Map([['health_intel_theme','dark']]));
    assert.equal(f.document.documentElement.classList.contains('dark'),true);
    f.events.DOMContentLoaded();
    assert.equal(f.attributes['aria-label'],'Switch to light mode');
    f.context.HealthIntelTheme.toggle();
    assert.equal(f.storage.get('health_intel_theme'),'light');
    assert.equal(f.attributes['aria-label'],'Switch to dark mode');
    assert.equal(f.attributes['aria-pressed'],'false');
    assert.equal(f.updates(),1);
    const reloaded=themeFixture(f.storage);
    assert.equal(reloaded.document.documentElement.classList.contains('dark'),false);
    reloaded.events.storage({key:'health_intel_theme',newValue:'dark'});
    assert.equal(reloaded.attributes['aria-label'],'Switch to light mode');
    assert.equal(reloaded.updates(),1);
});

test('blocked browser storage does not prevent theme toggling', () => {
    const f=themeFixture();
    f.context.localStorage.setItem=()=>{throw Error('Storage blocked');};
    assert.doesNotThrow(()=>f.context.HealthIntelTheme.toggle());
    assert.equal(f.document.documentElement.classList.contains('dark'),true);
});

test('chart colors follow the theme after scale replacement without changing data or hidden grids', () => {
    let plugin, dark=false;
    const Chart={register(value){plugin=value;}};
    vm.runInNewContext(read('chart-theme.js'),{window:{Chart},Chart,document:{documentElement:{classList:{contains:()=>dark}}}});
    const values=[0,3,2];
    const options={plugins:{legend:{display:false},title:{display:true}},scales:{x:{grid:{display:false}},y:{ticks:{precision:0}}}};
    const chart={data:{datasets:[{data:values}]},config:{type:'bar',options}};
    Object.defineProperty(chart,'options',{get(){throw Error('Do not traverse the resolved Chart.js options proxy');}});
    plugin.beforeUpdate(chart);
    assert.equal(options.scales.y.ticks.color,'#475569');
    assert.equal(options.scales.x.grid.display,false);
    dark=true;
    options.scales={x:{ticks:{precision:0}}};
    plugin.beforeUpdate(chart);
    assert.equal(options.scales.x.ticks.color,'#cbd5e1');
    assert.equal(options.plugins.legend.labels.color,'#cbd5e1');
    assert.equal(options.plugins.title.color,'#cbd5e1');
    assert.equal(options.plugins.legend.display,false);
    assert.equal(options.scales.x.ticks.precision,0);
    assert.equal(chart.data.datasets[0].data,values);
});

test('custom modal traps focus, closes with Escape, and restores previous background isolation and focus', () => {
    const events={};let document;
    function node(id, tabIndex=0) {
        const classes=new Set();
        return {id,tabIndex,inert:false,disabled:false,isConnected:true,style:{},
            classList:{add:key=>classes.add(key),remove:key=>classes.delete(key)},
            getClientRects:()=>[{}],contains(other){return other===this;},
            focus(){document.activeElement=this;}};
    }
    const trigger=node('profile'), first=node('close'), last=node('history-table'), modal=node('modal',-1), main=node('main'), sidebar=node('sidebar');
    sidebar.inert=true;
    modal.contains=other=>[modal,first,last].includes(other);
    modal.querySelector=()=>null;modal.querySelectorAll=()=>[first,last];
    document={activeElement:trigger,body:{children:[sidebar,main,modal]},querySelector:()=>null,addEventListener:(key,fn)=>{events[key]=fn;}};
    const window={};vm.runInNewContext(read('accessible-modal.js'),{window,document});
    window.HealthIntelModal.open(modal);
    assert.equal(document.activeElement,first);
    assert.equal(main.inert,true);
    assert.equal(sidebar.inert,true);
    first.focus();events.keydown({key:'Tab',shiftKey:true,preventDefault(){}});
    assert.equal(document.activeElement,last);
    events.keydown({key:'Tab',shiftKey:false,preventDefault(){}});
    assert.equal(document.activeElement,first);
    events.keydown({key:'Escape',preventDefault(){}});
    assert.equal(modal.style.display,'none');
    assert.equal(main.inert,false);
    assert.equal(sidebar.inert,true);
    assert.equal(document.activeElement,trigger);
});
