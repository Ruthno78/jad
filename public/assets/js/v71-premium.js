/* =====================================================================
 * V71 — Anrichisman UI uniquement (pa gen okenn lojik metye).
 *  - Bouton aksyon prensipal santre sou dashboard (ale nan vi rapò a).
 *  - Bouton flotan "filtè" ki fè scroll rive sou premye zòn filtè/rechèch.
 * Tous bagay se prezantasyon : okenn done pa modifye.
 * ===================================================================== */
(function () {
  function reportKey() {
    if (!window.LotriShell || !window.LotriShell.get) return null;
    return ['reports', 'rapo-jounen', 'rapports', 'v12-stats'].find(k => window.LotriShell.get(k)) || null;
  }

  function currentView() {
    return new URL(location.href).searchParams.get('view') || '';
  }

  function addHeroAction(host) {
    if (host.querySelector('.v71-action')) return;
    const stats = host.querySelector('.grid-stats');
    if (!stats) return;
    const key = reportKey();
    if (!key) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'v71-action';
    btn.textContent = (window.Lotri && window.Lotri.t)
      ? window.Lotri.t('v71.rapo_jounalye', 'Rapport journalier')
      : 'Rapport journalier';
    btn.addEventListener('click', () => window.LotriShell.go(key));
    stats.insertAdjacentElement('afterend', btn);
  }

  function addFilterFab(host) {
    // V72 remplace le bouton flottant de filtre par un vrai panneau Réglages.
    // Hors tableau de bord, aucun bouton décoratif n’est ajouté ici.
    const old = document.querySelector('.v71-fab');
    if (old) old.remove();
  }

  document.addEventListener('lotri:view', (e) => {
    const host = e.detail;
    if (!host) return;
    try {
      if (currentView() === 'dashboard' || host.querySelector('.grid-stats')) addHeroAction(host);
      addFilterFab(host);
    } catch (_) { /* prezantasyon uniquement — pa janm bloke vi a */ }
  });
})();
