/* =====================================================================
 * offline-guard.js (V49)
 * ---------------------------------------------------------------------
 * 1) Detekte koneksyon entènèt pèdi (navigator.onLine + ti "ping" reyèl
 *    sou Supabase, paske navigator.onLine sèl pa toujou fyab).
 * 2) Lè koneksyon pèdi: ti banyè anwo ekran an ("Aucune connexion...").
 * 3) Si li rete pèdi plis pase 5 minit: yon EKRAN CONPLE ki kache TOUT
 *    UI (z-index maksimòm) — moun nan pa ka klike/wè anyen dèyè l —
 *    jiskaske koneksyon an tounen. Li eseye rekonekte otomatikman.
 * 4) Du koneksyon an tounen: tout bagay disparèt, ekran an rekòmanse
 *    nòmal san moun nan pa gen pou refè aksyon li te fè a men.
 * Enkli senp sou nenpòt paj: <script defer src="assets/js/offline-guard.js"></script>
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  if (window.Lotri.offlineGuard) return;

  var FULL_SCREEN_AFTER_MS = 5 * 60 * 1000; // 5 minit
  var PING_INTERVAL_MS     = 15 * 1000;     // eseye rekonekte chak 15s
  var PING_URL_FALLBACK    = 'favicon.svg?ping=' ;

  var offlineSince = null;
  var pingTimer = null;
  var fullscreenTimer = null;
  var banner = null;
  var overlay = null;

  function ensureStyles() {
    if (document.getElementById('lotri-offline-style')) return;
    var s = document.createElement('style');
    s.id = 'lotri-offline-style';
    s.textContent = [
      '.lotri-offline-banner{position:fixed;top:0;left:0;right:0;z-index:99998;',
      'display:flex;align-items:center;justify-content:center;gap:.5rem;',
      'padding:.55rem 1rem;font:600 .85rem/1.3 Inter,system-ui,sans-serif;',
      'background:var(--warning-soft,#FAF0D6);color:var(--warning,#B5810E);',
      'border-bottom:1px solid rgba(0,0,0,.08);transform:translateY(-110%);',
      'pointer-events:none;transition:transform .25s ease}',
      '.lotri-offline-banner.show{transform:translateY(0);pointer-events:auto}',
      '.lotri-offline-overlay{position:fixed;inset:0;z-index:99999;',
      'background:var(--bg,#0A161F);display:flex;align-items:center;justify-content:center;',
      'opacity:0;pointer-events:none;visibility:hidden;transition:opacity .3s ease}',
      '.lotri-offline-overlay.show{opacity:1;pointer-events:all;visibility:visible}',
      '.lotri-offline-card{max-width:22rem;padding:2rem 1.75rem;text-align:center;',
      'font-family:Inter,system-ui,sans-serif;color:var(--text,#eef2f6)}',
      '.lotri-offline-icon{width:56px;height:56px;margin:0 auto 1.1rem;border-radius:50%;',
      'display:flex;align-items:center;justify-content:center;font-size:1.5rem;',
      'background:var(--danger-soft,#33110E);color:var(--danger,#E4695C)}',
      '.lotri-offline-card h2{font-size:1.05rem;margin:0 0 .4rem}',
      '.lotri-offline-card p{font-size:.85rem;opacity:.7;margin:0 0 1.4rem}',
      '.lotri-offline-dots{display:inline-flex;gap:.3rem;margin-bottom:1.2rem}',
      '.lotri-offline-dots span{width:6px;height:6px;border-radius:50%;',
      'background:var(--accent,#4f8cff);opacity:.35;animation:lotriOfflinePulse 1.1s infinite}',
      '.lotri-offline-dots span:nth-child(2){animation-delay:.15s}',
      '.lotri-offline-dots span:nth-child(3){animation-delay:.3s}',
      '@keyframes lotriOfflinePulse{0%,80%,100%{opacity:.25}40%{opacity:1}}',
      '.lotri-offline-retry{border:0;border-radius:.6rem;padding:.6rem 1.3rem;font:600 .85rem Inter,sans-serif;',
      'background:var(--accent,#4f8cff);color:#fff;cursor:pointer}',
      '.lotri-offline-retry:active{transform:scale(.97)}'
    ].join('');
    document.head.appendChild(s);
  }

  function ensureBanner() {
    if (banner) return banner;
    banner = document.createElement('div');
    banner.className = 'lotri-offline-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>' +
      '<span>Aucune connexion Internet — tentative de reconnexion…</span>';
    document.body.appendChild(banner);
    return banner;
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'lotri-offline-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="lotri-offline-card">' +
        '<div class="lotri-offline-icon"><i class="fa-solid fa-wifi" aria-hidden="true"></i></div>' +
        '<h2>Aucune connexion Internet</h2>' +
        '<p>La connexion est perdue depuis plus de 5 minutes. L\'application attend son rétablissement.</p>' +
        '<div class="lotri-offline-dots"><span></span><span></span><span></span></div><br>' +
        '<button type="button" class="lotri-offline-retry" id="lotri-offline-retry-btn">Réessayer</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#lotri-offline-retry-btn').addEventListener('click', function () {
      checkConnection(true);
    });
    return overlay;
  }

  function showBanner(show) {
    ensureStyles();
    ensureBanner().classList.toggle('show', show);
  }

  function showOverlay(show) {
    ensureStyles();
    ensureOverlay().classList.toggle('show', show);
    document.documentElement.style.overflow = show ? 'hidden' : '';
  }

  function armFullscreenTimer() {
    if (fullscreenTimer) return;
    fullscreenTimer = setTimeout(function () {
      showOverlay(true);
    }, FULL_SCREEN_AFTER_MS);
  }

  function disarmFullscreenTimer() {
    if (fullscreenTimer) { clearTimeout(fullscreenTimer); fullscreenTimer = null; }
  }

  function markOffline() {
    if (offlineSince) return;
    offlineSince = Date.now();
    showBanner(true);
    armFullscreenTimer();
    if (!pingTimer) pingTimer = setInterval(function () { checkConnection(false); }, PING_INTERVAL_MS);
  }

  function markOnline() {
    if (!offlineSince) return;
    offlineSince = null;
    disarmFullscreenTimer();
    showBanner(false);
    showOverlay(false);
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    if (window.Lotri.badges) window.Lotri.badges.refresh();
  }

  /* navigator.onLine pa toujou fyab (ka rete "true" menm sou wifi san
     entènèt reyèl). Nou konfime ak yon ti rekèt reyèl sou rezo a. */
  function checkConnection(manualRetry) {
    if (!navigator.onLine) { markOffline(); return; }
    var url = window.__SUPABASE_URL__
      ? window.__SUPABASE_URL__ + '/auth/v1/health'
      : PING_URL_FALLBACK + Date.now();
    fetch(url, { method: 'GET', cache: 'no-store', mode: 'no-cors' })
      .then(function () { markOnline(); })
      .catch(function () {
        markOffline();
        if (manualRetry) {
          var btn = document.getElementById('lotri-offline-retry-btn');
          if (btn) { btn.textContent = 'Toujours aucune connexion…'; setTimeout(function(){ btn.textContent = 'Réessayer'; }, 1600); }
        }
      });
  }

  window.addEventListener('online', function () { checkConnection(false); });
  window.addEventListener('offline', markOffline);

  document.addEventListener('DOMContentLoaded', function () { checkConnection(false); });
  checkConnection(false);

  window.Lotri.offlineGuard = { check: checkConnection, isOffline: function () { return !!offlineSince; } };
})();
