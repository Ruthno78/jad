/* JADSTACK LOTTO V73 — comportements mobile proches d'une application native */
(function(){
  const doc = document, root = doc.documentElement;
  const isMobile = () => matchMedia('(max-width: 959px)').matches;
  const isAndroidWebView = /\bwv\b/.test(navigator.userAgent) || /Version\/4\.0.*Chrome/.test(navigator.userAgent);
  const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function markNative(){
    if(!isMobile()) return;
    doc.body.dataset.jlNative = 'true';
    if(isAndroidWebView) doc.body.classList.add('jl-android-apk');
    if(isStandalone) doc.body.classList.add('jl-standalone');
  }

  function offlineUI(){
    let el = doc.querySelector('.jl-native-offline');
    if(!el){ el = doc.createElement('div'); el.className='jl-native-offline'; el.setAttribute('role','status'); doc.body.appendChild(el); }
    function sync(){
      const offline = !navigator.onLine;
      el.textContent = offline ? 'Connexion Internet indisponible' : 'Connexion rétablie';
      el.classList.toggle('show', offline);
      if(!offline){ el.classList.add('show'); setTimeout(()=>el.classList.remove('show'), 2200); }
    }
    addEventListener('offline', sync);
    addEventListener('online', sync);
  }

  /* Sur mobile, fermer un modal avec le geste Retour du navigateur/APK quand possible. */
  addEventListener('popstate', ()=>{
    const modal = doc.getElementById('v72-settings-modal');
    if(modal && modal.classList.contains('open') && window.Lotri && Lotri.closeSettings) Lotri.closeSettings();
  });

  /* Après ouverture du clavier, garder le champ actif visible dans la WebView APK. */
  doc.addEventListener('focusin', e=>{
    if(!isMobile()) return;
    const t=e.target;
    if(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)){
      setTimeout(()=>t.scrollIntoView({block:'center', inline:'nearest', behavior:'smooth'}), 180);
    }
  }, true);

  /* Donne un feedback tactile visuel aux vrais boutons sans modifier leur logique métier. */
  doc.addEventListener('pointerdown', e=>{
    if(!isMobile()) return;
    const el=e.target.closest('button,.btn,[role="button"]');
    if(!el) return;
    el.classList.add('jl-native-pressed');
    setTimeout(()=>el.classList.remove('jl-native-pressed'), 130);
  }, {passive:true});

  function start(){ markNative(); offlineUI(); }
  if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
