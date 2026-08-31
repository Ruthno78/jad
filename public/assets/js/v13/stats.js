/* =====================================================================
 * V15-5 — ESTATISTIK PA NIMEWO + DRILL-DOWN FICHE
 *  Tablo: Type | Boule | Quantité | Montant | Block   (SAN KOMISYON)
 *  Choisir tiraj -> lis fich ; klike fich -> detay exactement tel qu'il est imprimé
 *  Top 20 pi jwe · Top 20 pi genyen · graf lavant/kantite pa èdtan (Chart.js)
 *  RPC: jl13_rpc_stats_numbers · jl13_rpc_number_tickets · jl13_rpc_ticket_detail
 * ===================================================================== */
(function () {
  const L = window.Lotri, v13 = L.v13, SB = () => L.supabase, esc = v13.esc;

  LotriShell.register('v12-stats', {
    render: async host => {
      const [companies, medias, games] = await Promise.all([v13.companies(), v13.medias(), v13.games()]);
      host.innerHTML = `
        <div class="page-hd"><h2>Statistiques par numéro</h2>
          <p class="muted">Quelles boules sont jouées, combien de fois, pour quel montant. Aucune colonne de commission.</p></div>
        <div class="card"><div class="card-hd"><h3>Filtres</h3>
            <button class="btn btn-primary btn-sm" id="go"><i class="fa-solid fa-filter"></i> Appliquer</button></div>
          ${v13.filterRow(`
            ${v13.field('Du', `<input class="input" type="date" id="from" value="${v13.today()}">`)}
            ${v13.field('Au', `<input class="input" type="date" id="to" value="${v13.today()}">`)}
            ${v13.field('Compagnie', `<select class="input" id="company"><option value="">Tous</option>${v13.options(companies)}</select>`)}
            ${v13.field('Tirage', `<select class="input" id="media"><option value="">Tous</option>${v13.options(medias)}</select>`)}
            ${v13.field('Jeu', `<select class="input" id="game"><option value="">Tous</option>
                ${games.map(g => `<option value="${esc(g.code)}">${esc(g.name || g.code)}</option>`).join('')}</select>`)}
            ${v13.field('Rechercher une boule', `<input class="input mono" id="q" placeholder="egz. 23">`)}
          `)}
        </div>
        <div id="kpis"></div>
        <div class="jl13-2col">
          <div class="card"><div class="card-hd"><h3>Top 20 pi jwe</h3></div><div id="top-play"></div></div>
          <div class="card"><div class="card-hd"><h3>Top 20 pi genyen</h3></div><div id="top-win"></div></div>
        </div>
        <div class="card"><div class="card-hd"><h3>Ventes / quantité par heure</h3></div>
          <div style="padding:.6rem"><canvas id="chart" height="110"></canvas></div></div>
        <div class="card"><div class="card-hd"><h3>Détails par numéro</h3>${v13.exportBar('num-tbl', 'estatistik-boul')}</div>
          <div id="tbl"></div></div>
        <div class="card" id="fcard" style="display:none">
          <div class="card-hd"><h3 id="ft">Tickets</h3></div><div id="fiches"></div></div>`;

      const $ = s => host.querySelector(s);
      let rows = [], blocked = new Set();

      async function load() {
        const from = $('#from').value || v13.today(), to = $('#to').value || v13.today();
        const company = $('#company').value || null, media = $('#media').value || null, game = $('#game').value || null;

        rows = await v13.rpc('jl13_rpc_stats_numbers', {
          _from: from, _to: to, _company: company, _media: media, _game: game
        }) || [];

        const { data: blk } = await SB().from('jl12_blocked').select('number,active').eq('active', true);
        blocked = new Set((blk || []).map(b => String(b.number)));

        /* Boule ki genyen (drill sou tikè gayan) */
        let tq = SB().from('jl9_tickets').select('bets,total,prize_amount,status,created_at,company_id')
          .is('deleted_at', null)
          .gte('created_at', from + 'T00:00:00').lte('created_at', to + 'T23:59:59').limit(5000);
        if (company) tq = tq.eq('company_id', company);
        const { data: tks } = await tq;
        const wins = {}, hourly = {};
        (tks || []).forEach(t => {
          const h = new Date(t.created_at).getHours();
          hourly[h] = hourly[h] || { n: 0, s: 0 };
          hourly[h].n++; hourly[h].s += Number(t.total || 0);
          if (t.status === 'won' || t.status === 'paid') {
            (Array.isArray(t.bets) ? t.bets : []).forEach(b => {
              const n = String(b.n ?? b.number ?? '');
              wins[n] = wins[n] || { n: 0, amt: 0 };
              wins[n].n++; wins[n].amt += Number(t.prize_amount || 0);
            });
          }
        });
        draw(wins, hourly);
      }

      function draw(wins, hourly) {
        const q = $('#q').value.trim();
        const r = q ? rows.filter(x => String(x.number).includes(q)) : rows;
        const totAmt = r.reduce((a, x) => a + Number(x.amount || 0), 0);
        const totPlays = r.reduce((a, x) => a + Number(x.plays || 0), 0);
        $('#kpis').innerHTML = v13.kpis([
          { k: 'Boules différentes', v: v13.int(r.length) },
          { k: 'Total des mises jouées', v: v13.int(totPlays) },
          { k: 'Montant total', v: v13.money(totAmt) },
          { k: 'Boule bloquée', v: v13.int(r.filter(x => blocked.has(String(x.number))).length), tone: 'warn' }
        ]);

        $('#tbl').innerHTML = r.length ? `<div class="table-wrap"><table class="table" id="num-tbl">
          <thead><tr><th>Type</th><th>Boule</th><th class="num">Quantité</th><th class="num">Montant</th><th>Block</th><th></th></tr></thead>
          <tbody>${r.map(x => `<tr>
            <td>${esc(x.game_code)}</td><td class="mono"><b>${esc(x.number)}</b></td>
            <td class="num">${v13.int(x.plays)}</td><td class="num mono">${v13.money(x.amount)}</td>
            <td>${blocked.has(String(x.number)) ? '<span class="badge badge-danger">Bloqué</span>' : '<span class="badge">Lib</span>'}</td>
            <td><button class="btn btn-sm" data-n="${esc(x.number)}">Tickets <i class="fa-solid fa-chevron-right"></i></button></td>
          </tr>`).join('')}</tbody></table></div>` : '<div class="empty">Aucune boule pour cette période.</div>';

        const mini = (list, valFmt) => list.length ? `<div class="table-wrap"><table class="table">
            <thead><tr><th>#</th><th>Boule</th><th class="num">Valeur</th></tr></thead>
            <tbody>${list.map((x, i) => `<tr><td>${i + 1}</td><td class="mono"><b>${esc(x.k)}</b></td>
              <td class="num mono">${valFmt(x)}</td></tr>`).join('')}</tbody></table></div>`
          : '<div class="empty">Aucune donnée.</div>';

        $('#top-play').innerHTML = mini(
          [...r].sort((a, b) => b.plays - a.plays).slice(0, 20).map(x => ({ k: x.number, v: x.plays, a: x.amount })),
          x => `${v13.int(x.v)} fwa · ${v13.money(x.a)}`);
        $('#top-win').innerHTML = mini(
          Object.entries(wins).sort((a, b) => b[1].amt - a[1].amt).slice(0, 20).map(([k, v]) => ({ k, v: v.n, a: v.amt })),
          x => `${v13.int(x.v)} fiches · ${v13.money(x.a)}`);

        v13.wireExports(host);
        host.querySelectorAll('[data-n]').forEach(b => b.onclick = () => fiches(b.dataset.n));
        chart(hourly);
      }

      let ch;
      async function chart(hourly) {
        await v13.chartjs();
        const labels = [...Array(24).keys()].map(h => String(h).padStart(2, '0') + 'h');
        const sales = labels.map((_, h) => (hourly[h] || {}).s || 0);
        const cnt = labels.map((_, h) => (hourly[h] || {}).n || 0);
        if (ch) ch.destroy();
        ch = new window.Chart($('#chart'), {
          data: {
            labels,
            datasets: [
              { type: 'bar', label: 'Ventes', data: sales, backgroundColor: '#0E4C74' },
              { type: 'line', label: 'Nombre de fiches', data: cnt, borderColor: '#D9A441', yAxisID: 'y1', tension: .3 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true }, y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } } }
          }
        });
      }

      async function fiches(number) {
        const from = $('#from').value || v13.today(), to = $('#to').value || v13.today();
        const company = $('#company').value || null;
        const list = await v13.rpc('jl13_rpc_number_tickets',
          { _number: number, _from: from, _to: to, _company: company }) || [];
        $('#fcard').style.display = '';
        $('#ft').textContent = `Tickets contenant la boule ${number} (${list.length})`;
        $('#fiches').innerHTML = list.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Fiche</th><th>Agent</th><th>Compagnie</th><th>Tirage</th>
            <th class="num">Montant des boules</th><th class="num">Total des tickets</th><th>Statut</th><th>Date</th></tr></thead>
          <tbody>${list.map(t => `<tr class="jl13-click" data-t="${esc(t.ticket_id)}">
            <td class="mono"><b>#${esc(t.ticket_no)}</b></td><td>${esc(t.agent_name)}</td>
            <td>${esc(t.company_name)}</td><td>${esc(t.draw_name)}</td>
            <td class="num mono">${v13.money(t.amount)}</td><td class="num mono">${v13.money(t.total)}</td>
            <td>${esc(t.status)}</td><td class="muted">${v13.dt(t.created_at)}</td></tr>`).join('')}</tbody></table></div>`
          : '<div class="empty">Aucun ticket.</div>';
        $('#fiches').querySelectorAll('[data-t]').forEach(tr =>
          tr.onclick = () => v13.ticketDetail(tr.dataset.t, { hideOpenBalls: false }));
        $('#fcard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      $('#go').onclick = () => load().catch(e => v13.toast(e.message, 'error'));
      $('#q').oninput = () => draw({}, {});
      await load();
    }
  });

  /* Menm paj disponib anba kle 'stats' (ansyen meni) */
  LotriShell.register('stats', LotriShell.get('v12-stats'));
})();
