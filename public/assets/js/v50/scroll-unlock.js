/* =====================================================================
 * JADSTACK LOTTO V50 — FAZ 1 : SKWÒL LIB TOUPATOU
 * ---------------------------------------------------------------------
 * Objektif: itilizatè a dwe ka kòmanse jès skwòl li NENPÒT KOTE (mitan
 * ekran, sou yon kat, sou tèks, sou yon lis) — pa uniquement sou header oswa
 * bottom-nav.
 *
 * Kòz ki rete apre V49:
 *  1. `body.jl34-lock` ka rete aktive san okenn modal vizib (lock
 *     konte nan scroll-fix.js ka dezekilibre si yon modal detwi nan DOM
 *     san `unlockScroll`). Lè lock la rete, `position:fixed` +
 *     `touch-action:none` sou <body> touye tout skwòl nan zòn kontni an,
 *     pandan header/bottom-nav (ki fikse, deyò flux la) rete "skwolab".
 *  2. Popup ki "fermer" ak `left:-9999px` / `opacity:0` / `visibility` men
 *     ki rete nan DOM: yo konte kòm louvri pou kèk detektè.
 *  3. Listener `touchmove` ki rele `preventDefault()` san kondisyon.
 *
 * Solisyon isit la (frontend uniquement, zewo backend):
 *  A. Watchdog: si `jl34-lock` rete > 3s san okenn overlay reyèlman
 *     vizib → lage lock la otomatikman.
 *  B. Nòmalizasyon overlay fermer: tout popup ki pozisyone deyò ekran an
 *     (-9999px, elt.) resevwa `display:none` + `pointer-events:none`.
 *  C. Pwoteksyon touchmove: nenpòt `preventDefault()` san kondisyon sou
 *     `document`/`body`/`window` vin pasif (li pa ka anile skwòl la),
 *     eksepte lè yon overlay reyèlman louvri.
 *  D. Netwayaj kontni: okenn konteyner prensipal pa kenbe yon
 *     `overflow` ki bloke skwòl paj la.
 * ===================================================================== */
(function () {
  'use strict';

  var LOCK = 'jl34-lock';
  var OVERLAY_SEL = '.v11-pop, .modal-backdrop, .jl-modal, .jl-sheet-backdrop.open, [data-overlay], .sidebar-backdrop.is-open';
  var GRACE_MS = 3000;   // Faz 1 — lage lock la apre 3 segonn san modal
  var lockSince = 0;

  /* ---------- 1. Èske yon overlay REYÈLMAN vizib? ---------- */
  function reallyVisible(el) {
    if (!el || el.hidden) return false;
    var cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    if (cs.pointerEvents === 'none') return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    // Pozisyone deyò ekran an (left:-9999px, translate, elt.) = fermer
    if (r.bottom <= 0 || r.top >= window.innerHeight) return false;
    if (r.right <= 0 || r.left >= window.innerWidth) return false;
    return true;
  }

  function overlayList() {
    var out = [];
    var nodes = document.querySelectorAll(OVERLAY_SEL);
    for (var i = 0; i < nodes.length; i++) if (reallyVisible(nodes[i])) out.push(nodes[i]);
    return out;
  }

  function drawerOpen() {
    var s = document.getElementById('shell') || document.querySelector('.shell');
    return !!(s && s.classList.contains('drawer-open'));
  }

  function needLock() {
    return overlayList().length > 0 || (drawerOpen() && window.innerWidth < 960);
  }

  /* ---------- 2. Nòmalize popup fermer (pa gen pozisyon negatif) ---------- */
  function normalizeClosed() {
    var nodes = document.querySelectorAll('.v11-pop, .modal-backdrop, .jl-modal, .jl-sheet-backdrop');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none') continue;
      var r = el.getBoundingClientRect();
      var offscreen = r.right <= 0 || r.left >= window.innerWidth ||
                      r.bottom <= 0 || r.top >= window.innerHeight;
      var invisible = cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0 || el.hidden;
      if (offscreen || invisible) {
        el.setAttribute('data-jl50-closed', '1');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        el.style.removeProperty('left');
      } else if (el.getAttribute('data-jl50-closed')) {
        // li reouvri: n ap retire nòmalizasyon nou an
        el.removeAttribute('data-jl50-closed');
        el.style.removeProperty('display');
        el.style.removeProperty('pointer-events');
      }
    }
  }

  /* ---------- 3. Lage lock la ---------- */
  function releaseLock(reason) {
    var b = document.body;
    var y = Math.abs(parseInt(b.style.top || '0', 10)) || 0;
    try {
      if (window.Lotri && window.Lotri.v34 && window.Lotri.v34.releaseAll) {
        window.Lotri.v34.releaseAll();
      }
    } catch (_) {}
    b.classList.remove(LOCK);
    b.style.removeProperty('top');
    b.style.removeProperty('position');
    b.style.removeProperty('overflow');
    b.style.removeProperty('touch-action');
    document.documentElement.style.removeProperty('overflow');
    if (y) window.scrollTo(0, y);
    lockSince = 0;
    if (window.console && window.JL50_DEBUG) console.log('[V50] lock lage —', reason);
  }

  /* ---------- 4. Watchdog ---------- */
  function tick() {
    normalizeClosed();
    var locked = document.body.classList.contains(LOCK);
    if (!locked) { lockSince = 0; return; }
    if (needLock()) { lockSince = 0; return; }      // lock lejitim
    if (!lockSince) { lockSince = Date.now(); return; }
    if (Date.now() - lockSince >= GRACE_MS) releaseLock('watchdog 3s san modal');
  }
  setInterval(tick, 500);

  /* Lage imedya nan moman ki pa dwe janm bloke */
  ['pageshow', 'popstate', 'focus'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (!needLock()) releaseLock(ev); });
  });
  document.addEventListener('lotri:view', function () {
    setTimeout(function () { if (!needLock()) releaseLock('chanjman vi'); }, 0);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setTimeout(function () { if (!needLock()) releaseLock('escape'); }, 60);
  });

  /* Si moun nan touche ekran an epi paj la bloke san rezon: lage TOUSWIT */
  document.addEventListener('touchstart', function () {
    if (document.body.classList.contains(LOCK) && !needLock()) releaseLock('touch san modal');
  }, { passive: true, capture: true });

  /* ---------- 5. Pwoteksyon touchmove ---------- *
   * Nenpòt listener `touchmove`/`wheel` sou document/body/window ki pa
   * deklare tèt li kòm non-pasif eksprè vin PASIF: konsa li pa ka rele
   * `preventDefault()` epi touye skwòl la. Lè yon overlay reyèlman
   * louvri, kòd modal la kontinye travay nòmalman paske listener sa yo
   * viv sou eleman modal la, pa sou document.                          */
  (function hardenTouchMove() {
    var proto = EventTarget.prototype;
    var orig = proto.addEventListener;
    if (!orig || orig.__jl50) return;
    function patched(type, fn, opts) {
      if ((type === 'touchmove' || type === 'wheel') &&
          (this === document || this === window || this === document.body ||
           this === document.documentElement)) {
        var explicitActive = opts && typeof opts === 'object' && opts.passive === false;
        if (!explicitActive) {
          var o = (typeof opts === 'object' && opts) ? opts : { capture: !!opts };
          opts = { capture: !!o.capture, once: !!o.once, passive: true };
        }
      }
      return orig.call(this, type, fn, opts);
    }
    patched.__jl50 = true;
    proto.addEventListener = patched;
  })();

  /* ---------- 6. Contenu prensipal pa dwe janm kapte skwòl la ---------- */
  function unblockContainers() {
    var sel = '#view, .view, .app-main, .main, .content, .page, main';
    var nodes = document.querySelectorAll(sel);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var cs = window.getComputedStyle(el);
      if (cs.overflowY === 'hidden' || cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
        // Sèl konteyner ki gen yon wotè fiks ta jistifye pwòp skwòl pa l.
        if (cs.maxHeight === 'none' && cs.height !== 'auto') continue;
        el.style.setProperty('overflow-y', 'visible', 'important');
      }
      if (cs.touchAction === 'none') el.style.setProperty('touch-action', 'pan-y', 'important');
    }
  }
  function boot() { normalizeClosed(); unblockContainers(); tick(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('lotri:view', function () { setTimeout(unblockContainers, 30); });

  /* Zouti manyèl pou tès: window.JL50.unlock() */
  window.JL50 = { unlock: function () { releaseLock('manyèl'); }, overlays: overlayList, needLock: needLock };
})();
