/* =====================================================================
 * JADSTACK LOTTO V28 — MARYAJ GRATIS (bò SUPERADMIN)
 * ---------------------------------------------------------------------
 * • Activer / dezaktive kado a.
 * • Choisir kondisyon an: apre X boul jwe nan yon fich, oswa apre chak X
 *   fich yon ajan fè.
 * • Limite konbyen fwa yon itilizatè ka resevwa l (0 = san limit).
 * • Voir lis itilizatè ki resevwa kado a.
 * Anyen lòt nan Superadmin lan pa touche.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const V = (L.v28 = L.v28 || {});
  const SB = () => L.supabase;
  if (!window.LotriShell) return;
  const esc = L.escapeHtml || (s => String(s == null ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const toast = (m, k) => (L.toast ? L.toast(m, k) : console.log(k || 'info', m));
  const dt = s => { try { return new Date(s).toLocaleString(); } catch (_) { return s || ''; } };

  async function loadConfig() {
    try {
      const { data, error } = await SB().rpc('jl28_rpc_mg_config');
      if (error) throw error;
      return data || {};
    } catch (_) { return {}; }
  }

  async function loadAwards() {
    try {
      const { data, error } = await SB().rpc('jl28_rpc_mg_awards', { _limit: 200 });
      if (error) throw error;
      return data || [];
    } catch (_) { return []; }
  }

  function form(c) {
    const ct = c.condition_type || 'per_ball';
    return `
      <div class="card">
        <div class="card-hd"><h3><i class="fa-solid fa-gift"></i> Mariage GRATUIT — règles</h3></div>
        <form id="jl28-mg-form" class="jl13-form">
          <div class="form-grid">
            <div>
              <label class="label">Statut</label>
              <select class="input" name="enabled">
                <option value="1" ${c.enabled ? 'selected' : ''}>Activer</option>
                <option value="0" ${!c.enabled ? 'selected' : ''}>Désactiver</option>
              </select>
            </div>
            <div>
              <label class="label">Conditions d\'attribution du cadeau</label>
              <select class="input" name="condition_type">
                <option value="per_ball"   ${ct === 'per_ball' ? 'selected' : ''}>Après un certain nombre de boules jouées sur un ticket</option>
                <option value="per_ticket" ${ct === 'per_ticket' ? 'selected' : ''}>Après un certain nombre de tickets réalisés par l\'agent</option>
              </select>
            </div>
            <div>
              <label class="label">Quantité (boules ou tickets)</label>
              <input class="input" type="number" min="1" step="1" name="threshold"
                     value="${Number(c.threshold || 1)}">
            </div>
            <div>
              <label class="label">Limite par utilisateur (0 = sans limite)</label>
              <input class="input" type="number" min="0" step="1" name="max_per_agent"
                     value="${Number(c.max_per_agent || 0)}">
            </div>
            <div>
              <label class="label">Code du jeu cadeau</label>
              <input class="input" name="game_code" value="${esc(c.game_code || 'mariage_gratuit')}">
              <small class="muted">La boule cadeau est toujours enregistrée au prix <b>0</b> et marquée « bonus/cadeau ».</small>
            </div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:.8rem">
            <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Enregistrer les règles</button>
          </div>
        </form>
      </div>`;
  }

  function table(rows) {
    return `
      <div class="card">
        <div class="card-hd"><h3><i class="fa-solid fa-users"></i> Utilisateurs ayant reçu le cadeau</h3></div>
        ${rows.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Agent</th><th>Compagnie</th><th>Fiche</th><th>Boule cadeau</th><th>Prix</th><th>Date</th></tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td>${esc(r.agent_name)}</td><td>${esc(r.company_name)}</td>
            <td class="mono">${esc(r.ticket_no)}</td>
            <td class="mono">${esc(r.number)}</td>
            <td><span class="badge">0 HTG</span></td>
            <td>${esc(dt(r.awarded_at))}</td></tr>`).join('')}</tbody>
        </table></div>` : '<div class="empty">Personne n\'a encore reçu le Mariage GRATUIT.</div>'}
      </div>`;
  }

  LotriShell.register('mg-config', {
    title: 'Mariage GRATUIT',
    async render(host) {
      const [c, rows] = await Promise.all([loadConfig(), loadAwards()]);
      host.innerHTML =
        (V.mg ? V.mg.panelHtml() : '') +
        form(c) +
        table(rows);

      const f = host.querySelector('#jl28-mg-form');
      if (!f) return;
      f.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(f);
        const cfg = {
          company_id: c.company_id || null,
          enabled: fd.get('enabled') === '1',
          condition_type: fd.get('condition_type'),
          threshold: Number(fd.get('threshold') || 1),
          max_per_agent: Number(fd.get('max_per_agent') || 0),
          game_code: (fd.get('game_code') || 'mariage_gratuit').trim(),
        };
        try {
          const { error } = await SB().rpc('jl28_rpc_mg_config_save', { _cfg: cfg });
          if (error) throw error;
          toast('Les règles du Mariage GRATUIT sont enregistrées.', 'success');
          LotriShell.go('mg-config');
        } catch (err) {
          toast((err && err.message) || 'Impossible d\'enregistrer les règles.', 'error');
        }
      };
    }
  });
})();
