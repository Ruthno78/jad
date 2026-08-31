/* =====================================================================
 * KONPAYI — V9.2
 *  cprofile : Profil de la compagnie — logo IMEDYAT (§14), lòt chan ap tann
 *             apwobasyon Super Admin (§3.2), ak «valè aktyèl / nouvo valè».
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;

  /* Verifye yon URL piblik reyèlman lizib epi kase cache navigatè a.
     Si bucket la prive, upload la reyisi men imaj la pa janm parèt. */
  async function checkedPublicUrl(bucket, path){
    const url = SB().storage.from(bucket).getPublicUrl(path).data.publicUrl;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
    } catch (ex) {
      throw new Error('L\'image est chargée mais l\'URL publique est illisible (' + ex.message +
        '). Bucket "' + bucket + '" doit être public.');
    }
    return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
  }

  const esc = window.Lotri.escapeHtml;

  const FIELDS = [
    /* V20 #5 — 'name' retire: uniquement Super Admin ka chanje non konpayi a. */
    { k: 'email', label: 'E-mail de la compagnie', type: 'email', hint: 'C\'est l\'identifiant de contact de la compagnie — il doit être unique.' },
    { k: 'phone', label: 'Numéro de téléphone', type: 'tel' },
    { k: 'address', label: 'Adresse', type: 'text', max: 160 }
  ];

  LotriShell.register('cprofile', {
    render: async (host) => {
      const p = window.__lotriProfile;
      const { data: co, error } = await SB().from('jl9_companies')
        .select('id,public_id,name,email,phone,address,logo_url').eq('id', p.company_id).maybeSingle();
      if (error || !co) {
        host.innerHTML = `<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>
          ${esc(error?.message || 'Votre compagnie est introuvable.')}</div>`;
        return;
      }
      const { data: reqs } = await SB().from('jl9_company_change_requests').select('*')
        .eq('company_id', p.company_id).order('created_at', { ascending: false }).limit(40);
      const pending = (reqs || []).filter(r => r.status === 'en_attente');
      const wa = String((window.Lotri.config.contact || {}).whatsapp || '').replace(/[^\d+]/g, '');

      const logoBox = (side) => `<div class="ph-logo" data-ph-logo="${side}">${co.logo_url
        ? `<img src="${esc(co.logo_url)}" alt="Logo ${esc(co.name)}">`
        : `<span class="fallback">${esc((co.name || 'K').charAt(0).toUpperCase())}</span>`}</div>`;

      host.innerHTML = `
      <div class="profile-head" id="ph">
        ${logoBox('left')}
        <div class="ph-mid">
          <h2 class="ph-name" id="ph-name">${esc(co.name || '—')}</h2>
          <p class="ph-sub">Profil de la compagnie</p>
          <div class="ph-chips">
            <span class="chip mono">ID: ${esc(co.public_id || '—')}</span>
            ${co.email ? `<span class="chip"><i class="fa-solid fa-envelope"></i> ${esc(co.email)}</span>` : ''}
            ${co.phone ? `<span class="chip"><i class="fa-solid fa-phone"></i> ${esc(co.phone)}</span>` : ''}
          </div>
        </div>
        ${logoBox('right')}
      </div>

      <!-- V20 #5 — kad "Logo de la compagnie" retire: logo a li uniquement pou konpayi a. -->
      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Informations de la compagnie</h3>
          <span class="chip mono">ID: ${esc(co.public_id || '—')}</span></div>

        ${pending.length ? `<div class="pending-note">
          <i class="fa-solid fa-hourglass-half"></i>
          <span>Vous avez <strong>${pending.length}</strong> chanjman k ap tann apwobasyon Super Admin:
            ${esc(pending.map(r => r.field).join(', '))}. Les anciennes valeurs restent actives jusqu\'à sa réponse.</span>
        </div>` : ''}

        <p class="muted" style="margin-bottom:1rem">Pour chaque champ, vous voyez <strong>la valeur actuelle</strong> (li uniquement)
          ak yon chan pou <strong>la nouvelle valeur</strong>. Chanjman an pa aplike touswit —
          li ale bay Super Admin pou apwobasyon.</p>

        <form id="f" novalidate>
          ${FIELDS.map(f => {
            const p2 = pending.find(r => r.field === f.k);
            return `
            <div class="approve-grid" style="margin-bottom:1rem">
              <div class="approve-box">
                <div class="lbl">${esc(f.label)} — valeur actuelle</div>
                <input class="input" value="${esc(co[f.k] || '')}" disabled>
              </div>
              <div class="arrow"><i class="fa-solid fa-arrow-right"></i></div>
              <div class="approve-box new">
                <div class="lbl">Nouvelle valeur${p2 ? ' — deja an atant' : ''}</div>
                <input class="input" name="${f.k}" type="${f.type}" ${f.max ? `maxlength="${f.max}"` : ''}
                  ${p2 ? `value="${esc(p2.new_value)}" disabled` : ''}
                  placeholder="${p2 ? '' : 'Kite vid si w pa vle chanje l'}">
                <small class="field-err" data-err="${f.k}" hidden></small>
                ${f.hint ? `<small class="muted">${esc(f.hint)}</small>` : ''}
              </div>
            </div>`;
          }).join('')}
          <div class="form-row"><label class="label" for="reason">Rezon (opsyonèl)</label>
            <textarea class="textarea" id="reason" name="reason" rows="3" maxlength="400"
              placeholder="Pourquoi souhaitez-vous cette modification ?"></textarea></div>
          <button class="btn btn-primary" id="send"><i class="fa-solid fa-paper-plane"></i> Envoyer la demande</button>
        </form>
      </div>

      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Mes demandes</h3></div>
        ${(reqs || []).length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Date</th><th>Chan</th><th>Ansyen</th><th>Nouvo</th><th>Statut</th><th>Note</th></tr></thead><tbody>
          ${reqs.map(r => `<tr>
            <td class="muted">${new Date(r.created_at).toLocaleString()}</td>
            <td>${esc((FIELDS.find(f => f.k === r.field) || {}).label || r.field)}</td>
            <td class="muted">${esc(r.old_value || '—')}</td>
            <td>${esc(r.new_value)}</td>
            <td><span class="badge ${r.status === 'apwouve' ? 'badge-success' : r.status === 'rejte' ? 'badge-danger' : 'badge-warning'}">${esc(r.status.replace('_', ' '))}</span></td>
            <td class="muted">${esc(r.review_note || '—')}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><i class="fa-regular fa-paper-plane"></i>Aucune demande.</div>'}
      </div>`;

      /* V20 #5 — chajman logo retire nan UI konpayi a. */

      /* ---------- §3.2 — Autre chan: demann apwobasyon ---------- */
      document.getElementById('f').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        host.querySelectorAll('[data-err]').forEach(el => { el.hidden = true; });
        host.querySelectorAll('.input.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        const fd = new FormData(ev.target);
        const reason = (fd.get('reason') || '').toString().trim();
        const changes = [];
        let bad = false;

        for (const f of FIELDS) {
          const raw = (fd.get(f.k) || '').toString().trim();
          if (!raw) continue;
          const input = ev.target.querySelector(`[name="${f.k}"]`);
          const showErr = (m) => {
            const el = host.querySelector(`[data-err="${f.k}"]`);
            el.textContent = m; el.hidden = false; input.classList.add('is-invalid'); bad = true;
          };
          if (raw === (co[f.k] || '')) { showErr('Valeur sa a menm ak la valeur actuelle.'); continue; }
          if (f.k === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) { showErr('L\'adresse e-mail est invalide.'); continue; }
          if (f.k === 'name' && raw.length < 2) { showErr('Le nom est trop court.'); continue; }
          if (f.k === 'phone' && !/^[\d\s+()-]{6,}$/.test(raw)) { showErr('Le numéro de téléphone n\'est pas valide.'); continue; }
          changes.push({ field: f.k, label: f.label, value: raw, old: co[f.k] || '—' });
        }
        if (bad) return;
        if (!changes.length) { window.Lotri.toast('Remplissez au moins un champ pour envoyer une demande.', 'error'); return; }

        await window.Lotri.ui.busy(document.getElementById('send'), async () => {
          const done = [];
          for (const c of changes) {
            const { error: e2 } = await SB().rpc('jl9_rpc_request_company_change',
              { _field: c.field, _new_value: c.value, _reason: reason || null });
            if (e2) { window.Lotri.toast(e2.message, 'error'); return; }
            done.push({ name: c.label, value: c.old + ' → ' + c.value });
          }

          /* §16 — YON SÈL imèl menm si gen plizyè chan ki chanje. */
          window.Lotri.notify.send({
            action: 'company.change.requested',
            verb: 'mande chanje', entity: 'le profil de la compagnie', entity_plural: 'chan pwofil',
            items: done,
            details: { 'Rezon': reason || '—', 'Statut': 'En attente apwobasyon Super Admin' }
          });

          const cont = await window.Lotri.modal.confirm(
            'Votre modification est enregistrée.',
            'En attente de l\'approbation du Super Administrateur. Vous pouvez continuer sur WhatsApp si vous souhaitez accélérer, ou nous pouvons vous contacter.',
            { okText: wa ? 'Continuer sur WhatsApp' : 'Bien compris', cancelText: 'Fermer' });
          if (cont && wa) {
            const txt = encodeURIComponent('Bonjourr, je suis la compagnie ' + co.name +
              '. Je viens d\'envoyer une demande de modification : ' + done.map(d => d.name).join(', ') + '.');
            window.open('https://wa.me/' + wa.replace(/^\+/, '') + '?text=' + txt, '_blank', 'noopener');
          }
          LotriShell.render();
        });
      });
    }
  });
})();
