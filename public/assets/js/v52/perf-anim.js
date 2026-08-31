/* =====================================================================
 * JADSTACK LOTTO V52 — FAZ 3 : PÈFÒMANS & ANIMASYON (frontend uniquement)
 * ---------------------------------------------------------------------
 *  • Transisyon vi : chak fwa `lotri:view` tire, #view antre ak yon
 *    fade+rise 190ms (opacity/transform uniquement => GPU, 60fps).
 *  • Skeleton loading : lè shell.js mete yon `.spinner` nan #view,
 *    nou ranplase l ak yon skeleton (menm DOM host, zewo lojik chanje).
 *  • Haptic : ti vibrasyon 8ms sou aksyon (si aparèy la sipòte l).
 *  • Ripple : feedback touche natif sou .btn / .side-link / bottom-nav.
 *  • Zewo backend, zewo SQL, zewo chanjman sou done.
 * ===================================================================== */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const host = () => document.getElementById('view');

  /* ---------- 1) Skeleton olye spinner ---------- */
  const SKEL = `
    <div class="jl52-skel" data-jl52-skel>
      <div class="jl52-skel-card">
        <div class="jl52-line tall w40"></div>
        <div class="jl52-line w80"></div>
        <div class="jl52-line w60"></div>
      </div>
      <div class="jl52-skel-card">
        <div class="jl52-line w60"></div>
        <div class="jl52-line w80"></div>
      </div>
      <div class="jl52-skel-card">
        <div class="jl52-line w40"></div>
        <div class="jl52-line w60"></div>
      </div>
    </div>`;

  function swapSpinner(el) {
    if (!el) return;
    const sp = el.querySelector(':scope > .spinner');
    if (!sp || el.querySelector('[data-jl52-skel]')) return;
    sp.style.display = 'none';
    el.insertAdjacentHTML('beforeend', SKEL);
  }

  /* ---------- 2) Transisyon vi ---------- */
  let raf = 0;
  function animateView(el) {
    if (!el || reduce) return;
    el.classList.remove('jl52-enter', 'jl52-enter-done');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.classList.add('jl52-enter');
      const done = () => {
        el.classList.remove('jl52-enter');
        el.classList.add('jl52-enter-done');
      };
      setTimeout(done, 320);
    });
  }

  /* ---------- 3) Haptic ---------- */
  function buzz(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
  }

  /* ---------- 4) Ripple ---------- */
  function ripple(ev) {
    if (reduce) return;
    const t = ev.target.closest('.btn, .side-link, .jl-sheet-item, .jl-bottom-nav button');
    if (!t || t.disabled) return;
    const r = t.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.15;
    const x = (ev.clientX ?? r.left + r.width / 2) - r.left;
    const y = (ev.clientY ?? r.top + r.height / 2) - r.top;
    const s = document.createElement('span');
    s.className = 'jl52-ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (x - size / 2) + 'px';
    s.style.top = (y - size / 2) + 'px';
    t.appendChild(s);
    setTimeout(() => s.remove(), 520);
  }

  document.addEventListener('pointerdown', (ev) => {
    ripple(ev);
    const t = ev.target.closest('.btn, .side-link, .jl-sheet-item, .jl-bottom-nav button');
    if (t) buzz(8);
  }, { passive: true });

  /* ---------- 5) Obsèvatè: kaptire spinner shell.js ---------- */
  function observe() {
    const el = host();
    if (!el || el.dataset.jl52 === '1') return;
    el.dataset.jl52 = '1';
    swapSpinner(el);
    new MutationObserver(() => swapSpinner(el)).observe(el, { childList: true });
  }

  document.addEventListener('lotri:view', (ev) => {
    const el = (ev && ev.detail) || host();
    animateView(el);
  });
  document.addEventListener('lotri:ready', observe);
  document.addEventListener('DOMContentLoaded', () => { observe(); animateView(host()); });
  observe();
})();
