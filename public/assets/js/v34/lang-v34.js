/* =====================================================================
 * JADSTACK LOTTO V34 — LANG: REZOLISYON + PÈSISTANS + APLIKASYON TOTAL
 * ---------------------------------------------------------------------
 * • Langue efektif = preferans moun nan (baz done) > lang konpayi a >
 *   lang SISTÈM (Super Admin). Si moun nan pa gen preferans, li pran
 *   lang jeneral la OTOMATIKMAN.
 * • Lè yon moun chanje lang: nou sere l nan baz done (jl34_rpc_set_my_lang)
 *   + localStorage, epi TOUT paj la retradui (tit, meni, bouton, tab,
 *   etikèt done, placeholder, title, aria-label) — pa uniquement kèk bouton.
 * • Langue FICHE (tikè) separe: konpayi a chwazi pa l, Super Admin mete defo
 *   jeneral la. `Lotri.v34.ficheLang()` bay lang fich la.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const V = (L.v34 = L.v34 || {});
  const LANGS = ['fr', 'ht', 'en'];
  const KEY = 'jl:lang';

  V.LANGS = [
    { code: 'fr', label: 'Français' },
    { code: 'ht', label: 'Créole' },
    { code: 'en', label: 'English' },
  ];

  V.ctx = { system_lang: 'ht', user_pref: null, company_ui_lang: null,
            company_ticket_lang: null, ticket_lang_default: 'ht',
            effective: 'ht', fiche: 'ht' };

  const SB = () => (L.supabase || null);
  const get = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };

  V.current = function () {
    const c = get(KEY);
    return LANGS.includes(c) ? c : V.ctx.effective || 'ht';
  };
  V.ficheLang = function () { return V.ctx.fiche || V.ctx.ticket_lang_default || 'ht'; };

  /* ---------- 1. Chaje kontèks lang depi baz done a ---------- */
  V.loadContext = async function () {
    const sb = SB();
    if (!sb) return V.ctx;
    try {
      const { data, error } = await sb.rpc('jl34_rpc_lang_context');
      if (!error && data) V.ctx = Object.assign(V.ctx, data);
    } catch (_) {}
    // Preferans moun nan gen priyorite; si li pa genyen, nou pran jeneral la
    const eff = LANGS.includes(V.ctx.user_pref) ? V.ctx.user_pref
              : (LANGS.includes(V.ctx.effective) ? V.ctx.effective : 'ht');
    set(KEY, eff);
    return V.ctx;
  };

  /* ---------- 2. Chanje lang (tout paj la) ---------- */
  V.setLang = async function (code, opts) {
    if (!LANGS.includes(code)) code = 'ht';
    set(KEY, code);
    document.documentElement.lang = code;

    // 2a. Sere preferans lan nan baz done a (si moun nan konekte)
    const sb = SB();
    if (sb && !(opts && opts.localOnly)) {
      try { await sb.rpc('jl34_rpc_set_my_lang', { _lang: code }); V.ctx.user_pref = code; }
      catch (_) {}
    }
    // 2b. Recharge diksyonè a epi retradui TOUT paj la
    try { if (L.i18n && L.i18n.load) await L.i18n.load(code); } catch (_) {}
    try { if (L.v33 && L.v33.apply) L.v33.apply(document.body); } catch (_) {}
    document.dispatchEvent(new CustomEvent('lang-changed', { detail: code }));
    document.dispatchEvent(new CustomEvent('jl28:lang', { detail: code }));
    return code;
  };

  /* ---------- 3. Réglages administratè ---------- */
  V.setSystemLang = async function (code) {          // Super Admin
    const sb = SB(); if (!sb) return;
    const { error } = await sb.rpc('jl34_rpc_set_system_lang', { _lang: code });
    if (error) throw error;
    V.ctx.system_lang = code;
  };
  V.setDefaultFicheLang = async function (code) {    // Super Admin — fich jeneral
    const sb = SB(); if (!sb) return;
    const { error } = await sb.rpc('jl34_rpc_set_default_fiche_lang', { _lang: code });
    if (error) throw error;
    V.ctx.ticket_lang_default = code;
  };
  V.setCompanyLang = async function (uiLang, ficheLang, companyId) {  // Compagnie
    const sb = SB(); if (!sb) return;
    const { error } = await sb.rpc('jl34_rpc_set_company_lang', {
      _ui_lang: uiLang || null, _ticket_lang: ficheLang || null, _company: companyId || null });
    if (error) throw error;
    V.ctx.company_ui_lang = uiLang || null;
    V.ctx.company_ticket_lang = ficheLang || null;
  };

  /* ---------- 4. Demarraj ---------- */
  async function boot() {
    await V.loadContext();
    const code = V.current();
    document.documentElement.lang = code;
    try { if (L.i18n) { L.i18n.current = code; await L.i18n.load(code); } } catch (_) {}
    try { if (L.v33 && L.v33.apply) L.v33.apply(document.body); } catch (_) {}
    document.dispatchEvent(new CustomEvent('lang-changed', { detail: code }));
  }

  function start() {
    if (SB()) boot();
    else setTimeout(start, 80);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  /* ---------- 5. Konpatiblite ak ansyen seleksyonè (v30/lang-switch.js) ---------- */
  const V30 = (L.v30 = L.v30 || {});
  V30.setLang = function (code) { V.setLang(code); };
})();
