/* =====================================================================
 * JADSTACK LOTTO V11 — NWAYO UI
 *   Lotri.v11.crumbs()    -> breadcrumb stil Supabase
 *   Lotri.v11.imgInput()  -> input imaj modèn (icon/kamera, bòdi pwenti)
 *   Lotri.v11.rowCard()   -> klike yon liy tablo -> card popup
 *   Lotri.v11.money()     -> HTG toupatou
 *   Lotri.v11.avatar()    -> lèt inisyal + koulè inik
 *   Lotri.v11.filters()   -> filtè dat fiks OSWA peryòd
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const esc = L.escapeHtml || (s => String(s ?? ''));
  const SB = () => L.supabase;
  const v11 = (L.v11 = L.v11 || {});

  /* ---------- Lajan: HTG toupatou ---------- */
  v11.money = n => Number(n || 0).toLocaleString('fr-HT', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }) + ' HTG';
  v11.dt = s => (s ? new Date(s).toLocaleString('fr-HT') : '—');

  /* ---------- Koulè inik ki sanble ak koulè sit la ---------- */
  v11.hue = txt => {
    let h = 0;
    String(txt || '?').split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) % 360; });
    return h;
  };
  v11.color = txt => `hsl(${v11.hue(txt)} 58% 42%)`;
  v11.initial = txt => String(txt || '?').trim().charAt(0).toUpperCase() || '?';

  v11.avatar = (name, url, cls) => url
    ? `<span class="v11-av ${cls || ''}"><img src="${esc(url)}" alt="${esc(name || '')}"></span>`
    : `<span class="v11-av ${cls || ''}" style="--av:${v11.color(name)}">${esc(v11.initial(name))}</span>`;

  /* ---------- Breadcrumb (stil Supabase) ---------- */
  /* Lotri.v11.crumbs([{label:'dashboard', view:'dashboard'}, {label:'rezilta'}]) */
  v11.crumbs = function (items) {
    const arr = (items || []).filter(Boolean);
    if (!arr.length) return '';
    const parts = arr.map((it, i) => {
      const last = i === arr.length - 1;
      const lbl = esc(it.label);
      const node = last
        ? `<span class="cur">${lbl}</span>`
        : (it.view ? `<button type="button" data-crumb="${esc(it.view)}">${lbl}</button>` : `<span>${lbl}</span>`);
      return node + (last && arr.length === 1 ? ' <span class="sep">&rsaquo;</span>' : '');
    });
    return `<nav class="v11-crumbs" aria-label="Chemin">${parts.join(' <span class="sep">&rsaquo;</span> ')}</nav>`;
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-crumb]');
    if (b && window.LotriShell) window.LotriShell.go(b.dataset.crumb);
  });

  /* ---------- Input imaj modèn ---------- */
  /* <div data-v11-img data-bucket="jl11-media" data-round="1" data-src="..."></div>
     Evènman: element.addEventListener('v11:image', e => e.detail.url) */
  v11.imgInput = function (opts) {
    opts = opts || {};
    const id = 'v11img-' + Math.random().toString(36).slice(2, 8);
    return `<label class="v11-img ${opts.round ? 'round' : ''} ${opts.wide ? 'wide' : ''}"
              data-v11-img id="${id}" data-bucket="${esc(opts.bucket || 'jl11-media')}"
              data-folder="${esc(opts.folder || '')}" title="${esc(opts.title || 'Cliquez pour changer l\'image')}">
              ${opts.src
                ? `<img src="${esc(opts.src)}" alt="${esc(opts.alt || '')}">`
                : `<span class="v11-img-ph"><i class="fa-solid fa-camera"></i>${esc(opts.label || 'Ajouter une image')}</span>`}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" aria-label="${esc(opts.title || 'Imaj')}">
              <span class="v11-img-edit"><i class="fa-solid fa-pen"></i></span>
            </label>`;
  };

  async function upload(box, file) {
    if (!/^image\//.test(file.type)) throw new Error('Seules les images sont acceptées.');
    if (file.size > 4 * 1024 * 1024) throw new Error('Imaj la twò gwo (maks 4 Mo).');
    const bucket = box.dataset.bucket || 'jl11-media';
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${box.dataset.folder || 'general'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await SB().storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    const { data } = SB().storage.from(bucket).getPublicUrl(path);
    return (data && data.publicUrl) || null;
  }

  document.addEventListener('change', async e => {
    const input = e.target;
    if (!input.matches('[data-v11-img] input[type=file]')) return;
    const box = input.closest('[data-v11-img]');
    const file = input.files && input.files[0];
    if (!file) return;
    box.classList.add('busy');
    try {
      const url = await upload(box, file);
      box.querySelector('.v11-img-ph')?.remove();
      let img = box.querySelector('img');
      if (!img) { img = document.createElement('img'); box.prepend(img); }
      img.src = url;
      box.dataset.url = url;
      box.dispatchEvent(new CustomEvent('v11:image', { detail: { url }, bubbles: true }));
      L.toast && L.toast('L\'image est enregistrée.', 'success');
    } catch (err) {
      L.toast && L.toast(err.message, 'error');
    } finally {
      box.classList.remove('busy');
      input.value = '';
    }
  });

  /* ---------- Card popup detay ---------- */
  v11.popup = function (title, htmlOrRows, opts) {
    opts = opts || {};
    const body = Array.isArray(htmlOrRows)
      ? `<div class="v11-kv">${htmlOrRows.map(r =>
          `<div class="k">${esc(r[0])}</div><div class="v">${r[2] ? r[1] : esc(r[1] ?? '—')}</div>`).join('')}</div>`
      : (htmlOrRows || '');
    const back = document.createElement('div');
    back.className = 'v11-pop';
    back.innerHTML = `<div class="v11-pop-card" role="dialog" aria-modal="true">
        <div class="v11-pop-hd">
          <div><h3>${esc(title)}</h3>${opts.subtitle ? `<p class="muted" style="margin:.15rem 0 0;font-size:.78rem">${esc(opts.subtitle)}</p>` : ''}</div>
          <button class="btn btn-icon btn-ghost" data-close aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>
        </div>
        ${body}
        ${opts.footer ? `<div class="row" style="justify-content:flex-end;gap:.5rem;margin-top:1rem">${opts.footer}</div>` : ''}
      </div>`;
    document.body.appendChild(back);
    const close = () => { back.remove(); document.removeEventListener('keydown', key); };
    const key = ev => { if (ev.key === 'Escape') close(); };
    back.addEventListener('click', ev => { if (ev.target === back) close(); });
    back.querySelector('[data-close]').onclick = close;
    document.addEventListener('keydown', key);
    return { el: back, close };
  };

  /* ---------- Klike yon liy tablo -> card popup ---------- */
  /* Mete data-v11-row='{"Nom":"x","Montant":"y"}' ak data-v11-title sou <tr> */
  v11.wireRows = function (root) {
    (root || document).querySelectorAll('tr[data-v11-row]').forEach(tr => {
      if (tr.dataset.v11Wired) return;
      tr.dataset.v11Wired = '1';
      tr.classList.add('v11-clickable');
      tr.addEventListener('click', ev => {
        if (ev.target.closest('button,a,input,select,label')) return;
        let rows = [];
        try { rows = Object.entries(JSON.parse(tr.dataset.v11Row)); } catch (_) { return; }
        v11.popup(tr.dataset.v11Title || 'Détails', rows.map(([k, val]) => [k, val]));
      });
    });
  };
  document.addEventListener('lotri:view', e => v11.wireRows(e.detail));

  /* ---------- Filtres dat fiks / peryòd ---------- */
  v11.filters = function (extra) {
    return `<div class="v11-filters" data-v11-filters>
      <div class="fld"><label>Mòd</label>
        <select class="select" data-f="mode">
          <option value="all">Tous</option><option value="day">Une date fixe</option>
          <option value="range">Une période</option>
        </select></div>
      <div class="fld" data-only="day range"><label>Du</label><input class="input" type="date" data-f="from"></div>
      <div class="fld" data-only="range"><label>Au</label><input class="input" type="date" data-f="to"></div>
      ${extra || ''}
      <button class="btn btn-primary btn-sm" data-f="apply"><i class="fa-solid fa-filter"></i> Filtrer</button>
    </div>`;
  };
  v11.readFilters = function (root) {
    const box = (root || document).querySelector('[data-v11-filters]');
    if (!box) return { mode: 'all' };
    const g = k => box.querySelector(`[data-f="${k}"]`);
    return { mode: g('mode').value, from: g('from') ? g('from').value : '', to: g('to') ? g('to').value : '' };
  };
  v11.wireFilters = function (root, onApply) {
    const box = (root || document).querySelector('[data-v11-filters]');
    if (!box) return;
    const sync = () => {
      const m = box.querySelector('[data-f="mode"]').value;
      box.querySelectorAll('[data-only]').forEach(el => {
        el.style.display = el.dataset.only.split(' ').includes(m) ? '' : 'none';
      });
    };
    box.querySelector('[data-f="mode"]').addEventListener('change', sync);
    box.querySelector('[data-f="apply"]').addEventListener('click', () => onApply(v11.readFilters(root)));
    sync();
  };
  /* Appliquer filtè a sou yon lis objè ki gen yon chan dat */
  v11.applyDate = function (rows, field, f) {
    if (!f || f.mode === 'all') return rows;
    return (rows || []).filter(r => {
      const d = r[field] ? new Date(r[field]) : null;
      if (!d) return false;
      const iso = d.toISOString().slice(0, 10);
      if (f.mode === 'day') return !f.from || iso === f.from;
      return (!f.from || iso >= f.from) && (!f.to || iso <= f.to);
    });
  };

  /* ---------- Toast ki mennen yon kote ---------- */
  v11.toastLink = function (msg, view, kind) {
    let host = document.querySelector('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '') + ' clickable';
    el.style.cursor = 'pointer';
    el.textContent = msg;
    el.onclick = () => { el.remove(); if (window.LotriShell) window.LotriShell.go(view); };
    host.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  };
})();
