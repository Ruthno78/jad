/* =====================================================================
 * JADSTACK LOTTO V30 §2.6 — MIGRASYON lang-v28.js (Mariage GRATUIT)
 * ---------------------------------------------------------------------
 * Ansyen DICT 3-lang hardcoded la RETIRE isit — kontni an migre kòm
 * break-point nòmal nan `jl30_i18n_strings` (kle mg.title, mg.msg,
 * mg.gotIt, mg.ball, mg.price, mg.free, mg.subtitle, mg.close, mg.lang),
 * chaje pa i18n.js santral (RPC). Seleksyonè lang pwòp a Mariage Gratis
 * la retire tou — lang navigasyon GLOBAL la (§2.5, v30/lang-switch.js)
 * kontwole tout paj yo kounye a, ansanm ak Mariage Gratis.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const V = (L.v28 = L.v28 || {});

  // Ti sekou si diksyonè santral la poko fin chaje (rezo lan, etc).
  const FALLBACK_HT = {
    'mg.title': 'Mariage GRATUIT',
    'mg.msg': 'Le Mariage GRATUIT est un cadeau reçu automatiquement lors de la création d\'un ticket. Le système peut vous l\'attribuer selon les règles programmées par l\'administration. Son prix affichera toujours 0.',
    'mg.gotIt': 'Vous venez de recevoir un Mariage GRATUIT !',
    'mg.ball': 'Boule cadeau',
    'mg.price': 'Prix',
    'mg.free': 'GRATIS · 0 HTG',
    'mg.lang': 'Langue',
    'mg.subtitle': 'Message du système',
    'mg.close': 'Fermer',
  };

  /* Langue aktyèl la se toujou lang navigasyon GLOBAL la (§2.5) — pa gen
     lang apa pou Mariage Gratis ankò. Paramètres `code` nan V.t rete pou
     konpatibilite ak ansyen apèl (bubbleHtml(code)) men pa itilize. */
  V.lang = function () {
    return (L.i18n && L.i18n.current) || 'fr';
  };

  V.setLang = function (code) {
    if (L.i18n && typeof L.i18n.load === 'function') L.i18n.load(code);
  };

  V.t = function (key) {
    const v = L.t ? L.t(key, null) : null;
    return (v !== null && v !== undefined) ? v : (FALLBACK_HT[key] || key);
  };

  // Ansyen picker pwòp (jl28-lang) retire — pa gen anyen pou rann ankò.
  // Rete pou konpatibilite ak kòd ki rele l toujou (retounen vid).
  V.langPickerHtml = function () { return ''; };
})();
