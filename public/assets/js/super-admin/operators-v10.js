/* =====================================================================
 * SUPER ADMIN — OPERATÈ PÈMAN (PLAN V10 · PATI G — faktirasyon)
 * ---------------------------------------------------------------------
 * Kliyan an mande: pou chak operatè fòk gen NON KONT lan, NIMEWO a, ak
 * yon tèks «kijan li mache» — epi se Super Admin ki kontwole yo (ajoute,
 * modifye, dezaktive). Compagnie wè menm enfòmasyon sa yo nan paj Peman.
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  async function load() {
    const { data, error } = await SB().from('jl9_payment_operators')
      .select('*').order('sort_order').order('name');
    if (error) throw error;
    return data || [];
  }

  function row(o) {
    return `<tr data-id="${esc(o.id)}">
      <td><strong>${esc(o.name)}</strong></td>
      <td>${esc(o.account_name || '—')}</td>
      <td class="mono">${esc(o.account_number || o.number || '—')}</td>
      <td class="muted sm">${esc(o.instructions || o.how_it_works || '—')}</td>
      <td><span class="badge ${o.active ? 'badge-success' : ''}">${o.active ? 'Actif' : 'Fermer'}</span></td>
      <td class="ta-r">
        <button class="btn btn-sm btn-ghost" data-edit="${esc(o.id)}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-ghost" data-toggle="${esc(o.id)}" title="Activer / dezaktive">
          <i class="fa-solid fa-power-off"></i></button>
      </td></tr>`;
  }

  function form(o) {
    o = o || {};
    return `
    <div class="form-grid">
      <div><label class="label">Nom operatè a *</label>
        <input class="input" id="op-name" maxlength="60" value="${esc(o.name || '')}" placeholder="Natcash"></div>
      <div><label class="label">Nom du compte *</label>
        <input class="input" id="op-acc-name" maxlength="80" value="${esc(o.account_name || '')}"
               placeholder="JADSTACK STUDIO S.A.">
        <small class="muted">Nom qui apparaît lors de l\'envoi de l\'argent — la compagnie le voit.</small></div>
      <div><label class="label">Numéro de compte / téléphone *</label>
        <input class="input mono" id="op-acc-num" maxlength="40"
               value="${esc(o.account_number || o.number || '')}" placeholder="+509 0000 0000"></div>
      <div><label class="label">Ordre afichaj</label>
        <input class="input" id="op-sort" type="number" value="${esc(o.sort_order ?? 100)}"></div>
    </div>
    <div class="form-row"><label class="label">Comment ça marche (explication pour la compagnie) *</label>
      <textarea class="textarea" id="op-how" rows="3" maxlength="600">${esc(o.instructions || o.how_it_works || '')}</textarea>
      <small class="muted">Décrivez les étapes clairement : envoyer le montant, copier l\'ID de transaction, joindre la photo du reçu.</small></div>
    <label class="switch" style="justify-content:space-between">
      <span>Opérateur actif (les compagnies peuvent le choisir)</span>
      <input type="checkbox" id="op-active" ${o.active === false ? '' : 'checked'}><span class="track"></span></label>`;
  }

  async function save(id, host) {
    const val = k => (document.getElementById(k)?.value || '').trim();
    const payload = {
      name: val('op-name'),
      account_name: val('op-acc-name'),
      account_number: val('op-acc-num'),
      number: val('op-acc-num'),           /* konpatibilite ak ansyen kolòn nan */
      instructions: val('op-how'),
      how_it_works: val('op-how'),
      sort_order: Number(val('op-sort') || 100),
      active: !!document.getElementById('op-active')?.checked
    };
    if (!payload.name || !payload.account_name || !payload.account_number || !payload.instructions)
      throw new Error('Le nom, le nom du compte, le numéro et les explications sont obligatoires.');
    const q = id
      ? SB().from('jl9_payment_operators').update(payload).eq('id', id)
      : SB().from('jl9_payment_operators').insert(payload);
    const { error } = await q;
    if (error) throw error;
    await window.Lotri.notify.send({
      action: id ? 'operator.update' : 'operator.create',
      verb: id ? 'modifié' : 'kreye', entity: 'opérateurs de paiement',
      items: [payload.name],
      details: { 'Nom du compte': payload.account_name, 'Numéro': payload.account_number, 'Actif': payload.active ? 'wi' : 'non' }
    });
    window.Lotri.toast('L\'opérateur est enregistré.', 'success');
    render(host);
  }

  async function render(host) {
    const ops = await load();
    host.innerHTML = `
    <div class="page-hd"><h2>Opérateur Pèman</h2>
      <p class="muted">Voici ce que les compagnies voient sur leur page « Paiement » : le nom du compte, le numéro et le fonctionnement.</p></div>
    <div class="card">
      <div class="card-hd"><h3>Lis operatè (${ops.length})</h3>
        <button class="btn btn-primary" id="op-new"><i class="fa-solid fa-plus"></i> Nouvel opérateur</button></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Opérateur</th><th>Nom du compte</th><th>Numéro</th><th>Comment ça marche</th><th>Eta</th><th></th></tr></thead>
        <tbody>${ops.length ? ops.map(row).join('')
        : '<tr><td colspan="6" class="muted">Aucun opérateur pour le moment.</td></tr>'}</tbody>
      </table></div>
    </div>`;

    host.querySelector('#op-new').onclick = () =>
      window.Lotri.modal.form('Nouvel opérateur de paiement', form(null), () => save(null, host));

    host.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
      const o = ops.find(x => x.id === b.dataset.edit);
      window.Lotri.modal.form('Modifier ' + (o?.name || 'operatè'), form(o), () => save(o.id, host));
    });

    host.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () =>
      window.Lotri.ui.busy(b, async () => {
        const o = ops.find(x => x.id === b.dataset.toggle);
        const { error } = await SB().from('jl9_payment_operators')
          .update({ active: !o.active }).eq('id', o.id);
        if (error) return window.Lotri.toast(error.message, 'error');
        await window.Lotri.notify.send({
          action: 'operator.toggle', verb: o.active ? 'dezaktive' : 'aktive',
          entity: 'opérateurs de paiement', items: [o.name]
        });
        render(host);
      }));
  }

  LotriShell.register('operators', { render: async host => render(host) });
})();
