/* =====================================================================
 * JADSTACK LOTTO V15-9 — MODIFYE JWÈT (Superadmin) + RETIRE DOUBLON TIRAJ
 *  • Vi 'games'  : CRUD konplè sou jl13_rpc_save_game(jsonb)
 *      non, kòd, kategori, chif (digits_json), separatè, peyman x,
 *      min/max montan, aktif, lòd. Validasyon POS swiv `digits` imedyatman.
 *  • Vi 'draws'  : ansyen tablo doublon pou saisir les résultats RETIRE.
 *      Sèl kote pou saisir les résultats se nouvo paj "Résultats des tirages" (v11/draws.js).
 *  RÈG: pa gen komisyon; pa gen chan e-mails.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const v13 = L.v13;
  const SB = () => L.supabase;
  if (!v13 || !window.LotriShell) return;
  const esc = v13.esc;

  const CATS = [
    ['lottery', 'Loterie (Boules)'],
    ['mariage', 'Mariage'],
    ['lotto3', 'Lotto 3'],
    ['lotto4', 'Lotto 4'],
    ['lotto5', 'Lotto 5'],
    ['other', 'Autre'],
  ];

  function digitsOf(g) {
    const j = g.digits_json;
    if (Array.isArray(j) && j.length) return j.join(',');
    if (typeof j === 'string') { try { const p = JSON.parse(j); if (Array.isArray(p)) return p.join(','); } catch (_) {} }
    return String(g.digits || 2);
  }

  function form(g) {
    g = g || {};
    return `<h3>${g.id ? 'Modifier le jeu' : 'Nouveau jeu'}</h3>
    <form id="jl13-gform" class="jl13-form">
      <div class="form-grid">
        <div><label class="label">Code *</label>
          <input class="input" name="code" value="${esc(g.code || '')}" required placeholder="BOLET"></div>
        <div><label class="label">Nom *</label>
          <input class="input" name="name" value="${esc(g.name || '')}" required placeholder="Borlette 2 chiffres"></div>
        <div><label class="label">Kategori</label>
          <select class="input" name="category">
            ${CATS.map(c => `<option value="${c[0]}" ${((g.category || 'lottery') === c[0]) ? 'selected' : ''}>${c[1]}</option>`).join('')}
          </select></div>
        <div><label class="label">Chiffresfres (séparés par des virgules)</label>
          <input class="input" name="digits" value="${esc(digitsOf(g))}" placeholder="2 oswa 2,3">
          <small class="muted">Egzanp: <b>2</b> = boule à 2 chiffres · <b>2,2</b> = maryaj · <b>3</b> = lotto 3.</small></div>
        <div><label class="label">Separatè</label>
          <input class="input" name="separator" value="${esc(g.separator || '')}" placeholder="x oswa -">
          <small class="muted">Laissez vide si le jeu n\'a pas de séparateur.</small></div>
        <div><label class="label">Paiement ×</label>
          <input class="input" name="payout_x" type="number" step="0.01" min="0" value="${g.payout_x != null ? g.payout_x : 60}"></div>
        <div><label class="label">Montant minimòm</label>
          <input class="input" name="min_amount" type="number" step="0.01" min="0" value="${g.min_amount != null ? g.min_amount : 1}"></div>
        <div><label class="label">Montant maksimòm</label>
          <input class="input" name="max_amount" type="number" step="0.01" min="0" value="${g.max_amount != null ? g.max_amount : ''}" placeholder="(san limit)"></div>
        <div><label class="label">Ordre afichaj</label>
          <input class="input" name="sort_order" type="number" value="${g.sort_order || 0}"></div>
        <div><label class="label">Statut</label>
          <select class="input" name="active">
            <option value="true" ${g.active !== false ? 'selected' : ''}>Actif</option>
            <option value="false" ${g.active === false ? 'selected' : ''}>Désactiver</option>
          </select></div>
      </div>
      <div class="row" style="justify-content:flex-end;gap:.5rem;margin-top:1rem">
        <button type="button" class="btn btn-ghost" data-close>Annuler</button>
        <button class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button>
      </div>
    </form>`;
  }

  function openForm(g, after) {
    const m = v13.modal(form(g), { wide: true });
    m.el.querySelector('#jl13-gform').addEventListener('submit', async ev => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target).entries());
      const digits = String(f.digits || '2').split(/[,\s;x*-]+/).map(s => parseInt(s, 10)).filter(n => n > 0);
      if (!digits.length) { v13.toast('Le format des chiffres est invalide (exemple : 2 ou 2,3).', 'error'); return; }
      const payload = {
        id: (g && g.id) || null,
        code: f.code.trim(),
        name: f.name.trim(),
        category: f.category,
        digits_json: digits,
        separator: (f.separator || '').trim() || null,
        payout_x: Number(f.payout_x || 0),
        min_amount: Number(f.min_amount || 0),
        max_amount: f.max_amount === '' ? null : Number(f.max_amount),
        active: f.active === 'true',
        sort_order: Number(f.sort_order || 0),
      };
      try {
        await v13.rpc('jl13_rpc_save_game', { _p: payload });
        v13.bust('games');
        v13.toast('Jeu enregistré.', 'success');
        m.close();
        after && after();
      } catch (e) { v13.toast(e.message, 'error'); }
    });
  }

  LotriShell.register('games', {
    render: async host => {
      host.innerHTML = `<div class="card">
        <div class="card-hd"><h3>Jeu (Games)</h3>
          <div class="row" style="gap:.5rem">
            <input class="input" id="jl13-gq" placeholder="Recherche nom/code…" style="max-width:220px">
            <button class="btn btn-primary" id="jl13-gadd"><i class="fa-solid fa-plus"></i> Nouveau jeu</button>
          </div></div>
        <div id="jl13-glist"><div class="muted">Chajman…</div></div>
      </div>`;

      let rows = [];
      const paint = () => {
        const q = (host.querySelector('#jl13-gq').value || '').toLowerCase();
        const list = rows.filter(g => !q || (g.name || '').toLowerCase().includes(q) || (g.code || '').toLowerCase().includes(q));
        host.querySelector('#jl13-glist').innerHTML = !list.length
          ? '<div class="muted" style="padding:1rem">Aucun jeu.</div>'
          : `<div class="table-wrap"><table class="table">
          <thead><tr><th>Code</th><th>Nom</th><th>Kategori</th><th>Chiffres</th><th>Sep.</th>
            <th class="num">Paiement ×</th><th class="num">Min</th><th class="num">Max</th>
            <th>Statut</th><th>Action</th></tr></thead>
          <tbody>${list.map(g => `<tr>
            <td class="mono">${esc(g.code)}</td>
            <td>${esc(g.name)}</td>
            <td class="muted">${esc((CATS.find(c => c[0] === g.category) || [, g.category || '—'])[1])}</td>
            <td class="mono">${esc(digitsOf(g))}</td>
            <td class="mono">${esc(g.separator || '—')}</td>
            <td class="num">${v13.money(g.payout_x)}</td>
            <td class="num">${v13.money(g.min_amount)}</td>
            <td class="num">${g.max_amount == null ? '—' : v13.money(g.max_amount)}</td>
            <td><span class="badge ${g.active ? 'badge-success' : 'badge-danger'}">${g.active ? 'aktif' : 'dezaktive'}</span></td>
            <td class="row" style="gap:.35rem">
              <button class="btn btn-sm" data-edit="${g.id}"><i class="fa-solid fa-pen"></i> Modifier</button>
              <button class="btn btn-sm" data-toggle="${g.id}"><i class="fa-solid ${g.active ? 'fa-toggle-off' : 'fa-toggle-on'}"></i> ${g.active ? 'Désactiver' : 'Activer'}</button>
              <button class="btn btn-sm btn-danger" data-del="${esc(g.code)}" title="Modifier = Supprimer : retire définitivement le jeu"><i class="fa-solid fa-trash"></i></button>
            </td></tr>`).join('')}</tbody></table></div>`;
      };

      const load = async () => {
        const { data, error } = await SB().from('jl9_games').select('*').order('sort_order').order('name');
        if (error) { host.querySelector('#jl13-glist').innerHTML = `<div class="muted" style="padding:1rem">${esc(error.message)}</div>`; return; }
        rows = data || []; paint();
      };

      host.querySelector('#jl13-gq').addEventListener('input', paint);
      host.querySelector('#jl13-gadd').onclick = () => openForm(null, load);
      host.addEventListener('click', async e => {
        const ed = e.target.closest('[data-edit]');
        if (ed) { openForm(rows.find(g => String(g.id) === ed.dataset.edit), load); return; }
        const tg = e.target.closest('[data-toggle]');
        if (tg) {
          const g = rows.find(x => String(x.id) === tg.dataset.toggle);
          try {
            await v13.rpc('jl13_rpc_save_game', {
              _p: { id: g.id, code: g.code, name: g.name, category: g.category,
                    digits_json: digitsOf(g).split(',').map(Number),
                    separator: g.separator, payout_x: g.payout_x,
                    min_amount: g.min_amount, max_amount: g.max_amount,
                    active: !g.active, sort_order: g.sort_order },
            });
            v13.bust('games'); load();
          } catch (err) { v13.toast(err.message, 'error'); }
        }
        /* V17 §7 — "Modifier = Supprimer" pou Jeu: yon sèl bouton, retire nèt
           (oswa dezaktive si gen fich aktif ki lye, jan RPC la deside). */
        const del = e.target.closest('[data-del]');
        if (del) {
          const ok = await L.ui.confirm('Supprimer définitivement ce jeu ?', 'Cette action est irréversible s\'il n\'y a aucune fiche active liée.');
          if (!ok) return;
          try {
            await SB().rpc('jl17_rpc_delete_game', { _code: del.dataset.del });
            v13.toast('Jeu supprimé.', 'success');
            v13.bust('games'); load();
          } catch (err) { v13.toast(err.message, 'error'); }
        }
      });
      await load();
    },
  });

  /* ============ TIRAJ — san doublon rezilta ============ */
  LotriShell.register('draws', {
    render: async host => {
      host.innerHTML = `<div class="card">
        <div class="card-hd"><h3>Tirage</h3>
          <button class="btn btn-primary" id="jl13-dadd"><i class="fa-solid fa-plus"></i> Nouveau tirage</button></div>
        <div class="jl13-note"><i class="fa-solid fa-circle-info"></i>
          Antre rezilta yo fèt uniquement nan paj <b>Résultats des tirages</b> (logo + champs texte par tirage).</div>
        <div id="jl13-dlist"><div class="muted">Chajman…</div></div>
      </div>`;

      const load = async () => {
        const { data } = await SB().from('jl9_draws').select('*').order('created_at', { ascending: false }).limit(300);
        host.querySelector('#jl13-dlist').innerHTML = `<div class="table-wrap"><table class="table">
          <thead><tr><th>Nom</th><th>Jeu</th><th>Pwograme</th><th>Fermer</th><th>Statut</th><th>Résultats</th><th>Action</th></tr></thead>
          <tbody>${(data || []).map(d => `<tr>
            <td>${esc(d.name)}</td><td class="mono">${esc(d.game_code || '')}</td>
            <td class="muted">${v13.dt(d.scheduled)}</td>
            <td class="muted">${v13.dt(d.closes_at)}</td>
            <td><span class="badge ${d.status === 'open' ? 'badge-success' : d.status === 'closed' ? 'badge-warning' : ''}">${esc(d.status)}</span></td>
            <td class="mono">${esc(d.result || '—')}</td>
            <td class="row" style="gap:.35rem">
              ${d.status === 'open' ? `<button class="btn btn-sm" data-close-draw="${d.id}"><i class="fa-solid fa-lock"></i> Fermer</button>` : ''}
              <button class="btn btn-sm btn-danger" data-del-draw="${d.id}" title="Modifier = Supprimer : retire définitivement le tirage"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`).join('')}</tbody></table></div>`;
      };

      host.addEventListener('click', async e => {
        const c = e.target.closest('[data-close-draw]');
        if (c) { await SB().from('jl9_draws').update({ status: 'closed' }).eq('id', c.dataset.closeDraw); load(); }
        /* V17 §7 — "Modifier = Supprimer" pou Tiraj. */
        const dd = e.target.closest('[data-del-draw]');
        if (dd) {
          const ok = await L.ui.confirm('Supprimer définitivement ce tirage ?', 'Cette action est irréversible s\'il n\'y a aucune fiche active liée.');
          if (!ok) return;
          try {
            await SB().rpc('jl17_rpc_delete_draw', { _draw: dd.dataset.delDraw });
            v13.toast('Tirage supprimé.', 'success');
            load();
          } catch (err) { v13.toast(err.message, 'error'); }
        }
      });

      host.querySelector('#jl13-dadd').onclick = async () => {
        const games = await v13.games();
        const m = v13.modal(`<h3>Nouveau tirage</h3><form id="jl13-dform"><div class="form-grid">
          <div><label class="label">Nom *</label><input class="input" name="name" required></div>
          <div><label class="label">Jeu *</label><select class="input" name="game_code" required>
            ${games.map(g => `<option value="${esc(g.code)}">${esc(g.name)} (${esc(g.code)})</option>`).join('')}
          </select></div>
          <div><label class="label">Pwograme</label><input class="input" name="scheduled" type="datetime-local"></div>
          <div><label class="label">Fermer</label><input class="input" name="closes_at" type="datetime-local"></div>
        </div><div class="row" style="justify-content:flex-end;gap:.5rem;margin-top:1rem">
          <button type="button" class="btn btn-ghost" data-close>Annuler</button>
          <button class="btn btn-primary">Créer</button></div></form>`);
        m.el.querySelector('#jl13-dform').addEventListener('submit', async ev => {
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          if (d.scheduled) d.scheduled = new Date(d.scheduled).toISOString(); else delete d.scheduled;
          if (d.closes_at) d.closes_at = new Date(d.closes_at).toISOString(); else delete d.closes_at;
          const { error } = await SB().from('jl9_draws').insert(d);
          if (error) { v13.toast(error.message, 'error'); return; }
          m.close(); load();
        });
      };

      await load();
    },
  });
})();
