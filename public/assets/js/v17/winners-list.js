/* =====================================================================
 * JADSTACK LOTTO V17 §3 — LIS «FICHE GAYAN» (Super Admin · Mini Super Admin
 * · Compagnie) ak filtè estati «Gagnant» kòm defo + kolòn prim.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const SB = () => L.supabase;
  const esc = L.escapeHtml || (s => String(s ?? ''));
  const money = n => Number(n || 0).toLocaleString('fr-HT',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' HTG';
  const today = () => new Date().toISOString().slice(0, 10);
  const ago = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

  /* §4 — Badj Statut: chak estati gen pwòp koulè li. Avant, tout sa ki pa
     'loser' te vèt, donk 'pending' (ap tann) te parèt tankou yon gayan. */
  const STATUS = {
    pending:   ['En attente', 'badge'],
    active:    ['Actif',   'badge'],
    won:       ['Gagnant',   'badge-success'],
    paid:      ['Payé',    'badge-success'],
    lost:      ['Perdu',    'badge-muted'],
    cancelled: ['Annuler',   'badge-danger']
  };
  const badge = s => {
    const x = STATUS[s] || [s || '—', 'badge'];
    return `<span class="badge ${x[1]}">${esc(x[0])}</span>`;
  };
  /* Les boules (bets) soti jan yo antre a: [{n:'12', game_code:'20', a:10}, ...] */
  const betsLine = bets => (Array.isArray(bets) ? bets : [])
    .map(b => `<span class="mono" style="margin-right:.5rem">${esc(b.n || '')}<small class="muted">×${esc(b.game_code || '')}</small></span>`)
    .join('') || '—';

  window.LotriShell.register('v17-winners', {
    render: async host => {
      host.innerHTML = `
        <div class="page-hd"><h2>Fiches gagnantes</h2>
          <p class="muted">Filtres estati a mete sou <strong>Gagnant</strong> pa defo, ak montan prim lan.</p></div>
        <div class="card"><div class="card-hd"><h3>Filtres</h3>
          <button class="btn btn-primary btn-sm" id="go"><i class="fa-solid fa-filter"></i> Appliquer</button></div>
          <div class="jl-form-grid" style="padding:.6rem 0">
            <div><label class="label">Du</label><input class="input" type="date" id="from" value="${today()}"></div>
            <div><label class="label">Au</label><input class="input" type="date" id="to" value="${today()}"></div>
            <div><label class="label">Statut</label>
              <select class="select" id="status"><option value="won" selected>Gagnant</option>
                <option value="">Tous les tickets</option></select></div>
          </div></div>
        <div class="card"><div class="card-hd"><h3>Résultats</h3><span class="muted" id="kpi"></span></div>
          <div id="tbl"><div class="spinner"></div></div></div>`;

      const $ = s => host.querySelector(s);

      async function load() {
        $('#tbl').innerHTML = '<div class="spinner"></div>';
        const onlyWin = $('#status').value === 'won';
        let rows = [];
        try {
          if (onlyWin) {
            const { data, error } = await SB().rpc('jl17_rpc_winner_tickets',
              { _from: $('#from').value || null, _to: $('#to').value || null, _company: null });
            if (error) throw error;
            rows = data || [];
          } else {
            const { data, error } = await SB().rpc('jl13_rpc_fiches', {
              _from: $('#from').value || today(),
              _to: $('#to').value || today(),
              _status: null, _company: null, _agent: null, _q: null
            });
            if (error) throw error;
            rows = data || [];
          }
        } catch (e) {
          $('#tbl').innerHTML = `<div class="empty">${esc(e.message || 'Erreur')}</div>`;
          return;
        }

        const prizes = rows.reduce((a, r) => a + Number(r.prize_amount || 0), 0);
        $('#kpi').textContent = rows.length + ' fiches · ' + money(prizes) + ' à payer';
        $('#tbl').innerHTML = rows.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Fiche</th><th>Compagnie</th><th>Agent</th><th>Tirage</th><th>Boule</th>
            <th class="num">Total</th><th class="num">Prime</th><th>Statut</th><th>Date</th><th></th></tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td class="mono"><b>#${esc(r.ticket_no)}</b></td>
            <td>${esc(r.company_name || '—')}</td><td>${esc(r.agent_name || '—')}</td>
            <td>${esc(r.draw_name || '—')}</td>
            <td>${betsLine(r.bets)}</td>
            <td class="num mono" data-copy-value="${Number(r.total || 0)}">${money(r.total)}</td>
            <td class="num mono" data-copy-value="${Number(r.prize_amount || 0)}">${money(r.prize_amount)}</td>
            <td>${badge(r.status)}</td>
            <td class="muted">${new Date(r.created_at || r.settled_at).toLocaleString('fr-HT')}</td>
            <td>${r.status === 'won' ? `<button class="btn btn-sm btn-primary" data-pay="${esc(r.id)}" data-no="${esc(r.ticket_no)}"><i class="fa-solid fa-money-bill-wave"></i> Payé Prime</button>` : ''}</td>
            </tr>`).join('')}
          </tbody></table></div>` : '<div class="empty">Aucun ticket gagnant pour cette période.</div>';
      }

      host.addEventListener('click', async e => {
        const p = e.target.closest('[data-pay]');
        if (!p) return;
        /* V48 — konfimasyon ANVAN nou make fich la peye, jan sa te mande a:
           yon fwa konfime, fich la pa valab ankò (pa gen retou). */
        const ok = await window.Lotri.ui.confirm(
          'Confirmer le paiement de la prime',
          `Avez-vous réellement payé le gagnant du ticket #${esc(p.dataset.no)} ? Une fois confirmé, ce ticket N'EST PLUS VALIDE.`
        );
        if (!ok) return;
        try {
          const { data, error } = await SB().rpc('jl13_rpc_pay_winner', { _ticket: p.dataset.pay });
          if (error) throw error;
          window.Lotri.toast('Fiche #' + data.ticket_no + ' marquer comme payé', 'success');
        } catch (err) {
          window.Lotri.toast(err.message || 'Erreur', 'error');
        }
        load();
      });

      $('#go').onclick = () => load();
      await load();
    }
  });
})();
