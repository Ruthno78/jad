/* =====================================================================
 * v41-input-guard.js — Sekirite + rapidite pou tout fòm yo (v2, pi entelijan)
 * ---------------------------------------------------------------------
 *  • Chan LAJAN (montan, prim, pri) → klavye chif + yon sèl pwen desimal
 *    otorize (santim). Chan KANTITE/LIMIT/KÒD/TELEFÒN → chif antye uniquement.
 *  • Deteksyon pi presi: limit sou mo antye (word-boundary), + li tèks
 *    <label> ki asosye ak chan an (pa uniquement id/name/class jenerik).
 *  • Devlopè ka fòse manyèlman ak data-numeric="1" / data-decimal="1" /
 *    data-text="1" si deteksyon otomatik la twonpe.
 *  • Chan obligatwa → pa janm voye yon valè vid oswa "null"/"undefined".
 *  • Antre pi rapid: Enter pase nan chan swivan an.
 *
 * Mete l nan chak paj APRE shell.js:
 *   <script defer src="assets/js/v41-input-guard.js"></script>
 * ===================================================================== */
(function () {
  // Chan lajan — bezwen santim (pwen desimal otorize)
  const MONEY_HINT = /\b(montan|amount|prim|prime|price|pri|valè|value)\b/i;
  // Chan chif antye uniquement — pa janm desimal
  const INT_HINT = /\b(limit|kantite|qty|quantity|boul|nimewo|numero|number|pin|kod|code|phone|telefon|tel|sort[_-]?order|jou|day|max|min)\b/i;

  function labelTextFor(el) {
    let txt = '';
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab) txt += ' ' + lab.textContent;
    }
    const closest = el.closest('label');
    if (closest) txt += ' ' + closest.textContent;
    const wrap = el.closest('.field,.form-group,.form-row,.fg');
    if (wrap) {
      const lab2 = wrap.querySelector('label');
      if (lab2 && lab2 !== closest) txt += ' ' + lab2.textContent;
    }
    return txt;
  }

  function classify(el) {
    if (el.dataset.text === '1') return 'text';
    if (el.dataset.decimal === '1') return 'money';
    if (el.dataset.numeric === '1') return 'int';

    const key = [el.id, el.name, el.placeholder, labelTextFor(el)].join(' ');
    const isMoney = MONEY_HINT.test(key);
    const isInt = INT_HINT.test(key);

    if (el.type === 'number') {
      // Respekte step la si markup la deja presize desimal (0.01, 0.5, any…)
      const step = String(el.step || '').trim();
      const stepIsDecimal = step && step !== '1' && step !== 'step';
      if (isMoney || stepIsDecimal) return 'money';
      return 'int';
    }
    if (isMoney) return 'money';
    if (isInt) return 'int';
    return 'text';
  }

  function hardenNumeric(el, kind) {
    if (el.dataset.v41 === kind) return;
    el.dataset.v41 = kind;
    el.setAttribute('inputmode', kind === 'money' ? 'decimal' : 'numeric');
    el.setAttribute('pattern', kind === 'money' ? '[0-9]*[.,]?[0-9]*' : '[0-9]*');
    if (el.type === 'number' && kind === 'int') el.step = '1';

    const allowedKeys = kind === 'money'
      ? ['0','1','2','3','4','5','6','7','8','9','.',',']
      : ['0','1','2','3','4','5','6','7','8','9'];

    el.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // pèmèt copy/paste/select-all
      if (['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
      if (allowedKeys.includes(e.key)) {
        // yon sèl pwen desimal pou chan lajan
        if ((e.key === '.' || e.key === ',') && /[.,]/.test(el.value)) e.preventDefault();
        return;
      }
      e.preventDefault();
    });

    el.addEventListener('input', () => {
      let clean = kind === 'money'
        ? String(el.value).replace(/[^0-9.,]/g, '').replace(',', '.')
        : String(el.value).replace(/[^0-9]/g, '');
      if (kind === 'money') {
        const firstDot = clean.indexOf('.');
        if (firstDot !== -1) {
          clean = clean.slice(0, firstDot + 1) + clean.slice(firstDot + 1).replace(/\./g, '');
        }
      }
      if (clean !== el.value) el.value = clean;
    });

    el.addEventListener('paste', (e) => {
      const t = (e.clipboardData || window.clipboardData).getData('text');
      const re = kind === 'money' ? /[^0-9.,]/ : /[^0-9]/;
      if (re.test(t)) {
        e.preventDefault();
        const cleaned = kind === 'money' ? t.replace(/[^0-9.,]/g, '') : t.replace(/[^0-9]/g, '');
        document.execCommand('insertText', false, cleaned);
      }
    });
  }

  function hardenText(el) {
    if (el.dataset.v41t === '1') return;
    el.dataset.v41t = '1';
    el.addEventListener('blur', () => {
      const v = String(el.value || '').trim();
      // pa janm kite chèn "null"/"undefined" ale nan baz done a
      el.value = (v === 'null' || v === 'undefined') ? '' : v;
    });
  }

  // Enter = chan swivan (pi rapid pou antre done anpil)
  function fastEnter(form) {
    if (form.dataset.v41e === '1') return;
    form.dataset.v41e = '1';
    form.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return;
      const fields = [...form.querySelectorAll('input,select,textarea')]
        .filter(f => !f.disabled && f.type !== 'hidden');
      const i = fields.indexOf(e.target);
      if (i > -1 && i < fields.length - 1) { e.preventDefault(); fields[i + 1].focus(); }
    });
  }

  // Bloqué soumèt si yon chan obligatwa vid
  function guardSubmit(form) {
    if (form.dataset.v41s === '1') return;
    form.dataset.v41s = '1';
    form.addEventListener('submit', (e) => {
      const bad = [...form.querySelectorAll('[required]')]
        .find(f => !String(f.value || '').trim());
      if (bad) {
        e.preventDefault();
        e.stopImmediatePropagation();
        bad.focus();
        if (window.Lotri && window.Lotri.toast) window.Lotri.toast('Ce champ est obligatoire.', 'error');
      }
    }, true);
  }

  function scan(root) {
    (root || document).querySelectorAll('input').forEach(el => {
      if (['checkbox', 'radio', 'file', 'date', 'time', 'password', 'email'].includes(el.type)) return;
      const kind = classify(el);
      if (kind === 'text') hardenText(el);
      else hardenNumeric(el, kind);
    });
    (root || document).querySelectorAll('form').forEach(f => { fastEnter(f); guardSubmit(f); });
  }

  document.addEventListener('DOMContentLoaded', () => scan(document));
  document.addEventListener('lotri:view', () => scan(document));
  new MutationObserver(() => scan(document))
    .observe(document.documentElement, { childList: true, subtree: true });
})();
