/* =====================================================================
 * JADSTACK LOTTO v9.4 — PEMAN MANYÈL AK PRÈV (Faz 2)
 * ---------------------------------------------------------------------
 * Pa gen paswèl otomatik: konpayi a peye sou Natcash / Moncash, li antre
 * Trans ID a epi li voye foto resi a. Super Admin gade prèv la epi li
 * apwouve oswa refize. Tous mouvman pase nan RPC ki nan SIPLEMAN-V9_4.sql
 * (`jl9_rpc_submit_payment`, `jl9_rpc_review_payment`) — konsa RLS la
 * rete mèt jeu la, paj la pa janm ekri dirèkteman nan tab yo.
 *
 * Vi:  `payments`   (konpayi)  ·  `pay-review` (super admin)
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;
  const money = n => (Number(n || 0)).toLocaleString('fr-HT', { minimumFractionDigits: 2 }) + ' HTG';
  const dt = s => s ? new Date(s).toLocaleString('fr-HT') : '—';

  const STATUS = {
    en_attente: { l: 'En attente', c: 'badge-warning' },
    apwouve:    { l: 'Approuver',  c: 'badge-success' },
    refize:     { l: 'Refusé',   c: 'badge-danger' }
  };
  const chip = s => {
    const x = STATUS[s] || { l: s || '—', c: 'badge-warning' };
    return `<span class="badge ${x.c}">${esc(x.l)}</span>`;
  };

  async function operators() {
    const { data } = await SB().from('jl9_payment_operators')
      .select('*').eq('active', true).order('name');
    return data || [];
  }

  /* ---------- Envoyer prèv la nan bucket prive `payment-proofs` ---------- */
  async function uploadProof(file, companyId) {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) throw new Error('Imaj la twò gwo (maksimòm 5 Mo).');
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error('Uniquement PNG, JPG ou WEBP.');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${companyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await SB().storage.from('payment-proofs')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error('Impossible d\'envoyer l\'image : ' + error.message);
    return path;
  }

  async function signedUrl(path) {
    if (!path) return null;
    const { data } = await SB().storage.from('payment-proofs').createSignedUrl(path, 600);
    return (data && data.signedUrl) || null;
  }

  /* ==================================================================
   * VI KONPAYI — «Paiement»
   * ================================================================== */
  LotriShell.register('payments', {
    render: async (host) => {
      const p = window.__lotriProfile;
      const [ops, inv, pays] = await Promise.all([
        operators(),
        SB().from('jl9_invoices').select('*').eq('company_id', p.company_id)
          .in('status', ['unpaid', 'overdue']).order('due_date', { ascending: true }),
        SB().from('jl9_payments').select('*').eq('company_id', p.company_id)
          .order('paid_at', { ascending: false }).limit(30)
      ]);
      const invoices = inv.data || [];
      const payments = pays.data || [];
      const due = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);

      host.innerHTML = `
      <div class="page-hd"><h2>Paiement</h2>
        <p class="muted">Payé sou Natcash oswa Moncash, apre sa antre Trans ID a ak foto resi a.
           Super Admin ap verifye l epi konfime peman an.</p></div>

      <div class="stat-row">
        <div class="stat-card"><span class="lbl">Total à payer</span><strong>${money(due)}</strong></div>
        <div class="stat-card"><span class="lbl">Facture ouvè</span><strong>${invoices.length}</strong></div>
        <div class="stat-card"><span class="lbl">Paiement an atant</span>
          <strong>${payments.filter(x => x.status === 'en_attente').length}</strong></div>
      </div>

      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Où payer</h3></div>
        ${ops.length ? `<div class="op-grid">${ops.map(o => `
          <div class="op-card">
            <div class="op-name">${esc(o.name)}</div>
            <div class="op-acc mono">${esc(o.account_number || '—')}</div>
            <div class="muted">${esc(o.account_name || '')}</div>
            ${o.instructions ? `<p class="muted sm">${esc(o.instructions)}</p>` : ''}
          </div>`).join('')}</div>`
          : `<div class="empty"><i class="fa-solid fa-circle-info"></i>
               Super Admin poko mete okenn operatè peman.</div>`}
      </div>

      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Deklare un paiement</h3></div>
        <div class="form-row"><label class="label" for="p-inv">Facture</label>
          <select class="input" id="p-inv">
            <option value="">— Choisir une facture —</option>
            ${invoices.map(i => `<option value="${esc(i.id)}" data-amt="${esc(i.amount)}">
              ${esc(i.number || i.id.slice(0, 8))} — ${esc(money(i.amount))} (delè: ${esc(i.due_date || '—')})
            </option>`).join('')}
          </select></div>
        <div class="form-row"><label class="label" for="p-op">Opérateur</label>
          <select class="input" id="p-op">${ops.map(o =>
            `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('')}</select></div>
        <div class="form-row"><label class="label" for="p-amt">Montant payé (HTG)</label>
          <input class="input" id="p-amt" type="number" min="1" step="0.01"></div>
        <div class="form-row"><label class="label" for="p-tid">Trans ID</label>
          <input class="input mono" id="p-tid" placeholder="Exemple : 6A2K91TZ">
          <small class="muted">Copiez-le exactement tel qu\'il apparaît dans le message de confirmation de l\'opérateur.</small></div>
        <div class="form-row"><label class="label" for="p-file">Foto resi a</label>
          <input class="input" id="p-file" type="file" accept="image/png,image/jpeg,image/webp">
          <small class="muted">PNG / JPG / WEBP — 5 Mo maximum. Vous seul et l\'administration pouvez le voir.</small></div>
        <div class="modal-ft" style="justify-content:flex-start">
          <button class="btn btn-primary" id="p-send"><i class="fa-solid fa-paper-plane"></i> Envoyer pour vérification</button>
        </div>
      </div>

      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Paiement déclaré</h3></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Date</th><th>Opérateur</th><th>Trans ID</th><th>Montant</th><th>Eta</th><th>Note</th></tr></thead>
          <tbody>${payments.length ? payments.map(x => `
            <tr><td>${esc(dt(x.paid_at))}</td><td>${esc(x.operator_name || '—')}</td>
              <td class="mono">${esc(x.trans_id || '—')}</td><td>${esc(money(x.amount))}</td>
              <td>${chip(x.status)}</td><td>${esc(x.review_note || '—')}</td></tr>`).join('')
            : `<tr><td colspan="6" class="muted">Vous n\'avez encore déclaré aucun paiement.</td></tr>`}</tbody>
        </table></div>
      </div>`;

      const invSel = document.getElementById('p-inv');
      invSel.addEventListener('change', () => {
        const o = invSel.selectedOptions[0];
        if (o && o.dataset.amt) document.getElementById('p-amt').value = o.dataset.amt;
      });

      document.getElementById('p-send').onclick = (e) => window.Lotri.ui.busy(e.currentTarget, async () => {
        const invoice_id = invSel.value || null;
        const operator_id = document.getElementById('p-op').value || null;
        const amount = Number(document.getElementById('p-amt').value || 0);
        const trans_id = document.getElementById('p-tid').value.trim();
        const file = document.getElementById('p-file').files[0];

        if (!invoice_id) return window.Lotri.toast('Sélectionnez d\'abord la facture.', 'error');
        if (!operator_id) return window.Lotri.toast('Sélectionnez l\'opérateur.', 'error');
        if (!(amount > 0)) return window.Lotri.toast('Saisissez un montant valide.', 'error');
        if (trans_id.length < 4) return window.Lotri.toast('Trans ID a sanble twò kout.', 'error');

        let proof = null;
        try { proof = await uploadProof(file, p.company_id); }
        catch (err) { return window.Lotri.toast(err.message, 'error'); }

        const { error } = await SB().rpc('jl9_rpc_submit_payment', {
          _invoice: invoice_id, _operator: operator_id,
          _trans_id: trans_id, _amount: amount, _proof_url: proof
        });
        if (error) return window.Lotri.toast(error.message, 'error');

        window.Lotri.toast('Le paiement est envoyé. Nous vous informerons dès sa vérification.', 'success');
        window.Lotri.notify.send({
          action: 'billing.payment.submitted', verb: 'deklare', entity: 'un paiement',
          details: { 'Trans ID': trans_id, 'Montant': money(amount) }
        });
        if (window.Lotri.badges) window.Lotri.badges.refresh();
        LotriShell.render();
      });
    }
  });

  /* ==================================================================
   * VI SUPER ADMIN — «Vérification des paiements»
   * ================================================================== */
  LotriShell.register('pay-review', {
    render: async (host) => {
      const { data, error } = await SB().from('jl9_payments')
        .select('*, company:jl9_companies(name)')
        .order('paid_at', { ascending: false }).limit(150);
      if (error) {
        host.innerHTML = `<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>${esc(error.message)}</div>`;
        return;
      }
      const rows = data || [];
      const pend = rows.filter(r => r.status === 'en_attente');

      host.innerHTML = `
      <div class="page-hd"><h2>Vérification des paiements</h2>
        <p class="muted">Comparez l\'ID de transaction au reçu avant d\'approuver. Une approbation marque automatiquement la facture comme payée.</p></div>
      <div class="stat-row">
        <div class="stat-card"><span class="lbl">En attente</span><strong>${pend.length}</strong></div>
        <div class="stat-card"><span class="lbl">Total reçu</span><strong>${rows.length}</strong></div>
      </div>
      <div class="card" style="margin-top:1.25rem">
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Date</th><th>Compagnie</th><th>Opérateur</th><th>Trans ID</th>
            <th>Montant</th><th>Prèv</th><th>Eta</th><th>Action</th></tr></thead>
          <tbody>${rows.length ? rows.map(x => `
            <tr data-id="${esc(x.id)}">
              <td>${esc(dt(x.paid_at))}</td>
              <td>${esc((x.company && x.company.name) || '—')}</td>
              <td>${esc(x.operator_name || '—')}</td>
              <td class="mono">${esc(x.trans_id || '—')}</td>
              <td>${esc(money(x.amount))}</td>
              <td>${x.proof_image_url
                ? `<button class="btn btn-sm" data-proof="${esc(x.proof_image_url)}">
                     <i class="fa-solid fa-image"></i> Gade</button>` : '<span class="muted">—</span>'}</td>
              <td>${chip(x.status)}</td>
              <td>${x.status === 'en_attente' ? `
                <button class="btn btn-sm btn-primary" data-ok><i class="fa-solid fa-check"></i></button>
                <button class="btn btn-sm btn-danger" data-no><i class="fa-solid fa-xmark"></i></button>`
                : `<span class="muted">${esc(dt(x.reviewed_at))}</span>`}</td>
            </tr>`).join('')
            : `<tr><td colspan="8" class="muted">Aucun paiement déclaré pour le moment.</td></tr>`}</tbody>
        </table></div>
      </div>`;

      host.addEventListener('click', async (e) => {
        const proofBtn = e.target.closest('[data-proof]');
        if (proofBtn) {
          const url = await signedUrl(proofBtn.dataset.proof);
          if (!url) return window.Lotri.toast('Impossible d’ouvrir la preuve.', 'error');
          window.open(url, '_blank', 'noopener');
          return;
        }
        const okBtn = e.target.closest('[data-ok]');
        const noBtn = e.target.closest('[data-no]');
        if (!okBtn && !noBtn) return;
        const tr = e.target.closest('tr');
        const id = tr.dataset.id;
        const approve = !!okBtn;

        const note = await window.Lotri.modal.prompt({
          title: approve ? 'Approuver le paiement' : 'Refuser le paiement',
          label: 'Note pour la compagnie (facultatif en cas d’approbation)',
          help: approve
            ? 'La facture correspondant à ce paiement sera marquée « payée » automatiquement.'
            : 'Expliquez la raison — la compagnie verra ce message.',
          required: !approve,
          okText: approve ? 'Approuver' : 'Refusé'
        });
        if (note === null) return;

        const { error: err2 } = await SB().rpc('jl9_rpc_review_payment', {
          _payment: id, _approve: approve, _note: note || null
        });
        if (err2) return window.Lotri.toast(err2.message, 'error');
        window.Lotri.toast(approve ? 'Paiement approuvé.' : 'Paiement refusé.', approve ? 'success' : 'error');
        window.Lotri.notify.send({
          action: approve ? 'billing.payment.approved' : 'billing.payment.rejected',
          verb: approve ? 'apwouve' : 'refize', entity: 'un paiement',
          details: { 'Referans': id.slice(0, 8), 'Note': note || '—' }
        });
        if (window.Lotri.badges) window.Lotri.badges.refresh();
        LotriShell.render();
      });
    }
  });
})();
