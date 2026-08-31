/* =====================================================================
 * JADSTACK LOTTO V17 §4 — MINI SUPER ADMIN (EMPLOYEUR)
 * ---------------------------------------------------------------------
 *  Vi Super Admin uniquement:
 *    employer-create        — kreye yon Employeur (menm UX ak kreye Agent)
 *    employer-list          — lis Employeurs
 *    employer-surveillance  — «machin»: koneksyon aktif / inactif
 *    employer-actions       — dènye 10 aksyon TOUT Employeur + lis pa moun
 *
 *  PÈMISYON EMPLOYEUR (whitelist strik, kòde nan aplikasyon an):
 *    ✅ rezilta tiraj · ✅ anile/efase fich (nenpòt konpayi)
 *    ✅ jwèt/tiraj/boul/limit · ✅ mesaj
 *    ❌ tout lòt bagay (faktirasyon, paj akèy, footer, plan & pri, kreye
 *       konpayi…) — sa rete Super Admin prensipal uniquement.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const SB = () => L.supabase;
  const esc = L.escapeHtml || (s => String(s ?? ''));

  const EMPLOYER_ALLOWED = [
    'Saisir/gérer les résultats de tirage (global)',
    'Annuler/supprimer des tickets pour n\'importe quelle compagnie',
    'Jeux · Tirages · Limites de boules · Boules bloquées',
    'Messages (même groupe que le Super Administrateur — règle fixe)'
  ];
  const EMPLOYER_DENIED = [
    'Facturation · Opérateurs de paiement · Plans & Tarifs',
    'Créer/modifier une compagnie',
    'Page d\'accueil · Pied de page · Configuration du système',
    'Backup · Historique sistèm'
  ];
  L.v17 = L.v17 || {};
  L.v17.employerScope = { allowed: EMPLOYER_ALLOWED, denied: EMPLOYER_DENIED };

  const rpc = async (n, a) => {
    const { data, error } = await SB().rpc(n, a || {});
    if (error) throw new Error(error.message);
    return data;
  };
  const dt = d => (d ? new Date(d).toLocaleString('fr-HT') : '—');

  /* ---------------- Créer yon Employeur ---------------- */
  window.LotriShell.register('employer-create', {
    render: async host => {
      host.innerHTML = `
        <div class="page-hd"><h2>Créer un employeur (administrateur délégué)</h2>
          <p class="muted">Menm modèl ak kreyasyon yon Agent : yon imèl ak yon modpas tanporè.
            Employeur a changer le mot de passe la lè li konekte sou <code>employeur.html</code>.</p></div>
        <div class="card"><div class="card-hd"><h3>Enfòmasyon</h3></div>
          <form id="f" class="jl-form-grid" style="padding:.4rem 0">
            <div><label class="label">Nom complet</label><input class="input" name="full_name" required></div>
            <div><label class="label">Téléphone</label><input class="input" name="phone" placeholder="+509 …"></div>
            <div><label class="label">E-mail</label><input class="input" name="email" type="email" required></div>
            <div><label class="label">Mot de passe temporaire</label><input class="input" name="password" type="password" minlength="6" required></div>
            <div style="grid-column:1/-1"><label class="row" style="gap:.5rem;align-items:center;font-weight:400">
              <input type="checkbox" name="send_mail" checked> Envoyer les informations de connexion par e-mail à l\'employeur</label></div>
            <div style="grid-column:1/-1" class="row" style="justify-content:flex-end">
              <button class="btn btn-primary"><i class="fa-solid fa-user-shield"></i> Créer un employeur a</button></div>
          </form></div>
        <div class="card"><div class="card-hd"><h3>Permissions fixes d\'un employeur</h3></div>
          <div style="padding:.2rem .2rem .8rem">
            <p class="muted" style="font-size:.85rem">Lis sa a fiks nan aplikasyon an — Super Admin
              ka <strong>li</strong> le voit mais n\'a aucun paramètre pour le modifier.</p>
            <ul>${EMPLOYER_ALLOWED.map(x => `<li>✅ ${esc(x)}</li>`).join('')}</ul>
            <ul>${EMPLOYER_DENIED.map(x => `<li style="opacity:.7">❌ ${esc(x)}</li>`).join('')}</ul>
          </div></div>`;

      host.querySelector('#f').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.target).entries());
        try {
          await L.createAccount({
            email: fd.email, password: fd.password,
            role: 'employer', full_name: fd.full_name, phone: fd.phone || null
          });
        } catch (error) { L.toast(error.message, 'error'); return; }
        if (fd.send_mail && L.mail && L.mail.post) {
          try { await L.mail.post({
            to: fd.email, subject: 'Votre compte Employeur JADSTACK LOTTO',
            fields: {
              'E-mail': fd.email, 'Mot de passe temporaire': fd.password,
              'Connectez-vous sur': (location.origin + '/employeur.html'),
              'Enstriksyon': 'Changez le mot de passe lors de votre première connexion.'
            }
          }); } catch (_) { }
        }
        try { await rpc('jl9_rpc_log_audit', {
          _action: 'employer_create', _target: fd.email, _meta: { full_name: fd.full_name },
          _summary: 'Employeur (Mini Super Administrateur) créé : ' + fd.full_name });
        } catch (_) { }
        L.toast('Employeur créé — il peut se connecter sur employeur.html', 'success');
        e.target.reset();
      });
    }
  });

  /* ---------------- Liste des employeurs ---------------- */
  async function employers() { return await rpc('jl17_rpc_employers') || []; }

  window.LotriShell.register('employer-list', {
    render: async host => {
      host.innerHTML = `<div class="page-hd"><h2>Employeurs</h2>
          <p class="muted">Cliquez sur un employeur pour voir toutes ses actions.</p></div>
        <div class="card"><div id="tbl"><div class="spinner"></div></div></div>
        <div class="card" id="detail" hidden></div>`;
      const list = await employers();
      host.querySelector('#tbl').innerHTML = list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Statut</th><th>Dènye koneksyon</th><th class="num">Action</th></tr></thead>
        <tbody>${list.map(e => `<tr class="jl13-click" data-e="${esc(e.id)}" data-n="${esc(e.full_name)}">
          <td><b>${esc(e.full_name)}</b></td><td>${esc(e.email || '—')}</td><td>${esc(e.phone || '—')}</td>
          <td><span class="badge ${e.online ? 'badge-success' : 'badge-muted'}">${e.online ? 'aktif' : 'inactif'}</span></td>
          <td class="muted">${dt(e.last_seen_at)}</td><td class="num">${e.actions_count}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">Aucun employeur pour le moment.</div>';

      host.querySelectorAll('[data-e]').forEach(tr => tr.onclick = async () => {
        const box = host.querySelector('#detail');
        box.hidden = false;
        box.innerHTML = `<div class="card-hd"><h3>Action — ${esc(tr.dataset.n)}</h3></div><div class="spinner"></div>`;
        const rows = await rpc('jl17_rpc_employer_actions', { _employer: tr.dataset.e, _limit: 200 });
        box.innerHTML = `<div class="card-hd"><h3>Action — ${esc(tr.dataset.n)}</h3></div>` + table(rows);
      });
    }
  });

  function table(rows) {
    return (rows || []).length ? `<div class="table-wrap"><table class="table">
      <thead><tr><th>Employeur</th><th>Action</th><th>Cible</th><th>Rezime</th><th>Date</th></tr></thead>
      <tbody>${rows.map(a => `<tr><td>${esc(a.actor_name)}</td>
        <td class="mono">${esc(String(a.action).replace('employer_action:', ''))}</td>
        <td class="mono muted">${esc(a.target || '—')}</td>
        <td>${esc(a.summary || '—')}</td>
        <td class="muted">${dt(a.created_at)}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">Aucune action enregistrée.</div>';
  }

  /* ---------------- Siveyans «machin» Employeur ---------------- */
  window.LotriShell.register('employer-surveillance', {
    render: async host => {
      host.innerHTML = `<div class="page-hd"><h2>Siveyans Employeur</h2>
        <p class="muted">Qui est connecté actuellement, et quelles actions ont été effectuées depuis l\'activation.</p></div>
        <div id="box"><div class="spinner"></div></div>`;
      const paint = async () => {
        const list = await employers();
        host.querySelector('#box').innerHTML = list.map(e => `
          <div class="card"><div class="card-hd">
            <h3>${esc(e.full_name)} <span class="badge ${e.online ? 'badge-success' : 'badge-muted'}">${e.online ? 'anliy' : 'òfline'}</span></h3>
            <span class="muted">Dernier signe vi: ${dt(e.last_seen_at)}</span></div>
            <div class="muted" style="padding:.2rem .2rem .6rem;font-size:.85rem">
              ${esc(e.email || '')} · ${e.actions_count} actions au total</div></div>`).join('')
          || '<div class="empty">Aucun employeur.</div>';
      };
      await paint();
      const iv = setInterval(() => paint().catch(() => { }), 60000);
      document.addEventListener('lotri:view', () => clearInterval(iv), { once: true });
    }
  });

  /* ---------------- Action: 2 nivo ---------------- */
  window.LotriShell.register('employer-actions', {
    render: async host => {
      host.innerHTML = `<div class="page-hd"><h2>Action Employeur</h2>
          <p class="muted">Niveau 1 : les 10 dernières actions de tous les employeurs. Niveau 2 : liste complète d\'un employeur.</p></div>
        <div class="card"><div class="card-hd"><h3>10 dernières actions (tous les employeurs)</h3></div>
          <div id="last"><div class="spinner"></div></div></div>
        <div class="card"><div class="card-hd"><h3>Par employeur</h3>
          <select class="select" id="who" style="max-width:260px"><option value="">— Choisir un employeur —</option></select></div>
          <div id="one"><div class="empty">Choisissez un employeur.</div></div></div>`;

      host.querySelector('#last').innerHTML = table(await rpc('jl17_rpc_employer_actions', { _employer: null, _limit: 10 }));
      const list = await employers();
      const sel = host.querySelector('#who');
      sel.innerHTML += list.map(e => `<option value="${esc(e.id)}">${esc(e.full_name)}</option>`).join('');
      sel.onchange = async () => {
        if (!sel.value) { host.querySelector('#one').innerHTML = '<div class="empty">Choisissez un employeur.</div>'; return; }
        host.querySelector('#one').innerHTML = '<div class="spinner"></div>';
        host.querySelector('#one').innerHTML = table(await rpc('jl17_rpc_employer_actions', { _employer: sel.value, _limit: 500 }));
      };
    }
  });
})();
