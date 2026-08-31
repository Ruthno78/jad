/* =====================================================================
 * V15-2 — OPERATÈ PEMAN (Superadmin) + KAT OPERATÈ POU KONPAYI
 *  • CRUD konplè ak logo (reyitilize konpozan imaj Lotri.v12.imageDrop)
 *  • Lotri.v13.operatorCards() : kat (logo + non + nimewo) pou paj deklarasyon
 *  RPC: jl13_rpc_save_operator(_p) / jl13_rpc_delete_operator(_id)
 * ===================================================================== */
(function () {
  const L = window.Lotri, v13 = L.v13, v12 = L.v12, SB = () => L.supabase, esc = v13.esc;

  async function fetchOps(onlyActive) {
    let q = SB().from('jl11_payment_methods').select('*').order('sort_order');
    if (onlyActive) q = q.eq('active', true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
  }
  v13.operators = fetchOps;

  /* Kat operatè reyitilizab (Compagnie wè yo lè l ap deklare un paiement) */
  v13.operatorCards = function (ops, opts) {
    opts = opts || {};
    if (!ops.length) return '<div class="empty">Aucun opérateur de paiement actif.</div>';
    return `<div class="jl13-ops">${ops.map(o => `
      <label class="jl13-op" data-op="${esc(o.id)}">
        ${opts.selectable ? `<input type="radio" name="${esc(opts.name || 'operator')}" value="${esc(o.name)}" data-opid="${esc(o.id)}">` : ''}
        <span class="jl13-op-logo">${o.logo_url || o.image_url
        ? `<img src="${esc(o.logo_url || o.image_url)}" alt="${esc(o.name)}">`
        : `<i class="fa-solid fa-money-bill-transfer"></i>`}</span>
        <span class="jl13-op-b">
          <b>${esc(o.name)}</b>
          <span class="mono">${esc(o.phone || '—')}</span>
          ${o.account_name ? `<span class="muted">${esc(o.account_name)}</span>` : ''}
          ${o.instructions ? `<span class="muted jl13-op-i">${esc(o.instructions)}</span>` : ''}
        </span>
      </label>`).join('')}</div>`;
  };

  function form(op, done) {
    op = op || {};
    const m = v13.modal(`<h3>${op.id ? 'Modifier l\'opérateur' : 'Nouvel opérateur'}</h3>
      <form id="f">
        <div class="form-grid">
          <div style="grid-column:1/-1">${v12.imageDrop({ name: 'logo', src: op.logo_url || op.image_url || '', folder: 'operators', label: 'Logo operatè a' })}</div>
          <div><label class="label">Nom *</label><input class="input" name="name" value="${esc(op.name || '')}" required></div>
          <div><label class="label">Numéro</label><input class="input" name="phone" value="${esc(op.phone || '')}" placeholder="+509 0000 0000"></div>
          <div><label class="label">Nom du compte</label><input class="input" name="account_name" value="${esc(op.account_name || '')}"></div>
          <div><label class="label">Ordre afichaj</label><input class="input" type="number" name="sort_order" value="${Number(op.sort_order || 0)}"></div>
          <div><label class="label">Montant minimòm</label><input class="input" type="number" step="0.01" name="min_amount" value="${op.min_amount ?? ''}"></div>
          <div><label class="label">Montant maksimòm</label><input class="input" type="number" step="0.01" name="max_amount" value="${op.max_amount ?? ''}"></div>
          <div style="grid-column:1/-1"><label class="label">Enstriksyon</label>
            <textarea class="input" name="instructions" rows="2">${esc(op.instructions || '')}</textarea></div>
          <label class="row" style="gap:.4rem;grid-column:1/-1">
            <input type="checkbox" name="active" ${op.active === false ? '' : 'checked'}> Actif</label>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:1rem;gap:.4rem">
          <button type="button" class="btn btn-ghost" data-close>Annuler</button>
          <button class="btn btn-primary">Enregistrer</button>
        </div>
      </form>`);
    m.el.querySelector('#f').onsubmit = async ev => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      const logo = v12.imageValue(m.el, 'logo');
      const p = {
        id: op.id || null, name: f.get('name'), phone: f.get('phone'),
        account_name: f.get('account_name'), instructions: f.get('instructions'),
        sort_order: Number(f.get('sort_order') || 0),
        min_amount: f.get('min_amount') || '', max_amount: f.get('max_amount') || '',
        active: !!f.get('active'), logo_url: logo, image_url: logo
      };
      try {
        await v13.rpc('jl13_rpc_save_operator', { _p: p });
        v13.toast('Opérateur enregistré.', 'success'); m.close(); done && done();
      } catch (e) { v13.toast(e.message, 'error'); }
    };
  }

  LotriShell.register('operators', {
    render: async host => {
      host.innerHTML = `
        <div class="page-hd"><h2>Opérateurs de paiement</h2>
          <p class="muted">Ces opérateurs apparaissent sous forme de cartes (logo + nom + numéro) côté compagnie lors de la déclaration d\'un paiement.</p></div>
        <div class="card"><div class="card-hd"><h3>Lis operatè</h3>
          <button class="btn btn-primary" id="new"><i class="fa-solid fa-plus"></i> Nouvel opérateur</button></div>
          <div id="list"></div></div>
        <div class="card"><div class="card-hd"><h3>Apèsi kat Compagnie</h3></div>
          <div id="prev" style="padding:.6rem"></div></div>`;

      const load = async () => {
        const ops = await fetchOps(false);
        host.querySelector('#list').innerHTML = ops.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Logo</th><th>Nom</th><th>Numéro</th><th>Compte</th><th>Actif</th><th></th></tr></thead>
          <tbody>${ops.map(o => `<tr>
            <td>${o.logo_url || o.image_url ? `<img class="jl13-thumb" src="${esc(o.logo_url || o.image_url)}" alt="">` : '—'}</td>
            <td><b>${esc(o.name)}</b></td><td class="mono">${esc(o.phone || '—')}</td>
            <td>${esc(o.account_name || '—')}</td>
            <td><span class="badge ${o.active ? 'badge-success' : 'badge-danger'}">${o.active ? 'wi' : 'non'}</span></td>
            <td class="row" style="gap:.3rem">
              <button class="btn btn-sm" data-e="${esc(o.id)}"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-sm btn-danger" data-d="${esc(o.id)}"><i class="fa-solid fa-ban"></i></button>
            </td></tr>`).join('')}</tbody></table></div>`
          : '<div class="empty">Aucun opérateur.</div>';
        host.querySelector('#prev').innerHTML = v13.operatorCards(ops.filter(o => o.active));
        host.querySelectorAll('[data-e]').forEach(b => b.onclick = () =>
          form(ops.find(o => o.id === b.dataset.e), load));
        host.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
          if (!await L.ui.confirm('Désactiver cet opérateur ?', null, { danger: true })) return;
          try { await v13.rpc('jl13_rpc_delete_operator', { _id: b.dataset.d }); v13.toast('Désactivé.', 'success'); load(); }
          catch (e) { v13.toast(e.message, 'error'); }
        });
      };
      host.querySelector('#new').onclick = () => form(null, load);
      await load();
    }
  });

  /* ---- Compagnie : deklare un paiement ak kat operatè yo ---- */
  LotriShell.register('payments', {
    render: async host => {
      const [ops, invs] = await Promise.all([
        fetchOps(true),
        v13.rpc('jl13_rpc_invoices', { _status: 'unpaid' }).catch(() => [])
      ]);
      host.innerHTML = `
        <div class="page-hd"><h2>Paiement</h2>
          <p class="muted">Choisissez un opérateur, saisissez la référence et envoyez la preuve. La réponse arrive dans votre messagerie (pas par e-mail).</p></div>
        <div class="card"><div class="card-hd"><h3>Deklare un paiement</h3></div>
          <form id="f" style="padding:.6rem">
            <label class="label">Opérateur</label>
            ${v13.operatorCards(ops, { selectable: true, name: 'op' })}
            <div class="form-grid" style="margin-top:.8rem">
              <div><label class="label">Facture</label>
                <select class="input" name="invoice" required>
                  <option value="">— Choisir fakti a —</option>
                  ${(invs || []).map(i => `<option value="${esc(i.id)}" data-a="${i.amount}">${esc(i.number)} — ${v13.money(i.amount)}</option>`).join('')}
                </select></div>
              <div><label class="label">Montant</label><input class="input" type="number" step="0.01" name="amount" required></div>
              <div><label class="label">Referans tranzaksyon</label><input class="input" name="reference" required></div>
              <div style="grid-column:1/-1">${(L.v12.imageDrop({ name: 'proof', folder: 'payments', label: 'Preuve de paiement (capture d’écran)' }))}</div>
            </div>
            <div class="row" style="justify-content:flex-end;margin-top:.8rem">
              <button class="btn btn-primary">Envoyer deklarasyon an</button></div>
          </form></div>
        <div class="card"><div class="card-hd"><h3>Mes déclarations</h3></div><div id="mine"></div></div>`;

      const mine = async () => {
        const rows = await v13.rpc('jl13_rpc_payments', {}).catch(() => []);
        host.querySelector('#mine').innerHTML = (rows || []).length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Facture</th><th>Opérateur</th><th>Referans</th><th class="num">Montant</th><th>Statut</th><th>Date</th></tr></thead>
          <tbody>${rows.map(p => `<tr>
            <td class="mono">${esc(p.invoice_no)}</td><td>${esc(p.method)}</td><td class="mono">${esc(p.reference)}</td>
            <td class="num mono">${v13.money(p.amount)}</td>
            <td><span class="badge ${['apwouve','approved'].includes(p.status) ? 'badge-success' : ['refize','rejected'].includes(p.status) ? 'badge-danger' : 'badge-warning'}">${esc(p.status)}</span></td>
            <td class="muted">${v13.dt(p.created_at)}</td></tr>`).join('')}</tbody></table></div>`
          : '<div class="empty">Aucune déclaration.</div>';
      };

      const f = host.querySelector('#f');
      f.querySelector('[name=invoice]').onchange = e => {
        const o = e.target.selectedOptions[0];
        if (o && o.dataset.a) f.querySelector('[name=amount]').value = o.dataset.a;
      };
      f.onsubmit = async ev => {
        ev.preventDefault();
        const sel = f.querySelector('input[name=op]:checked');
        if (!sel) return v13.toast('Sélectionnez un opérateur.', 'error');
        const d = Object.fromEntries(new FormData(f).entries());
        const prof = window.__lotriProfile || {};
        const { error } = await L.supabase.from('jl9_payments').insert({
          company_id: prof.company_id, invoice_id: d.invoice, amount: Number(d.amount),
          method: sel.value, reference: d.reference,
          proof_path: L.v12.imageValue(host, 'proof'), status: 'en_attente',
          declared_at: new Date().toISOString()
        });
        if (error) return v13.toast(error.message, 'error');
        v13.toast('Déclaration envoyée. Le Super Administrateur va la vérifier.', 'success');
        f.reset(); mine();
      };
      await mine();
    }
  });
})();
