/* =====================================================================
 * JADSTACK LOTTO — V27 FAZ 4
 * Card / popup pataje « Télécharger Application POS » (APK / iOS)
 * ---------------------------------------------------------------------
 *  Yon sèl sous verite pou tout kote card la parèt:
 *    1. Popup Compagnie apre « Générer X agents » (siksè)
 *    2. Bouton anba paj lis ajan (Compagnie / Super Admin)
 *    3. Paj Surveillance des machines (Super Admin) — bouton byen ekate
 *    4. Footer ajan.html — jere nan assets/js/ajan/apk-footer-ajan.js
 *    5. Panèl konfig Super Admin — assets/js/super-admin/apk-config.js
 *
 *  Rôle:
 *    • Super Admin : wè card la + ka KOPYE lyen an + konfigire.
 *    • Compagnie     : wè popup la + footer ak lyen download dirèk.
 *    • Agent        : PA gen popup — uniquement yon lyen diskrè nan footer.
 *
 *  Okenn koulè fiks (tout nan v27-apk.css sou --primary/--accent).
 *  Okenn lojik Balans/Vant/Pou peye pa touche.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SB = () => L.supabase;

  const BUCKET = 'agent-apps';
  const TABLE = 'jl_agent_app_links';

  let cache = null;

  /* --- Données ---------------------------------------------------------- */
  function publicUrl(row) {
    if (row.external_url) return row.external_url;
    if (!row.file_path) return null;
    try { return SB().storage.from(BUCKET).getPublicUrl(row.file_path).data.publicUrl; }
    catch (_) { return null; }
  }

  /* Chaje lyen yo. `all=true` (Super Admin) chaje sa ki dezaktive tou. */
  async function load(all) {
    if (!all && cache) return cache;
    let q = SB().from(TABLE).select('*').order('sort_order', { ascending: true });
    if (!all) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) { console.warn('[v27-apk]', error.message); return []; }
    const rows = (data || []).map(r => ({ ...r, url: publicUrl(r) })).filter(r => all || r.url);
    if (!all) cache = rows;
    return rows;
  }

  function invalidate() { cache = null; }

  function platIcon(label) {
    const s = String(label || '').toLowerCase();
    if (s.includes('ios') || s.includes('iphone') || s.includes('apple')) return 'fa-brands fa-apple';
    if (s.includes('android') || s.includes('apk')) return 'fa-brands fa-android';
    return 'fa-solid fa-mobile-screen-button';
  }

  function badgeHtml(row) {
    if (!row.badge_enabled) return '';
    return `<span class="jl27-dot">${esc(row.badge_text || 'Nouvelle version disponible')}</span>`;
  }

  function itemHtml(row, opts) {
    const dl = row.url
      ? `<a class="btn btn-sm btn-primary" href="${esc(row.url)}" download target="_blank" rel="noopener">
           <i class="fa-solid fa-download"></i> Télécharger</a>`
      : `<span class="badge badge-danger">Indisponible</span>`;
    const copy = (opts && opts.canCopy && row.url)
      ? `<button class="btn btn-sm btn-icon" data-apk-copy="${esc(row.url)}" title="Copier le lien">
           <i class="fa-solid fa-link"></i></button>`
      : '';
    return `
      <div class="jl27-apk-item">
        <div class="jl27-apk-meta">
          <div class="jl27-apk-plat">
            <i class="${platIcon(row.platform_label)}"></i>
            ${esc(row.platform_label || 'Application')}
            ${row.version_label ? `<span class="badge">${esc(row.version_label)}</span>` : ''}
            ${badgeHtml(row)}
          </div>
          ${row.description ? `<div class="jl27-apk-desc" title="${esc(row.description)}">${esc(row.description)}</div>` : ''}
        </div>
        <div class="jl27-apk-acts">${copy}${dl}</div>
      </div>`;
  }

  /* --- Card (blòk ki ka antre nan nenpòt paj) ------------------------ */
  function cardHtml(rows, opts) {
    const body = rows.length
      ? rows.map(r => itemHtml(r, opts)).join('')
      : `<div class="jl27-apk-empty">
           <i class="fa-solid fa-box-open"></i>
           Pa gen okenn aplikasyon ki konfigire pou kounye a.
         </div>`;
    const first = rows.find(r => r.url);
    return `
      <div class="jl27-apk-hd">
        <span class="jl27-apk-ico"><i class="fa-solid fa-mobile-screen-button"></i></span>
        <div>
          <h3>Télécharger Application POS</h3>
          <p class="muted" style="margin:.1rem 0 0;font-size:.84rem">
            Enstale aplikasyon an sou telefòn ajan an pou vann tikè menm jan ak sou paj entènèt la.
          </p>
        </div>
      </div>
      <div class="jl27-apk-list">${body}</div>
      <div class="jl27-apk-ft">
        ${first
          ? `<a class="jl27-apk-dl" href="${esc(first.url)}" download target="_blank" rel="noopener">
               <i class="fa-solid fa-circle-down"></i> Telechajman dirèk — ${esc(first.platform_label || 'Application')}
             </a>`
          : `<span class="muted" style="font-size:.82rem">L'administration rendra le lien disponible.</span>`}
        <button class="btn btn-ghost btn-sm" data-apk-close>Fermer</button>
      </div>`;
  }

  /* Enjekte card la nan yon host (pa yon popup) */
  async function renderCard(host, opts) {
    if (!host) return;
    opts = opts || {};
    const rows = await load(false);
    host.classList.add('card');
    host.innerHTML = `<div style="padding:1rem">${cardHtml(rows, opts)}</div>`;
    wire(host, null);
  }

  /* --- Popup --------------------------------------------------------- */
  async function openModal(opts) {
    opts = opts || {};
    const rows = await load(false);
    const back = document.createElement('div');
    back.className = 'modal-backdrop jl27-apk-modal';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Télécharger Application POS">
        ${opts.intro ? `<div class="alert alert-success" style="margin-bottom:.7rem">${esc(opts.intro)}</div>` : ''}
        ${cardHtml(rows, opts)}
      </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    wire(back, close);
    const key = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', key); } };
    document.addEventListener('keydown', key);
    return back;
  }

  function wire(root, close) {
    root.querySelectorAll('[data-apk-close]').forEach(b => {
      b.onclick = () => (close ? close() : b.closest('.modal-backdrop')?.remove());
    });
    root.querySelectorAll('[data-apk-copy]').forEach(b => {
      b.onclick = async () => {
        const url = b.getAttribute('data-apk-copy');
        try { await navigator.clipboard.writeText(url); L.toast && L.toast('Lien copié', 'success'); }
        catch (_) {
          const ta = document.createElement('textarea');
          ta.value = url; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); L.toast && L.toast('Lien copié', 'success'); }
          catch (__) { L.toast && L.toast('Impossible de copier le lien', 'error'); }
          ta.remove();
        }
      };
    });
  }

  /* --- Bouton lansman pataje ----------------------------------------- */
  /* Mete yon bouton « Télécharger Application POS » nan yon host.
     `spaced=true` pou paj Surveillance des machines (byen ekate ak rès la). */
  async function mountButton(host, o) {
    if (!host) return;
    o = o || {};
    const prof = await L.getProfile().catch(() => null);
    const role = (prof && prof.role) || '';
    if (role !== 'company' && role !== 'super_admin') return;
    if (host.querySelector('.jl27-apk-launch')) return;
    const rows = await load(false);
    const hasNew = rows.some(r => r.badge_enabled);
    const wrap = document.createElement('div');
    wrap.className = 'jl27-apk-launch' + (o.spaced ? ' is-spaced' : '');
    wrap.innerHTML = `<button class="btn btn-primary" type="button">
        <i class="fa-solid fa-mobile-screen-button"></i> Télécharger Application POS
        ${hasNew ? '<span class="jl27-dot" aria-hidden="true"></span>' : ''}
      </button>`;
    wrap.querySelector('button').onclick = () => openModal({ canCopy: role === 'super_admin' });
    host.appendChild(wrap);
  }

  L.apk = {
    BUCKET, TABLE,
    load, invalidate, publicUrl,
    renderCard, openModal, mountButton
  };
})();
