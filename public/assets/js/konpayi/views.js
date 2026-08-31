(function(){
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

  LotriShell.register('dashboard', {
    render: async (host)=>{
      host.innerHTML = `<div class="v78-company-greeting"><strong id="v78-company-greeting">Bonjour 👋</strong></div><div id="stats-host"></div>`;
      const greetEl = host.querySelector('#v78-company-greeting'); if (greetEl) greetEl.firstChild.textContent = (new Date().getHours() < 14 ? 'Bonjour' : 'Bonsoir') + ' 👋';
      await LotriStats.render(document.getElementById('stats-host'), [
        {key:'agents', label:'Agent'},
        {key:'branches', label:'Branch'},
        {key:'tickets_sold', label:'Tickets vendus'},
        {key:'tickets_cancelled', label:'Ticket annulé'},
        {key:'winners', label:'Gagnant'},
        {key:'sales_total', label:'Ventes totales'},
        {key:'prize_total', label:'Total des primes'}
      ]);
      // V77 — commission par agent directement dans le Dashboard.
      if (window.JadstackAgentCommission) {
        const box = document.createElement('div'); box.id = 'v77-agent-commission-dashboard';
        host.appendChild(box);
        window.JadstackAgentCommission.renderDashboard(box);
      }
    }
  });

  LotriShell.register('agents', {
    render: async (host)=>{
      const profile = await window.Lotri.getProfile();
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Agent</h3>
        <div class="row">
          <button class="btn" id="bulk"><i class="fa-solid fa-wand-magic-sparkles"></i> Générer X agents</button>
          <button class="btn btn-primary" id="new"><i class="fa-solid fa-plus"></i> Nouvo Agent</button>
        </div></div><div id="list"></div></div>`;
      const load = async ()=>{
        const { data, error } = await SB().from('jl9_agents').select('*').order('created_at',{ascending:false});
        if (error) { document.getElementById('list').innerHTML = '<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>'+esc(error.message)+'</div>'; return; }
        let commissionMap = new Map();
        try {
          const { data: cr, error: ce } = await SB().from('jl9_agent_commissions').select('agent_id,commission_rate').in('agent_id',(data||[]).map(a=>a.id));
          if (ce) throw ce;
          commissionMap = new Map((cr||[]).map(c=>[String(c.agent_id), Number(c.commission_rate)||0]));
        } catch (e) {
          document.getElementById('list').innerHTML = '<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>'+esc(e.message)+'</div>'; return;
        }
        document.getElementById('list').innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr>
              <th>ID</th><th>Nom</th><th>Téléphone</th><th>Commission</th><th>Statut</th><th>Action</th></tr></thead>
              <tbody>${data.map(a=>`<tr data-agent-detail="${a.id}" title="Cliquez pour voir les détails">
                <td class="mono">${esc(a.public_id)}</td>
                <td>${esc(a.full_name)}</td><td>${esc(a.phone||'')}</td>
                <td><div class="v77-agent-rate-cell"><input class="input input-sm" data-rate-agent="${a.id}" type="number" min="0" max="100" step="0.01" value="${commissionMap.get(String(a.id)) ?? 0}" aria-label="Commission ${esc(a.full_name)}"> <span>%</span></div></td>
                <td><span class="badge ${a.status==='active'?'badge-success':'badge-danger'}">${esc(a.status)}</span></td>
                <td class="row">
                  <button class="btn btn-sm" data-account="${a.id}" data-name="${esc(a.full_name)}"><i class="fa-solid fa-user-plus"></i> Créer Compte</button>
                  <button class="btn btn-sm" data-toggle="${a.id}" data-status="${a.status}"><i class="fa-solid ${a.status==='active'?'fa-lock':'fa-lock-open'}"></i> ${a.status==='active'?'Bloqué':'Activer'}</button>
                  <button class="btn btn-sm btn-icon btn-danger" data-del="${a.id}" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
                </td></tr>`).join('')}</tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-users"></i>Aucun agent.</div>';
      };
      document.getElementById('bulk').onclick = async ()=>{
        const n = Number(await window.Lotri.ui.prompt({ title:'Générer des agents', label:'Combien d\'agents ?', value:'10', required:true }));
        if (!n || n < 1) return;
        const { data, error } = await SB().rpc('jl9_rpc_bulk_create_agents', { _company: null, _count: n });
        if (error && window.LotriPlans && window.LotriPlans.handleAgentError(error)) { return; }
        if (error) window.Lotri.toast(error.message,'error');
        else {
          window.Lotri.toast(data+' agents créés','success');
          /* V27 FAZ 4 — popup « Télécharger Application POS » apre siksè */
          if (window.Lotri.apk) window.Lotri.apk.openModal({
            intro: data + ' agents créés. Envoyez-leur l\'application POS :'
          });
        }
        load();
      };
      document.getElementById('new').onclick = ()=>{
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvo Agent</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Nom</label><input class="input" name="full_name" required></div>
            <div><label class="label">Téléphone</label><input class="input" name="phone"></div>
            <div><label class="label">Adresse</label><input class="input" name="address"></div>
            <div><label class="label">E-mail</label><input class="input" name="email" type="email"></div>
            <div><label class="label">Deuxième e-mail</label><input class="input" name="email_2" type="email"></div>
            <div><label class="label">Pays</label><input class="input" name="country" value="Ayiti"></div>
            <div><label class="label">Département</label><input class="input" name="department"></div>
            <div><label class="label">Autres noms (séparés par des virgules)</label><input class="input" name="alt_names" placeholder="ex. Ti Jan, J. Pierre"></div>
            <div><label class="label">Commission de l'agent (%)</label><input class="input" name="commission_rate" type="number" min="0" max="100" step="0.01" value="0" placeholder="ex. 5"></div>
          </div><div class="row" style="justify-content:flex-end;margin-top:1rem">
          <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button></div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick = ()=> m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          d.company_id = profile.company_id;
          d.alt_names = (d.alt_names || '').split(',').map(s => s.trim()).filter(Boolean);
          d.public_id = 'POS-' + Math.random().toString(36).slice(2,8).toUpperCase();
          try {
            const commissionRate = Number(d.commission_rate || 0);
            delete d.commission_rate;
            const created = await window.Lotri.v11.createAgent(d);
            if (window.JadstackAgentCommission) window.JadstackAgentCommission.setRate(created.id, commissionRate);
            window.Lotri.toast('Agent créé : ' + created.public_id, 'success');
            m.remove(); load();
          } catch (err) {
            /* V20 #7 — limit plan: popup ak chemen upgrade */
            if (window.LotriPlans && window.LotriPlans.handleAgentError(err)) { m.remove(); return; }
            window.Lotri.toast(err.message || 'Impossible de créer l\'agent.', 'error');
          }
        };
      };
      host.addEventListener('change', async (e)=>{
        const input = e.target.closest('[data-rate-agent]');
        if (!input || !window.JadstackAgentCommission) return;
        try {
          await window.JadstackAgentCommission.setRate(input.dataset.rateAgent, input.value);
          window.Lotri.toast("Commission de l'agent mise à jour", 'success');
        } catch (err) {
          window.Lotri.toast(err.message || "Impossible de modifier la commission", 'error');
          load();
        }
      });
      host.addEventListener('click', async (e)=>{
        const t = e.target.closest('[data-toggle]');
        if (t) { await SB().from('jl9_agents').update({status: t.dataset.status==='active'?'blocked':'active'}).eq('id', t.dataset.toggle); load(); return; }
        const d = e.target.closest('[data-del]');
        if (d) { if (!await window.Lotri.ui.confirm('Supprimer cet agent ?', null, { danger:true })) return; await SB().from('jl9_agents').delete().eq('id', d.dataset.del); load(); return; }
        const acc = e.target.closest('[data-account]');
        if (acc) {
          const email = await window.Lotri.ui.prompt({ title:'Créer un compte agent', label:'E-mail', required:true });
          if (!email) return;
          const pass = await window.Lotri.ui.prompt({ title:'Créer un compte agent', label:'Mot de passe (min. 6 caractères)', required:true });
          if (!pass || pass.length < 6) return;
          try {
            await window.Lotri.createAccount({
              email, password: pass, role:'agent',
              company_id: profile.company_id, agent_id: acc.dataset.account, full_name: acc.dataset.name
            });
            window.Lotri.toast('Compte créé','success');
            if (window.Lotri.mail && window.Lotri.mail.post &&
                await window.Lotri.ui.confirm('Envoyer les informations de connexion par e-mail à l\'agent ?')) {
              try { await window.Lotri.mail.post({
                to: email, subject: 'Votre compte Agent JADSTACK LOTTO',
                fields: {
                  'E-mail': email, 'Mot de passe temporaire': pass,
                  'Nom': acc.dataset.name || '',
                  'Enstriksyon': 'Changez le mot de passe lors de votre première connexion.'
                }
              }); } catch (_) { }
            }
          } catch (error) { window.Lotri.toast(error.message,'error'); }
        }
      });
      await load();
      /* V27 FAZ 4 — bouton anba lis ajan yo (Compagnie / Super Admin) */
      if (window.Lotri.apk) await window.Lotri.apk.mountButton(host);
    }
  });

  // Sipèvisè (pou wòl konpayi)
  LotriShell.register('supervisors', {
    render: async (host)=>{
      const profile = await window.Lotri.getProfile();
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Sipèvisè</h3>
        <button class="btn btn-primary" id="new"><i class="fa-solid fa-plus"></i> Nouvo Sipèvisè</button></div><div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_supervisors').select('*').order('created_at',{ascending:false});
        document.getElementById('list').innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nom</th><th>Téléphone</th><th>Statut</th><th></th></tr></thead><tbody>
             ${data.map(s=>`<tr><td>${esc(s.full_name)}</td><td>${esc(s.phone||'')}</td>
             <td><span class="badge ${s.status==='active'?'badge-success':'badge-danger'}">${esc(s.status)}</span></td>
             <td><button class="btn btn-sm btn-icon btn-danger" data-del="${s.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
             </tbody></table></div>` : '<div class="empty"><i class="fa-solid fa-user-tie"></i>Aucun superviseur.</div>';
      };
      host.addEventListener('click', async(e)=>{
        const d = e.target.closest('[data-del]');
        if (d && confirm('Supprimer ?')) { await SB().from('jl9_supervisors').delete().eq('id', d.dataset.del); load(); }
      });
      document.getElementById('new').onclick = ()=>{
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvo Sipèvisè</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Nom complet</label><input class="input" name="full_name" required></div>
            <div><label class="label">Téléphone</label><input class="input" name="phone"></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:1rem">
            <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button></div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick=()=>m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target).entries());
          d.company_id = profile.company_id;
          const { error } = await SB().from('jl9_supervisors').insert(d);
          if (error) window.Lotri.toast(error.message,'error');
          m.remove(); load();
        };
      };
      await load();
    }
  });

  // Branches
  LotriShell.register('branches', {
    render: async (host)=>{
      const profile = await window.Lotri.getProfile();
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Succursale (Branch)</h3>
        <button class="btn btn-primary" id="new"><i class="fa-solid fa-plus"></i> Nouvo Branch</button></div><div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_branches').select('*').order('created_at',{ascending:false});
        document.getElementById('list').innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nom</th><th>Code</th><th>Adresse</th><th>Mariage gratis</th><th></th></tr></thead><tbody>
             ${data.map(b=>`<tr><td><strong>${esc(b.name)}</strong></td><td class="mono">${esc(b.code||'')}</td>
             <td class="muted">${esc(b.address||'')}</td>
             <td>${b.free_marriage?'<span class="badge badge-accent">ON</span>':'—'}</td>
             <td><button class="btn btn-sm btn-icon btn-danger" data-del="${b.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
             </tbody></table></div>` : '<div class="empty"><i class="fa-solid fa-shop"></i>Aucune succursale.</div>';
      };
      host.addEventListener('click', async(e)=>{
        const d = e.target.closest('[data-del]');
        if (d && confirm('Supprimer ?')) { await SB().from('jl9_branches').delete().eq('id', d.dataset.del); load(); }
      });
      document.getElementById('new').onclick = ()=>{
        const m = document.createElement('div'); m.className='modal-backdrop';
        m.innerHTML = `<div class="modal"><h3>Nouvo Branch</h3><form id="f">
          <div class="form-grid">
            <div><label class="label">Nom</label><input class="input" name="name" required></div>
            <div><label class="label">Code</label><input class="input" name="code"></div>
            <div><label class="label">Adresse</label><input class="input" name="address"></div>
            <div><label class="label">Téléphone</label><input class="input" name="phone"></div>
            <div><label class="label">Mariage gratis</label><label class="switch"><input type="checkbox" name="free_marriage"><span class="track"></span></label></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:1rem">
            <button type="button" class="btn btn-ghost" id="c">Annuler</button><button class="btn btn-primary">Créer</button></div></form></div>`;
        document.body.appendChild(m);
        m.querySelector('#c').onclick=()=>m.remove();
        m.querySelector('#f').onsubmit = async(ev)=>{
          ev.preventDefault();
          const fd = new FormData(ev.target);
          const d = Object.fromEntries(fd.entries());
          d.company_id = profile.company_id;
          d.free_marriage = fd.get('free_marriage')==='on';
          const { error } = await SB().from('jl9_branches').insert(d);
          if (error) window.Lotri.toast(error.message,'error');
          m.remove(); load();
        };
      };
      await load();
    }
  });

  // Paramètres konpayi (switches JSONB)
  LotriShell.register('csettings', {
    render: async (host)=>{
      const profile = await window.Lotri.getProfile();
      const { data: comp } = await SB().from('jl9_companies').select('id,name,logo_url').eq('id', profile.company_id).maybeSingle();
      const SWITCHES = [
        ['block_boule_mariage','Blocage de boule au Mariage'],
        ['block_boule_lotto4','Blocage de boule au Lotto 4'],
        ['block_boule_lotto3','Blocage de boule au Lotto 3'],
        ['mariage_gratuit','Mariage Gratuit'],
        ['patente','Patente'],
        ['mariage_option','Mariage Option'],
        ['qrcode','QR code sur le ticket'],
        ['whatsapp','WhatsApp'],
        ['boule_revers','Boule a revers'],
        ['company_phone','Afficher le téléphone de la compagnie'],
        ['vendeur_name','Nom du vendeur sur le ticket'],
        ['vendeur_adresse','Adresse du vendeur sur le ticket'],
        ['multi_tirage','Multi tirage'],
        ['boule_paire','Boule Paire'],
        ['pointe_auto','Pointe auto'],
        ['lotto3_auto','Lotto 3 auto'],
        ['lotto4_auto','Lotto 4 auto'],
        ['mariage_meme_boule','Mariage avec meme Boule'],
      ];
      const { data } = await SB().from('jl9_company_settings').select('settings').eq('company_id', profile.company_id).maybeSingle();
      const s = (data && data.settings) || {};
      host.innerHTML = `
        <div class="card" style="margin-bottom:1rem">
          <div class="card-hd"><h3>Logo &amp; Nom Compagnie</h3></div>
          <p class="muted">Vous pouvez changer le logo de votre compagnie à tout moment. <strong>Nom de la compagnie a</strong> se uniquement
            Super Admin ki ka modifye l — kontakte l si ou bezwen chanje non an.</p>
          <div class="form-row">
            <label class="label">Nom de la compagnie (lecture seule)</label>
            <input class="input" value="${esc(comp?.name || '')}" disabled>
          </div>
          <div class="form-row">
            <label class="label">Logo de la compagnie</label>
            <div class="logo-preview" id="pv-clogo">${comp?.logo_url ? `<img src="${esc(comp.logo_url)}" alt="">` : '<span class="ph">Aucun logo — les initiales du nom seront affichées.</span>'}</div>
            <input class="input" type="file" id="f-clogo" accept="image/png,image/jpeg,image/webp,image/svg+xml">
            <small class="muted">PNG, JPG, WEBP ou SVG — 2 Mo maximum. Il apparaît carré dans le menu latéral.</small>
          </div>
        </div>
        <div class="card"><div class="card-hd"><h3>Paramètres Compagnie — Switch</h3>
        <button class="btn btn-primary" id="save"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button></div>
        <div class="form-grid">
          ${SWITCHES.map(([k,l])=>`<label class="switch" style="justify-content:space-between;">
            <span>${esc(l)}</span>
            <input type="checkbox" data-key="${k}" ${s[k]?'checked':''}><span class="track"></span>
          </label>`).join('')}
        </div></div>`;

      document.getElementById('f-clogo').onchange = async e => {
        const file = e.target.files[0]; if (!file) return;
        if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) { window.Lotri.toast('Format d\'image non pris en charge.', 'error'); return; }
        if (file.size > 2 * 1024 * 1024) { window.Lotri.toast('Imaj la twò gwo (max 2 Mo).', 'error'); return; }
        try {
          const ext = (file.name.split('.').pop() || 'png').toLowerCase();
          const path = `${profile.company_id}/logo-${Date.now()}.${ext}`;
          const { error: upErr } = await SB().storage.from('company-logos').upload(path, file, { upsert: true, cacheControl: '3600' });
          if (upErr) throw upErr;
          const url = await checkedPublicUrl('company-logos', path);
          const { error } = await SB().rpc('jl9_rpc_update_company_logo', { _logo_url: url });
          if (error) throw error;
          document.getElementById('pv-clogo').innerHTML = `<img src="${esc(url)}" alt="">`;
          window.Lotri.toast('Logo modifié.', 'success');
        } catch (ex) { window.Lotri.toast(ex.message, 'error'); }
      };

      document.getElementById('save').onclick = async ()=>{
        const next = {};
        host.querySelectorAll('input[type=checkbox][data-key]').forEach(i=> next[i.dataset.key] = i.checked);
        const { error } = await SB().from('jl9_company_settings').upsert({ company_id: profile.company_id, settings: next, updated_at: new Date().toISOString() });
        if (error) window.Lotri.toast(error.message,'error'); else window.Lotri.toast('Enregistrer','success');
      };
    }
  });

  LotriShell.register('tickets', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Ticket</h3></div><div id="list"></div></div>`;
      const { data } = await SB().from('jl9_tickets').select('*').order('created_at',{ascending:false}).limit(200);
      document.getElementById('list').innerHTML = (data||[]).length
        ? `<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th class="num">Total</th><th class="num">Prime</th><th>Statut</th><th>Date</th></tr></thead>
           <tbody>${data.map(t=>`<tr data-ticket="${t.id}"><td class="mono">${esc(t.ticket_no)}</td>
             <td class="num">${Number(t.total).toFixed(2)} HTG</td><td class="num">${Number(t.prize_amount).toFixed(2)} HTG</td>
             <td><span class="badge ${t.status==='won'?'badge-success':t.status==='cancelled'?'badge-danger':''}">${esc(t.status)}</span></td>
             <td class="muted">${new Date(t.created_at).toLocaleString()}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty"><i class="fa-solid fa-ticket"></i>Aucun ticket.</div>';
    }
  });

  // Facture pou konpayi (view + peye)
  LotriShell.register('invoices', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Mes factures</h3></div><div id="list"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_invoices').select('*').order('created_at',{ascending:false});
        document.getElementById('list').innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Numéro</th><th class="num">Montant</th><th>Due</th><th>Statut</th><th></th></tr></thead><tbody>
             ${data.map(i=>`<tr><td class="mono">${esc(i.number)}</td><td class="num">${Number(i.amount).toFixed(2)} HTG</td>
             <td class="muted">${esc(i.due_date||'')}</td>
             <td><span class="badge ${i.status==='paid'?'badge-success':i.status==='overdue'?'badge-danger':i.status==='advance'?'badge-info':'badge-warning'}">${esc({paid:'Payé',unpaid:'Nom payé',overdue:'An reta',advance:'An avans',cancelled:'Annuler'}[i.status]||i.status)}</span></td>
             <td>${i.status!=='paid'?`<button class="btn btn-sm btn-primary" data-pay="${i.id}" data-amt="${i.amount}"><i class="fa-solid fa-credit-card"></i> Payé</button>`:''}</td></tr>`).join('')}
             </tbody></table></div>` : '<div class="empty"><i class="fa-solid fa-file-invoice-dollar"></i>Aucune facture.</div>';
      };
      host.addEventListener('click', async(e)=>{
        const b = e.target.closest('[data-pay]'); if (!b) return;
        const ref = await window.Lotri.ui.prompt({ title:'Enregistrer le paiement', label:'Référence du paiement', placeholder:'MonCash TRX…', required:true });
        if (!ref) return;
        const profile = await window.Lotri.getProfile();
        const { error } = await SB().from('jl9_payments').insert({ invoice_id: b.dataset.pay, company_id: profile.company_id, amount: Number(b.dataset.amt), method:'moncash', reference: ref });
        if (error) { window.Lotri.toast(error.message,'error'); return; }
        await SB().from('jl9_invoices').update({ status:'paid' }).eq('id', b.dataset.pay);
        window.Lotri.toast('Paiement enregistré','success'); load();
      });
      await load();
    }
  });

  LotriShell.register('payments', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Istwa Paiement</h3></div><div id="list"></div></div>`;
      const { data } = await SB().from('jl9_payments').select('*').order('paid_at',{ascending:false});
      document.getElementById('list').innerHTML = (data||[]).length
        ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th class="num">Montant</th><th>Metòd</th><th>Referans</th></tr></thead><tbody>
           ${data.map(p=>`<tr><td class="muted">${new Date(p.paid_at).toLocaleString()}</td>
           <td class="num">${Number(p.amount).toFixed(2)} HTG</td><td>${esc(p.method||'—')}</td><td class="mono">${esc(p.reference||'')}</td></tr>`).join('')}
           </tbody></table></div>` : '<div class="empty"><i class="fa-solid fa-receipt"></i>Aucun paiement.</div>';
    }
  });

  LotriShell.register('reports',  { render: async(h)=> window._sharedReports(h) });
  LotriShell.register('audit',    { render: async(h)=> window._sharedAudit(h) });
  LotriShell.register('messages', { render: async(h)=> window._sharedMessages(h) });
})();
