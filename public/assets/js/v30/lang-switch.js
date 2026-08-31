/* =====================================================================
 * JADSTACK LOTTO V30 — §2.5 SELEKSYONÈ LANG — 1 dropdown, ikòn "world"
 * ---------------------------------------------------------------------
 * Ranplase konplètman v29/lang-switch.js (dwapo emoji). Sèl 1
 * bouton/ikòn "world" (SVG senp) nan tèt paj la; klike ouvri yon
 * dropdown ak 3 opsyon FR / HT / EN (kòd kout, san dwapo).
 * PA parèt sou yon fich (ticket) deja enprime — lang fich la se lang
 * Compagnie a chwazi (§2.3), pa lang moun k ap gade l — donc pa mount
 * si `[data-no-lang-switch]` prezan sou <body> oswa host la.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const V = (L.v30 = L.v30 || {});

  V.LANGS = [
    { code: 'fr', label: 'Français' },
    { code: 'ht', label: 'Créole' },
    { code: 'en', label: 'English' },
  ];

  const WORLD_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
       stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
       aria-hidden="true">
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M3 12h18M12 3c2.6 2.6 4 5.7 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.7-4-9s1.4-6.4 4-9z"></path>
  </svg>`;

  const cur = () => {
    try { return localStorage.getItem('jl:lang') || (L.i18n ? L.i18n.default : 'ht'); }
    catch (_) { return 'ht'; }
  };

  // V35: yon sèl chemen pou chanje lang (evite doub chajman + boucle).
  V.setLang = function (code) {
    if (!V.LANGS.some(l => l.code === code)) code = 'ht';
    try { localStorage.setItem('jl:lang', code); } catch (_) {}
    document.documentElement.lang = code;
    paintAll(code);
    closeAll();
    if (L.v34 && typeof L.v34.setLang === 'function') {
      // v34 sere preferans lan nan baz done a epi li retradui paj la
      // (li menm ki voye `lang-changed` / `jl28:lang`).
      L.v34.setLang(code);
      return;
    }
    if (L.i18n && typeof L.i18n.load === 'function') L.i18n.load(code);
    else document.dispatchEvent(new CustomEvent('lang-changed', { detail: code }));
  };

  function widgetHtml(place) {
    const c = cur();
    const curLabel = (V.LANGS.find(l => l.code === c) || V.LANGS[0]);
    return `<div class="v30-lang" data-v30-lang-place="${place}">
      <button type="button" class="v30-lang-btn" data-v30-toggle aria-haspopup="listbox"
              aria-expanded="false" title="${L.t ? L.t('nav.lang', 'Langue') : 'Langue'}">
        ${WORLD_SVG}<span class="v30-lang-code">${curLabel.code.toUpperCase()}</span>
      </button>
      <div class="v30-lang-menu" role="listbox" hidden>
        ${V.LANGS.map(l => `<button type="button" role="option" class="v30-lang-opt${l.code === c ? ' is-on' : ''}"
             data-v30-lang="${l.code}" aria-selected="${l.code === c}">
             <span class="cd">${l.code.toUpperCase()}</span><span class="lb">${l.label}</span></button>`).join('')}
      </div>
    </div>`;
  }

  function paintAll(code) {
    document.querySelectorAll('.v30-lang').forEach(w => {
      const codeEl = w.querySelector('.v30-lang-code');
      if (codeEl) codeEl.textContent = code.toUpperCase();
      w.querySelectorAll('.v30-lang-opt').forEach(b => {
        const on = b.dataset.v30Lang === code;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', String(on));
      });
    });
  }

  function closeAll() {
    document.querySelectorAll('.v30-lang-menu').forEach(m => m.hidden = true);
    document.querySelectorAll('.v30-lang-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }

  function mount() {
    if (document.body && document.body.hasAttribute('data-no-lang-switch')) return;
    if (!document.querySelector('[data-v30-lang-place="header"]')) {
      // V35: priyorite pou barè navigasyon an (nav .right) — sinon topbar/header
      const host = document.querySelector('.nav .nav-inner .right, .nav .right')
                || document.querySelector('header .actions, header .hdr-actions, .topbar .actions')
                || document.querySelector('.topbar, header');
      if (host && !host.closest('[data-no-lang-switch]')) host.insertAdjacentHTML('afterbegin', widgetHtml('header'));
    }
    if (!document.querySelector('[data-v30-lang-place="footer"]')) {
      const f = document.querySelector('footer .footer-bottom, footer .container, footer.footer, footer');
      if (f && !f.closest('[data-no-lang-switch]')) f.insertAdjacentHTML('beforeend', widgetHtml('footer'));
    }
    paintAll(cur());
  }

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest && e.target.closest('[data-v30-toggle]');
    if (toggle) {
      e.preventDefault();
      const menu = toggle.parentElement.querySelector('.v30-lang-menu');
      const willOpen = menu.hidden;
      closeAll();
      if (willOpen) { menu.hidden = false; toggle.setAttribute('aria-expanded', 'true'); }
      return;
    }
    const opt = e.target.closest && e.target.closest('[data-v30-lang]');
    if (opt) { e.preventDefault(); V.setLang(opt.dataset.v30Lang); return; }
    if (!e.target.closest('.v30-lang')) closeAll();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  document.addEventListener('DOMContentLoaded', () => {
    mount();
    setTimeout(mount, 400);
    setTimeout(mount, 1200);
  });
  document.addEventListener('lang-changed', (e) => paintAll(e.detail || cur()));
})();
