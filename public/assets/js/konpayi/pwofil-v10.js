/* =====================================================================
 * KONPAYI — PAJ «KONPAYI MWEN» YON SÈL PAJ (PLAN V10 · PATI B)
 * ---------------------------------------------------------------------
 * Avant: twa antre separe nan meni an — «Mon compte» (csettings),
 * «Chanje non & logo» (cname), «Profil & approbations» (cprofile).
 * Maintenant: YON SÈL paj `cprofile` ak yon sou-meni ANKRE (anchor) anwo.
 * Nou pa reekri lojik ki t ap mache deja: chak seksyon rele vi orijinal
 * la nan pwòp konteni li (LotriShell.get), donk zewo regresyon.
 * ===================================================================== */
(function () {
  const SECTIONS = [
    { id: 'sec-pwofil', view: '__cprofile_v9', label: 'Profil & approbations', icon: 'fa-id-card' },
    { id: 'sec-paramet', view: '__csettings_v9', label: 'Paramètres & options', icon: 'fa-sliders' }
    /* V20 #5 — antre 'sec-non' (__cname_v8) retire: konpayi pa ka mande
       chanje non/logo ankò. Sèlman Super Admin fè sa. */
  ];

  /* Nou kopye referans yo YON SÈL fwa, anvan nou ranplase `cprofile`. */
  const orig = {
    __cprofile_v9: LotriShell.get('cprofile'),
    __csettings_v9: LotriShell.get('csettings')
  };
  Object.keys(orig).forEach(k => { if (orig[k]) LotriShell.register(k, orig[k]); });

  LotriShell.register('cprofile', {
    render: async (host) => {
      host.innerHTML = `
      <nav class="sec-nav" aria-label="Section de la page Ma compagnie">
        ${SECTIONS.filter(s => orig[s.view]).map((s, i) => `
          <a class="sec-tab${i === 0 ? ' is-active' : ''}" href="#${s.id}" data-sec="${s.id}">
            <i class="fa-solid ${s.icon}"></i> ${s.label}</a>`).join('')}
      </nav>
      ${SECTIONS.filter(s => orig[s.view]).map(s => `
        <section class="sec-block" id="${s.id}" data-sec-block="${s.id}">
          <h3 class="sec-title"><i class="fa-solid ${s.icon}"></i> ${s.label}</h3>
          <div data-sec-host="${s.view}"></div>
        </section>`).join('')}`;

      /* Chak seksyon rann tèt li ak lojik orijinal li. */
      for (const s of SECTIONS) {
        const slot = host.querySelector(`[data-sec-host="${s.view}"]`);
        if (!slot || !orig[s.view]) continue;
        try { await orig[s.view].render(slot); }
        catch (ex) {
          slot.innerHTML = `<div class="alert alert-error">Cette section n'a pas pu être chargée : ${window.Lotri.escapeHtml(ex.message || '')}</div>`;
        }
      }

      /* Sou-meni ankre: mete tab aktif la an evidans pandan w ap woule. */
      const tabs = Array.from(host.querySelectorAll('.sec-tab'));
      const blocks = Array.from(host.querySelectorAll('[data-sec-block]'));
      tabs.forEach(t => t.addEventListener('click', e => {
        e.preventDefault();
        const el = host.querySelector('#' + t.dataset.sec);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
          entries.forEach(en => {
            if (!en.isIntersecting) return;
            tabs.forEach(t => t.classList.toggle('is-active', t.dataset.sec === en.target.id));
          });
        }, { rootMargin: '-96px 0px -70% 0px' });
        blocks.forEach(b => io.observe(b));
      }
    }
  });
})();
