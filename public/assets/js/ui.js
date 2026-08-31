/* Zouti UI komen: anti-doub-voye, spinner sou bouton, badj notifikasyon,
   scroll+flash sou seksyon, konfimasyon. */
(function(){
  window.Lotri = window.Lotri || {};
  const U = window.Lotri.ui = {};

  /* busy(btn, fn) — dezaktive bouton an, desann opasite, mete spinner,
     e anpeche 2yèm apèl pandan premye a ap kouri (anti-doub-klik). */
  U.busy = async function(btn, fn){
    if (!btn) return fn();
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.style.opacity = '.6';
    try { return await fn(); }
    finally {
      btn.dataset.busy = '';
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.style.opacity = '';
    }
  };

  /* once(key) — garanti yon aksyon fèt YON SÈL fwa (fallback anti-doub-voye) */
  const fired = new Set();
  U.once = function(key){ if (fired.has(key)) return false; fired.add(key); return true; };
  U.clearOnce = function(key){ fired.delete(key); };

  /* Badj notifikasyon: bat 3 min -> poz 2 min -> replay uniquement si gen nouvo.
     Si pa gen nouvo, li rete bloke (san bat) jiskaske gen nouvo.
     Hover sou host la retire pwen an. */
  U.notif = function(host, opts){
    if (!host) return { update(){} };
    const dot = document.createElement('span');
    dot.className = 'notif-dot';
    dot.style.display = 'none';
    host.setAttribute('data-notif-host','');
    host.appendChild(dot);
    let timer = null, cycle = null, seen = 0;
    function beat(){
      dot.classList.add('beating');
      clearTimeout(cycle);
      cycle = setTimeout(()=>{                     // 3 min bat
        dot.classList.remove('beating');
        cycle = setTimeout(()=>{                   // 2 min poz
          if (dot.dataset.fresh === '1') beat();   // replay uniquement si gen nouvo
        }, 2*60*1000);
      }, 3*60*1000);
    }
    host.addEventListener('mouseenter', ()=>{ dot.style.display='none'; dot.dataset.fresh='0'; dot.classList.remove('beating'); clearTimeout(cycle); });
    return {
      update(count){
        if (count > seen){ seen = count; dot.dataset.fresh='1'; dot.style.display='block'; beat(); }
        else if (count === 0){ dot.style.display='none'; dot.dataset.fresh='0'; }
      },
      stop(){ clearTimeout(timer); clearTimeout(cycle); }
    };
  };

  /* Scroll otomatik sou yon seksyon + ti kolorasyon pal ak animasyon */
  U.focusSection = function(id){
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior:'smooth', block:'start' });
    el.classList.remove('section-flash');
    void el.offsetWidth;
    el.classList.add('section-flash');
    setTimeout(()=> el.classList.remove('section-flash'), 1800);
    return true;
  };

  /* confirm/prompt: pase pa modal.js la (fon flou, klavye, bèl sou mobil).
     Yo retounen yon Promise — tout apèl yo dwe `await`. */
  U.confirm = function(msg, detail, opts){
    if (window.Lotri.modal) return window.Lotri.modal.confirm(msg, detail, opts);
    return Promise.resolve(window.confirm(detail ? (msg + '\n\n' + detail) : msg));
  };
  U.prompt = function(o){
    if (window.Lotri.modal) return window.Lotri.modal.prompt(o);
    return Promise.resolve(window.prompt((o && o.title) || '', (o && o.value) || ''));
  };


  /* Session timeout otomatik apre inaktivite */
  U.armSessionTimeout = function(minutes){
    const ms = (minutes || 30) * 60 * 1000;
    let t;
    const reset = ()=>{ clearTimeout(t); t = setTimeout(()=>{
      window.Lotri.toast && window.Lotri.toast('La session a expiré pour cause d’inactivité.','error');
      window.Lotri.signOut();
    }, ms); };
    ['click','keydown','mousemove','touchstart'].forEach(e=> document.addEventListener(e, reset, { passive:true }));
    reset();
  };
})();
