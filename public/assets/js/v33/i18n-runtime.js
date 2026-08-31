/* =====================================================================
 * JADSTACK LOTTO V34 (ranplase V33) — KOUCH TRADIKSYON RUNTIME
 * ---------------------------------------------------------------------
 * PWOBLÈM V33: li te uniquement konnen tradui tèks ki ekri an KREYÒL nan kòd
 * la ('ht' -> fr/en). Donk depi yon paj te gen tèks an Fransè oswa an
 * Anglè (oswa tèks ki te deja tradui), li pa t chanje — se poutèt sa se
 * kèk bouton uniquement ki te chanje lang.
 * V34: endèks la bati sou TOUT 3 LANG (fr / ht / en) an menm tan, epi
 * tradiksyon fèt SOUS -> SIB kèlkeswa lang sous la. Diksyonè baz done a
 * (jl34_rpc_dict_all) melanje ak diksyonè embake a, konsa Super Admin ka
 * korije/ajoute yon fraz san deplwaman.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const R = (L.v33 = L.v33 || {});

  const ORIG = new WeakMap();      // node -> tèks orijinal
  const OATTR = new WeakMap();     // element -> { attr: orijinal }
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'SVG']);
  const LANGS = ['fr', 'ht', 'en'];

  const norm = (s) => String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
  const nkey = (s) => norm(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  /* ---- 1. Endèks: fraz (nenpòt lang) -> kle ---- */
  R.INDEX = Object.create(null);   // nkey(fraz) -> kle
  R.ROWS  = Object.create(null);   // kle -> { fr, ht, en }

  function addRow(key, row) {
    if (!key || !row) return;
    const cur = R.ROWS[key] || {};
    LANGS.forEach((c) => { if (row[c]) cur[c] = row[c]; });
    R.ROWS[key] = cur;
    LANGS.forEach((c) => { const v = cur[c]; if (v) { const k = nkey(v); if (k) R.INDEX[k] = key; } });
  }
  R.addRow = addRow;

  function buildEmbedded() {
    // 1) Fòm V33: L.V33_PHRASES = [[ht, fr, en], ...]
    (L.V33_PHRASES || []).forEach((p) => {
      const key = L.slugKey ? L.slugKey(p[1] || p[0]) : null;
      if (key) addRow(key, { ht: p[0], fr: p[1], en: p[2] });
    });
    // 2) Fòm V33 dic objè: L.V33_DICT = { kle: {ht,fr,en} }
    Object.keys(L.V33_DICT || {}).forEach((k) => addRow(k, L.V33_DICT[k]));
    // 3) Fraz anplis V34
    (L.V34_PHRASES || []).forEach((p) => {
      const key = L.slugKey ? L.slugKey(p[1] || p[0]) : null;
      if (key) addRow(key, { ht: p[0], fr: p[1], en: p[2] });
    });
  }

  /* ---- 2. Diksyonè baz done a (Super Admin) ---- */
  R.loadDb = async function () {
    const sb = L.supabase;
    if (!sb) return;
    try {
      const { data, error } = await sb.rpc('jl34_rpc_dict_all');
      if (error || !data) return;
      Object.keys(data).forEach((k) => addRow(k, data[k]));
    } catch (_) {}
  };

  function lang() {
    try {
      const c = localStorage.getItem('jl:lang');
      if (LANGS.includes(c)) return c;
    } catch (_) {}
    return (L.i18n && L.i18n.current) || 'fr';
  }

  /* ---- 3. Tradiksyon yon fraz, kèlkeswa lang sous la ---- */
  R.translate = function (text, code) {
    const k = nkey(text);
    if (!k) return null;
    const key = R.INDEX[k];
    if (!key) return null;
    // valè baz done (L.t) an premye, apre sa valè embake
    if (L.t) { const v = L.t(key, null); if (v && v !== key) return v; }
    const row = R.ROWS[key];
    const v2 = row && row[code];
    return (typeof v2 === 'string' && v2) ? v2 : null;
  };

  /* ---- 4. Pase sou DOM la ---- */
  function walkText(root, code) {
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p || SKIP.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.closest('[data-no-i18n]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = []; let n;
    while ((n = it.nextNode())) nodes.push(n);
    nodes.forEach((node) => {
      if (!ORIG.has(node)) ORIG.set(node, node.nodeValue);
      const orig = ORIG.get(node);
      const trimmed = norm(orig);
      if (!trimmed) return;
      const tr = R.translate(trimmed, code);
      const next = (tr === null) ? orig : orig.replace(trimmed, tr);
      if (node.nodeValue !== next) node.nodeValue = next;
    });
  }

  function walkAttrs(root, code) {
    const els = [root].concat(Array.prototype.slice.call(
      root.querySelectorAll ? root.querySelectorAll('*') : []));
    els.forEach((el) => {
      if (!el || el.nodeType !== 1) return;
      ATTRS.forEach((a) => {
        if (!el.hasAttribute || !el.hasAttribute(a)) return;
        let store = OATTR.get(el);
        if (!store) { store = {}; OATTR.set(el, store); }
        if (store[a] === undefined) store[a] = el.getAttribute(a);
        const orig = store[a];
        if (!orig || !orig.trim()) return;
        const tr = R.translate(orig, code);
        const next = (tr === null) ? orig : tr;
        if (el.getAttribute(a) !== next) el.setAttribute(a, next);
      });
      // <option> / <input value> bouton
      if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && el.value) {
        let store = OATTR.get(el) || {}; OATTR.set(el, store);
        if (store.value === undefined) store.value = el.value;
        const tr = R.translate(store.value, code);
        el.value = (tr === null) ? store.value : tr;
      }
    });
  }

  /* ---------------------------------------------------------------
   * V35 KORIJE: BOUCLE ENFINI LANG LAN
   * -------------------------------------------------------------
   * Problème: `R.apply()` modifye DOM la. MutationObserver la resevwa
   * chanjman sa yo APRE (nan yon microtask), donk drapo `busy` te deja
   * tounen `false` -> li relanse `R.apply()` -> ki refè lòt mitasyon...
   * konsa UI a te kontinye chanje lang san kanpe.
   * Solisyon: nou DEKONEKTE obsèvatè a pandan n ap ekri, nou jete
   * mitasyon nou menm nou fè (`takeRecords()`), epi nou rekonekte l nan
   * yon `setTimeout(0)`. Anplis, `R.apply` pa fè anyen si lang lan pa
   * chanje e paj la deja tradui (`_lastCode` + kontwòl re-antre).
   * ------------------------------------------------------------- */
  let observer = null;
  let applying = false;
  let timer = null;
  R._lastCode = null;

  function pause() {
    if (!observer) return;
    try { observer.takeRecords(); observer.disconnect(); } catch (_) {}
  }
  function resume() {
    if (!observer || !document.body) return;
    try {
      observer.takeRecords();
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (_) {}
  }

  R.apply = function (root) {
    const code = lang();
    const target = (root && root.nodeType) ? root : document.body;
    if (!target || applying) return;
    applying = true;
    pause();
    try { walkText(target, code); walkAttrs(target, code); } catch (_) {}
    // V36: konsolide isit la — sa a ranplase ansyen obsèvatè apa
    // v30/lang-switch.js te genyen pou re-aplike I.apply() (diksyonè
    // baz done, [data-i18n]/[data-i18n-ph]) sou nouvo eleman. Yon sèl
    // obsèvatè/pas kounye a jere toude kouch tradiksyon an.
    try { if (L.i18n && typeof L.i18n.apply === 'function') L.i18n.apply(target); } catch (_) {}
    R._lastCode = code;
    // Rekonekte SÈLMAN apre navigatè a fin livre mitasyon nou yo,
    // konsa pwòp ekriti nou yo pa deklanche yon lòt tou.
    setTimeout(() => { applying = false; resume(); }, 0);
  };

  R.refresh = function (root) {
    if (applying) return;
    clearTimeout(timer);
    timer = setTimeout(() => R.apply(root || document.body), 80);
  };

  async function boot() {
    buildEmbedded();
    R.apply(document.body);
    await R.loadDb();
    R.apply(document.body);
    if (window.MutationObserver && !observer) {
      observer = new MutationObserver((muts) => {
        if (applying) return;
        for (const m of muts) {
          // Nou inyore chanjman `characterData` ki soti nan tradiksyon
          // (yo pase pandan `applying`), uniquement nouvo kontni konte.
          if ((m.addedNodes && m.addedNodes.length) || m.type === 'characterData') {
            R.refresh(document.body); return;
          }
        }
      });
      resume();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Yon sèl reyaksyon pou tout evènman lang (pa youn pa evènman).
  let langEvtTimer = null;
  ['lang-changed', 'jl28:lang'].forEach((ev) =>
    document.addEventListener(ev, () => {
      clearTimeout(langEvtTimer);
      langEvtTimer = setTimeout(() => { R._lastCode = null; R.apply(document.body); }, 40);
    }));
})();
