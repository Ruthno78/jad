/* =====================================================================
 * V15-4 — PAJ RAPÒ (SAN KOMISYON)
 *  Filtres: Tirages (plusieurs) · Date · Compagnie · Succursale · Agent · Type de jeu · Statut
 *  Tablo: Agent | Tfiches | Tfiches gagnant | Vente | À payer | Balance
 *  Dashboard: Total des ventes · Total des tickets · Total des gagnants non payés · Total des paiements
 *             Solde = Vente − À payer   (PA GEN "Total des commissions")
 *  Ekspòtasyon PDF / Excel / CSV / Imprimer — 100% kliyan.
 *  RPC: jl13_rpc_report(_from,_to,_company,_agent,_media)
 * ===================================================================== */
(function () {
  const L = window.Lotri, v13 = L.v13, SB = () => L.supabase, esc = v13.esc;

  /* V27 FAZ 2 §2.2 — mòd « Rapport journalier »
     Menm view la, men filtè yo prepoze sou jou a (from = to = jodi a).
     Okenn nouvo RPC: se menm jl13_rpc_report + menm lekti tikè yo. */
  const isDailyUrl = () =>
    new URL(location.href).searchParams.get('view') === 'reports-daily';

  const view = {
    render: async (host, opts) => {
      const DAILY = !!((opts && opts.daily) || isDailyUrl());
      const [companies, agents, branches, medias, games] = await Promise.all([
        v13.companies(), v13.agents(), v13.branches(), v13.medias(), v13.games()
      ]);
      host.innerHTML = `
        <div class="page-hd jl26-daily-hd">
          <div>
            <h2>${DAILY ? 'Rapport journalier' : 'Rapport'}</h2>
            <p class="muted">Solde = Ventes − À payer. Aucune colonne de commission sur cette page.</p>
          </div>
          ${DAILY
            ? `<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
                 <span class="date-pill"><i class="fa-solid fa-calendar-day"></i> ${v13.date(v13.today())}</span>
                 <button class="jl26-daily-btn ghost" id="jl26-full"><i class="fa-solid fa-sliders"></i> Rapport konplè</button>
               </div>`
            : `<button class="jl26-daily-btn" id="jl26-daily"><i class="fa-solid fa-calendar-day"></i> Rapport journalier</button>`}
        </div>
        <div class="card"><div class="card-hd"><h3>Filtres</h3>
            <button class="btn btn-primary btn-sm" id="go"><i class="fa-solid fa-filter"></i> Appliquer</button></div>
          ${v13.filterRow(`
            ${v13.field('Du', `<input class="input" type="date" id="from" value="${DAILY ? v13.today() : v13.daysAgo(7)}">`)}
            ${v13.field('Au', `<input class="input" type="date" id="to" value="${v13.today()}">`)}
            ${v13.field('Compagnie', `<select class="input" id="company"><option value="">Tous</option>${v13.options(companies)}</select>`)}
            ${v13.field('Succursale', `<select class="input" id="branch"><option value="">Tous</option>${v13.options(branches)}</select>`)}
            ${v13.field('Agent', `<select class="input" id="agent"><option value="">Tous</option>${v13.options(agents, '', 'id', 'full_name')}</select>`)}
            ${v13.field('Type de jeu', `<select class="input" id="game"><option value="">Tous</option>${games.map(g => `<option value="${esc(g.code)}">${esc(g.name || g.code)}</option>`).join('')}</select>`)}
            ${v13.field('Statut', `<select class="input" id="status"><option value="">Tous</option>
                <option value="pending">En attente</option><option value="won">Gagnant</option>
                <option value="lost">Perdu</option><option value="cancelled">Annuler</option></select>`)}
            ${v13.field('Tirages (plusieurs)', `<select class="input" id="media" multiple size="4">${v13.options(medias)}</select>`)}
          `)}
        </div>
        <div id="kpis"></div>
        <div class="card"><div class="card-hd"><h3>Par agent</h3>${v13.exportBar('rep-tbl', 'rapo-ajan')}</div>
          <div id="tbl"></div></div>
        <div class="card"><div class="card-hd"><h3>Par jour</h3>${v13.exportBar('day-tbl', 'rapo-jou')}</div>
          <div id="days"></div></div>`;

      const $ = s => host.querySelector(s);
      const mediaIds = () => [...$('#media').selectedOptions].map(o => o.value);

      async function load() {
        const from = $('#from').value || (DAILY ? v13.today() : v13.daysAgo(7)), to = $('#to').value || v13.today();
        const company = $('#company').value || null, agent = $('#agent').value || null;
        const branch = $('#branch').value || null, game = $('#game').value || null, status = $('#status').value || null;
        const ms = mediaIds();

        /* --- 1. Rezime pa jou (RPC ofisyèl) --- */
        let daily = [];
        if (ms.length) {
          const parts = await Promise.all(ms.map(m => v13.rpc('jl13_rpc_report',
            { _from: from, _to: to, _company: company, _agent: agent, _media: m })));
          daily = [].concat(...parts.map(p => p || []));
        } else {
          daily = await v13.rpc('jl13_rpc_report',
            { _from: from, _to: to, _company: company, _agent: agent, _media: null }) || [];
        }

        /* --- 2. Détails pa ajan (lekti dirèk tikè yo, RLS aplike) --- */
        let q = SB().from('jl9_tickets')
          .select('id,agent_id,company_id,branch_id,draw_id,total,prize_amount,status,bets,created_at')
          .is('deleted_at', null)
          .gte('created_at', from + 'T00:00:00')
          .lte('created_at', to + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(5000);
        if (company) q = q.eq('company_id', company);
        if (agent) q = q.eq('agent_id', agent);
        if (branch) q = q.eq('branch_id', branch);
        if (status) q = q.eq('status', status);
        const { data: tk, error } = await q;
        if (error) throw new Error(error.message);
        let tickets = tk || [];

        if (ms.length) {
          const { data: dr } = await SB().from('jl9_draws').select('id,media_id');
          const ok = new Set((dr || []).filter(d => ms.includes(d.media_id)).map(d => d.id));
          tickets = tickets.filter(t => ok.has(t.draw_id));
        }
        if (game) {
          const g = String(game).toLowerCase();
          tickets = tickets.filter(t => (Array.isArray(t.bets) ? t.bets : [])
            .some(b => String(b.game_code || b.game || 'borlette').toLowerCase() === g));
        }

        const nameOf = {}; agents.forEach(a => nameOf[a.id] = a.full_name);
        const per = {};
        tickets.forEach(t => {
          const k = t.agent_id || 'none';
          per[k] = per[k] || { name: nameOf[t.agent_id] || '—', n: 0, win: 0, sales: 0, pay: 0 };
          const p = per[k];
          p.n++; if (t.status === 'won') p.win++;
          p.sales += Number(t.total || 0); p.pay += Number(t.prize_amount || 0);
        });
        const rows = Object.values(per).sort((a, b) => b.sales - a.sales);
        const tot = rows.reduce((a, r) => ({
          n: a.n + r.n, win: a.win + r.win, sales: a.sales + r.sales, pay: a.pay + r.pay
        }), { n: 0, win: 0, sales: 0, pay: 0 });

        const unpaidPrizes = tickets.filter(t => t.status === 'won')
          .reduce((a, t) => a + Number(t.prize_amount || 0), 0);
        const paidPrizes = tickets.filter(t => t.status === 'paid')
          .reduce((a, t) => a + Number(t.prize_amount || 0), 0);

        $('#kpis').innerHTML = v13.kpis([
          { k: 'Total des ventes', v: v13.money(tot.sales) },
          { k: 'Total des tickets', v: v13.int(tot.n) },
          { k: 'Total des gagnants non payés', v: v13.money(unpaidPrizes), tone: 'warn' },
          { k: 'Total des paiements', v: v13.money(paidPrizes) },
          { k: 'Solde (Ventes − À payer)', v: v13.money(tot.sales - tot.pay), tone: 'ok' }
        ]);

        $('#tbl').innerHTML = rows.length ? `<div class="table-wrap"><table class="table" id="rep-tbl">
          <thead><tr><th>Agent</th><th class="num">Tfiches</th><th class="num">Tfiches gagnant</th>
            <th class="num">Vente</th><th class="num">À payer</th><th class="num">Balance</th></tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td>${esc(r.name)}</td><td class="num">${v13.int(r.n)}</td><td class="num">${v13.int(r.win)}</td>
            <td class="num mono">${v13.money(r.sales)}</td><td class="num mono">${v13.money(r.pay)}</td>
            <td class="num mono"><b>${v13.money(r.sales - r.pay)}</b></td></tr>`).join('')}</tbody>
          <tfoot><tr><th>TOTAL</th><th class="num">${v13.int(tot.n)}</th><th class="num">${v13.int(tot.win)}</th>
            <th class="num">${v13.money(tot.sales)}</th><th class="num">${v13.money(tot.pay)}</th>
            <th class="num">${v13.money(tot.sales - tot.pay)}</th></tr></tfoot>
          </table></div>` : '<div class="empty">Aucune donnée pour ces filtres.</div>';

        $('#days').innerHTML = daily.length ? `<div class="table-wrap"><table class="table" id="day-tbl">
          <thead><tr><th>Date</th><th>Compagnie</th><th class="num">Ticket</th><th class="num">Vente</th>
            <th class="num">À payer</th><th class="num">Balance</th></tr></thead>
          <tbody>${daily.map(d => `<tr>
            <td>${v13.date(d.day)}</td><td>${esc(d.company_name)}</td>
            <td class="num">${v13.int(d.tickets)}</td><td class="num mono">${v13.money(d.sales)}</td>
            <td class="num mono">${v13.money(d.prizes)}</td>
            <td class="num mono"><b>${v13.money(Number(d.sales || 0) - Number(d.prizes || 0))}</b></td>
          </tr>`).join('')}</tbody></table></div>` : '<div class="empty">Aucun résumé journalier.</div>';

        v13.wireExports(host);
      }

      const daily = host.querySelector('#jl26-daily');
      if (daily) daily.onclick = () => LotriShell.go('reports-daily');
      const full = host.querySelector('#jl26-full');
      if (full) full.onclick = () => LotriShell.go('reports');

      $('#go').onclick = () => load().catch(e => v13.toast(e.message, 'error'));
      await load();
    }
  };

  LotriShell.register('reports', view);
  /* Menm view la, men prepoze sou jou a (Compagnie + Super Admin). */
  LotriShell.register('reports-daily', {
    render: host => view.render(host, { daily: true })
  });
})();
