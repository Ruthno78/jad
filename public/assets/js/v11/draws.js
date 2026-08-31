/* =====================================================================
 * JADSTACK LOTTO V11 — TIRAJ, BOUL REYALIS & REZILTA (3 LO)
 * ---------------------------------------------------------------------
 *  • Antèt sticky ki montre chak tiraj: logo (oswa boul reyalis ak lèt),
 *    non tiraj, epi 3 rezilta yo (1ye pi gwo, 2yèm mwayen, 3yèm pi piti).
 *  • Popup rezilta apre chak rafrechisman paj:
 *      – Superadmin: konfigire pou tout moun
 *      – Compagnie   : konfigire pwòp «lòt bolèt» li si Superadmin poko fè l
 *      – Agent      : gade selman
 *  • Sou-paj `rezilta` («kire rezilta»): tiraj fermer ki poko gen rezilta.
 *  • Avètisman 35 min anvan fèmti + rapèl sou chak aksyon.
 * ===================================================================== */
(function () {
  const L = window.Lotri, v11 = L.v11, SB = () => L.supabase, esc = L.escapeHtml;
  // Liste de référence demandée: les autres tirages restent invisibles et peuvent être désactivés via Super Admin.
  const KEEP = new Set(['GEORGIA MIDI','TEXAS MIDI','FLORIDA MIDI','NEW YORK MIDI','GEORGIA SOIR','TEXAS SOIR','TENNESSEE SOIR','FLORIDA SOIR','TENNESSEE MIDI','TENNESSEE MATIN','NEW YORK SOIR','TEXAS MATIN','TEXAS NIGHT','GEORGIA NIGHT']);
  const norm = v => String(v || '').trim().toUpperCase().replace(/\s+/g,' ');
  L.v72DrawWhitelist = L.v72DrawWhitelist || { keep: n => KEEP.has(norm(n)), names: () => Array.from(KEEP), norm };
  // V74 — date locale (évite le décalage UTC sur mobile) et rafraîchissement de la barre.
  const localDate = (d = new Date()) => {
    const x = new Date(d);
    const y = x.getFullYear(), m = String(x.getMonth() + 1).padStart(2, '0'), day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const today = () => localDate();
  const displayDate = (iso = today()) => {
    const [y, m, d] = String(iso).split('-');
    return y && m && d ? `${d}-${m}-${y}` : iso;
  };

  async function loadDraws() {
    const drawDate = today();
    const [{ data: media, error: mediaError }, { data: res, error: resultsError }] = await Promise.all([
      SB().from('jl11_draw_media').select('*').eq('active', true).order('sort_order'),
      SB().from('jl11_draw_results').select('*').eq('draw_date', drawDate)
    ]);
    if (mediaError) console.warn('[V74 results] media', mediaError);
    if (resultsError) console.warn('[V74 results] results', resultsError);

    const p = window.__lotriProfile || {};
    const byMedia = {};
    (res || []).forEach(r => {
      // Priorité : résultat de la compagnie courante, sinon résultat global existant.
      const isOwnCompany = r.scope === 'company' && p.company_id && r.company_id === p.company_id;
      const isGlobal = !r.scope || r.scope === 'global';
      const cur = byMedia[r.media_id];
      if (!cur || isOwnCompany || (isGlobal && cur.scope !== 'company')) byMedia[r.media_id] = r;
    });

    return (media || [])
      .filter(m => KEEP.has(norm(m.display_name)))
      .map(m => ({ ...m, result: byMedia[m.id] || null }))
      .sort((a, b) => String(a.close_time || '99:99').localeCompare(String(b.close_time || '99:99')));
  }

  function ball(d) {
    const color = d.color || v11.color(d.display_name);
    return d.logo_url
      ? `<span class="v11-ball"><img src="${esc(d.logo_url)}" alt="${esc(d.display_name)}"></span>`
      : `<span class="v11-ball" style="--ball:${color}">${esc(v11.initial(d.display_name))}</span>`;
  }

  function lots(r) {
    const values = r ? [r.lot1, r.lot2, r.lot3].filter(v => v != null && String(v).trim() !== '') : [];
    if (!values.length) return `<span class="v11-awaiting"><i class="fa-solid fa-clock"></i> En attente</span>`;
    return `<span class="v11-lots">${values.map((v, i) =>
      `<span class="v11-lot l${i + 1}">${esc(v)}</span>`).join('')}</span>`;
  }

  /* ---------- Antèt sticky vizib sou tout paj ---------- */
  async function mountHeader() {
    if (document.getElementById('v11-draws')) return;
    const shell = document.getElementById('shell');
    if (!shell) return;
    const bar = document.createElement('div');
    bar.className = 'v11-draws';
    bar.id = 'v11-draws';
    bar.innerHTML = `<div class="hd"><span class="v11-results-title"><i class="fa-solid fa-trophy"></i> Résultats des tirages</span><span class="v11-results-date">${displayDate(today())}</span>
      <button type="button" id="v11-draws-tog" aria-label="Réduire"><i class="fa-solid fa-chevron-up"></i></button></div>
      <div class="strip"><div class="spinner"></div></div>`;
    const view = document.getElementById('view');
    view.parentNode.insertBefore(bar, view);
    bar.querySelector('#v11-draws-tog').onclick = () => {
      bar.classList.toggle('collapsed');
      localStorage.setItem('v11-draws-collapsed', bar.classList.contains('collapsed') ? '1' : '0');
    };
    if (localStorage.getItem('v11-draws-collapsed') === '1') bar.classList.add('collapsed');
    await paintHeader();
  }

  async function paintHeader() {
    const bar = document.getElementById('v11-draws');
    if (!bar || bar.classList.contains('is-loading')) return;
    bar.classList.add('is-loading');
    try {
      const draws = await loadDraws();
      const strip = bar.querySelector('.strip');
      strip.innerHTML = draws.map(d => `
        <button type="button" class="v11-draw" data-draw="${esc(d.id)}" aria-label="Voir le résultat de ${esc(d.display_name)}">
          <span class="v11-draw-logo">${ball(d)}</span>
          <span class="nm">${esc(d.display_name)}</span>
          <span class="v11-draw-time"><i class="fa-regular fa-clock"></i> ${esc(d.close_time || '—')}</span>
          ${lots(d.result)}
        </button>`).join('') || '<div class="v11-results-empty"><i class="fa-solid fa-circle-info"></i><span>Aucun tirage autorisé disponible.</span></div>';

      strip.querySelectorAll('[data-draw]').forEach(el => el.onclick = () => {
        const d = draws.find(x => String(x.id) === el.dataset.draw);
        if (d) openResultCard(d);
      });
    } finally {
      bar.classList.remove('is-loading');
    }
  }

  /* ---------- Card / popup rezilta pou un tirage ---------- */
  function canEdit(role) { return role === 'super_admin' || role === 'company' || role === 'employer'; }

  function openResultCard(d) {
    const p = window.__lotriProfile || {};
    const r = d.result || {};
    const editable = canEdit(p.role);
    const body = `
      <div style="display:flex;gap:.9rem;align-items:center">${ball(d)}
        <div><strong>${esc(d.display_name)}</strong>
        <div class="muted" style="font-size:.75rem">Fèmti: ${esc(d.close_time || '—')} · ${today()}</div></div></div>
      ${editable ? `
        <div class="form-grid" style="margin-top:1rem">
          <div><label class="label">1ye lo (pi gwo)</label><input class="input" id="l1" maxlength="8" value="${esc(r.lot1 || '')}"></div>
          <div><label class="label">2e lot</label><input class="input" id="l2" maxlength="8" value="${esc(r.lot2 || '')}"></div>
          <div><label class="label">3e lot</label><input class="input" id="l3" maxlength="8" value="${esc(r.lot3 || '')}"></div>
        </div>
        <p class="muted" style="font-size:.74rem;margin-top:.5rem">
          ${(p.role === 'super_admin' || p.role === 'employer')
            ? 'Vous saisissez le résultat officiel pour tout le monde (vous pouvez aussi le corriger).'
            : 'Vous saisissez votre « autre borlette » — elle est valable uniquement pour votre compagnie. Seuls 3 lots sont acceptés.'}</p>`
        : `<div style="margin-top:1rem;text-align:center;font-size:1.4rem">${lots(r)}</div>
           <p class="muted" style="font-size:.74rem;text-align:center">C\'est votre compagnie ou l\'administration qui saisit les résultats.</p>`}`;

    const pop = v11.popup('Résultats des tirages', body, {
      subtitle: d.display_name,
      footer: editable
        ? `<button class="btn btn-ghost" id="goto">Voir tous les tirages</button>
           <button class="btn btn-primary" id="save"><i class="fa-solid fa-check"></i> Enregistrer</button>`
        : `<button class="btn btn-ghost" id="goto">Voir tous les tirages</button>`
    });
    pop.el.querySelector('#goto').onclick = () => { pop.close(); LotriShell.go('rezilta'); };
    const btn = pop.el.querySelector('#save');
    if (btn) btn.onclick = async () => {
      const g = id => (pop.el.querySelector('#' + id).value || '').trim() || null;
      if (!g('l1')) { L.toast('Le 1er lot est obligatoire.', 'error'); return; }
      const { error } = await SB().rpc('jl11_rpc_set_result', {
        _media: d.id, _date: today(), _lot1: g('l1'), _lot2: g('l2'), _lot3: g('l3'),
        _scope: (p.role === 'super_admin' || p.role === 'employer') ? 'global' : 'company'
      });
      if (error) { L.toast(error.message, 'error'); return; }
      pop.close(); L.toast('Résultat enregistré.', 'success');
      paintHeader();
    };
  }

  /* ---------- Sou-paj «rezilta jadya» ---------- */
  LotriShell.register('rezilta', {
    render: async (host) => {
      const p = await L.getProfile();
      const draws = await loadDraws();
      const pending = draws.filter(d => !d.result);
      host.innerHTML = `
        ${v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'tirage' }, { label: 'rezilta' }])}
        <div class="page-hd"><h2>Résultats des tirages</h2>
          <p class="muted">${pending.length
            ? pending.length + ' tirages n\'ont pas encore de résultat pour aujourd\'hui.'
            : 'Tous les tirages ont un résultat pour aujourd\'hui.'}</p></div>
        <div class="card v77-results-card"><div class="table-wrap"><table class="table">
          <thead><tr><th>Tirage</th><th>Fèmti</th><th>1ye lo</th><th>2yèm</th><th>3yèm</th><th>Sous</th><th></th></tr></thead>
          <tbody>${draws.map(d => {
            const r = d.result || {};
            return `<tr data-v11-title="${esc(d.display_name)}" data-v11-row='${esc(JSON.stringify({
              Tirage: d.display_name, Fèmti: d.close_time || '—',
              '1ye lo': r.lot1 || '—', '2e lot': r.lot2 || '—', '3e lot': r.lot3 || '—',
              Sous: r.scope === 'company' ? 'Autres borlettes de la compagnie' : (r.scope ? 'Ofisyèl' : 'Nom renseigné')
            }))}'>
              <td><div class="v77-result-draw">${ball(d)}<span><span class="v77-result-name">${esc(d.display_name)}</span><span class="v77-result-sub">Fermeture ${esc(d.close_time || '—')}</span></span></div></td>
              <td>${esc(d.close_time || '—')}</td>
              <td class="mono"><span class="v77-result-number">${esc(r.lot1 || '—')}</span></td>
              <td class="mono"><span class="v77-result-number">${esc(r.lot2 || '—')}</span></td>
              <td class="mono"><span class="v77-result-number">${esc(r.lot3 || '—')}</span></td>
              <td>${r.scope === 'company' ? '<span class="badge">Autre bolèt</span>'
                   : r.scope ? '<span class="badge badge-success">Ofisyèl</span>'
                   : '<span class="badge badge-warning">Nom renseigné</span>'}
                ${r.updated_at && (Date.now() - new Date(r.updated_at).getTime()) < 3 * 3600 * 1000
                  ? '<span class="badge badge-danger" style="margin-left:.3rem">Nouvo</span>' : ''}</td>
              <td><button class="btn btn-sm" data-open="${d.id}">
                ${canEdit(p.role) ? '<i class="fa-solid fa-pen"></i> Saisir le résultat' : '<i class="fa-solid fa-eye"></i> Voir'}</button></td>
            </tr>`;
          }).join('')}</tbody></table></div></div>`;
      v11.wireRows(host);
      host.querySelectorAll('[data-open]').forEach(b => b.onclick = e => {
        e.stopPropagation();
        openResultCard(draws.find(d => d.id === b.dataset.open));
      });
    }
  });

  /* ---------- Avètisman otomatik (35 min anvan / tiraj fermer) ---------- */
  async function alerts() {
    const p = window.__lotriProfile;
    if (!p) return;
    const draws = await loadDraws();
    const now = new Date();
    for (const d of draws) {
      if (!d.close_time || d.result) continue;
      const [h, m] = String(d.close_time).split(':').map(Number);
      const close = new Date(now); close.setHours(h, m, 0, 0);
      const mins = (close - now) / 60000;
      let stage = null;
      if (mins <= 35 && mins > 0) stage = 'warn35';
      else if (mins <= 0) stage = 'closed';
      if (!stage) continue;
      const { error } = await SB().from('jl11_result_alerts')
        .insert({ media_id: d.id, draw_date: today(), stage });
      if (error) continue; // deja voye (unique)
      const msg = stage === 'warn35'
        ? `Le tirage ${d.display_name} ferme dans 35 minutes — le résultat n\'est pas encore saisi.`
        : `Le tirage ${d.display_name} est fermé — le résultat n\'est pas encore saisi.`;
      if (p.role === 'super_admin' || p.role === 'company' || p.role === 'employer') {
        v11.toastLink(msg, 'rezilta', 'warn');
      }
      try {
        if (L.mailer && L.mailer.send) L.mailer.send({ subject: 'JADSTACK LOTTO — résultats', body: msg });
      } catch (_) { }
    }
  }

  /* ---------- Card rezilta apre chak rafrechisman ---------- */
  async function firstLoadCard() {
    const p = window.__lotriProfile;
    if (!p) return;
    const draws = await loadDraws();
    const missing = draws.filter(d => !d.result);
    if (!missing.length) return;
    if (sessionStorage.getItem('v11-result-card') === today()) return;
    sessionStorage.setItem('v11-result-card', today());
    const rows = missing.map(d => `<div class="v11-item" data-d="${d.id}">${ball(d)}
        <div class="meta"><div class="nm">${esc(d.display_name)}</div>
        <div class="sub">Fèmti ${esc(d.close_time || '—')} · résultat pas encore saisi</div></div></div>`).join('');
    const pop = v11.popup('Résultats d\'aujourd\'hui', `<div class="v11-list">${rows}</div>`, {
      subtitle: p.role === 'agent' ? 'Les résultats ne sont pas encore disponibles' : 'Cliquez sur un tirage pour saisir le résultat',
      footer: '<button class="btn btn-primary" id="all">Aller à la page des résultats</button>'
    });
    pop.el.querySelector('#all').onclick = () => { pop.close(); LotriShell.go('rezilta'); };
    pop.el.querySelectorAll('[data-d]').forEach(el => el.onclick = () => {
      pop.close(); openResultCard(missing.find(d => d.id === el.dataset.d));
    });
  }

  // V74 — mise à jour périodique des données réelles déjà fournies par le backend backend existant.
  let v74RefreshTimer = null;
  function startV74ResultsRefresh() {
    clearInterval(v74RefreshTimer);
    v74RefreshTimer = setInterval(() => {
      if (!document.hidden) paintHeader().catch(() => {});
    }, 60000);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) paintHeader().catch(() => {});
  });
  document.addEventListener('lotri:ready', () => {
    setTimeout(async () => {
      await mountHeader();
      await firstLoadCard();
      await alerts();
      startV74ResultsRefresh();
    }, 600);
  });
  /* chak aksyon (chanjman vi) re-verifye avètisman yo */
  document.addEventListener('lotri:view', () => { paintHeader(); alerts(); });
})();
