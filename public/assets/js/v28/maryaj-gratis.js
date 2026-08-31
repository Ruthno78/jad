/* =====================================================================
 * JADSTACK LOTTO V28 — MARYAJ GRATIS (bò AJAN)
 * ---------------------------------------------------------------------
 * • Messages enfòmasyon an nan 3 lang (Créole / Français / English), ak yon
 *   prezantasyon tankou mesaj WhatsApp sou iPhone (bul, ke bul, lè).
 * • Lè yon fich fin kreye, sistèm nan mande baz done a si ajan an merite
 *   yon Mariage GRATUIT (règ yo se Superadmin ki pwograme yo). Si wi, boul
 *   kado a ajoute sou fich la ak PRI 0 et marquée « bonus/cadeau ».
 * • Okenn lòt lojik (POS, enprime, gayan, faktirasyon) pa modifye — nou
 *   uniquement koute apèl `jl9_rpc_create_ticket` ki deja egziste.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const V = (L.v28 = L.v28 || {});
  const SB = () => L.supabase;
  const esc = L.escapeHtml || (s => String(s == null ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const MG = (V.mg = V.mg || {});

  /* ---------------------------------------------------------------
   * 1) Bul mesaj estil WhatsApp iOS
   * ------------------------------------------------------------- */
  MG.bubbleHtml = function (code) {
    const c = code || V.lang();
    return `
      <div class="jl28-ios">
        <div class="jl28-ios-bar">
          <div class="jl28-ios-av"><i class="fa-solid fa-gift"></i></div>
          <div>
            <div class="jl28-ios-name">${esc(V.t('mg.title', c))}</div>
            <div class="jl28-ios-sub">${esc(V.t('mg.subtitle', c))}</div>
          </div>
        </div>
        <div class="jl28-ios-body">
          <div class="jl28-ios-day">${esc(new Date().toLocaleDateString())}</div>
          <div class="jl28-msg jl28-in">
            <p>${esc(V.t('mg.msg', c))}</p>
            <span class="jl28-time">${esc(now())}</span>
          </div>
          <div class="jl28-msg jl28-out">
            <p><strong>${esc(V.t('mg.price', c))}: 0 HTG</strong></p>
            <span class="jl28-time">${esc(now())} <i class="fa-solid fa-check-double"></i></span>
          </div>
        </div>
      </div>`;
  };

  /* Panno konplè (seleksyonè lang + bul mesaj) */
  MG.panelHtml = function () {
    return `<div class="card jl28-card" data-jl28-panel>
        <div class="card-hd"><h3><i class="fa-solid fa-gift"></i> ${esc(V.t('mg.title'))}</h3></div>
        ${V.langPickerHtml()}
        <div data-jl28-bubbles>${MG.bubbleHtml()}</div>
      </div>`;
  };

  function rerender() {
    document.querySelectorAll('[data-jl28-bubbles]').forEach(h => { h.innerHTML = MG.bubbleHtml(); });
    document.querySelectorAll('[data-jl28-panel] .jl28-lang').forEach(h => {
      h.outerHTML = V.langPickerHtml();
    });
  }
  document.addEventListener('jl28:lang', rerender);

  /* ---------------------------------------------------------------
   * 2) Popup « ou fèk resevwa kado a »
   * ------------------------------------------------------------- */
  MG.showAward = function (award) {
    const c = V.lang();
    const m = document.createElement('div');
    m.className = 'modal-backdrop';
    m.innerHTML = `
      <div class="modal jl28-modal" role="dialog" aria-modal="true" aria-label="${esc(V.t('mg.title', c))}">
        <div class="jl28-ios">
          <div class="jl28-ios-bar">
            <div class="jl28-ios-av"><i class="fa-solid fa-gift"></i></div>
            <div>
              <div class="jl28-ios-name">${esc(V.t('mg.title', c))}</div>
              <div class="jl28-ios-sub">${esc(V.t('mg.subtitle', c))}</div>
            </div>
          </div>
          <div class="jl28-ios-body">
            <div class="jl28-msg jl28-in">
              <p>${esc(V.t('mg.gotIt', c))}</p>
              <span class="jl28-time">${esc(now())}</span>
            </div>
            <div class="jl28-msg jl28-out">
              <p>${esc(V.t('mg.ball', c))} : <strong class="mono">${esc(award.number || '')}</strong><br>
                 ${esc(V.t('mg.price', c))} : <strong>${esc(V.t('mg.free', c))}</strong></p>
              <span class="jl28-time">${esc(now())} <i class="fa-solid fa-check-double"></i></span>
            </div>
          </div>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:.8rem">
          <button class="btn btn-primary" data-close>${esc(V.t('mg.close', c))}</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('[data-close]').onclick = close;
    m.addEventListener('click', e => { if (e.target === m) close(); });
  };

  /* ---------------------------------------------------------------
   * 3) Rele kado a apre yon fich kreye — san touche kòd POS la.
   *    Nou anvlope `supabase.rpc` une seule fois: si non RPC la se
   *    `jl9_rpc_create_ticket` epi li reyisi, nou mande kado a.
   * ------------------------------------------------------------- */
  MG.claim = async function (ticketId) {
    if (!ticketId) return null;
    try {
      const { data, error } = await SB().rpc('jl28_rpc_mg_maybe_award', { _ticket: ticketId });
      if (error) return null;
      if (data && data.awarded) { MG.showAward(data); return data; }
      /* [V30 §1.3] Kado a kounye a bay SOU SERVÈ A (triger
         jl30_trg_mg_after_ticket sou jl9_tickets) — donk apèl sa a ka
         retounen 'already'. Nan ka sa a nou li kado a ki deja sou fich la
         pou UI a montre l kanmenm. */
      if (data && data.reason === 'already') {
        const r = await SB().rpc('jl30_rpc_mg_award_of_ticket', { _ticket: ticketId });
        if (r && r.data && r.data.awarded) { MG.showAward(r.data); return r.data; }
      }
      return data || null;
    } catch (_) { return null; }
  };

  function wrapRpc() {
    const sb = SB();
    if (!sb || typeof sb.rpc !== 'function' || sb.__jl28Wrapped) return !!(sb && sb.__jl28Wrapped);
    const orig = sb.rpc.bind(sb);
    sb.rpc = function (name, args, opts) {
      const p = orig(name, args, opts);
      if (name === 'jl9_rpc_create_ticket' && p && typeof p.then === 'function') {
        return p.then(res => {
          const id = res && res.data && (res.data.id || (res.data[0] && res.data[0].id));
          if (!res || !res.error) { setTimeout(() => MG.claim(id), 400); }
          return res;
        });
      }
      return p;
    };
    sb.__jl28Wrapped = true;
    return true;
  }
  if (!wrapRpc()) {
    document.addEventListener('lotri:ready', wrapRpc);
    let tries = 0;
    const iv = setInterval(() => { if (wrapRpc() || ++tries > 40) clearInterval(iv); }, 250);
  }

  /* ---------------------------------------------------------------
   * 4) Vi « Mariage GRATUIT » pou ajan an (enfòmasyon uniquement)
   * ------------------------------------------------------------- */
  if (window.LotriShell) {
    LotriShell.register('mg-info', {
      title: 'Mariage GRATUIT',
      render(host) { host.innerHTML = MG.panelHtml(); }
    });
  }

  /* ---------------------------------------------------------------
   * 5) Estil (iOS / WhatsApp) — pou pa touche okenn CSS ki egziste
   * ------------------------------------------------------------- */
  const st = document.createElement('style');
  st.textContent = `
    .jl28-lang{display:flex;gap:.4rem;flex-wrap:wrap;margin:.6rem 0 .9rem}
    .jl28-lang-b{border:1px solid var(--border,#d5d7db);background:var(--card,#fff);
      color:inherit;border-radius:999px;padding:.32rem .8rem;font-size:.85rem;font-weight:600;
      cursor:pointer;transition:all .18s}
    .jl28-lang-b.is-on{background:#0b8f4a;border-color:#0b8f4a;color:#fff}
    .jl28-card{max-width:560px}
    .jl28-modal{max-width:480px}
    .jl28-ios{border-radius:1rem;overflow:hidden;border:1px solid rgba(0,0,0,.08);
      box-shadow:0 8px 24px rgba(0,0,0,.12);background:#efe7dd;
      font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Inter,sans-serif}
    .jl28-ios-bar{display:flex;align-items:center;gap:.6rem;padding:.6rem .8rem;
      background:rgba(246,246,246,.92);backdrop-filter:saturate(180%) blur(20px);
      border-bottom:1px solid rgba(0,0,0,.08)}
    .jl28-ios-av{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;
      background:linear-gradient(180deg,#25D366,#0b8f4a);color:#fff;font-size:.95rem}
    .jl28-ios-name{font-weight:700;font-size:.95rem;color:#111}
    .jl28-ios-sub{font-size:.72rem;color:#6b7280}
    .jl28-ios-body{padding:.8rem;display:flex;flex-direction:column;gap:.5rem;
      background-image:radial-gradient(rgba(0,0,0,.035) 1px,transparent 1px);background-size:14px 14px}
    .jl28-ios-day{align-self:center;font-size:.68rem;color:#5b5b5b;background:rgba(255,255,255,.75);
      padding:.15rem .6rem;border-radius:999px}
    .jl28-msg{position:relative;max-width:86%;padding:.5rem .7rem .95rem;border-radius:1rem;
      font-size:.9rem;line-height:1.35;color:#111;box-shadow:0 1px 1px rgba(0,0,0,.12)}
    .jl28-msg p{margin:0;white-space:pre-line}
    .jl28-in{align-self:flex-start;background:#fff;border-bottom-left-radius:.25rem}
    .jl28-out{align-self:flex-end;background:#dcf8c6;border-bottom-right-radius:.25rem}
    .jl28-time{position:absolute;right:.6rem;bottom:.25rem;font-size:.62rem;color:#54656f}
    .jl28-out .jl28-time i{color:#34b7f1}
    .jl28-in:after,.jl28-out:after{content:"";position:absolute;bottom:0;width:10px;height:14px}
    .jl28-in:after{left:-6px;background:#fff;clip-path:polygon(100% 0,100% 100%,0 100%)}
    .jl28-out:after{right:-6px;background:#dcf8c6;clip-path:polygon(0 0,100% 100%,0 100%)}`;
  document.head.appendChild(st);
})();
