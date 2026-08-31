/* =====================================================================
 * V15-6 — MENI "FICHE" (Agent · Compagnie · Superadmin)
 *  Liste des tickets yo selon wòl · filtè dat/estati/chèche · klike = detay enprimab
 *  Popup gayan: jl13_rpc_my_wins + jl13_rpc_mark_wins_seen
 *  RPC: jl13_rpc_fiches(_from,_to,_status,_company,_agent,_q)
 * ===================================================================== */
(function () {
  const L = window.Lotri, v13 = L.v13, esc = v13.esc;

  const STATUS = {
    active: ['Actif', 'badge'],
    pending: ['En attente', 'badge'],
    won: ['Gagnant', 'badge-success'],
    paid: ['Payé', 'badge-success'],
    lost: ['Perdu', 'badge-muted'],
    cancelled: ['Annuler', 'badge-danger']
  };
  const chip = s => { const x = STATUS[s] || [s, 'badge']; return `<span class="badge ${x[1]}">${esc(x[0])}</span>`; };

  LotriShell.register('fiches', {
    render: async host => {
      const isSuper = (L.session && (L.session.role === 'super_admin')) || false;
      const [companies, agents] = await Promise.all([v13.companies(), v13.agents()]);
      host.innerHTML = `
        <div class="page-hd"><h2>Fiche <span data-jl27-winner-badge></span></h2>
          <p class="muted">Cliquez sur une ligne pour voir le ticket exactement tel qu'il est imprimé.</p></div>
        <div class="card"><div class="card-hd"><h3>Filtres</h3>
            <div class="row" style="gap:.4rem">
              <button class="btn btn-sm" id="only-wins"><i class="fa-solid fa-crown"></i> Gagnants uniquement</button>
              <button class="btn btn-sm" id="wins"><i class="fa-solid fa-trophy"></i> Mes gagnants</button>
              <button class="btn btn-primary btn-sm" id="go"><i class="fa-solid fa-filter"></i> Appliquer</button>
            </div></div>
          ${v13.filterRow(`
            ${v13.field('Du', `<input class="input" type="date" id="from" value="${v13.today()}">`)}
            ${v13.field('Au', `<input class="input" type="date" id="to" value="${v13.today()}">`)}
            ${v13.field('Statut', `<select class="input" id="status"><option value="">Tous</option>
               ${Object.keys(STATUS).map(k => `<option value="${k}">${STATUS[k][0]}</option>`).join('')}</select>`)}
            ${isSuper ? v13.field('Compagnie', `<select class="input" id="company"><option value="">Tous</option>${v13.options(companies)}</select>`) : ''}
            ${v13.field('Agent', `<select class="input" id="agent"><option value="">Tous</option>${v13.options(agents, '', 'id', 'full_name')}</select>`)}
            ${v13.field('Rechercher (numéro de ticket / série)', `<input class="input mono" id="q" placeholder="egz. 10234">`)}
          `)}
        </div>
        <div id="kpis"></div>
        <div class="card"><div class="card-hd"><h3>Liste des tickets</h3>${v13.exportBar('fiche-tbl', 'fich')}</div>
          <div id="tbl"><div class="empty">Chargement…</div></div></div>`;

      const $ = s => host.querySelector(s);

      async function load() {
        const rows = await v13.rpc('jl13_rpc_fiches', {
          _from: $('#from').value || v13.today(),
          _to: $('#to').value || v13.today(),
          _status: $('#status').value || null,
          _company: (isSuper && $('#company') ? $('#company').value : '') || null,
          _agent: $('#agent').value || null,
          _q: $('#q').value.trim() || null
        }) || [];

        const sales = rows.reduce((a, r) => a + Number(r.total || 0), 0);
        const pay = rows.reduce((a, r) => a + Number(r.prize_amount || 0), 0);
        $('#kpis').innerHTML = v13.kpis([
          { k: 'Fiche', v: v13.int(rows.length) },
          { k: 'Gagnant', v: v13.int(rows.filter(r => r.status === 'won' || r.status === 'paid').length), tone: 'ok' },
          { k: 'Ventes', v: v13.money(sales) },
          { k: 'À payer', v: v13.money(pay), tone: 'warn' },
          { k: 'Solde', v: v13.money(sales - pay) }
        ]);

        /* V48 — boulTxt te li x.number/x.boul, men fòm reyèl yon bet se
           {n, a, game_code} (jan sa antre nan POS ajan an). Se poutèt sa
           kolòn "Les boules" te toujou vid menm apre `bets` te rive. */
        const boulTxt = r => {
          let b = r.bets;
          if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = []; } }
          if (!Array.isArray(b) || !b.length) return '—';
          return b.map(x => `${esc(x.n ?? x.number ?? x.boul ?? '')}${x.a != null ? '=' + Number(x.a).toFixed(0) : ''}`).join(' · ');
        };

        $('#tbl').innerHTML = rows.length ? `<div class="table-wrap"><table class="table" id="fiche-tbl">
          <thead><tr><th>Fiche</th><th>Seri</th><th>Agent</th><th>Compagnie</th><th>Tirage</th>
            <th>Les boules</th><th class="num">Quantité</th><th class="num">Total</th><th class="num">À payer</th>
            <th>Statut</th><th>Date</th><th></th></tr></thead>
          <tbody>${rows.map(r => `<tr class="jl13-click" data-t="${esc(r.id)}">
            <td class="mono"><b>#${esc(r.ticket_no)}</b></td><td class="mono muted">${esc(r.serial || '—')}</td>
            <td>${esc(r.agent_name)}</td><td>${esc(r.company_name)}</td><td>${esc(r.draw_name)}</td>
            <td class="mono">${boulTxt(r)}</td>
            <td class="num">${v13.int(Array.isArray(r.bets) ? r.bets.length : (r.bets_count||0))}</td><td class="num mono">${v13.money(r.total)}</td>
            <td class="num mono">${Number(r.prize_amount) > 0 ? v13.money(r.prize_amount) : '—'}</td>
            <td>${chip(r.status)}</td><td class="muted">${v13.dt(r.created_at)}</td>
            <td><button class="btn btn-sm" data-detail="${esc(r.id)}"><i class="fa-solid fa-eye"></i> Détails</button></td>
            </tr>`).join('')}</tbody>
          </table></div>` : '<div class="empty">Aucun ticket pour ces filtres.</div>';

        $('#tbl').querySelectorAll('[data-t]').forEach(tr => tr.onclick = () => v13.ticketDetail(tr.dataset.t));
        $('#tbl').querySelectorAll('[data-detail]').forEach(b => b.onclick = e => {
          e.stopPropagation(); v13.ticketDetail(b.dataset.detail);
        });
        v13.wireExports(host);
      }

      $('#go').onclick = () => load().catch(e => v13.toast(e.message, 'error'));
      $('#q').addEventListener('keydown', e => { if (e.key === 'Enter') $('#go').click(); });
      $('#wins').onclick = () => winsPopup(false);
      /* §2 — filtè rapid "Gagnant" (fusion ansyen vi "Fiches gagnantes") */
      $('#only-wins').onclick = () => {
        $('#status').value = 'won';
        $('#go').click();
      };
      await load();
      /* §5.3 (PLAN-PRIME-KONEKTE-JWET) — badge « or » ak kantite fich
         gayan ki poko peye (li rafrechi apre chak chajman lis la). */
      if (window.Lotri.peyeGayan) window.Lotri.peyeGayan.refreshBadges();

      /* §1 — POPUP OTOMATIK RETIRE ISIT LA.
         assets/js/v17/winners.js se sèl responsab popup otomatik la (tan
         reyèl + mark_wins_seen). De sistèm ansanm te bay 2 modal pou menm
         fich la ak yon race condition sou jl13_rpc_mark_wins_seen.
         Bouton "Mes gagnants" anwo a rete pou louvri l manyèlman. */
    }
  });

  async function winsPopup(onlyNew) {
    const list = await v13.rpc('jl13_rpc_my_wins', { _only_new: !!onlyNew }) || [];
    if (!list.length) { if (!onlyNew) v13.toast('Aucune fiche gagnante pour le moment.', 'info'); return; }
    const m = v13.modal(`
      <h3><i class="fa-solid fa-trophy" style="color:#D9A441"></i> ${onlyNew ? 'Nouvelle fiche gagnante !' : 'Les fiches gagnantes'}</h3>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Fiche</th><th>Tirage</th><th class="num">Prix</th><th>Date</th></tr></thead>
        <tbody>${list.map(w => `<tr class="jl13-click" data-t="${esc(w.ticket_id || w.id)}">
          <td class="mono"><b>#${esc(w.ticket_no)}</b></td><td>${esc(w.draw_name || '—')}</td>
          <td class="num mono">${v13.money(w.prize_amount)}</td>
          <td class="muted">${v13.dt(w.created_at)}</td></tr>`).join('')}</tbody></table></div>
      <div class="row jl13-modal-ft"><button class="btn btn-primary" data-close>Bien compris</button></div>`, { wide: true });
    m.el.querySelectorAll('[data-t]').forEach(tr => tr.onclick = () => { m.close(); v13.ticketDetail(tr.dataset.t); });
    if (onlyNew) {
      const ids = list.map(w => w.id).filter(Boolean);
      if (ids.length) v13.rpc('jl13_rpc_mark_wins_seen', { _ids: ids }).catch(() => {});
    }
  }
  v13.winsPopup = winsPopup;
})();
