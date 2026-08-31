/* =====================================================================
 * JADSTACK LOTTO V17 §2 — DEMANN ANILE FICHE
 *  Vi «v17-cancel-requests» — Super Admin AK Mini Super Admin (Employeur).
 *  Yo se SÈL sous verite pou anile yon fich apre 10 min depi enprime a.
 *  Nom moun ki apwouve a make nan odit (jl9_audit_logs.actor_name).
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const SB = () => L.supabase;
  const esc = L.escapeHtml || (s => String(s ?? ''));
  const money = n => Number(n || 0).toLocaleString('fr-HT',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' HTG';

  const rpc = async (n, a) => {
    const { data, error } = await SB().rpc(n, a || {});
    if (error) throw new Error(error.message);
    return data;
  };

  const CHIP = {
    pending: ['En attente', 'badge'],
    approved: ['Approuver', 'badge-success'],
    rejected: ['Rejeter', 'badge-danger']
  };

  window.LotriShell.register('v17-cancel-requests', {
    render: async host => {
      host.innerHTML = `
        <div class="page-hd"><h2>Demande d’annulation de fiche</h2>
          <p class="muted">Après <strong>10 minutes</strong> depi yon fich enprime, ajan/konpayi pa ka
            efase l dirèkteman — se Super Admin oswa Mini Super Admin ki dekrete anilasyon an.</p></div>
        <div class="card"><div class="card-hd"><h3>Demandes</h3>
          <select class="select" id="st" style="max-width:200px">
            <option value="pending" selected>En attente</option>
            <option value="approved">Approuver</option>
            <option value="rejected">Rejeter</option>
            <option value="">Tous</option></select></div>
          <div id="tbl"><div class="spinner"></div></div></div>`;

      const $ = s => host.querySelector(s);

      async function load() {
        $('#tbl').innerHTML = '<div class="spinner"></div>';
        let rows = [];
        try { rows = await rpc('jl17_rpc_delete_requests', { _status: $('#st').value || null }) || []; }
        catch (e) { $('#tbl').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }

        $('#tbl').innerHTML = rows.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Fiche</th><th>Compagnie</th><th>Agent</th><th>Demandé par</th><th>Rezon</th>
            <th class="num">Total</th><th>Statut</th><th>Approuvé par</th><th>Date</th><th></th></tr></thead>
          <tbody>${rows.map(r => {
            const c = CHIP[r.status] || [r.status, 'badge'];
            return `<tr>
              <td class="mono"><b>#${esc(r.ticket_no || '—')}</b></td>
              <td>${esc(r.company_name)}</td><td>${esc(r.agent_name)}</td>
              <td>${esc(r.requester_name)}</td><td class="muted">${esc(r.reason || '—')}</td>
              <td class="num mono" data-copy-value="${Number(r.total || 0)}">${money(r.total)}</td>
              <td><span class="badge ${c[1]}">${esc(c[0])}</span></td>
              <td>${r.reviewer_name ? esc(r.reviewer_name) + ' <span class="muted">(' + esc(r.reviewer_role || '') + ')</span>' : '—'}</td>
              <td class="muted">${new Date(r.created_at).toLocaleString('fr-HT')}</td>
              <td>${r.status === 'pending' ? `
                <button class="btn btn-sm btn-primary" data-ok="${esc(r.id)}"><i class="fa-solid fa-check"></i> Approuver</button>
                <button class="btn btn-sm btn-danger" data-no="${esc(r.id)}"><i class="fa-solid fa-xmark"></i> Rejeter</button>` : ''}</td>
            </tr>`;
          }).join('')}</tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-inbox"></i>Aucune demande.</div>';

        host.querySelectorAll('[data-ok],[data-no]').forEach(b => b.onclick = async () => {
          const approve = b.hasAttribute('data-ok');
          const id = b.dataset.ok || b.dataset.no;
          const note = prompt(approve ? 'Note d\'approbation (facultatif) :' : 'Pourquoi rejetez-vous la demande ?') || null;
          try {
            await rpc('jl17_rpc_review_delete_request', { _request: id, _approve: approve, _note: note });
            L.toast(approve ? 'La fiche est supprimée après votre approbation.' : 'La demande est rejetée.', 'success');
          } catch (e) { L.toast(e.message, 'error'); }
          load();
        });
      }

      $('#st').onchange = load;
      await load();
    }
  });
})();
