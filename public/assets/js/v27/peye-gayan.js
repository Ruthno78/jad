/* =====================================================================
 * JADSTACK LOTTO — §5 PLAN-PRIME-KONEKTE-JWET
 *  5.3  Badge « or » : kantite nouvo fich gayan ki poko peye.
 *  5.4  Bouton « Payé » (AJAN uniquement, sou fich gayan) + popup
 *       verifikasyon ak kont a rebou 10 segond.
 * ---------------------------------------------------------------------
 * RÈG POPUP (jan plan §5.4 di l):
 *   • ID de la fiche la ekri AN GWO LÈT (pou konpare ak tikè fizik kliyan an).
 *   • Boule gayan yo ekri AN GWO LÈT tou.
 *   • « X » → anile: fich la RETE « poko peye ».
 *   • Klike DEYÒ kad la → menm bagay ak « X » (anile).
 *   • 10 segond pase san aksyon → fich la RETE « poko peye » (okenn
 *     peman otomatik san Agent pa aji).
 *   • « Confirmer » → jl9_rpc_mark_paid(ticket_id).
 * Fichye sa a pa touche okenn lòt lojik ki deja egziste.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const SB = () => L.supabase;
  const esc = L.escapeHtml || (s => String(s == null ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const money = n => Number(n || 0).toLocaleString('fr-HT',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' HTG';
  const toast = (m, k) => (L.toast ? L.toast(m, k) : console.log(k || 'info', m));

  const P = (L.peyeGayan = L.peyeGayan || {});

  /* ---- Rôle aktyèl la (Agent uniquement gen bouton « Payé ») ---- */
  P.isAgent = function (viewer) {
    if (viewer && viewer.role) return viewer.role === 'agent' || viewer.role === 'supervisor';
    const r = (L.session && L.session.role)
      || (window.__lotriProfile && window.__lotriProfile.role) || '';
    return r === 'agent' || r === 'supervisor';
  };

  /* ---- Boule gayan yo, apati win_detail ---- */
  const RANK_LBL = { 1: '1ye lo', 2: '2e lot', 3: '3e lot' };
  P.winningBalls = function (winDetail) {
    let w = winDetail;
    if (typeof w === 'string') { try { w = JSON.parse(w); } catch (_) { w = []; } }
    if (!Array.isArray(w)) w = [];
    return w.map(x => ({
      n: String(x.n ?? x.number ?? x.boul ?? ''),
      rank: Number(x.rank || 1),
      prize: Number(x.prize || x.amount_won || 0)
    })).filter(x => x.n);
  };

  /* =====================================================================
   * POPUP VERIFIKASYON + KONT A REBOU 10s
   * ticket = { id, ticket_no, prize_amount, win_detail }
   * onPaid = callback opsyonèl apre peman an valide
   * ===================================================================== */
  P.popup = function (ticket, onPaid) {
    if (!ticket || !ticket.id) return;
    const balls = P.winningBalls(ticket.win_detail);
    const idTxt = String(ticket.ticket_no || ticket.id).toUpperCase();

    const m = document.createElement('div');
    m.className = 'modal-backdrop jl27-peye-backdrop';
    m.innerHTML = `
      <div class="modal jl27-peye" role="dialog" aria-modal="true" aria-label="Vérification du paiement des fiches gagnantes">
        <button class="btn btn-icon btn-ghost jl27-peye-x" data-cancel aria-label="Annuler">
          <i class="fa-solid fa-xmark"></i></button>
        <h3 class="jl27-peye-hd"><i class="fa-solid fa-hand-holding-dollar"></i> Payer le ticket gagnant</h3>

        <p class="jl27-peye-q">Le client vous a-t-il remis le ticket portant cet ID ?</p>
        <div class="jl27-peye-id mono">${esc(idTxt)}</div>

        <p class="jl27-peye-q">Voici les boules gagnantes :</p>
        <div class="jl27-peye-balls">
          ${balls.length
            ? balls.map(b => `<span class="jl27-peye-ball mono">${esc(b.n)}
                 <small>${esc(RANK_LBL[b.rank] || ('lo ' + b.rank))}</small></span>`).join('')
            : '<span class="muted">—</span>'}
        </div>

        <div class="jl27-peye-total">Montant à payer : <strong>${esc(money(ticket.prize_amount))}</strong></div>

        <div class="jl27-peye-cd">
          <i class="fa-regular fa-clock"></i>
          <span data-cd>10</span> s — si le délai est dépassé, le ticket reste <b>poko peye</b>.
        </div>

        <div class="row jl27-peye-ft" style="justify-content:flex-end;gap:.5rem;margin-top:1rem">
          <button class="btn btn-ghost" data-cancel>Annuler</button>
          <button class="btn btn-primary" data-confirm>
            <i class="fa-solid fa-check"></i> Confirmer le paiement</button>
        </div>
      </div>`;
    document.body.appendChild(m);

    let done = false;
    let left = 10;
    const cdEl = m.querySelector('[data-cd]');
    const timer = setInterval(() => {
      left -= 1;
      if (cdEl) cdEl.textContent = String(Math.max(left, 0));
      if (left <= 0) {
        /* 10s pase san aksyon → EGAL ak « X » : anyen pa chanje. */
        close();
        toast('Le délai est écoulé — la fiche reste impayée.', 'info');
      }
    }, 1000);

    function close() {
      if (done) return;
      done = true;
      clearInterval(timer);
      m.remove();
    }

    m.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => close());
    /* Klike deyò kad la = menm bagay ak « X » */
    m.addEventListener('click', e => { if (e.target === m) close(); });

    m.querySelector('[data-confirm]').onclick = async () => {
      const btn = m.querySelector('[data-confirm]');
      btn.disabled = true;
      try {
        const { data, error } = await SB().rpc('jl9_rpc_mark_paid', { _ticket: ticket.id });
        if (error) throw error;
        close();
        toast('Fiche ' + idTxt + ' peye.', 'success');
        P.refreshBadges();
        if (typeof onPaid === 'function') onPaid(data);
      } catch (e) {
        btn.disabled = false;
        toast((e && e.message) || 'Impossible de marquer la fiche comme payée.', 'error');
      }
    };
  };

  /* =====================================================================
   * §5.3 — BADGE « OR » : kantite fich gayan ki poko peye
   * Nenpòt eleman ki gen [data-jl27-winner-badge] jwenn konte a.
   * ===================================================================== */
  P.count = async function () {
    try {
      const { data, error } = await SB().rpc('jl9_rpc_winner_badge');
      if (error) throw error;
      return data || { new_winners: 0, unpaid_winners: 0 };
    } catch (_) { return { new_winners: 0, unpaid_winners: 0 }; }
  };

  P.refreshBadges = async function () {
    const holders = document.querySelectorAll('[data-jl27-winner-badge]');
    if (!holders.length) return;
    const c = await P.count();
    const nNew = Number(c.new_winners || 0);
    const nAll = Number(c.unpaid_winners || 0);
    holders.forEach(h => {
      h.innerHTML = nAll
        ? `<span class="jl27-badge-gold${nNew ? ' is-new' : ''}"
              title="${nNew ? nNew + ' nouveau' : ''} fich gayan ki poko peye">
             <i class="fa-solid fa-trophy"></i> ${nAll}${nNew ? ' · ' + nNew + ' nouveau' : ''}</span>`
        : '';
    });
  };

  /* Estil badge/popup — mete isit la pou pa touche okenn CSS ki egziste */
  const st = document.createElement('style');
  st.textContent = `
    .jl27-badge-gold{display:inline-flex;align-items:center;gap:.35rem;padding:.12rem .5rem;
      border-radius:999px;background:linear-gradient(180deg,#F3C969,#D9A441);color:#3a2a05;
      font-weight:700;font-size:.78rem;box-shadow:0 1px 3px rgba(0,0,0,.25)}
    .jl27-badge-gold.is-new{animation:jl27GoldPulse 1.4s ease-in-out infinite}
    @keyframes jl27GoldPulse{0%,100%{box-shadow:0 0 0 0 rgba(217,164,65,.55)}
      50%{box-shadow:0 0 0 .35rem rgba(217,164,65,0)}}
    .jl27-peye{max-width:460px;text-align:center;position:relative}
    .jl27-peye-x{position:absolute;top:.4rem;right:.4rem}
    .jl27-peye-hd{margin:.2rem 0 .6rem}
    .jl27-peye-q{margin:.6rem 0 .3rem;font-size:.9rem}
    .jl27-peye-id{font-size:2rem;line-height:1.15;font-weight:800;letter-spacing:.06em;
      text-transform:uppercase;word-break:break-all;padding:.4rem .3rem;border-radius:.4rem;
      border:2px dashed var(--border,#bbb)}
    .jl27-peye-balls{display:flex;flex-wrap:wrap;gap:.45rem;justify-content:center;margin:.2rem 0 .4rem}
    .jl27-peye-ball{display:inline-flex;flex-direction:column;align-items:center;
      padding:.3rem .7rem;border-radius:.5rem;background:linear-gradient(180deg,#F3C969,#D9A441);
      color:#3a2a05;font-size:1.8rem;font-weight:800;line-height:1.05}
    .jl27-peye-ball small{font-size:.62rem;font-weight:700;text-transform:uppercase;opacity:.8}
    .jl27-peye-total{margin:.5rem 0 .2rem;font-size:1rem}
    .jl27-peye-cd{margin-top:.5rem;font-size:.82rem;opacity:.85}
    .jl27-peye-cd [data-cd]{font-weight:800}`;
  document.head.appendChild(st);
})();
