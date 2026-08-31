/* =====================================================================
 * JADSTACK LOTTO V11 — FAKTIRASYON & PEMAN
 * ---------------------------------------------------------------------
 *  • Blòk «Où payer» pinned nan tèt TOUT paj faktirasyon,
 *    minimalis, pliyab/deplwayab, men toujou vizib.
 *  • Yon SÈL klik sou «Payé» ouvri fòm deklarasyon an (pa gen lòt paj).
 *  • Montant an dwe EGZAT (fakti 500 HTG pa aksepte 499 HTG).
 *  • Deklare = peye: san deklarasyon, peman an pa gen valè.
 *  • Konfimasyon superadmin ak rezon («mwen jwenn li» / «pa jwenn li»),
 *    mesaj la rete PRIVE ant Superadmin ak Konpayi.
 * ===================================================================== */
(function () {
  const L = window.Lotri, v11 = L.v11, SB = () => L.supabase, esc = L.escapeHtml;
  const money = v11.money;

  async function methods() {
    const { data } = await SB().from('jl11_payment_methods')
      .select('*').eq('active', true).order('sort_order');
    return data || [];
  }

  /* ---------- Blòk peman pinned ---------- */
  v11.payBar = async function () {
    const ops = await methods();
    return `<details class="v11-paybar" open>
      <summary><i class="fa-solid fa-wallet"></i> Où payer
        <i class="fa-solid fa-chevron-right chev"></i></summary>
      <div class="v11-pay-grid">
        ${ops.map(o => `<div class="v11-pay-op">
          ${o.image_url ? `<img src="${esc(o.image_url)}" alt="${esc(o.name)}">`
            : `<span class="v11-av" style="--av:${v11.color(o.name)}">${esc(v11.initial(o.name))}</span>`}
          <div><div class="nm">${esc(o.name)}</div>
            <div class="no">${esc(o.phone || '')}</div>
            <div>${esc(o.account_name || 'JADSTACK STUDIO')}</div>
            <div class="hint">${esc(o.instructions || '')}</div></div>
        </div>`).join('') || '<div class="hint">Aucun moyen de paiement configuré.</div>'}
      </div></details>`;
  };

  /* ---------- Fòm deklarasyon (yon sèl klik sou «Payé») ---------- */
  v11.declare = async function (invoice, onDone) {
    const ops = await methods();
    const pop = v11.popup('Déclarer le paiement', `
      <p class="muted" style="font-size:.8rem">Facture <strong>${esc(invoice.number || invoice.id.slice(0, 8))}</strong> —
        montan <strong>${money(invoice.amount)}</strong>. Déclaration an <strong>egal peman an</strong>:
        si w pa deklare, peman an pa gen valè.</p>
      <div class="form-grid" style="margin-top:.8rem">
        <div><label class="label">Mwayen</label><select class="select" id="m">
          ${ops.map(o => `<option value="${esc(o.name)}">${esc(o.name)}</option>`).join('')}</select></div>
        <div><label class="label">Trans ID</label><input class="input" id="tid" required></div>
        <div><label class="label">Montant egzat (HTG)</label>
          <input class="input" id="amt" type="number" step="0.01" value="${Number(invoice.amount).toFixed(2)}"></div>
      </div>
      <div style="margin-top:.8rem"><label class="label">Imaj konfimasyon</label><br>
        ${v11.imgInput({ folder: 'proofs', label: 'Foto resi a', wide: true })}</div>`,
      { footer: '<button class="btn btn-primary" id="ok"><i class="fa-solid fa-check"></i> Déclarer & payer</button>' });

    let proof = null;
    pop.el.addEventListener('v11:image', e => { proof = e.detail.url; });
    pop.el.querySelector('#ok').onclick = async () => {
      const amt = Number(pop.el.querySelector('#amt').value);
      const tid = pop.el.querySelector('#tid').value.trim();
      if (!tid) { L.toast('Trans ID a obligatwa.', 'error'); return; }
      if (Math.round(amt * 100) !== Math.round(Number(invoice.amount) * 100)) {
        L.toast('Le montant doit être EXACT : ' + money(invoice.amount), 'error'); return;
      }
      const { error } = await SB().rpc('jl11_rpc_declare_payment', {
        _invoice: invoice.id, _method: pop.el.querySelector('#m').value,
        _trans_id: tid, _amount: amt, _proof: proof
      });
      if (error) { L.toast(error.message, 'error'); return; }
      pop.close();
      L.toast('Déclaration enregistrée — le Super Administrateur est notifié.', 'success');
      onDone && onDone();
    };
  };

  /* ---------- Vi faktirasyon konpayi ---------- */
  LotriShell.register('invoices', {
    render: async (host) => {
      const p = await L.getProfile();
      const bar = await v11.payBar();
      const draw = async () => {
        const { data, error } = await SB().from('jl9_invoices').select('*')
          .eq('company_id', p.company_id).order('due_date', { ascending: false }).limit(200);
        if (error) { host.querySelector('#tbl').innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
        const f = v11.readFilters(host);
        const rows = v11.applyDate(data || [], 'due_date', f);
        host.querySelector('#tbl').innerHTML = rows.length ? `
          <div class="table-wrap"><table class="table"><thead><tr>
            <th>Facture</th><th>Période</th><th class="num">Montant</th><th>Echeyans</th><th>Statut</th><th></th>
          </tr></thead><tbody>${rows.map(i => `
            <tr data-v11-title="Facture ${esc(i.number || i.id.slice(0, 8))}" data-v11-row='${esc(JSON.stringify({
              Facture: i.number || i.id, Montant: money(i.amount), Echeyans: i.due_date,
              Statut: i.status, Période : i.period || '—'
            }))}'>
              <td class="mono">${esc(i.number || i.id.slice(0, 8))}</td>
              <td>${esc(i.period || '—')}</td>
              <td class="num">${money(i.amount)}</td>
              <td>${esc(i.due_date || '—')}</td>
              <td><span class="badge ${i.status === 'paid' ? 'badge-success' : i.status === 'declared' ? 'badge-warning' : 'badge-danger'}">${esc(i.status)}</span></td>
              <td>${['unpaid', 'overdue'].includes(i.status)
                ? `<button class="btn btn-sm btn-primary" data-pay="${i.id}"><i class="fa-solid fa-money-bill-wave"></i> Payé</button>`
                : ''}</td></tr>`).join('')}</tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-file-invoice"></i>Aucune facture.</div>';
        v11.wireRows(host);
        host.querySelectorAll('[data-pay]').forEach(b => b.onclick = ev => {
          ev.stopPropagation();
          v11.declare((data || []).find(x => x.id === b.dataset.pay), draw);
        });
      };
      host.innerHTML = `
        ${v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'finans' }, { label: 'faktirasyon' }])}
        ${bar}
        <div class="page-hd"><h2>Faktirasyon</h2>
          <p class="muted">Un seul clic sur « Payé » ouvre la déclaration. Le montant doit être exact.</p></div>
        ${v11.filters()}
        <div class="card" id="tbl"><div class="spinner"></div></div>`;
      v11.wireFilters(host, draw);
      await draw();
    }
  });

  /* ---------- Revizyon peman (Superadmin) ---------- */
  LotriShell.register('pay-review', {
    render: async (host) => {
      const bar = await v11.payBar();
      const draw = async () => {
        const { data, error } = await SB().from('jl9_payments').select('*')
          .order('created_at', { ascending: false }).limit(200);
        if (error) { host.querySelector('#tbl').innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
        const rows = v11.applyDate(data || [], 'created_at', v11.readFilters(host));
        host.querySelector('#tbl').innerHTML = rows.length ? `
          <div class="table-wrap"><table class="table"><thead><tr>
            <th>Date</th><th>Mwayen</th><th>Trans ID</th><th class="num">Montant</th><th>Statut</th><th></th>
          </tr></thead><tbody>${rows.map(x => `
            <tr data-v11-title="Paiement ${esc(x.reference || '')}" data-v11-row='${esc(JSON.stringify({
              Date: v11.dt(x.created_at), Mwayen: x.method, 'Trans ID': x.reference,
              Montant: money(x.amount), Statut: x.status
            }))}'>
              <td>${v11.dt(x.created_at)}</td><td>${esc(x.method || '')}</td>
              <td class="mono">${esc(x.reference || '')}</td>
              <td class="num">${money(x.amount)}</td>
              <td><span class="badge ${x.status === 'apwouve' ? 'badge-success' : x.status === 'refize' ? 'badge-danger' : 'badge-warning'}">${esc(x.status)}</span></td>
              <td class="row">${x.status === 'en_attente' ? `
                <button class="btn btn-sm btn-primary" data-ok="${x.id}">Je l\'ai trouvé</button>
                <button class="btn btn-sm btn-danger" data-no="${x.id}">Je ne l\'ai pas trouvé</button>` : ''}</td>
            </tr>`).join('')}</tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-receipt"></i>Aucun paiement.</div>';
        v11.wireRows(host);
        const act = async (id, ok) => {
          const reason = await L.ui.prompt({
            title: ok ? 'Confirmer le paiement' : 'Refuser le paiement',
            label: 'Motif (transmis uniquement à la compagnie)',
            value: ok ? 'Je l\'ai trouvé dans le compte.' : 'Je ne l\'ai pas trouvé dans le compte.'
          });
          if (reason === null) return;
          const { error: e2 } = await SB().rpc('jl11_rpc_confirm_payment',
            { _payment: id, _received: ok, _reason: reason });
          if (e2) { L.toast(e2.message, 'error'); return; }
          L.toast('La compagnie a reçu la réponse en privé.', 'success');
          draw();
        };
        host.querySelectorAll('[data-ok]').forEach(b => b.onclick = e => { e.stopPropagation(); act(b.dataset.ok, true); });
        host.querySelectorAll('[data-no]').forEach(b => b.onclick = e => { e.stopPropagation(); act(b.dataset.no, false); });
      };
      host.innerHTML = `
        ${v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'finans' }, { label: 'vérification des paiements' }])}
        ${bar}
        <div class="page-hd"><h2>Vérification des paiements</h2>
          <p class="muted">Votre réponse reste privée entre vous et la compagnie.</p></div>
        ${v11.filters()}
        <div class="card" id="tbl"><div class="spinner"></div></div>`;
      v11.wireFilters(host, draw);
      await draw();
    }
  });
})();
