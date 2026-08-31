/* =====================================================================
 * JADSTACK LOTTO V34 — LOGO: BAZ DONE AN PREMYE, LOKAL AN SEKOU
 * ---------------------------------------------------------------------
 * Règ: logo ki nan baz done a (site_config / branding: logo_wide,
 * logo_mark, oswa logo konpayi a) TOUJOU pase an premye. Se uniquement si li
 * pa egziste, si li vid, oswa si imaj la pa ka chaje (404/Storage anpàn)
 * nou tonbe sou fichye lokal la.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const V = (L.v34 = L.v34 || {});

  const LOCAL = {
    wide: 'assets/img/jadstacklotto_logo.png',
    mark: 'assets/img/logo.png',
  };

  function dbUrl(kind) {
    const c = L.config || {};
    const b = c.brand || c.branding || {};
    const co = (L.companyBrand || {});   // logo konpayi a (paj konpayi/ajan)
    const pick = kind === 'mark'
      ? [co.logo_mark, co.logo, b.logo_mark, b.logo_square, b.logo]
      : [co.logo_wide, co.logo, b.logo_wide, b.logo, b.logo_mark];
    return pick.map((v) => (typeof v === 'string' ? v.trim() : '')).find(Boolean) || '';
  }

  V.paintLogos = function (root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('[data-brand]').forEach((host) => {
      const kind = host.dataset.brand === 'mark' ? 'mark' : 'wide';
      const url = dbUrl(kind);
      const local = LOCAL[kind];
      const alt = (L.config && L.config.brand && L.config.brand.name) || 'JADSTACK LOTTO';

      // Toutan konfig (site_config/brand konpayi) POKO fin chaje nan memwa,
      // pa gen ni url Supabase ni fallback ki fyab ankò — montre yon kat
      // "loading" (menm jan ak YouTube) olye yon logo vid ki ka sanble kase.
      if (!L.configLoaded) {
        if (!host.querySelector('.jl34-logo-skel')) {
          host.innerHTML = '<div class="skeleton jl34-logo-skel" style="width:100%;height:100%;border-radius:var(--radius-sm)"></div>';
        }
        return;
      }

      let img = host.querySelector('img[data-jl34]');
      if (!img) {
        img = document.createElement('img');
        img.setAttribute('data-jl34', '1');
        img.alt = alt;
        img.loading = 'eager';
        img.style.cssText = 'object-fit:contain;display:block';
        host.innerHTML = '';
        host.appendChild(img);
      }
      const want = url || local;
      if (img.getAttribute('data-src-want') === want) return;
      img.setAttribute('data-src-want', want);
      img.onerror = function () {
        if (img.getAttribute('data-fallback') === '1') return;   // deja sou lokal
        img.setAttribute('data-fallback', '1');
        img.src = local;                                         // plan B lokal
      };
      img.removeAttribute('data-fallback');
      img.src = want;
    });
  };

  /* Kenbe ansyen API a: `Lotri.paintBrand()` rele koreksyon V34 la tou */
  const prev = L.paintBrand;
  L.paintBrand = function () {
    try { if (typeof prev === 'function') prev.apply(this, arguments); } catch (_) {}
    V.paintLogos(document);
  };

  function boot() {
    V.paintLogos(document);
    if (L.loadConfig) {
      try {
        L.loadConfig().then(() => { L.configLoaded = true; V.paintLogos(document); })
          .catch(() => { L.configLoaded = true; V.paintLogos(document); }); // pa rete sou "loading" pou tout tan si rezo a echwe
      } catch (_) { L.configLoaded = true; }
    } else {
      L.configLoaded = true; // pa gen sistèm konfig — pa gen rezon pou kat "loading" la rete
    }
    if (window.MutationObserver) {
      let t = null;
      new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => V.paintLogos(document), 120); })
        .observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
