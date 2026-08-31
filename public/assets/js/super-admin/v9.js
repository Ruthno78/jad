/* =====================================================================
 * SUPER ADMIN — V9.2
 *  cchanges  : Modifications de la compagnie (En attente / Approuver / Rejeter)   §3.2
 *  sys-mail  : Notifications e-mail otomatik                       §4.5/4.6
 *  sys-backup: Télécharger backup JSON                            §6
 *  sys-history: Vèsyon sistèm + dènye 100 aksyon                §7
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;
  const LF = () => window.Lotri.lockfield;

  const FIELD_LABEL = { name: 'Nom de la compagnie', address: 'Adresse', phone: 'Téléphone', email: 'E-mail de la compagnie' };
  const STATUS = [
    ['en_attente', 'En attente', 'badge-warning'],
    ['apwouve', 'Approuver', 'badge-success'],
    ['rejte', 'Rejeter', 'badge-danger']
  ];

  /* ---------- §3.2.4 — Modifications de la compagnie ---------- */
  LotriShell.register('cchanges', {
    render: async (host) => {
      const want = new URL(location.href).searchParams.get('sec') || 'en_attente';
      host.innerHTML = `
        <div class="card">
          <div class="card-hd">
            <h3>Modifications de la compagnie</h3>
            <div class="seg" id="seg" role="group" aria-label="Filtrer par statut">
              ${STATUS.map(([k, l]) => `<button type="button" data-st="${k}"
                 aria-pressed="${k === want ? 'true' : 'false'}">${l}<span class="count" data-c="${k}"></span></button>`).join('')}
            </div>
          </div>
          <div class="notice notice-info" style="margin-bottom:1rem">
            <i class="fa-solid fa-circle-info"></i>
            <span><strong>Rapèl:</strong> logo yon konpayi aplike touswit — li pa pase isit la.
            Se uniquement non, adrès, telefòn ak imèl ki tann apwobasyon ou.</span>
          </div>
          <div id="l"><div class="spinner"></div></div>
        </div>`;

      let rows = [];
      let current = want;

      const draw = () => {
        const list = rows.filter(r => r.status === current);
        STATUS.forEach(([k]) => {
          const el = host.querySelector(`[data-c="${k}"]`);
          if (el) el.textContent = rows.filter(r => r.status === k).length || '';
        });
        host.querySelectorAll('#seg button').forEach(b =>
          b.setAttribute('aria-pressed', b.dataset.st === current ? 'true' : 'false'));

        document.getElementById('l').innerHTML = list.length ? list.map(r => `
          <div class="card" style="margin-bottom:1rem">
            <div class="row" style="margin-bottom:.8rem">
              <strong>${esc(r.companies?.name || 'Compagnie')}</strong>
              <span class="chip">${esc(FIELD_LABEL[r.field] || r.field)}</span>
              <span class="badge ${STATUS.find(s => s[0] === r.status)?.[2] || ''}">${esc(r.status.replace('_', ' '))}</span>
              <span class="right muted">${new Date(r.created_at).toLocaleString()}</span>
            </div>
            <div class="approve-grid">
              <div class="approve-box"><div class="lbl">Valeur actuelle</div>
                <div class="val">${esc(r.old_value || '—')}</div></div>
              <div class="arrow"><i class="fa-solid fa-arrow-right"></i></div>
              <div class="approve-box new"><div class="lbl">Nouvelle valeur mande</div>
                <div class="val">${esc(r.new_value || '—')}</div></div>
            </div>
            ${r.reason ? `<p class="muted" style="margin-top:.8rem"><strong>Motif de la compagnie :</strong> ${esc(r.reason)}</p>` : ''}
            ${r.review_note ? `<p class="muted" style="margin-top:.5rem"><strong>Votre note :</strong> ${esc(r.review_note)}</p>` : ''}
            ${r.status === 'en_attente' ? `<div class="row" style="margin-top:1rem">
              <button class="btn btn-primary btn-sm" data-ok="${r.id}"><i class="fa-solid fa-check"></i> Approuver</button>
              <button class="btn btn-danger btn-sm" data-no="${r.id}"><i class="fa-solid fa-xmark"></i> Rejeter</button>
            </div>` : `<p class="muted" style="margin-top:.6rem;font-size:.8rem">
              Trete ${r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : ''}.</p>`}
          </div>`).join('')
          : `<div class="empty"><i class="fa-regular fa-clipboard"></i>Aucune demande dans cette catégorie.</div>`;
      };

      const load = async () => {
        const { data, error } = await SB()
          .from('jl9_company_change_requests')
          .select('*, companies:jl9_companies(name, email, logo_url)')
          .order('created_at', { ascending: false }).limit(200);
        if (error) {
          document.getElementById('l').innerHTML =
            `<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>${esc(error.message)}</div>`;
          return;
        }
        rows = data || [];
        draw();
      };

      host.querySelector('#seg').addEventListener('click', e => {
        const b = e.target.closest('[data-st]'); if (!b) return;
        current = b.dataset.st; draw();
      });

      host.addEventListener('click', async (e) => {
        const ok = e.target.closest('[data-ok]');
        const no = e.target.closest('[data-no]');
        if (!ok && !no) return;
        const id = (ok || no).dataset.ok || no.dataset.no;
        const req = rows.find(r => r.id === id);

        const note = await window.Lotri.modal.prompt({
          title: ok ? 'Approuver cette modification ?' : 'Rejeter cette modification ?',
          label: ok ? 'Note (facultatif)' : 'Rezon refi (obligatwa)',
          help: (req ? `${FIELD_LABEL[req.field] || req.field}: « ${req.old_value || '—'} » → « ${req.new_value} »` : ''),
          multiline: true, required: !ok, okText: ok ? 'Approuver' : 'Rejeter'
        });
        if (note === null) return;

        const { error } = await SB().rpc('jl9_rpc_review_company_change',
          { _request: id, _approve: !!ok, _note: note || null });
        if (error) { window.Lotri.toast(error.message, 'error'); return; }
        window.Lotri.toast(ok ? 'Modification approuvée.' : 'Modification rejetée.', 'success');

        window.Lotri.notify.send({
          action: ok ? 'company.change.approved' : 'company.change.rejected',
          verb: ok ? 'approuver les modifications' : 'rejte chanjman',
          entity: (FIELD_LABEL[req?.field] || req?.field || 'pwofil') + ' konpayi ' + (req?.companies?.name || ''),
          details: {
            'Compagnie': req?.companies?.name || '—',
            'Ancienne valeur': req?.old_value || '—',
            'Nouvelle valeur': req?.new_value || '—',
            'Note': note || '—'
          }
        });
        load();
      });

      await load();
    }
  });

  /* ---------- §4.5 / §4.6 — Notifications e-mail otomatik ---------- */
  LotriShell.register('sys-mail', {
    render: async (host) => {
      /* v9.4 §Faz1 — pwoteksyon konplè: si `notify` manke nan config.js
         oswa nan baz la, nou pran yon valè defo olye nou kite paj la plante
         ak: SyntaxError: "undefined" is not valid JSON. */
      const FALLBACK = { enabled: true, subject_prefix: 'JADSTACK LOTTO', ghost_enabled: true, recipients: [] };
      let D = FALLBACK;
      try {
        D = Object.assign({}, FALLBACK, (window.JADSTACK_DEFAULTS && window.JADSTACK_DEFAULTS.notify) || {});
      } catch (_) { D = FALLBACK; }
      let saved = {};
      try {
        const { data } = await SB().from('jl9_site_config').select('value').eq('key', 'notify').maybeSingle();
        saved = (data && data.value) || {};
      } catch (_) { saved = {}; }
      const n = Object.assign({}, D, saved);
      if (!Array.isArray(n.recipients)) n.recipients = [];


      host.innerHTML = `
      <div class="card">
        <div class="card-hd"><h3>Notifications e-mail otomatik</h3>
          <button class="btn btn-primary" id="save" data-save><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button></div>

        <div class="notice notice-info" style="margin-bottom:1rem">
          <i class="fa-solid fa-envelope-circle-check"></i>
          <span><strong>Kijan sa mache:</strong> chak fwa yon aksyon enpòtan fèt sou platfòm nan
          (yon vant, yon anilasyon, yon nouvo ajan, yon chanjman logo, yon apwobasyon…),
          sistèm nan konpoze yon imèl <em>an de pati</em>: yon rezime ou ka li tankou yon fraz,
          epi anba li done teknik la (JSON). Vous <strong>pa oblije vizite sit la</strong> pou konnen
          sa k ap pase — imèl la rive kote w ye a.</span>
        </div>
        <div class="notice notice-warning" style="margin-bottom:1.25rem">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span><strong>La première fois qu\'une nouvelle adresse est ajoutée :</strong> FormSubmit voye yon imèl konfimasyon
          bay adrès sa a. Moun nan dwe klike sou lyen an (verifye Spam tou) — apre sa tout notifikasyon
          yo ap rive otomatikman.</span>
        </div>

        <label class="switch" style="justify-content:space-between;margin-bottom:1rem">
          <span><strong>Activer les notifications automatiques</strong><br>
            <small class="muted">Si vous désactivez ceci, aucun e-mail automatique ne sera envoyé.</small></span>
          <input type="checkbox" id="n-on" ${n.enabled !== false ? 'checked' : ''}><span class="track"></span>
        </label>

        <div class="form-row"><label class="label" for="n-prefix">Préfixe de l\'objet des e-mails</label>
          <input class="input" id="n-prefix" value="${esc(n.subject_prefix || '')}">
          <small class="muted">Exemple : « JADSTACK LOTTO — La compagnie CHEZ JOJO ajoute 10 nouveaux agents »</small></div>

        <div class="form-row">
          <label class="label">Destinatè administrasyon</label>
          <div id="rows"></div>
          <button type="button" class="btn btn-sm" id="add"><i class="fa-solid fa-plus"></i> Ajouter un destinataire</button>
        </div>

        <div class="form-row" style="border-top:1px solid var(--border);padding-top:1rem">
          <label class="label" for="t-mail">Envoyer un e-mail de test</label>
          <div class="row">
            <input class="input" id="t-mail" type="email" placeholder="email@exemple.com" style="flex:1">
            <button type="button" class="btn" id="t-send"><i class="fa-solid fa-paper-plane"></i> Envoyer tès la</button>
          </div>
          <div id="t-out" class="muted" style="margin-top:.6rem;font-size:.85rem"></div>
        </div>
      </div>


      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Qui reçoit quoi</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Qui</th><th>Ce qu\'il reçoit</th></tr></thead>
          <tbody>
            <tr><td><strong>Compagnie</strong></td><td>Sèlman pwòp aksyon pa li — yon « resi » pou chak bagay li fè
              (chanjman logo, nouvo ajan, elatriye), plis aksyon ajan ki anba l yo.</td></tr>
            <tr><td><strong>Super Admin</strong></td><td>Les deux : actions des compagnies <em>ak</em> aksyon tout ajan yo —
              yon vi konplè sou tout aktivite platfòm lan.</td></tr>
            <tr><td><strong>Kanal entèn</strong></td><td>Tous bagay, san eksepsyon.</td></tr>
          </tbody></table></div>
        <p class="muted" style="margin-top:.9rem;font-size:.84rem">
          Action ki afekte plizyè eleman menm kou (egzanp: jenere 10 agents) voye
          <strong>un seul e-mail</strong> avec une liste numérotée — pas 10 e-mails séparés.</p>
      </div>`;

      const rowsHost = document.getElementById('rows');
      const drawRows = (list) => {
        rowsHost.innerHTML = (list.length ? list : [{ email: '', label: '', active: true }]).map((r, i) => `
          <div class="mail-row" data-row="${i}">
            <input class="input" type="email" data-email placeholder="email@exemple.com" value="${esc(r.email || '')}">
            <label class="switch" title="Recevoir les notifications automatiquement">
              <input type="checkbox" data-active ${r.active !== false ? 'checked' : ''}><span class="track"></span></label>
            <button type="button" class="btn btn-sm btn-icon btn-danger" data-rm aria-label="Retirer">
              <i class="fa-solid fa-xmark"></i></button>
            <span class="hintline">☑ Recevoir les notifications par e-mail automatiquement — sans devoir visiter le site chaque jour.</span>
          </div>`).join('');
      };
      const readRows = () => Array.from(rowsHost.querySelectorAll('[data-row]')).map(r => ({
        email: r.querySelector('[data-email]').value.trim(),
        active: r.querySelector('[data-active]').checked
      })).filter(r => r.email);

      drawRows(Array.isArray(n.recipients) ? n.recipients : []);
      document.getElementById('add').onclick = () => drawRows(readRows().concat([{ email: '', active: true }]));
      rowsHost.addEventListener('click', e => {
        const rm = e.target.closest('[data-rm]'); if (!rm) return;
        rm.closest('[data-row]').remove();
      });

      /* --- Bouton imèl tès: li fè yon vrè apèl rezo epi li di sa k pase. --- */
      document.getElementById('t-send').onclick = (e) => window.Lotri.ui.busy(e.currentTarget, async () => {
        const out = document.getElementById('t-out');
        const mail = document.getElementById('t-mail').value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
          out.innerHTML = '<span style="color:var(--danger,#c0392b)">Saisissez d\'abord un e-mail valide.</span>';
          return;
        }
        out.textContent = 'Envoi en cours…';
        const ok = await (window.Lotri.notify.test
          ? window.Lotri.notify.test(mail)
          : Promise.resolve(false));
        out.innerHTML = ok
          ? 'E-mail la pati bay <strong>' + esc(mail) + '</strong>. Si c\'est la première fois que cette adresse est utilisée, ' +
            'FormSubmit envoie un e-mail de confirmation — le destinataire doit cliquer sur le lien (vérifiez aussi les spams) ' +
            'avant le début de la réception des notifications automatiques.'
          : '<span style="color:var(--danger,#c0392b)">Impossible de l\'envoyer. Vérifiez la connexion et réessayez.</span>';
      });



      document.getElementById('save').onclick = (e) => window.Lotri.ui.busy(e.currentTarget, async () => {
        const bad = readRows().find(r => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
        if (bad) { window.Lotri.toast('E-mail « ' + bad.email + ' » est invalide.', 'error'); return; }
        const value = {
          enabled: document.getElementById('n-on').checked,
          subject_prefix: document.getElementById('n-prefix').value.trim() || 'JADSTACK LOTTO',
          ghost_enabled: true,
          recipients: readRows()
        };
        const { error } = await SB().from('jl9_site_config')
          .upsert({ key: 'notify', value, updated_at: new Date().toISOString() });
        if (error) { window.Lotri.toast(error.message, 'error'); return; }
        await window.Lotri.loadConfig();
        window.Lotri.toast('Configuration e-mail enregistrée.', 'success');
        window.Lotri.notify.send({
          action: 'system.notify.updated', verb: 'mis à jour', entity: 'configuration des e-mails automatiques',
          details: { 'Destinataire actif': value.recipients.filter(r => r.active).map(r => r.email).join(', ') || '—' }
        });
      });
    }
  });

  /* ---------- §6 — Backup / Export ---------- */
  LotriShell.register('sys-backup', {
    render: async (host) => {
      host.innerHTML = `
      <div class="card">
        <div class="card-hd"><h3>Backup &amp; Export</h3>
          <button class="btn btn-primary" id="dl"><i class="fa-solid fa-download"></i> Télécharger Backup</button></div>
        <p class="muted">Ekspòte tout tab enpòtan yo (konpayi, ajan, pwofil, tikè, tiraj, jeu, mesaj,
          demann chanjman, konfigirasyon sit la, vèsyon ak jounal odit) nan yon sèl fichye
          <strong>JSON</strong>. Nom fichye a jenere otomatikman:
          <code>jadstack-backup-{dat}.json</code>.</p>
        <div class="notice notice-warning" style="margin-top:1rem">
          <i class="fa-solid fa-circle-info"></i>
          <span>C\'est un <strong>export en lecture seule</strong> — li pa yon backup SQL konplè baz done a
          (sa mande zouti Supabase/pg_dump ki deyò panel sa a). Kenbe fichye a nan yon kote ki sekirize:
          li gen done kliyan ladan l.</span>
        </div>
        <div id="sum" style="margin-top:1.25rem"></div>
      </div>`;

      document.getElementById('dl').onclick = (e) => window.Lotri.ui.busy(e.currentTarget, async () => {
        const { data, error } = await SB().rpc('jl9_rpc_export_backup');
        if (error) { window.Lotri.toast(error.message, 'error'); return; }
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'jadstack-backup-' + stamp + '.json';
        a.click();
        URL.revokeObjectURL(a.href);

        document.getElementById('sum').innerHTML = `
          <h4 style="margin-bottom:.5rem">Contenu du fichier</h4>
          <div class="table-wrap"><table class="table"><thead><tr><th>Tab</th><th class="num">Liy</th></tr></thead><tbody>
          ${Object.keys(data).filter(k => Array.isArray(data[k]))
            .map(k => `<tr><td class="mono">${esc(k)}</td><td class="num">${data[k].length}</td></tr>`).join('')}
          </tbody></table></div>`;
        window.Lotri.toast('Backup telechaje.', 'success');
        window.Lotri.notify.send({
          action: 'system.backup.exported', verb: 'telechaje', entity: 'une sauvegarde JSON complète',
          details: { 'Fichye': 'jadstack-backup-' + stamp + '.json' }
        });
      });
    }
  });

  /* ---------- §7 — Historique sistèm (vèsyon + 100 dènye aksyon) ---------- */
  LotriShell.register('sys-history', {
    render: async (host) => {
      const { data: vers } = await SB().from('jl9_system_versions')
        .select('*').order('released_at', { ascending: false }).limit(20);
      const cur = (vers || [])[0];

      host.innerHTML = `
      <div class="card">
        <div class="card-hd"><h3>Vèsyon sistèm</h3>
          <span class="version-pill"><i class="fa-solid fa-code-branch"></i> v${esc(cur?.version || '—')}</span></div>
        ${(vers || []).length ? `<div class="timeline">${vers.map(v => `
          <div class="timeline-item">
            <span class="when">v${esc(v.version)} · ${new Date(v.released_at).toLocaleDateString()}</span>
            <span class="what">${esc(v.notes || '—')}</span>
          </div>`).join('')}</div>`
          : '<div class="empty"><i class="fa-solid fa-code-branch"></i>Aucune version enregistrée.</div>'}
      </div>

      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Dernières actions (journal d\'audit)</h3></div>
        <div class="msg-toolbar">
          <input class="input" id="h-action" placeholder="Type d\'action (ex. logo)">
          <select class="select input" id="h-role">
            <option value="">Tous les rôles</option>
            <option value="super_admin">Super Admin</option>
            <option value="company">Compagnie</option>
            <option value="supervisor">Superviseur</option>
            <option value="agent">Agent</option>
          </select>
          <input class="input" id="h-from" type="date" aria-label="Du">
          <input class="input" id="h-to" type="date" aria-label="Au">
          <button class="btn btn-ghost btn-sm" id="h-clear">Réinitialiser</button>
        </div>
        <div id="h-list"><div class="spinner"></div></div>
      </div>`;

      const load = async () => {
        const f = document.getElementById('h-from').value;
        const t = document.getElementById('h-to').value;
        const { data, error } = await SB().rpc('jl9_rpc_system_history', {
          _limit: 100,
          _role: document.getElementById('h-role').value || null,
          _action: document.getElementById('h-action').value.trim() || null,
          _from: f ? new Date(f + 'T00:00:00').toISOString() : null,
          _to: t ? new Date(t + 'T23:59:59').toISOString() : null
        });
        const el = document.getElementById('h-list');
        if (error) { el.innerHTML = `<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>${esc(error.message)}</div>`; return; }
        el.innerHTML = (data || []).length
          ? `<div class="table-wrap"><table class="table"><thead><tr>
               <th>Date</th><th>Action</th><th>Rezime</th><th>Cible</th></tr></thead><tbody>
             ${data.map(a => `<tr>
               <td class="muted">${new Date(a.created_at).toLocaleString()}</td>
               <td><span class="badge">${esc(a.action)}</span></td>
               <td>${esc(a.summary || '—')}</td>
               <td class="muted">${esc(a.target || '—')}</td></tr>`).join('')}
             </tbody></table></div>`
          : '<div class="empty"><i class="fa-regular fa-file-lines"></i>Aucune entrée ne correspond aux filtres.</div>';
      };
      ['h-action', 'h-role', 'h-from', 'h-to'].forEach(id =>
        document.getElementById(id).addEventListener('change', load));
      document.getElementById('h-action').addEventListener('input', () => {
        clearTimeout(window.__hT); window.__hT = setTimeout(load, 350);
      });
      document.getElementById('h-clear').onclick = () => {
        ['h-action', 'h-role', 'h-from', 'h-to'].forEach(id => document.getElementById(id).value = '');
        load();
      };
      await load();
    }
  });
})();
