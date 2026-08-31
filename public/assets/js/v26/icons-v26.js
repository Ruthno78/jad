/* =====================================================================
 * JADSTACK LOTTO — V26 · IKÒN KONTEKSTYÈL (FAZ 2 · PATI 5)
 * Bay chak lyen/bouton yon kontèks (tikè · ajan · konpayi · machin), epi
 * v26.css bay koulè a. Koulè tèks la = koulè ikòn nan; hover = --accent.
 * 100% pwogresif: si yon eleman pa rekonèt, li rete jan l te ye.
 * ===================================================================== */
(function () {
  const CTX = [
    ['ticket',  /tik(e|è)|ticket|fich|pos|vant|caisse|cash-register|receipt|award|trophy/i],
    ['agent',   /ajan|vand[eè]|agent|sip[eè]viz|superviz|ekip|users?\b|itilizat/i],
    ['company', /konpayi|company|sikisal|siksal|branch|building|pwofil konpayi/i],
    ['machine', /machin|machine|siveyans|surveillance|desktop|device|aparèy|app|apk/i],
  ];

  const ICON_CTX = [
    ['ticket',  /fa-(ticket|receipt|cash-register|file-invoice|award|trophy)/],
    ['agent',   /fa-(users?|user-group|user-tie|id-badge)/],
    ['company', /fa-(building|sitemap|city)/],
    ['machine', /fa-(desktop|display|mobile|tablet|laptop|tv)/],
  ];

  function ctxOf(node) {
    const icon = node.querySelector && node.querySelector('i[class*="fa-"]');
    if (icon) {
      for (const [k, re] of ICON_CTX) if (re.test(icon.className)) return k;
    }
    const txt = (node.dataset && node.dataset.view ? node.dataset.view + ' ' : '') +
                (node.textContent || '');
    for (const [k, re] of CTX) if (re.test(txt)) return k;
    return null;
  }

  function tag(root) {
    const scope = root || document;
    scope.querySelectorAll(
      'a[data-view], button[data-view], .side a, .sidebar a, nav a, .card-hd h3, .page-hd h2'
    ).forEach(n => {
      if (n.hasAttribute('data-v26-ctx')) return;
      const c = ctxOf(n);
      if (c) n.setAttribute('data-v26-ctx', c);
    });
  }

  function boot() {
    tag(document);
    const host = document.getElementById('view') || document.body;
    const mo = new MutationObserver(() => tag(document));
    mo.observe(host, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('lotri:ready', () => setTimeout(() => tag(document), 120));
})();
