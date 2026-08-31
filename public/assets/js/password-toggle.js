/* =====================================================================
 * JADSTACK LOTTO — MONTRE/KACHE MODPAS (tout chan modpas, otomatik)
 * ---------------------------------------------------------------------
 * Anwoule CHAK <input type="password"> nan yon ti wrapper ak yon
 * bouton "je" pou moun ka wè modpas la pandan y ap tape l. Mache sou
 * chan ki deja nan HTML la AK sou chan ki kreye pita (modal dinamik)
 * gras a yon MutationObserver.
 * ===================================================================== */
(function () {
  function wrap(input) {
    if (input.dataset.jlPwWrapped === '1') return;
    if (input.closest('.jl-pw-wrap')) { input.dataset.jlPwWrapped = '1'; return; }
    input.dataset.jlPwWrapped = '1';

    const wrapper = document.createElement('div');
    wrapper.className = 'jl-pw-wrap';
    wrapper.style.cssText = 'position:relative;display:block';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.style.paddingRight = '2.6rem';
    input.setAttribute('autocomplete', input.getAttribute('autocomplete') || 'current-password');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'jl-pw-toggle';
    btn.setAttribute('tabindex', '-1');
    btn.setAttribute('aria-label', 'Afficher/masquer le mot de passe');
    btn.style.cssText = 'position:absolute;right:.5rem;top:50%;transform:translateY(-50%);' +
      'background:none;border:0;padding:.3rem;cursor:pointer;color:var(--muted,#888);line-height:1;';
    btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
    wrapper.appendChild(btn);

    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  function scan(root) {
    (root || document).querySelectorAll('input[type="password"]').forEach(wrap);
  }

  scan(document);
  if (window.MutationObserver) {
    let t = null;
    new MutationObserver((muts) => {
      let needs = false;
      for (const m of muts) {
        if (!m.addedNodes) continue;
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches('input[type="password"]')) { needs = true; break; }
          if (n.querySelector && n.querySelector('input[type="password"]')) { needs = true; break; }
        }
        if (needs) break;
      }
      if (!needs) return;
      clearTimeout(t);
      t = setTimeout(() => scan(document), 60);
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
