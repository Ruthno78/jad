/* =====================================================================
 * JADSTACK LOTTO — SEKIRIZE ANTRE DONE (chif uniquement, san desimal,
 * bloke "null"/vid sou chan obligatwa)
 * ---------------------------------------------------------------------
 * 1) Tous <input type="number" data-int> (oswa ki gen step="1"/pa gen
 *    `step` ditou) — bloke tape "." "," "e" "+" "-" kòm klavye VIT,
 *    olye tann validation apre kou. Sa pi rapid pou moun k ap antre
 *    anpil chif (kantite, limit, montan antye).
 * 2) Nenpòt <form> — avant `submit`, verifye chan `required` yo pa
 *    vid E pa gen valè tèks literal "null"/"undefined" (ka rive si
 *    yon script mete `value = null` san kontwòl epi DOM konvèti l an
 *    tèks "null").
 * ===================================================================== */
(function () {
  const INT_BLOCK_KEYS = ['.', ',', 'e', 'E', '+', '-'];

  function isIntegerNumberInput(el) {
    if (!el || el.tagName !== 'INPUT' || el.type !== 'number') return false;
    // Antye pa defo, SÒF si moun nan te mete `step` ak yon desimal
    // eksprè (egz. step="0.01" pou yon montan lajan ki bezwen santim).
    const step = el.getAttribute('step');
    if (step && step !== '1' && step.toLowerCase() !== 'any') return false;
    if (el.hasAttribute('data-allow-decimal')) return false;
    return true;
  }

  document.addEventListener('keydown', (e) => {
    if (!isIntegerNumberInput(e.target)) return;
    if (INT_BLOCK_KEYS.includes(e.key)) e.preventDefault();
  });

  // Kole (paste) ka mete yon valè ak desimal/lèt menm si klavye bloke —
  // netwaye l apre kou.
  document.addEventListener('input', (e) => {
    if (!isIntegerNumberInput(e.target)) return;
    const clean = e.target.value.replace(/[^\d]/g, '');
    if (clean !== e.target.value) e.target.value = clean;
  });

  // Anpeche fòm soumèt si yon chan obligatwa vid oswa gen "null"/
  // "undefined" kòm tèks literal (pa vrè valè null JS — se yon string
  // ki antre pa aksidan/bug).
  const BAD_LITERALS = new Set(['null', 'undefined', 'NaN']);
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    const fields = form.querySelectorAll('[required]');
    for (const f of fields) {
      const v = (f.value || '').trim();
      if (!v || BAD_LITERALS.has(v)) {
        e.preventDefault();
        e.stopPropagation();
        f.focus();
        if (window.Lotri && window.Lotri.toast) {
          window.Lotri.toast('Chan «' + (f.getAttribute('data-label') || f.name || f.id || 'obligatwa') + '» ne peut pas rester vide.', 'error');
        }
        return;
      }
    }
  }, true); // kaptire AVAN lòt lisnè 'submit' fòm yo (pou bloke anvan RPC rele)
})();
