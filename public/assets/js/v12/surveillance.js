/* JADSTACK LOTTO V12 — SIVEYANS MACHIN (§7) : Vèt / Wouj / Ble */
(function () {
  const L = window.Lotri, v12 = L.v12, esc = v12.esc;
  window.LotriShell.register('v12-machines', {
    async render(host) {
      host.innerHTML = `
        ${L.v11 ? L.v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'Surveillance des machines' }]) : ''}
        <div class="jl-card"><h3><i class="fa-solid fa-desktop"></i> Surveillance des machines
          <span class="jl-chip"><span class="jl-dot green"></span>Actif</span>
          <span class="jl-chip"><span class="jl-dot red"></span>Inactif (+10 min)</span>
          <span class="jl-chip"><span class="jl-dot blue"></span>Bloqué</span>
          <button class="btn btn-sm btn-ghost" id="ref" style="margin-left:auto"><i class="fa-solid fa-rotate"></i></button></h3>
          <div class="jl-scroll"><table class="table"><thead class="jl-sticky-hd"><tr>
            <th>Statut</th><th>Agent</th><th>ID</th><th>Compagnie</th><th>Machine</th><th>Dernier signe</th>
          </tr></thead><tbody id="mb"><tr><td colspan="6"><div class="spinner"></div></td></tr></tbody></table></div>
        </div>`;
      async function paint() {
        try {
          const rows = await v12.rpc('jl12_rpc_machines');
          host.querySelector('#mb').innerHTML = (rows || []).length ? rows.map(r => `
            <tr data-jl-title="Machine" data-jl-row='${esc(JSON.stringify({
              Agent : r.full_name, ID: r.public_id, Compagnie: r.company_name || '—',
              Statut: r.state, 'Minutes sans signe': r.minutes_off, Machine: r.device || '—',
              'Dernier signe': r.last_seen ? new Date(r.last_seen).toLocaleString('fr-HT') : 'Jamè'
            }))}'>
            <td><span class="jl-dot ${esc(r.color)}"></span>${esc(r.state)}</td>
            <td>${esc(r.full_name || '—')}</td><td>${esc(r.public_id || '—')}</td>
            <td>${esc(r.company_name || '—')}</td><td>${esc(r.device || '—')}</td>
            <td>${r.last_seen ? esc(new Date(r.last_seen).toLocaleString('fr-HT')) : '<span class="muted">Jamè</span>'}</td></tr>`).join('')
            : '<tr><td colspan="6" class="muted">Aucune machine.</td></tr>';
          v12.wireRows(host);
        } catch (e) {
          host.querySelector('#mb').innerHTML = `<tr><td colspan="6" class="muted">${esc(e.message)}</td></tr>`;
        }
      }
      host.querySelector('#ref').onclick = paint;
      await paint();
      const t = setInterval(() => { document.body.contains(host) ? paint() : clearInterval(t); }, 60000);
    }
  });
})();
