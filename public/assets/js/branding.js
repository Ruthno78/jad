/* Branding + Configuration dinamik ----------------------------------------
 * `site_config` tab (Supabase) genyen menm fòm ak window.JADSTACK_DEFAULTS.
 * loadConfig() melanje defo yo ak sa ki nan baz done a e li aplike:
 *   - varyab CSS root (tèm)
 *   - logo header (rektangilè) + logo sidemenu (kare/wonn)
 *   - metadata paj (tit, favicon)
 *   - kontni footer/landing/kontak/legal/tikè (paj yo li state sa a)
 * ----------------------------------------------------------------------- */
(function(){
  window.Lotri = window.Lotri || {};
  const D = window.JADSTACK_DEFAULTS;
  const state = window.Lotri.config = JSON.parse(JSON.stringify(D));

  function merge(target, src){
    if (!src || typeof src !== 'object') return target;
    for (const k of Object.keys(src)){
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k]==='object' && !Array.isArray(target[k])){
        merge(target[k], v);
      } else if (v !== null && v !== undefined) {
        target[k] = v;
      }
    }
    return target;
  }

  // IMPORTANT: `theme` gen fòm { light:{...}, dark:{...} }. Nou aplike SÈLMAN
  // pakèt ki koresponn ak mòd aktyèl la (data-theme sou <html>), sinon
  // varyab yo ta ekri sou style inline la e yo ta REETE menm si moun nan
  // chanje pou mòd fonse — se sa ki te lakòz koulè/tèks chevoche nan dark mode.
  window.Lotri.applyTheme = function(theme){
    if (!theme) return;
    const root = document.documentElement;
    const mode = root.dataset.theme === 'dark' ? 'dark' : 'light';
    // Retirer ansyen override yo dabò pou pa gen rès ansyen mòd la ki kole.
    const known = ['--primary','--primary-hover','--accent','--accent-hover','--dark','--bg','--surface','--text','--radius'];
    known.forEach(k => root.style.removeProperty(k));
    const pack = theme[mode] || theme; // bak-konpatib ak ansyen fòma plat
    Object.keys(pack).forEach(k => { if (k.startsWith('--')) root.style.setProperty(k, pack[k]); });
  };

  // Lè moun nan chanje mòd (klè/fonse), reaplike pakèt koulè ki koresponn lan.
  document.addEventListener('theme-changed', () => window.Lotri.applyTheme(state.theme));

  // Fallback lokal — sèvi si `site_config` pa gen URL, OSWA si URL Supabase
  // a chaje men echwe reyèlman (bucket vid/prive/404). Konsa moun nan pa
  // janm wè yon logo kase, e nou gen yon plan B fyab san depann de Storage.
  const LOCAL_FALLBACK = {
    wide: 'assets/img/jadstacklotto_logo.png',
    mark: 'assets/img/logo.png'
  };

  function mountBrandImg(el, url, alt, localSrc, fallbackHtml){
    if (!url){ el.innerHTML = `<img alt="${escapeAttr(alt)}" src="${escapeAttr(localSrc)}">`; return; }
    const img = new Image();
    img.alt = alt;
    img.onload = () => { el.innerHTML=''; el.appendChild(img); };
    img.onerror = () => {
      console.warn('[branding] URL Supabase illisible, utilisation du repli local :', url);
      el.innerHTML = `<img alt="${escapeAttr(alt)}" src="${escapeAttr(localSrc)}">`;
    };
    img.src = url;
  }

  window.Lotri.paintBrand = function(){
    const b = state.brand || {};
    // Title / favicon
    if (b.name) document.title = document.title.replace(/JADSTACK LOTTO|Lovable/gi, b.name).trim() || b.name;
    if (b.favicon){
      let link = document.querySelector("link[rel='icon']");
      if (!link){ link=document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
      link.href = b.favicon;
    } else {
      let link = document.querySelector("link[rel='icon']");
      if (!link){ link=document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
      link.href = LOCAL_FALLBACK.mark;
    }
    // Logo rektangilè + kare/wonn — SÈLMAN si V34 (brand-logo.js) PA chaje.
    // V34 gen pwòp mekanis pentire pou [data-brand] avèk yon MutationObserver;
    // si toude script yo pentire sou menm eleman an an menm tan, sa kreye yon
    // kous kondisyon (logo ki fliker/enkonsistan). V34, lè li la, se sèl sous
    // verite a — `Lotri.v34.paintLogos` deja rele nan boot li.
    if (!window.Lotri.v34) {
      document.querySelectorAll('[data-brand="wide"]').forEach(el => {
        mountBrandImg(el, b.logo_wide, b.name || 'JADSTACK LOTTO', LOCAL_FALLBACK.wide);
      });
      document.querySelectorAll('[data-brand="mark"]').forEach(el => {
        mountBrandImg(el, b.logo_mark, b.name || 'JADSTACK LOTTO', LOCAL_FALLBACK.mark);
      });
    }
  };

  window.Lotri.paintFooter = function(){
    const f = state.footer || {};
    document.querySelectorAll('[data-footer]').forEach(host => {
      host.innerHTML = `
        <div class="fwrap">
          <div>
            <div class="logo-wide" data-brand="wide" style="height:44px;margin-bottom:.6rem"></div>
            <p class="muted" style="font-size:.9rem;max-width:340px">${escapeHtml(f.blurb||'')}</p>
            <div class="socials">${(f.socials||[]).filter(s=>s.url).map(s=>
              `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener" aria-label="${escapeAttr(s.label)}"><i class="${escapeAttr(s.icon)}"></i></a>`
            ).join('')}</div>
          </div>
          <div>
            <h4>${escapeHtml(f.legal_title||'Mentions légales')}</h4>
            ${(f.legal_links||[]).map(l=>`<a href="${escapeAttr(l.href)}">${escapeHtml(l.label)}</a>`).join('')}
          </div>
          <div>
            <h4>${escapeHtml(f.contact_title||'Contact')}</h4>
            ${f.phone   ? `<a href="tel:${escapeAttr(f.phone)}"><i class="fa-solid fa-phone fa-fw-icon"></i> ${escapeHtml(f.phone)}</a>`:''}
            ${f.email   ? `<a href="mailto:${escapeAttr(f.email)}"><i class="fa-solid fa-envelope fa-fw-icon"></i> ${escapeHtml(f.email)}</a>`:''}
            ${f.address ? `<a><i class="fa-solid fa-location-dot fa-fw-icon"></i> ${escapeHtml(f.address)}</a>`:''}
          </div>
        </div>
        <div class="copyright">${escapeHtml(f.copyright||'')}</div>`;
      window.Lotri.paintBrand();
    });
  };

  window.Lotri.loadConfig = async function(){
    // Chaje overrides depi tab site_config
    try {
      if (!window.Lotri.supabase) return state;
      const { data } = await window.Lotri.supabase.from('jl9_site_config').select('key,value');
      (data||[]).forEach(row => { if (state[row.key]!==undefined) merge(state[row.key], row.value); else state[row.key]=row.value; });
    } catch(_){}
    // Appliquer tèm + repentire mak/footer si yo prezan
    window.Lotri.applyTheme(state.theme);
    window.Lotri.paintBrand();
    window.Lotri.paintFooter();
    return state;
  };

  // Bak-konpatib ak ansyen kòd
  window.Lotri.loadBranding = window.Lotri.loadConfig;

  /* ---------------------------------------------------------------------
   * Panel "Dernière modification" — parèt sou paj ki gen chanjman konfig,
   * montre ansyen -> nouvo valè, ak bouton Retabli / Fermer (popup).
   * ------------------------------------------------------------------- */
  function diffSummary(oldV, newV){
    const o = oldV || {}, n = newV || {};
    const keys = Array.from(new Set([...Object.keys(o), ...Object.keys(n)]));
    const rows = [];
    for (const k of keys){
      const a = JSON.stringify(o[k]); const b = JSON.stringify(n[k]);
      if (a === b) continue;
      const short = s => { if (s===undefined) return '—'; s=String(s); return s.length>60 ? s.slice(0,57)+'…' : s; };
      rows.push({ k, before: short(a), after: short(b) });
      if (rows.length >= 4) break;
    }
    return rows;
  }

  window.Lotri.mountChangePanel = async function(){
    try {
      if (!window.Lotri.supabase) return;
      const { data, error } = await window.Lotri.supabase.rpc('jl9_rpc_recent_config_changes', { _limit: 1 });
      if (error || !data || !data.length) return;
      const chg = data[0];
      const seenKey = 'jl:seen-change:' + chg.id;
      if (localStorage.getItem(seenKey)) return; // moun nan deja fèmen/wè sa a

      const profile = await window.Lotri.getProfile();
      const canRestore = profile && profile.role === 'super_admin';
      const rows = diffSummary(chg.old_value, chg.new_value);
      if (!rows.length && chg.old_value) return; // pa gen diferans vizib

      let host = document.getElementById('change-panel');
      if (!host){ host = document.createElement('div'); host.id = 'change-panel'; host.className = 'change-panel'; document.body.appendChild(host); }
      host.innerHTML = `
        <div class="change-panel-hd">
          <strong><i class="fa-solid fa-clock-rotate-left"></i> Dernière modification — ${escapeHtml(chg.key)}</strong>
          <button class="btn btn-icon btn-ghost btn-sm" id="cp-close" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="change-panel-body">
          ${rows.length ? rows.map(r=>`<div class="cp-row"><span class="cp-k">${escapeHtml(r.k)}</span>
              <span class="cp-old">${escapeHtml(r.before)}</span><i class="fa-solid fa-arrow-right"></i>
              <span class="cp-new">${escapeHtml(r.after)}</span></div>`).join('')
            : `<div class="cp-row muted">Premye vèsyon konfigirasyon sa a.</div>`}
        </div>
        ${canRestore ? `<div class="change-panel-ft">
          <button class="btn btn-sm" id="cp-dismiss">Fermer</button>
          <button class="btn btn-sm btn-primary" id="cp-restore"><i class="fa-solid fa-rotate-left"></i> Restaurer l'ancienne valeur</button>
        </div>` : ''}`;

      const dismiss = () => { localStorage.setItem(seenKey, '1'); host.remove(); };
      document.getElementById('cp-close').onclick = dismiss;
      const dEl = document.getElementById('cp-dismiss'); if (dEl) dEl.onclick = dismiss;
      const rEl = document.getElementById('cp-restore');
      if (rEl) rEl.onclick = async () => {
        // Retabli = re-sove ANSYEN valè a (kreye yon nouvo antre istorik tou).
        if (!chg.old_value) { window.Lotri.toast('Aucune version antérieure à restaurer.', 'error'); return; }
        const { error: uerr } = await window.Lotri.supabase.from('jl9_site_config')
          .upsert({ key: chg.key, value: chg.old_value, updated_at: new Date().toISOString() });
        if (uerr) { window.Lotri.toast(uerr.message, 'error'); return; }
        window.Lotri.toast('Configuration retabli.', 'success');
        dismiss();
        await window.Lotri.loadConfig(); window.Lotri.paintBrand();
      };
    } catch(_){ /* silans — panel la pa kritik */ }
  };

  function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s){ return escapeHtml(s); }
  window.Lotri.escapeHtml = window.Lotri.escapeHtml || escapeHtml;
})();
