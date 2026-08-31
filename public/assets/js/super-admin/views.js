// Super Admin views — v3 (mesaj korije + nouvo modil)
(function(){
  /* PATI A.2 — li yon chan JSON san kraze. */
  function parseJsonField(id, label){
    const el = document.getElementById(id);
    const raw = (el && typeof el.value === 'string' ? el.value : '').trim();
    if (!raw) return [];
    try { return JSON.parse(raw); }
    catch(_){ throw new Error('Chan « ' + label + ' » n\'est pas un JSON valide — corrigez-le avant d\'enregistrer.'); }
  }
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  // ============ DASHBOARD ============
  LotriShell.register('dashboard', {
    render: async (host)=>{
      host.innerHTML = `
        <div class="bento">
          <div class="v73-welcome-banner span-6">
            <div class="v73-welcome-shapes" aria-hidden="true">
              <span class="shape shape--blue"></span>
              <span class="shape shape--red"></span>
              <span class="shape shape--green"></span>
              <span class="shape shape--ring"></span>
            </div>
            <div class="v73-welcome-content">
              <span class="v73-welcome-greeting" id="v78-greeting">Bonjour <span role="img" aria-label="hello">👋</span></span>
              <h2 class="v73-welcome-title">Bienvenue dans le Centre de Contrôle</h2>
              <p class="v73-welcome-desc">Suivez l\'activité de la plateforme en temps réel et gérez toutes les opérations facilement.</p>
            </div>
            <div class="v73-welcome-visual" aria-hidden="true">
              <i class="fa-solid fa-chart-pie"></i>
            </div>
          </div>
          <div id="stats-host" class="span-6"></div>

          <div class="card span-6 v72-card v72-quick">
            <div class="card-hd"><h3>Action Rapid</h3></div>
            <div class="v72-quick-grid">
              <button type="button" class="v72-qa v72-qa--1" data-go="draws">
                <span class="v72-qa-ico"><i class="fa-solid fa-plus"></i></span>
                <span class="v72-qa-txt"><strong>Créer Tirage</strong><small>Ouvrir un nouveau tirage</small></span>
              </button>
              <button type="button" class="v72-qa v72-qa--2" data-go="draws">
                <span class="v72-qa-ico"><i class="fa-solid fa-dice"></i></span>
                <span class="v72-qa-txt"><strong>Voir tous les tirages</strong><small>Gérer le calendrier</small></span>
              </button>
              <button type="button" class="v72-qa v72-qa--3" data-go="reports">
                <span class="v72-qa-ico"><i class="fa-solid fa-chart-column"></i></span>
                <span class="v72-qa-txt"><strong>Rapport</strong><small>Ventes et performances</small></span>
              </button>
              <button type="button" class="v72-qa v72-qa--4" data-go="rezilta">
                <span class="v72-qa-ico"><i class="fa-solid fa-trophy"></i></span>
                <span class="v72-qa-txt"><strong>Résultats Tirage</strong><small>Saisir / voir les résultats</small></span>
              </button>
            </div>
          </div>

          <div class="card span-6 v72-card v72-closing">
            <div class="card-hd">
              <h3>Tirage ap fermer</h3>
              <span class="v72-hd-hint">Temps restant</span>
            </div>
            <div id="draws" class="v72-draws"></div>
          </div>
        </div>`;
      const greetEl = host.querySelector('#v78-greeting'); if (greetEl) greetEl.firstChild.textContent = new Date().getHours() < 14 ? 'Bonjour ' : 'Bonsoir ';
      await LotriStats.render(document.getElementById('stats-host'), [
        {key:'companies', label:'Compagnie'},
        {key:'agents', label:'Agent'},
        {key:'supervisors', label:'Sipèvisè'},
        {key:'tickets_sold', label:'Tickets vendus'},
        {key:'winners', label:'Gagnant'},
        {key:'sales_total', label:'Ventes totales'}
      ]);
      host.querySelectorAll('.v72-qa[data-go]').forEach(b=>{
        b.addEventListener('click', ()=>{
          const key = b.getAttribute('data-go');
          if (window.LotriShell && LotriShell.get && LotriShell.get(key)) LotriShell.go(key);
          else if (window.LotriShell) LotriShell.go('draws');
        });
      });
      const { data:dr } = await SB().from('jl24_draws_today').select('name,opens_at,closes_at,status,game_code,sales_open,sort_order').eq('sales_open', true).order('sort_order').limit(8);
      document.getElementById('draws').innerHTML = (dr||[]).length
        ? (dr.map(d=>`<div class="v72-draw-row">
            <span class="v72-draw-main">
              <span class="v72-draw-dot" aria-hidden="true"></span>
              <span class="v72-draw-name">${esc(d.name)}</span>
              ${d.game_code?`<span class="v72-draw-chip">${esc(d.game_code)}</span>`:''}
            </span>
            <span class="v72-draw-time">${d.closes_at?('Fermeture '+new Date(d.closes_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})):'—'}</span>
          </div>`).join(''))
        : '<div class="empty"><i class="fa-solid fa-dice"></i>Aucun tirage ouvert.</div>';
    }
  });

  // ============ KONPAYI ============
  LotriShell.register('companies', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Compagnie</h3>
        <button class="btn btn-primary" id="new-company"><i class="fa-solid fa-plus"></i> Nouvo Compagnie</button></div>
        <div id="list"></div></div>`;
      const load = async ()=>{
        const { data, error } = await SB().from('jl9_companies').select('*').order('created_at',{ascending:false});
        if (error) { document.getElementById('list').innerHTML = '<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>'+esc(error.message)+'</div>'; return; }
        if (!data.length) { document.getElementById('list').innerHTML = '<div class="empty"><i class="fa-solid fa-building"></i>Aucune compagnie pour le moment.</div>'; return; }
        const plans = window.Lotri.companyPlans ? await window.Lotri.companyPlans() : {};
        const planOf = (id)=> (plans[id] && plans[id].plan_name) ? ' ('+plans[id].plan_name+')' : '';
        document.getElementById('list').innerHTML = `<div class="table-wrap"><table class="table">
          <thead><tr><th>Nom</th><th>E-mail</th><th>Forfait</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>${data.map(c=>`<tr data-company-detail="${c.id}" title="Cliquez pour voir les détails">
            <td><strong>${esc(c.name)}${esc(planOf(c.id))}</strong><div class="muted" style="font-size:.78rem">${esc(c.slug||'')}</div></td>
            <td>${esc(c.email||'—')}</td><td><span class="chip">${esc(c.plan||'—')}</span></td>
            <td><span class="badge ${c.status==='active'?'badge-success':'badge-danger'}">${esc(c.status)}</span></td>
            <td class="row">
              <button class="btn btn-sm" data-act="account" data-id="${c.id}" data-name="${esc(c.name)}"><i class="fa-solid fa-user-plus"></i> Créer Compte</button>
              <button class="btn btn-sm" data-act="reset-pw" data-id="${c.id}" data-name="${esc(c.name)}"><i class="fa-solid fa-key"></i> Réinitialiser le mot de passe</button>
              <button class="btn btn-sm" data-act="toggle" data-id="${c.id}" data-status="${c.status}"><i class="fa-solid ${c.status==='active'?'fa-lock':'fa-lock-open'}"></i> ${c.status==='active'?'Bloqué':'Activer'}</button>
              <button class="btn btn-sm btn-icon btn-danger" data-act="delete" data-id="${c.id}" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
            </td></tr>`).join('')}</tbody></table></div>`;
      };
      document.getElementById('new-company').addEventListener('click', ()=> openCompanyModal(load));
      host.addEventListener('click', async (e)=>{
        const btn = e.target.closest('button[data-act]'); if (!btn) return;
        const id = btn.dataset.id;
        if (btn.dataset.act === 'toggle') {
          const next = btn.dataset.status === 'active' ? 'blocked' : 'active';
          await SB().from('jl9_companies').update({status:next}).eq('id', id); await load();
        } else if (btn.dataset.act === 'delete') {
          if (!confirm('Supprimer cette compagnie ?')) return;
          const { error } = await SB().from('jl9_companies').delete().eq('id', id);
          if (error) window.Lotri.toast(error.message,'error'); await load();
        } else if (btn.dataset.act === 'account') {
          openAccountModal({ role:'company', company_id: id, name: btn.dataset.name });
        } else if (btn.dataset.act === 'reset-pw') {
          // Rechercher imèl(yo) kont ki lye ak konpayi sa a (role='company')
          // pou voye yo yon lyen "changer le mot de passe" — pa gen fason SQL/kle
          // sèvis pou "reset" yon modpas dirèkteman san moun nan patisipe;
          // sa a se sèl fason ki an sekirite (Auth GoTrue jere l).
          const { data: profs } = await SB().from('jl9_profiles')
            .select('email').eq('company_id', id).eq('role', 'company');
          if (!profs || !profs.length) {
            window.Lotri.toast('Aucun compte de connexion n\'existe encore pour cette compagnie.', 'error');
            return;
          }
          if (!confirm('Envoyer un e-mail "changer le mot de passe" bay ' + profs.length + ' compte (' + btn.dataset.name + ')?')) return;
          for (const pr of profs) {
            await window.Lotri.supabase.auth.resetPasswordForEmail(pr.email, { redirectTo: location.origin + '/auth.html' });
          }
          window.Lotri.toast('E-mail "changer le mot de passe" voye.', 'success');
        }
      });
      await load();
    }
  });

  function openCompanyModal(refresh){
    const m = document.createElement('div');
    m.className='modal-backdrop';
    m.innerHTML = `<div class="modal"><h3>Nouvo Compagnie</h3>
      <form id="f">
        <div class="form-grid">
          <div><label class="label">Nom</label><input class="input" name="name" required></div>
          <div><label class="label">E-mail</label><input class="input" name="email" type="email"></div>
          <div><label class="label">Téléphone</label><input class="input" name="phone"></div>
          <div><label class="label">Deuxième e-mail</label><input class="input" name="email_2" type="email"></div>
          <div><label class="label">Pays</label><input class="input" name="country" value="Ayiti"></div>
          <div><label class="label">Département</label><input class="input" name="department"></div>
          <div><label class="label">Forfait</label><select class="select" name="plan"><option>basic</option><option>pro</option><option>enterprise</option></select></div>
          <div><label class="label">Limite Agent</label><input class="input" name="agent_limit" type="number" value="50"></div>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:1rem;">
          <button type="button" class="btn btn-ghost" id="cancel">Annuler</button>
          <button class="btn btn-primary">Créer</button>
        </div></form></div>`;
    document.body.appendChild(m);
    m.querySelector('#cancel').onclick = ()=> m.remove();
    m.querySelector('#f').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const p = Object.fromEntries(new FormData(e.target).entries());
      p.agent_limit = Number(p.agent_limit);
      p.slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40);
      const { error } = await SB().from('jl9_companies').insert(p);
      if (error) { window.Lotri.toast(error.message,'error'); return; }
      window.Lotri.toast('Compagnie créée','success');
      m.remove(); refresh();
    });
  }

  function openAccountModal({ role, company_id, agent_id, name }){
    const m = document.createElement('div');
    m.className='modal-backdrop';
    m.innerHTML = `<div class="modal"><h3>Créer kont ${esc(role)} — ${esc(name||'')}</h3>
      <form id="f">
        <div class="form-row"><label class="label">E-mail</label><input class="input" name="email" type="email" required></div>
        <div class="form-row"><label class="label">Mot de passe</label><input class="input" name="password" type="password" minlength="6" required></div>
        <div class="form-row"><label class="label">Nom complet</label><input class="input" name="full_name" required></div>
        <div class="form-row"><label class="row" style="gap:.5rem;align-items:center;font-weight:400">
          <input type="checkbox" name="send_mail" checked> Envoyer les informations de connexion par e-mail</label></div>
        <div class="row" style="justify-content:flex-end;">
          <button type="button" class="btn btn-ghost" id="cancel">Annuler</button>
          <button class="btn btn-primary">Créer</button>
        </div></form></div>`;
    document.body.appendChild(m);
    m.querySelector('#cancel').onclick = ()=> m.remove();
    m.querySelector('#f').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target).entries());
      const payload = { email: fd.email, password: fd.password, role, full_name: fd.full_name };
      if (company_id) payload.company_id = company_id;
      if (agent_id) payload.agent_id = agent_id;
      try {
        await window.Lotri.createAccount(payload);
      } catch (error) { window.Lotri.toast(error.message,'error'); return; }
      if (fd.send_mail && window.Lotri.mail && window.Lotri.mail.post) {
        try { await window.Lotri.mail.post({
          to: fd.email, subject: 'Compte ' + role + ' votre JADSTACK LOTTO',
          fields: {
            'E-mail': fd.email, 'Mot de passe temporaire': fd.password,
            'Rôle': role,
            'Enstriksyon': 'Changez le mot de passe lors de votre première connexion.'
          }
        }); } catch (_) { }
      }
      window.Lotri.toast('Compte créé','success');
      m.remove();
    });
  }
  window._openAccountModal = openAccountModal;

  // ============ JWÈT ============
  LotriShell.register('games', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Jeu (Games)</h3>
        <button class="btn btn-primary" id="add"><i class="fa-solid fa-plus"></i> Nouvo Jeu</button></div><div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_games').select('*').order('name');
        document.getElementById('list').innerHTML = `<div class="table-wrap"><table class="table">
          <thead><tr><th>Code</th><th>Nom</th><th class="num">Paiement x</th><th>Actif</th><th>Action</th></tr></thead>
          <tbody>${(data||[]).map(g=>`<tr>
            <td class="mono">${esc(g.code)}</td><td>${esc(g.name)}</td><td class="num">${g.payout_x}</td>
            <td><span class="badge ${g.active?'badge-success':'badge-danger'}">${g.active?'wi':'non'}</span></td>
            <td><button class="btn btn-sm" data-toggle="${g.id}" data-active="${g.active}"><i class="fa-solid ${g.active?'fa-toggle-off':'fa-toggle-on'}"></i> ${g.active?'Désactiver':'Activer'}</button></td>
          </tr>`).join('')}</tbody></table></div>`;
      };
      host.addEventListener('click', async (e)=>{
        const t = e.target.closest('[data-toggle]');
        if (t) { await SB().from('jl9_games').update({active: t.dataset.active !== 'true'}).eq('id', t.dataset.toggle); load(); }
      });
      document.getElementById('add').onclick = ()=>{
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvo Jeu</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Code</label><input class="input" name="code" required></div>
            <div><label class="label">Nom</label><input class="input" name="name" required></div>
            <div><label class="label">Paiement x</label><input class="input" name="payout_x" type="number" step="0.01" value="60"></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:1rem">
            <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button>
          </div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick=()=> m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          d.payout_x = Number(d.payout_x);
          const { error } = await SB().from('jl9_games').insert(d);
          if (error) window.Lotri.toast(error.message,'error');
          m.remove(); load();
        };
      };
      await load();
    }
  });

  // ============ TIRAJ ============
  LotriShell.register('draws', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Tirage</h3>
        <button class="btn btn-primary" id="add"><i class="fa-solid fa-plus"></i> Nouvo Tirage</button></div><div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_draws').select('*').order('created_at',{ascending:false});
        document.getElementById('list').innerHTML = `<div class="table-wrap"><table class="table">
          <thead><tr><th>Nom</th><th>Jeu</th><th>Pwograme</th><th>Fermer</th><th>Statut</th><th>Résultats</th><th>Action</th></tr></thead>
          <tbody>${(data||[]).map(d=>`<tr>
            <td>${esc(d.name)}</td><td class="mono">${esc(d.game_code||'')}</td>
            <td class="muted">${d.scheduled?new Date(d.scheduled).toLocaleString():'—'}</td>
            <td class="muted">${d.closes_at?new Date(d.closes_at).toLocaleString():'—'}</td>
            <td><span class="badge ${d.status==='open'?'badge-success':d.status==='closed'?'badge-warning':d.status==='settled'?'':''}">${esc(d.status)}</span></td>
            <td class="mono">${d.result && d.result.numbers ? esc(d.result.numbers.join(' · ')) : '—'}</td>
            <td class="row">
              ${d.status==='open'?`<button class="btn btn-sm" data-close="${d.id}"><i class="fa-solid fa-lock"></i> Fermer</button>`:''}
              ${d.status!=='settled'?`<button class="btn btn-sm btn-primary" data-settle="${d.id}"><i class="fa-solid fa-flag-checkered"></i> Régler le paiement</button>`:''}
            </td></tr>`).join('')}</tbody></table></div>`;
      };
      host.addEventListener('click', async (e)=>{
        const c = e.target.closest('[data-close]');
        if (c) { await SB().from('jl9_draws').update({status:'closed'}).eq('id', c.dataset.close); load(); return; }
        const s = e.target.closest('[data-settle]');
        if (s) {
          /* V47 — Résultats a antre nan paj "Résultats" (jl11_draw_results), pa
             isit la ak yon "prompt" tèks. Bouton sa a SÈLMAN regle peman
             fich yo (gayan/pèdi + kantite à payer) apati rezilta ki deja
             antre a. Ansyen apèl la te voye yon paramèt "_result" ki pa
             egziste ankò nan fonksyon backend lan — RPC a te toujou echwe
             san okenn fich pa t janm regle. */
          const ok = await window.Lotri.ui.confirm(
            'Régler le paiement du tirage',
            'Ceci calculera les gagnants/perdants et le montant à payer pour TOUS les tickets actifs de ce tirage, selon le résultat déjà saisi. Cette action est irréversible.'
          );
          if (!ok) return;
          const { data, error } = await SB().rpc('jl9_rpc_settle_draw', { _draw: s.dataset.settle });
          if (error) window.Lotri.toast(error.message,'error');
          else window.Lotri.toast(`${data.settled} tickets réglés — ${data.winners} gagnants`,'success');
          load();
        }
      });
      document.getElementById('add').onclick = ()=>{
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvo Tirage</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Nom</label><input class="input" name="name" required></div>
            <div><label class="label">Code jeu</label><input class="input" name="game_code" required></div>
            <div><label class="label">Pwograme</label><input class="input" name="scheduled" type="datetime-local"></div>
            <div><label class="label">Fermer (closes_at)</label><input class="input" name="closes_at" type="datetime-local"></div>
          </div><div class="row" style="justify-content:flex-end;margin-top:1rem">
          <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button></div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick = ()=> m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          if (d.scheduled) d.scheduled = new Date(d.scheduled).toISOString(); else delete d.scheduled;
          if (d.closes_at) d.closes_at = new Date(d.closes_at).toISOString(); else delete d.closes_at;
          const { error } = await SB().from('jl9_draws').insert(d);
          if (error) window.Lotri.toast(error.message,'error');
          m.remove(); load();
        };
      };
      await load();
    }
  });

  // ============ SIPÈVISÈ ============
  LotriShell.register('supervisors', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Sipèvisè</h3>
        <button class="btn btn-primary" id="add"><i class="fa-solid fa-plus"></i> Nouvo Sipèvisè</button></div><div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_supervisors').select('*, companies:jl9_companies(name)').order('created_at',{ascending:false});
        document.getElementById('list').innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nom</th><th>Compagnie</th><th>Téléphone</th><th>Statut</th><th></th></tr></thead><tbody>
             ${data.map(s=>`<tr><td>${esc(s.full_name)}</td><td>${esc(s.companies?.name||'—')}</td>
             <td>${esc(s.phone||'')}</td>
             <td><span class="badge ${s.status==='active'?'badge-success':'badge-danger'}">${esc(s.status)}</span></td>
             <td><button class="btn btn-sm btn-icon btn-danger" data-del="${s.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
             </tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-user-tie"></i>Aucun superviseur pour le moment.</div>';
      };
      host.addEventListener('click', async(e)=>{
        const d = e.target.closest('[data-del]');
        if (d && confirm('Supprimer ?')) { await SB().from('jl9_supervisors').delete().eq('id', d.dataset.del); load(); }
      });
      document.getElementById('add').onclick = async ()=>{
        const { data: comps } = await SB().from('jl9_companies').select('id,name').order('name');
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvo Sipèvisè</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Nom complet</label><input class="input" name="full_name" required></div>
            <div><label class="label">Compagnie</label><select class="select" name="company_id" required>
              ${(comps||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
            <div><label class="label">Téléphone</label><input class="input" name="phone"></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:1rem">
            <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button>
          </div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick=()=>m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          const { error } = await SB().from('jl9_supervisors').insert(d);
          if (error) window.Lotri.toast(error.message,'error');
          m.remove(); load();
        };
      };
      await load();
    }
  });

  // ============ SUCCURSALE (BRANCHES) ============
  LotriShell.register('branches', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Succursale (Branch)</h3>
        <button class="btn btn-primary" id="add"><i class="fa-solid fa-plus"></i> Nouvo Branch</button></div><div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_branches').select('*, companies:jl9_companies(name)').order('created_at',{ascending:false});
        document.getElementById('list').innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nom</th><th>Code</th><th>Compagnie</th><th>Adresse</th><th>Mariage gratis</th><th></th></tr></thead><tbody>
             ${data.map(b=>`<tr><td><strong>${esc(b.name)}</strong></td><td class="mono">${esc(b.code||'')}</td>
             <td>${esc(b.companies?.name||'—')}</td><td class="muted">${esc(b.address||'')}</td>
             <td>${b.free_marriage?'<span class="badge badge-accent">ON</span>':'—'}</td>
             <td><button class="btn btn-sm btn-icon btn-danger" data-del="${b.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
             </tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-shop"></i>Aucune succursale pour le moment.</div>';
      };
      host.addEventListener('click', async(e)=>{
        const d = e.target.closest('[data-del]');
        if (d && confirm('Supprimer ?')) { await SB().from('jl9_branches').delete().eq('id', d.dataset.del); load(); }
      });
      document.getElementById('add').onclick = async ()=>{
        const { data: comps } = await SB().from('jl9_companies').select('id,name').order('name');
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvo Branch</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Nom</label><input class="input" name="name" required></div>
            <div><label class="label">Code</label><input class="input" name="code"></div>
            <div><label class="label">Compagnie</label><select class="select" name="company_id" required>
              ${(comps||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
            <div><label class="label">Adresse</label><input class="input" name="address"></div>
            <div><label class="label">Téléphone</label><input class="input" name="phone"></div>
            <div><label class="label">Mariage gratis</label><label class="switch"><input type="checkbox" name="free_marriage"><span class="track"></span></label></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:1rem">
            <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button>
          </div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick=()=>m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const fd = new FormData(ev.target);
          const d = Object.fromEntries(fd.entries());
          d.free_marriage = fd.get('free_marriage') === 'on';
          const { error } = await SB().from('jl9_branches').insert(d);
          if (error) window.Lotri.toast(error.message,'error');
          m.remove(); load();
        };
      };
      await load();
    }
  });

  // ============ PRIME (jeneral/agent/branch/tirage) ============
  LotriShell.register('primes', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Configuration des primes (paiement x)</h3>
        <button class="btn btn-primary" id="add"><i class="fa-solid fa-plus"></i> Nouvo règ</button></div>
        <p class="muted">Règles prioritaires <code>games.payout_x</code>. Preferans: Tirage → Agent → Branch → Jeneral → default.</p>
        <div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_prime_rules').select('*, companies:jl9_companies(name), agents:jl9_agents(full_name), branches:jl9_branches(name), draws:jl9_draws(name)').order('created_at',{ascending:false});
        document.getElementById('list').innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Scope</th><th>Jeu</th><th class="num">Payout x</th><th>Compagnie</th><th>Cible</th><th></th></tr></thead><tbody>
             ${data.map(p=>`<tr><td><span class="chip">${esc(p.scope)}</span></td>
             <td class="mono">${esc(p.game_code)}</td>
             <td class="num">${Number(p.payout_x).toFixed(2)}</td>
             <td>${esc(p.companies?.name||'—')}</td>
             <td class="muted">${esc(p.agents?.full_name || p.branches?.name || p.draws?.name || '—')}</td>
             <td><button class="btn btn-sm btn-icon btn-danger" data-del="${p.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
             </tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-percent"></i>Aucune règle de prime.</div>';
      };
      host.addEventListener('click', async(e)=>{
        const d = e.target.closest('[data-del]');
        if (d && confirm('Supprimer ?')) { await SB().from('jl9_prime_rules').delete().eq('id', d.dataset.del); load(); }
      });
      document.getElementById('add').onclick = async ()=>{
        const [{data:comps},{data:games},{data:agents},{data:branches},{data:draws}] = await Promise.all([
          SB().from('jl9_companies').select('id,name').order('name'),
          SB().from('jl9_games').select('code,name').order('name'),
          SB().from('jl9_agents').select('id,full_name').order('full_name'),
          SB().from('jl9_branches').select('id,name').order('name'),
          SB().from('jl9_draws').select('id,name').order('name'),
        ]);
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvelle règle de prime</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Scope</label><select class="select" name="scope">
              <option value="general">Jeneral</option><option value="agent">Agent</option>
              <option value="branch">Branch</option><option value="tirage">Tirage</option></select></div>
            <div><label class="label">Compagnie</label><select class="select" name="company_id">
              <option value="">— tous —</option>${(comps||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
            <div><label class="label">Jeu (code)</label><select class="select" name="game_code" required>
              ${(games||[]).map(g=>`<option value="${g.code}">${esc(g.code)} — ${esc(g.name)}</option>`).join('')}</select></div>
            <div><label class="label">Payout x</label><input class="input" name="payout_x" type="number" step="0.01" required></div>
            <div><label class="label">Agent (si scope=agent)</label><select class="select" name="agent_id"><option value="">—</option>${(agents||[]).map(a=>`<option value="${a.id}">${esc(a.full_name)}</option>`).join('')}</select></div>
            <div><label class="label">Branch (si scope=branch)</label><select class="select" name="branch_id"><option value="">—</option>${(branches||[]).map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></div>
            <div><label class="label">Tirage (si scope=tirage)</label><select class="select" name="draw_id"><option value="">—</option>${(draws||[]).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:1rem">
            <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button></div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick=()=>m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          d.payout_x = Number(d.payout_x);
          for (const k of ['company_id','agent_id','branch_id','draw_id']) if (!d[k]) delete d[k];
          const { error } = await SB().from('jl9_prime_rules').insert(d);
          if (error) window.Lotri.toast(error.message,'error');
          m.remove(); load();
        };
      };
      await load();
    }
  });

  // ============ LIMIT (RISK LIMITS) ============
  LotriShell.register('limits', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Limite Risk</h3>
        <button class="btn btn-primary" id="add"><i class="fa-solid fa-plus"></i> Nouvo limit</button></div>
        <p class="muted">Appliquer reyèlman anndan <code>rpc_create_ticket</code> — les paris qui dépassent sont rejetés.</p>
        <div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_risk_limits').select('*, companies:jl9_companies(name), agents:jl9_agents(full_name)').order('created_at',{ascending:false});
        document.getElementById('list').innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Scope</th><th>Compagnie</th><th>Jeu</th><th>Numéro</th><th>Agent</th><th class="num">Max</th><th></th></tr></thead><tbody>
             ${data.map(l=>`<tr><td><span class="chip">${esc(l.scope)}</span></td>
             <td>${esc(l.companies?.name||'—')}</td><td class="mono">${esc(l.game_code||'—')}</td>
             <td class="mono">${esc(l.bet_number||'—')}</td><td>${esc(l.agents?.full_name||'—')}</td>
             <td class="num">${Number(l.max_amount).toFixed(2)} HTG</td>
             <td><button class="btn btn-sm btn-icon btn-danger" data-del="${l.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
             </tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-shield-halved"></i>Aucune limite.</div>';
      };
      host.addEventListener('click', async(e)=>{
        const d = e.target.closest('[data-del]');
        if (d && confirm('Supprimer ?')) { await SB().from('jl9_risk_limits').delete().eq('id', d.dataset.del); load(); }
      });
      document.getElementById('add').onclick = async ()=>{
        const [{data:comps},{data:games},{data:agents}] = await Promise.all([
          SB().from('jl9_companies').select('id,name').order('name'),
          SB().from('jl9_games').select('code').order('code'),
          SB().from('jl9_agents').select('id,full_name').order('full_name'),
        ]);
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvo Limite</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Scope</label><select class="select" name="scope">
              <option value="game">Jeu (jeneral)</option><option value="number">Boule (jeneral)</option>
              <option value="agent_game">Jeux par agent</option><option value="agent_number">Boules par agent</option>
              <option value="fiche">Tickets (total)</option></select></div>
            <div><label class="label">Compagnie</label><select class="select" name="company_id">
              ${(comps||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
            <div><label class="label">Jeu</label><select class="select" name="game_code"><option value="">—</option>${(games||[]).map(g=>`<option>${esc(g.code)}</option>`).join('')}</select></div>
            <div><label class="label">Numéro (si scope=number)</label><input class="input mono" name="bet_number"></div>
            <div><label class="label">Agent (si scope=agent_*)</label><select class="select" name="agent_id"><option value="">—</option>${(agents||[]).map(a=>`<option value="${a.id}">${esc(a.full_name)}</option>`).join('')}</select></div>
            <div><label class="label">Montant maximum</label><input class="input" name="max_amount" type="number" step="0.01" required></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:1rem">
            <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button></div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick=()=>m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          d.max_amount = Number(d.max_amount);
          for (const k of ['game_code','bet_number','agent_id']) if (!d[k]) delete d[k];
          const { error } = await SB().from('jl9_risk_limits').insert(d);
          if (error) window.Lotri.toast(error.message,'error');
          m.remove(); load();
        };
      };
      await load();
    }
  });

  // ============ BLOCAGE BOULE ============
  LotriShell.register('blocked', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Blocage Boule</h3>
        <button class="btn btn-primary" id="add"><i class="fa-solid fa-plus"></i> Bloquer une boule</button></div>
        <div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_blocked_numbers').select('*, companies:jl9_companies(name), draws:jl9_draws(name)').order('created_at',{ascending:false});
        document.getElementById('list').innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Compagnie</th><th>Jeu</th><th>Numéro</th><th>Tirage</th><th>Rezon</th><th></th></tr></thead><tbody>
             ${data.map(b=>`<tr><td>${esc(b.companies?.name||'—')}</td><td class="mono">${esc(b.game_code||'—')}</td>
             <td class="mono"><strong>${esc(b.number)}</strong></td><td>${esc(b.draws?.name||'tout')}</td>
             <td class="muted">${esc(b.reason||'')}</td>
             <td><button class="btn btn-sm btn-icon btn-danger" data-del="${b.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
             </tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-ban"></i>Aucune boule bloquée.</div>';
      };
      host.addEventListener('click', async(e)=>{
        const d = e.target.closest('[data-del]');
        if (d && confirm('Supprimer ?')) { await SB().from('jl9_blocked_numbers').delete().eq('id', d.dataset.del); load(); }
      });
      document.getElementById('add').onclick = async ()=>{
        const [{data:comps},{data:games},{data:draws}] = await Promise.all([
          SB().from('jl9_companies').select('id,name').order('name'),
          SB().from('jl9_games').select('code').order('code'),
          SB().from('jl9_draws').select('id,name').eq('status','open').order('name'),
        ]);
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Bloquer une boule</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Compagnie</label><select class="select" name="company_id" required>
              ${(comps||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
            <div><label class="label">Jeu (opsyonèl)</label><select class="select" name="game_code"><option value="">—</option>${(games||[]).map(g=>`<option>${esc(g.code)}</option>`).join('')}</select></div>
            <div><label class="label">Tirage (opsyonèl)</label><select class="select" name="draw_id"><option value="">tout</option>${(draws||[]).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div>
            <div><label class="label">Numéro</label><input class="input mono" name="number" required></div>
          </div>
          <div class="form-row"><label class="label">Rezon</label><input class="input" name="reason"></div>
          <div class="row" style="justify-content:flex-end;margin-top:1rem">
            <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Bloqué</button></div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick=()=>m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          for (const k of ['game_code','draw_id','reason']) if (!d[k]) delete d[k];
          const { error } = await SB().from('jl9_blocked_numbers').insert(d);
          if (error) window.Lotri.toast(error.message,'error');
          m.remove(); load();
        };
      };
      await load();
    }
  });

  // ============ GENERATE X AGENTS ============
  LotriShell.register('bulk-agents', {
    render: async (host)=>{
      const { data: comps } = await SB().from('jl9_companies').select('id,name').order('name');
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Generer X Agent</h3></div>
        <p class="muted">Créer en masse plusieurs agents pour une compagnie. (Les comptes de connexion sont créés individuellement ensuite.)</p>
        <form id="f" class="form-grid">
          <div><label class="label">Compagnie</label><select class="select" name="company_id" required>
            ${(comps||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
          <div><label class="label">Quantité</label><input class="input" name="count" type="number" min="1" max="500" value="10" required></div>
        </form>
        <div class="row" style="margin-top:1rem;justify-content:flex-end;">
          <button class="btn btn-primary" id="go"><i class="fa-solid fa-wand-magic-sparkles"></i> Jenere</button>
        </div></div>`;
      document.getElementById('go').onclick = async ()=>{
        const fd = Object.fromEntries(new FormData(document.getElementById('f')).entries());
        const { data, error } = await SB().rpc('jl9_rpc_bulk_create_agents', {
          _company: fd.company_id, _count: Number(fd.count)
        });
        if (error) window.Lotri.toast(error.message,'error');
        else {
          window.Lotri.toast(data+' agents créés','success');
          /* V27 FAZ 4 — menm popup pataje a (SA ka kopye lyen an) */
          if (window.Lotri.apk) window.Lotri.apk.openModal({
            canCopy: true,
            intro: data + ' agents créés. Application POS pour les agents :'
          });
        }
      };
      /* V27 FAZ 4 — bouton anba paj ki gen rapò ak ajan yo */
      if (window.Lotri.apk) await window.Lotri.apk.mountButton(host);
    }
  });

  // ============ FAKTIRASYON ============
  LotriShell.register('invoices', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Faktirasyon</h3>
        <button class="btn btn-primary" id="add"><i class="fa-solid fa-plus"></i> Nouvo Facture</button></div><div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_invoices').select('*, companies:jl9_companies(name)').order('created_at',{ascending:false});
        document.getElementById('list').innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Numéro</th><th>Compagnie</th><th class="num">Montant</th><th>Période</th><th>Statut</th><th>Due</th><th></th></tr></thead><tbody>
             ${data.map(i=>`<tr><td class="mono">${esc(i.number)}</td><td>${esc(i.companies?.name||'—')}</td>
             <td class="num">${Number(i.amount).toFixed(2)} HTG</td>
             <td class="muted">${esc(i.period_start||'')} → ${esc(i.period_end||'')}</td>
             <td><span class="badge ${i.status==='paid'?'badge-success':i.status==='overdue'?'badge-danger':i.status==='cancelled'?'':'badge-warning'}">${esc(i.status)}</span></td>
             <td class="muted">${esc(i.due_date||'')}</td>
             <td><button class="btn btn-sm btn-icon btn-danger" data-del="${i.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
             </tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-file-invoice-dollar"></i>Aucune facture.</div>';
      };
      host.addEventListener('click', async(e)=>{
        const d = e.target.closest('[data-del]');
        if (d && confirm('Supprimer ?')) { await SB().from('jl9_invoices').delete().eq('id', d.dataset.del); load(); }
      });
      document.getElementById('add').onclick = async ()=>{
        const { data: comps } = await SB().from('jl9_companies').select('id,name').order('name');
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvo Facture</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Numéro</label><input class="input mono" name="number" value="INV-${Date.now().toString().slice(-6)}" required></div>
            <div><label class="label">Compagnie</label><select class="select" name="company_id" required>
              ${(comps||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
            <div><label class="label">Montant</label><input class="input" name="amount" type="number" step="0.01" required></div>
            <div><label class="label">Due</label><input class="input" name="due_date" type="date"></div>
            <div><label class="label">Période (debi)</label><input class="input" name="period_start" type="date"></div>
            <div><label class="label">Période (fen)</label><input class="input" name="period_end" type="date"></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:1rem">
            <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button></div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick=()=>m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          d.amount = Number(d.amount);
          for (const k of ['due_date','period_start','period_end']) if (!d[k]) delete d[k];
          const { error } = await SB().from('jl9_invoices').insert(d);
          if (error) window.Lotri.toast(error.message,'error');
          m.remove(); load();
        };
      };
      await load();
    }
  });

  // ============ STATISTIK ============
  LotriShell.register('stats', {
    render: async (host)=>{
      host.innerHTML = `<div id="wrap"></div>`;
      const [{data:tk},{data:dr}] = await Promise.all([
        SB().from('jl9_tickets').select('total,prize_amount,status,created_at,draw_id').order('created_at',{ascending:false}).limit(2000),
        SB().from('jl9_draws').select('id,name'),
      ]);
      const rows = tk||[];
      const byDraw = {};
      const drNames = Object.fromEntries((dr||[]).map(d=>[d.id, d.name]));
      rows.forEach(r=>{
        const k = drNames[r.draw_id] || '—';
        byDraw[k] = byDraw[k] || { sales:0, prizes:0, count:0, winners:0 };
        if (r.status !== 'cancelled') byDraw[k].sales += Number(r.total||0);
        byDraw[k].prizes += Number(r.prize_amount||0);
        byDraw[k].count += 1;
        if (r.status === 'won') byDraw[k].winners += 1;
      });
      const entries = Object.entries(byDraw).sort((a,b)=> b[1].sales - a[1].sales);
      document.getElementById('wrap').innerHTML = `<div class="card"><div class="card-hd"><h3>Statistiques par tirage</h3></div>
        ${entries.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Tirage</th><th class="num">Ticket</th><th class="num">Ventes</th><th class="num">Prime</th><th class="num">Bénéfice</th><th class="num">Gagnant</th></tr></thead><tbody>
          ${entries.map(([n,v])=>`<tr><td>${esc(n)}</td><td class="num">${v.count}</td><td class="num">${v.sales.toFixed(2)} HTG</td>
          <td class="num">${v.prizes.toFixed(2)} HTG</td><td class="num">${(v.sales-v.prizes).toFixed(2)} HTG</td><td class="num">${v.winners}</td></tr>`).join('')}
          </tbody></table></div>` : '<div class="empty"><i class="fa-solid fa-chart-column"></i>Aucune donnée.</div>'}
      </div>`;
    }
  });

  // ============ Shared: messages, audit, reports, settings/site-content ============
  LotriShell.register('messages', { render: async(h)=> window._sharedMessages(h) });
  LotriShell.register('audit',    { render: async(h)=> window._sharedAudit(h) });
  LotriShell.register('reports',  { render: async(h)=> window._sharedReports(h) });

  LotriShell.register('settings', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Paramètres — Contenu Page d\'accueil</h3>
        <button class="btn btn-primary" id="save"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button></div>
        <p class="muted">Modifier le contenu affiché sur la page d\'accueil.</p>
        <div id="editor"></div></div>`;
      const { data } = await SB().from('jl9_site_content').select('value').eq('key','landing').maybeSingle();
      const v = (data && data.value) || {};
      document.getElementById('editor').innerHTML = `
        <div class="form-grid">
          <div><label class="label">Titre prensipal</label><input class="input" id="hero_title" value="${esc(v.hero_title||'')}"></div>
          <div><label class="label">Sou-tit</label><input class="input" id="hero_sub" value="${esc(v.hero_sub||'')}"></div>
          <div><label class="label">Footer</label><input class="input" id="footer" value="${esc(v.footer||'')}"></div>
        </div>
        <div class="form-row" style="margin-top:1rem;"><label class="label">Karakteristik (JSON)</label>
          <textarea class="textarea mono" id="features" rows="6">${esc(JSON.stringify(v.features||[], null, 2))}</textarea></div>
        <div class="form-row"><label class="label">Forfait (JSON)</label>
          <textarea class="textarea mono" id="plans" rows="6">${esc(JSON.stringify(v.plans||[], null, 2))}</textarea></div>
        <div class="form-row"><label class="label">FAQ (JSON)</label>
          <textarea class="textarea mono" id="faq" rows="5">${esc(JSON.stringify(v.faq||[], null, 2))}</textarea></div>`;
      document.getElementById('save').onclick = async ()=>{
        try {
          const val = {
            hero_title: document.getElementById('hero_title').value,
            hero_sub: document.getElementById('hero_sub').value,
            footer: document.getElementById('footer').value,
            /* PATI A.2 — JSON malfòme pa dwe kraze paj la: mesaj klè. */
            features: parseJsonField('features', 'Karakteristik'),
            plans: parseJsonField('plans', 'Forfait'),
            faq: parseJsonField('faq', 'FAQ')
          };
          const { error } = await SB().from('jl9_site_content').upsert({ key:'landing', value: val });
          if (error) throw error;
          window.Lotri.toast('Enregistrer','success');
        } catch(e){ window.Lotri.toast(e.message,'error'); }
      };
    }
  });
})();
