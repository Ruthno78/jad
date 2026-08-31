/* =====================================================================
 * JADSTACK LOTTO V34 — SKWÒL + JÈS (mobil)
 * ---------------------------------------------------------------------
 * • Jwenn epi netwaye kouch `position:fixed; inset:0` ki rete louvri —
 *   se SA ki te prensipalman bloke skwòl la (ou te oblije bale nan pye
 *   ekran an oswa ak plizyè dwèt).
 * • Lock skwòl la fèt SÈLMAN lè yon popup/tiwa reyèlman louvri, epi
 *   pozisyon skwòl la remèt egzakteman kote l te ye.
 * • Jès: bale dwèt ADWAT = ouvri meni · bale AGOCH = fermer meni.
 *   (Yon sèl dwèt, nenpòt kote nan paj la lè meni louvri.)
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const V = (L.v34 = L.v34 || {});
  let locks = 0, savedY = 0;

  /* ---------- 1. Lock / unlock skwòl ---------- */
  V.lockScroll = function () {
    if (locks++ > 0) return;
    savedY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = -savedY + 'px';
    document.body.classList.add('jl34-lock');
  };
  V.unlockScroll = function (force) {
    if (force) locks = 0; else locks = Math.max(0, locks - 1);
    if (locks > 0) return;
    document.body.classList.remove('jl34-lock');
    document.body.style.top = '';
    window.scrollTo(0, savedY);
  };

  /* ---------- 2. Kouch aktif? ---------- */
  const OVERLAY_SEL = '.v11-pop, .modal-backdrop, .jl-modal, [data-overlay], .jl-sheet-backdrop.open';
  function visible(el) {
    if (!el || el.hidden) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    if (cs.pointerEvents === 'none') return false;
    // V49.2 — kèk popup ansyen fermer tèt yo lè yo POZISYONE DEYÒ EKRAN AN
    // (left:-9999px, elt.) olye `display:none`. `offsetWidth>0` sèl pa t
    // ka detekte sa: yon eleman konsa te ka "vizib" pou nou pou tout tan,
    // e sa te kenbe skwòl la bloke pou tout tan. Maintenant nou verifye l
    // reyèlman anndan ekran vizib la.
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    if (r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth) return false;
    return true;
  }
  function overlayOpen() {
    return Array.prototype.some.call(document.querySelectorAll(OVERLAY_SEL), visible);
  }
  function drawerOpen() {
    const s = document.getElementById('shell') || document.querySelector('.shell');
    return !!(s && s.classList.contains('drawer-open'));
  }

  /* Sinkronize klas backdrop la (CSS retire pointer-events lè fermer) */
  function syncBackdrop() {
    document.querySelectorAll('.sidebar-backdrop').forEach((b) =>
      b.classList.toggle('is-open', drawerOpen()));
  }

  let wanted = false;
  function sync() {
    syncBackdrop();
    const need = overlayOpen() || (drawerOpen() && window.innerWidth < 960);
    if (need === wanted) return;
    wanted = need;
    if (need) V.lockScroll(); else V.unlockScroll(true);
  }
  V.syncScroll = sync;

  /* ---------- 3. Sekirite: pa janm kite paj la bloke ---------- */
  V.releaseAll = function () { V.unlockScroll(true); wanted = false; };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setTimeout(sync, 30); });
  window.addEventListener('pageshow', () => V.releaseAll());
  window.addEventListener('resize', () => setTimeout(sync, 60));

  /* ---------- 4. Jès dwèt (mobil) ---------- */
  function mountEdge() {
    if (document.querySelector('.jl34-edge')) return;
    const d = document.createElement('div');
    d.className = 'jl34-edge';
    document.body.appendChild(d);
  }

  function shell() { return document.getElementById('shell') || document.querySelector('.shell'); }
  function openDrawer() { const s = shell(); if (s) { s.classList.add('drawer-open'); sync(); } }
  function closeDrawer() { const s = shell(); if (s) { s.classList.remove('drawer-open'); sync(); } }
  V.openDrawer = openDrawer; V.closeDrawer = closeDrawer;

  (function gestures() {
    let sx = 0, sy = 0, t0 = 0, track = false;
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1 || window.innerWidth >= 960) { track = false; return; }
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY; t0 = Date.now();
      // Bale pou ouvri: sot nan bò goch (<=32px) · bale pou fermer: nenpòt kote
      track = drawerOpen() || sx <= 32;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!track) return; track = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = Math.abs(t.clientY - sy);
      const dt = Date.now() - t0;
      if (dy > 55 || dt > 700) return;           // se yon skwòl vètikal, kite l
      if (dx > 50 && !drawerOpen()) openDrawer();
      else if (dx < -50 && drawerOpen()) closeDrawer();
    }, { passive: true });
  })();

  /* Klike sou backdrop = fermer */
  document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('sidebar-backdrop')) closeDrawer();
  });

  /* ---------- 5. Obsèvatè ---------- */
  function boot() {
    mountEdge();
    sync();
    if (window.MutationObserver) {
      let tmr = null;
      new MutationObserver(() => { clearTimeout(tmr); tmr = setTimeout(sync, 80); })
        .observe(document.documentElement, { childList: true, subtree: true, attributes: true,
          attributeFilter: ['class', 'hidden', 'style'] });
    }
    setInterval(sync, 500);   // filè sekirite kont kouch fantom (V49.2: pi rapid, .5s)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ---------- 6. Filè sekirite siplemantè (V49.2) ----------
     Chak fwa moun nan navige sou yon nouvo vi (evènman `lotri:view` ki
     deja egziste nan shell.js), sa vle di li REYÈLMAN ka enteraji ak
     paj la — kidonk okenn blokaj pa ta dwe rete. Nou fòse yon
     verifikasyon imedya olye n tann pwochen tik 500ms lan. */
  document.addEventListener('lotri:view', () => setTimeout(sync, 0));
})();
