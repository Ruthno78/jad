/* =====================================================================
 * V15-1 — FAKTIRASYON SUPERADMIN
 *  • Lis Compagnie ak bar rechèch + filtè estati (an reta / peye / poko peye)
 *  • Klike yon konpayi -> istorik fakti li (auto vs manual byen distenge)
 *  • Bouton "Créer une facture manuelle" ki AJOUTE sou fakti otomatik yo
 *  RPC: jl13_rpc_invoices(_status,_company,_from,_to)
 *       jl13_rpc_manual_invoice(_company,_amount,_due,_note)
 *       jl13_rpc_generate_invoices(_month)
 *  SAN KOMISYON.
 * ===================================================================== */
(function () {
  const L = window.Lotri, v13 = L.v13, esc = v13.esc;

  const stBadge = (s, late) => {
    /* V20 #3 — 'advance' (peye alavans) an ble, 'overdue' an wouj. */
    const map = { paid: ['badge-success', 'Payé'], unpaid: ['badge-warning', 'Nom payé'],
                  overdue: ['badge-danger', 'An reta'], advance: ['badge-info', 'An avans'],
                  cancelled: ['', 'Annuler'] };
    const [cls, lbl] = map[s] || ['', s || '—'];
    return `<span class="badge ${late > 0 && s === 'unpaid' ? 'badge-danger' : cls}">${esc(lbl)}${late > 0 && s === 'unpaid' ? ` · ${late}j reta` : ''}</span>`;
  };
  const srcBadge = s => s === 'auto'
    ? '<span class="badge badge-info jl13-src auto"><i class="fa-solid fa-robot"></i> Otomatik</span>'
    : '<span class="badge jl13-src manual"><i class="fa-solid fa-pen"></i> Manyèl</span>';

  async function manualForm(companies, preset, done) {
    const m = v13.modal(`<h3>Créer une facture manuelle</h3>
      <form id="f" class="form-grid">
        <div><label class="label">Compagnie</label>
          <select class="input" name="company" required>
            <option value="">— Choisir —</option>${v13.options(companies, preset)}
          </select></div>
        <div><label class="label">Montant</label><input class="input" name="amount" type="number" step="0.01" min="0.01" required></div>
        <div><label class="label">Date limit</label><input class="input" name="due" type="date" value="${new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)}"></div>
        <div style="grid-column:1/-1"><label class="label">Note</label><input class="input" name="note" placeholder="Rezon fakti a"></div>
        <div class="row" style="grid-column:1/-1;justify-content:flex-end;gap:.4rem">
          <button type="button" class="btn btn-ghost" data-close>Annuler</button>
          <button class="btn btn-primary">Créer fakti</button>
        </div>
      </form>
      <p class="muted" style="margin-top:.6rem;font-size:.78rem">
        Yon fakti manyèl <b>ajoute</b> sur les factures automatiques — il ne les remplace pas.</p>`);
    m.el.querySelector('#f').onsubmit = async ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target).entries());
      try {
        await v13.rpc('jl13_rpc_manual_invoice', {
          _company: d.company, _amount: Number(d.amount), _due: d.due || null, _note: d.note || null
        });
        v13.toast('Facture manuelle créée.', 'success'); m.close(); done && done();
      } catch (e) { v13.toast(e.message, 'error'); }
    };
  }

  LotriShell.register('invoices', {
    render: async host => {
      const companies = await v13.companies();
      host.innerHTML = `
        <div class="page-hd"><h2>Faktirasyon</h2>
          <p class="muted">Factures automatiques (forfait) et factures manuelles par compagnie. Solde = Ventes − À payer — aucune commission.</p></div>
        <div class="card">
          <div class="card-hd"><h3>Compagnie</h3>
            <div class="row" style="gap:.4rem">
              <button class="btn btn-ghost" id="gen"><i class="fa-solid fa-robot"></i> Jenere fakti mwa a</button>
              <button class="btn btn-primary" id="man"><i class="fa-solid fa-plus"></i> Créer une facture manuelle</button>
            </div></div>
          ${v13.filterRow(`
            ${v13.field('Recherche de compagnie', `<input class="input" id="q" placeholder="non konpayi…">`)}
            ${v13.field('Statut', `<select class="input" id="st">
                <option value="">Tous</option>
                <option value="late">An reta</option>
                <option value="unpaid">Nom payé</option>
                <option value="paid">Payé</option></select>`)}
            ${v13.field('Du', `<input class="input" type="date" id="from">`)}
            ${v13.field('Au', `<input class="input" type="date" id="to">`)}
          `)}
          <div id="kpis"></div>
          <div id="list"></div>
        </div>
        <div class="card" id="hist-card" style="display:none">
          <div class="card-hd"><h3 id="hist-t">Historique fakti</h3>
            ${v13.exportBar('hist-tbl', 'fakti')}</div>
          <div id="hist"></div>
        </div>`;

      const $ = s => host.querySelector(s);
      let rows = [];

      const load = async () => {
        const st = $('#st').value;
        rows = await v13.rpc('jl13_rpc_invoices', {
          _status: st === 'late' || st === '' ? null : st,
          _company: null, _from: $('#from').value || null, _to: $('#to').value || null
        });
        rows = rows || [];
        if (st === 'late') rows = rows.filter(r => r.days_late > 0);
        draw();
      };

      const draw = () => {
        const q = $('#q').value.trim().toLowerCase();
        const per = {};
        rows.forEach(r => {
          if (q && !String(r.company_name || '').toLowerCase().includes(q)) return;
          const k = r.company_id || 'none';
          per[k] = per[k] || { id: r.company_id, name: r.company_name, n: 0, auto: 0, manual: 0, due: 0, paid: 0, late: 0 };
          const p = per[k];
          p.n++; p[r.source === 'auto' ? 'auto' : 'manual']++;
          if (r.status === 'paid') p.paid += Number(r.amount || 0); else p.due += Number(r.amount || 0);
          p.late = Math.max(p.late, r.days_late || 0);
        });
        const list = Object.values(per).sort((a, b) => b.due - a.due);
        const tot = list.reduce((a, p) => ({ due: a.due + p.due, paid: a.paid + p.paid, n: a.n + p.n }), { due: 0, paid: 0, n: 0 });
        $('#kpis').innerHTML = v13.kpis([
          { k: 'Compagnie', v: v13.int(list.length) },
          { k: 'Facture', v: v13.int(tot.n) },
          { k: 'Nom payé', v: v13.money(tot.due), tone: 'warn' },
          { k: 'Payé', v: v13.money(tot.paid), tone: 'ok' }
        ]);
        $('#list').innerHTML = list.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Compagnie</th><th class="num">Facture</th><th class="num">Otomatik</th><th class="num">Manyèl</th>
            <th class="num">Nom payé</th><th class="num">Payé</th><th>Statut</th><th></th></tr></thead>
          <tbody>${list.map(p => `<tr data-c="${esc(p.id)}" class="jl13-click">
            <td><b>${esc(p.name)}</b></td>
            <td class="num">${p.n}</td><td class="num">${p.auto}</td><td class="num">${p.manual}</td>
            <td class="num mono">${v13.money(p.due)}</td><td class="num mono">${v13.money(p.paid)}</td>
            <td>${p.late > 0 ? `<span class="badge badge-danger">${p.late}j reta</span>` : p.due > 0 ? '<span class="badge badge-warning">Nom payé</span>' : '<span class="badge badge-success">Ajou</span>'}</td>
            <td><button class="btn btn-sm" data-h="${esc(p.id)}">Historique <i class="fa-solid fa-chevron-right"></i></button></td>
          </tr>`).join('')}</tbody></table></div>` : '<div class="empty">Aucune facture ne correspond à la recherche.</div>';
      };

      const history = cid => {
        const r = rows.filter(x => x.company_id === cid);
        $('#hist-card').style.display = '';
        $('#hist-t').textContent = 'Historique fakti — ' + ((r[0] && r[0].company_name) || '');
        $('#hist').innerHTML = `<div class="table-wrap"><table class="table" id="hist-tbl">
          <thead><tr><th>Numéro</th><th>Sous</th><th>Forfait</th><th class="num">Montant</th><th>Date limit</th><th>Statut</th><th>Créer</th></tr></thead>
          <tbody>${r.map(i => `<tr>
            <td class="mono">${esc(i.number)}</td><td>${srcBadge(i.source)}</td><td>${esc(i.plan_name)}</td>
            <td class="num mono">${v13.money(i.amount)}</td><td>${v13.date(i.due_date)}</td>
            <td>${stBadge(i.status, i.days_late)}</td><td class="muted">${v13.dt(i.created_at)}</td>
          </tr>`).join('')}</tbody></table></div>`;
        v13.wireExports(host);
        $('#hist-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };

      host.addEventListener('click', e => {
        const b = e.target.closest('[data-h]') || e.target.closest('tr[data-c]');
        if (b) history(b.dataset.h || b.dataset.c);
      });
      $('#q').oninput = draw;
      ['#st', '#from', '#to'].forEach(s => $(s).onchange = load);
      $('#man').onclick = () => manualForm(companies, '', load);
      $('#gen').onclick = async () => {
        if (!await L.ui.confirm('Générer les factures automatiques pour le mois en cours ?')) return;
        try {
          const n = await v13.rpc('jl13_rpc_generate_invoices', {});
          v13.toast(n + ' nouvo fakti otomatik.', 'success'); load();
        } catch (e) { v13.toast(e.message, 'error'); }
      };
      await load();
    }
  });
})();
