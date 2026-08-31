/* =====================================================================
 * JADSTACK LOTTO v9 — MODAL KONFIMASYON & ENTRE (§8)
 * Ranplase `confirm()` / `prompt()` natif la ki lèd sou mobil.
 * Tous modal yo: fon flou, klavye (Escape/Enter), fokis otomatik.
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function shell(inner) {
    const back = document.createElement('div');
    back.className = 'modal-backdrop v9-modal';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${inner}</div>`;
    document.body.appendChild(back);
    return back;
  }

  function close(back, resolve, value) {
    back.classList.add('closing');
    setTimeout(() => back.remove(), 140);
    document.removeEventListener('keydown', back._key);
    resolve(value);
  }

  /* Lotri.ui.confirm(mesaj, detay, opsyon) -> Promise<boolean> */
  function confirmModal(msg, detail, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const back = shell(`
        <div class="modal-ico ${opts.danger ? 'danger' : 'warn'}">
          <i class="fa-solid ${opts.danger ? 'fa-trash-can' : 'fa-circle-question'}"></i>
        </div>
        <h3>${esc(msg)}</h3>
        ${detail ? `<p class="muted">${esc(detail)}</p>` : ''}
        <div class="modal-ft">
          <button class="btn btn-ghost" data-no>${esc(opts.cancelText || 'Annuler')}</button>
          <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(opts.okText || 'Oui, continuer')}</button>
        </div>`);
      back.querySelector('[data-no]').onclick = () => close(back, resolve, false);
      back.querySelector('[data-yes]').onclick = () => close(back, resolve, true);
      back.addEventListener('click', e => { if (e.target === back) close(back, resolve, false); });
      back._key = e => {
        if (e.key === 'Escape') close(back, resolve, false);
        if (e.key === 'Enter') close(back, resolve, true);
      };
      document.addEventListener('keydown', back._key);
      setTimeout(() => back.querySelector('[data-yes]').focus(), 40);
    });
  }

  /* Lotri.ui.prompt({title, label, value, multiline, required}) -> Promise<string|null> */
  function promptModal(o) {
    o = o || {};
    return new Promise(resolve => {
      const field = o.multiline
        ? `<textarea class="textarea" id="v9p" rows="4" placeholder="${esc(o.placeholder || '')}">${esc(o.value || '')}</textarea>`
        : `<input class="input" id="v9p" value="${esc(o.value || '')}" placeholder="${esc(o.placeholder || '')}">`;
      const back = shell(`
        <h3>${esc(o.title || 'Saisissez une valeur')}</h3>
        ${o.help ? `<p class="muted">${esc(o.help)}</p>` : ''}
        <div class="form-row"><label class="label" for="v9p">${esc(o.label || '')}</label>${field}
          <small class="field-err" id="v9perr" hidden></small></div>
        <div class="modal-ft">
          <button class="btn btn-ghost" data-no>Annuler</button>
          <button class="btn btn-primary" data-yes>${esc(o.okText || 'Confirmer')}</button>
        </div>`);
      const input = back.querySelector('#v9p');
      const err = back.querySelector('#v9perr');
      const submit = () => {
        const val = input.value.trim();
        if (o.required && !val) {
          err.textContent = 'Ce champ est obligatoire.'; err.hidden = false;
          input.classList.add('is-invalid'); input.focus(); return;
        }
        close(back, resolve, val);
      };
      back.querySelector('[data-no]').onclick = () => close(back, resolve, null);
      back.querySelector('[data-yes]').onclick = submit;
      back.addEventListener('click', e => { if (e.target === back) close(back, resolve, null); });
      back._key = e => {
        if (e.key === 'Escape') close(back, resolve, null);
        if (e.key === 'Enter' && !o.multiline) { e.preventDefault(); submit(); }
      };
      document.addEventListener('keydown', back._key);
      setTimeout(() => input.focus(), 40);
    });
  }

  /* V10 — Lotri.modal.form(tit, htmlChan, onSave) : modal ak plizyè chan.
     `onSave` ka voye yon erè; mesaj la parèt nan modal la san li fèmen. */
  function formModal(title, innerHtml, onSave, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const back = shell(`
        <h3>${esc(title || '')}</h3>
        <div class="modal-body">${innerHtml || ''}</div>
        <div class="alert alert-error" data-err hidden></div>
        <div class="modal-ft">
          <button class="btn btn-ghost" data-no>${esc(opts.cancelText || 'Annuler')}</button>
          <button class="btn btn-primary" data-yes>${esc(opts.okText || 'Enregistrer')}</button>
        </div>`);
      const err = back.querySelector('[data-err]');
      back.querySelector('[data-no]').onclick = () => close(back, resolve, false);
      back.querySelector('[data-yes]').onclick = async (e) => {
        err.hidden = true;
        try {
          await window.Lotri.ui.busy(e.currentTarget, async () => { await onSave(); });
          close(back, resolve, true);
        } catch (ex) {
          err.textContent = ex && ex.message ? ex.message : 'Impossible d\'enregistrer.';
          err.hidden = false;
        }
      };
      back._key = e => { if (e.key === 'Escape') close(back, resolve, false); };
      document.addEventListener('keydown', back._key);
      setTimeout(() => { const f = back.querySelector('input,textarea,select'); if (f) f.focus(); }, 40);
    });
  }

  window.Lotri.modal = { confirm: confirmModal, prompt: promptModal, form: formModal };
})();
