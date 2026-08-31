/* JADSTACK LOTTO V72 — Réglages UI fonctionnels, sans modification du backend */
(function(){
  const L = window.Lotri = window.Lotri || {};
  const KEY = 'jadstack-ui-settings-v72';
  const COLORS = {
    blue:'#3f63c8', purple:'#6b43c7', cyan:'#2fa7c9', navy:'#173f63', orange:'#f39a24', red:'#ef3f3f'
  };
  function read(){ try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return {}} }
  function write(v){ try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_){} }
  function apply(s){
    const root=document.documentElement;
    const mode=s.mode==='dark'?'dark':'light';
    root.dataset.v72Theme=mode;
    root.dataset.theme=mode;
    try{localStorage.setItem('theme',mode)}catch(_){}
    document.body.classList.toggle('v72-dark',mode==='dark');
    const color=COLORS[s.color]||COLORS.blue;
    root.style.setProperty('--v72-accent',color);
    root.style.setProperty('--v72-accent-soft',color+'22');
    root.style.setProperty('--primary',color);
    root.style.setProperty('--primary-soft',color+'22');
    document.querySelectorAll('.v72-color').forEach(b=>b.classList.toggle('selected',b.dataset.color===s.color));
    document.querySelectorAll('[data-v72-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.v72Mode===mode));
  }
  function state(){ const s=read(); if(!s.mode)s.mode='light'; if(!s.color)s.color='blue'; return s; }
  function toast(msg,type){ if(L.toast) L.toast(msg,type||'success'); }
  function isDashboard(){ return (new URL(location.href)).searchParams.get('view')==='dashboard'; }
  function sidebarCompact(compact){
    const shell=document.getElementById('shell');
    if(!shell)return;
    shell.classList.toggle('v72-sidebar-compact',compact);
    const s=state(); s.compact=!!compact; write(s);
  }
  function toggleFullscreen(){
    const d=document;
    if(!d.fullscreenElement && !d.webkitFullscreenElement){
      const el=document.documentElement;
      const fn=el.requestFullscreen||el.webkitRequestFullscreen;
      if(fn){ Promise.resolve(fn.call(el)).catch(()=>toast('Le plein écran est limité par ce navigateur.','error')); }
      else toast('Le plein écran n’est pas disponible ici.','error');
    }else{
      const fn=d.exitFullscreen||d.webkitExitFullscreen;
      if(fn) Promise.resolve(fn.call(d)).catch(()=>{});
    }
  }
  function open(){
    let modal=document.getElementById('v72-settings-modal');
    if(!modal){
      modal=document.createElement('div'); modal.id='v72-settings-modal'; modal.className='v72-settings-modal';
      modal.innerHTML=`<div class="v72-settings-backdrop" data-v72-close></div><section class="v72-settings-panel" role="dialog" aria-modal="true" aria-labelledby="v72-settings-title">
        <header><h2 id="v72-settings-title">Réglages</h2><button type="button" class="v72-settings-close" data-v72-close aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button></header>
        <div class="v72-settings-body">
          <h3>Mode</h3><div class="v72-mode-grid">
            <button type="button" class="v72-mode" data-v72-mode="light"><i class="fa-solid fa-sun"></i><span>Mode clair</span></button>
            <button type="button" class="v72-mode" data-v72-mode="dark"><i class="fa-solid fa-moon"></i><span>Mode sombre</span></button>
          </div>
          <h3>Couleur</h3><div class="v72-color-grid">
            <button class="v72-color blue" data-color="blue" aria-label="Bleu"></button><button class="v72-color purple" data-color="purple" aria-label="Violet"></button><button class="v72-color cyan" data-color="cyan" aria-label="Cyan"></button><button class="v72-color navy" data-color="navy" aria-label="Bleu foncé"></button><button class="v72-color orange" data-color="orange" aria-label="Orange"></button><button class="v72-color red" data-color="red" aria-label="Rouge"></button>
          </div>
          <h3>Déployer</h3><div class="v72-deploy"><button type="button" id="v72-expand" aria-label="Déployer"><i class="fa-solid fa-chevron-right"></i></button><button type="button" id="v72-compact" aria-label="Compacter"><i class="fa-solid fa-chevron-left"></i></button></div>
          <button type="button" class="v72-fullscreen" id="v72-fullscreen"><i class="fa-solid fa-expand"></i><span>Plein Écran</span></button>
        </div>
      </section>`;
      document.body.appendChild(modal);
      modal.addEventListener('click',e=>{ if(e.target.closest('[data-v72-close]')) close(); });
      modal.querySelectorAll('[data-v72-mode]').forEach(b=>b.addEventListener('click',()=>{const s=state();s.mode=b.dataset.v72Mode;write(s);apply(s);}));
      modal.querySelectorAll('.v72-color').forEach(b=>b.addEventListener('click',()=>{const s=state();s.color=b.dataset.color;write(s);apply(s);}));
      modal.querySelector('#v72-expand').addEventListener('click',()=>sidebarCompact(false));
      modal.querySelector('#v72-compact').addEventListener('click',()=>sidebarCompact(true));
      modal.querySelector('#v72-fullscreen').addEventListener('click',toggleFullscreen);
    }
    modal.classList.add('open'); document.body.classList.add('v72-modal-open'); apply(state());
    try{ if(!history.state || history.state.v72Settings!==true) history.pushState({...(history.state||{}),v72Settings:true},'',location.href); }catch(_){}
  }
  function close(){ const m=document.getElementById('v72-settings-modal'); if(m)m.classList.remove('open'); document.body.classList.remove('v72-modal-open'); }
  function addButton(){
    document.querySelectorAll('.v72-settings-fab').forEach(x=>x.remove());
    if(!isDashboard())return;
    const b=document.createElement('button'); b.type='button'; b.className='v72-settings-fab'; b.setAttribute('aria-label','Réglages'); b.innerHTML='<i class="fa-solid fa-sliders"></i>'; b.addEventListener('click',open); document.body.appendChild(b);
  }
  function init(){ const s=state(); apply(s); if(s.compact) sidebarCompact(true); addButton(); }
  document.addEventListener('lotri:view',()=>{ setTimeout(addButton,0); });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  L.openSettings=open; L.closeSettings=close;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
