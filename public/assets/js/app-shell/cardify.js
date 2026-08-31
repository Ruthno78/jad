/* =====================================================================
 * JADSTACK LOTTO — cardify.js
 * ---------------------------------------------------------------------
 * Sou ekran <768px, transfòme chak `.table-wrap table` an lis kat —
 * SAN kreye okenn nouvo eleman DOM: menm <tr>/<td>/bouton, menm
 * `onclick`/`addEventListener` ki te deja tache sou yo kontinye mache
 * san chanje. Nou jis (1) ajoute yon `data-label` sou chak <td> ki soti
 * nan tèks `thead th` korespondan an, (2) ajoute yon klas CSS ki fè
 * rès la (v. app-shell-mobile.css §6).
 * ===================================================================== */
(function () {
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

  function cardifyTable(table) {
    if (!table || table.dataset.jlCardified === '1') return;
    const heads = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    if (!heads.length) return;
    table.querySelectorAll('tbody tr').forEach(tr => {
      Array.from(tr.children).forEach((td, i) => {
        if (heads[i] !== undefined) td.setAttribute('data-label', heads[i]);
      });
    });
    table.classList.add('jl-cardified');
    table.dataset.jlCardified = '1';
  }

  function scan(root) {
    if (!isMobile()) return;
    (root || document).querySelectorAll('.table-wrap table.table').forEach(cardifyTable);
  }

  const mo = new MutationObserver((muts) => {
    if (!isMobile()) return;
    for (const m of muts) {
      if (m.addedNodes && m.addedNodes.length) { scan(document.getElementById('view') || document); break; }
    }
  });

  function start() {
    const host = document.getElementById('view');
    if (host) mo.observe(host, { childList: true, subtree: true });
    scan();
  }

  document.addEventListener('lotri:ready', start);
  document.addEventListener('lotri:view', () => scan());
})();
