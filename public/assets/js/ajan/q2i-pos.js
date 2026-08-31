/* JADSTACK LOTTO — Q2i Bluetooth add-on pou POS AJAN SÈLMAN.
 * Li pa touche okenn lojik POS ki deja egziste: li jis ajoute yon panèl
 * "Printer" nan POS la epi voye done tikè ki deja kreye yo bay
 * window.printLottoTicket(...).
 *
 * Depann de: assets/js/q2i/bluetooth-printer.js (chaje anvan fichye sa a).
 */
(function () {
  'use strict';

  if (window.JadStackQ2iPOS) return;                    // anti double-loading
  if (document.documentElement.dataset.role !== 'agent') return; // AJAN uniquement

  const Q2I = () => window.JadStackPrinter || null;

  function notify(msg, kind) {
    if (typeof window.JadStackNotify === 'function') window.JadStackNotify(msg, kind);
  }

  let lastTicket = null;   // { rows, total, extra } dènye tikè valide a

  /* ---------- Mapping: done POS ki deja egziste -> receipt Q2i ---------- */
  function ficheToPrintData(fiche, ticket) {
    fiche = fiche || {};
    ticket = ticket || {};
    const rows = [];
    (fiche.draws || []).forEach(d => {
      (d.bets || []).forEach(b => {
        rows.push({
          lotto: String(b.game_code || b.game_label || ''),
          boule: String(b.number || ''),
          option: String(b.option || d.draw_name || '-').slice(0, 5),
          amount: Number(b.amount || 0).toFixed(2)
        });
      });
    });

    const prof = window.__lotriProfile || {};
    const seller = prof.full_name || prof.name || prof.username || prof.email || '';

    return {
      ticketNumber: fiche.number || fiche.ref || ticket.ticket_no || '',
      rows,
      total: Number(fiche.total != null ? fiche.total : (ticket.total || 0)).toFixed(2),
      extra: {
        uniqueNumber: fiche.number || fiche.ref || ticket.ticket_no || '',
        sequence: String(fiche.serial || ticket.serial || ticket.id || '1'),
        date: fiche.date || new Date().toLocaleDateString('fr-HT'),
        seller: seller,
        payment: 'Compte en especes',
        remarks: 'aucun',
        express: 'aucun',
        printTime: new Date().toLocaleString('fr-HT')
      }
    };
  }

  /* ---------- Action ---------- */
  async function connect() {
    if (!Q2I()) { notify('Le module Q2i n\'est pas chargé.', 'error'); return false; }
    const ok = await window.connectQ2i();
    paint();
    return ok;
  }

  async function test() {
    if (!Q2I()) { notify('Le module Q2i n\'est pas chargé.', 'error'); return false; }
    const ok = await window.testQ2i();
    paint();
    return ok;
  }

  async function printTicket(data) {
    data = data || lastTicket;
    if (!data) { notify('Aucun ticket à imprimer.', 'error'); return false; }
    if (!Q2I() || !Q2I().available()) {
      notify('La fonction Q2i est disponible uniquement dans l\'APK Android.', 'error');
      return false;
    }
    if (!Q2I().isLive()) {
      const c = await Q2I().connect();
      paint();
      if (!c.ok) {
        notify('Q2i non connecté — ' + c.message, 'error');
        return false;
      }
    }
    const ok = await window.printLottoTicket(data.ticketNumber, data.rows, data.total, data.extra);
    paint();
    return ok;
  }

  /* ---------- UI nan POS Agent an ---------- */
  function statusText() {
    const p = Q2I();
    if (!p || !p.available()) return { label: 'Q2i : non disponible (APK uniquement)', cls: 'q2i-off' };
    return p.isLive()
      ? { label: 'Q2i : Connecté ✅', cls: 'q2i-on' }
      : { label: 'Q2i : Déconnecté', cls: 'q2i-off' };
  }

  function paint() {
    document.querySelectorAll('.q2i-status').forEach(el => {
      const s = statusText();
      el.textContent = s.label;
      el.className = 'q2i-status ' + s.cls;
    });
    document.querySelectorAll('[data-q2i-print]').forEach(b => {
      b.disabled = !lastTicket;
    });
  }

  function mountPOS(host) {
    try {
      if (!host || host.querySelector('#q2i-card')) return;
      const card = document.createElement('div');
      card.className = 'card q2i-card';
      card.id = 'q2i-card';
      const s = statusText();
      card.innerHTML = `
        <div class="card-hd"><h3><i class="fa-solid fa-print"></i> Printer</h3>
          <span class="q2i-status ${s.cls}">${s.label}</span></div>
        <div class="q2i-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-q2i-connect>🖨️ Connecter Q2i</button>
          <button type="button" class="btn btn-ghost btn-sm" data-q2i-test>Teste Printer Q2i</button>
          <button type="button" class="btn btn-primary btn-sm" data-q2i-print disabled>🖨️ Imprimer Ticket</button>
        </div>
        <p class="muted q2i-note" style="font-size:.78rem;margin-top:.4rem">
          Si printer la non connecté, ou ka toujou kreye epi valide tikè yo nòmalman.</p>`;
      const wrap = host.querySelector('.pos-wrap') || host;
      wrap.insertBefore(card, wrap.firstChild);

      card.querySelector('[data-q2i-connect]').onclick = () => connect();
      card.querySelector('[data-q2i-test]').onclick = () => test();
      card.querySelector('[data-q2i-print]').onclick = () => printTicket();
      paint();
    } catch (e) {
      /* pa janm bloke POS la */
      console.warn('[Q2i] mountPOS', e);
    }
  }

  /* Rele apre yon tikè valide (done POS ki deja egziste). */
  function onTicket(fiche, ticket) {
    try {
      lastTicket = ficheToPrintData(fiche, ticket);
      paint();
      if (Q2I() && Q2I().available() && Q2I().isLive()) {
        printTicket(lastTicket);   // deja konekte -> enprime dirèkteman
      }
    } catch (e) {
      console.warn('[Q2i] onTicket', e);
    }
  }

  document.addEventListener('q2i:status', paint);

  window.JadStackQ2iPOS = { mountPOS, onTicket, printTicket, connect, test, paint,
                            get lastTicket() { return lastTicket; } };
})();
