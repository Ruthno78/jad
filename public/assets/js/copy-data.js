/* =====================================================================
 * JADSTACK LOTTO V17 §9.2 — KOPYE DONE (double-klik sou PC · long-press sou mobil)
 * ---------------------------------------------------------------------
 *  • Yon sèl delegasyon evènman sou `document` (pa yon listener pa done).
 *  • Valeur kopye a: `data-copy-value` si li egziste (valè brit, san fòmataj),
 *    sinon tèks eleman an (oswa seleksyon an si moun nan te seleksyone).
 *  • Yon sèl klik pa janm kopye. Lyen (<a>), bouton ak chan fòm rete entak.
 *  • Feedback disrè: yon ti "Copié ✓" bò kote klik la (stil WhatsApp).
 * ===================================================================== */
(function () {
  const OK_TAGS = /^(TD|TH|SPAN|STRONG|B|EM|P|DIV|LI|H1|H2|H3|H4|H5|LABEL|SMALL|CODE)$/;
  const SKIP = 'a,button,input,textarea,select,[contenteditable="true"],[data-no-copy]';

  function targetOf(node) {
    if (!node || node.nodeType !== 1) return null;
    // Yon eleman ki gen `data-copy` eksprè (bouton "kopye lyen", elt.) toujou
    // aksesib menm si li se yon <button>/<a> — se rezon pou li egziste.
    const explicit = node.closest('[data-copy]');
    if (explicit) return explicit;
    if (node.closest(SKIP)) return null;
    const el = node.closest('[data-copy-value]') || node;
    if (!OK_TAGS.test(el.tagName)) return null;
    return el;
  }

  function valueOf(el) {
    // Bouton kopye eksplisit (`data-copy="valè"` sou <button>/<a data-no-copy>) —
    // valè a se atribi a limenm, pa `data-copy-value`.
    const explicit = el.getAttribute('data-copy');
    if (explicit != null && explicit !== '') return explicit.trim();
    const raw = el.getAttribute('data-copy-value');
    if (raw != null && raw !== '') return raw.trim();
    const sel = String(window.getSelection ? window.getSelection() : '').trim();
    if (sel && el.contains((window.getSelection().anchorNode || {}).parentNode || null)) return sel;
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return txt.length > 400 ? txt.slice(0, 400) : txt;
  }

  function flash(x, y, msg) {
    const t = document.createElement('div');
    t.className = 'jl17-copy-tip';
    t.textContent = msg;
    t.style.left = Math.max(8, Math.min(window.innerWidth - 120, x - 30)) + 'px';
    t.style.top = Math.max(8, y - 38) + 'px';
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 700);
    setTimeout(() => t.remove(), 1100);
  }

  async function write(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* tonbe sou fallback la */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) { return false; }
  }

  async function copyFrom(node, x, y) {
    const el = targetOf(node);
    if (!el) return;
    const val = valueOf(el);
    if (!val) return;
    const ok = await write(val);
    flash(x, y, ok ? 'Copié ✓' : 'Copie impossible');
  }

  /* ---- Bouton kopye eksplisit (`data-copy`) : yon sèl klik ---- */
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-copy]');
    if (!el) return;
    e.preventDefault();
    copyFrom(el, e.clientX, e.clientY);
  });

  /* ---- PC: double-klik ---- */
  document.addEventListener('dblclick', e => {
    copyFrom(e.target, e.clientX, e.clientY);
  });

  /* ---- Mobil/tablèt: long-press ~500ms san touchmove ---- */
  let timer = null, sx = 0, sy = 0, node = null;
  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } node = null; };

  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return clear();
    const t = e.touches[0];
    sx = t.clientX; sy = t.clientY; node = e.target;
    clear();
    node = e.target;
    timer = setTimeout(() => { timer = null; copyFrom(node, sx, sy); }, 500);
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (!t) return clear();
    if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) clear();
  }, { passive: true });

  document.addEventListener('touchend', clear, { passive: true });
  document.addEventListener('touchcancel', clear, { passive: true });

  /* Zouti pou lòt modil: mete valè brit sou yon montan fòmate. */
  window.Lotri = window.Lotri || {};
  window.Lotri.copyable = (html, rawValue) =>
    `<span data-copy-value="${String(rawValue ?? '').replace(/"/g, '&quot;')}">${html}</span>`;
})();
