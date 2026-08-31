/* =====================================================================
 * v8 — Vi pataje (Corbeille, Surveillance des machines, Ping prezans)
 * Chaje pa Compagnie ak Super Admin.
 * ===================================================================== */
(function(){
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  const TABLES = [
    { t:'agents',   label:'Agent',  cols:['full_name','username'] },
    { t:'tickets',  label:'Ticket',  cols:['ticket_no','total'] },
    { t:'messages', label:'Messages', cols:['title','audience'] }
  ];

  window._sharedTrash = async (host, scopeCompany)=>{
    host.innerHTML = `<div class="card"><div class="card-hd"><h3>Corbeille</h3>
      <span class="muted" style="font-size:.8rem">Les éléments supprimés restent 30 jours.</span></div>
      <div id="tw"></div></div>`;
    const parts = [];
    for (const spec of TABLES){
      let q = SB().from(spec.t).select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}).limit(50);
      if (scopeCompany) q = q.eq('company_id', scopeCompany);
      const { data } = await q;
      parts.push(`<h4 style="margin:1rem 0 .5rem">${spec.label}</h4>` + ((data||[]).length
        ? `<div class="table-wrap"><table class="table"><thead><tr>${spec.cols.map(c=>`<th>${esc(c)}</th>`).join('')}<th>Supprimer</th><th></th></tr></thead><tbody>
           ${data.map(r=>`<tr class="trash-row">${spec.cols.map(c=>`<td>${esc(r[c] ?? '')}</td>`).join('')}
             <td class="muted">${new Date(r.deleted_at).toLocaleString()}</td>
             <td><button class="btn btn-sm" data-restore="${spec.t}:${r.id}"><i class="fa-solid fa-rotate-left"></i> Restaurer</button></td></tr>`).join('')}
           </tbody></table></div>`
        : '<div class="empty"><i class="fa-regular fa-trash-can"></i>Vide.</div>'));
    }
    document.getElementById('tw').innerHTML = parts.join('');
    host.addEventListener('click', async (e)=>{
      const b = e.target.closest('[data-restore]'); if (!b) return;
      const [t, id] = b.dataset.restore.split(':');
      const { error } = await SB().rpc('jl9_rpc_restore', { _table: t, _id: id });
      if (error) window.Lotri.toast(error.message,'error');
      else { window.Lotri.toast('Restaurer','success'); window._sharedTrash(host, scopeCompany); }
    });
  };

  window._sharedMachines = async (host, companyId)=>{
    host.innerHTML = `<div class="card"><div class="card-hd"><h3>Surveillance des machines</h3>
      <button class="btn btn-sm" id="rf"><i class="fa-solid fa-rotate"></i> Actualiser</button></div>
      <div id="m"></div></div>`;
    const load = async ()=>{
      let q = SB().from('jl9_agents').select('id,full_name,username,status,last_seen_at,device_label,company_id')
        .is('deleted_at', null).order('full_name');
      if (companyId) q = q.eq('company_id', companyId);
      const { data } = await q;
      const rows = data || [];
      const online = (a)=> a.last_seen_at && (Date.now() - new Date(a.last_seen_at).getTime() < 5*60*1000);
      document.getElementById('m').innerHTML = rows.length
        ? `<div class="grid-stats" style="margin-bottom:1rem">
             <div class="card stat"><div class="lbl">Machines au total</div><div class="val">${rows.length}</div></div>
             <div class="card stat"><div class="lbl">En ligne</div><div class="val">${rows.filter(online).length}</div></div>
             <div class="card stat"><div class="lbl">Fermer</div><div class="val">${rows.filter(a=>!online(a)).length}</div></div>
           </div>
           <div class="table-wrap"><table class="table"><thead><tr><th>Agent</th><th>Appareil</th><th>Statut</th><th>Dernière activité</th></tr></thead><tbody>
           ${rows.map(a=>`<tr><td>${esc(a.full_name||a.username||'—')}</td>
             <td class="mono" style="font-size:.78rem">${esc(a.device_label||'—')}</td>
             <td><span class="machine-dot ${online(a)?'on':'off'}"></span>${online(a)?'En ligne':'Fermer'}</td>
             <td class="muted">${a.last_seen_at ? new Date(a.last_seen_at).toLocaleString() : '—'}</td></tr>`).join('')}
           </tbody></table></div>`
        : '<div class="empty"><i class="fa-solid fa-desktop"></i>Aucune machine.</div>';
    };
    document.getElementById('rf').onclick = load;
    await load();
  };

  /* Ping prezans — sa ki fè siveyans machin nan travay */
  const ping = async ()=>{
    try { await SB().rpc('jl9_rpc_ping_presence', { _device: navigator.userAgent.slice(0,120) }); } catch(_){}
  };
  document.addEventListener('lotri:ready', ()=>{ ping(); setInterval(ping, 2*60*1000); });
})();
