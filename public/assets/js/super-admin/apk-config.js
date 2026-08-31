/* =====================================================================
 * JADSTACK LOTTO — V27 FAZ 4 · Panèl konfigirasyon APK (SUPER ADMIN SÈL)
 * ---------------------------------------------------------------------
 *  Vi `apk-config` : upload / efase yon fichye APK-IPA, oswa mete yon
 *  lyen deyò; aktive-dezaktive; badge « Nouvo vèsyon » ak tèks li.
 *  Données: tab public.jl_agent_app_links + bucket storage `agent-apps`
 *  (gade supabase/KOURI-SA-A/PATCH-V27-APK-LINKS.sql).
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const esc = L.escapeHtml || (s => String(s ?? ''));
  const SB = () => L.supabase;
  const T = 'jl_agent_app_links';
  const BUCKET = 'agent-apps';

  LotriShell.register('apk-config', {
    render: async (host) => {
      const prof = await L.getProfile();
      if (!prof || prof.role !== 'super_admin') {
        host.innerHTML = '<div class="empty"><i class="fa-solid fa-lock"></i>Réservé à l\'administration.</div>';
        return;
      }

      host.innerHTML = `
        <div class="page-hd"><h2>Application POS (APK / iOS)</h2>
          <p class="muted">Lyen sa yo parèt nan popup Compagnie an, nan paj lis ajan yo,
            nan Surveillance des machines, ak nan footer paj ajan an.</p></div>

        <div class="card"><div class="card-hd"><h3>Ajouter une application</h3></div>
          <form id="apkf" style="padding:1rem">
            <div class="form-grid">
              <div><label class="label">Nom de la plateforme</label>
                <input class="input" name="platform_label" placeholder="Android (APK)" required></div>
              <div><label class="label">Vèsyon</label>
                <input class="input" name="version_label" placeholder="v1.0.0"></div>
              <div><label class="label">Fichye (APK / IPA)</label>
                <input class="input" type="file" name="file" accept=".apk,.ipa,.zip,application/vnd.android.package-archive"></div>
              <div><label class="label">…oswa lyen deyò</label>
                <input class="input" name="external_url" placeholder="https://…"></div>
              <div style="grid-column:1/-1"><label class="label">Description</label>
                <input class="input" name="description" placeholder="Application POS pour les agents"></div>
              <div><label class="label">Texte du badge</label>
                <input class="input" name="badge_text" value="Nouvelle version disponible"></div>
              <div><label class="label">Badge limen</label>
                <select class="select" name="badge_enabled">
                  <option value="0">Nom</option><option value="1">Oui</option></select></div>
            </div>
            <div class="row" style="justify-content:flex-end;margin-top:1rem">
              <button class="btn btn-primary" id="save"><i class="fa-solid fa-cloud-arrow-up"></i> Enregistrer</button>
            </div>
            <div class="alert alert-error" id="err" hidden></div>
          </form>
        </div>

        <div class="card"><div class="card-hd"><h3>Liens configurés</h3>
            <button class="btn btn-sm" id="refresh"><i class="fa-solid fa-rotate"></i> Rafrechi</button></div>
          <div id="rows" style="padding:1rem"></div>
        </div>

        <div class="card"><div class="card-hd"><h3>Aperçu (ce que voit la compagnie)</h3></div>
          <div style="padding:1rem"><div id="apkprev"></div></div>
        </div>`;

      const $ = s => host.querySelector(s);
      const err = $('#err');

      function rowHtml(r) {
        const url = L.apk.publicUrl(r);
        return `
          <div class="jl27-cfg-row ${r.is_active ? '' : 'jl27-cfg-off'}">
            <div class="jl27-cfg-main">
              <strong>${esc(r.platform_label)}</strong>
              ${r.version_label ? `<span class="badge">${esc(r.version_label)}</span>` : ''}
              ${r.badge_enabled ? `<span class="jl27-dot">${esc(r.badge_text)}</span>` : ''}
              <div class="jl27-cfg-url">${esc(url || '— aucun lien —')}</div>
            </div>
            <div class="jl27-cfg-acts">
              ${url ? `<button class="btn btn-sm btn-icon" data-copy="${esc(url)}" title="Copier le lien"><i class="fa-solid fa-link"></i></button>` : ''}
              <button class="btn btn-sm" data-badge="${r.id}" data-on="${r.badge_enabled ? 1 : 0}">
                <i class="fa-solid fa-bell"></i> Badge ${r.badge_enabled ? 'ON' : 'OFF'}</button>
              <button class="btn btn-sm" data-active="${r.id}" data-on="${r.is_active ? 1 : 0}">
                <i class="fa-solid ${r.is_active ? 'fa-eye' : 'fa-eye-slash'}"></i> ${r.is_active ? 'Actif' : 'Masquer'}</button>
              <button class="btn btn-sm" data-text="${r.id}"><i class="fa-solid fa-pen"></i> Texte du badge</button>
              <button class="btn btn-sm btn-icon btn-danger" data-del="${r.id}" data-path="${esc(r.file_path || '')}" title="Supprimer">
                <i class="fa-solid fa-trash"></i></button>
            </div>
          </div>`;
      }

      async function load() {
        const { data, error } = await SB().from(T).select('*').order('sort_order').order('created_at');
        if (error) { $('#rows').innerHTML = `<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>${esc(error.message)}</div>`; return; }
        $('#rows').innerHTML = (data || []).length
          ? data.map(rowHtml).join('')
          : '<div class="empty"><i class="fa-solid fa-box-open"></i>Aucun lien.</div>';
        L.apk.invalidate();
        await L.apk.renderCard($('#apkprev'), { canCopy: true });
      }

      $('#refresh').onclick = load;

      $('#apkf').onsubmit = async (ev) => {
        ev.preventDefault();
        err.hidden = true;
        const fd = new FormData(ev.target);
        const file = fd.get('file');
        const payload = {
          platform_label: String(fd.get('platform_label') || '').trim(),
          version_label: String(fd.get('version_label') || '').trim() || null,
          description: String(fd.get('description') || '').trim() || null,
          external_url: String(fd.get('external_url') || '').trim() || null,
          badge_text: String(fd.get('badge_text') || '').trim() || 'Nouvelle version disponible',
          badge_enabled: fd.get('badge_enabled') === '1',
          is_active: true
        };
        try {
          if (file && file.size) {
            if (file.size > 200 * 1024 * 1024) throw new Error('Fichye a twò gwo (max 200 Mo).');
            const ext = (file.name.split('.').pop() || 'apk').toLowerCase();
            const path = `pos/${Date.now()}-${payload.platform_label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${ext}`;
            const { error: upErr } = await SB().storage.from(BUCKET)
              .upload(path, file, { upsert: true, cacheControl: '3600' });
            if (upErr) throw new Error('Téléversement dans le bucket «' + BUCKET + '" echwe: ' + upErr.message);
            payload.file_path = path;
          } else if (!payload.external_url) {
            throw new Error('Choisissez un fichier ou indiquez un lien externe.');
          }
          const { error: insErr } = await SB().from(T).insert(payload);
          if (insErr) throw new Error(insErr.message);
          L.toast('L\'application est enregistrée', 'success');
          ev.target.reset();
          await load();
        } catch (ex) {
          err.textContent = ex.message; err.hidden = false;
          L.toast(ex.message, 'error');
        }
      };

      host.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-copy]');
        if (c) {
          try { await navigator.clipboard.writeText(c.dataset.copy); L.toast('Lien copié', 'success'); }
          catch (_) { L.toast('Impossible de copier le lien', 'error'); }
          return;
        }
        const b = e.target.closest('[data-badge]');
        if (b) { await SB().from(T).update({ badge_enabled: b.dataset.on !== '1' }).eq('id', b.dataset.badge); return load(); }
        const a = e.target.closest('[data-active]');
        if (a) { await SB().from(T).update({ is_active: a.dataset.on !== '1' }).eq('id', a.dataset.active); return load(); }
        const t = e.target.closest('[data-text]');
        if (t) {
          const val = await L.ui.prompt({ title: 'Texte du badge', label: 'Messages', value: 'Nouvelle version disponible', required: true });
          if (!val) return;
          await SB().from(T).update({ badge_text: val }).eq('id', t.dataset.text);
          return load();
        }
        const d = e.target.closest('[data-del]');
        if (d) {
          if (!await L.ui.confirm('Supprimer ce lien ?', 'Le fichier dans le stockage sera également supprimé.', { danger: true })) return;
          if (d.dataset.path) { try { await SB().storage.from(BUCKET).remove([d.dataset.path]); } catch (_) {} }
          const { error: delErr } = await SB().from(T).delete().eq('id', d.dataset.del);
          if (delErr) L.toast(delErr.message, 'error');
          return load();
        }
      });

      await load();
    }
  });
})();
