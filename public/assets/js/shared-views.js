// Shared views itilize pa Super Admin, Compagnie ak Ajan.
// Yon sèl sous verite pou Messages / Odit / Rapport — pa gen doubling ankò.
(function(){
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  window._sharedReports = async (host)=>{
    host.innerHTML = `<div class="card"><div class="card-hd"><h3>Rapport</h3><button class="btn" id="csv"><i class="fa-solid fa-file-export"></i> Exporter CSV</button></div><div id="body"></div></div>`;
    const { data } = await SB().from('jl9_tickets').select('ticket_no,total,prize_amount,status,created_at').order('created_at',{ascending:false}).limit(500);
    const rows = data||[];
    const sum = rows.reduce((a,r)=> a + (r.status!=='cancelled'? Number(r.total):0), 0);
    const prizes = rows.reduce((a,r)=> a + Number(r.prize_amount||0), 0);
    document.getElementById('body').innerHTML = `
      <div class="grid-stats" style="margin-bottom:1.25rem;">
        <div class="card stat"><div class="lbl">Ticket</div><div class="val">${rows.length}</div></div>
        <div class="card stat"><div class="lbl">Ventes</div><div class="val">${sum.toFixed(2)} HTG</div></div>
        <div class="card stat"><div class="lbl">Prime</div><div class="val">${prizes.toFixed(2)} HTG</div></div>
        <div class="card stat"><div class="lbl">Bénéfice</div><div class="val">${(sum-prizes).toFixed(2)} HTG</div></div>
      </div>
      <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th class="num">Total</th><th class="num">Prime</th><th>Statut</th><th>Date</th></tr></thead>
      <tbody>${rows.length ? rows.map(t=>`<tr data-ticket-no="${esc(t.ticket_no)}"><td class="mono">${esc(t.ticket_no)}</td><td class="num">${Number(t.total).toFixed(2)} HTG</td>
        <td class="num">${Number(t.prize_amount).toFixed(2)} HTG</td><td><span class="badge ${t.status==='won'?'badge-success':t.status==='cancelled'?'badge-danger':''}">${esc(t.status)}</span></td><td class="muted">${new Date(t.created_at).toLocaleString()}</td></tr>`).join('')
        : `<tr><td colspan="5"><div class="empty"><i class="fa-regular fa-folder-open"></i>Aucune donnée.</div></td></tr>`}
      </tbody></table></div>`;
    const role = String((window.__lotriProfile||{}).role||'');
    if (window.JadstackAgentCommission && ['super_admin','employer','company'].includes(role)) {
      const box=document.createElement('div'); box.style.margin='0 0 1rem'; document.getElementById('body').prepend(box);
      try { await window.JadstackAgentCommission.renderReportSummary(box); } catch(e) { box.innerHTML=''; }
    }
    document.getElementById('csv').onclick = ()=>{
      const csv = 'ticket_no,total,prize_amount,status,created_at\n' + rows.map(r=>[r.ticket_no,r.total,r.prize_amount,r.status,r.created_at].join(',')).join('\n');
      const blob = new Blob([csv], {type:'text/csv'}); const a=document.createElement('a');
      a.href=URL.createObjectURL(blob); a.download='rapo.csv'; a.click();
    };
  };

  window._sharedAudit = async (host)=>{
    host.innerHTML = `<div class="card"><div class="card-hd"><h3>Journal d'audit</h3></div><div id="list"></div></div>`;
    const { data } = await SB().from('jl9_audit_logs').select('*').order('created_at',{ascending:false}).limit(200);
    document.getElementById('list').innerHTML = (data||[]).length
      ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Action</th><th>Cible</th><th>Méta</th></tr></thead><tbody>
         ${data.map(a=>`<tr><td class="muted">${new Date(a.created_at).toLocaleString()}</td>
           <td><span class="badge">${esc(a.action)}</span></td><td>${esc(a.target||'')}</td>
           <td class="mono" style="font-size:.72rem">${esc(JSON.stringify(a.meta||{}))}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty"><i class="fa-regular fa-file-lines"></i>Aucune entrée.</div>';
  };

  // Messages bi-direksyonèl (v8): filtè, nouvo mesaj toujou anwo, fenèt modifikasyon
  // 5 minit, efasman, epi yon ti ikon "je" ki montre done brit mesaj la.
  const EDIT_WINDOW_MS = 5 * 60 * 1000;

  window._sharedMessages = async (host)=>{
    const profile = window.__lotriProfile || await window.Lotri.getProfile();
    const uid = profile ? profile.id : null;
    host.innerHTML = `<div class="card"><div class="card-hd"><h3>Messages</h3>
      <button class="btn btn-primary" id="new"><i class="fa-solid fa-paper-plane"></i> Envoyer un message</button></div>
      <div class="msg-toolbar">
        <input class="input" id="q" placeholder="Rechercher un titre ou un contenu…">
        <select class="select input" id="f-state">
          <option value="all">Tous les messages</option>
          <option value="unread">Uniquement non lus</option>
          <option value="mine">Ceux que j’ai envoyés</option>
        </select>
        <select class="select input" id="f-role">
          <option value="">Tous les expéditeurs</option>
          <option value="super_admin">Super Admin</option>
          <option value="company">Compagnie</option>
          <option value="supervisor">Superviseur</option>
          <option value="agent">Agent</option>
        </select>
        <input class="input" id="f-date" type="date" aria-label="Filtrer par date">
        <button class="btn btn-ghost btn-sm" id="f-clear">Réinitialiser</button>
      </div>
      <div id="list"></div></div>`;

    let rows = [];
    const draw = ()=>{
      const q = document.getElementById('q').value.trim().toLowerCase();
      const st = document.getElementById('f-state').value;
      const rl = document.getElementById('f-role').value;
      const dt = document.getElementById('f-date').value;

      let list = rows.slice();
      if (q)  list = list.filter(m => ((m.title||'')+' '+(m.body||'')).toLowerCase().includes(q));
      if (rl) list = list.filter(m => m.sender_role === rl);
      if (dt) list = list.filter(m => new Date(m.created_at).toISOString().slice(0,10) === dt);
      if (st === 'unread') list = list.filter(m => uid && !(m.read_by||[]).includes(uid) && m.sender_id !== uid);
      if (st === 'mine')   list = list.filter(m => m.sender_id === uid);

      // Nouveau message toujou anwo
      list.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));

      const el = document.getElementById('list');
      if (!list.length){ el.innerHTML = '<div class="empty"><i class="fa-regular fa-envelope"></i>Aucun message correspondant.</div>'; return; }

      el.innerHTML = list.map(m=>{
        const unread = uid && !(m.read_by||[]).includes(uid) && m.sender_id !== uid;
        const mine = m.sender_id === uid;
        const editable = mine && (Date.now() - new Date(m.created_at).getTime() < EDIT_WINDOW_MS);
        return `<div class="msg-item ${unread?'unread':''}" data-id="${m.id}">
          <div class="row">
            <strong>${esc(m.title)}</strong>
            ${unread ? '<span class="badge badge-new">nouveau</span>' : ''}
            <span class="badge">${esc(m.audience)}</span>
            <span class="badge ${m.level==='error'?'badge-danger':m.level==='warning'?'badge-warning':m.level==='success'?'badge-success':''}">${esc(m.level)}</span>
            <span class="chip">${esc(m.sender_role||'—')}</span>
            <span class="right muted">${new Date(m.created_at).toLocaleString()}</span>
            <button class="eye-btn" data-raw="${m.id}" title="Voir les données brutes du message" aria-label="Données brutes"><i class="fa-regular fa-eye"></i></button>
          </div>
          <p class="muted" style="margin:.5rem 0 .6rem;">${esc(m.body||'')}</p>
          <div class="row">
            ${unread ? `<button class="btn btn-sm" data-read="${m.id}"><i class="fa-solid fa-check"></i> Marquer comme lu</button>` : ''}
            <button class="btn btn-sm btn-ghost" data-reply="${m.id}" data-title="${esc(m.title)}"><i class="fa-solid fa-reply"></i> Répondre</button>
            ${editable ? `<button class="btn btn-sm btn-ghost" data-edit="${m.id}"><i class="fa-solid fa-pen"></i> Modifier</button>` : ''}
            ${mine ? `<button class="btn btn-sm btn-danger" data-del="${m.id}"><i class="fa-solid fa-trash"></i></button>` : ''}
            ${mine && !editable ? '<span class="muted" style="font-size:.75rem">La fenêtre de modification de 5 min est fermée.</span>' : ''}
          </div>
          <div class="raw-box" id="raw-${m.id}" hidden>${esc(JSON.stringify(m, null, 2))}</div>
        </div>`;
      }).join('');
    };

    const load = async ()=>{
      const { data } = await SB().from('jl9_messages').select('*').is('deleted_at', null)
        .order('created_at',{ascending:false}).limit(200);
      rows = data || [];
      draw();
    };

    ['q','f-state','f-role','f-date'].forEach(id=>{
      document.getElementById(id).addEventListener('input', draw);
      document.getElementById(id).addEventListener('change', draw);
    });
    document.getElementById('f-clear').onclick = ()=>{
      document.getElementById('q').value = '';
      document.getElementById('f-state').value = 'all';
      document.getElementById('f-role').value = '';
      document.getElementById('f-date').value = '';
      draw();
    };

    host.addEventListener('click', async (e)=>{
      const ey = e.target.closest('[data-raw]');
      if (ey) { const b = document.getElementById('raw-'+ey.dataset.raw); if (b) b.hidden = !b.hidden; return; }
      const r = e.target.closest('[data-read]');
      if (r) { await SB().rpc('jl9_rpc_mark_message_read', { _message: r.dataset.read }); load(); return; }
      const rp = e.target.closest('[data-reply]');
      if (rp) { openMessageModal(profile, { parent_id: rp.dataset.reply, title: 'Re: ' + rp.dataset.title }, load); return; }
      const ed = e.target.closest('[data-edit]');
      if (ed) {
        const m = rows.find(x=> x.id === ed.dataset.edit); if (!m) return;
        const title = await window.Lotri.ui.prompt({ title:'Modifier le message', label:'Titre', value:m.title, required:true });
        if (title === null) return;
        const body = await window.Lotri.ui.prompt({ title:'Modifier le message', label:'Contenu', value:m.body || '', multiline:true });
        if (body === null) return;
        const { error } = await SB().rpc('jl9_rpc_edit_message', { _message: m.id, _title: title, _body: body });
        if (error) window.Lotri.toast(error.message,'error'); else window.Lotri.toast('Message modifié','success');
        load(); return;
      }
      const dl = e.target.closest('[data-del]');
      if (dl) {
        if (!await window.Lotri.ui.confirm('Supprimer ce message ?', 'Il sera déplacé vers la corbeille.', { danger:true })) return;
        const { error } = await SB().rpc('jl9_rpc_soft_delete', { _table: 'messages', _id: dl.dataset.del });
        if (error) window.Lotri.toast(error.message,'error'); else window.Lotri.toast('Message supprimé','success');
        load();
      }
    });
    document.getElementById('new').onclick = ()=> openMessageModal(profile, {}, load);
    await load();
  };


  async function openMessageModal(profile, opts, refresh){
    opts = opts || {};
    const role = profile ? profile.role : 'agent';
    // Choisir opsyon odyans selon wòl
    const audOptions = role === 'super_admin'
      ? [['all','Tous le monde'], ['company','Une compagnie spécifique'], ['agent','Un agent spécifique']]
      : role === 'company'
        ? [['company','Tous les agents de ma compagnie'], ['agent','Un agent spécifique'], ['super_admin','Super Admin']]
        : [['company','Pour ma compagnie']];
    const m = document.createElement('div');
    m.className='modal-backdrop';
    m.innerHTML = `<div class="modal"><h3>${opts.parent_id?'Répondre':'Envoyer un message'}</h3>
      <form id="f">
        <div class="form-row"><label class="label">Titre</label>
          <input class="input" name="title" required value="${esc(opts.title||'')}"></div>
        <div class="form-row"><label class="label">Contenu</label>
          <textarea class="textarea" name="body" rows="4" required></textarea></div>
        <div class="form-grid">
          <div><label class="label">Audience</label>
            <select class="select" name="audience" id="aud">
              ${audOptions.map(o=>`<option value="${o[0]}">${esc(o[1])}</option>`).join('')}
            </select></div>
          <div><label class="label">Niveau</label>
            <select class="select" name="level">
              <option value="info">Info</option><option value="success">Succès</option>
              <option value="warning">Attention</option><option value="error">Erreur</option>
            </select></div>
        </div>
        <div class="form-row" id="companyBox" style="display:${role==='super_admin'?'block':'none'};margin-top:.5rem;">
          <label class="label">Compagnie destinataire</label>
          <select class="select" name="company_id" id="companyPick"><option value="">— Choisir —</option></select>
        </div>
        <div class="form-row" id="agentBox" style="display:none;">
          <label class="label">Agent destinataire</label>
          <select class="select" name="agent_id" id="agentPick"><option value="">— Choisir —</option></select>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:1rem;">
          <button type="button" class="btn btn-ghost" id="cancel">Annuler</button>
          <button class="btn btn-primary">Envoyer</button>
        </div>
      </form></div>`;
    document.body.appendChild(m);
    m.querySelector('#cancel').onclick = ()=> m.remove();
    const aud = m.querySelector('#aud');
    const cBox = m.querySelector('#companyBox');
    const aBox = m.querySelector('#agentBox');
    const cPick = m.querySelector('#companyPick');
    const aPick = m.querySelector('#agentPick');

    // Chaje konpayi si SA
    if (role === 'super_admin') {
      const { data } = await window.Lotri.supabase.from('jl9_companies').select('id,name').order('name');
      cPick.innerHTML = '<option value="">— Choisir —</option>' +
        (data||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
    }
    // Chaje ajan dinamikman
    async function loadAgents(companyId){
      let q = window.Lotri.supabase.from('jl9_agents').select('id,full_name,company_id').order('full_name');
      if (companyId) q = q.eq('company_id', companyId);
      const { data } = await q;
      aPick.innerHTML = '<option value="">— Choisir —</option>' +
        (data||[]).map(a=>`<option value="${a.id}">${esc(a.full_name)}</option>`).join('');
    }
    const syncBoxes = ()=>{
      const v = aud.value;
      cBox.style.display = (role==='super_admin' && (v==='company' || v==='agent')) ? 'block' : 'none';
      aBox.style.display = (v==='agent') ? 'block' : 'none';
      if (v==='agent') loadAgents(role==='super_admin' ? cPick.value : null);
    };
    aud.addEventListener('change', syncBoxes);
    if (role==='super_admin') cPick.addEventListener('change', ()=>{ if (aud.value==='agent') loadAgents(cPick.value); });
    syncBoxes();

    m.querySelector('#f').addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(ev.target).entries());
      const { error } = await window.Lotri.supabase.rpc('jl9_rpc_send_message', {
        _audience:  fd.audience,
        _company_id: fd.company_id || null,
        _agent_id:  fd.agent_id || null,
        _title: fd.title,
        _body:  fd.body,
        _level: fd.level,
        _parent_id: opts.parent_id || null
      });
      if (error) { window.Lotri.toast(error.message, 'error'); return; }
      window.Lotri.toast('Message envoyé', 'success');
      m.remove(); refresh && refresh();
    });
  }
  window._openMessageModal = openMessageModal;
})();
