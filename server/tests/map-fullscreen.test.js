const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(id){
    const listeners={},windowListeners={},document={activeElement:null,addEventListener:(key,fn)=>listeners[key]=fn};
    function element(tag='div'){
        const attrs=new Map(),classes=new Set();
        const e={tagName:tag,children:[],parentNode:null,inert:false,hidden:false,disabled:false,tabIndex:tag==='button'?0:-1,textContent:'',className:'',style:{},getBoundingClientRect:()=>({height:500}),
            classList:{add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),contains:n=>classes.has(n)},
            getAttribute:name=>attrs.has(name)?attrs.get(name):null,setAttribute:(name,value)=>attrs.set(name,String(value)),removeAttribute:name=>attrs.delete(name),
            append(...nodes){for(const node of nodes){node.remove();node.parentNode=e;e.children.push(node);}},
            insertBefore(node,before){node.remove();node.parentNode=e;e.children.splice(e.children.indexOf(before),0,node);},
            before(node){e.parentNode.insertBefore(node,e);},remove(){if(e.parentNode){const parent=e.parentNode;parent.children.splice(parent.children.indexOf(e),1);e.parentNode=null;}},
            contains(node){return node===e||e.children.some(child=>child.contains(node));},focus(){document.activeElement=e;},getClientRects(){return e.hidden?[]:[{}];},
            addEventListener:(name,fn)=>e[name]=fn,querySelectorAll(){return e.children.flatMap(child=>[child,...child.querySelectorAll()]);}};
        return e;
    }
    document.body=element('body');document.createElement=element;document.createComment=()=>element('#comment');
    const main=element(),other=element(),container=element(),next=element();container.id=id;container.setAttribute('role','region');container.setAttribute('aria-label','Original map');document.body.append(main,other);main.append(container,next);other.inert=true;
    const context={document,Event,window:{addEventListener:(name,fn)=>windowListeners[name]=fn,dispatchEvent:event=>windowListeners[event.type]?.(event)},requestAnimationFrame:fn=>fn()};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../assets/js/shared/map-fullscreen.js'),'utf8'),context);
    let layouts=0;const control=context.window.HealthIntelMapFullscreen.bind(container,()=>layouts++);
    return {document,main,other,container,next,control,listeners,windowListeners,layouts:()=>layouts,element,key(key,shiftKey=false){let prevented=false;listeners.keydown({key,shiftKey,preventDefault(){prevented=true;},stopPropagation(){}});return prevented;}};
}
for(const id of ['bhwMap','murciaMap'])test(id+' expands the existing map, makes the background inert and restores DOM, accessibility and focus on exit',()=>{
    const f=fixture(id),button=f.control.button,originalControl=f.control.controls;
    assert.equal(button.textContent,'Fullscreen');assert.equal(button.getAttribute('aria-controls'),id);
    button.click();assert.equal(f.container.parentNode,f.document.body);assert.equal(f.main.children[0].style.height,'500px');assert.equal(f.container.classList.contains('heatmap-expanded'),true);assert.equal(f.container.getAttribute('aria-modal'),'true');assert.equal(f.main.inert,true);assert.equal(f.document.activeElement,button);assert.equal(button.getAttribute('aria-expanded'),'true');assert.equal(f.control.controls,originalControl);
    assert.equal(f.key('Escape'),true);assert.equal(f.container.parentNode,f.main);assert.deepEqual(f.main.children,[f.container,f.next]);assert.equal(f.main.inert,false);assert.equal(f.other.inert,true);assert.equal(f.container.getAttribute('role'),'region');assert.equal(f.container.getAttribute('aria-label'),'Original map');assert.equal(f.container.getAttribute('aria-modal'),null);assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(f.document.activeElement,button);assert.equal(f.layouts(),2);
});
test('fullscreen focus wraps inside map controls and repeated toggles do not leave anchors or inert background behind',()=>{
    const f=fixture('bhwMap'),extra=f.element('button');f.container.append(extra);f.control.button.click();
    extra.focus();assert.equal(f.key('Tab'),true);assert.equal(f.document.activeElement,f.control.button);
    f.control.button.focus();assert.equal(f.key('Tab',true),true);assert.equal(f.document.activeElement,extra);
    f.control.button.click();f.control.button.click();f.control.button.click();assert.equal(f.main.children.length,2);assert.equal(f.main.inert,false);assert.equal(f.container.classList.contains('heatmap-expanded'),false);
});
test('leaving the page restores the map without losing a pre-existing body class',()=>{
    const f=fixture('murciaMap');f.document.body.classList.add('heatmap-is-expanded');f.control.button.click();f.windowListeners.pagehide();assert.equal(f.container.parentNode,f.main);assert.equal(f.document.body.classList.contains('heatmap-is-expanded'),true);assert.equal(f.main.inert,false);
});
