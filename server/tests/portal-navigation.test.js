const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.resolve(__dirname,'../../assets/js/shared/portal-navigation.js'),'utf8');

function fixture(mobile = true) {
    const documentEvents = {}, breakpointEvents = {};
    let doc;
    function element(id = '') {
        const classes = new Set(), attributes = {}, events = {};
        return {id, hidden:false, disabled:false, inert:false, children:[],
            classList:{contains:key=>classes.has(key),add:key=>classes.add(key),
                toggle(key,on){on?classes.add(key):classes.delete(key);}},
            setAttribute:(key,value)=>attributes[key]=value,removeAttribute:key=>delete attributes[key],
            hasAttribute:key=>key in attributes,getAttribute:key=>attributes[key],
            append(node){this.children.push(node);},prepend(node){this.children.unshift(node);},
            addEventListener:(type,callback)=>events[type]=callback,
            fire:(type,event)=>events[type]?.(event),focus(){doc.activeElement=this;},
            getClientRects:()=>[{}],querySelectorAll(){return this.children;}};
    }
    const sidebar = element('sidebar'), toggle = element(), main = element(), body = element(), nav = element();
    sidebar.classList.add('w-64');sidebar.children.push(nav);
    const tableRegion = element(), table = {parentElement:tableRegion};
    const breakpoint = {matches:mobile,addEventListener:(type,callback)=>breakpointEvents[type]=callback};
    let desktopCalls = 0, dialog = false;
    doc = {readyState:'complete',body,activeElement:toggle,
        querySelector:selector=>selector.includes('#sidebar')?sidebar:selector==='main'?main:
            selector==='[data-portal-menu]'?toggle:selector==='.swal2-container'&&dialog?element():null,
        querySelectorAll:selector=>selector==='table'?[table]:[],createElement:()=>element(),
        addEventListener:(type,callback)=>documentEvents[type]=callback};
    const window = {matchMedia:()=>breakpoint,toggleSidebar:()=>desktopCalls++};
    vm.runInNewContext(script,{window,document:doc});
    const key = (key,shiftKey=false)=>{let prevented=false;documentEvents.keydown({key,shiftKey,preventDefault(){prevented=true;}});return prevented;};
    const resize = matches=>{breakpoint.matches=matches;breakpointEvents.change();};
    return {sidebar,toggle,main,body,nav,doc,window,key,resize,tableRegion,
        desktopCalls:()=>desktopCalls,setDialog:value=>dialog=value,
        close:()=>sidebar.children[0],backdrop:()=>body.children[0]};
}

test('Phone drawer hides inactive navigation and closes on backdrop, selection and Escape',()=>{
    const f=fixture();
    assert.equal(f.sidebar.inert,true);assert.equal(f.main.inert,false);
    assert.equal(f.toggle.getAttribute('aria-expanded'),'false');
    f.window.toggleSidebar();
    assert.equal(f.main.inert,true);assert.equal(f.sidebar.inert,false);
    assert.equal(f.sidebar.getAttribute('aria-modal'),'true');
    assert.equal(f.doc.activeElement,f.close());
    f.backdrop().fire('click');assert.equal(f.doc.activeElement,f.toggle);assert.equal(f.main.inert,false);
    f.window.toggleSidebar();f.sidebar.fire('click',{target:{closest:()=>f.nav}});
    assert.equal(f.toggle.getAttribute('aria-expanded'),'false');
    f.window.toggleSidebar();assert.equal(f.key('Escape'),true);assert.equal(f.sidebar.inert,true);
    assert.equal(f.tableRegion.getAttribute('role'),'region');assert.equal(f.tableRegion.tabIndex,0);
});

test('Drawer traps keyboard focus while allowing an open confirmation dialog to own Escape',()=>{
    const f=fixture();f.window.toggleSidebar();
    assert.equal(f.key('Tab',true),true);assert.equal(f.doc.activeElement,f.nav);
    assert.equal(f.key('Tab'),true);assert.equal(f.doc.activeElement,f.close());
    f.setDialog(true);assert.equal(f.key('Escape'),false);assert.equal(f.main.inert,true);
    f.setDialog(false);f.close().fire('click');assert.equal(f.main.inert,false);
});

test('Resizing releases inert content and desktop toggle continues to call original portal behavior',()=>{
    const f=fixture();f.window.toggleSidebar();f.resize(false);
    assert.equal(f.main.inert,false);assert.equal(f.sidebar.inert,false);assert.equal(f.backdrop().hidden,true);
    assert.equal(f.sidebar.hasAttribute('aria-modal'),false);assert.equal(f.doc.activeElement,f.toggle);
    f.window.toggleSidebar();assert.equal(f.desktopCalls(),1);
    f.resize(true);assert.equal(f.sidebar.inert,true);assert.equal(f.main.inert,false);
    f.window.toggleSidebar();assert.equal(f.desktopCalls(),1);assert.equal(f.main.inert,true);
});
