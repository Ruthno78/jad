/* =====================================================================
 * JADSTACK LOTTO V51 — FAZ 2 : NAVIGASYON MOBIL TANKOU APK NATIF
 * ---------------------------------------------------------------------
 * Objektif: yon nouvo itilizatè dwe konprann li ka RALE meni an, san
 * okenn eksplikasyon.
 *
 * Sa fichye sa a ajoute (frontend uniquement, zewo backend):
 *   1) Yon ti HANDLE vizyèl sou bò goch ekran an (grabber) — endikasyon
 *      klè ke gen yon tiwa la.
 *   2) Menu ki SWIV DWÈT la an tan reyèl (drag 1:1) pandan w ap rale.
 *   3) Animasyon RUBBER-BAND lè w rale pi lwen pase limit la.
 *   4) FÈMTI ak swipe invès (soti nan tiwa a oswa nan backdrop la).
 *   5) Desizyon ouvè/fèmen ak distans + velosite (flick).
 *
 * Li respekte FAZ 1: nou pa janm bloke skwòl vètikal — `preventDefault()`
 * rive SÈLMAN lè jès la konfime kòm orizontal (ak passive:false eksplisit,
 * sa ki pèmèt li pase gad V50 la).
 * ===================================================================== */
(function () {
  'use strict';

  var MOBILE = '(max-width: 959px)';
  var EDGE = 28;          // zòn depa sou bò goch (px)
  var SLOP = 10;          // konbyen px anvan nou deside jès la orizontal
  var RUBBER = 0.22;      // rezistans rubber-band
  var FLICK = 0.35;       // px/ms — vitès ki sifi pou deside san distans

  function isMobile() { return window.matchMedia(MOBILE).matches; }
  function shell() { return document.getElementById('shell') || document.querySelector('.shell'); }
  function sidebar() { return document.querySelector('.sidebar'); }
  function backdrop() { return document.querySelector('.sidebar-backdrop'); }
  function isOpen() { var s = shell(); return !!(s && s.classList.contains('drawer-open')); }
  function width() { var el = sidebar(); return el ? el.getBoundingClientRect().width || 280 : 280; }

  function overlayOpen() {
    var sel = '.v11-pop, .modal-backdrop, .jl-modal, .jl-sheet-backdrop.open, [data-overlay]';
    return Array.prototype.some.call(document.querySelectorAll(sel), function (el) {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
      return el.offsetWidth > 2 && el.offsetHeight > 2;
    });
  }

  function open() {
    var s = shell(); if (!s) return;
    s.classList.add('drawer-open');
    if (window.Lotri && window.Lotri.v34 && window.Lotri.v34.syncScroll) window.Lotri.v34.syncScroll();
    buzz(8);
  }
  function close() {
    var s = shell(); if (!s) return;
    s.classList.remove('drawer-open');
    if (window.Lotri && window.Lotri.v34 && window.Lotri.v34.syncScroll) window.Lotri.v34.syncScroll();
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {} }

  /* ---------- 1) HANDLE VIZYÈL ---------- */
  function mountHandle() {
    if (document.querySelector('.jl51-handle')) return;
    var h = document.createElement('div');
    h.className = 'jl51-handle';
    h.setAttribute('aria-hidden', 'true');
    h.innerHTML = '<span></span>';
    document.body.appendChild(h);
    // Yon sèl tap sou handle la ouvè tiwa a tou (aksesiblite dwèt).
    h.addEventListener('click', function () { if (!isOpen()) open(); });
  }

  /* ---------- 2/3/4) DRAG KI SWIV DWÈT LA ---------- */
  var startX = 0, startY = 0, startT = 0, lastX = 0, lastT = 0;
  var mode = null;         // null | 'pending' | 'drag' | 'off'
  var fromOpen = false;

  function setDrag(on) {
    var s = shell(); if (s) s.classList.toggle('jl51-dragging', !!on);
  }

  function paint(x) {
    var W = width();
    var sb = sidebar(), bd = backdrop();
    var progress = Math.max(0, Math.min(1, x / W));
    if (sb) sb.style.transform = 'translateX(' + (x - W) + 'px)';
    if (bd) {
      bd.style.display = 'block';
      bd.style.opacity = String(progress);
      bd.style.pointerEvents = progress > 0.05 ? 'auto' : 'none';
    }
  }

  function clearPaint() {
    var sb = sidebar(), bd = backdrop();
    if (sb) sb.style.removeProperty('transform');
    if (bd) {
      bd.style.removeProperty('display');
      bd.style.removeProperty('opacity');
      bd.style.removeProperty('pointer-events');
    }
  }

  document.addEventListener('touchstart', function (e) {
    mode = null;
    if (!isMobile() || e.touches.length !== 1 || overlayOpen()) { mode = 'off'; return; }
    var t = e.touches[0];
    var tgt = e.target;
    // Pa kònfli ak chan tèks / eleman ki gen pwòp jès orizontal pa yo.
    if (tgt.closest && tgt.closest('input,textarea,select,[contenteditable="true"],.side-link,.jl-scroll-x,table')) {
      mode = 'off'; return;
    }
    fromOpen = isOpen();
    if (!fromOpen && t.clientX > EDGE) { mode = 'off'; return; }
    startX = lastX = t.clientX; startY = t.clientY; startT = lastT = Date.now();
    mode = 'pending';
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', function (e) {
    if (mode === 'off' || mode === null || e.touches.length !== 1) return;
    var t = e.touches[0];
    var dx = t.clientX - startX, dy = t.clientY - startY;

    if (mode === 'pending') {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SLOP) { mode = 'off'; return; }  // se skwòl vètikal
      if (Math.abs(dx) < SLOP) return;
      if (!fromOpen && dx < 0) { mode = 'off'; return; }
      mode = 'drag';
      setDrag(true);
    }

    if (mode !== 'drag') return;
    var W = width();
    var raw = fromOpen ? W + dx : dx;
    var x;
    if (raw > W) x = W + (raw - W) * RUBBER;        // rubber-band lè w depase ouvèti a
    else if (raw < 0) x = raw * RUBBER;             // rubber-band lè w depase fèmti a
    else x = raw;
    paint(x);
    lastX = t.clientX; lastT = Date.now();
    e.preventDefault();                             // uniquement lè jès la konfime orizontal
  }, { passive: false, capture: true });

  function finish() {
    if (mode !== 'drag') { mode = null; return; }
    mode = null;
    var W = width();
    var dx = lastX - startX;
    var dt = Math.max(1, lastT - startT);
    var v = dx / dt;                                // px/ms (siyen)
    var raw = fromOpen ? W + dx : dx;
    var shouldOpen;
    if (Math.abs(v) >= FLICK) shouldOpen = v > 0;    // flick rapid deside
    else shouldOpen = raw > W * 0.4;

    setDrag(false);
    clearPaint();                                   // CSS transition pran relè a
    if (shouldOpen) open(); else close();
  }

  document.addEventListener('touchend', finish, { passive: true, capture: true });
  document.addEventListener('touchcancel', function () {
    if (mode === 'drag') { setDrag(false); clearPaint(); if (fromOpen) open(); else close(); }
    mode = null;
  }, { passive: true, capture: true });

  /* Tap sou backdrop = fermer (redondan men garanti) */
  document.addEventListener('click', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('sidebar-backdrop')) close();
  });

  /* Lè ekran an vin laj, pa kite ankenn style inline */
  window.addEventListener('resize', function () { if (!isMobile()) { clearPaint(); setDrag(false); } });

  function boot() { mountHandle(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('lotri:view', function () { setTimeout(mountHandle, 30); });

  window.JL51 = { open: open, close: close };
})();
