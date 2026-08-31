/* =====================================================================
 * JADSTACK LOTTO — V27 FAZ 4 · Lyen aplikasyon POS nan footer AJAN
 * ---------------------------------------------------------------------
 *  Agent an PA gen popup ni card: paj `ajan.html` LI MENM se aplikasyon
 *  an (WebView), kidonk yon sèl lyen diskrè nan footer la — minimalist.
 *  Ti pwen limen (badge/pulse) parèt uniquement si Super Admin aktive l.
 *
 *  Modil sa a rete nan `assets/js/ajan/` pou tout kòd ajan an rete nan
 *  YON SÈL DOSYE (egzijans « primordial »): login-ajan.js, views.js,
 *  profile.js, rapo-jounen.js, apk-footer-ajan.js, ajan-app.css.
 *  Li otonòm: li pa depann de assets/js/v27/apk-card.js.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TABLE = 'jl_agent_app_links';
  const BUCKET = 'agent-apps';
  let painted = false;

  function urlFor(r) {
    if (r.external_url) return r.external_url;
    if (!r.file_path) return null;
    try { return L.supabase.storage.from(BUCKET).getPublicUrl(r.file_path).data.publicUrl; }
    catch (_) { return null; }
  }

  async function firstLink() {
    try {
      const { data, error } = await L.supabase.from(TABLE)
        .select('*').eq('is_active', true).order('sort_order').limit(5);
      if (error) return null;
      const rows = (data || []).map(r => ({ ...r, url: urlFor(r) })).filter(r => r.url);
      return rows[0] || null;
    } catch (_) { return null; }
  }

  async function mount() {
    if (painted) return;
    if (document.documentElement.dataset.role !== 'agent') return;
    const foot = document.querySelector('[data-footer-mini]');
    if (!foot) return;
    const row = await firstLink();
    if (!row) return;
    painted = true;
    const el = document.createElement('div');
    el.className = 'jl27-ajan-applink';
    el.innerHTML = `
      <a href="${esc(row.url)}" download target="_blank" rel="noopener">
        <i class="fa-solid fa-mobile-screen-button"></i>
        ${esc(row.platform_label || 'Application POS')}${row.version_label ? ' · ' + esc(row.version_label) : ''}
      </a>
      ${row.badge_enabled ? `<span class="jl27-dot">${esc(row.badge_text || 'Nouvelle version disponible')}</span>` : ''}`;
    foot.appendChild(el);
  }

  document.addEventListener('lotri:ready', () => setTimeout(mount, 900));
  document.addEventListener('lotri:view', () => { if (!painted) mount(); });
})();
