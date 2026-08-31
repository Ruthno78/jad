/* =====================================================================
 * JADSTACK LOTTO — KONT SEGONDÈ: KAT "PREMIÈRE SEMAINE"
 * ---------------------------------------------------------------------
 * Yon sèl fwa, pou yon compte secondaire ki fèk konekte pou premye fwa,
 * eksplike limit kont la (sèl dwa: saisir les résultats tiraj) epi make
 * `first_week_seen = true` (jl_rpc_secondary_account_ack_intro) pou li
 * pa parèt ankò. window.__lotriSecondaryContext mete pa auth-guard.js.
 * ===================================================================== */
(function () {
  let shown = false;

  document.addEventListener('lotri:ready', () => {
    const ctx = window.__lotriSecondaryContext;
    if (!ctx || !ctx.is_secondary || ctx.first_week_seen || shown) return;
    shown = true;
    setTimeout(async () => {
      if (!window.Lotri.modal) return; // si modal.js poko chaje, senpman pa montre l
      await window.Lotri.modal.confirm(
        'Bienvenue — compte secondaire',
        'Vous êtes connecté avec un compte secondaire. Vous pouvez UNIQUEMENT saisir les résultats des tirages ' +
        '(menu « Résultats des tirages »). Pour toute autre demande (équipe, finances, paramètres…), ' +
        'contactez votre compagnie qui gère ce compte.',
        { okText: 'J\'ai compris', cancelText: 'J\'ai compris' }
      );
      try {
        await window.Lotri.supabase.rpc('jl_rpc_secondary_account_ack_intro');
      } catch (_) { /* pa gwo zafè si sa echwe — kat la ka parèt yon lòt fwa */ }
    }, 300);
  });
})();
