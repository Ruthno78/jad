/* JADSTACK LOTTO V12 — PAJ KONPAYI INIFYE (§1 + §2) */
(function () {
  const L = window.Lotri, v12 = L.v12, SB = () => L.supabase, esc = v12.esc;
  window.LotriShell.register('v12-company', {
    async render(host) {
      const p = window.__lotriProfile || {};
      let c = {};
      if (p.company_id) {
        const { data } = await SB().from('jl9_companies').select('*').eq('id', p.company_id).maybeSingle();
        c = data || {};
      }
      host.innerHTML = `
        ${L.v11 ? L.v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'Ma compagnie' }]) : ''}
        <div class="jl-card"><h3><i class="fa-solid fa-building"></i> Ma compagnie</h3>
          <p class="muted" style="font-size:.78rem;margin-top:-.4rem">
            Logo ak non konpayi a nan yon sèl kote — pa gen doub paj ankò.</p>
          <div class="jl-form-grid" style="align-items:start">
            <div>${v12.imageDrop({ name: 'logo', src: c.logo_url || '', round: true, folder: 'konpayi', label: 'Logo de la compagnie a' })}</div>
            <div><label class="label">Nom de la compagnie a</label><input class="input" id="cname" value="${esc(c.name || '')}"></div>
            <div><label class="label">E-mail</label><input class="input" id="cemail" type="email" value="${esc(c.email || '')}"></div>
            <div><label class="label">Téléphone</label><input class="input" id="cphone" value="${esc(c.phone || '')}"></div>
            <div><label class="label">Adresse</label><input class="input" id="caddr" value="${esc(c.address || '')}"></div>
            <div><label class="label">${esc(L.t ? L.t('ticket.lang.title', 'Langue de la fiche') : 'Langue de la fiche')}</label>
              <select class="input" id="cticketlang">
                <option value="">${esc(L.t ? L.t('ticket.lang.platform_default', '— Valeur par défaut de la plateforme —') : '— Valeur par défaut de la plateforme —')}</option>
                <option value="fr">Français</option>
                <option value="ht">Créole</option>
                <option value="en">English</option>
              </select>
              <small class="muted">${esc(L.t ? L.t('ticket.lang.help', 'Cela n\'affecte pas la langue de votre navigation.') : 'Cela n\'affecte pas la langue de votre navigation.')}</small></div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:.9rem">
            <button class="btn btn-primary" id="csave"><i class="fa-solid fa-check"></i> Enregistrer</button></div>
        </div>`;
      const tlSel = host.querySelector('#cticketlang');
      if (tlSel) tlSel.value = c.ticket_lang || '';
      host.querySelector('#csave').onclick = async () => {
        const g = id => (host.querySelector('#' + id).value || '').trim();
        try {
          const res = await v12.rpc('jl12_rpc_save_company', {
            _name: g('cname'), _logo: v12.imageValue(host, 'logo'), _email: g('cemail'),
            _phone: g('cphone'), _address: g('caddr')
          });
          if (tlSel && tlSel.value !== (c.ticket_lang || '')) {
            const { error: tlErr } = await SB().rpc('jl30_rpc_set_own_ticket_lang', { _lang: tlSel.value || null });
            if (tlErr) throw tlErr;
          }
          L.toast('Les informations de la compagnie sont enregistrées.', 'success');
          if (window.Lotri.branding && res && res.logo_url) window.Lotri.branding.refresh && window.Lotri.branding.refresh();
        } catch (e) { L.toast(e.message, 'error'); }
      };
    }
  });
})();
