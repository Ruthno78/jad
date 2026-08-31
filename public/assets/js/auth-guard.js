// Enkli sa nan chak paj prive AVAN scripts espesifik paj la.
// Data-role sou <html> pou di ki wòl ki gen dwa antre.
(async function(){
  const need = document.documentElement.dataset.role;

  function showFatalError(msg){
    const host = document.querySelector('.app-loading') || document.body;
    host.innerHTML = `
      <div style="max-width:420px;margin:3rem auto;text-align:center;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:1.75rem;color:var(--danger);display:block;margin-bottom:1rem;"></i>
        <h3 style="margin-bottom:.5rem;">Connexion impossible</h3>
        <p class="muted" style="margin-bottom:1.25rem;">${msg}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">
          <i class="fa-solid fa-arrows-rotate"></i> Réessayer
        </button>
        <button class="btn btn-ghost" style="margin-left:.5rem;" onclick="window.location.href='auth.html'">
          Tounen nan koneksyon
        </button>
      </div>`;
  }

  // Compte ki konekte men PA lye ak okenn konpayi — pa kite moun nan wè
  // UI a menm, popup dirèk sou paj koneksyon an ak yon fason senp pou
  // avèti sipò (fòm sit la, ak fallback WhatsApp/imèl).
  async function showNotLinkedBlock(){
    const host = document.querySelector('.app-loading') || document.body;
    try { if (window.Lotri.loadConfig) await window.Lotri.loadConfig(); } catch(_){}
    const cfg = (window.Lotri.config && window.Lotri.config.contact) || {};
    const wa = (cfg.whatsapp || '').replace(/[^\d]/g, '');
    const waMsg = encodeURIComponent('Mon compte est connecté mais il n\'est rattaché à aucune compagnie sur JADSTACK LOTTO. Pouvez-vous vérifier ?');
    host.innerHTML = `
      <div style="max-width:440px;margin:3rem auto;text-align:center;">
        <i class="fa-solid fa-link-slash" style="font-size:1.75rem;color:var(--warning);display:block;margin-bottom:1rem;"></i>
        <h3 style="margin-bottom:.5rem;">Votre compte n\'est lié à aucune compagnie</h3>
        <p class="muted" style="margin-bottom:1.25rem;">
          Vous konekte, men kont ou poko lye ak yon konpayi valab sou platfòm lan.
          Sa pa yon erè ou fè — kontakte administratè platfòm lan pou li ka
          verifye epi mare kont ou byen vit.</p>
        <div id="nlb-err" class="alert alert-error" style="display:none;color:var(--danger);font-size:.85rem;margin-bottom:.75rem;"></div>
        <button class="btn btn-primary btn-lg" id="nlb-send" style="width:100%;margin-bottom:.6rem;">
          <i class="fa-solid fa-bell"></i> Avèti administratè a
        </button>
        ${wa ? `<a class="btn btn-ghost" style="width:100%;margin-bottom:.6rem;" target="_blank" rel="noopener"
              href="https://wa.me/${wa}?text=${waMsg}"><i class="fa-brands fa-whatsapp"></i> Ekri sou WhatsApp</a>` : ''}
        <button class="btn btn-ghost" style="width:100%" onclick="window.Lotri.signOut && window.Lotri.signOut()">
          Déconnexion
        </button>
      </div>`;
    const btn = document.getElementById('nlb-send');
    if (!window.Lotri.mail || !window.Lotri.mail.post) { btn.disabled = true; }
    btn.onclick = async () => {
      if (!window.Lotri.mail || !window.Lotri.mail.post) return;
      const errEl = document.getElementById('nlb-err');
      errEl.style.display = 'none';
      try {
        await window.Lotri.ui.busy(btn, async () => {
          const sess = await window.Lotri.getSession();
          const email = sess && sess.user && sess.user.email || '(e-mail non disponible)';
          const list = ((cfg.emails || []).filter(e => e && e.active && e.email).map(e => e.email.trim()))
            .concat([ (window.Lotri.config && window.Lotri.config.footer && window.Lotri.config.footer.email) ])
            .filter(Boolean);
          const res = await window.Lotri.mail.post({
            to: list[0], cc: list.slice(1).concat(window.Lotri.mail.alwaysCc ? window.Lotri.mail.alwaysCc() : []),
            subject: 'JADSTACK LOTTO — compte non rattaché à une compagnie',
            fields: {
              'Problème': 'Compte connecté mais rattaché à aucune compagnie',
              'E-mail du compte': email,
              'ID itilizatè': (sess && sess.user && sess.user.id) || '—'
            }
          });
          if (!res || !res.ok) throw new Error('x');
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Avèti — n ap kontakte w';
        });
      } catch (_) {
        errEl.textContent = 'Impossible d\'envoyer l\'alerte. Essayez plutôt WhatsApp.';
        errEl.style.display = 'block';
      }
    };
  }

  // Watchdog: si tout pwosesis la pran plis pase 12s, sispann tann epi
  // montre yon mesaj klè olye kite itilizatè a devan yon spinner enfini.
  let settled = false;
  const watchdog = setTimeout(()=>{
    if (!settled) {
      settled = true;
      showFatalError('La connexion prend trop de temps. Vérifiez votre réseau Internet, ou votre navigateur peut avoir une limitation (essayez Chrome ou Firefox plutôt qu\'un navigateur intégré à un outil de développement).');
    }
  }, 12000);

  try {
    const s = await window.Lotri.getSession();
    if (!s) {
      settled = true; clearTimeout(watchdog);
      // V27 — paj ki gen pwòp login entegre (ajan.html / WebView APK):
      // pa gen redireksyon, ekran login la parèt sou plas la.
      if (window.LotriInlineLogin) { window.LotriInlineLogin.show(); return; }
      window.location.replace('auth.html');
      return;
    }
    const p = await window.Lotri.getProfile();
    if (settled) return; // watchdog deja deklanche, pa kontinye
    if (!p) {
      settled = true; clearTimeout(watchdog);
      showFatalError('Aucun profil n\'a été trouvé pour votre compte dans la base de données. Contactez l\'administrateur pour créer le profil.');
      return;
    }
    if (p.status !== 'active') {
      settled = true; clearTimeout(watchdog);
      await window.Lotri.signOut();
      return;
    }
    if (p.role !== need) {
      settled = true; clearTimeout(watchdog);
      window.location.replace(window.Lotri.homeFor(p.role));
      return;
    }
    // Rôle ki bezwen yon konpayi lye (company/agent/supervisor) — si
    // company_id manke, bloke aksè a UI a NÈT (yon popup, pa yon paj
    // ki chaje ak mesaj "non identifié" gaye toupatou). Pa yon erè
    // itilizatè a te fè — kontakte administratè a.
    if (['company', 'agent', 'supervisor'].includes(p.role) && !p.company_id) {
      settled = true; clearTimeout(watchdog);
      showNotLinkedBlock();
      return;
    }
    // Compte secondaire (§5 — jl_secondary_accounts): otantifye kòm role='company'
    // men limite a "saisir les résultats" uniquement. Si kont PRENSIPAL konpayi a pa
    // aktif ankò, compte secondaire yo dwe bloke tou (règ eksplisit nan SQL la).
    if (p.role === 'company' && window.Lotri.supabase) {
      try {
        const { data: ctx, error: ctxErr } = await window.Lotri.supabase.rpc('jl_rpc_secondary_account_context');
        if (!ctxErr && ctx && ctx.is_secondary) {
          if (ctx.account_status !== 'active' || !ctx.primary_active) {
            settled = true; clearTimeout(watchdog);
            await window.Lotri.signOut();
            return;
          }
          window.__lotriSecondaryContext = ctx;
        }
      } catch (_) { /* si RPC a pa la ankò (deplwaman an kou), pa bloke koneksyon nòmal la */ }
    }
    settled = true; clearTimeout(watchdog);
    // Estoke pwofil la sou window AVAN dispatch, pou mount() ka jwenn li
    // menm si li tcheke apre evènman an te deja pase (race condition).
    window.__lotriProfile = p;
    document.dispatchEvent(new CustomEvent('lotri:ready', { detail: p }));
  } catch (err) {
    if (settled) return;
    settled = true; clearTimeout(watchdog);
    console.error('auth-guard erreur :', err);
    showFatalError(err.message || 'Une erreur inconnue s\'est produite.');
  }
})();
