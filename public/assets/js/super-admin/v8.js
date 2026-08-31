/* =====================================================================
 * SUPER ADMIN — vi v8 (adisyon)
 *  - requests: Apwouve/refize demann chanjman non & logo konpayi
 *  - trash   : Corbeille global ak restorasyon
 *  - machines: Siveyans tout machin (tout konpayi)
 *  - security: 2FA (TOTP) + jounal tantativ koneksyon
 *  - profiles: Gade pwofil yon konpayi/ajan an detay
 * ===================================================================== */
(function(){
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  /* ---------- Demande de changement de nom ---------- */
  LotriShell.register('requests', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Demande de changement de nom & logo</h3></div><div id="l"></div></div>`;
      const load = async ()=>{
        const { data } = await SB().from('jl9_company_name_requests')
          .select('*, companies:jl9_companies(name, logo_url)').order('created_at',{ascending:false}).limit(60);
        const rows = data || [];
        document.getElementById('l').innerHTML = rows.length ? rows.map(r=>`
          <div class="card" style="margin-bottom:1rem">
            <div class="row" style="margin-bottom:.7rem">
              <strong>${esc(r.companies?.name || 'Compagnie')}</strong>
              <span class="badge ${['apwouve','approved'].includes(r.status)?'badge-success':['refize','rejected'].includes(r.status)?'badge-danger':'badge-warning'}">${esc(r.status)}</span>
              <span class="right muted">${new Date(r.created_at).toLocaleString()}</span>
            </div>
            <div class="req-diff">
              <div class="req-box">
                <div class="lbl">Maintenant</div>
                ${r.companies?.logo_url ? `<img src="${esc(r.companies.logo_url)}" alt="">` : ''}
                <div>${esc(r.companies?.name||'—')}</div>
              </div>
              <i class="fa-solid fa-arrow-right muted"></i>
              <div class="req-box">
                <div class="lbl">Demandes</div>
                ${r.new_logo_url ? `<img src="${esc(r.new_logo_url)}" alt="">` : ''}
                <div>${esc(r.new_name||'—')}</div>
              </div>
            </div>
            ${r.reason ? `<p class="muted" style="margin-top:.7rem">Rezon: ${esc(r.reason)}</p>` : ''}
            ${r.status === 'pending' ? `<div class="row" style="margin-top:.8rem">
              <button class="btn btn-primary btn-sm" data-ok="${r.id}"><i class="fa-solid fa-check"></i> Approuver</button>
              <button class="btn btn-danger btn-sm" data-no="${r.id}"><i class="fa-solid fa-xmark"></i> Refusé</button>
            </div>` : (r.review_note ? `<p class="muted" style="margin-top:.6rem">Note: ${esc(r.review_note)}</p>` : '')}
          </div>`).join('') : '<div class="empty"><i class="fa-regular fa-paper-plane"></i>Aucune demande.</div>';
      };
      host.addEventListener('click', async (e)=>{
        const ok = e.target.closest('[data-ok]');
        const no = e.target.closest('[data-no]');
        if (!ok && !no) return;
        const id = (ok || no).dataset.ok || no.dataset.no;
        const note = await window.Lotri.ui.prompt({
          title: ok ? 'Approuver la demande' : 'Rejeter la demande',
          label: ok ? 'Note d\'approbation (facultatif)' : 'Rezon refi',
          multiline: true, required: !ok }) || null;
        if (no && !note) return;
        const { error } = await SB().rpc('jl9_rpc_review_company_name', {
          _request: id, _approve: !!ok, _note: note });
        if (error) window.Lotri.toast(error.message,'error');
        else { window.Lotri.toast(ok ? 'Approuver' : 'Refusé', 'success'); load(); }
      });
      await load();
    }
  });

  LotriShell.register('trash',    { render: async (host)=> window._sharedTrash(host, null) });
  LotriShell.register('machines', { render: async (host)=> window._sharedMachines(host, null) });

  /* ---------- Sekirite: 2FA + jounal koneksyon ---------- */
  LotriShell.register('security', {
    render: async (host)=>{
      const p = window.__lotriProfile;
      const { data: me } = await SB().from('jl9_profiles').select('totp_enabled').eq('id', p.id).maybeSingle();
      const on = !!(me && me.totp_enabled);

      host.innerHTML = `
      <div class="card">
        <div class="card-hd"><h3>Verifikasyon 2 etap (2FA)</h3>
          <span class="badge ${on?'badge-success':'badge-warning'}">${on?'Activer':'Nom activé'}</span></div>
        <p class="muted">2FA a pwoteje kont Super Admin lan ak yon kòd 6 chif ki chanje chak 30 segond
          (Google Authenticator, Authy, 1Password…).</p>
        <div id="setup" style="margin-top:1rem"></div>
        <div class="row" style="margin-top:1rem">
          ${on ? '<button class="btn btn-danger" id="off">Désactiver 2FA</button>'
               : '<button class="btn btn-primary" id="start">Activer 2FA</button>'}
        </div>
      </div>

      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Tantativ koneksyon</h3></div>
        <div id="log"></div>
      </div>`;

      const { data: logs } = await SB().from('jl9_login_attempts').select('*')
        .order('created_at',{ascending:false}).limit(100);
      document.getElementById('log').innerHTML = (logs||[]).length
        ? `<div class="table-wrap"><table class="table"><thead><tr><th>E-mail</th><th>Résultats</th><th>Date</th></tr></thead><tbody>
           ${logs.map(l=>`<tr><td>${esc(l.email)}</td>
             <td><span class="badge ${l.success?'badge-success':'badge-danger'}">${l.success?'Reyisi':'Echwe'}</span></td>
             <td class="muted">${new Date(l.created_at).toLocaleString()}</td></tr>`).join('')}
           </tbody></table></div>`
        : '<div class="empty"><i class="fa-regular fa-file-lines"></i>Aucune entrée.</div>';

      const startBtn = document.getElementById('start');
      if (startBtn) startBtn.onclick = ()=>{
        const secret = window.Lotri.security.newTotpSecret();
        const uri = window.Lotri.security.totpUri(secret, p.email || 'super-admin');
        document.getElementById('setup').innerHTML = `
          <div class="kv"><span class="k">Sekrè</span><span class="mono">${esc(secret)}</span></div>
          <p class="muted" style="margin:.6rem 0">Scannez ou copiez le secret dans votre application d\'authentification, puis saisissez le code :</p>
          <img alt="QR 2FA" style="display:block;margin:.5rem auto" width="180" height="180"
               src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uri)}">
          <div class="form-row"><label class="label">Code à 6 chiffres</label>
            <input class="input mono" id="code" inputmode="numeric" maxlength="6"></div>
          <button class="btn btn-primary" id="confirm">Confirmer & aktive</button>`;
        document.getElementById('confirm').onclick = async ()=>{
          const code = document.getElementById('code').value.trim();
          const ok = await window.Lotri.security.verifyTotp(secret, code);
          if (!ok) { window.Lotri.toast('Le code est incorrect','error'); return; }
          const { error } = await SB().rpc('jl9_rpc_set_totp', { _secret: secret, _enabled: true });
          if (error) { window.Lotri.toast(error.message,'error'); return; }
          window.Lotri.toast('2FA aktive','success'); LotriShell.render();
        };
      };
      const offBtn = document.getElementById('off');
      if (offBtn) offBtn.onclick = async ()=>{
        if (!await window.Lotri.ui.confirm('Désactiver la 2FA ?', 'Ce compte ne demandera plus de code à 6 chiffres.', { danger:true })) return;
        const { error } = await SB().rpc('jl9_rpc_set_totp', { _secret: null, _enabled: false });
        if (error) window.Lotri.toast(error.message,'error');
        else { window.Lotri.toast('2FA dezaktive','success'); LotriShell.render(); }
      };
    }
  });

  /* ---------- Profil detaye ---------- */
  LotriShell.register('profiles', {
    render: async (host)=>{
      const { data: cos } = await SB().from('jl9_companies').select('id,name,logo_url,status,created_at').is('deleted_at',null).order('name');
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Profil de la compagnie</h3></div>
        <div class="form-row"><label class="label">Choisir une compagnie</label>
          <select class="select" id="pick">${(cos||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option value="">—</option>'}</select></div>
        <div id="p"></div></div>`;
      const load = async ()=>{
        const id = document.getElementById('pick').value; if (!id) return;
        const co = (cos||[]).find(c=> c.id === id);
        const [{count:agents},{data:tk}] = await Promise.all([
          SB().from('jl9_agents').select('id',{count:'exact',head:true}).eq('company_id', id).is('deleted_at',null),
          SB().from('jl9_tickets').select('total,status').eq('company_id', id).limit(1000)
        ]);
        const sales = (tk||[]).filter(t=>t.status!=='cancelled').reduce((a,t)=>a+Number(t.total||0),0);
        document.getElementById('p').innerHTML = `
          <div class="profile-viewer">
            <div class="card profile-card">
              ${co.logo_url ? `<img src="${esc(co.logo_url)}" alt="" style="max-width:120px;margin:0 auto .7rem;display:block">`
                            : `<div class="ava">${esc((co.name||'K').charAt(0).toUpperCase())}</div>`}
              <strong>${esc(co.name)}</strong>
              <div><span class="badge ${co.status==='active'?'badge-success':''}">${esc(co.status||'—')}</span></div>
            </div>
            <div class="card">
              <div class="kv"><span class="k">Créer</span><span>${new Date(co.created_at).toLocaleDateString()}</span></div>
              <div class="kv"><span class="k">Agent aktif</span><span>${agents||0}</span></div>
              <div class="kv"><span class="k">Ticket</span><span>${(tk||[]).length}</span></div>
              <div class="kv"><span class="k">Ventes total</span><span class="mono">${sales.toFixed(2)} HTG</span></div>
            </div>
          </div>`;
      };
      document.getElementById('pick').addEventListener('change', load);
      await load();
    }
  });
})();
