/* =====================================================================
 * JADSTACK LOTTO v9.4 — FIELD-LOCK AK KÒD 5 CHIF (Faz 7)
 * ---------------------------------------------------------------------
 * Diferan de `field-lock.js` (ki se pou gwo chan tèks/JSON).
 * Isit la se pou OPSYON SANSIB (sitou bò Super Admin): yon bouton «lock»
 * kenbe chan yo bloke. Lè yon moun vle debloke, sistèm nan JENERE yon
 * kòd 5 chif, li montre l, epi moun nan dwe REKRI l pou konfime.
 *
 * Itilizasyon nan HTML:
 *   <div data-syslock="Nom de la plateforme">  … inputs / butons …  </div>
 * Oswa nan JS:  if (await Lotri.syslock.ask('Supprimer la compagnie')) { … }
 *
 * Deblokaj la valab pou blòk la uniquement, epi li refèmen otomatikman
 * apre 5 minit san aktivite — konsa pèsonn pa jwenn yon ekran ouvè.
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const S = (window.Lotri.syslock = {});
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const AUTO_RELOCK_MS = 5 * 60 * 1000;

  function code5() {
    const n = (window.crypto && window.crypto.getRandomValues)
      ? window.crypto.getRandomValues(new Uint32Array(1))[0] % 100000
      : Math.floor(Math.random() * 100000);
    return String(n).padStart(5, '0');
  }

  /* Modal deblokaj: montre kòd la, mande moun nan rekri l. */
  S.ask = function (label) {
    const wanted = code5();
    return new Promise(resolve => {
      const back = document.createElement('div');
      back.className = 'modal-backdrop v9-modal';
      back.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-ico warn"><i class="fa-solid fa-lock-open"></i></div>
          <h3>Déverrouiller : ${esc(label || 'opsyon sansib')}</h3>
          <p class="muted">Pour éviter une modification accidentelle, saisissez à nouveau ce code à 5 chiffres :</p>
          <div class="syslock-code" aria-label="Code de confirmation">${esc(wanted)}</div>
          <div class="form-row">
            <label class="label" for="sl-in">Code de confirmation</label>
            <input class="input mono" id="sl-in" inputmode="numeric" maxlength="5"
                   autocomplete="off" placeholder="_ _ _ _ _">
            <small class="field-err" id="sl-err" hidden></small>
          </div>
          <div class="modal-ft">
            <button class="btn btn-ghost" data-no>Annuler</button>
            <button class="btn btn-primary" data-yes><i class="fa-solid fa-unlock"></i> Déverrouiller</button>
          </div>
        </div>`;
      document.body.appendChild(back);
      const input = back.querySelector('#sl-in');
      const err = back.querySelector('#sl-err');
      let tries = 0;

      const done = (v) => {
        back.classList.add('closing');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => back.remove(), 140);
        resolve(v);
      };
      const submit = () => {
        if (input.value.trim() === wanted) return done(true);
        tries++;
        input.classList.add('is-invalid');
        err.hidden = false;
        err.textContent = tries >= 3
          ? 'Le code est incorrect. Fermez et réessayez avec un nouveau code.'
          : 'Le code est incorrect — saisissez exactement les chiffres affichés.';
        if (tries >= 3) done(false);
        input.select();
      };
      const onKey = e => {
        if (e.key === 'Escape') done(false);
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
      };
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 5);
        input.classList.remove('is-invalid'); err.hidden = true;
      });
      back.querySelector('[data-no]').onclick = () => done(false);
      back.querySelector('[data-yes]').onclick = submit;
      back.addEventListener('click', e => { if (e.target === back) done(false); });
      document.addEventListener('keydown', onKey);
      setTimeout(() => input.focus(), 40);
    });
  };

  function setBlockState(box, locked) {
    box.dataset.locked = locked ? '1' : '0';
    box.querySelectorAll('input, select, textarea, button').forEach(el => {
      if (el.closest('[data-syslock-bar]')) return;
      el.disabled = !!locked;
    });
    const bar = box.querySelector('[data-syslock-bar]');
    if (!bar) return;
    bar.querySelector('[data-syslock-btn]').innerHTML = locked
      ? '<i class="fa-solid fa-lock"></i> Déverrouiller pour modifier'
      : '<i class="fa-solid fa-lock-open"></i> Bloqué ankò';
    bar.querySelector('[data-syslock-state]').textContent = locked
      ? 'Les champs sont verrouillés — un code à 5 chiffres est requis pour les déverrouiller.'
      : 'Les champs sont déverrouillés. Ils se reverrouilleront automatiquement après 5 minutes.';
  }

  /* Appliquer lock la sou tout blòk `[data-syslock]` nan yon kontenè. */
  S.wire = function (root) {
    (root || document).querySelectorAll('[data-syslock]').forEach(box => {
      if (box.dataset.syslockReady) return;
      box.dataset.syslockReady = '1';

      const bar = document.createElement('div');
      bar.className = 'syslock-bar';
      bar.setAttribute('data-syslock-bar', '');
      bar.innerHTML = `
        <button type="button" class="btn btn-sm" data-syslock-btn></button>
        <span class="muted" data-syslock-state></span>`;
      box.prepend(bar);

      let relock = null;
      const arm = () => {
        clearTimeout(relock);
        relock = setTimeout(() => setBlockState(box, true), AUTO_RELOCK_MS);
      };

      bar.querySelector('[data-syslock-btn]').addEventListener('click', async () => {
        if (box.dataset.locked === '0') { clearTimeout(relock); setBlockState(box, true); return; }
        const ok = await S.ask(box.getAttribute('data-syslock') || 'opsyon sansib');
        if (!ok) { window.Lotri.toast('Déverrouillage annulé.', 'error'); return; }
        setBlockState(box, false);
        window.Lotri.toast('Les champs sont déverrouillés pendant 5 minutes.', 'success');
        arm();
      });

      setBlockState(box, true);
    });
  };

  document.addEventListener('lotri:view', e => S.wire(e.detail || document));
})();
