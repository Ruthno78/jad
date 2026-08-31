/* =====================================================================
 * KONPAYI — vi v8 (adisyon)
 *  - cname   : Demandes chanjman non/logo konpayi (bezwen apwobasyon SA)
 *  - trash   : Corbeille (ajan / tikè / mesaj efase) ak restorasyon
 *  - machines: Surveillance des machines ajan yo
 * ===================================================================== */
(function(){
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  LotriShell.register('cname', {
    render: async (host)=>{
      const p = window.__lotriProfile;
      const { data: co } = await SB().from('jl9_companies').select('id,name,logo_url').eq('id', p.company_id).maybeSingle();
      const { data: reqs } = await SB().from('jl9_company_name_requests').select('*')
        .eq('company_id', p.company_id).order('created_at',{ascending:false}).limit(20);

      host.innerHTML = `
      <div class="card">
        <div class="card-hd"><h3>Modifier le nom / logo de la compagnie</h3></div>
        <p class="muted" style="margin-bottom:1rem">
          Chanjman sa a pa aplike touswit: Super Admin dwe apwouve l. W ap resevwa yon mesaj lè desizyon an pran.</p>
        <form id="f">
          <div class="form-grid">
            <div><label class="label">Nom aktyèl</label>
              <input class="input" value="${esc(co?.name||'')}" disabled></div>
            <div><label class="label">Nouvo non</label>
              <input class="input" name="new_name" required maxlength="80" placeholder="Le nom souhaité"></div>
          </div>
          <div class="form-row"><label class="label">Nouveau logo (URL)</label>
            <input class="input" name="new_logo_url" type="url" placeholder="https://…"></div>
          <div class="form-row"><label class="label">Rezon (opsyonèl)</label>
            <textarea class="textarea" name="reason" rows="3" maxlength="400"></textarea></div>
          <button class="btn btn-primary" id="send"><i class="fa-solid fa-paper-plane"></i> Envoyer la demande</button>
        </form>
      </div>

      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Mes demandes</h3></div>
        ${(reqs||[]).length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Date</th><th>Nouvo non</th><th>Statut</th><th>Note</th></tr></thead><tbody>
          ${reqs.map(r=>`<tr>
            <td class="muted">${new Date(r.created_at).toLocaleString()}</td>
            <td>${esc(r.new_name||'')}</td>
            <td><span class="badge ${['apwouve','approved'].includes(r.status)?'badge-success':['refize','rejected'].includes(r.status)?'badge-danger':'badge-warning'}">${esc(r.status)}</span></td>
            <td class="muted">${esc(r.review_note||'—')}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><i class="fa-regular fa-paper-plane"></i>Aucune demande.</div>'}
      </div>`;

      document.getElementById('f').addEventListener('submit', async (e)=>{
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.target).entries());
        if (!fd.new_name || fd.new_name.trim().length < 2) { window.Lotri.toast('Saisissez un nom valide','error'); return; }
        await window.Lotri.ui.busy(document.getElementById('send'), async ()=>{
          const { error } = await SB().rpc('jl9_rpc_request_company_name', {
            _company: p.company_id, _new_name: fd.new_name.trim(),
            _new_logo: fd.new_logo_url || null, _reason: fd.reason || null });
          if (error) { window.Lotri.toast(error.message,'error'); return; }
          window.Lotri.toast('Demande envoyée au Super Administrateur','success');
          LotriShell.render();
        });
      });
    }
  });

  LotriShell.register('trash', {
    render: async (host)=> window._sharedTrash(host, window.__lotriProfile.company_id)
  });
  LotriShell.register('machines', {
    render: async (host)=> window._sharedMachines(host, window.__lotriProfile.company_id)
  });
})();
