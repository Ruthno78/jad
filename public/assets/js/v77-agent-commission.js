/* V77 — Commission individuelle par agent.
   Le backend JL68 reste la base. Ce module ajoute uniquement la table
   de commission dédiée (migration SQL fournie dans supabase/).
   Règles: Agent = lecture seule de sa commission; Employeur = lecture seule;
   Admin Compagnie = gestion de sa compagnie; Super Admin = gestion globale. */
(function(){
  if (!window.LotriShell) return;
  const SB=()=>window.Lotri&&window.Lotri.supabase;
  const esc=s=>window.Lotri&&window.Lotri.escapeHtml?window.Lotri.escapeHtml(String(s??'')):String(s??'');
  const money=n=>Number(n||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' HTG';
  const role=()=>String((window.__lotriProfile||{}).role||'').toLowerCase();
  const canEdit=()=>['company','super_admin'].includes(role());
  const isAgent=()=>role()==='agent';
  const isEmployer=()=>role()==='employer';
  const validRate=v=>{const n=Number(v); if(!Number.isFinite(n)||n<0||n>100) throw new Error('Le taux doit être compris entre 0 et 100 %.'); return Math.round(n*100)/100;};

  async function ensureProfile(){ const p=await window.Lotri.getProfile(); if(!p) throw new Error('Profil utilisateur introuvable.'); window.__lotriProfile=p; return p; }

  async function readCommissions(agentIds){
    if(!agentIds.length) return [];
    const {data,error}=await SB().from('jl9_agent_commissions').select('agent_id,company_id,commission_rate,updated_at,updated_by').in('agent_id',agentIds);
    if(error) throw new Error('Le module de commission V77 nécessite la migration SQL fournie dans supabase/ : '+error.message);
    return data||[];
  }

  async function saveRate(agentId, companyId, value){
    if(!canEdit()) throw new Error('Vous n\'avez pas l\'autorisation de modifier cette commission.');
    const rate=validRate(value);
    const p=await ensureProfile();
    if(role()==='company' && String(p.company_id)!==String(companyId)) throw new Error('Accès refusé : cet Agent appartient à une autre compagnie.');
    const {error}=await SB().from('jl9_agent_commissions').upsert({agent_id:agentId,company_id:companyId,commission_rate:rate,updated_by:p.id,updated_at:new Date().toISOString()},{onConflict:'agent_id'});
    if(error) throw new Error(error.message||'Impossible d’enregistrer la commission.');
    return rate;
  }

  async function loadSales(agentIds){
    if(!agentIds.length) return new Map();
    // V78: ne pas tronquer les données financières à 5 000 tickets.
    // On pagine les lignes côté client jusqu'à épuisement. Le calcul définitif
    // devrait idéalement être fait côté serveur/RPC pour les très gros volumes.
    const m=new Map(agentIds.map(id=>[String(id),0]));
    const pageSize=1000;
    for(let from=0;;from+=pageSize){
      const {data,error}=await SB().from('jl9_tickets').select('agent_id,total,status,created_by')
        .in('agent_id',agentIds).order('created_at',{ascending:false}).range(from,from+pageSize-1);
      if(error) throw error;
      const rows=data||[];
      rows.forEach(t=>{
        if(String(t.status||'').toLowerCase()==='cancelled') return;
        const id=t.agent_id;
        if(id==null) return;
        const amount=Number(t.total??0)||0;
        m.set(String(id),(m.get(String(id))||0)+amount);
      });
      if(rows.length<pageSize) break;
    }
    return m;
  }

  function renderTable(host, rows, editable){
    host.innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>Agent</th><th>Compagnie</th><th>Taux</th><th class="num">Ventes</th><th class="num">Commission</th>${editable?'<th>Action</th>':''}</tr></thead><tbody>${rows.map(r=>`<tr>
      <td><strong>${esc(r.full_name||'—')}</strong><div class="muted mono">${esc(r.public_id||'')}</div></td>
      <td>${esc(r.company_name||'—')}</td>
      <td>${editable?`<input class="input input-sm" style="max-width:110px" type="number" min="0" max="100" step="0.01" value="${r.rate.toFixed(2)}" data-commission-input="${esc(r.id)}"> %`:`<strong>${r.rate.toFixed(2)} %</strong>`}</td>
      <td class="num">${money(r.sales)}</td><td class="num"><strong>${money(r.commission)}</strong></td>
      ${editable?`<td><button class="btn btn-sm btn-primary" data-save-commission="${esc(r.id)}">Enregistrer</button></td>`:''}
    </tr>`).join('')||`<tr><td colspan="${editable?6:5}"><div class="empty">Aucun Agent.</div></td></tr>`}</tbody></table></div>`;
    if(editable){
      host.querySelectorAll('[data-save-commission]').forEach(btn=>btn.onclick=async()=>{
        const id=btn.dataset.saveCommission, input=host.querySelector(`[data-commission-input="${CSS.escape(id)}"]`), row=rows.find(x=>String(x.id)===String(id));
        btn.disabled=true;
        try{ const rate=await saveRate(id,row.company_id,input.value); row.rate=rate; row.commission=row.sales*rate/100; window.Lotri.toast('Commission mise à jour avec succès.','success'); renderTable(host,rows,editable); }
        catch(e){window.Lotri.toast(e.message||'Erreur','error'); btn.disabled=false;}
      });
    }
  }

  async function agentsForCompany(companyId){
    const {data,error}=await SB().from('jl9_agents').select('id,public_id,full_name,status,company_id,jl9_companies(name)').eq('company_id',companyId).order('full_name');
    if(error) throw error;
    return (data||[]).map(a=>({...a,company_name:a.jl9_companies?.name||'—'}));
  }

  async function renderManager(host){
    const p=await ensureProfile();
    const superAdmin=role()==='super_admin';
    const companyId=superAdmin?null:p.company_id;
    host.innerHTML=`<section class="card v77-agent-commission"><div class="v77-commission-hero"><span class="eyebrow">Commission</span><h2>Centre des commissions</h2><p>Suivi basé sur les ventes réelles du backend JL68, avec un taux individuel pour chaque Agent.</p><span class="hero-rate" aria-hidden="true">%</span></div><div class="card-hd"><div><h2>Gestion des commissions</h2><p class="muted">Chaque Agent possède son propre taux de commission.</p></div><button class="btn btn-ghost" id="v77-refresh">Actualiser</button></div>
      ${superAdmin?'<div class="field" style="max-width:420px"><label class="label">Compagnie</label><select class="select" id="v77-company"><option value="">— Sélectionner une compagnie —</option></select></div>':''}
      <div id="v77-commission-body"><div class="empty">Chargement…</div></div></section>`;
    const companySel=host.querySelector('#v77-company');
    if(superAdmin){
      const {data,error}=await SB().from('jl9_companies').select('id,name').order('name');
      if(error) throw error;
      companySel.innerHTML='<option value="">— Sélectionner une compagnie —</option>'+(data||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
      companySel.onchange=()=>load(companySel.value);
    }
    const load=async(cid=companyId)=>{
      const body=host.querySelector('#v77-commission-body');
      if(!cid){body.innerHTML='<div class="empty">Sélectionnez une compagnie pour afficher les Agents.</div>';return;}
      try{
        const agents=await agentsForCompany(cid), commissions=await readCommissions(agents.map(a=>a.id)), rates=new Map(commissions.map(c=>[String(c.agent_id),Number(c.commission_rate)||0])), sales=await loadSales(agents.map(a=>a.id));
        const rows=agents.map(a=>{const rate=rates.get(String(a.id))||0,s=sales.get(String(a.id))||0;return {...a,rate,sales:s,commission:s*rate/100};});
        const totals=rows.reduce((x,r)=>({sales:x.sales+r.sales,commission:x.commission+r.commission}),{sales:0,commission:0});
        body.innerHTML=`<div class="v77-ac-summary"><div class="v77-ac-stat"><small>Agents</small><strong>${rows.length}</strong></div><div class="v77-ac-stat"><small>Ventes</small><strong>${money(totals.sales)}</strong></div><div class="v77-ac-stat"><small>Commission totale</small><strong>${money(totals.commission)}</strong></div></div><div id="v77-table"></div>`;
        renderTable(body.querySelector('#v77-table'),rows,canEdit());
      }catch(e){body.innerHTML=`<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(e.message||e)}</div>`;}
    };
    host.querySelector('#v77-refresh').onclick=()=>load(superAdmin?(companySel&&companySel.value):companyId);
    if(!superAdmin) await load(companyId);
  }

  async function renderReadOnlyAgent(host){
    const p=await ensureProfile();
    if(!p.agent_id){host.innerHTML='<div class="card"><div class="empty">Aucun Agent associé à ce compte.</div></div>';return;}
    const {data:agents,error:ae}=await SB().from('jl9_agents').select('id,public_id,full_name,company_id,jl9_companies(name)').eq('id',p.agent_id).maybeSingle();
    if(ae) throw ae;
    const commissions=await readCommissions(agents?[agents.id]:[]), c=commissions[0];
    const rate=Number(c?.commission_rate)||0, sales=(await loadSales([p.agent_id])).get(String(p.agent_id))||0;
    host.innerHTML=`<section class="card v77-agent-commission"><div class="card-hd"><div><h2>Ma Commission</h2><p class="muted">Votre taux est défini par un administrateur autorisé.</p></div></div><div class="v77-ac-summary"><div class="v77-ac-stat"><small>Taux de commission</small><strong>${rate.toFixed(2)} %</strong></div><div class="v77-ac-stat"><small>Ventes</small><strong>${money(sales)}</strong></div><div class="v77-ac-stat"><small>Commission</small><strong>${money(sales*rate/100)}</strong></div></div><p class="muted">Vous pouvez consulter votre commission, mais vous ne disposez d’aucune fonction permettant de la modifier.</p></section>`;
  }

  async function renderEmployer(host){
    // Employeur = consultation uniquement. Il ne reçoit aucun contrôle d’édition.
    const p=await ensureProfile();
    host.innerHTML='<section class="card v77-agent-commission"><div class="card-hd"><div><h2>Commissions</h2><p class="muted">Consultation uniquement.</p></div><button class="btn btn-ghost" id="v77-refresh">Actualiser</button></div><div id="v77-body"><div class="empty">Chargement…</div></div></section>';
    const load=async()=>{
      try{
        const {data:agents,error}=await SB().from('jl9_agents').select('id,public_id,full_name,company_id,jl9_companies(name)').order('full_name'); if(error) throw error;
        const as=(data||agents||[]).map(a=>({...a,company_name:a.jl9_companies?.name||'—'}));
        const commissions=await readCommissions(as.map(a=>a.id)), rates=new Map(commissions.map(c=>[String(c.agent_id),Number(c.commission_rate)||0])), sales=await loadSales(as.map(a=>a.id));
        const rows=as.map(a=>{const rate=rates.get(String(a.id))||0,s=sales.get(String(a.id))||0;return {...a,rate,sales:s,commission:s*rate/100};});
        renderTable(host.querySelector('#v77-body'),rows,false);
      }catch(e){host.querySelector('#v77-body').innerHTML=`<div class="empty">${esc(e.message||e)}</div>`;}
    };
    host.querySelector('#v77-refresh').onclick=load; await load();
  }

  async function renderReportSummary(host){
    const p=await ensureProfile();
    let q=SB().from('jl9_agents').select('id,company_id').order('id');
    if(role()==='company') q=q.eq('company_id',p.company_id);
    const {data:agents,error}=await q; if(error) throw error;
    const as=agents||[];
    if(!as.length){ host.innerHTML=''; return; }
    const commissions=await readCommissions(as.map(a=>a.id));
    const rates=new Map(commissions.map(c=>[String(c.agent_id),Number(c.commission_rate)||0]));
    const sales=await loadSales(as.map(a=>a.id));
    let totalSales=0,totalCommission=0;
    as.forEach(a=>{const s=sales.get(String(a.id))||0; const r=rates.get(String(a.id))||0; totalSales+=s; totalCommission+=s*r/100;});
    host.innerHTML=`<div class="v77-report-commission">
      <div><span>Commission Agents</span><strong>${money(totalCommission)}</strong></div>
      <div><span>Ventes éligibles</span><strong>${money(totalSales)}</strong></div>
      <div><span>Agents concernés</span><strong>${as.length}</strong></div>
    </div>`;
  }

  window.JadstackAgentCommission={
    getRate:()=>0,
    setRate:async(id,value)=>{ const {data:a,error}=await SB().from('jl9_agents').select('company_id').eq('id',id).maybeSingle(); if(error) throw error; return saveRate(id,a.company_id,value); },
    renderDashboard:renderManager,
    renderReportSummary
  };

  LotriShell.register('commission',{render:async host=>{
    try{
      if(isAgent()) return renderReadOnlyAgent(host);
      if(isEmployer()) return renderEmployer(host);
      if(canEdit()) return renderManager(host);
      host.innerHTML='<div class="card"><div class="empty">Accès non autorisé.</div></div>';
    }catch(e){host.innerHTML=`<div class="card"><div class="empty"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(e.message||e)}</div></div>`;}
  }});
})();
