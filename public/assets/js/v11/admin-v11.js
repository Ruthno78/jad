/* =====================================================================
 * JADSTACK LOTTO V11 — KONFIGIRASYON SUPERADMIN + PATCH YO
 *  • Moyen de paiement konfigirab (ak imaj)
 *  • Tirage: logo/non konfigirab pa Superadmin selman
 *  • Card validasyon (egz. chanjman logo konpayi)
 *  • Contrôle de fin de mois amelyore
 *  • Korije erè «{}» lè w kreye yon ajan
 * ===================================================================== */
(function () {
  const L = window.Lotri, v11 = L.v11, SB = () => L.supabase, esc = L.escapeHtml;

  /* ---------- Moyen de paiement ---------- */
  LotriShell.register('pay-methods', {
    render: async (host) => {
      const draw = async () => {
        const { data } = await SB().from('jl11_payment_methods').select('*').order('sort_order');
        host.querySelector('#list').innerHTML = (data || []).map(o => `
          <div class="v11-pay-op" data-op="${o.id}">
            ${v11.imgInput({ src: o.image_url, folder: 'pay', label: 'Logo', title: 'Changer l\'image' })}
            <div style="flex:1">
              <input class="input" data-k="name" value="${esc(o.name)}" placeholder="Nom">
              <input class="input" data-k="phone" value="${esc(o.phone || '')}" placeholder="+509 0000 0000" style="margin-top:.3rem">
              <input class="input" data-k="account_name" value="${esc(o.account_name || '')}" placeholder="Nom du compte" style="margin-top:.3rem">
              <textarea class="input" data-k="instructions" rows="2" style="margin-top:.3rem">${esc(o.instructions || '')}</textarea>
              <div class="row" style="margin-top:.4rem;gap:.4rem">
                <label class="row" style="gap:.3rem;font-size:.78rem"><input type="checkbox" data-k="active" ${o.active ? 'checked' : ''}> Actif</label>
                <button class="btn btn-sm btn-primary" data-save="${o.id}">Enregistrer</button>
                <button class="btn btn-sm btn-danger btn-icon" data-del="${o.id}"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          </div>`).join('') || '<div class="empty">Aucun moyen de paiement.</div>';

        host.querySelectorAll('[data-op]').forEach(box => {
          box.addEventListener('v11:image', async e => {
            await SB().from('jl11_payment_methods').update({ image_url: e.detail.url }).eq('id', box.dataset.op);
          });
        });
        host.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => {
          const box = b.closest('[data-op]');
          const g = k => box.querySelector(`[data-k="${k}"]`);
          const { error } = await SB().from('jl11_payment_methods').update({
            name: g('name').value, phone: g('phone').value, account_name: g('account_name').value,
            instructions: g('instructions').value, active: g('active').checked, updated_at: new Date().toISOString()
          }).eq('id', b.dataset.save);
          L.toast(error ? error.message : 'Enregistré.', error ? 'error' : 'success');
        });
        host.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
          if (!await L.ui.confirm('Supprimer ce moyen de paiement ?', null, { danger: true })) return;
          await SB().from('jl11_payment_methods').delete().eq('id', b.dataset.del); draw();
        });
      };
      host.innerHTML = `
        ${v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'konfigirasyon' }, { label: 'moyen de paiement' }])}
        <div class="page-hd"><h2>Moyen de paiement</h2>
          <p class="muted">Ajoutez/modifiez les moyens de paiement et leurs images. Ils apparaissent en haut de toutes les pages de facturation.</p></div>
        <div class="card"><div class="card-hd"><h3>Lis</h3>
          <button class="btn btn-primary" id="new"><i class="fa-solid fa-plus"></i> Nouvo</button></div>
          <div id="list" class="v11-pay-grid" style="padding:.6rem"><div class="spinner"></div></div></div>`;
      host.querySelector('#new').onclick = async () => {
        const name = await L.ui.prompt({ title: 'Nouveau moyen de paiement', label: 'Nom', required: true });
        if (!name) return;
        const { error } = await SB().from('jl11_payment_methods').insert({ name, sort_order: 99 });
        if (error) L.toast(error.message, 'error'); else draw();
      };
      await draw();
    }
  });

  /* ---------- Configuration tiraj (Superadmin selman) — V16-BUG-2 ----------
   * Chak tiraj DWE lye ak yon vraies machines (jl9_machines). Pa gen "nom libre".
   * Antre ki deja egziste san machin gen yon UI "Lier à une machine réelle".
   * ------------------------------------------------------------------- */
  LotriShell.register('draw-config', {
    render: async (host) => {
      let machines = [];
      const loadMachines = async () => {
        const { data, error } = await SB().rpc('jl16_rpc_machines');
        if (!error && Array.isArray(data)) machines = data;
        else {
          const r = await SB().from('jl9_machines').select('*').eq('active', true).order('sort_order');
          machines = r.data || [];
        }
        return machines;
      };
      const machineOptions = (sel) => machines.map(m =>
        `<option value="${esc(m.id)}" ${String(sel) === String(m.id) ? 'selected' : ''}>${esc(m.name)}</option>`).join('');

      /* V18 — YON SÈL TABLO TIRAJ (kreye · modifye · logo · efase)
         Tous kolòn yo afiche nan yon tablo ki gen overflow orizontal sou mobil. */
      const DAYS = ['Dim', 'Len', 'Mad', 'Mèk', 'Jed', 'Van', 'Sam'];

      const draw = async () => {
        const { data } = await SB().from('jl11_draw_media').select('*').order('sort_order');
        const rows = (data || []).filter(d => !d.deleted_at);
        const orphans = rows.filter(d => !d.machine_id);

        host.querySelector('#orphan').innerHTML = orphans.length ? `
          <div class="card v16-warn" style="margin-bottom:.8rem">
            <div class="card-hd"><h3><i class="fa-solid fa-triangle-exclamation"></i>
              ${orphans.length} tiraj san vraies machines</h3></div>
            <div style="padding:.6rem">
              <p class="muted" style="font-size:.82rem">Antre sa yo te kreye ak yon nom libre
                (ansyen bug V11). Choisir vraies machines nan pou chak — logo ak koulè yo pa pèdi.</p>
              ${orphans.map(o => `
                <div class="row" style="gap:.4rem;margin-top:.5rem;align-items:center" data-o="${o.id}">
                  <strong style="flex:1">${esc(o.display_name)}</strong>
                  <select class="select" data-om><option value="">— Choisir une machine —</option>
                    ${machineOptions(null)}</select>
                  <button class="btn btn-sm btn-primary" data-link="${o.id}">Lye</button>
                </div>`).join('')}
            </div>
          </div>` : '';

        host.querySelector('#list').innerHTML = rows.length ? `
          <div class="draw-config-cards">${rows.map(d => `
            <div class="card v79-draw-card" data-d="${esc(d.id)}">
              <div class="row" style="justify-content:space-between;align-items:center;gap:.7rem">
                <div style="min-width:0"><strong>${esc(d.display_name)}</strong>
                  <div class="muted" style="font-size:.75rem">${esc(d.slug || '—')} · ${esc((d.open_time||'').slice(0,5) || '00:00')} → ${esc((d.close_time||'').slice(0,5) || '—')}</div>
                </div>
                <span class="badge ${d.active ? 'badge-success' : 'badge-danger'}">${d.active ? 'Actif' : 'Inactif'}</span>
              </div>
              <div class="row" style="justify-content:flex-end;gap:.4rem;margin-top:.65rem">
                <button class="btn btn-sm btn-primary" data-edit-draw="${esc(d.id)}"><i class="fa-solid fa-pen"></i> Modifier</button>
                <button class="btn btn-sm btn-danger" data-del="${esc(d.id)}"><i class="fa-solid fa-trash"></i> Supprimer</button>
              </div>
            </div>`).join('')}</div>` : '<div class="empty">Aucun tirage. Cliquez sur « Nouveau tirage ».</div>';

        host.querySelectorAll('[data-link]').forEach(b => b.onclick = async () => {
          const box = b.closest('[data-o]');
          const mid = box.querySelector('[data-om]').value;
          if (!mid) { L.toast('Sélectionnez une machine.', 'error'); return; }
          const { error } = await SB().rpc('jl16_rpc_link_draw_media', { _media: b.dataset.link, _machine: mid });
          if (error) { L.toast(error.message, 'error'); return; }
          L.toast('Le tirage est lié à la machine.', 'success');
          L.notify && L.notify.action && L.notify.action({
            action: 'draw_media.link', verb: 'lye', entity: 'un tirage avec une machine réelle',
            target_id: b.dataset.link });
          draw();
        });

        async function editDraw(id){
          const d = rows.find(x => String(x.id) === String(id));
          if (!d) return;
          const days = Array.isArray(d.days) && d.days.length ? d.days : [0,1,2,3,4,5,6];
          const pop = v11.popup('Modifier le tirage', `
            <div class="v79-draw-editor">
              <div class="v79-field"><label class="label">Nom du tirage</label><input class="input" id="ed-name" value="${esc(d.display_name||'')}"></div>
              <div class="v79-field"><label class="label">Machine</label><select class="select" id="ed-machine"><option value="">— Choisir une machine —</option>${machineOptions(d.machine_id)}</select></div>
              <div class="v79-field"><label class="label">Heure d'ouverture</label><input class="input" id="ed-open" type="time" value="${esc((d.open_time||'').slice(0,5))}"></div>
              <div class="v79-field"><label class="label">Heure de fermeture</label><input class="input" id="ed-close" type="time" value="${esc((d.close_time||'').slice(0,5))}"></div>
              <div class="v79-field"><label class="label">Ordre d'affichage</label><input class="input" id="ed-order" type="number" value="${Number(d.sort_order||0)}"></div>
              <div class="v79-field"><label class="label">Jours actifs</label><div class="v79-days">${DAYS.map((lbl,i)=>`<label><input type="checkbox" data-ed-day="${i}" ${days.includes(i)?'checked':''}> ${lbl}</label>`).join('')}</div></div>
              <div class="v79-field"><label class="label">Statut</label><label class="switch"><input id="ed-active" type="checkbox" ${d.active?'checked':''}><span class="track"></span><span>Actif</span></label></div>
              <div class="v79-field"><label class="label">Logo</label><div id="ed-logo">${v11.imgInput({src:d.logo_url,folder:'draws',round:true,label:'Modifier le logo'})}</div></div>
              <div class="v79-field"><label class="label">Slug</label><div class="input mono" style="background:var(--surface-2)">${esc(d.slug||'—')}</div></div>
            </div>`,
            { footer: '<button class="btn btn-primary" id="ed-save"><i class="fa-solid fa-floppy-disk"></i> Enregistrer les modifications</button>' });
          let logoUrl = d.logo_url || null;
          const logoBox = pop.el.querySelector('#ed-logo');
          if (logoBox) logoBox.addEventListener('v11:image', e => { logoUrl = e.detail.url || null; });
          pop.el.querySelector('#ed-save').onclick = async () => {
            const mid = pop.el.querySelector('#ed-machine').value;
            const nm = pop.el.querySelector('#ed-name').value.trim();
            const selectedDays = [...pop.el.querySelectorAll('[data-ed-day]')].filter(x=>x.checked).map(x=>Number(x.dataset.edDay));
            if (!nm) { L.toast('Le nom du tirage est obligatoire.', 'error'); return; }
            if (!mid) { L.toast('Vous devez sélectionner une machine réelle.', 'error'); return; }
            if (!selectedDays.length) { L.toast('Sélectionnez au moins un jour.', 'error'); return; }
            const { error } = await SB().from('jl11_draw_media').update({
              display_name:nm, machine_id:mid, open_time:pop.el.querySelector('#ed-open').value || '00:00',
              close_time:pop.el.querySelector('#ed-close').value || null, days:selectedDays,
              sort_order:Number(pop.el.querySelector('#ed-order').value||0), active:pop.el.querySelector('#ed-active').checked,
              logo_url:logoUrl, updated_at:new Date().toISOString()
            }).eq('id', id);
            if (error) { L.toast(error.message,'error'); return; }
            pop.close(); L.v13 && L.v13.bust && L.v13.bust('medias');
            L.notify && L.notify.action && L.notify.action({action:'draw_media.update',verb:'modifié',entity:'un tirage',subject_label:nm,target_id:id});
            L.toast('Tirage modifié avec succès.','success');
            draw();
          };
        }
        host.querySelectorAll('[data-edit-draw]').forEach(b => b.onclick = () => editDraw(b.dataset.editDraw));

        host.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
          const row = rows.find(x => String(x.id) === String(b.dataset.del));
          const nm = row ? row.display_name : 'ce tirage';
          if (!await L.ui.confirm(`Supprimer définitivement le tirage « ${nm} » ?`,
            'Le tirage n\'apparaîtra plus nulle part (en-tête, résultats, fiches).', { danger: true })) return;
          const { error } = await SB().rpc('jl12_rpc_delete_draw', { _id: b.dataset.del });
          if (error) { L.toast(error.message, 'error'); return; }
          L.v13 && L.v13.bust && L.v13.bust('medias');
          L.toast('Tirage supprimé.', 'success');
          L.notify && L.notify.action && L.notify.action({
            action: 'draw_media.delete', verb: 'efase', entity: 'un tirage',
            subject_label: nm, target_id: b.dataset.del });
          draw();
        });
      };

      host.innerHTML = `
        ${v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'konfigirasyon' }, { label: 'tirage' }])}
        <div class="page-hd"><h2>Tirage & logo</h2>
          <p class="muted">Yon sèl kote pou tout tiraj yo: kreye, modifye non/lè/jou, mete logo, efase.
            Chak tiraj dwe lye ak yon <strong>vraies machines</strong>. Les compagnies et les agents les voient partout.</p></div>
        <div id="orphan"></div>
        <div class="card"><div class="card-hd"><h3>Liste des tirages</h3>
          <button class="btn btn-sm btn-danger" id="cleanup-v72"><i class="fa-solid fa-broom"></i> Nettoyer les tirages</button><button class="btn btn-primary" id="new"><i class="fa-solid fa-plus"></i> Nouveau tirage</button></div>
          <div id="list" style="padding:.6rem"><div class="spinner"></div></div></div>`;

      await loadMachines();

      const cleanupBtn = host.querySelector('#cleanup-v72');
      if (cleanupBtn) cleanupBtn.onclick = async () => {
        const { data, error } = await SB().from('jl11_draw_media').select('id,display_name,active').order('sort_order');
        if (error) { L.toast(error.message, 'error'); return; }
        const keep = (window.Lotri.v72DrawWhitelist && window.Lotri.v72DrawWhitelist.keep) || (()=>true);
        const remove = (data || []).filter(d => !keep(d.display_name) && d.active !== false);
        if (!remove.length) { L.toast('Aucun tirage supplémentaire à désactiver.', 'success'); return; }
        if (!await L.ui.confirm(`Désactiver ${remove.length} tirage(s) non présents dans la liste de référence ?`, 'Les relations et résultats sont conservés : seuls les tirages sont désactivés.', { danger:true })) return;
        for (const d of remove) {
          const { error: e } = await SB().from('jl11_draw_media').update({ active:false, updated_at:new Date().toISOString() }).eq('id', d.id);
          if (e) { L.toast(e.message, 'error'); return; }
        }
        L.v13 && L.v13.bust && L.v13.bust('medias');
        L.toast(`${remove.length} tirage(s) désactivé(s). Les tirages de référence sont conservés.`, 'success');
        draw();
      };

      host.querySelector('#new').onclick = async () => {
        if (!machines.length) { L.toast('Aucune machine active. Créez d\'abord une machine.', 'error'); return; }
        const pop = v11.popup('Nouveau tirage', `
          <label class="label">Machine (obligatwa)</label>
          <select class="select" id="nm"><option value="">— Choisir une machine réelle —</option>${machineOptions(null)}</select>
          <label class="label" style="margin-top:.5rem">Nom du tirage (egz. «Florida Midi»)</label>
          <input class="input" id="nn" placeholder="Nom du tirage">
          <label class="label" style="margin-top:.5rem">Heure d\'ouverture</label>
          <input class="input" id="no" type="time">
          <label class="label" style="margin-top:.5rem">Lè fermer</label>
          <input class="input" id="nc" type="time">`,
          { footer: '<button class="btn btn-primary" id="ok">Créer</button>' });
        pop.el.querySelector('#ok').onclick = async () => {
          const mid = pop.el.querySelector('#nm').value;
          const nm = pop.el.querySelector('#nn').value.trim();
          const ct = pop.el.querySelector('#nc').value || null;
          const ot = pop.el.querySelector('#no').value || null;
          if (!mid) { L.toast('Vous devez sélectionner une machine réelle dans la liste.', 'error'); return; }
          if (!nm) { L.toast('Le nom du tirage est obligatoire.', 'error'); return; }
          const { data, error } = await SB().rpc('jl16_rpc_create_draw_media', {
            _machine: mid, _display_name: nm, _close_time: ct, _open_time: ot, _game_code: null });
          if (error) { L.toast(error.message, 'error'); return; }
          pop.close(); L.toast('Tirage créé.', 'success');
          L.v13 && L.v13.bust && L.v13.bust('medias');
          L.notify && L.notify.action && L.notify.action({
            action: 'draw_media.create', verb: 'kreye', entity: 'un tirage',
            subject_label: nm, target_id: data });
          draw();
        };
      };
      await draw();

    }
  });

  /* ---------- Card validasyon (Superadmin) ---------- */
  LotriShell.register('validations', {
    render: async (host) => {
      const { data } = await SB().from('jl11_action_cards').select('*')
        .order('created_at', { ascending: false }).limit(100);
      host.innerHTML = `
        ${v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'validasyon' }])}
        <div class="page-hd"><h2>Demande de validation</h2>
          <p class="muted">Acceptez ou annulez directement ici. La compagnie reçoit votre réponse en privé.</p></div>
        <div class="v11-pay-grid">${(data || []).map(c => `
          <div class="v11-action" data-c="${c.id}">
            <strong>${esc(c.title)}</strong>
            <div class="imgs">
              <figure><img src="${esc(c.before_url || '')}" alt="anvan">Avant</figure>
              <i class="fa-solid fa-arrow-right"></i>
              <figure><img src="${esc(c.after_url || '')}" alt="apre">Après</figure>
            </div>
            <div class="row">
              ${c.status === 'pending' ? `
                <button class="btn btn-sm btn-primary" data-ok="${c.id}">Accepter</button>
                <button class="btn btn-sm btn-danger" data-no="${c.id}">Annuler</button>`
                : `<span class="badge ${c.status === 'approved' ? 'badge-success' : 'badge-danger'}">${esc(c.status)}</span>`}
            </div>
          </div>`).join('') || '<div class="empty">Aucune demande.</div>'}</div>`;
      const act = async (id, ok) => {
        const reason = await L.ui.prompt({ title: ok ? 'Accepter' : 'Annuler', label: 'Rezon (opsyonèl)' });
        const { error } = await SB().rpc('jl11_rpc_review_card', { _card: id, _ok: ok, _reason: reason || null });
        if (error) { L.toast(error.message, 'error'); return; }
        L.toast('Fèt.', 'success'); LotriShell.go('validations');
      };
      host.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => act(b.dataset.ok, true));
      host.querySelectorAll('[data-no]').forEach(b => b.onclick = () => act(b.dataset.no, false));
    }
  });

  /* ---------- Notifications e-mail (maks 2) — konpayi ak superadmin ---------- */
  LotriShell.register('mail-optin', {
    render: async (host) => {
      /* V14/V16 RÈG KRITIK #1 — uniquement Super Admin (UI + backend RLS/RPC). */
      if ((window.__lotriProfile || {}).role !== 'super_admin') {
        host.innerHTML = '<div class="empty"><i class="fa-solid fa-lock"></i>Les notifications par e-mail sont réservées à l\'administration.</div>';
        return;
      }
      const { data } = await SB().from('jl11_email_prefs').select('*').maybeSingle();
      let emails = (data && Array.isArray(data.emails)) ? data.emails.slice() : [];
      /* V16 · A.0 — default editab, prepopile pa baz done a. */
      if (!emails.length) emails = ['jadstacklotto@gmail.com'];

      host.innerHTML = `
        ${v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'mesaj' }, { label: 'notifications e-mail' }])}
        <div class="page-hd"><h2>Notifications e-mail</h2></div>
        <div class="card" style="padding:1rem;max-width:640px">
          <p class="muted" style="font-size:.84rem">
            <strong>Kijan sa fonksyone:</strong> chak aksyon enpòtan sou platfòm nan
            (kreye ajan, bloke/debloke, deklare peman, saisir les résultats tiraj, mesaj…)
            voye yon imèl bay <strong>toutes les adresses de cette liste</strong>.
            Vous ka ajoute <strong>autant d\'e-mails que vous voulez</strong>. Sèlman ou menm (Super Admin)
            ki gen aksè a paj sa a — konpayi ak ajan pa gen okenn konfigirasyon e-mails.</p>
          <div id="rows" style="margin-top:.8rem"></div>
          <button class="btn btn-sm" id="add" style="margin-top:.5rem">
            <i class="fa-solid fa-plus"></i> Ajouter un e-mail</button>
          <label class="row" style="gap:.4rem;margin-top:.6rem;font-size:.84rem">
            <input type="checkbox" id="act" ${!data || data.active ? 'checked' : ''}> Activer les notifications</label>
          <div class="row" style="gap:.5rem;margin-top:.9rem">
            <button class="btn btn-primary" id="save"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button>
            <button class="btn" id="test"><i class="fa-solid fa-paper-plane"></i> Faire un test</button>
          </div>
        </div>`;

      const rowsEl = host.querySelector('#rows');
      const paint = () => {
        rowsEl.innerHTML = emails.map((e, i) => `
          <div class="row v16-mail-row" style="gap:.4rem;margin-top:.4rem" data-i="${i}">
            <input class="input" type="email" data-e="${i}" value="${esc(e)}" placeholder="nom@exemple.com">
            <button class="btn btn-sm btn-danger btn-icon" data-rm="${i}" title="Retirer">
              <i class="fa-solid fa-trash"></i></button>
          </div>`).join('') || '<div class="empty" style="padding:.8rem">Aucun e-mail. Cliquez sur « Ajouter un e-mail ».</div>';
        rowsEl.querySelectorAll('[data-e]').forEach(inp => inp.oninput = () => {
          emails[Number(inp.dataset.e)] = inp.value;
        });
        rowsEl.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
          emails.splice(Number(b.dataset.rm), 1); paint();
        });
      };
      paint();

      host.querySelector('#add').onclick = () => { emails.push(''); paint(); };

      const read = () => emails.map(e => String(e || '').trim().toLowerCase())
        .filter(Boolean).filter((e, i, a) => a.indexOf(e) === i);

      host.querySelector('#save').onclick = async () => {
        const list = read();
        const bad = list.find(e => !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(e));
        if (bad) { L.toast('E-mail invalide : ' + bad, 'error'); return; }
        const { error } = await SB().rpc('jl11_rpc_set_emails',
          { _emails: list, _active: host.querySelector('#act').checked });
        if (error) { L.toast(error.message, 'error'); return; }
        emails = list; paint();
        L.notify && L.notify.reloadRecipients && L.notify.reloadRecipients();
        L.notify && L.notify.action && L.notify.action({
          action: 'email_prefs.update', verb: 'mis à jour', entity: 'liste des notifications e-mail',
          details: { 'Nombre d\'e-mails': list.length } });
        L.toast('Enregistrer — ' + list.length + ' e-mails.', 'success');
      };

      host.querySelector('#test').onclick = async () => {
        const list = read();
        if (!list.length) { L.toast('Indiquez au moins une adresse e-mail.', 'error'); return; }
        let ok = 0;
        for (const e of list) {
          try { if (await L.notify.test(e, 'Test de notification JADSTACK LOTTO V16.')) ok++; } catch (_) { }
        }
        L.toast('Test envoyé à ' + ok + '/' + list.length + ' adrès.', ok ? 'success' : 'error');
      };
    }
  });

  /* ---------- Contrôle de fin de mois amelyore ---------- */
  v11.monthControl = async function () {
    const { data, error } = await SB().rpc('jl11_rpc_month_control', { _as_of: new Date().toISOString().slice(0, 10) });
    if (error || !data || !data.length) return;
    const total = data.reduce((s, r) => s + Number(r.amount || 0), 0);
    const pop = v11.popup(`Contrôle de fin de mois — ${data.length} compagnies en retard`, `
      <p class="muted" style="font-size:.82rem">Total dû: <strong>${v11.money(total)}</strong></p>
      <div class="table-wrap"><table class="table"><thead><tr>
        <th>Compagnie</th><th class="num">Facture</th><th class="num">Montant</th><th class="num">Reta</th></tr></thead>
        <tbody>${data.map(r => `<tr data-v11-title="${esc(r.company_name)}" data-v11-row='${esc(JSON.stringify({
          Compagnie: r.company_name, Facture: r.invoices, Montant: v11.money(r.amount),
          Reta: r.days_late + ' jou', 'Pi ansyen echeyans': r.oldest_due
        }))}'><td>${esc(r.company_name)}</td><td class="num">${r.invoices}</td>
        <td class="num">${v11.money(r.amount)}</td><td class="num">${r.days_late} jou</td></tr>`).join('')}
        </tbody></table></div>`,
      { footer: '<button class="btn btn-primary" id="go">Aller à la facturation</button>' });
    v11.wireRows(pop.el);
    pop.el.querySelector('#go').onclick = () => { pop.close(); LotriShell.go('invoices'); };
  };
  /* V22 · B1 — ansyen otomatik "Contrôle de fin de mois" retire isit la:
     li pa t gen kontwòl wòl, kidonk ajan yo te wè popup la.
     monthly-check.js deja fè menm travay la ak 3 kontwòl wòl. */

  /* ---------- Korije erè «{}» lè w kreye yon ajan ---------- */
  v11.createAgent = async function (fields) {
    const { data, error } = await SB().rpc('jl11_rpc_create_agent', {
      _full_name: fields.full_name, _phone: fields.phone || null,
      _address: fields.address || null, _branch: fields.branch_id || null,
      _country: fields.country || null, _department: fields.department || null,
      _email_2: fields.email_2 || null,
      _alt_names: Array.isArray(fields.alt_names) ? fields.alt_names : null
    });
    if (error) throw new Error(error.message || error.details || error.hint || 'Impossible de créer l\'agent.');
    if (!data || !data.id) throw new Error('Le serveur n\'a pas renvoyé l\'agent. Réessayez.');
    /* V16 · PATI A.2 + B — chak aksyon: log + imèl bay lis Superadmin an. */
    L.notify && L.notify.action && L.notify.action({
      action: 'agent.create', verb: 'kreye', entity: 'yon ajan',
      subject_label: fields.full_name, target_id: data.id,
      details: { 'Nom de l\'agent': fields.full_name, 'ID piblik': data.public_id || '—' }
    });
    return data;
  };
})();
