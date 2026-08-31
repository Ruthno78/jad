/* =====================================================================
 * V15-3 — VERIFIKASYON PEMAN (Superadmin)
 *  • Filtres: operatè · nimewo · non konpayi · ID fakti EGZAT
 *  • Approuver / Rejeter dirèkteman nan lis la
 *  • Repons lan pati nan mesaj entèn (jl11_messages) — PA GEN IMÈL
 *  RPC: jl13_rpc_payments(_status)
 * ===================================================================== */
(function () {
  const L = window.Lotri, v13 = L.v13, SB = () => L.supabase, esc = v13.esc;

  async function notify(companyId, text) {
    try {
      const prof = window.__lotriProfile || {};
      await SB().from('jl11_messages').insert({
        sender_id: prof.id || prof.user_id || null,
        company_id: companyId, body: text
      });
    } catch (e) { /* mesaj entèn opsyonèl — pa bloke aksyon an */ }
  }

  LotriShell.register('pay-review', {
    render: async host => {
      const ops = await v13.operators(false).catch(() => []);
      host.innerHTML = `
        <div class="page-hd"><h2>Vérification des paiements</h2>
          <p class="muted">Approuvez ou rejetez les déclarations de paiement des compagnies. La compagnie reçoit la réponse dans sa messagerie.</p></div>
        <div class="card">
          <div class="card-hd"><h3>Déclaration</h3>${v13.exportBar('pay-tbl', 'peman')}</div>
          ${v13.filterRow(`
            ${v13.field('Statut', `<select class="input" id="st">
              <option value="declared">En attente</option><option value="approved">Approuver</option>
              <option value="rejected">Rejeter</option><option value="">Tous</option></select>`)}
            ${v13.field('Opérateur', `<select class="input" id="op"><option value="">Tous</option>
              ${ops.map(o => `<option>${esc(o.name)}</option>`).join('')}</select>`)}
            ${v13.field('Numéro / referans', `<input class="input" id="ref" placeholder="referans…">`)}
            ${v13.field('Nom de la compagnie', `<input class="input" id="c" placeholder="konpayi…">`)}
            ${v13.field('ID fakti egzat', `<input class="input mono" id="inv" placeholder="uuid oswa nimewo fakti">`)}
          `)}
          <div id="kpis"></div><div id="list"></div>
        </div>`;
      const $ = s => host.querySelector(s);
      let rows = [];

      const load = async () => {
        rows = await v13.rpc('jl13_rpc_payments', { _status: $('#st').value || null }) || [];
        draw();
      };
      const draw = () => {
        const op = $('#op').value, ref = $('#ref').value.trim().toLowerCase();
        const c = $('#c').value.trim().toLowerCase(), inv = $('#inv').value.trim().toLowerCase();
        const r = rows.filter(p =>
          (!op || p.method === op) &&
          (!ref || String(p.reference || '').toLowerCase().includes(ref)) &&
          (!c || String(p.company_name || '').toLowerCase().includes(c)) &&
          /* ID fakti EGZAT: uuid konplè oswa nimewo fakti konplè */
          (!inv || String(p.invoice_id || '').toLowerCase() === inv || String(p.invoice_no || '').toLowerCase() === inv));
        $('#kpis').innerHTML = v13.kpis([
          { k: 'Déclaration', v: v13.int(r.length) },
          { k: 'Total deklare', v: v13.money(r.reduce((a, p) => a + Number(p.amount || 0), 0)) },
          { k: 'En attente', v: v13.int(r.filter(p => ['en_attente','declared'].includes(p.status)).length), tone: 'warn' }
        ]);
        $('#list').innerHTML = r.length ? `<div class="table-wrap"><table class="table" id="pay-tbl">
          <thead><tr><th>Compagnie</th><th>Facture</th><th>Opérateur</th><th>Referans</th>
            <th class="num">Deklare</th><th class="num">Facture</th><th>Prèv</th><th>Statut</th><th>Date</th><th></th></tr></thead>
          <tbody>${r.map(p => `<tr>
            <td><b>${esc(p.company_name)}</b></td>
            <td class="mono">${esc(p.invoice_no)}<br><span class="muted" style="font-size:.68rem">${esc(p.invoice_id || '')}</span></td>
            <td>${esc(p.method || '—')}</td><td class="mono">${esc(p.reference || '—')}</td>
            <td class="num mono">${v13.money(p.amount)}</td><td class="num mono">${v13.money(p.invoice_amount)}</td>
            <td>${p.proof_path ? `<a href="${esc(p.proof_path)}" target="_blank" rel="noopener"><img class="jl13-thumb" src="${esc(p.proof_path)}" alt="prèv"></a>` : '—'}</td>
            <td><span class="badge ${['apwouve','approved'].includes(p.status) ? 'badge-success' : ['refize','rejected'].includes(p.status) ? 'badge-danger' : 'badge-warning'}">${esc(p.status)}</span></td>
            <td class="muted">${v13.dt(p.created_at)}</td>
            <td class="row" style="gap:.3rem">
              ${['en_attente','declared'].includes(p.status) ? `
                <button class="btn btn-sm btn-primary" data-ok="${esc(p.id)}"><i class="fa-solid fa-check"></i> Approuver</button>
                <button class="btn btn-sm btn-danger" data-no="${esc(p.id)}"><i class="fa-solid fa-xmark"></i> Rejeter</button>` : '—'}
            </td></tr>`).join('')}</tbody></table></div>`
          : '<div class="empty">Aucune déclaration ne correspond aux filtres.</div>';
        v13.wireExports(host);

        host.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => decide(b.dataset.ok, true));
        host.querySelectorAll('[data-no]').forEach(b => b.onclick = () => decide(b.dataset.no, false));
      };

      const decide = async (id, ok) => {
        const p = rows.find(x => x.id === id);
        if (!await L.ui.confirm(ok ? 'Approuver ce paiement ?' : 'Rejeter ce paiement ?', null, { danger: !ok })) return;
        const { error } = await SB().from('jl9_payments')
          .update({ status: ok ? 'apwouve' : 'refize' }).eq('id', id);
        if (error) return v13.toast(error.message, 'error');
        if (ok && p && p.invoice_id) {
          await SB().from('jl9_invoices').update({ status: 'paid' }).eq('id', p.invoice_id);
        }
        await notify(p && p.company_id, ok
          ? `Votre paiement pour la facture ${p ? p.invoice_no : ''} APPROUVÉ.`
          : `Votre paiement pour la facture ${p ? p.invoice_no : ''} REJETÉ. Veuillez vérifier la référence.`);
        v13.toast(ok ? 'Paiement approuvé.' : 'Paiement rejeté.', ok ? 'success' : 'info');
        load();
      };

      ['#st'].forEach(s => $(s).onchange = load);
      ['#op'].forEach(s => $(s).onchange = draw);
      ['#ref', '#c', '#inv'].forEach(s => $(s).oninput = draw);
      await load();
    }
  });
})();
