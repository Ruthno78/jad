/* =====================================================================
 * JADSTACK LOTTO V17 §3 — POPUP «FICHE GAYAN» POU AJAN (tan reyèl)
 * ---------------------------------------------------------------------
 *  • Du rezilta un tirage antre, tikè yo règle (jl13_settle) e sa ki
 *    genyen pran `status='won'` ak `seen_at=null` (V48 — te gen yon
 *    fot 'winner' olye 'won' ki te anpeche popup sa a parèt janm).
 *  • Isit la nou koute chanjman sou jl9_tickets an tan reyèl EPI nou fè
 *    yon tchèk lè moun nan konekte — konsa ajan an wè popup la SAN
 *    rafrechi paj la.
 *  • Chak channel gen yon non INIK epi li dekonekte lè paj la fermer
 *    (menm règ ak V17-BUG-1).
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const SB = () => L.supabase;
  const esc = L.escapeHtml || (s => String(s ?? ''));
  const money = n => Number(n || 0).toLocaleString('fr-HT',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' HTG';

  let busy = false, channel = null, shown = {};

  async function rpc(name, args) {
    const { data, error } = await SB().rpc(name, args || {});
    if (error) throw new Error(error.message);
    return data;
  }

  function popup(list) {
    const rows = list.map(w => `
      <tr data-t="${esc(w.id)}">
        <td class="mono"><b>#${esc(w.ticket_no)}</b></td>
        <td>${esc(w.draw_name || '—')}</td>
        <td class="num mono" data-copy-value="${Number(w.prize_amount || 0)}">${money(w.prize_amount)}</td>
      </tr>`).join('');
    const body = `
      <p style="margin:.2rem 0 .8rem">
        <strong>${list.length === 1 ? 'Une fiche gagnante !' : list.length + ' fiche gagnante !'}</strong>
        ${list.length === 1 ? `Fiche <b>#${esc(list[0].ticket_no)}</b> gagnant — vous gagnez ${money(list[0].prize_amount)}.` : ''}
      </p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Fiche</th><th>Tirage</th><th class="num">Prime</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;

    const foot = `<button class="btn btn-primary" id="jl17-see"><i class="fa-solid fa-eye"></i> Voir le ticket</button>`;
    let pop;
    if (L.v11 && L.v11.popup) {
      pop = L.v11.popup('🏆 Fiche genyen', body, { footer: foot });
    } else if (L.v13 && L.v13.modal) {
      pop = L.v13.modal(`<h3>🏆 Fiche genyen</h3>${body}
        <div class="row" style="justify-content:flex-end;margin-top:.8rem">${foot}</div>`, { wide: true });
    } else {
      L.toast && L.toast('Fiche genyen! ' + list.length + ' fiches gagnantes.', 'success');
      return;
    }
    const go = () => {
      pop.close();
      if (window.LotriShell) window.LotriShell.go(window.LotriShell.get('fiches') ? 'fiches' : 'tickets');
    };
    const btn = pop.el.querySelector('#jl17-see');
    if (btn) btn.onclick = go;
    pop.el.querySelectorAll('[data-t]').forEach(tr => tr.onclick = go);
  }

  async function check() {
    if (busy || !SB() || !window.__lotriProfile) return;
    busy = true;
    try {
      const list = (await rpc('jl13_rpc_my_wins', { _only_new: true }) || [])
        .filter(w => !shown[w.id]);
      if (list.length) {
        list.forEach(w => { shown[w.id] = 1; });
        popup(list);
        const ids = list.map(w => w.id).filter(Boolean);
        if (ids.length) rpc('jl13_rpc_mark_wins_seen', { _ids: ids }).catch(() => { });
      }
    } catch (_) { /* an silans */ }
    busy = false;
  }

  function arm(profile) {
    const role = (profile || {}).role;
    if (!['agent', 'supervisor', 'company'].includes(role)) return;
    check();
    /* V17-BUG-1 modèl: non channel inik + dekoneksyon */
    const name = 'jl17-wins-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    channel = SB().channel(name)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jl9_tickets' },
        payload => { if (payload.new && payload.new.status === 'won') check(); })
      .subscribe();
    window.addEventListener('beforeunload', () => {
      try { if (channel) SB().removeChannel(channel); } catch (_) { }
      channel = null;
    });
    setInterval(check, 60000);
  }

  L.v17 = L.v17 || {};
  L.v17.winsCheck = check;
  document.addEventListener('lotri:ready', () => arm(window.__lotriProfile || {}));
})();
