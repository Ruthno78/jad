/* =====================================================================
 * JADSTACK LOTTO — mobile-shell.js
 * ---------------------------------------------------------------------
 * Activer SÈLMAN sou ekran <900px. Pa touche `LotriShell`/RPC/pèmisyon —
 * li LI DOM ki deja egziste (.side-link[data-view] ki soti nan menu
 * chak paj deja bay LotriShell.mount()) pou bati bottom-nav ak FAB,
 * kidonk ZEWO konfigirasyon pa wòl pou antreteni apa.
 * ===================================================================== */
(function () {
  const isMobile = () => window.matchMedia('(max-width: 959px)').matches;

  function buildTopbar() {
    const appbar = document.querySelector('.appbar');
    if (!appbar || appbar.querySelector('.jl-wordmark')) return;
    const right = appbar.querySelector('.right');
    if (!right) return;

    const word = document.createElement('div');
    word.className = 'jl-wordmark';
    word.innerHTML = '<b>JADSTACK</b><span>lotto</span>';
    appbar.querySelector('.left')?.appendChild(word);

    const dots = document.createElement('button');
    dots.type = 'button';
    dots.className = 'jl-dots-btn';
    dots.setAttribute('aria-label', 'Menu');
    dots.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>';
    right.appendChild(dots);
    dots.addEventListener('click', openSheet);
  }

  /* ------------------- Bottom-sheet (3 pwen) ------------------- */
  function openSheet() {
    const p = window.__lotriProfile || {};
    const esc = window.Lotri.escapeHtml;
    let backdrop = document.querySelector('.jl-sheet-backdrop');
    if (backdrop) backdrop.remove();

    backdrop = document.createElement('div');
    backdrop.className = 'jl-sheet-backdrop';
    backdrop.innerHTML = `
      <div class="jl-sheet" role="dialog" aria-label="Menu">
        <div class="jl-sheet-handle"></div>
        <div class="jl-sheet-head">
          <div class="jl-sheet-avatar">${esc((p.full_name || p.email || '?').charAt(0).toUpperCase())}</div>
          <div>
            <div class="jl-sheet-name">${esc(p.full_name || p.email || '—')}</div>
            <div class="jl-sheet-role">${esc(String(p.role || '').replace('_', ' '))}</div>
          </div>
        </div>
        <button class="jl-sheet-item" data-act="theme"><i class="fa-solid fa-circle-half-stroke"></i> Changer de thème</button>
        <button class="jl-sheet-item" data-act="lang"><i class="fa-solid fa-language"></i> Chanje lang</button>
        <button class="jl-sheet-item" data-act="lock"><i class="fa-solid fa-lock"></i> Sekirize aplikasyon an</button>
        <button class="jl-sheet-item danger" data-act="logout"><i class="fa-solid fa-arrow-right-from-bracket"></i> Déconnexion</button>
      </div>`;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeSheet(); });
    backdrop.querySelector('[data-act="theme"]').onclick = () => {
      document.getElementById('theme-btn')?.click(); closeSheet();
    };
    backdrop.querySelector('[data-act="lang"]').onclick = () => {
      closeSheet();
      (document.querySelector('.v30-lang-btn') || document.querySelector('[data-lang-btn]'))?.click();
    };
    backdrop.querySelector('[data-act="lock"]').onclick = () => {
      closeSheet();
      if (window.Lotri.appLock && window.Lotri.appLock.lockNow) window.Lotri.appLock.lockNow();
      else window.Lotri.toast('Cette fonction de sécurité arrive bientôt.', 'info');
    };
    backdrop.querySelector('[data-act="logout"]').onclick = () => { closeSheet(); window.Lotri.signOut(); };
  }
  function closeSheet() {
    const b = document.querySelector('.jl-sheet-backdrop');
    if (!b) return;
    b.classList.remove('open');
    setTimeout(() => b.remove(), 220);
  }

  /* ------------------- Bottom-nav (ak DOM meni ki egziste) ------------------- */
  function buildBottomNav() {
    if (document.querySelector('.jl-bottom-nav')) return;
    const links = Array.from(document.querySelectorAll('.sidebar > .side-scroll .side-link[data-view]'))
      .filter(a => !a.closest('.side-sub'));
    if (!links.length) return;

    const picks = links.slice(0, 5);
    const nav = document.createElement('nav');
    nav.className = 'jl-bottom-nav';
    nav.innerHTML = picks.map(a => {
      const icoHtml = a.querySelector('.ico')?.innerHTML || '<i class="fa-solid fa-circle"></i>';
      const label = a.querySelector('.lbl')?.textContent || '';
      return `<button type="button" data-view="${a.dataset.view}">${icoHtml}<span>${label}</span></button>`;
    }).join('');
    document.body.appendChild(nav);

    nav.querySelectorAll('button[data-view]').forEach(btn => {
      btn.addEventListener('click', () => window.LotriShell.go(btn.dataset.view));
    });
    syncBottomNavActive();
  }
  function syncBottomNavActive() {
    const cur = new URL(location.href).searchParams.get('view');
    document.querySelectorAll('.jl-bottom-nav button[data-view]').forEach(b => {
      b.classList.toggle('active', b.dataset.view === cur);
    });
  }

  /* ------------------- FAB (rezilta tiraj, si vi a egziste pou wòl la) ------------------- */
  function buildFab() {
    if (document.querySelector('.jl-fab')) return;
    const hasResults = document.querySelector('.side-link[data-view="rezilta"]');
    if (!hasResults) return;
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'jl-fab';
    fab.setAttribute('aria-label', 'Résultats des tirages');
    fab.innerHTML = '<i class="fa-solid fa-dice"></i>';
    fab.addEventListener('click', () => window.LotriShell.go('rezilta'));
    document.body.appendChild(fab);
  }

  function mountAll() {
    /* V64 — KOREKSYON RASIN "PC vid": `jl-appshell` se klas ki make
       "shell la monte" e tout koreksyon overflow/scroll pou desktop
       (v58-desktop-shell.css) mande `body.jl-appshell` pou yo aktive.
       Avant, klas la te SÈLMAN ajoute lè `isMobile()` te vre — sou PC
       li pa t janm parèt, kidonk okenn koreksyon desktop pa t janm
       pran efè. Klas la kounye a toujou prezan; se uniquement widget
       mobil yo (topbar 3-pwen, bottom-nav, FAB) ki rete gate pa
       isMobile(). */
    document.body.classList.add('jl-appshell');
    if (!isMobile()) return;
    buildTopbar();
    buildBottomNav();
    buildFab();
  }

  function unmountAll() {
    document.querySelector('.jl-bottom-nav')?.remove();
    document.querySelector('.jl-fab')?.remove();
    closeSheet();
  }

  document.addEventListener('lotri:ready', () => setTimeout(mountAll, 0));
  document.addEventListener('lotri:view', () => { syncBottomNavActive(); if (isMobile()) buildFab(); });
  window.addEventListener('resize', () => { isMobile() ? mountAll() : unmountAll(); });
})();
