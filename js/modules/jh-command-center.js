/* JH Command Center — Clean Operating Layout V2 */
(() => {
    'use strict';
    const JH_SCREENS = new Set(['jhPortalScreen','jhDocumentScreen','clitChecklistScreen','jhKPIsScreen']);
    const state = { originalShowJHPortal:null, originalSelectJHDept:null, originalShowScreen:null, originalOpenJHDocument:null, originalOpenJHKPIsScreen:null, booted:false };
    const currentDept = () => {
        try { return typeof currentJHDept !== 'undefined' ? currentJHDept : (window.currentJHDept || ''); }
        catch (_) { return window.currentJHDept || ''; }
    };
    function removeOldInjectedShell() {
        const portal=document.getElementById('jhPortalScreen');
        if(!portal) return;
        portal.querySelector('#jhRearchitectureShell')?.remove();
        portal.querySelectorAll('.jh-rearch-internal-bar').forEach(el=>el.remove());
        portal.classList.remove('jh-rearchitected');
    }
    function arrangePortal() {
        const portal=document.getElementById('jhPortalScreen');
        if(!portal) return;
        removeOldInjectedShell();
        const grid=document.getElementById('jhDeptGrid');
        const toolbox=document.getElementById('jhToolbox');
        const team=document.getElementById('jhMainTeamSection');
        if(grid && toolbox){
            const gridParent=grid.parentElement;
            if(gridParent && gridParent.parentElement===portal) gridParent.insertAdjacentElement('afterend',toolbox);
            else grid.insertAdjacentElement('afterend',toolbox);
        }
        if(toolbox && team) toolbox.insertAdjacentElement('afterend',team);
        portal.classList.add('jh-clean-v2');
        const list=Array.isArray(window.departments)?window.departments:(()=>{try{return Array.isArray(departments)?departments:[]}catch(_){return[]}})();
        const heroCount=portal.querySelector('.jh-hero-side>div:first-child b');
        if(heroCount) heroCount.textContent=String(list.length).padStart(2,'0');
        updateDepartmentContext();
    }
    function updateDepartmentContext(){
        const portal=document.getElementById('jhPortalScreen');
        if(!portal) return;
        const dept=currentDept();
        portal.classList.toggle('has-selected-dept',!!dept);
        const title=document.getElementById('selectedJHDeptTitle');
        if(title && dept) title.textContent=dept;
        const cockpit=document.getElementById('jhToolbox');
        if(cockpit) cockpit.setAttribute('aria-label',dept ? `غرفة تشغيل قسم ${dept}` : 'غرفة تشغيل قسم JH');
    }
    function cleanupExecutionListener(){
        if(window.__jhExecutionRef){
            try{window.__jhExecutionRef.off();}catch(_){}
            window.__jhExecutionRef=null;
            window.__jhExecutionRefDept=null;
        }
    }
    function installWrappers(){
        if(state.booted) return;
        state.booted=true;
        state.originalShowJHPortal=window.showJHPortal;
        state.originalSelectJHDept=window.selectJHDept;
        state.originalShowScreen=window.showScreen;
        state.originalOpenJHDocument=window.openJHDocument;
        state.originalOpenJHKPIsScreen=window.openJHKPIsScreen;
        if(typeof state.originalShowJHPortal==='function'){
            window.showJHPortal=function(){
                const result=state.originalShowJHPortal.apply(this,arguments);
                requestAnimationFrame(()=>{arrangePortal();window.renderJHMainTeam?.();});
                return result;
            };
        }
        if(typeof state.originalSelectJHDept==='function'){
            window.selectJHDept=function(dept){
                cleanupExecutionListener();
                const result=state.originalSelectJHDept.apply(this,arguments);
                requestAnimationFrame(updateDepartmentContext);
                return result;
            };
        }
        if(typeof state.originalShowScreen==='function'){
            window.showScreen=function(screenId){
                if(!JH_SCREENS.has(screenId)) cleanupExecutionListener();
                const result=state.originalShowScreen.apply(this,arguments);
                if(screenId==='jhPortalScreen') requestAnimationFrame(arrangePortal);
                return result;
            };
        }
        if(typeof state.originalOpenJHDocument==='function'){
            window.openJHDocument=async function(type){
                if(!currentDept()) return window.showToast?.('⚠️ اختر قسم JH أولاً');
                return state.originalOpenJHDocument.apply(this,arguments);
            };
        }
        if(typeof state.originalOpenJHKPIsScreen==='function'){
            window.openJHKPIsScreen=function(){
                const dept=currentDept();
                if(dept) window.currentKPIDept=dept;
                return state.originalOpenJHKPIsScreen.apply(this,arguments);
            };
        }
    }
    function boot(){ installWrappers(); arrangePortal(); }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
    window.JH_COMMAND_CENTER=Object.freeze({version:'clean-v2',refresh:arrangePortal,cleanup:cleanupExecutionListener});
})();