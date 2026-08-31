/* =====================================================================
 * V15-7 — SIVEYANS MACHIN
 *  Kat pa konpayi (klike = wè machin yo) · Vèt aktif / Wouj inactif / Ble bloke
 *  Règ: yon dekoneksyon mwens pase 10 minutes PA konte kòm "inactif".
 *  Graf pòsyon: tranch 4è (jl13_rpc_machine_slices) · rafrechi otomatik 60s
 * ===================================================================== */
(function () {
  const L = window.Lotri, v13 = L.v13, esc = v13.esc;
  const TONE = { aktif: 'ok', inaktif: 'danger', bloke: 'info' };

  LotriShell.register('v12-machines', {
    render: async host => {
      host.innerHTML = `
        <div class="page-hd"><h2>Surveillance des machines</h2>
          <p class="muted">Vert = actif · Rouge = inactif (plus de 10 minutes sans signal) · Bleu = bloqué.</p></div>
        <div class="card"><div class="card-hd"><h3>Filtres</h3>
            <button class="btn btn-sm" id="go"><i class="fa-solid fa-rotate"></i> Rafrechi</button></div>
          ${v13.filterRow(`${v13.field('Jour', `<input class="input" type="date" id="day" value="${v13.today()}">`)}`)}
        </div>
        <div id="kpis"></div>
        <div class="card"><div class="card-hd"><h3>Compagnie</h3></div><div id="comps" class="jl13-cards"></div></div>
        <div class="jl13-2col">
          <div class="card"><div class="card-hd"><h3 id="mt">Machines</h3>${v13.exportBar('mach-tbl', 'machin')}</div>
            <div id="mach"></div></div>
          <div class="card"><div class="card-hd"><h3 id="st">Tranches d'activité (4 h)</h3></div>
            <div style="padding:.8rem"><canvas id="pie" height="220"></canvas></div>
            <div id="slices"></div></div>
        </div>`;

      const $ = s => host.querySelector(s);
      let machines = [], company = null, timer = null;

      async function load() {
        const day = $('#day').value || v13.today();
        machines = await v13.rpc('jl12_rpc_machines') || [];
        let byComp = [];
        try { byComp = await v13.rpc('jl13_rpc_machines_by_company', { _day: day }) || []; } catch (e) { byComp = []; }

        const c = { aktif: 0, inaktif: 0, bloke: 0 };
        machines.forEach(m => { c[m.state] = (c[m.state] || 0) + 1; });
        $('#kpis').innerHTML = v13.kpis([
          { k: 'Total des machines', v: v13.int(machines.length) },
          { k: 'Actif', v: v13.int(c.aktif), tone: 'ok' },
          { k: 'Inactif', v: v13.int(c.inaktif), tone: 'danger' },
          { k: 'Bloqué', v: v13.int(c.bloke), tone: 'info' }
        ]);

        const groups = {};
        machines.forEach(m => {
          const k = m.company_id || 'none';
          groups[k] = groups[k] || { id: m.company_id, name: m.company_name || '—', aktif: 0, inaktif: 0, bloke: 0, n: 0 };
          groups[k].n++; groups[k][m.state] = (groups[k][m.state] || 0) + 1;
        });
        const extra = {}; byComp.forEach(r => extra[r.company_id] = r);

        $('#comps').innerHTML = Object.values(groups).length ? Object.values(groups).map(g => {
          const e = extra[g.id] || {};
          return `<button class="jl13-card ${company === g.id ? 'is-on' : ''}" data-c="${esc(g.id || '')}">
            <div class="jl13-card-t">${esc(g.name)}</div>
            <div class="jl13-card-n">${v13.int(g.n)} machin</div>
            <div class="row jl13-dots">
              <span class="dot dot-green"></span>${v13.int(g.aktif)}
              <span class="dot dot-red"></span>${v13.int(g.inaktif)}
              <span class="dot dot-blue"></span>${v13.int(g.bloke)}
            </div>
            ${e.tickets != null ? `<div class="muted sm">${v13.int(e.tickets)} fiches · ${v13.money(e.sales)}</div>` : ''}
          </button>`;
        }).join('') : '<div class="empty">Aucune machine.</div>';

        $('#comps').querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
          company = company === b.dataset.c ? null : b.dataset.c;
          renderMachines(); slices();
          $('#comps').querySelectorAll('.jl13-card').forEach(x => x.classList.toggle('is-on', x.dataset.c === company));
        });

        renderMachines(); await slices();
      }

      function renderMachines() {
        const list = company ? machines.filter(m => m.company_id === company) : machines;
        $('#mt').textContent = company ? `Machine — ${(list[0] || {}).company_name || ''}` : 'Tous machin yo';
        $('#mach').innerHTML = list.length ? `<div class="table-wrap"><table class="table" id="mach-tbl">
          <thead><tr><th>Statut</th><th>Agent</th><th>ID</th><th>Appareil</th><th>Dènye siyal</th><th class="num">Min. san siyal</th></tr></thead>
          <tbody>${list.map(m => `<tr>
            <td><span class="badge badge-${TONE[m.state] || 'muted'}">${esc(m.state)}</span></td>
            <td>${esc(m.full_name)}</td><td class="mono muted">${esc(m.public_id || '—')}</td>
            <td>${esc(m.device || '—')}</td><td class="muted">${v13.dt(m.last_seen)}</td>
            <td class="num mono">${m.minutes_off >= 99999 ? '—' : v13.int(m.minutes_off)}</td></tr>`).join('')}</tbody>
          </table></div>` : '<div class="empty">Aucune machine.</div>';
        v13.wireExports(host);
      }

      let pie;
      async function slices() {
        const day = $('#day').value || v13.today();
        const rows = await v13.rpc('jl13_rpc_machine_slices', { _day: day, _company: company, _agent: null }) || [];
        $('#slices').innerHTML = `<div class="table-wrap"><table class="table">
          <thead><tr><th>Tranch</th><th class="num">Fiche</th><th class="num">Ventes</th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${esc(r.slot)}</td><td class="num">${v13.int(r.tickets)}</td>
            <td class="num mono">${v13.money(r.sales)}</td></tr>`).join('')}</tbody></table></div>`;
        await v13.chartjs();
        if (pie) pie.destroy();
        const total = rows.reduce((a, r) => a + Number(r.tickets || 0), 0);
        pie = new window.Chart($('#pie'), {
          type: 'doughnut',
          data: {
            labels: total ? rows.map(r => r.slot) : ['Aucune activité'],
            datasets: [{
              data: total ? rows.map(r => Number(r.tickets || 0)) : [1],
              backgroundColor: total
                ? ['#0E4C74', '#1B6EA0', '#3A93C6', '#D9A441', '#B87333', '#6B7A8F']
                : ['#dfe4ea']
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
      }

      $('#go').onclick = () => load().catch(e => v13.toast(e.message, 'error'));
      /* V27 FAZ 4 — bouton « Télécharger Application POS » apa, byen ekate */
      if (window.Lotri.apk) await window.Lotri.apk.mountButton(host, { spaced: true });
      await load();
      timer = setInterval(() => load().catch(() => {}), 60000);
      host.addEventListener('lotri:unmount', () => clearInterval(timer));
    }
  });

  LotriShell.register('machines', LotriShell.get('v12-machines'));
  LotriShell.register('surveillance', LotriShell.get('v12-machines'));
})();
