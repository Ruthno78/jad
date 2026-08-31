/* =====================================================================
 * JADSTACK LOTTO v9 — CHAN LONG / JSON BLOKE-EDITAB (PLAN V9 §1.3)
 * ---------------------------------------------------------------------
 * Tous chan konfigirasyon ki gen plis pase yon fraz (JSON, mansyon legal,
 * deskripsyon, adrès long) se yon <textarea> ki:
 *   • pa defo  : readonly, max-height limite, scroll, kontni an vizib nèt
 *   • sou ✏️ / double-klik : editab, pi gwo, resize:vertical
 *   • sou blur san sove : retounen nan mòd bloke (mande konfimasyon si
 *     gen chanjman ki poko sove)
 *   • JSON : validasyon an tan reyèl — kad vèt/wouj + «Enregistrer» bloke si
 *     JSON pa fòme byen.
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* HTML yon chan bloke. `kind` = 'text' | 'json' */
  function html(id, label, value, kind, hint) {
    const isJson = kind === 'json';
    const raw = isJson ? JSON.stringify(value ?? [], null, 2) : String(value ?? '');
    return `<div class="lockfield" data-lock="${esc(id)}" data-kind="${isJson ? 'json' : 'text'}">
      <div class="lockfield-hd">
        <label class="label" for="${esc(id)}">${esc(label)}</label>
        <div class="lockfield-tools">
          ${isJson ? `<button type="button" class="btn btn-sm btn-ghost lockfield-fmt"
                title="Fòmate JSON an (endantasyon 2 espas)" aria-label="Fòmate JSON ${esc(label)}"><i class="fa-solid fa-wand-magic-sparkles"></i></button>` : ''}
          <button type="button" class="btn btn-sm btn-ghost lockfield-edit" data-edit-for="${esc(id)}"
                title="Modifier le champ" aria-label="Modifier ${esc(label)}"><i class="fa-solid fa-pen"></i></button>
        </div>
      </div>
      <textarea class="input lockfield-area${isJson ? ' mono' : ''}" id="${esc(id)}"
                rows="${Math.min(24, Math.max(4, raw.split('\n').length + 1))}"
                readonly spellcheck="false" wrap="off"
                autocomplete="off" autocapitalize="off" autocorrect="off">${esc(raw)}</textarea>
      <small class="lockfield-msg" hidden></small>
      ${hint ? `<small class="muted">${esc(hint)}</small>` : ''}
    </div>`;
  }

  /* Grandi otomatikman pou tout liy yo (saut de liy) rete vizib. */
  function grow(area) {
    const lines = area.value.split('\n').length;
    area.rows = Math.min(area.closest('.lockfield')?.classList.contains('editing') ? 40 : 14,
                         Math.max(4, lines + 1));
  }

  function validate(wrap) {
    const area = wrap.querySelector('.lockfield-area');
    const msg = wrap.querySelector('.lockfield-msg');
    if (wrap.dataset.kind !== 'json') { wrap.classList.remove('invalid', 'valid'); msg.hidden = true; return true; }
    try {
      JSON.parse(area.value);
      wrap.classList.remove('invalid'); wrap.classList.add('valid');
      msg.hidden = false; msg.className = 'lockfield-msg ok'; msg.textContent = '✅ JSON valid';
      return true;
    } catch (ex) {
      wrap.classList.add('invalid'); wrap.classList.remove('valid');
      msg.hidden = false; msg.className = 'lockfield-msg err'; msg.textContent = '⛔ JSON invalide — ' + ex.message;
      return false;
    }
  }

  function syncSaveButtons(root) {
    const card = root.closest('.card') || document;
    const bad = card.querySelector('.lockfield.invalid');
    card.querySelectorAll('[data-save]').forEach(b => {
      b.disabled = !!bad;
      b.title = bad ? 'Corrigez le JSON invalide avant d\'enregistrer.' : '';
    });
  }

  function open(wrap) {
    if (wrap.classList.contains('editing')) return;
    const area = wrap.querySelector('.lockfield-area');
    wrap.classList.add('editing');
    area.readOnly = false;
    area.dataset.saved = area.value;
    grow(area);
    area.focus();
    validate(wrap); syncSaveButtons(wrap);
  }

  async function closeField(wrap) {
    const area = wrap.querySelector('.lockfield-area');
    if (!wrap.classList.contains('editing')) return;
    if (area.dataset.saved !== undefined && area.dataset.saved !== area.value) {
      const keep = await window.Lotri.modal.confirm(
        'Vous avez des modifications non enregistrées dans ce champ.',
        'Cliquez sur « Conserver » pour continuer la modification, ou sur « Annuler les modifications » pour revenir à la dernière valeur enregistrée.',
        { okText: 'Kenbe chanjman', cancelText: 'Annuler les modifications' });
      if (keep) { area.focus(); return; }
      area.value = area.dataset.saved;
    }
    wrap.classList.remove('editing');
    area.readOnly = true;
    grow(area);
    validate(wrap); syncSaveButtons(wrap);
  }

  /* Branche tout chan bloke ki nan `root` (yon vi ki fèk rann). */
  function wire(root) {
    root = root || document;
    root.querySelectorAll('.lockfield').forEach(wrap => {
      if (wrap.dataset.wired) return;
      wrap.dataset.wired = '1';
      const area = wrap.querySelector('.lockfield-area');
      wrap.querySelector('.lockfield-edit').addEventListener('click', () =>
        wrap.classList.contains('editing') ? closeField(wrap) : open(wrap));
      area.addEventListener('dblclick', () => open(wrap));
      const fmt = wrap.querySelector('.lockfield-fmt');
      if (fmt) fmt.addEventListener('click', () => {
        open(wrap);
        try {
          area.value = JSON.stringify(JSON.parse(area.value), null, 2);
          grow(area);
        } catch (_) { /* validate() ap montre erè a */ }
        validate(wrap); syncSaveButtons(wrap);
      });
      /* Tab andedan chan an = endantasyon, li pa sote sou lòt chan */
      area.addEventListener('keydown', e => {
        if (e.key !== 'Tab' || area.readOnly) return;
        e.preventDefault();
        const s0 = area.selectionStart, e0 = area.selectionEnd;
        area.value = area.value.slice(0, s0) + '  ' + area.value.slice(e0);
        area.selectionStart = area.selectionEnd = s0 + 2;
      });
      area.addEventListener('input', () => grow(area));
      grow(area);
      area.addEventListener('input', () => { validate(wrap); syncSaveButtons(wrap); });
      area.addEventListener('blur', () => setTimeout(() => {
        if (!wrap.contains(document.activeElement)) closeField(wrap);
      }, 120));
      validate(wrap);
    });
    syncSaveButtons(root.querySelector('.lockfield') || root);
  }

  /* Li valè a — JSON parse otomatik pou chan JSON. */
  function value(id) {
    const area = document.getElementById(id);
    const wrap = area.closest('.lockfield');
    if (wrap && wrap.dataset.kind === 'json') {
      try { return JSON.parse(area.value); }
      catch (_) { throw new Error('JSON invalide dans le champ « ' + id + ' ». Corrigez-le avant d\'enregistrer.'); }
    }
    return area.value;
  }

  window.Lotri.lockfield = { html, wire, value, validate, grow };
})();
