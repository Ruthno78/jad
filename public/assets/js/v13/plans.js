/* =====================================================================
 * V15-8 — JESYON PLAN (Superadmin) + CHAJMAN DINAMIK SOU LANDING
 *  CRUD plan · bay yon konpayi yon plan · seksyon "Forfait" sou index.html
 *  RPC: jl13_rpc_save_plan · jl13_rpc_delete_plan · jl13_rpc_assign_plan
 * ===================================================================== */
(function () {
  const L = window.Lotri, v13 = L && L.v13, esc = s => String(s == null ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 1) Landing: chaje plan yo dinamikman ---------- */
  async function renderLanding() {
    const box = document.querySelector('[data-jl13-plans]');
    if (!box || !window.Lotri || !window.Lotri.supabase) return;
    const { data } = await window.Lotri.supabase
      .from('jl13_plans').select('*').eq('active', true).order('sort_order');
    const plans = data || [];
    if (!plans.length) { box.innerHTML = '<p class="muted">Les plans ap vini talè.</p>'; return; }
    box.innerHTML = plans.map(p => `
      <div class="plan${p.sort_order === 1 ? ' featured' : ''}">
        <h3>${esc(p.name)}</h3>
        <div class="price">${Number(p.price || 0).toLocaleString('fr-HT')} HTG${
          Number(p.price_usd || 0) > 0 ? ` <small>/ ${Number(p.price_usd).toLocaleString('en-US')} USD</small>` : ''
        } <small>/ ${esc(p.period === 'yearly' ? 'ane' : 'mwa')}</small></div>
        ${p.description ? `<p class="muted">${esc(p.description)}</p>` : ''}
        <ul>
          ${p.max_agents ? `<li>Jusqu'à ${p.max_agents} agents</li>` : '<li>Agents illimités</li>'}
          ${p.max_branches ? `<li>Jusqu'à ${p.max_branches} succursales</li>` : ''}
          ${p.max_machines ? `<li>Jusqu'à ${p.max_machines} machines</li>` : ''}
          ${(Array.isArray(p.features) ? p.features : []).map(f => `<li>${esc(f)}</li>`).join('')}
        </ul>
        <a href="auth.html" class="btn btn-primary">Kòmanse</a>
      </div>`).join('');
  }

  if (document.readyState !== 'loading') setTimeout(renderLanding, 0);
  else document.addEventListener('DOMContentLoaded', renderLanding);

  /* ---------- 2) Vi Superadmin ---------- */
  if (typeof window.LotriShell === 'undefined' || !v13) return;

  LotriShell.register('plans', {
    render: async host => {
      host.innerHTML = `
        <div class="page-hd"><h2>Forfait &amp; abònman</h2>
          <p class="muted">Ces forfaits apparaissent automatiquement sur la page d'accueil et servent à la facturation automatique. Un changement de forfait pour une compagnie s'applique <b>pwochen mwa</b>.</p></div>
        <div class="card"><div class="card-hd"><h3>Les plans</h3>
            <div class="row" style="gap:.4rem">
              <button class="btn btn-sm" id="assign"><i class="fa-solid fa-link"></i> Attribuer un forfait à une compagnie</button>
              <button class="btn btn-primary btn-sm" id="new"><i class="fa-solid fa-plus"></i> Nouveau plan</button>
            </div></div>
          <div id="list"><div class="empty">Chargement…</div></div></div>
        <div class="card"><div class="card-hd"><h3>Abonnement aktif</h3>${v13.exportBar('sub-tbl', 'abonman')}</div>
          <div id="subs"></div></div>`;
      const $ = s => host.querySelector(s);

      async function load() {
        v13.bust('plans');
        const plans = await v13.plans();
        const companies = await v13.companies();
        const { data: subs } = await L.supabase.from('jl13_subscriptions')
          .select('id,company_id,plan_id,status,billing_day,auto_invoice,created_at')
          .eq('status', 'active');
        const pName = {}; plans.forEach(p => pName[p.id] = p.name);
        const cName = {}; companies.forEach(c => cName[c.id] = c.name);

        $('#list').innerHTML = plans.length ? `<div class="jl13-cards">${plans.map(p => `
          <div class="jl13-plan-card ${p.active ? '' : 'is-off'}">
            <div class="row jl13-plan-hd"><b>${esc(p.name)}</b>
              <span class="badge ${p.active ? 'badge-success' : 'badge-muted'}">${p.active ? 'Actif' : 'Fermer'}</span></div>
            <div class="jl13-plan-price">${v13.money(p.price)}${Number(p.price_usd || 0) > 0 ? ` · ${Number(p.price_usd).toLocaleString('en-US')} USD` : ''} <small>/ ${esc(p.period === 'yearly' ? 'ane' : 'mwa')}</small></div>
            <div class="muted sm">${esc(p.description || '')}</div>
            <div class="muted sm">Agent : ${p.max_agents || '∞'} · Succursale: ${p.max_branches || '∞'} · Machine: ${p.max_machines || '∞'}</div>
            <div class="row" style="gap:.4rem;margin-top:.6rem">
              <button class="btn btn-sm" data-e="${esc(p.id)}"><i class="fa-solid fa-pen"></i> Modifier</button>
              <button class="btn btn-sm btn-ghost" data-d="${esc(p.id)}"><i class="fa-solid fa-trash"></i></button>
            </div></div>`).join('')}</div>` : '<div class="empty">Aucun forfait pour le moment.</div>';

        $('#subs').innerHTML = (subs || []).length ? `<div class="table-wrap"><table class="table" id="sub-tbl">
          <thead><tr><th>Compagnie</th><th>Forfait</th><th class="num">Jour fakti</th><th>Facture otomatik</th><th>Du</th></tr></thead>
          <tbody>${subs.map(s => `<tr><td>${esc(cName[s.company_id] || '—')}</td>
            <td>${esc(pName[s.plan_id] || '—')}</td><td class="num">${v13.int(s.billing_day)}</td>
            <td>${s.auto_invoice ? 'Oui' : 'Nom'}</td><td class="muted">${v13.date(s.created_at)}</td></tr>`).join('')}
          </tbody></table></div>` : '<div class="empty">Aucun abonnement actif.</div>';

        host.querySelectorAll('[data-e]').forEach(b => b.onclick = () => form(plans.find(p => p.id === b.dataset.e)));
        host.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
          if (!confirm('Supprimer ce plan ?')) return;
          try { await v13.rpc('jl13_rpc_delete_plan', { _id: b.dataset.d }); v13.toast('Forfait supprimé.', 'success'); load(); }
          catch (e) { v13.toast(e.message, 'error'); }
        });
        v13.wireExports(host);
      }

      function form(p) {
        p = p || {};
        const m = v13.modal(`<h3>${p.id ? 'Modifier le plan' : 'Nouveau plan'}</h3>
          <div class="jl13-filters">
            ${v13.field('Code', `<input class="input mono" id="f-code" value="${esc(p.code || '')}" placeholder="basic">`)}
            ${v13.field('Nom', `<input class="input" id="f-name" value="${esc(p.name || '')}">`)}
            ${v13.field('Prix (HTG)', `<input class="input" type="number" step="0.01" id="f-price" value="${esc(p.price || 0)}">`)}
            ${v13.field('Prix (USD)', `<input class="input" type="number" step="0.01" id="f-usd" value="${esc(p.price_usd || 0)}">`)}
            ${v13.field('Période', `<select class="input" id="f-period">
                <option value="monthly" ${p.period !== 'yearly' ? 'selected' : ''}>Chak mwa</option>
                <option value="yearly" ${p.period === 'yearly' ? 'selected' : ''}>Chak ane</option></select>`)}
            ${v13.field('Agents max.', `<input class="input" type="number" id="f-ag" value="${esc(p.max_agents ?? '')}">`)}
            ${v13.field('Succursales max.', `<input class="input" type="number" id="f-br" value="${esc(p.max_branches ?? '')}">`)}
            ${v13.field('Machines max.', `<input class="input" type="number" id="f-mc" value="${esc(p.max_machines ?? '')}">`)}
            ${v13.field('Ordre', `<input class="input" type="number" id="f-sort" value="${esc(p.sort_order || 0)}">`)}
            ${v13.field('Actif', `<select class="input" id="f-active">
                <option value="true" ${p.active !== false ? 'selected' : ''}>Oui</option>
                <option value="false" ${p.active === false ? 'selected' : ''}>Nom</option></select>`)}
          </div>
          ${v13.field('Description', `<textarea class="input" id="f-desc" rows="2">${esc(p.description || '')}</textarea>`)}
          ${v13.field('Avantages (un par ligne)', `<textarea class="input" id="f-feat" rows="3">${esc((Array.isArray(p.features) ? p.features : []).join('\n'))}</textarea>`)}
          <div class="row jl13-modal-ft">
            <button class="btn btn-ghost" data-close>Annuler</button>
            <button class="btn btn-primary" id="f-save">Enregistrer</button></div>`, { wide: true });

        m.el.querySelector('#f-save').onclick = async () => {
          const g = id => m.el.querySelector(id).value.trim();
          try {
            await v13.rpc('jl13_rpc_save_plan', {
              _p: {
                id: p.id || null, code: g('#f-code'), name: g('#f-name'),
                description: g('#f-desc'), price: Number(g('#f-price') || 0), price_usd: Number(g('#f-usd') || 0), period: g('#f-period'),
                max_agents: g('#f-ag') || null, max_branches: g('#f-br') || null, max_machines: g('#f-mc') || null,
                sort_order: Number(g('#f-sort') || 0), active: g('#f-active') === 'true',
                features: g('#f-feat').split('\n').map(s => s.trim()).filter(Boolean)
              }
            });
            m.close(); v13.toast('Forfait enregistré.', 'success'); load();
          } catch (e) { v13.toast(e.message, 'error'); }
        };
      }

      async function assignForm() {
        const [companies, plans] = await Promise.all([v13.companies(), v13.plans()]);
        const m = v13.modal(`<h3>Attribuer un forfait à une compagnie</h3>
          <div class="jl13-filters">
            ${v13.field('Compagnie', `<select class="input" id="a-c">${v13.options(companies)}</select>`)}
            ${v13.field('Forfait', `<select class="input" id="a-p">${v13.options(plans)}</select>`)}
            ${v13.field('Jour de facturation (1-28)', `<input class="input" type="number" min="1" max="28" id="a-d" value="1">`)}
            ${v13.field('Facture otomatik', `<select class="input" id="a-a"><option value="true">Oui</option><option value="false">Nom</option></select>`)}
          </div>
          <div class="row jl13-modal-ft"><button class="btn btn-ghost" data-close>Annuler</button>
            <button class="btn btn-primary" id="a-save">Confirmer</button></div>`);
        m.el.querySelector('#a-save').onclick = async () => {
          try {
            await v13.rpc('jl13_rpc_assign_plan', {
              _company: m.el.querySelector('#a-c').value,
              _plan: m.el.querySelector('#a-p').value,
              _billing_day: Number(m.el.querySelector('#a-d').value || 1),
              _auto: m.el.querySelector('#a-a').value === 'true'
            });
            m.close(); v13.toast('Abonnement aktive.', 'success'); load();
          } catch (e) { v13.toast(e.message, 'error'); }
        };
      }

      $('#new').onclick = () => form(null);
      $('#assign').onclick = () => assignForm().catch(e => v13.toast(e.message, 'error'));
      await load();
    }
  });
})();
