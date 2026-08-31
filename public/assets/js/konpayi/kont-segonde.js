/* =====================================================================
 * JADSTACK LOTTO — KONT SEGONDÈ (jesyon pa konpayi a)
 * ---------------------------------------------------------------------
 * Yon konpayi ka kreye plizyè "compte secondaire" ki gen SÈL dwa antre
 * rezilta tiraj (jl_secondary_accounts.can_add_results) — pa touche
 * `role` check ki egziste sou jl9_profiles: compte secondaire a otantifye
 * kòm role='company' epi frontend limite meni li (gade
 * konpayi/kont-segonde-gate.js pou kote sa aplike).
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  LotriShell.register('kont-segonde', {
    render: async (host) => {
      const profile = await window.Lotri.getProfile();
      host.innerHTML = `
        <div class="card">
          <div class="card-hd">
            <h3>Compte secondaire</h3>
            <button class="btn btn-primary" id="new-sec"><i class="fa-solid fa-plus"></i> Nouvo compte secondaire</button>
          </div>
          <p class="muted" style="padding:0 var(--sp-4) var(--sp-3)">
            Yon compte secondaire ka SÈLMAN saisir les résultats tiraj (menu «Résultats des tirages») — li pa gen aksè
            ak rès meni Compagnie an (ekip, finans, paramèt…). Si kont prensipal konpayi a bloke,
            compte secondaire yo bloke tou otomatikman.
          </p>
          <div id="list"></div>
        </div>`;

      async function load() {
        const list = document.getElementById('list');
        const { data, error } = await SB().rpc('jl_rpc_secondary_accounts_list', { _company: null });
        if (error) { list.innerHTML = '<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>' + esc(error.message) + '</div>'; return; }
        list.innerHTML = (data || []).length
          ? `<div class="table-wrap"><table class="table"><thead><tr>
              <th>Nom</th><th>Description</th><th>E-mail</th><th>Statut</th><th>Compte connecté</th><th>Action</th></tr></thead>
              <tbody>${data.map(a => `<tr>
                <td>${esc(a.full_name)}</td>
                <td class="muted">${esc(a.description || '—')}</td>
                <td class="mono">${esc(a.email || '—')}</td>
                <td><span class="badge ${a.status === 'active' ? 'badge-success' : 'badge-danger'}">${a.status === 'active' ? 'Actif' : 'Bloqué'}</span></td>
                <td>${a.user_id ? '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Lye</span>' : '<span class="badge badge-warning">Pas encore lié</span>'}</td>
                <td class="row">
                  ${!a.user_id ? `<button class="btn btn-sm" data-link="${a.id}" data-email="${esc(a.email || '')}" data-name="${esc(a.full_name)}"><i class="fa-solid fa-user-plus"></i> Créer kont</button>` : `<button class="btn btn-sm" data-reset-pw="${esc(a.email || '')}"><i class="fa-solid fa-key"></i> Réinitialiser le mot de passe</button>`}
                  <button class="btn btn-sm" data-toggle="${a.id}" data-status="${a.status}"><i class="fa-solid ${a.status === 'active' ? 'fa-lock' : 'fa-lock-open'}"></i> ${a.status === 'active' ? 'Bloqué' : 'Activer'}</button>
                  <button class="btn btn-sm btn-icon btn-danger" data-del="${a.id}" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
                </td></tr>`).join('')}</tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-user-group"></i>Aucun compte secondaire.</div>';
      }

      document.getElementById('new-sec').onclick = () => {
        const m = document.createElement('div'); m.className = 'modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvo compte secondaire</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Nom</label><input class="input" name="full_name" required></div>
            <div><label class="label">Description (opsyonèl)</label><input class="input" name="description" placeholder="ex. Peut saisir les résultats après les heures de travail"></div>
            <div><label class="label">E-mail (pour créer un compte de connexion ensuite)</label><input class="input" name="email" type="email"></div>
          </div><div class="row" style="justify-content:flex-end;margin-top:1rem">
          <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button></div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick = () => m.remove();
        m.querySelector('#f').onsubmit = async (ev) => {
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          try {
            await SB().rpc('jl_rpc_secondary_account_create', {
              _company: profile.company_id, _full_name: d.full_name,
              _description: d.description || null, _email: d.email || null
            });
            window.Lotri.toast('Compte secondaire créé.', 'success');
            m.remove(); load();
          } catch (err) {
            window.Lotri.toast(err.message || 'Impossible de créer le compte secondaire.', 'error');
          }
        };
      };

      host.addEventListener('click', async (e) => {
        const rp = e.target.closest('[data-reset-pw]');
        if (rp) {
          const email = rp.dataset.resetPw;
          if (!email) { window.Lotri.toast('Ce compte n\'a pas d\'e-mail enregistré.', 'error'); return; }
          const { error } = await SB().auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/auth.html' });
          if (error) window.Lotri.toast(error.message, 'error');
          else window.Lotri.toast('E-mail "changer le mot de passe" voye.', 'success');
          return;
        }
        const t = e.target.closest('[data-toggle]');
        if (t) {
          const next = t.dataset.status === 'active' ? 'blocked' : 'active';
          const { error } = await SB().rpc('jl_rpc_secondary_account_set_status', { _account: t.dataset.toggle, _status: next });
          if (error) window.Lotri.toast(error.message, 'error'); else load();
          return;
        }
        const d = e.target.closest('[data-del]');
        if (d) {
          if (!await window.Lotri.ui.confirm('Supprimer ce compte secondaire ?', null, { danger: true })) return;
          const { error } = await SB().rpc('jl_rpc_secondary_account_delete', { _account: d.dataset.del });
          if (error) window.Lotri.toast(error.message, 'error'); else load();
          return;
        }
        const link = e.target.closest('[data-link]');
        if (link) {
          const email = link.dataset.email || await window.Lotri.ui.prompt({ title: 'Créer un compte de connexion', label: 'E-mail', required: true });
          if (!email) return;
          const pass = await window.Lotri.ui.prompt({ title: 'Créer un compte de connexion', label: 'Mot de passe (min. 6 caractères)', required: true });
          if (!pass || pass.length < 6) return;
          try {
            // Compte secondaire a otantifye kòm role='company' — sa pa chanje
            // okenn verifikasyon role ki egziste; sèl diferans lan se
            // jl_secondary_accounts.user_id ki lye pou frontend limite meni li.
            const created = await window.Lotri.createAccount({
              email, password: pass, role: 'company',
              company_id: profile.company_id, full_name: link.dataset.name
            });
            await SB().rpc('jl_rpc_secondary_account_link', { _account: link.dataset.link, _user: created.user_id });
            window.Lotri.toast('Compte secondaire lié à un compte de connexion.', 'success');
            if (window.Lotri.mail && window.Lotri.mail.post &&
                await window.Lotri.ui.confirm('Envoyer les informations de connexion par e-mail au compte secondaire ?')) {
              try {
                await window.Lotri.mail.post({
                  to: email, subject: 'Votre compte secondaire JADSTACK LOTTO',
                  fields: {
                    'E-mail': email, 'Mot de passe temporaire': pass,
                    'Nom': link.dataset.name || '',
                    'Enstriksyon': 'Avec ce compte, vous pouvez uniquement saisir les résultats des tirages. Changez le mot de passe lors de votre première connexion.'
                  }
                });
              } catch (_) { }
            }
            load();
          } catch (err) {
            window.Lotri.toast(err.message || 'Impossible de créer/lier le compte.', 'error');
          }
        }
      });

      await load();
    }
  });
})();
