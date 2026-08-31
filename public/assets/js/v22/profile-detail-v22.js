/* =====================================================================
 * V22 · C3 — POPUP DETAY KONPAYI / AJAN + etikèt non plan
 * ---------------------------------------------------------------------
 *   window.Lotri.showCompanyDetail(id)
 *   window.Lotri.showAgentDetail(id)
 *   window.Lotri.planLabel(companyId)  → « Starter » | null
 * Delegasyon: <tr data-company="…"> / <tr data-agent="…">
 * ===================================================================== */
(function () {
  const L = window.Lotri || (window.Lotri = {});
  const SB = () => window.Lotri.supabase;
  const esc = (s) => window.Lotri.escapeHtml(String(s == null ? '' : s));

  let planCache = null;
  L.companyPlans = async function () {
    if (planCache) return planCache;
    const { data } = await SB().from('jl13_company_plan_v').select('*');
    planCache = {};
    (data || []).forEach(r => { planCache[r.company_id] = r; });
    return planCache;
  };
  L.planLabel = async function (companyId) {
    const p = await L.companyPlans();
    const r = p[companyId];
    return r && r.plan_name ? r.plan_name : null;
  };

  const tel = (v) => v ? `<a href="tel:${esc(v)}">${esc(v)}</a>` : '<span class="muted">—</span>';
  const mail = (v) => v ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : '<span class="muted">—</span>';
  const line = (k, v) => `<div><span class="muted">${esc(k)} :</span> ${v}</div>`;

  function modal(title, body) {
    const m = document.createElement('div');
    m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal" style="max-width:520px"><h3>${esc(title)}</h3>
      <div class="form-grid" style="gap:.45rem">${body}</div>
      <div class="row" style="justify-content:flex-end;margin-top:1rem">
        <button class="btn btn-ghost" data-close>Fermer</button></div></div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('[data-close]').onclick = close;
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
  }

  L.showCompanyDetail = async function (id) {
    const { data: c, error } = await SB().from('jl9_companies').select('*').eq('id', id).maybeSingle();
    if (error || !c) { window.Lotri.toast((error && error.message) || 'Compagnie introuvable', 'error'); return; }
    const plan = await L.planLabel(id);
    modal(`${c.name}${plan ? ' (' + plan + ')' : ''}`, [
      line('Nom', `<strong>${esc(c.name)}</strong>`),
      line('Forfait', plan ? `<span class="chip">${esc(plan)}</span>` : '<span class="muted">—</span>'),
      line('Statut', `<span class="badge ${c.status === 'active' ? 'badge-success' : 'badge-danger'}">${esc(c.status)}</span>`),
      line('Téléphone', tel(c.phone)),
      line('E-mail', mail(c.email)),
      line('Deuxième e-mail', mail(c.email_2)),
      line('Adresse', esc(c.address || '—')),
      line('Département', esc(c.department || '—')),
      line('Pays', esc(c.country || '—')),
      line('Créer', c.created_at ? new Date(c.created_at).toLocaleDateString('fr-HT') : '—')
    ].join(''));
  };

  L.showAgentDetail = async function (id) {
    const { data: a, error } = await SB().from('jl9_agents')
      .select('*, jl9_companies(name)').eq('id', id).maybeSingle();
    if (error || !a) { window.Lotri.toast((error && error.message) || 'Agent introuvable', 'error'); return; }
    const plan = a.company_id ? await L.planLabel(a.company_id) : null;
    const alt = Array.isArray(a.alt_names) && a.alt_names.length ? a.alt_names.join(', ') : '—';
    modal(a.full_name || 'Agent', [
      line('ID piblik', `<strong class="mono">${esc(a.public_id || '—')}</strong>`),
      line('Nom complet', `<strong>${esc(a.full_name || '—')}</strong>`),
      line('Autre nom', esc(alt)),
      line('Compagnie', esc((a.jl9_companies && a.jl9_companies.name) || '—') + (plan ? ` <span class="chip">${esc(plan)}</span>` : '')),
      line('Statut', `<span class="badge ${a.status === 'active' ? 'badge-success' : 'badge-danger'}">${esc(a.status)}</span>`),
      line('Téléphone', tel(a.phone)),
      line('E-mail', mail(a.email)),
      line('Deuxième e-mail', mail(a.email_2)),
      line('Adresse', esc(a.address || '—')),
      line('Département', esc(a.department || '—')),
      line('Pays', esc(a.country || '—'))
    ].join(''));
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('button, a, input, select')) return;
    const rc = e.target.closest('[data-company-detail]');
    if (rc) { L.showCompanyDetail(rc.dataset.companyDetail); return; }
    const ra = e.target.closest('[data-agent-detail]');
    if (ra) { L.showAgentDetail(ra.dataset.agentDetail); }
  });

  const st = document.createElement('style');
  st.textContent = 'tr[data-company-detail],tr[data-agent-detail]{cursor:pointer}';
  document.head.appendChild(st);
})();
