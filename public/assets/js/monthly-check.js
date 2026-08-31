/* =====================================================================
 * JADSTACK LOTTO v9.4 — KONTWÒL FEN MWA (Faz 5)
 * ---------------------------------------------------------------------
 * Chak mwa, lè Super Admin konekte pou premye fwa, sistèm nan tcheke ki
 * konpayi ki gen fakti ki depase delè a (`jl9_rpc_check_overdue_companies`).
 * Si gen, li montre yon rezime epi li voye un seul e-mail rezime — pa youn
 * pa konpayi, pou bwat imèl la pa anvayi.
 *
 * Li kenbe mak la nan localStorage pa mwa (YYYY-MM) — konsa li pa rele
 * ou 10 fwa nan menm jounen an.
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const M = (window.Lotri.monthlyCheck = {});
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;
  const money = n => (Number(n || 0)).toLocaleString('fr-HT', { minimumFractionDigits: 2 }) + ' HTG';
  const KEY = 'jl9.monthly-check';
  const tag = () => new Date().toISOString().slice(0, 7);

  async function fetchOverdue() {
    const { data, error } = await SB().rpc('jl9_rpc_check_overdue_companies');
    if (error) { console.warn('[monthly-check]', error.message); return []; }
    const list = (data && data.companies) || [];
    /* Nou kalkile reta a bò kliyan an apati pi ansyen delè a. */
    const today = new Date();
    return list.map(c => Object.assign({}, c, {
      days_late: c.oldest_due
        ? Math.max(0, Math.round((today - new Date(c.oldest_due)) / 86400000))
        : 0,
      overdue_invoices: c.invoices || 0
    }));
  }

  function summary(list) {
    const total = list.reduce((s, c) => s + Number(c.total_due || 0), 0);
    return { total, count: list.length };
  }

  M.run = async function (opts) {
    /* V18 · KOREKSYON #3 — popup sa a se SÈLMAN pou Super Admin.
       Nou reverifye wòl la nan moman an (pa nan moman arm()), paske yon
       ansyen setTimeout ka toujou vivan apre yon chanjman kont nan menm tab. */
    if ((window.__lotriProfile || {}).role !== 'super_admin') return [];
    const list = await fetchOverdue();
    const s = summary(list);
    if (!list.length) {
      if (opts && opts.manual) window.Lotri.toast('Aucune compagnie n\'est en retard. Tout est en ordre.', 'success');
      return list;
    }


    /* Rezime vizyèl la */
    const rows = list.slice(0, 12).map(c => `
      <tr><td>${esc(c.company_name || '—')}</td>
        <td>${esc(String(c.overdue_invoices || 0))}</td>
        <td>${esc(money(c.total_due))}</td>
        <td>${esc(String(c.days_late || 0))} jou</td></tr>`).join('');

    const back = document.createElement('div');
    back.className = 'modal-backdrop v9-modal';
    back.innerHTML = `
      <div class="modal modal-lg" role="dialog" aria-modal="true">
        <div class="modal-ico warn"><i class="fa-solid fa-calendar-xmark"></i></div>
        <h3>Contrôle de fin de mois — ${esc(String(s.count))} compagnies en retard</h3>
        <p class="muted">Total dû: <strong>${esc(money(s.total))}</strong></p>
        <div class="table-wrap" style="max-height:46vh">
          <table class="table"><thead>
            <tr><th>Compagnie</th><th>Facture</th><th>Montant</th><th>Reta</th></tr></thead>
            <tbody>${rows}</tbody></table>
        </div>
        ${list.length > 12 ? `<p class="muted sm">…et ${esc(String(list.length - 12))} autres.</p>` : ''}
        <div class="modal-ft">
          <button class="btn btn-ghost" data-close>Fermer</button>
          <button class="btn btn-primary" data-go><i class="fa-solid fa-file-invoice-dollar"></i> Aller à la facturation</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    const shut = () => { back.classList.add('closing'); setTimeout(() => back.remove(), 140); };
    back.querySelector('[data-close]').onclick = shut;
    back.querySelector('[data-go]').onclick = () => { shut(); LotriShell.go('invoices'); };
    back.addEventListener('click', e => { if (e.target === back) shut(); });

    /* Yon sèl imèl rezime (§16.2 — pa youn pa konpayi). */
    if (window.Lotri.notify) {
      window.Lotri.notify.bulk(
        'billing.monthly.overdue', 'siyale', 'compagnies en retard',
        list.map(c => `${c.company_name} — ${money(c.total_due)} (${c.days_late} jou)`),
        { 'Total dû': money(s.total), 'Nombre de compagnies': String(s.count) }
      );
    }
    return list;
  };

  /* Rele otomatikman une seule fois pa mwa. */
  M.arm = function () {
    let mark = null;
    try { mark = localStorage.getItem(KEY); } catch (_) {}
    if (mark === tag()) return;
    M.cancel();
    M._timer = setTimeout(async () => {
      M._timer = null;
      /* Reverifikasyon wòl la fèt anndan M.run() tou. */
      if ((window.__lotriProfile || {}).role !== 'super_admin') return;
      try { localStorage.setItem(KEY, tag()); } catch (_) {}
      await M.run({ manual: false });
    }, 2500);
    /* Rejis global pou dekoneksyon ka anile l. */
    window.Lotri.pendingTimers = window.Lotri.pendingTimers || [];
    window.Lotri.pendingTimers.push(M._timer);
  };

  /* Annuler nenpòt kontwòl an atant (rele nan signOut). */
  M.cancel = function () {
    if (M._timer) { clearTimeout(M._timer); M._timer = null; }
  };


  /* Vi manyèl «Contrôle de fin de mois» pou Super Admin ka relanse l lè l vle. */
  if (window.LotriShell) {
    LotriShell.register('billing-check', {
      render: async (host) => {
        host.innerHTML = `
        <div class="page-hd"><h2>Contrôle de fin de mois</h2>
          <p class="muted">Vérifie quelles compagnies ont des factures en retard, puis envoie un seul e-mail récapitulatif.</p></div>
        <div class="card"><div id="mc-out" class="muted">N ap chaje…</div>
          <div class="modal-ft" style="justify-content:flex-start">
            <button class="btn btn-primary" id="mc-run"><i class="fa-solid fa-rotate"></i> Relanse kontwòl la</button>
          </div></div>`;
        const out = document.getElementById('mc-out');
        const paint = (list) => {
          const s = summary(list);
          out.innerHTML = list.length
            ? `<strong>${esc(String(s.count))}</strong> compagnies en retard — total <strong>${esc(money(s.total))}</strong>.`
            : 'Aucune compagnie n\'est en retard actuellement.';
        };
        paint(await fetchOverdue());
        document.getElementById('mc-run').onclick = (e) =>
          window.Lotri.ui.busy(e.currentTarget, async () => paint(await M.run({ manual: true })));
      }
    });
  }
})();
