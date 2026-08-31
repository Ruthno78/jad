/* JADSTACK LOTTO V82 — Complete patch
 * Additive: history, global audit filters, bulk ticket soft-delete, daily dashboard date,
 * email admin-only guard, mobile print/history helpers. No secrets are stored here.
 */
(function(){
  'use strict';
  const L=window.Lotri||{};
  const SB=()=>L.supabase;
  const esc=L.escapeHtml||((s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const role=()=>String((window.__lotriProfile||{}).role||'').toLowerCase();
  const isSA=()=>role()==='super_admin';
  const isAdmin=()=>['super_admin','mini_super_admin','employer'].includes(role());
  const localDate=(d=new Date())=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  const money=n=>Number(n||0).toLocaleString('fr-HT',{minimumFractionDigits:2,maximumFractionDigits:2})+' HTG';

  // --- Print/reprint helper: never creates a ticket ---
  if(!L.v82) L.v82={};
  L.v82.reprint=async function(id){
    if(!id) return false;
    try{
      const {data:t,error}=await SB().from('jl9_tickets').select('*').eq('id',id).maybeSingle();
      if(error||!t){L.toast((error&&error.message)||'Fiche introuvable.','error');return false;}
      if(typeof L.showTicketDetail==='function'){L.showTicketDetail(id);return true;}
      return false;
    }catch(e){L.toast(e.message||'Impossible de réimprimer.','error');return false;}
  };

  // --- Global audit center (Super Admin only) ---
  LotriShell.register('audit', {render: async(host)=>{
    if(!isSA()){host.innerHTML='<div class="empty">Accès réservé au Super Admin.</div>';return;}
    host.innerHTML=`<div class="page-hd"><h2>Centre d’audit global</h2><p class="muted">Toutes les actions disponibles dans les journaux du système.</p></div>
      <div class="card"><div class="v82-history-toolbar">
        <input class="input" id="a-q" placeholder="Rechercher action / cible / résumé">
        <input class="input" id="a-date" type="date">
        <select class="input" id="a-role"><option value="">Tous les rôles</option><option value="super_admin">Super Admin</option><option value="employer">Mini Super Admin</option><option value="mini_super_admin">Mini Super Admin</option><option value="company">Compagnie</option><option value="agent">Agent</option></select>
        <select class="input" id="a-source"><option value="all">Tous les journaux</option><option value="audit">Audit</option><option value="activity">Activité</option></select>
        <button class="btn btn-ghost" id="a-refresh">Actualiser</button>
      </div><div id="a-list"><div class="spinner"></div></div></div>`;
    let rows=[];
    async function load(){
      const [a,b]=await Promise.all([
        SB().from('jl9_audit_logs').select('*').order('created_at',{ascending:false}).limit(500),
        /* KOREKSYON: tab la rele 'jl16_activity' (jan jl16_rpc_log_activity ekri l),
           'jl_activity_log' pa t janm egziste — sa te bloke Sant Odit la san erè vizib. */
        SB().from('jl16_activity').select('*').order('created_at',{ascending:false}).limit(500)
      ]);
      rows=[];
      (a.data||[]).forEach(x=>rows.push({...x,__source:'audit'}));
      (b.data||[]).forEach(x=>rows.push({...x,__source:'activity'}));
      rows.sort((x,y)=>new Date(y.created_at)-new Date(x.created_at));
      paint();
    }
    function paint(){
      const q=(host.querySelector('#a-q').value||'').trim().toLowerCase(), dt=host.querySelector('#a-date').value, rr=host.querySelector('#a-role').value, src=host.querySelector('#a-source').value;
      let list=rows.filter(x=>{
        if(src!=='all'&&x.__source!==src)return false;
        if(dt&&localDate(new Date(x.created_at))!==dt)return false;
        const blob=JSON.stringify(x).toLowerCase();
        if(q&&!blob.includes(q))return false;
        if(rr&&!blob.includes(rr.toLowerCase()))return false;
        return true;
      }).slice(0,500);
      host.querySelector('#a-list').innerHTML=list.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Source</th><th>Action</th><th>Cible</th><th>Résumé / Meta</th></tr></thead><tbody>${list.map(x=>`<tr><td class="muted">${esc(new Date(x.created_at).toLocaleString())}</td><td><span class="badge">${esc(x.__source)}</span></td><td><span class="badge">${esc(x.action||'—')}</span></td><td>${esc(x.target||x.target_id||'—')}</td><td class="mono" style="font-size:.7rem">${esc(x.summary||JSON.stringify(x.meta||x.payload||{}))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Aucune activité trouvée.</div>';
    }
    ['a-q','a-date','a-role','a-source'].forEach(id=>host.querySelector('#'+id).addEventListener('input',paint));
    host.querySelector('#a-refresh').onclick=load; await load();
  }});

  // --- Historical tickets + safe bulk soft-delete ---
  LotriShell.register('ticket-history',{render:async(host)=>{
    if(!isSA()){host.innerHTML='<div class="empty">Accès réservé au Super Admin.</div>';return;}
    host.innerHTML=`<div class="page-hd"><h2>Fiches — Historique</h2><p class="muted">Les fiches ne sont jamais supprimées automatiquement à 00:00. Cette page permet de retrouver les anciennes dates.</p></div>
      <div class="card"><div class="v82-history-toolbar">
        <input class="input" id="h-q" placeholder="N° fiche">
        <input class="input" id="h-from" type="date" value="${localDate()}">
        <input class="input" id="h-to" type="date" value="${localDate()}">
        <select class="input" id="h-status"><option value="">Tous les statuts</option><option>active</option><option>won</option><option>lost</option><option>paid</option><option>cancelled</option></select>
        <button class="btn btn-primary" id="h-load">Rechercher</button>
      </div>
      <div class="row" style="justify-content:space-between;gap:.5rem;flex-wrap:wrap">
        <span id="h-count" class="v82-kpi"></span>
        <button class="btn btn-danger" id="h-delete">Supprimer les fiches filtrées (soft delete)</button>
      </div><div id="h-list" style="margin-top:.8rem"><div class="spinner"></div></div></div>`;
    let rows=[];
    async function load(){
      const from=host.querySelector('#h-from').value||localDate(),to=host.querySelector('#h-to').value||from,q=host.querySelector('#h-q').value.trim(),st=host.querySelector('#h-status').value;
      let qry=SB().from('jl9_tickets').select('id,ticket_no,agent_id,company_id,draw_id,total,prize_amount,status,created_at,deleted_at').gte('created_at',from+'T00:00:00').lte('created_at',to+'T23:59:59').order('created_at',{ascending:false}).limit(1000);
      if(q)qry=qry.ilike('ticket_no','%'+q.replace(/%/g,'')+'%'); if(st)qry=qry.eq('status',st);
      const {data,error}=await qry; if(error){host.querySelector('#h-list').innerHTML='<div class="empty">'+esc(error.message)+'</div>';return;}
      rows=data||[]; host.querySelector('#h-count').textContent=rows.length+' fiche(s) trouvée(s)';
      const ids=[...new Set(rows.map(x=>x.agent_id).filter(Boolean))], cids=[...new Set(rows.map(x=>x.company_id).filter(Boolean))];
      let agents=[],companies=[];
      if(ids.length){const r=await SB().from('jl9_agents').select('id,full_name').in('id',ids);agents=r.data||[]}
      if(cids.length){const r=await SB().from('jl9_companies').select('id,name').in('id',cids);companies=r.data||[]}
      const an=Object.fromEntries(agents.map(x=>[x.id,x.full_name])),cn=Object.fromEntries(companies.map(x=>[x.id,x.name]));
      host.querySelector('#h-list').innerHTML=rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Fiche</th><th>Date</th><th>Agent</th><th>Compagnie</th><th>Total</th><th>Statut</th><th>Supprimée</th><th></th></tr></thead><tbody>${rows.map(t=>`<tr><td class="mono">${esc(t.ticket_no||t.id)}</td><td>${esc(new Date(t.created_at).toLocaleString())}</td><td>${esc(an[t.agent_id]||'—')}</td><td>${esc(cn[t.company_id]||'—')}</td><td>${money(t.total)}</td><td>${esc(t.status||'—')}</td><td>${t.deleted_at?'<span class="badge badge-danger">Oui</span>':'<span class="badge badge-success">Non</span>'}</td><td><button class="btn btn-sm" data-open="${esc(t.id)}">Voir / Imprimer</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Aucune fiche pour cette période.</div>';
      host.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>L.showTicketDetail&&L.showTicketDetail(b.dataset.open));
    }
    host.querySelector('#h-load').onclick=load;
    host.querySelector('#h-delete').onclick=async()=>{
      if(!rows.length){L.toast('Aucune fiche filtrée.','error');return}
      if(!confirm('Confirmer le masquage de '+rows.length+' fiche(s) ? Les données restent conservées dans la base.'))return;
      const ids=rows.map(x=>x.id);
      const {data,error}=await SB().rpc('jl82_rpc_bulk_delete_tickets',{_ids:ids});
      if(error){L.toast(error.message,'error');return}
      L.toast((data&&data.count||ids.length)+' fiche(s) masquée(s). Historique conservé.','success'); await load();
    };
    await load();
  }});

  // --- Email configuration is Super Admin only ---
  if(L.mail){
    const oldOptin=L.mail.optin;
    if(oldOptin && typeof oldOptin.get==='function'){
      const originalSet=oldOptin.set;
      oldOptin.set=async function(){
        if(!isSA()){L.toast('Seul le Super Admin peut configurer les notifications e-mail.','error');return false;}
        return originalSet.apply(this,arguments);
      };
    }
  }

  // --- Daily rollover: refresh current dashboard at local midnight without deleting data ---
  function scheduleMidnight(){
    clearTimeout(L.v82.midnightTimer);
    const now=new Date(), next=new Date(now); next.setHours(24,0,2,0);
    L.v82.midnightTimer=setTimeout(()=>{ 
      try{localStorage.setItem('jl:v82:last_day',localDate());}catch(_){}
      const v=new URL(location.href).searchParams.get('view');
      if(v==='dashboard') window.dispatchEvent(new CustomEvent('jl82:day-rollover'));
      scheduleMidnight();
    },Math.max(1000,next-now));
  }
  scheduleMidnight();
  window.addEventListener('jl82:day-rollover',()=>{ if(location.pathname.includes('super-admin') && new URL(location.href).searchParams.get('view')==='dashboard') LotriShell.go('dashboard'); });

  // Patch stats RPC to use explicit local day. If backend V82 RPC exists, use it; otherwise preserve original.
  if(window.LotriStats && !window.LotriStats.__v82){
    const oldRender=window.LotriStats.render;
    window.LotriStats.render=async function(host,list,opts){
      opts=opts||{};
      if(!opts.date) opts.date=localDate();
      try{
        const {data,error}=await SB().rpc('jl82_rpc_dashboard_stats',{_date:opts.date});
        if(error) throw error;
        const s=data||{};
        host.innerHTML=`<div class="grid-stats">${(list||[]).map(k=>`<div class="card stat"><div class="lbl">${esc(k.label)}</div><div class="val">${esc(Number(s[k.key]??0).toLocaleString(undefined,{maximumFractionDigits:2}))}</div>${k.sub?`<div class="sub">${esc(k.sub)}</div>`:''}</div>`).join('')}</div>`;
      }catch(_){ return oldRender.call(this,host,list,opts); }
    };
    window.LotriStats.__v82=true;
  }
})();
