/* =====================================================================
 * JADSTACK LOTTO — SISTÈM NOTIFIKASYON (bouton flotan + istwa jounen an)
 * ---------------------------------------------------------------------
 * Ranplase `window.Lotri.toast(msg, kind)` pa yon vèsyon ki:
 *   1) Kenbe MENM siyati fonksyon an (261 kote nan kòd la rele l konsa,
 *      pa gen anyen pou chanje lòt kote).
 *   2) Toujou anrejistre chak notifikasyon nan yon istwa JOUNEN AN,
 *      men SÈLMAN nan localStorage — JAM nan Supabase.
 *   3) Si gen plis pase 3 toast vizib an menm tan, toast siplemantè yo
 *      PA anpile sou ekran an — yo ale dirèkteman nan istwa a, e yon
 *      bouton flotan (klòch) parèt/mete ajou ak yon konpto.
 *   4) Klike bouton flotan la montre tout notifikasyon jounen an, ak lè
 *      yo te rive.
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const L = window.Lotri;
  const LS_KEY = 'jl-notif-log';
  const MAX_VISIBLE = 3;

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function readLog() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { day: todayKey(), items: [] };
      const parsed = JSON.parse(raw);
      if (parsed.day !== todayKey()) return { day: todayKey(), items: [] }; // nouvo jou, kòmanse pwòp
      return parsed;
    } catch (_) { return { day: todayKey(), items: [] }; }
  }

  function writeLog(log) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(log)); } catch (_) { /* localStorage plen/bloke — pa kritik */ }
  }

  function pushLog(msg, kind) {
    const log = readLog();
    log.items.push({ msg, kind: kind || 'info', at: Date.now() });
    // Limite rezonab pou pa fè localStorage grosi san limit sou yon
    // sèl jou (kenbe 300 pi resan yo).
    if (log.items.length > 300) log.items = log.items.slice(-300);
    writeLog(log);
    updateBell(log);
  }

  let bellEl = null, panelEl = null;

  function ensureBell() {
    if (bellEl) return bellEl;
    bellEl = document.createElement('button');
    bellEl.type = 'button';
    bellEl.className = 'jl-notif-bell';
    bellEl.setAttribute('aria-label', 'Notifications du jour');
    bellEl.innerHTML = '<i class="fa-solid fa-bell"></i><span class="jl-notif-count" hidden>0</span>';
    bellEl.style.cssText = 'position:fixed;bottom:1.25rem;right:1.25rem;z-index:99;' +
      'width:46px;height:46px;border-radius:50%;border:0;cursor:pointer;' +
      'background:var(--primary,#2563eb);color:#fff;box-shadow:var(--shadow-md,0 4px 12px rgba(0,0,0,.2));' +
      'display:flex;align-items:center;justify-content:center;font-size:1.1rem;';
    document.body.appendChild(bellEl);
    bellEl.addEventListener('click', togglePanel);
    return bellEl;
  }

  function updateBell(log) {
    const count = log.items.length;
    if (!count) { if (bellEl) bellEl.remove(); bellEl = null; return; }
    const b = ensureBell();
    const cEl = b.querySelector('.jl-notif-count');
    cEl.hidden = false;
    cEl.textContent = count > 99 ? '99+' : String(count);
    cEl.style.cssText = 'position:absolute;top:-4px;right:-4px;background:var(--danger,#dc2626);' +
      'color:#fff;border-radius:999px;font-size:.65rem;min-width:18px;height:18px;' +
      'display:flex;align-items:center;justify-content:center;padding:0 4px;font-weight:700;';
  }

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' });
  }

  function togglePanel() {
    if (panelEl) { panelEl.remove(); panelEl = null; return; }
    const log = readLog();
    panelEl = document.createElement('div');
    panelEl.className = 'jl-notif-panel';
    panelEl.style.cssText = 'position:fixed;bottom:5.2rem;right:1.25rem;z-index:99;width:min(340px,90vw);' +
      'max-height:60vh;overflow:auto;background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);' +
      'border-radius:var(--radius,10px);box-shadow:var(--shadow-md,0 4px 20px rgba(0,0,0,.18));padding:.5rem;';
    const rows = log.items.slice().reverse().map(it => `
      <div style="padding:.5rem .6rem;border-bottom:1px solid var(--border,#eee);font-size:.85rem;display:flex;gap:.5rem;justify-content:space-between;">
        <span style="flex:1">${(it.msg || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>
        <span style="color:var(--muted,#888);white-space:nowrap;font-size:.75rem">${fmtTime(it.at)}</span>
      </div>`).join('') || '<div class="empty" style="padding:1rem;text-align:center;color:var(--muted,#888)">Aucune notification aujourd\'hui.</div>';
    panelEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:.4rem .6rem .6rem;font-weight:700;">
        <span>Notifications du jour</span>
        <button type="button" id="jl-notif-clear" style="background:none;border:0;color:var(--muted,#888);cursor:pointer;font-size:.78rem;">Vide</button>
      </div>${rows}`;
    document.body.appendChild(panelEl);
    panelEl.querySelector('#jl-notif-clear').onclick = () => {
      writeLog({ day: todayKey(), items: [] });
      updateBell({ items: [] });
      panelEl.remove(); panelEl = null;
    };
  }

  // Chaje bouton flotan si gen deja yon istwa pou jodi a (egz. moun nan
  // rechaje paj la, oswa li chanje paj).
  updateBell(readLog());

  /* ---------------- Toast vizib (limite a MAX_VISIBLE alafwa) --------------- */
  let visibleCount = 0;

  window.Lotri.toast = function (msg, kind) {
    pushLog(msg, kind); // toujou nan istwa a, kèlkeswa si l vizib ekran an

    if (visibleCount >= MAX_VISIBLE) return; // siplemantè yo — istwa uniquement, pa anpile sou ekran

    let host = document.querySelector('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    host.appendChild(el);
    visibleCount++;
    setTimeout(() => { el.remove(); visibleCount = Math.max(0, visibleCount - 1); }, 3500);
  };
})();

/* =====================================================================
 * V43 — SISTÈM NOTIFIKASYON REYÈL (baz done: jl43_notifications)
 * ---------------------------------------------------------------------
 * Fichye separe (IIFE apa) ki AJOUTE yon vrè sant notifikasyon ki sove
 * nan Supabase, san touche `Lotri.toast()` ki anwo a (sa rete egzakteman
 * jan l te ye a). Klòch la parèt nan header la (anwo, akote tèm/dekonèkte).
 *   • Super Admin ak Compagnie (employeur) : istwa san limit, bouton "Vide".
 *   • Agent ak Superviseur : 30 pi resan yo uniquement (retansyon otomatik bò SQL).
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const N = (window.Lotri.notifications = {});
  const SB = () => window.Lotri.supabase;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MONTHS = ['jan', 'fev', 'mas', 'avr', 'me', 'jen', 'jiy', 'out', 'sept', 'okt', 'nov', 'des'];
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function groupLabel(ts) {
    const d = new Date(ts), now = new Date();
    if (sameDay(d, now)) return 'Aujourd\'hui';
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (sameDay(d, yest)) return 'Hier';
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' });
  }

  let profile = null, items = [], unread = 0, knownIds = new Set(), firstLoad = true;
  let bellEl = null, panelEl = null, timer = null;

  function ensureBell() {
    if (bellEl) return bellEl;
    const right = document.querySelector('.appbar .right');
    if (!right) return null;
    bellEl = document.createElement('button');
    bellEl.type = 'button';
    bellEl.className = 'btn btn-icon btn-ghost jl43-bell';
    bellEl.setAttribute('aria-label', 'Notifications');
    bellEl.style.position = 'relative';
    bellEl.innerHTML = '<i class="fa-solid fa-bell"></i><span class="jl43-dot" hidden></span>';
    const themeBtn = document.getElementById('theme-btn');
    right.insertBefore(bellEl, themeBtn || right.firstChild);
    bellEl.addEventListener('click', togglePanel);
    return bellEl;
  }

  function paintBell() {
    const b = ensureBell();
    if (!b) return;
    const dot = b.querySelector('.jl43-dot');
    if (!unread) { dot.hidden = true; return; }
    dot.hidden = false;
    dot.textContent = unread > 99 ? '99+' : String(unread);
    dot.style.cssText = 'position:absolute;top:2px;right:2px;background:var(--danger,#dc2626);color:#fff;' +
      'border-radius:999px;font-size:.62rem;min-width:16px;height:16px;display:flex;align-items:center;' +
      'justify-content:center;padding:0 3px;font-weight:700;line-height:1';
  }

  function itemRow(it) {
    const TYPE_ICON = { win: 'fa-trophy', message: 'fa-comment', draw_result: 'fa-dice', system: 'fa-bell' };
    return `<div class="jl43-item${it.read_at ? '' : ' unread'}" data-id="${it.id}" data-link="${esc(it.link || '')}"
        style="display:flex;gap:.6rem;align-items:flex-start;padding:.55rem .6rem;border-bottom:1px solid var(--border,#eee);cursor:pointer">
      <i class="fa-solid ${TYPE_ICON[it.type] || 'fa-bell'}" style="margin-top:.2rem;color:var(--primary,#2563eb)"></i>
      <div style="flex:1;min-width:0">
        <div style="font-weight:${it.read_at ? '500' : '700'};font-size:.85rem">${esc(it.title)}</div>
        ${it.body ? `<div class="muted" style="font-size:.78rem">${esc(it.body)}</div>` : ''}
        <div class="muted" style="font-size:.68rem;margin-top:.15rem">${fmtTime(it.created_at)}</div>
      </div>
      ${it.read_at ? '' : '<span class="jl43-unread-mark" style="width:8px;height:8px;border-radius:50%;background:var(--primary,#2563eb);margin-top:.35rem;flex:0 0 auto"></span>'}
    </div>`;
  }

  function renderList() {
    if (!items.length) return '<div class="empty" style="padding:1.2rem;text-align:center;color:var(--muted,#888)">Aucune notification.</div>';
    let lastGroup = null, html = '';
    items.forEach(it => {
      const g = groupLabel(it.created_at);
      if (g !== lastGroup) {
        html += `<div class="muted" style="padding:.4rem .6rem .2rem;font-size:.7rem;font-weight:700;text-transform:uppercase">${esc(g)}</div>`;
        lastGroup = g;
      }
      html += itemRow(it);
    });
    return html;
  }

  function togglePanel() {
    if (panelEl) { panelEl.remove(); panelEl = null; return; }
    const b = ensureBell();
    if (!b) return;
    const canClear = profile && ['super_admin', 'employer', 'company'].includes(profile.role);
    panelEl = document.createElement('div');
    panelEl.className = 'jl43-panel';
    panelEl.style.cssText = 'position:fixed;top:56px;right:.75rem;z-index:120;width:min(360px,92vw);' +
      'max-height:70vh;overflow:auto;background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);' +
      'border-radius:var(--radius,10px);box-shadow:var(--shadow-md,0 4px 20px rgba(0,0,0,.18));';
    panelEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem .7rem;border-bottom:1px solid var(--border,#eee);position:sticky;top:0;background:var(--surface,#fff)">
        <span style="font-weight:700">Notifications</span>
        <div style="display:flex;gap:.6rem">
          <button type="button" id="jl43-mark-all" style="background:none;border:0;color:var(--primary,#2563eb);cursor:pointer;font-size:.75rem">Tout lire</button>
          ${canClear ? `<button type="button" id="jl43-clear" style="background:none;border:0;color:var(--muted,#888);cursor:pointer;font-size:.75rem">Vide</button>` : ''}
        </div>
      </div>
      <div id="jl43-list">${renderList()}</div>`;
    document.body.appendChild(panelEl);

    panelEl.querySelectorAll('.jl43-item').forEach(el => el.onclick = async () => {
      const id = el.dataset.id, link = el.dataset.link;
      if (id) { try { await SB().rpc('jl43_rpc_notifications_mark_read', { _ids: [id] }); } catch (_) {} }
      panelEl.remove(); panelEl = null;
      if (link && window.LotriShell) window.LotriShell.go(link);
      refresh();
    });
    panelEl.querySelector('#jl43-mark-all').onclick = async () => {
      try { await SB().rpc('jl43_rpc_notifications_mark_all_read'); } catch (_) {}
      panelEl.remove(); panelEl = null;
      refresh();
    };
    const clearBtn = panelEl.querySelector('#jl43-clear');
    if (clearBtn) clearBtn.onclick = async () => {
      if (!confirm('Tout vider\'historique des notifications ?')) return;
      try { await SB().rpc('jl43_rpc_notifications_clear'); } catch (e) { window.Lotri.toast(e.message, 'error'); }
      panelEl.remove(); panelEl = null;
      refresh();
    };
  }

  async function refresh() {
    if (!SB()) return;
    try {
      const [{ data: list }, { data: cnt }] = await Promise.all([
        SB().rpc('jl43_rpc_notifications_list', { _limit: 50 }),
        SB().rpc('jl43_rpc_notifications_unread_count')
      ]);
      items = Array.isArray(list) ? list : [];
      unread = Number(cnt || 0);
      paintBell();
      if (panelEl) { panelEl.querySelector('#jl43-list').innerHTML = renderList(); }

      /* Toast pou nouvo notifikasyon ki parèt depi dènye rafrechisman an
         (pa vale premye chajman an — sinon tout istwa a ta vin toast). */
      if (!firstLoad) {
        items.filter(it => !it.read_at && !knownIds.has(it.id)).slice(0, 3)
          .forEach(it => window.Lotri.toast(it.title, 'info'));
      }
      firstLoad = false;
      knownIds = new Set(items.map(it => it.id));
    } catch (_) { /* pa kritik */ }
  }

  N.arm = function (p) {
    profile = p || profile;
    if (!ensureBell()) {
      /* Header la poko nan DOM — eseye ankò byento (v9.4 badges.js gen
         menm kalite ka sa a). */
      setTimeout(() => N.arm(profile), 400);
      return;
    }
    refresh();
    document.addEventListener('lotri:view', refresh);
    if (timer) return;
    timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 45000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
  };
  N.refresh = refresh;
})();
