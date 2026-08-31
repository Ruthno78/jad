/* =====================================================================
 * JADSTACK LOTTO V12 — NWAYO
 *  • Lotri.v12.imageDrop()  : konpozan imaj inik (drag&drop + kamera)
 *    ki RANPLASE tout <input type=file accept=image> nan sistèm nan.
 *  • Lotri.v12.ball()       : boul reyalis (lo 1 / 2 / 3)
 *  • Lotri.v12.rpc()        : apèl RPC ak mesaj erè klè
 *  • Heartbeat siveyans machin + gadyen sesyon (kont bloke/efase)
 *  • Fallback ouvèti/fèmti tiraj otomatik (jl12_rpc_tick)
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const v12 = (L.v12 = L.v12 || {});
  const SB = () => L.supabase;
  const esc = L.escapeHtml || (s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  v12.esc = esc;
  const toast = (m, k) => (L.toast ? L.toast(m, k) : console.log(k || 'info', m));

  /* ---------------- RPC ak mesaj klè ---------------- */
  v12.rpc = async function (name, args) {
    const { data, error } = await SB().rpc(name, args || {});
    if (error) throw new Error(error.message || 'Erreur du serveur.');
    return data;
  };

  /* ---------------- Boule reyalis ---------------- */
  v12.hue = t => { let h = 0; String(t || '?').split('').forEach(c => h = (h * 31 + c.charCodeAt(0)) % 360); return h; };
  v12.color = t => `hsl(${v12.hue(t)} 60% 42%)`;
  v12.ball = function (label, opts) {
    opts = opts || {};
    const cls = ['jl-ball', opts.size || '', label ? '' : 'empty'].filter(Boolean).join(' ');
    if (opts.img) return `<span class="${cls}"><img src="${esc(opts.img)}" alt="${esc(opts.alt || '')}"></span>`;
    const txt = label == null || label === '' ? '––' : String(label);
    return `<span class="${cls}" style="--b:${opts.color || v12.color(opts.alt || txt)}">${esc(txt)}</span>`;
  };
  /* 3 lo yo: 1ye pi gwo, 2yèm mwayen, 3yèm pi piti */
  v12.lots = (r, seed) => `<span class="jl-lots">
      ${v12.ball(r && r.lot1, { size: 'l1', color: v12.color(seed || 'l1') })}
      ${v12.ball(r && r.lot2, { size: 'l2', color: v12.color(seed || 'l2') })}
      ${v12.ball(r && r.lot3, { size: 'l3', color: v12.color(seed || 'l3') })}</span>`;

  /* ---------------- Konpozan imaj inik ---------------- */
  /* Itilizasyon: html += Lotri.v12.imageDrop({ name:'logo', src:url, round:true })
     Lekti: Lotri.v12.imageValue(root, 'logo')  -> URL (oswa null)
     Evènman: root.addEventListener('jl:image', e => e.detail.url) */
  v12.imageDrop = function (o) {
    o = o || {};
    return `<div class="jl-image-drop ${o.round ? 'round' : ''}" data-jl-image
      data-name="${esc(o.name || 'image')}" data-bucket="${esc(o.bucket || 'jl11-media')}"
      data-folder="${esc(o.folder || 'general')}" data-url="${esc(o.src || '')}"
      title="${esc(o.title || 'Klike, trennen yon imaj oswa pran yon foto')}">
      ${o.src ? `<img src="${esc(o.src)}" alt="${esc(o.alt || '')}">`
              : `<i class="fa-solid fa-image jl-id-ico"></i>
                 <span>${esc(o.label || 'Cliquez ou glissez une image ici')}</span>
                 <span style="font-size:.7rem;opacity:.75">PNG · JPG · WEBP · SVG — maks 4 Mo</span>`}
      <span class="jl-id-actions" style="${o.src ? '' : 'display:none'}">
        <button type="button" data-jl-cam title="Prendre une photo"><i class="fa-solid fa-camera"></i></button>
        <button type="button" data-jl-clear title="Retirer imaj la"><i class="fa-solid fa-xmark"></i></button>
      </span>
      <span class="jl-id-bar"></span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" aria-label="${esc(o.title || 'Imaj')}">
    </div>`;
  };
  v12.imageValue = (root, name) => {
    const b = (root || document).querySelector(`[data-jl-image][data-name="${name}"]`);
    return b && b.dataset.url ? b.dataset.url : null;
  };

  async function upload(box, file) {
    if (!/^image\//.test(file.type)) throw new Error('Seules les images sont acceptées (PNG, JPG, WEBP, SVG).');
    if (file.size > 4 * 1024 * 1024) throw new Error('Imaj la twò gwo (maks 4 Mo).');
    const bucket = box.dataset.bucket || 'jl11-media';
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${box.dataset.folder || 'general'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await SB().storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw new Error('Impossible d\'envoyer l\'image : ' + error.message);
    const { data } = SB().storage.from(bucket).getPublicUrl(path);
    return (data && data.publicUrl) || null;
  }

  async function handleFile(box, file) {
    if (!file) return;
    box.classList.add('busy');
    const bar = box.querySelector('.jl-id-bar');
    if (bar) bar.style.width = '35%';
    try {
      const url = await upload(box, file);
      if (bar) bar.style.width = '100%';
      v12.setImage(box, url);
      toast('L\'image est enregistrée.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      box.classList.remove('busy');
      setTimeout(() => { if (bar) bar.style.width = '0'; }, 400);
      const inp = box.querySelector('input[type=file]');
      if (inp) inp.value = '';
    }
  }

  v12.setImage = function (box, url) {
    box.dataset.url = url || '';
    box.querySelectorAll('.jl-id-ico, span:not(.jl-id-actions):not(.jl-id-bar)').forEach(el => {
      if (!el.closest('.jl-id-actions')) el.remove();
    });
    let img = box.querySelector('img');
    if (url) {
      if (!img) { img = document.createElement('img'); box.prepend(img); }
      img.src = url;
      const act = box.querySelector('.jl-id-actions'); if (act) act.style.display = '';
    } else if (img) {
      img.remove();
      const act = box.querySelector('.jl-id-actions'); if (act) act.style.display = 'none';
      box.insertAdjacentHTML('afterbegin',
        `<i class="fa-solid fa-image jl-id-ico"></i><span>Cliquez ou glissez une image ici</span>`);
    }
    box.dispatchEvent(new CustomEvent('jl:image', { detail: { url, name: box.dataset.name }, bubbles: true }));
  };

  document.addEventListener('change', e => {
    const inp = e.target;
    if (inp.matches('[data-jl-image] input[type=file]')) {
      handleFile(inp.closest('[data-jl-image]'), inp.files && inp.files[0]);
    }
  });
  document.addEventListener('click', e => {
    const clear = e.target.closest('[data-jl-clear]');
    if (clear) { e.preventDefault(); v12.setImage(clear.closest('[data-jl-image]'), ''); return; }
    const cam = e.target.closest('[data-jl-cam]');
    if (cam) {
      e.preventDefault();
      const box = cam.closest('[data-jl-image]');
      const inp = box.querySelector('input[type=file]');
      inp.setAttribute('capture', 'environment');
      inp.click();
      setTimeout(() => inp.removeAttribute('capture'), 800);
    }
  });
  ['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => {
    const box = e.target.closest && e.target.closest('[data-jl-image]');
    if (box) { e.preventDefault(); box.classList.add('drag'); }
  }));
  ['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => {
    const box = e.target.closest && e.target.closest('[data-jl-image]');
    if (box) box.classList.remove('drag');
  }));
  document.addEventListener('drop', e => {
    const box = e.target.closest && e.target.closest('[data-jl-image]');
    if (!box) return;
    e.preventDefault();
    handleFile(box, e.dataTransfer.files && e.dataTransfer.files[0]);
  });

  /* --- Ranplase tout ansyen input file imaj (V9/V10/V11) otomatikman --- */
  v12.upgradeInputs = function (root) {
    (root || document).querySelectorAll('input[type=file]').forEach(inp => {
      if (inp.closest('[data-jl-image]') || inp.dataset.jlUpgraded) return;
      const acc = (inp.getAttribute('accept') || '').toLowerCase();
      if (acc && acc.indexOf('image') === -1) return;
      inp.dataset.jlUpgraded = '1';
      const holder = document.createElement('div');
      holder.innerHTML = v12.imageDrop({
        name: inp.name || inp.id || 'image',
        folder: inp.dataset.folder || 'general',
        bucket: inp.dataset.bucket || 'jl11-media',
        src: inp.dataset.src || ''
      });
      const box = holder.firstElementChild;
      inp.parentNode.insertBefore(box, inp);
      inp.style.display = 'none';
      /* ansyen kòd la ka toujou li yon URL sou input lan */
      box.addEventListener('jl:image', ev => {
        inp.dataset.url = ev.detail.url || '';
        inp.dispatchEvent(new CustomEvent('jl:image', { detail: ev.detail }));
      });
    });
    /* Ansyen konpozan V11 rete konpatib */
    (root || document).querySelectorAll('[data-v11-img]').forEach(el => el.classList.add('jl-legacy-img'));
  };
  document.addEventListener('lotri:view', e => v12.upgradeInputs(e.detail));
  document.addEventListener('DOMContentLoaded', () => v12.upgradeInputs(document));

  /* ---------------- Badj «verifye» (Superadmin) ---------------- */
  v12.verified = role => role === 'super_admin'
    ? ' <i class="fa-solid fa-circle-check jl-verified" title="Compte verifye — Administrasyon JADSTACK LOTTO"></i>' : '';

  /* ---------------- Klike yon liy -> popup (tout sistèm nan) -------- */
  v12.popup = function (title, body, opts) {
    if (L.v11 && L.v11.popup) return L.v11.popup(title, body, opts);
    const back = document.createElement('div');
    back.className = 'v11-pop';
    back.innerHTML = `<div class="v11-pop-card"><div class="v11-pop-hd"><h3>${esc(title)}</h3>
      <button class="btn btn-icon btn-ghost" data-close>&times;</button></div>${body || ''}
      ${opts && opts.footer ? `<div class="row" style="justify-content:flex-end;gap:.5rem;margin-top:1rem">${opts.footer}</div>` : ''}</div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.querySelector('[data-close]').onclick = close;
    back.addEventListener('click', ev => { if (ev.target === back) close(); });
    return { el: back, close };
  };
  v12.wireRows = function (root) {
    (root || document).querySelectorAll('tbody tr[data-jl-row]').forEach(tr => {
      if (tr.dataset.jlWired) return;
      tr.dataset.jlWired = '1';
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', ev => {
        if (ev.target.closest('button,a,input,select,label,textarea')) return;
        let rows = [];
        try { rows = Object.entries(JSON.parse(tr.dataset.jlRow)); } catch (_) { return; }
        v12.popup(tr.dataset.jlTitle || 'Détails',
          `<div class="v11-kv">${rows.map(([k, val]) =>
            `<div class="k">${esc(k)}</div><div class="v">${esc(val ?? '—')}</div>`).join('')}</div>`);
      });
    });
  };
  document.addEventListener('lotri:view', e => v12.wireRows(e.detail));

  /* ---------------- Heartbeat + gadyen sesyon ---------------- */
  let hbTimer = null, guardTimer = null;
  async function heartbeat() {
    try { await v12.rpc('jl12_rpc_heartbeat', { _device: navigator.userAgent.slice(0, 90) }); } catch (_) {}
  }
  async function guard() {
    try {
      const st = await v12.rpc('jl12_rpc_session_state');
      if (st && st.valid === false) {
        clearInterval(hbTimer); clearInterval(guardTimer);
        try { await SB().auth.signOut(); } catch (_) {}
        alert(st.message || 'Sesyon w la fini.');
        location.replace('auth.html?raison=' + encodeURIComponent(st.reason || 'blocked'));
      }
    } catch (_) {}
  }
  async function tick() { try { await v12.rpc('jl12_rpc_tick'); } catch (_) {} }

  v12.start = function () {
    if (hbTimer) return;
    heartbeat(); guard(); tick();
    hbTimer = setInterval(heartbeat, 2 * 60 * 1000);
    guardTimer = setInterval(guard, 60 * 1000);
    setInterval(tick, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { heartbeat(); guard(); } });
  };
  document.addEventListener('lotri:ready', () => v12.start());
  if (window.__lotriProfile) v12.start();
})();
