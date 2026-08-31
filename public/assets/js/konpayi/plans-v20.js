/* =====================================================================
 * V20 · #7 + #8 — PAJ «PLAN YO» POU KONPAYI
 *  - Lis plan aktif yo (jl13_rpc_my_plans)
 *  - Forfait aktyèl la make
 *  - Bouton «Passer à ce forfait» (jl13_rpc_upgrade_plan) ak pworata
 *  - window.LotriPlans.limitPopup(max) : popup limit ajan (#7)
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  const money = (v, c) => Number(v || 0).toFixed(2) + ' ' + (c || 'HTG');
  const periodLbl = p => ({ monthly: '30 jours', quarterly: '90 jours', yearly: '1 an', once: 'une seule fois' }[p] || p);

  async function loadData() {
    const { data, error } = await SB().rpc('jl13_rpc_my_plans');
    if (error) throw new Error(error.message);
    return data || { plans: [], agents: 0, current: null };
  }

  async function upgrade(planId, planName) {
    const ok = await window.Lotri.ui.confirm(
      'Passer au plan «' + planName + '»?',
      'La facture du mois en cours reste due telle quelle. La nouvelle période commence aujourd\'hui.');
    if (!ok) return null;
    const { data, error } = await SB().rpc('jl13_rpc_upgrade_plan', {
      _company: null, _new_plan: planId
    });
    if (error) throw new Error(error.message);
    return data;
  }

  function render(host, d) {
    const cur = d.current || null;
    const plans = d.plans || [];
    host.innerHTML = `
      <div class="card">
        <div class="card-hd"><h3>Les plans</h3>
          <span class="chip"><i class="fa-solid fa-users"></i> ${d.agents || 0} agents actifs</span></div>
        ${cur ? `<p class="muted">Votre forfait actuel : <strong>${esc(cur.name)}</strong>${
            cur.max_agents != null ? ` — jiska <strong>${cur.max_agents}</strong> ajan` : ' — agents illimités'}.</p>`
          : '<p class="muted">Vous n\'avez aucun forfait actif pour le moment.</p>'}
        <div class="plan-grid">
          ${plans.map(p => {
            const isCur = cur && cur.plan_id === p.id;
            const higher = !cur || cur.max_agents == null ? false
              : (p.max_agents == null || p.max_agents > cur.max_agents);
            return `<div class="card plan-card${isCur ? ' is-current' : ''}" style="margin-top:1rem">
              <div class="card-hd"><h4>${esc(p.name)}</h4>
                ${isCur ? '<span class="badge badge-success">Forfait aktyèl</span>' : ''}</div>
              <p class="plan-price"><strong>${money(p.price, p.currency)}</strong> / ${periodLbl(p.period)}</p>
              <ul class="plan-feats">
                <li>Agent : <strong>${p.max_agents == null ? 'san limit' : p.max_agents}</strong></li>
                <li>Sikisal: <strong>${p.max_branches == null ? 'san limit' : p.max_branches}</strong></li>
                <li>Machine: <strong>${p.max_machines == null ? 'san limit' : p.max_machines}</strong></li>
              </ul>
              ${p.description ? `<p class="muted">${esc(p.description)}</p>` : ''}
              ${isCur ? ''
                : higher || !cur
                  ? `<button class="btn btn-primary" data-up="${p.id}" data-name="${esc(p.name)}">
                       <i class="fa-solid fa-arrow-up"></i> Passer à ce forfait</button>`
                  : '<button class="btn" disabled>Contacter Super Admin</button>'}
            </div>`;
          }).join('') || '<div class="empty"><i class="fa-solid fa-box"></i>Aucun forfait disponible.</div>'}
        </div>
      </div>`;

    host.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-up]');
      if (!b) return;
      try {
        const res = await upgrade(b.dataset.up, b.dataset.name);
        if (!res) return;
        window.Lotri.toast(
          'Vous pouvez désormais saisir jusqu’à ' +
          (res.max_agents == null ? 'san limit' : res.max_agents) +
          ' agents. La nouvelle période commence aujourd\'hui.', 'success');
        render(host, await loadData());
      } catch (ex) {
        window.Lotri.toast(ex.message || 'Impossible de changer le plan.', 'error');
      }
    });
  }

  if (window.LotriShell) {
    LotriShell.register('v20-plans', {
      render: async (host) => {
        host.innerHTML = '<div class="card"><div class="empty">Chargement des forfaits…</div></div>';
        try { render(host, await loadData()); }
        catch (ex) {
          host.innerHTML = `<div class="alert alert-error">${esc(ex.message || 'Erreur')}</div>`;
        }
      }
    });
  }

  /* ---------- #7 — Popup limit ajan ---------- */
  function limitPopup(max) {
    const m = document.createElement('div');
    m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal">
      <h3><i class="fa-solid fa-triangle-exclamation"></i> Limite du forfait atteinte</h3>
      <p>Vous ne pouvez pas dépasser <strong>${esc(String(max))}</strong> ajan ak plan aktyèl ou a.
         Pase nan yon plan siperyè pou ogmante limit la, oswa gade lis plan yo.</p>
      <div class="row" style="justify-content:flex-end;margin-top:1rem">
        <button class="btn btn-ghost" data-close>Fermer</button>
        <button class="btn btn-primary" data-plans><i class="fa-solid fa-layer-group"></i> Voir la liste des forfaits</button>
      </div></div>`;
    document.body.appendChild(m);
    m.querySelector('[data-close]').onclick = () => m.remove();
    m.querySelector('[data-plans]').onclick = () => { m.remove(); LotriShell.go('v20-plans'); };
  }

  /* Messages SQL la vini kòm «LIMIT_PLAN:5» — tradui l an popup. */
  function handleAgentError(err) {
    const msg = (err && (err.message || err.hint)) || '';
    const hit = /LIMIT_PLAN:(\d+)/.exec(msg);
    if (hit) { limitPopup(hit[1]); return true; }
    return false;
  }

  window.LotriPlans = { limitPopup, handleAgentError, loadData };
})();
