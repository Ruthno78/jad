/* =====================================================================
 * JADSTACK LOTTO V17 §8 — FOOTER FIKS SOU TOUT PAJ
 * ---------------------------------------------------------------------
 *  • Sou paj piblik yo (index, kontak, legal) gwo footer `data-footer`
 *    (branding.js) rete jan li ye — nou pa touche l.
 *  • Sou paj wòl yo (ajan, konpayi, super-admin, employeur) nou mete yon
 *    ti footer konpak anba chasi a: © ane a + non sistèm, lyen Facebook
 *    (soti nan config `footer.socials`, PA kòde an dir), ak ti tèks
 *    responsablite ki mennen nan legal.html#responsabilite.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function socials() {
    const f = (L.config && L.config.footer) || {};
    return (f.socials || []).filter(s => s && s.url);
  }

  function html() {
    const f = (L.config && L.config.footer) || {};
    const b = (L.config && L.config.brand) || {};
    const year = new Date().getFullYear();
    const name = b.name || 'JADSTACK LOTTO';
    const mail = f.email || 'jadstacklotto@gmail.com';
    /* V27 FAZ 4b — sou paj ajan an, lyen «responsablite» a mennen nan
       paj «Conditions de l'agent» (nan app la, espesifik wòl la) olye paj
       legal jeneral sit la; lòt wòl yo (konpayi/SA/employeur) rete
       menm jan yo te ye a. */
    const isAgent = document.documentElement.dataset.role === 'agent';
    const respHref = isAgent ? '?view=aterms' : 'legal.html#responsabilite';
    return `
      <div class="jl17-foot-in">
        <span class="jl17-foot-c">© ${year} ${esc(name)} — tous droits réservés.</span>
        <span class="jl17-foot-soc">${socials().map(s =>
          `<a href="${esc(s.url)}" target="_blank" rel="noopener"
              aria-label="${esc(s.label || 'Rezo sosyal')}" title="${esc(s.label || '')}">
             <i class="${esc(s.icon || 'fa-solid fa-link')}"></i></a>`).join('')}</span>
        <a class="jl17-foot-resp" href="${respHref}"${isAgent ? ' data-go="aterms"' : ''}>
          <i class="fa-solid fa-circle-info"></i>
          Vous responsab de tout done ou antre — li règ yo
        </a>
        <a class="jl17-foot-mail" href="mailto:${esc(mail)}">${esc(mail)}</a>
      </div>`;
  }

  function paint() {
    document.querySelectorAll('[data-footer-mini]').forEach(el => {
      el.innerHTML = html();
      const go = el.querySelector('[data-go]');
      if (go && window.LotriShell) go.onclick = (ev) => { ev.preventDefault(); LotriShell.go(go.dataset.go); };
    });
  }

  function mount() {
    const shell = document.getElementById('shell');
    if (!shell || document.querySelector('[data-footer-mini]')) return;
    const el = document.createElement('footer');
    el.className = 'jl17-foot';
    el.setAttribute('data-footer-mini', '');
    (document.getElementById('view') || shell).after
      ? shell.appendChild(el)
      : shell.appendChild(el);
    paint();
  }

  L.paintMiniFooter = paint;

  document.addEventListener('lotri:ready', () => { mount(); setTimeout(paint, 800); });
  document.addEventListener('lotri:view', paint);
  document.addEventListener('DOMContentLoaded', () => { mount(); paint(); });
})();
