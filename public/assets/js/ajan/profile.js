/* =====================================================================
 * AJAN — V9.3 : « Profil de la compagnie » an LEKTI SÈLMAN
 *  - Menm antèt ak paj konpayi a (2 ti logo + non nan mitan).
 *  - Agent an PA ka chanje anyen: pa gen fòm, pa gen upload.
 *  - Yo rive isit la lè yo klike logo konpayi a nan sidemenu a.
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  LotriShell.register('aprofile', {
    render: async (host) => {
      const p = window.__lotriProfile;
      if (!p || !p.company_id) {
        host.innerHTML = `<div class="empty"><i class="fa-solid fa-building-circle-exclamation"></i>
          Compte ou pa lye ak yon konpayi.</div>`;
        return;
      }
      const { data: co, error } = await SB().from('jl9_companies')
        .select('id,public_id,name,email,phone,address,logo_url,created_at,country,department,email_2')
        .eq('id', p.company_id).maybeSingle();
      if (error || !co) {
        host.innerHTML = `<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>
          ${esc(error?.message || 'Votre compagnie est introuvable.')}</div>`;
        return;
      }
      const myAgentId = p.agent_id || null;

      const logoBox = (side) => `<div class="ph-logo" data-ph-logo="${side}">${co.logo_url
        ? `<img src="${esc(co.logo_url)}" alt="Logo ${esc(co.name)}">`
        : `<span class="fallback">${esc((co.name || 'K').charAt(0).toUpperCase())}</span>`}</div>`;

      const row = (label, val) => `<tr><th style="text-align:left;width:36%">${esc(label)}</th>
        <td>${esc(val || '—')}</td></tr>`;

      host.innerHTML = `
      <div class="profile-head">
        ${logoBox('left')}
        <div class="ph-mid">
          <h2 class="ph-name">${esc(co.name || '—')}</h2>
          <p class="ph-sub">Profil de la compagnie — lecture seule</p>
          <div class="ph-chips">
            <span class="chip mono">ID: ${esc(co.public_id || '—')}</span>
            <span class="badge"><i class="fa-solid fa-lock"></i> Vous ne pouvez pas modifier</span>
          </div>
        </div>
        ${logoBox('right')}
      </div>

      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Informations de la compagnie</h3></div>
        <p class="muted">Se konpayi w ap travay pou li. Sèlman konpayi a (ak Super Admin)
          ki ka chanje enfòmasyon sa yo.</p>
        <div class="table-wrap"><table class="table">
          <tbody data-company-detail="${esc(co.id)}" style="cursor:pointer" title="Cliquez pour voir plus de détails">
            ${row('Nom de la compagnie', co.name)}
            ${row('E-mail', co.email)}
            ${row('Téléphone', co.phone)}
            ${row('Adresse', co.address)}
            ${row('Idantifyan piblik', co.public_id)}
            ${row('Pays', co.country)}
            ${row('Département', co.department)}
          </tbody>
        </table></div>
      </div>

      <div class="card" style="margin-top:1.25rem">
        <div class="card-hd"><h3>Mon compte</h3></div>
        <div class="table-wrap"><table class="table">
          <tbody ${myAgentId ? `data-agent-detail="${esc(myAgentId)}" style="cursor:pointer" title="Cliquez pour voir plus de détails"` : ''}>
            ${row('Nom', p.full_name)}
            ${row('E-mail', p.email)}
            ${row('Rôle', String(p.role || '').replace('_', ' '))}
          </tbody>
        </table></div>
      </div>`;
    }
  });
})();
