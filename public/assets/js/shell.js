/* =====================================================================
 * Shell komen pou paj wòl yo (v6)
 *  - Header fiks ki PASE SOU TÈT sidemenu a; logo rektangilè nan kwen goch,
 *    wotè = header - 2px, lajè otomatik.
 *  - Sidemenu: logo kare/wonn santre anba header, FIKS pandan meni an skwol.
 *  - Menu dropdown estil w3schools: yon sèl antre prensipal ki ouvri sou-opsyon,
 *    flèch ki vire, animasyon 260ms, aria-expanded + sipò klavye.
 *  - Klik sou yon (sou)meni -> chanje vi + scroll/flash sou seksyon an.
 * ===================================================================== */
window.LotriShell = (function(){
  const views = {};
  function register(key, def){ views[key] = def; }
  /* V10 — konsolidasyon paj: yon vi ka reyitilize yon lòt vi ki deja anrejistre. */
  function get(key){ return views[key]; }
  function firstKey(){ return Object.keys(views)[0]; }
  function currentView(){ return new URL(location.href).searchParams.get('view'); }

  function go(view, section){
    const u = new URL(location.href);
    if (view) u.searchParams.set('view', view); else u.searchParams.delete('view');
    if (section) u.searchParams.set('sec', section); else u.searchParams.delete('sec');
    history.pushState({}, '', u.toString());
    render();
  }
  window.addEventListener('popstate', render);

  function markActive(){
    const cur = currentView() || firstKey();
    document.querySelectorAll('.side-link[data-view]').forEach(a=>{
      if (a.dataset.view === cur){
        a.setAttribute('aria-current','page');
        const sub = a.closest('.side-sub');
        if (sub && !sub.classList.contains('open')){
          sub.classList.add('open');
          const trg = document.querySelector(`[aria-controls="${sub.id}"]`);
          if (trg) trg.setAttribute('aria-expanded','true');
        }
      } else a.removeAttribute('aria-current');
    });
  }

  function render(){
    const key = currentView() || firstKey();
    const def = views[key] || views[firstKey()];
    markActive();
    const host = document.getElementById('view');
    if (!host || !def) return;
    host.innerHTML = '<div class="spinner"></div>';
    const guard = new Promise((_, rej)=> setTimeout(()=> rej(new Error('La page met trop de temps à charger.')), 15000));
    Promise.race([Promise.resolve(def.render(host)), guard])
      .then(()=>{
        if (window.Lotri.lockfield) window.Lotri.lockfield.wire(host);
        if (window.Lotri.syslock) window.Lotri.syslock.wire(host);
        /* v9.4 — chak vi ki fini chaje reklame yon rekonte badj yo. */
        if (window.Lotri.badges) window.Lotri.badges.refresh();
        document.dispatchEvent(new CustomEvent('lotri:view', { detail: host }));
        const sec = new URL(location.href).searchParams.get('sec');
        if (sec) setTimeout(()=> window.Lotri.ui.focusSection(sec), 120);
      })

      .catch(err=>{
        console.error(err);
        host.innerHTML = '<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>Erreur: '+window.Lotri.escapeHtml(err.message||String(err))+'</div>';
      });
  }

  /* Konstwi yon antre meni. `item` ka:
     { key, label, icon }                       -> lyen senp
     { label, icon, children:[{key,label,sec}] } -> dropdown w3schools */
  function menuHtml(items){
    const esc = window.Lotri.escapeHtml;
    return items.map((it, idx)=>{
      if (!it.children){
        return `<button class="side-link" data-view="${esc(it.key)}" ${it.sec?`data-sec="${esc(it.sec)}"`:''} type="button">
                  <span class="ico">${it.icon||''}</span><span class="lbl">${esc(it.label)}</span></button>`;
      }
      const id = 'sub-'+idx;
      return `<button class="side-link" type="button" aria-expanded="false" aria-controls="${id}" data-toggle="${id}">
                <span class="ico">${it.icon||''}</span><span class="lbl">${esc(it.label)}</span>
                <i class="fa-solid fa-chevron-right caret"></i></button>
              <div class="side-sub" id="${id}"><div>
                ${it.children.map(ch=>`<button class="side-link" type="button" data-view="${esc(ch.key)}" ${ch.sec?`data-sec="${esc(ch.sec)}"`:''}>
                    <span class="lbl">${esc(ch.label)}</span></button>`).join('')}
              </div></div>`;
    }).join('');
  }

  async function mount(menu, brandLabel){
    const profile = await (window.__lotriProfile
      ? Promise.resolve(window.__lotriProfile)
      : new Promise((res, rej)=>{
          const t = setTimeout(()=> rej(new Error('Profil non chargé')), 15000);
          document.addEventListener('lotri:ready', e=>{ clearTimeout(t); res(e.detail); }, { once:true });
        })).catch(err=>{
          document.body.innerHTML = `<div class="empty" style="margin-top:4rem">
            <i class="fa-solid fa-triangle-exclamation"></i><h3>Impossible de charger l'application</h3>
            <p class="muted">${window.Lotri.escapeHtml(err.message)}</p>
            <button class="btn btn-primary" onclick="location.reload()">Réessayer</button></div>`;
          return null;
        });
    if (!profile) return;

    const esc = window.Lotri.escapeHtml;
    /* V64 — grid PC fèt DIRÈK nan CSS (@media min-width:960px sou
       .shell). Okenn atribi `data-desktop` pa ekri ankò — se lajè
       ekran an sèl (CSS) ki deside, pou TOUT 4 wòl yo menm jan. */
    document.body.innerHTML = `
      <header class="appbar">
        <div class="left">
          <button class="btn btn-icon btn-ghost" id="collapse-btn" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>
          <span class="logo-wide" data-brand="wide" aria-label="JADSTACK LOTTO"></span>
        </div>
        <div class="right">
          <span class="badge">${esc(String(profile.role||'').replace('_',' '))}</span>
          <button class="btn btn-icon btn-ghost" id="theme-btn" title="Changer de thème"></button>
          <div class="avatar">${esc((profile.full_name||profile.email||'?').charAt(0).toUpperCase())}</div>
          <button class="btn btn-sm btn-ghost" id="logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Déconnexion</button>
        </div>
      </header>
      <div class="shell" id="shell">
        <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
        <aside class="sidebar">
          ${profile.role === 'super_admin'
            ? `<div class="logo-mark" data-brand="mark" title="${esc(brandLabel||'')}"></div>`
            : ''}
          <div id="side-company"></div>
          <div class="side-scroll">
            <div class="side-search"><input class="input" id="menu-search" placeholder="Rechercher dans le menu…" aria-label="Rechercher dans le menu"></div>
            ${menuHtml(menu)}
          </div>
        </aside>
        <main class="view" id="view"></main>
      </div>`;

    window.Lotri.paintBrand();
    window.Lotri.loadConfig().then(()=> window.Lotri.paintBrand());
    renderCompanyBadge(profile);

    // Dropdown (klik + klavye)
    document.querySelectorAll('[data-toggle]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const sub = document.getElementById(btn.dataset.toggle);
        const open = sub.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      btn.addEventListener('keydown', e=>{ if (e.key==='Enter'||e.key===' '){ e.preventDefault(); btn.click(); } });
    });
    const shellEl = document.getElementById('shell');
    const isWide = ()=> window.matchMedia('(min-width: 960px)').matches;
    document.querySelectorAll('.side-link[data-view]').forEach(a=>{
      a.addEventListener('click', ()=>{
        go(a.dataset.view, a.dataset.sec);
        if (!isWide()) closeDrawer();
      });
    });
    function openDrawer(){
      shellEl.classList.add('drawer-open');
      // Sèl sistèm lock/unlock skwòl la se v34/scroll-fix.js — rele l isit
      // pou evite 2 sistèm k ap goumen pou menm klas la san youn konnen lòt.
      if (window.Lotri.v34 && window.Lotri.v34.syncScroll) window.Lotri.v34.syncScroll();
    }
    function closeDrawer(){
      shellEl.classList.remove('drawer-open');
      if (window.Lotri.v34 && window.Lotri.v34.syncScroll) window.Lotri.v34.syncScroll();
    }
    document.getElementById('sidebar-backdrop').addEventListener('click', closeDrawer);

    /* Jès swipe (ouvri/fèmen tiwa a) — jere pa v34/scroll-fix.js uniquement
       (`.jl34-edge` + gestures()) pou evite 2 lisnè touchstart/touchend
       ki ka konfonn menm jès la. shell.js uniquement ekspoze openDrawer/
       closeDrawer pi wo a pou lòt kòd (klik sou lyen meni, elt.) itilize. */


    // Rechèch nan meni
    const search = document.getElementById('menu-search');
    search.addEventListener('input', ()=>{
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('.side-scroll .side-link').forEach(l=>{
        const txt = (l.textContent||'').toLowerCase();
        l.style.display = (!q || txt.includes(q)) ? '' : 'none';
      });
      if (q) document.querySelectorAll('.side-sub').forEach(s=> s.classList.add('open'));
    });

    document.getElementById('logout-btn').addEventListener('click', ()=> window.Lotri.signOut());
    document.getElementById('collapse-btn').addEventListener('click', ()=>{
      if (isWide()) shellEl.classList.toggle('collapsed');
      else shellEl.classList.contains('drawer-open') ? closeDrawer() : openDrawer();
    });
    window.addEventListener('resize', ()=>{ if (isWide()) closeDrawer(); });
    const themeBtn = document.getElementById('theme-btn');
    const paint = ()=> themeBtn.innerHTML = window.Lotri.themeIcon();
    themeBtn.addEventListener('click', ()=>{ window.Lotri.toggleTheme(); paint(); });
    paint();

    window.Lotri.ui.armSessionTimeout((window.Lotri.config.ops||{}).session_timeout_min);
    render();
    if (window.Lotri.mountChangePanel) window.Lotri.mountChangePanel();

    /* v8 — sèvis an silans: rapò otomatik + fèmti tiraj + konte notifikasyon */
    if (window.Lotri.phantom) window.Lotri.phantom.arm(profile);
    if (window.Lotri.security && profile.role === 'super_admin') window.Lotri.security.armDrawAutoClose();
    if (window.Lotri.notifications) window.Lotri.notifications.arm(profile);
    /* V87 — push natif Android (tokèn FCM + notifikasyon aksyon rapid) */
    if (window.Lotri.push) window.Lotri.push.arm(profile);
    /* v9.4 — badj meni yo + tchèk fen mwa a (Super Admin uniquement). */
    if (window.Lotri.badges) window.Lotri.badges.arm();
    if (window.Lotri.monthlyCheck && profile.role === 'super_admin') window.Lotri.monthlyCheck.arm(profile);

    return profile;
  }


  /* Logo Compagnie — uniquement sou paj Compagnie ak Agent */
  /* Ki paj pwofil chak wòl ale ladan lè li klike logo konpayi an. */
  const PROFILE_VIEW = { company: 'cprofile', agent: 'aprofile', supervisor: 'aprofile' };

  async function renderCompanyBadge(profile){
    const host = document.getElementById('side-company');
    if (!host || !profile.company_id) return;
    // Logo de la compagnie an se SÈLMAN pou Compagnie / Agent / Sipèvizè.
    // Super Admin li menm wè logo platfòm nan (data-brand="mark") anwo a.
    if (!['company','agent','supervisor'].includes(profile.role)) return;
    const esc = window.Lotri.escapeHtml;
    try {
      const { data } = await window.Lotri.supabase.from('jl9_companies')
        .select('name, logo_url, email').eq('id', profile.company_id).maybeSingle();
      if (!data) return;
      const view = PROFILE_VIEW[profile.role];
      const editable = profile.role === 'company';
      const title = editable ? 'Aller au profil de la compagnie' : 'Consulter le profil de la compagnie (lecture seule)';
      host.innerHTML = `<button type="button" class="side-brand-btn" id="side-company-btn"
          title="${esc(title)}" aria-label="${esc(title)}">
        <div class="logo-mark" style="padding:.9rem 0">
          ${data.logo_url
            ? `<img src="${esc(data.logo_url)}" alt="${esc(data.name)}" style="width:56px;height:56px;border-radius:var(--radius-sm);object-fit:contain">`
            : `<span class="fallback" style="width:56px;height:56px;font-size:1.1rem;border-radius:var(--radius-sm)">${esc((data.name||'K').charAt(0).toUpperCase())}</span>`}
        </div>
        <div class="muted" style="text-align:center;font-size:.8rem;padding:.1rem 0 .6rem;font-weight:600">${esc(data.name)}</div>
      </button><div style="border-bottom:1px solid var(--border)"></div>`;
      window.Lotri._companyName = data.name || '';
      window.Lotri._companyLogo = data.logo_url || '';
      window.Lotri._companyEmail = data.email || '';   /* notifications e-mail (H.6) */
      const btn = document.getElementById('side-company-btn');
      if (btn && view) btn.addEventListener('click', ()=> go(view));
    } catch(_){}
  }


  return { register, get, mount, go, render };
})();
