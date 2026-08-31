/* =====================================================================
 * JADSTACK LOTTO v9.4 — MODIFYE SAN DOUBLE (Faz 6)
 * ---------------------------------------------------------------------
 * Avant sa, pou korije yon konpayi moun te konn re-kreye l — sa te lakòz
 * de fich pou menm konpayi a. Isit la ou CHWAZI konpayi a nan yon lis,
 * chan yo ranpli ak valè aktyèl li, epi `jl9_rpc_admin_update_company`
 * fè yon UPDATE sou menm ID a. Pa gen okenn INSERT — donk pa gen double.
 *
 * Chan sansib yo pwoteje ak lock 5 chif la (system-lock.js).
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  const FIELDS = [
    { k: 'name',    label: 'Nom de la compagnie',    type: 'text' },
    { k: 'email',   label: 'E-mail',           type: 'email' },
    { k: 'phone',   label: 'Téléphone',        type: 'tel' },
    { k: 'address', label: 'Adresse',          type: 'text' }
  ];

  LotriShell.register('cedit', {
    render: async (host) => {
      const { data, error } = await SB().from('jl9_companies')
        .select('id,slug,name,email,phone,address,status,ticket_lang')
        .is('deleted_at', null).order('name');
      if (error) {
        host.innerHTML = `<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>${esc(error.message)}</div>`;
        return;
      }
      const list = data || [];

      host.innerHTML = `
      <div class="page-hd"><h2>Modifier une compagnie</h2>
        <p class="muted">Choisir konpayi a, korije sa ki bezwen korije. Sistèm nan mis à jour la même fiche —
           li pa janm kreye yon dezyèm kopi.</p></div>

      <div class="card">
        <div class="form-row"><label class="label" for="ce-pick">Compagnie</label>
          <select class="input" id="ce-pick">
            <option value="">— Choisir —</option>
            ${list.map(c => `<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.slug || '')}</option>`).join('')}
          </select>
          <small class="muted">${esc(String(list.length))} entreprises actives dans le système.</small></div>
      </div>

      <div class="card" style="margin-top:1.25rem" id="ce-box" hidden>
        <div class="card-hd"><h3>Informations de la compagnie a</h3></div>
        <div data-syslock="Informations de la compagnie">
          ${FIELDS.map(f => `
            <div class="form-row"><label class="label" for="ce-${f.k}">${esc(f.label)}</label>
              <input class="input" id="ce-${f.k}" type="${f.type}">
              <small class="muted" data-old="${f.k}"></small></div>`).join('')}
          <div class="form-row"><label class="label" for="ce-status">Statut</label>
            <select class="input" id="ce-status">
              <option value="active">Actif</option>
              <option value="blocked">Bloqué</option>
              <option value="disabled">Désactiver</option>
            </select></div>
          <div class="form-row"><label class="label" for="ce-ticket-lang">Langue du ticket (ticket imprimé)</label>
            <select class="input" id="ce-ticket-lang">
              <option value="">— Defo Super Admin —</option>
              <option value="fr">Français</option>
              <option value="ht">Créole</option>
              <option value="en">English</option>
            </select>
            <small class="muted">La langue de navigation Agent/Compagnie (§2.3) n\'affecte pas ceci — uniquement la langue du ticket imprimé.</small></div>
          <div class="modal-ft" style="justify-content:flex-start">
            <button class="btn btn-primary" id="ce-save"><i class="fa-solid fa-floppy-disk"></i> Enregistrer les modifications</button>
          </div>
        </div>
      </div>`;

      if (window.Lotri.syslock) window.Lotri.syslock.wire(host);

      const box = document.getElementById('ce-box');
      let current = null;

      document.getElementById('ce-pick').addEventListener('change', (e) => {
        current = list.find(c => c.id === e.target.value) || null;
        if (!current) { box.hidden = true; return; }
        box.hidden = false;
        FIELDS.forEach(f => {
          document.getElementById('ce-' + f.k).value = current[f.k] || '';
          box.querySelector(`[data-old="${f.k}"]`).textContent =
            'Valeur actuelle : ' + (current[f.k] || '—');
        });
        document.getElementById('ce-status').value = current.status || 'active';
        document.getElementById('ce-ticket-lang').value = current.ticket_lang || '';
      });

      document.getElementById('ce-save').onclick = (e) => window.Lotri.ui.busy(e.currentTarget, async () => {
        if (!current) return window.Lotri.toast('Sélectionnez d\'abord une compagnie.', 'error');
        const patch = {};
        FIELDS.forEach(f => {
          const v = document.getElementById('ce-' + f.k).value.trim();
          if (v !== (current[f.k] || '')) patch[f.k] = v;
        });
        const st = document.getElementById('ce-status').value;
        if (st !== (current.status || 'active')) patch.status = st;

        const tl = document.getElementById('ce-ticket-lang').value;
        if (tl !== (current.ticket_lang || '')) patch.ticket_lang = tl;

        if (!Object.keys(patch).length) return window.Lotri.toast('Aucun changement n\'a été effectué.', 'error');
        if (patch.name !== undefined && !patch.name) return window.Lotri.toast('Le nom ne peut pas être vide.', 'error');
        if (patch.email !== undefined && patch.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email))
          return window.Lotri.toast('L\'adresse e-mail est invalide.', 'error');

        const ok = await window.Lotri.modal.confirm(
          'Enregistrer ces modifications ?',
          Object.entries(patch).map(([k, v]) => `${k}: ${current[k] || '—'} → ${v}`).join(' · ')
        );
        if (!ok) return;

        const { error: err2 } = await SB().rpc('jl9_rpc_admin_update_company', {
          _company: current.id, _patch: patch
        });
        if (err2) return window.Lotri.toast(err2.message, 'error');

        window.Lotri.toast('La compagnie est mise à jour.', 'success');
        window.Lotri.notify.send({
          action: 'company.admin.updated', verb: 'mis à jour', entity: 'konpayi ' + (current.name || ''),
          details: Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)]))
        });
        LotriShell.render();
      });
    }
  });
})();
