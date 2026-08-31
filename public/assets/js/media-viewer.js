/* =====================================================================
 * JADSTACK LOTTO V86 — VIZYALIZÈ MEDYA (style WhatsApp)
 * ---------------------------------------------------------------------
 * Fichye jenerik, itilizab nan tout aplikasyon an (pa sèlman nan Mesaj).
 * Louvri yon foto/videyo an plenn ekran, ak zoom (pinch + molèt + double
 * tap) pou foto, lekti pou videyo, epi navige ant plizyè eleman (swipe
 * oswa flèch) si ou pase yon lis.
 *
 * API piblik:
 *   Lotri.openMediaViewer(items, startIndex)
 *     items: [{ url, type:'image'|'video', caption? }]
 *     startIndex: nimewo eleman pou kòmanse (default 0)
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  if (window.Lotri.openMediaViewer) return; // deja chaje

  let root = null, items = [], idx = 0;
  let scale = 1, tx = 0, ty = 0;
  let pinchStart = null, dragStart = null, lastTap = 0;

  function ensureRoot() {
    if (root) return root;
    root = document.createElement('div');
    root.className = 'jlmv-root';
    root.innerHTML = `
      <div class="jlmv-backdrop"></div>
      <div class="jlmv-top">
        <button type="button" class="jlmv-close" aria-label="Fèmen"><i class="fa-solid fa-xmark"></i></button>
        <span class="jlmv-count"></span>
        <a class="jlmv-download" target="_blank" rel="noopener noreferrer" aria-label="Telechaje"><i class="fa-solid fa-download"></i></a>
      </div>
      <div class="jlmv-stage"><div class="jlmv-frame"></div></div>
      <button type="button" class="jlmv-nav jlmv-prev" aria-label="Anvan"><i class="fa-solid fa-chevron-left"></i></button>
      <button type="button" class="jlmv-nav jlmv-next" aria-label="Apre"><i class="fa-solid fa-chevron-right"></i></button>
      <div class="jlmv-caption"></div>`;
    document.body.appendChild(root);

    root.querySelector('.jlmv-backdrop').onclick = close;
    root.querySelector('.jlmv-close').onclick = close;
    root.querySelector('.jlmv-prev').onclick = () => go(idx - 1);
    root.querySelector('.jlmv-next').onclick = () => go(idx + 1);
    document.addEventListener('keydown', onKey);
    return root;
  }

  function onKey(e) {
    if (!root || !root.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') go(idx - 1);
    else if (e.key === 'ArrowRight') go(idx + 1);
  }

  function resetZoom() {
    scale = 1; tx = 0; ty = 0;
    const frame = root.querySelector('.jlmv-frame');
    const el = frame.firstElementChild;
    if (el) el.style.transform = 'translate(0px,0px) scale(1)';
  }

  function applyTransform() {
    const frame = root.querySelector('.jlmv-frame');
    const el = frame.firstElementChild;
    if (el) el.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
  }

  function renderCurrent() {
    const it = items[idx];
    if (!it) return;
    const frame = root.querySelector('.jlmv-frame');
    frame.innerHTML = it.type === 'video'
      ? `<video src="${it.url}" controls playsinline autoplay></video>`
      : `<img src="${it.url}" alt="" draggable="false">`;
    root.querySelector('.jlmv-count').textContent = items.length > 1 ? `${idx + 1} / ${items.length}` : '';
    root.querySelector('.jlmv-download').href = it.url;
    root.querySelector('.jlmv-caption').textContent = it.caption || '';
    root.querySelector('.jlmv-prev').style.visibility = (items.length > 1 && idx > 0) ? 'visible' : 'hidden';
    root.querySelector('.jlmv-next').style.visibility = (items.length > 1 && idx < items.length - 1) ? 'visible' : 'hidden';
    resetZoom();
    wireGestures(it.type);
  }

  function go(n) {
    if (n < 0 || n >= items.length) return;
    idx = n;
    renderCurrent();
  }

  function wireGestures(type) {
    const frame = root.querySelector('.jlmv-frame');
    const el = frame.firstElementChild;
    if (!el || type === 'video') return; // videyo: kontwòl natif <video>, pa gen zoom

    // Double-tap / double-click pou zoom rapid
    el.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTap < 300) {
        scale = scale > 1 ? 1 : 2.4; tx = 0; ty = 0; applyTransform();
      }
      lastTap = now;
    });

    // Molèt souri (desktop) — zoom sant
    frame.addEventListener('wheel', (e) => {
      e.preventDefault();
      const d = e.deltaY < 0 ? 0.18 : -0.18;
      scale = Math.min(4, Math.max(1, scale + d));
      if (scale === 1) { tx = 0; ty = 0; }
      applyTransform();
    }, { passive: false });

    // Pinch-to-zoom + drag (mobil)
    frame.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinchStart = { dist: touchDist(e), scale };
      } else if (e.touches.length === 1 && scale > 1) {
        dragStart = { x: e.touches[0].clientX - tx, y: e.touches[0].clientY - ty };
      }
    }, { passive: true });

    frame.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && pinchStart) {
        e.preventDefault();
        const d = touchDist(e);
        scale = Math.min(4, Math.max(1, pinchStart.scale * (d / pinchStart.dist)));
        applyTransform();
      } else if (e.touches.length === 1 && dragStart && scale > 1) {
        e.preventDefault();
        tx = e.touches[0].clientX - dragStart.x;
        ty = e.touches[0].clientY - dragStart.y;
        applyTransform();
      }
    }, { passive: false });

    frame.addEventListener('touchend', () => {
      pinchStart = null; dragStart = null;
      if (scale <= 1) { scale = 1; tx = 0; ty = 0; applyTransform(); }
    });
  }

  function touchDist(e) {
    const [a, b] = e.touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function close() {
    if (!root) return;
    root.classList.remove('open');
    setTimeout(() => { root.querySelector('.jlmv-frame').innerHTML = ''; }, 180);
    document.body.style.overflow = '';
  }

  window.Lotri.openMediaViewer = function (list, startIndex) {
    items = (Array.isArray(list) ? list : [list]).filter(it => it && it.url);
    if (!items.length) return;
    idx = Math.min(Math.max(0, startIndex || 0), items.length - 1);
    ensureRoot();
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => root.classList.add('open'));
    renderCurrent();
  };
})();
