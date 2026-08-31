/* =====================================================================
 * JADSTACK LOTTO V34 — i18n.js
 * ---------------------------------------------------------------------
 * Diksyonè a chaje pa RPC `jl30_rpc_get_dict(_lang)` (tab santral
 * `jl30_i18n_strings`). Langue aktif la PA soti nan localStorage uniquement: li
 * rezoud pa V34 (`jl34_rpc_lang_context`) — preferans moun nan an premye,
 * epi si li pa genyen, lang KONPAYI a, epi lang SISTÈM nan.
 *
 * Itilizasyon nan HTML :  <span data-i18n="ui.total">Total</span>
 * Itilizasyon nan JS   :  Lotri.t('ui.total', 'Total')
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const L = window.Lotri;
  const I = (L.i18n = {});
  let dict = {};
  I.dict = () => dict;

  I.available = ['fr', 'ht', 'en'];
  I.labels = { fr: 'Français', ht: 'Créole', en: 'English' };
  I.default = 'ht';   // V35: Créole se lang aktive pa defo

  function detectDeviceLang() {
    try {
      const nav = (navigator.language || navigator.userLanguage || '').slice(0, 2).toLowerCase();
      return I.available.includes(nav) ? nav : I.default;
    } catch (_) { return I.default; }
  }

  I.current = (function () {
    try {
      const saved = localStorage.getItem('jl:lang');
      if (saved && I.available.includes(saved)) return saved;
    } catch (_) {}
    return detectDeviceLang();
  })();

  L.t = function (key, fallback) {
    if (!key) return fallback || '';
    let v = (dict && typeof dict[key] === 'string') ? dict[key] : undefined;
    if (v === undefined)
      v = key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, dict);
    return (typeof v === 'string' && v) ? v : (fallback !== undefined ? fallback : key);
  };

  I.apply = function (root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(el => {
      const v = L.t(el.dataset.i18n, null);
      if (v !== null) el.textContent = v;
    });
    (root || document).querySelectorAll('[data-i18n-ph]').forEach(el => {
      const v = L.t(el.dataset.i18nPh, null);
      if (v !== null) el.placeholder = v;
    });
  };

  I.load = async function (code) {
    code = I.available.includes(code) ? code : I.default;
    try {
      const sb = L.supabase;
      if (sb) {
        const { data, error } = await sb.rpc('jl30_rpc_get_dict', { _lang: code });
        dict = (!error && data) ? data : {};
      } else { dict = {}; }
    } catch (_) { dict = {}; }
    I.current = code;
    try { localStorage.setItem('jl:lang', code); } catch (_) {}
    document.documentElement.lang = code;
    I.apply(document);
    // Retradui TOUT paj la (tèks ki hardcode nan JS/HTML tou)
    try { if (L.v33 && L.v33.apply) L.v33.apply(document.body); } catch (_) {}
    document.dispatchEvent(new CustomEvent('lang-changed', { detail: code }));
    return dict;
  };

  // Bak-konpatib
  L.loadLang = I.load;

  document.addEventListener('DOMContentLoaded', () => {
    // V34: `v34/lang-v34.js` rele I.load() apre li rezoud lang efektif la.
    // Si li pa prezan (ansyen paj), nou chaje lang lokal la kanmenm.
    setTimeout(() => {
      if (L.v34 && L.v34.loadContext) return;
      I.load(I.current);
    }, 120);
  });
})();
