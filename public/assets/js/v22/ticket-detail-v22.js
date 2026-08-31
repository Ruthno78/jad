/* =====================================================================
 * V22/V23 · C2 — POPUP « DETAY FICHE » PATAJE (ajan / konpayi / super-admin)
 * ---------------------------------------------------------------------
 * Yon sèl fonksyon: window.Lotri.showTicketDetail(idOrNo)
 * Nenpòt <tr data-ticket="…"> (id) oswa <tr data-ticket-no="…"> vin klikab.
 * V23 · C2-b — La fiche ka gen PLIZYÈ tiraj (jl9_ticket_draws, N-a-N).
 * Chak tiraj gen pwòp estati (pending/settled/cancelled), pwòp bets,
 * pwòp prim/win_detail; fich la (jl9_tickets) rete 'active' jiskaske
 * TOUT tiraj ladan l rezoud.
 * ===================================================================== */
(function () {
  const L = window.Lotri || (window.Lotri = {});
  const SB = () => window.Lotri.supabase;
  const esc = (s) => window.Lotri.escapeHtml(String(s == null ? '' : s));
  const money = (n) => Number(n || 0).toLocaleString('fr-HT', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }) + ' HTG';

  const STATUS_LBL = {
    active: 'Actif', won: 'Gagnant', lost: 'Nom gagnant',
    cancelled: 'Annuler', paid: 'Payé', pending: 'En attente'
  };

  function betsHtml(bets) {
    let list = [];
    if (Array.isArray(bets)) list = bets;
    else if (bets && typeof bets === 'object') {
      list = Object.keys(bets).map(k => ({ number: k, amount: bets[k] }));
    }
    if (!list.length) return '<span class="muted">—</span>';
    return list.map(b => {
      const num = b.number ?? b.num ?? b.boul ?? b.n ?? '—';
      const amt = b.amount ?? b.mise ?? b.price ?? b.montan ?? 0;
      const gm = b.game ?? b.game_code ?? '';
      return `<span class="chip" style="margin:.15rem .2rem 0 0">${esc(num)}${gm ? ' · ' + esc(gm) : ''} = ${esc(money(amt))}</span>`;
    }).join('');
  }

  const TD_STATUS_LBL = { pending: 'En attente', settled: 'Rezoud', cancelled: 'Annuler' };

  function winHtml(win) {
    const rows = Array.isArray(win) ? win : [];
    if (!rows.length) return '';
    return `<div class="table-wrap" style="margin-top:.6rem"><table class="table"><thead><tr>
      <th>Lo</th><th>Boule</th><th class="num">Miltiplikatè</th><th class="num">Montant</th>
      </tr></thead><tbody>${rows.map(w => `<tr>
        <td>${esc(w.lot || w.position || w.lo || '—')}</td>
        <td class="mono">${esc(w.number || w.boul || '—')}</td>
        <td class="num">${esc(w.multiplier || w.payout_x || '—')}</td>
        <td class="num">${esc(money(w.amount || w.montan || 0))}</td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  L.showTicketDetail = async function (idOrNo) {
    if (!idOrNo) return;
    const sel = '*, jl9_agents(full_name,public_id), jl9_companies(name)';
    const isUuid = /^[0-9a-f-]{36}$/i.test(String(idOrNo));
    let q = SB().from('jl9_tickets').select(sel);
    q = isUuid ? q.eq('id', idOrNo) : q.eq('ticket_no', idOrNo);
    const { data: t, error } = await q.limit(1).maybeSingle();
    if (error || !t) {
      window.Lotri.toast((error && error.message) || 'Cette fiche est introuvable.', 'error');
      return;
    }

    /* V23 · C2-b — chaje TOUT tiraj ki sou fich la (jl9_ticket_draws) */
    const { data: tds, error: tdErr } = await SB().from('jl9_ticket_draws')
      .select('*, jl9_draws(name)').eq('ticket_id', t.id).order('created_at');
    const drawLines = tdErr ? [] : (tds || []);

    const gayan = t.status === 'won' || t.status === 'paid' || Number(t.prize_amount || 0) > 0;
    const peye = !!(t.paid_at || t.paid || t.status === 'paid');
    const fullySettled = drawLines.length > 0 && drawLines.every(d => d.status === 'settled' || d.status === 'cancelled');

    const drawSectionsHtml = drawLines.length
      ? drawLines.map(d => `
        <div style="margin:.5rem 0;padding:.5rem;border:1px solid var(--border);border-radius:.4rem">
          <div class="row" style="justify-content:space-between;align-items:center">
            <strong>${esc((d.jl9_draws && d.jl9_draws.name) || '—')}</strong>
            <span class="badge ${d.status === 'settled' ? (Number(d.prize_amount||0) > 0 ? 'badge-success' : '') : d.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}">${esc(TD_STATUS_LBL[d.status] || d.status)}</span>
          </div>
          <div style="margin:.35rem 0 .2rem"><span class="muted" style="font-size:.8rem">Boule &amp; Prix :</span></div>
          <div>${betsHtml(d.bets)}</div>
          <div class="row" style="gap:1rem;margin-top:.35rem;font-size:.85rem">
            <div><span class="muted">Sou-total :</span> <strong>${esc(money(d.subtotal))}</strong></div>
            ${d.status === 'settled' ? `<div><span class="muted">Prime :</span> <strong>${esc(money(d.prize_amount))}</strong></div>` : ''}
          </div>
          ${d.status === 'settled' && Number(d.prize_amount || 0) > 0
            ? `<div class="muted" style="margin-top:.5rem;font-size:.8rem">Détails des lots</div>${winHtml(d.win_detail) || '<span class="muted">Aucun détail de lot.</span>'}`
            : ''}
        </div>`).join('')
      : `<div style="margin:.35rem 0 .2rem"><span class="muted">Boule &amp; Prix :</span></div><div>${betsHtml(t.bets)}</div>`;

    const body = `
      <div class="form-grid" style="gap:.45rem">
        <div><span class="muted">ID :</span> <strong class="mono">${esc(t.ticket_no || t.id)}</strong></div>
        <div><span class="muted">Date :</span> <strong>${t.created_at ? new Date(t.created_at).toLocaleString('fr-HT') : '—'}</strong></div>
        <div><span class="muted">Agent :</span> <strong>${esc((t.jl9_agents && t.jl9_agents.full_name) || '—')}</strong></div>
        <div><span class="muted">Compagnie :</span> <strong>${esc((t.jl9_companies && t.jl9_companies.name) || '—')}</strong></div>
      </div>
      <hr style="margin:.7rem 0;border:0;border-top:1px solid var(--border)">
      <div class="muted" style="font-size:.8rem;margin-bottom:.2rem">
        Tirage / Jeu / Boule &amp; Prix ${drawLines.length > 1 ? '(' + drawLines.length + ' tiraj sou fich la)' : ''} :
      </div>
      ${drawSectionsHtml}
      <hr style="margin:.7rem 0;border:0;border-top:1px solid var(--border)">
      <div class="row" style="gap:.5rem;flex-wrap:wrap">
        <span class="badge ${t.status === 'won' ? 'badge-success' : t.status === 'cancelled' ? 'badge-danger' : ''}">Statut du ticket : ${esc(STATUS_LBL[t.status] || t.status || '—')}</span>
        <span class="badge ${gayan ? 'badge-success' : ''}">Gagnant : ${gayan ? 'Oui' : 'Nom'}</span>
        <span class="badge ${peye ? 'badge-success' : 'badge-warning'}">Payé : ${peye ? 'Oui' : 'Nom'}</span>
        ${drawLines.length > 1 && t.status === 'active'
          ? `<span class="badge badge-warning">${fullySettled ? 'Tous les tirages sont réglés' : 'En attente d\'autres tirages'}</span>` : ''}
      </div>
      <div class="row" style="gap:1.2rem;margin-top:.6rem">
        <div><span class="muted">Total :</span> <strong>${esc(money(t.total))}</strong></div>
        <div><span class="muted">Prime total :</span> <strong>${esc(money(t.prize_amount))}</strong></div>
      </div>
    `;

    const m = document.createElement('div');
    m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal" style="max-width:560px">
      <h3>Détails du ticket</h3>${body}
      <div class="row" style="justify-content:flex-end;margin-top:1rem">
        <button class="btn btn-ghost" data-close>Fermer</button></div></div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('[data-close]').onclick = close;
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
  };

  /* Delegasyon global — travay sou tout paj (ajan, konpayi, super-admin) */
  document.addEventListener('click', (e) => {
    if (e.target.closest('button, a, input, select, [data-del], [data-req]')) return;
    const row = e.target.closest('[data-ticket],[data-ticket-no]');
    if (!row) return;
    L.showTicketDetail(row.dataset.ticket || row.dataset.ticketNo);
  });

  /* Kursè "klikab" sou liy fich yo */
  const st = document.createElement('style');
  st.textContent = 'tr[data-ticket],tr[data-ticket-no]{cursor:pointer}'
    + 'tr[data-ticket]:hover,tr[data-ticket-no]:hover{background:var(--bg-soft,rgba(0,0,0,.04))}';
  document.head.appendChild(st);
})();
