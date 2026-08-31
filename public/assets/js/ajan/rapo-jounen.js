/* =====================================================================
 * JADSTACK LOTTO — V27 FAZ 3 §3.3
 * VIEW « Rapport du jour » pou AJAN an (key: `arapo`)
 * ---------------------------------------------------------------------
 *  • Okenn nouvo RPC, okenn nouvo tab : nou li `jl9_tickets` dirèkteman
 *    (RLS deja limite ajan an sou pwòp tikè li).
 *  • Kat KPI sèvi menm sistèm koulè `v26.css` (.jl26-kpis > .jl26-kpi).
 *  • Chart.js pou koub lavant pa lè + repatisyon pa tiraj.
 *  • Liste des tickets jou a + filtè (tiraj · jeu · estati · dat).
 *  • Lojik Solde / Ventes / À payer PA touche :
 *        Ventes     = SUM(total)
 *        À payer = SUM(prize_amount)
 *        Solde   = Ventes − À payer
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;
  const esc = s => window.Lotri.escapeHtml(String(s ?? ''));
  const money = n => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' HTG';
  const int = n => Number(n || 0).toLocaleString('fr-HT');
  const today = () => {
    const d = new Date(), p = x => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const betsOf = t => {
    const v = t && t.bets;
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim()) { try { const o = JSON.parse(v); return Array.isArray(o) ? o : []; } catch (_) { return []; } }
    return [];
  };
  /* Yon tikè ka gen bets plat [{n,a,game_code}] oswa pa tiraj
     [{draw_id, bets:[...]}] — nou aplati tou de fòm yo. */
  const flatBets = t => {
    const out = [];
    betsOf(t).forEach(b => {
      if (b && Array.isArray(b.bets)) b.bets.forEach(x => out.push(x));
      else if (b) out.push(b);
    });
    return out;
  };
  const gameOf = b => String((b && (b.game_code || b.game)) || 'borlette').toUpperCase();

  let chartSales = null, chartDraws = null;

  function destroyCharts() {
    [chartSales, chartDraws].forEach(c => { try { c && c.destroy(); } catch (_) {} });
    chartSales = chartDraws = null;
  }

  LotriShell.register('arapo', {
    render: async (host) => {
      destroyCharts();

      const [{ data: draws }, { data: games }] = await Promise.all([
        SB().from('jl24_draws_today').select('id,name,sort_order').order('sort_order')
          .then(r => r.error ? SB().from('jl9_draws').select('id,name').limit(200) : r),
        SB().from('jl9_games').select('code,name').eq('active', true).order('code')
      ]);
      const drawName = {};
      (draws || []).forEach(d => { drawName[d.id] = d.name; });

      host.innerHTML = `
      <div class="jl27-page">
        <div class="page-hd jl26-daily-hd">
          <div>
            <h2>Rapport du jour</h2>
            <p class="muted">Solde = Ventes − À payer. Uniquement vos propres fiches.</p>
          </div>
          <span class="date-pill"><i class="fa-solid fa-calendar-day"></i> <span id="jl27-day">—</span></span>
        </div>

        <div class="card jl27-filters">
          <div class="card-hd"><h3>Filtres</h3>
            <button class="btn btn-primary btn-sm" id="jl27-go"><i class="fa-solid fa-filter"></i> Appliquer</button></div>
          <div class="jl27-frow">
            <label class="jl27-f"><span class="label">Date</span>
              <input class="input" type="date" id="jl27-date" value="${today()}"></label>
            <label class="jl27-f"><span class="label">Tirage</span>
              <select class="input" id="jl27-draw"><option value="">Tous</option>
                ${(draws || []).map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select></label>
            <label class="jl27-f"><span class="label">Jeu</span>
              <select class="input" id="jl27-game"><option value="">Tous</option>
                ${(games || []).map(g => `<option value="${esc(g.code)}">${esc(g.name || g.code)}</option>`).join('')}</select></label>
            <label class="jl27-f"><span class="label">Statut</span>
              <select class="input" id="jl27-status"><option value="">Tous</option>
                <option value="active">Actif</option><option value="won">Gagnant</option>
                <option value="paid">Payé</option><option value="lost">Perdu</option>
                <option value="cancelled">Annuler</option></select></label>
          </div>
        </div>

        <div class="jl26-kpis jl27-kpis" id="jl27-kpis"></div>

        <div class="jl27-charts">
          <div class="card"><div class="card-hd"><h3>Ventes par heure</h3></div>
            <div class="jl27-canvas"><canvas id="jl27-c1"></canvas></div></div>
          <div class="card"><div class="card-hd"><h3>Répartition par tirage</h3></div>
            <div class="jl27-canvas"><canvas id="jl27-c2"></canvas></div></div>
        </div>

        <div class="card"><div class="card-hd"><h3>Fiches du jour</h3>
            <span class="muted" id="jl27-count" style="font-size:.78rem"></span></div>
          <div id="jl27-list"></div></div>
      </div>`;

      const $ = s => host.querySelector(s);

      async function load() {
        const day = $('#jl27-date').value || today();
        const drawId = $('#jl27-draw').value;
        const game = $('#jl27-game').value;
        const status = $('#jl27-status').value;
        $('#jl27-day').textContent = new Date(day + 'T12:00:00').toLocaleDateString('fr-HT');

        let q = SB().from('jl9_tickets')
          .select('id,ticket_no,draw_id,total,prize_amount,status,bets,created_at,printed_at')
          .is('deleted_at', null)
          .gte('created_at', day + 'T00:00:00')
          .lte('created_at', day + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(2000);
        if (status) q = q.eq('status', status);
        const { data, error } = await q;
        if (error) throw new Error(error.message);

        let tickets = data || [];
        if (drawId) tickets = tickets.filter(t => String(t.draw_id) === drawId
          || flatBets(t).some(b => String(b.draw_id || '') === drawId));
        if (game) tickets = tickets.filter(t => flatBets(t).some(b => gameOf(b) === game.toUpperCase()));

        const sales = tickets.reduce((a, t) => a + Number(t.total || 0), 0);
        const pay = tickets.reduce((a, t) => a + Number(t.prize_amount || 0), 0);
        const wins = tickets.filter(t => t.status === 'won').length;
        const unpaid = tickets.filter(t => t.status === 'won')
          .reduce((a, t) => a + Number(t.prize_amount || 0), 0);

        $('#jl27-kpis').innerHTML = [
          { k: 'Ventes', v: money(sales), i: 'fa-solid fa-cash-register' },
          { k: 'Fiche', v: int(tickets.length), i: 'fa-solid fa-ticket' },
          { k: 'Fiches gagnantes', v: int(wins), i: 'fa-solid fa-trophy' },
          { k: 'À payer', v: money(unpaid), i: 'fa-solid fa-hand-holding-dollar' },
          { k: 'Solde', v: money(sales - pay), i: 'fa-solid fa-scale-balanced' }
        ].map(c => `<div class="jl26-kpi"><i class="ico ${c.i}"></i>
             <div class="k">${esc(c.k)}</div><div class="v mono">${esc(c.v)}</div></div>`).join('');

        /* ---- Chart 1 : lavant pa lè ---- */
        const byHour = new Array(24).fill(0);
        tickets.forEach(t => { byHour[new Date(t.created_at).getHours()] += Number(t.total || 0); });
        /* ---- Chart 2 : repatisyon pa tiraj ---- */
        const byDraw = {};
        tickets.forEach(t => {
          const k = drawName[t.draw_id] || 'Autre';
          byDraw[k] = (byDraw[k] || 0) + Number(t.total || 0);
        });

        destroyCharts();
        if (window.Chart) {
          const css = getComputedStyle(document.documentElement);
          const primary = css.getPropertyValue('--primary').trim() || '#2563eb';
          const accent = css.getPropertyValue('--accent').trim() || '#f59e0b';
          const text = css.getPropertyValue('--muted').trim() || '#888';
          Chart.defaults.color = text;
          Chart.defaults.font.family = 'Inter, system-ui, sans-serif';

          chartSales = new Chart($('#jl27-c1'), {
            type: 'line',
            data: {
              labels: byHour.map((_, h) => String(h).padStart(2, '0') + 'h'),
              datasets: [{
                label: 'Ventes (HTG)', data: byHour, tension: .35, fill: true,
                borderColor: primary, backgroundColor: `color-mix(in oklab, ${primary} 18%, transparent)`,
                pointRadius: 2, borderWidth: 2
              }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
            }
          });

          const labels = Object.keys(byDraw);
          chartDraws = new Chart($('#jl27-c2'), {
            type: 'doughnut',
            data: {
              labels: labels.length ? labels : ['Aucune donnée'],
              datasets: [{
                data: labels.length ? labels.map(k => byDraw[k]) : [1],
                backgroundColor: (labels.length ? labels : [1]).map((_, i) =>
                  i % 2 ? `color-mix(in oklab, ${accent} ${70 - i * 6}%, transparent)`
                        : `color-mix(in oklab, ${primary} ${80 - i * 6}%, transparent)`),
                borderWidth: 0
              }]
            },
            options: {
              responsive: true, maintainAspectRatio: false, cutout: '62%',
              plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } }
            }
          });
        }

        /* ---- Liste des tickets jou a ---- */
        $('#jl27-count').textContent = tickets.length + ' fich';
        $('#jl27-list').innerHTML = tickets.length
          ? `<div class="jl27-tickets">${tickets.map(t => {
              const bs = flatBets(t);
              return `<div class="jl27-tk" data-ticket="${esc(t.id)}">
                <div class="jl27-tk-hd">
                  <span class="mono no">${esc(t.ticket_no || '—')}</span>
                  <span class="badge ${t.status === 'won' ? 'badge-success' : t.status === 'cancelled' ? 'badge-danger' : ''}">${esc(t.status)}</span>
                </div>
                <div class="jl27-tk-bd">
                  <span class="muted"><i class="fa-solid fa-clock"></i> ${new Date(t.created_at).toLocaleTimeString('fr-HT')}</span>
                  <span class="muted"><i class="fa-solid fa-dice"></i> ${esc(drawName[t.draw_id] || '—')}</span>
                  <span class="muted"><i class="fa-solid fa-hashtag"></i> ${int(bs.length)} parye</span>
                </div>
                <div class="jl27-tk-ft">
                  <span class="mono tot">${esc(money(t.total))}</span>
                  ${Number(t.prize_amount || 0) > 0
                    ? `<span class="mono prize">+ ${esc(money(t.prize_amount))}</span>` : ''}
                </div>
              </div>`;
            }).join('')}</div>`
          : '<div class="empty"><i class="fa-solid fa-ticket"></i>Aucune fiche pour cette journée.</div>';
      }

      $('#jl27-go').onclick = () => load().catch(e => window.Lotri.toast(e.message, 'error'));
      ['#jl27-date', '#jl27-draw', '#jl27-game', '#jl27-status'].forEach(s => {
        $(s).addEventListener('change', () => load().catch(e => window.Lotri.toast(e.message, 'error')));
      });
      await load();
      /* Netwaye chart yo lè yon LÒT vi monte (setTimeout: pou nou pa kenbe
         evènman `lotri:view` ki soti nan pwòp montaj vi sa a). */
      setTimeout(() => document.addEventListener('lotri:view', destroyCharts, { once: true }), 0);
    }
  });
})();
