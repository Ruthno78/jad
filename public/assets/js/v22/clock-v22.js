/* =====================================================================
 * V22 · B3 — WIDGET DAT/LÈ AYITI (header + sidemenu) + paj Super-Admin
 * pou ajiste yon offset afichaj (jl12_rpc_set_clock_offset).
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;
  const esc = (s) => window.Lotri.escapeHtml(String(s == null ? '' : s));
  let state = { ht_date: '—', ht_time: '--:--', offset_minutes: 0, ht_offset: '' };

  const css = document.createElement('style');
  css.textContent = `
  .ht-clock{display:flex;flex-direction:column;align-items:center;line-height:1.15;
    font-weight:600;font-family:var(--font-display,inherit);white-space:nowrap}
  .ht-clock .d{font-size:.74rem;opacity:.75}
  .ht-clock .t{font-size:.95rem}
  .ht-clock-side{padding:.5rem 0 .7rem;border-bottom:1px solid var(--border)}`;
  document.head.appendChild(css);

  function paint() {
    document.querySelectorAll('.ht-clock').forEach(el => {
      el.innerHTML = `<span class="d">${esc(state.ht_date)}</span><span class="t">${esc(state.ht_time)}</span>`;
      el.title = 'Heure Haïti ' + (state.ht_offset || '');
    });
  }

  async function refresh() {
    try {
      const { data } = await SB().rpc('jl12_rpc_clock');
      if (data) { state = Object.assign(state, data); paint(); }
    } catch (_) { /* silans */ }
  }

  function tickLocal() {
    /* avanse lè lokal ant chak apèl sèvè */
    if (!/^\d{2}:\d{2}$/.test(state.ht_time)) return;
    let [h, m] = state.ht_time.split(':').map(Number);
    m += 1; if (m >= 60) { m = 0; h = (h + 1) % 24; }
    state.ht_time = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    paint();
  }

  function mount() {
    const right = document.querySelector('.appbar .right');
    if (right && !right.querySelector('.ht-clock')) {
      const el = document.createElement('div');
      el.className = 'ht-clock';
      right.insertBefore(el, right.firstChild);
    }
    const side = document.getElementById('side-company');
    if (side && !side.parentNode.querySelector('.ht-clock-side')) {
      const el = document.createElement('div');
      el.className = 'ht-clock ht-clock-side';
      side.parentNode.insertBefore(el, side);
    }
    paint();
  }

  document.addEventListener('lotri:ready', () => {
    setTimeout(mount, 300);
    refresh();
    setInterval(refresh, 60000);
    setInterval(tickLocal, 60000);
  });

  /* ---------- Paj Super-Admin : « Heure du système » ---------- */
  if (window.LotriShell && LotriShell.register) {
    LotriShell.register('sys-clock', {
      render: async (host) => {
        const { data } = await SB().rpc('jl12_rpc_clock');
        const c = data || {};
        host.innerHTML = `<div class="card"><div class="card-hd"><h3>Heure du système (Ayiti)</h3></div>
          <div class="grid-stats" style="margin-bottom:1rem">
            <div class="card stat"><div class="lbl">Date Ayiti</div><div class="val">${esc(c.ht_date || '—')}</div></div>
            <div class="card stat"><div class="lbl">Heure Haïti</div><div class="val">${esc(c.ht_time || '—')}</div></div>
            <div class="card stat"><div class="lbl">Fizo</div><div class="val">${esc(c.ht_offset || '—')}</div></div>
            <div class="card stat"><div class="lbl">Ajisteman</div><div class="val">${esc(c.offset_minutes || 0)} min</div></div>
          </div>
          <p class="muted" style="font-size:.82rem">L\'ajustement est pour <strong>afichaj</strong> uniquement
            (li pa chanje fizo orè Postgres la). Sèvi ak li uniquement si w remake yon dekalaj.</p>
          <div class="row" style="gap:.6rem;align-items:flex-end">
            <div><label class="label">Ajisteman (minit)</label>
              <input class="input" id="off" type="number" step="1" min="-720" max="720" value="${Number(c.offset_minutes || 0)}"></div>
            <button class="btn btn-primary" id="save"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button>
            <button class="btn btn-ghost" id="reset">Restaurer 0</button>
          </div></div>`;
        const save = async (v) => {
          const { error } = await SB().rpc('jl12_rpc_set_clock_offset', { _minutes: Number(v) });
          if (error) { window.Lotri.toast(error.message, 'error'); return; }
          window.Lotri.toast('L\'heure du système est mise à jour', 'success');
          refresh(); LotriShell.go('sys-clock');
        };
        host.querySelector('#save').onclick = () => save(host.querySelector('#off').value);
        host.querySelector('#reset').onclick = () => save(0);
      }
    });
  }
})();
