/* JADSTACK LOTTO V12 — ESTATISTIK AK FILT DAT (§8) */
(function () {
  const L = window.Lotri, v12 = L.v12, esc = v12.esc;
  const money = n => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' HTG';
  const iso = d => d.toISOString().slice(0, 10);
  window.LotriShell.register('v12-stats', {
    async render(host) {
      const to = new Date(), from = new Date(Date.now() - 6 * 864e5);
      host.innerHTML = `
        ${L.v11 ? L.v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'Estatistik' }]) : ''}
        <div class="jl-card"><h3><i class="fa-solid fa-chart-line"></i> Estatistik</h3>
          <div class="jl-form-grid">
            <div><label class="label">Du</label><input class="input" type="date" id="f" value="${iso(from)}"></div>
            <div><label class="label">Au</label><input class="input" type="date" id="t" value="${iso(to)}"></div>
            <div style="align-self:end"><button class="btn btn-primary" id="go"><i class="fa-solid fa-filter"></i> Filtrer</button></div>
          </div>
          <div id="cards" style="margin-top:1rem"><div class="spinner"></div></div>
          <div class="jl-scroll" style="margin-top:1rem"><table class="table"><thead class="jl-sticky-hd">
            <tr><th>Date</th><th>Ticket</th><th>Ventes</th><th>Prime</th><th>Net</th></tr></thead>
            <tbody id="db"></tbody></table></div>
        </div>`;
      async function load() {
        const f = host.querySelector('#f').value, t = host.querySelector('#t').value;
        if (f && t && f > t) { L.toast('La date « Du » doit précéder la date « Au ».', 'error'); return; }
        host.querySelector('#cards').innerHTML = '<div class="spinner"></div>';
        try {
          const s = await v12.rpc('jl12_rpc_stats', { _from: f, _to: t });
          host.querySelector('#cards').innerHTML = `<div class="jl-form-grid">
            ${[['Ticket', s.tickets], ['Ventes', money(s.sales)], ['Prime', money(s.prizes)], ['Net', money(s.net)]]
              .map(([k, v]) => `<div class="jl-card" style="margin:0"><div class="muted" style="font-size:.75rem">${k}</div>
                <div style="font-size:1.15rem;font-weight:700">${esc(String(v))}</div></div>`).join('')}</div>`;
          host.querySelector('#db').innerHTML = (s.by_day || []).length ? s.by_day.map(d => `<tr>
            <td>${esc(d.d)}</td><td>${esc(String(d.tickets))}</td><td>${money(d.sales)}</td>
            <td>${money(d.prizes)}</td><td>${money(Number(d.sales || 0) - Number(d.prizes || 0))}</td></tr>`).join('')
            : '<tr><td colspan="5" class="muted">Aucune donnée pour cette période.</td></tr>';
        } catch (e) { host.querySelector('#cards').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
      }
      host.querySelector('#go').onclick = load;
      await load();
    }
  });
})();
