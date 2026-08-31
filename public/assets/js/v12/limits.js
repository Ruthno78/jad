/* JADSTACK LOTTO V12 — LIMIT & BOUL BLOKE (§5) */
(function () {
  const L = window.Lotri, v12 = L.v12, SB = () => L.supabase, esc = v12.esc;
  const q = (r, s) => r.querySelector(s);

  async function refs() {
    const [ag, md, gm] = await Promise.all([
      SB().from('jl9_agents').select('id,full_name,public_id').is('deleted_at', null).order('full_name'),
      SB().from('jl11_draw_media').select('id,display_name').eq('active', true).order('sort_order'),
      SB().from('jl12_game_prizes').select('game_name').eq('active', true).order('sort_order')
    ]);
    return { agents: ag.data || [], media: md.data || [], games: gm.data || [] };
  }
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel === v ? ' selected' : ''}>${esc(t)}</option>`;

  function selects(r, pfx) {
    return `
      <div><label class="label">Niveau</label><select class="select" id="${pfx}scope">
        ${opt('company', 'Toute la compagnie')}${opt('agent', 'Un agent')}</select></div>
      <div><label class="label">Agent</label><select class="select" id="${pfx}agent">
        ${opt('', '— Choisir —')}${r.agents.map(a => opt(a.id, (a.full_name || '') + ' · ' + (a.public_id || ''))).join('')}</select></div>
      <div><label class="label">Tirage</label><select class="select" id="${pfx}media">
        ${opt('', 'Tous les tirages')}${r.media.map(m => opt(m.id, m.display_name)).join('')}</select></div>
      <div><label class="label">Jeu</label><select class="select" id="${pfx}game">
        ${opt('', 'Tous jeu')}${r.games.map(g => opt(g.game_name, g.game_name)).join('')}</select></div>`;
  }

  /* ------------------ Créer Limite ------------------ */
  L.LotriShell = window.LotriShell;
  window.LotriShell.register('v12-limits', {
    async render(host) {
      const r = await refs();
      host.innerHTML = `
        ${L.v11 ? L.v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'Créer une limite' }]) : ''}
        <div class="jl-card"><h3><i class="fa-solid fa-gauge-high"></i> Créer une limite</h3>
          <div class="jl-form-grid">
            ${selects(r, 'l')}
            <div><label class="label">Boule (depi)</label><input class="input" id="lfrom" placeholder="00"></div>
            <div><label class="label">Boule (jiska)</label><input class="input" id="lto" placeholder="99"></div>
            <div><label class="label">Montant maksimòm (HTG)</label><input class="input" id="lmax" type="number" min="0" step="1"></div>
            <div><label class="label">Date kòmansman</label><input class="input" id="lstart" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
            <div><label class="label">Date fen (opsyonèl)</label><input class="input" id="lend" type="date"></div>
            <div><label class="label">Note</label><input class="input" id="lnote" placeholder="rezon limit la"></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:.9rem">
            <button class="btn btn-primary" id="lsave"><i class="fa-solid fa-plus"></i> Créer une limite la</button></div>
        </div>
        <div class="jl-card"><h3><i class="fa-solid fa-list"></i> Limites actives</h3>
          <div class="jl-scroll"><table class="table"><thead class="jl-sticky-hd"><tr>
            <th>Niveau</th><th>Tirage</th><th>Jeu</th><th>Boule</th><th>Maks</th><th>Période</th><th></th>
          </tr></thead><tbody id="lbody"><tr><td colspan="7"><div class="spinner"></div></td></tr></tbody></table></div>
        </div>`;
      const nameOf = (arr, id, k) => (arr.find(x => x.id === id) || {})[k] || '—';
      async function list() {
        const { data, error } = await SB().from('jl12_limits').select('*').order('created_at', { ascending: false });
        const b = q(host, '#lbody');
        if (error) { b.innerHTML = `<tr><td colspan="7" class="muted">${esc(error.message)}</td></tr>`; return; }
        b.innerHTML = (data || []).length ? data.map(x => `<tr data-jl-row='${esc(JSON.stringify({
          Niveau: x.scope, Boule: (x.number_from || '*') + ' → ' + (x.number_to || '*'),
          Maksimòm: x.max_amount + ' HTG', Kòmanse: x.starts_on, Terminé: x.ends_on || '—', Note: x.note || '—'
        }))}' data-jl-title="Limite">
          <td>${esc(x.scope === 'agent' ? 'Agent : ' + nameOf(r.agents, x.agent_id, 'full_name') : 'Compagnie')}</td>
          <td>${esc(x.media_id ? nameOf(r.media, x.media_id, 'display_name') : 'Tous')}</td>
          <td>${esc(x.game_name || 'Tous')}</td>
          <td>${esc((x.number_from || '*') + ' → ' + (x.number_to || '*'))}</td>
          <td>${esc(Number(x.max_amount).toLocaleString('fr-HT'))} HTG</td>
          <td>${esc(x.starts_on)} ${x.ends_on ? '→ ' + esc(x.ends_on) : ''}</td>
          <td><button class="btn btn-sm btn-ghost" data-del="${x.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')
          : '<tr><td colspan="7" class="muted">Aucune limite pour le moment.</td></tr>';
        v12.wireRows(host);
        b.querySelectorAll('[data-del]').forEach(btn => btn.onclick = async () => {
          if (!confirm('Supprimer cette limite ?')) return;
          try {
            /* V17 §7 — Modifier = Supprimer, ak gadfou tikè aktif (jl17_rpc_delete_limit
               anpeche retire yon limit si gen fich aktif ki depann de li). */
            await SB().rpc('jl17_rpc_delete_limit', { _id: btn.dataset.del });
            L.toast('Limite supprimée.', 'success'); list();
          }
          catch (e) { L.toast(e.message, 'error'); }
        });
      }
      q(host, '#lsave').onclick = async () => {
        const g = id => (q(host, '#' + id).value || '').trim();
        try {
          await v12.rpc('jl12_rpc_save_limit', {
            _id: null, _scope: g('lscope'), _agent: g('lagent') || null, _media: g('lmedia') || null,
            _game: g('lgame') || null, _from: g('lfrom') || null, _to: g('lto') || null,
            _max: Number(g('lmax') || 0), _starts: g('lstart') || null, _ends: g('lend') || null,
            _note: g('lnote') || null, _active: true
          });
          L.toast('Limite créée.', 'success'); list();
        } catch (e) { L.toast(e.message, 'error'); }
      };
      await list();
    }
  });

  /* ------------------ Bloquer une boule ------------------ */
  window.LotriShell.register('v12-blocked', {
    async render(host) {
      const r = await refs();
      host.innerHTML = `
        ${L.v11 ? L.v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'Bloquer une boule' }]) : ''}
        <div class="jl-card"><h3><i class="fa-solid fa-ban"></i> Bloquer une boule</h3>
          <div class="jl-form-grid">
            ${selects(r, 'b')}
            <div><label class="label">Boule</label><input class="input" id="bnum" placeholder="ex. 77"></div>
            <div><label class="label">Rezon</label><input class="input" id="breason" placeholder="rezon blokaj la"></div>
            <div><label class="label">Date kòmansman</label><input class="input" id="bstart" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
            <div><label class="label">Date fen (opsyonèl)</label><input class="input" id="bend" type="date"></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:.9rem">
            <button class="btn btn-primary" id="bsave"><i class="fa-solid fa-ban"></i> Bloquer la boule</button></div>
        </div>
        <div class="jl-card"><h3><i class="fa-solid fa-list"></i> Boules bloquées</h3>
          <div class="jl-scroll"><table class="table"><thead class="jl-sticky-hd"><tr>
            <th>Boule</th><th>Niveau</th><th>Tirage</th><th>Jeu</th><th>Période</th><th>Rezon</th><th></th>
          </tr></thead><tbody id="bbody"><tr><td colspan="7"><div class="spinner"></div></td></tr></tbody></table></div>
        </div>`;
      const nameOf = (arr, id, k) => (arr.find(x => x.id === id) || {})[k] || '—';
      async function list() {
        const { data, error } = await SB().from('jl12_blocked').select('*').order('created_at', { ascending: false });
        const b = q(host, '#bbody');
        if (error) { b.innerHTML = `<tr><td colspan="7" class="muted">${esc(error.message)}</td></tr>`; return; }
        b.innerHTML = (data || []).length ? data.map(x => `<tr data-jl-row='${esc(JSON.stringify({
          Boule: x.number, Niveau: x.scope, Rezon: x.reason || '—', Kòmanse: x.starts_on, Terminé: x.ends_on || '—'
        }))}' data-jl-title="Boule bloquée">
          <td>${v12.ball(x.number, { size: 'sm' })}</td>
          <td>${esc(x.scope === 'agent' ? 'Agent : ' + nameOf(r.agents, x.agent_id, 'full_name') : 'Compagnie')}</td>
          <td>${esc(x.media_id ? nameOf(r.media, x.media_id, 'display_name') : 'Tous')}</td>
          <td>${esc(x.game_name || 'Tous')}</td>
          <td>${esc(x.starts_on)} ${x.ends_on ? '→ ' + esc(x.ends_on) : ''}</td>
          <td>${esc(x.reason || '—')}</td>
          <td><button class="btn btn-sm btn-ghost" data-del="${x.id}"><i class="fa-solid fa-unlock"></i></button></td></tr>`).join('')
          : '<tr><td colspan="7" class="muted">Aucune boule bloquée.</td></tr>';
        v12.wireRows(host);
        b.querySelectorAll('[data-del]').forEach(btn => btn.onclick = async () => {
          try { await v12.rpc('jl12_rpc_unblock_number', { _id: btn.dataset.del }); L.toast('La boule est débloquée.', 'success'); list(); }
          catch (e) { L.toast(e.message, 'error'); }
        });
      }
      q(host, '#bsave').onclick = async () => {
        const g = id => (q(host, '#' + id).value || '').trim();
        try {
          await v12.rpc('jl12_rpc_block_number', {
            _id: null, _scope: g('bscope'), _agent: g('bagent') || null, _media: g('bmedia') || null,
            _game: g('bgame') || null, _number: g('bnum'), _reason: g('breason') || null,
            _starts: g('bstart') || null, _ends: g('bend') || null, _active: true
          });
          L.toast('La boule est bloquée.', 'success'); list();
        } catch (e) { L.toast(e.message, 'error'); }
      };
      await list();
    }
  });
})();
