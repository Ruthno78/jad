/* =====================================================================
 * JADSTACK LOTTO — mobile-gestures.js
 * ---------------------------------------------------------------------
 * Activer SÈLMAN sou ekran <900px (menm sèy ak mobile-shell.js). Ajouter
 * 3 konpòtman "app natif" ki te manke:
 *   1) Swipe agoch/adwat pou navige ant paj bottom-nav yo (menm lòd).
 *   2) Pull-to-refresh elastik anlè paj la (rele LotriShell.render()).
 *   3) Header (.appbar) ki kache lè w desann, parèt lè w remonte.
 * Pa touche `LotriShell`/RPC/pèmisyon — sèvi ak API piblik yo uniquement
 * (`LotriShell.go`, `LotriShell.render`) ak DOM ki soti nan
 * mobile-shell.js (`.jl-bottom-nav button[data-view]`).
 * ===================================================================== */
(function () {
  const isMobile = () => window.matchMedia('(max-width: 899px)').matches;

  /* ------------------------------------------------------------------
   * 1) SWIPE AGOCH/ADWAT — navige ant vi bottom-nav yo (menm lòd ak
   *    bouton yo). Pa deklanche si moun nan te kòmanse jès la sou yon
   *    eleman ki gen pwòp jès pa li (drawer edge, chan tèks, elt.), ni
   *    si yon modal/overlay louvri (menm garde ak scroll-fix.js).
   * ------------------------------------------------------------------ */
  function navKeys() {
    return Array.from(document.querySelectorAll('.jl-bottom-nav button[data-view]'))
      .map(b => b.dataset.view);
  }
  function overlayOpen() {
    // Menm lojik minimal ak v34/scroll-fix.js — pa double-enpòte l,
    // jis verifye si gen yon modal/tiwa vizib pou pa navige pandan sa.
    const sel = '.v11-pop, .modal-backdrop, .jl-modal, [data-overlay], .jl-sheet-backdrop.open';
    return Array.prototype.some.call(document.querySelectorAll(sel), el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
      return el.offsetWidth > 0 || el.offsetHeight > 0;
    });
  }

  let nsx = 0, nsy = 0, nTracking = false, nStartEl = null;
  const NAV_EDGE_SKIP = 'input,textarea,select,[contenteditable="true"],.jl34-edge,.sidebar,.jl-bottom-nav,.appbar';
  // V65 — Konteyner ki gen pwòp skwòl entèn pa yo (chat, lis kote, tablo).
  // `window.scrollY` uniquement reflete <body>: sou paj sa yo <body> pa janm
  // bouje, kidonk ansyen chèk la te toujou wè "nous en haut" e li te deklanche
  // pull-to-refresh pandan moun nan ap eseye skwole lis mesaj yo.
  const INNER_SCROLL_SEL = '.v11-thread,.v11-list,.side-scroll,.table-wrap,.jl-sheet,[data-scroll]';
  function nearestInnerScrollTop(target) {
    const el = target && target.closest ? target.closest(INNER_SCROLL_SEL) : null;
    return el ? el.scrollTop : 0;
  }

  document.addEventListener('touchstart', (e) => {
    if (!isMobile() || e.touches.length !== 1) { nTracking = false; return; }
    if (overlayOpen() || document.getElementById('shell')?.classList.contains('drawer-open')) { nTracking = false; return; }
    const t = e.touches[0];
    nStartEl = e.target;
    if (nStartEl.closest && nStartEl.closest(NAV_EDGE_SKIP)) { nTracking = false; return; }
    // Pa antre an konfli ak zòn edge-swipe v34/scroll-fix.js (<=32px agoch,
    // ki ouvri tiwa a) — kite l jere jès ki kòmanse la a.
    if (t.clientX <= 32) { nTracking = false; return; }
    nsx = t.clientX; nsy = t.clientY; nTracking = true;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!nTracking) return;
    nTracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - nsx, dy = Math.abs(t.clientY - nsy);
    if (dy > 70 || Math.abs(dx) < 70) return; // twòp vètikal oswa twò kout — pa yon jès navigasyon
    const keys = navKeys();
    if (keys.length < 2) return;
    const cur = new URL(location.href).searchParams.get('view') || keys[0];
    const idx = keys.indexOf(cur);
    if (idx === -1) return;
    // Bale agoch (dx négatif) = pwochen; bale adwat (dx pozitif) = anvan.
    const next = dx < 0 ? keys[idx + 1] : keys[idx - 1];
    if (next) window.LotriShell.go(next);
  }, { passive: true });

  /* ------------------------------------------------------------------
   * 2) PULL-TO-REFRESH ELASTIK — uniquement lè paj la deja tou anlè (scrollY
   *    === 0), pou pa antre an konfli ak skwol nòmal la. Rale bare a
   *    "elastik" (rezistans kwasan), lage pou deklanche LotriShell.render().
   * ------------------------------------------------------------------ */
  const PULL_MAX = 96, PULL_TRIGGER = 68;
  let pStartY = 0, pTracking = false, pDist = 0, pEl = null, pRefreshing = false;

  function ensurePullEl() {
    if (pEl) return pEl;
    pEl = document.createElement('div');
    pEl.className = 'jl-pull-indicator';
    pEl.innerHTML = '<i class="fa-solid fa-arrow-rotate-right"></i>';
    document.body.appendChild(pEl);
    return pEl;
  }

  document.addEventListener('touchstart', (e) => {
    if (!isMobile() || e.touches.length !== 1) { pTracking = false; return; }
    if (pRefreshing || overlayOpen() || document.getElementById('shell')?.classList.contains('drawer-open')) { pTracking = false; return; }
    const t = e.touches[0];
    if (e.target.closest && e.target.closest(NAV_EDGE_SKIP)) { pTracking = false; return; }
    // V65 — verifye konteyner entèn ki anba dwèt la (si genyen) OLYE
    // `window.scrollY` uniquement: sou paj tankou chat la, se `.v11-thread`
    // ki skwole, pa <body>. San chèk sa a, pull-to-refresh te kwè paj la
    // te "toujours en haut" e li te antre an konfli ak skwòl lis mesaj yo.
    if (nearestInnerScrollTop(e.target) > 0) { pTracking = false; return; }
    if ((window.scrollY || document.documentElement.scrollTop || 0) > 0) { pTracking = false; return; }
    pStartY = t.clientY; pTracking = true; pDist = 0;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!pTracking) return;
    const t = e.touches[0];
    const raw = t.clientY - pStartY;
    if (raw <= 0) { pDist = 0; const el = ensurePullEl(); el.style.transform = 'translateY(0px)'; el.classList.remove('show', 'ready'); return; }
    // Rezistans elastik: chak pikselan siplemantè vale mwens pase anvan.
    pDist = Math.min(PULL_MAX, Math.sqrt(raw) * 6);
    const el = ensurePullEl();
    el.classList.add('show');
    el.classList.toggle('ready', pDist >= PULL_TRIGGER);
    el.style.transform = `translateY(${pDist}px) rotate(${pDist * 3}deg)`;
  }, { passive: true });

  document.addEventListener('touchend', async () => {
    if (!pTracking) return;
    pTracking = false;
    const el = ensurePullEl();
    const shouldRefresh = pDist >= PULL_TRIGGER;
    el.style.transform = 'translateY(0px)';
    el.classList.remove('show', 'ready');
    if (!shouldRefresh) { pDist = 0; return; }
    pDist = 0;
    pRefreshing = true;
    el.classList.add('spin');
    try {
      if (window.LotriShell && typeof window.LotriShell.render === 'function') {
        await Promise.resolve(window.LotriShell.render());
      }
    } catch (_) { /* menm si sa echwe, pa bloke jès la pou apre */ }
    setTimeout(() => { el.classList.remove('spin'); pRefreshing = false; }, 300);
  }, { passive: true });

  /* ------------------------------------------------------------------
   * 3) HEADER KI KACHE LÈ W DESANN — parèt imedyatman lè w remonte,
   *    oswa lè w rive tou anlè paj la. Pa kache si yon overlay/tiwa
   *    louvri (ta ka kache yon bouton fermer enpòtan).
   * ------------------------------------------------------------------ */
  let lastY = window.scrollY || 0, hideTimer = null;
  function onScrollHeader() {
    if (!isMobile()) return;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const appbar = document.querySelector('.appbar');
    if (!appbar) return;
    if (overlayOpen() || document.getElementById('shell')?.classList.contains('drawer-open')) {
      appbar.classList.remove('jl-hide'); lastY = y; return;
    }
    const dy = y - lastY;
    if (y <= 4) { appbar.classList.remove('jl-hide'); }
    else if (dy > 8) { appbar.classList.add('jl-hide'); }
    else if (dy < -8) { appbar.classList.remove('jl-hide'); }
    lastY = y;
  }
  window.addEventListener('scroll', () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(onScrollHeader, 30);
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (!isMobile()) document.querySelector('.appbar')?.classList.remove('jl-hide');
  });
})();
