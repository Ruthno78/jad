/* =====================================================================
 * JADSTACK LOTTO V15 — NWAYO PATAJE POU TOUT MODIL V13
 *  • Lotri.v13.rpc()          : apèl RPC ak mesaj erè klè
 *  • Lotri.v13.modal()        : modal senp (reyitilize CSS .modal-backdrop)
 *  • Lotri.v13.lists          : konpayi / ajan / medya / jeu (kachè)
 *  • Lotri.v13.exportCSV/XLSX/print : ekspòtasyon 100% kliyan
 *  • Lotri.v13.ticketDetail() : detay yon fich "exactement tel qu'il est imprimé"
 *  • Lotri.v13.loadScript()   : chaje SheetJS / Chart.js sou demann
 *  RÈG: PA GEN OKENN KOLÒN NI KALKIL KOMISYON ISIT LA.
 *       Solde = Ventes − Pou peye.
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});
  const v13 = (L.v13 = L.v13 || {});
  const SB = () => L.supabase;
  const esc = L.escapeHtml || (s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  v13.esc = esc;
  v13.toast = (m, k) => (L.toast ? L.toast(m, k) : console.log(k || 'info', m));

  /* ---------------- RPC ---------------- */
  v13.rpc = async function (name, args) {
    const { data, error } = await SB().rpc(name, args || {});
    if (error) throw new Error(error.message || 'Erreur du serveur.');
    return data;
  };

  /* ---------------- Fòma ---------------- */
  /* V17 §8 — tout montan lajan dwe gen "HTG" dèyè yo. */
  v13.money = n => (Number(n || 0)).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' HTG';
  v13.int = n => (Number(n || 0)).toLocaleString('fr-HT');
  v13.date = d => (d ? new Date(d).toLocaleDateString('fr-HT') : '—');
  v13.dt = d => (d ? new Date(d).toLocaleString('fr-HT') : '—');
  v13.today = () => new Date().toISOString().slice(0, 10);
  v13.daysAgo = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

  /* ---------------- Chajman script ekstèn ---------------- */
  const loaded = {};
  v13.loadScript = src => loaded[src] || (loaded[src] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('Impossible de charger ' + src));
    document.head.appendChild(s);
  }));
  v13.sheetjs = () => v13.loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
  v13.chartjs = () => v13.loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');

  /* ---------------- Modal ---------------- */
  v13.modal = function (html, opts) {
    opts = opts || {};
    const m = document.createElement('div');
    m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal ${opts.wide ? 'jl13-modal-wide' : ''}">
      <button class="btn btn-icon btn-ghost jl13-modal-x" data-close aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>
      ${html}</div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.addEventListener('click', e => {
      if (e.target === m || e.target.closest('[data-close]')) close();
    });
    return { el: m, close };
  };

  /* ---------------- Lis kachè ---------------- */
  const cache = {};
  const cached = (k, fn) => (cache[k] = cache[k] || fn());
  v13.companies = () => cached('companies', async () => {
    const { data } = await SB().from('jl9_companies').select('id,name').order('name');
    return data || [];
  });
  v13.agents = () => cached('agents', async () => {
    const { data } = await SB().from('jl9_agents').select('id,full_name,company_id').order('full_name');
    return data || [];
  });
  v13.branches = () => cached('branches', async () => {
    const { data } = await SB().from('jl9_branches').select('id,name,company_id').order('name');
    return data || [];
  });
  v13.medias = () => cached('medias', async () => {
    const { data } = await SB().from('jl11_draw_media')
      .select('id,display_name').is('deleted_at', null).order('display_name');
    return (data || []).map(r => ({ id: r.id, name: r.display_name }));
  });
  v13.games = () => cached('games', async () => {
    const { data } = await SB().from('jl9_games').select('*').order('sort_order');
    return data || [];
  });
  v13.plans = () => cached('plans', async () => {
    const { data } = await SB().from('jl13_plans').select('*').order('sort_order');
    return data || [];
  });
  v13.bust = k => { if (k) delete cache[k]; else Object.keys(cache).forEach(x => delete cache[x]); };

  v13.options = (rows, val, idKey, lblKey) => rows.map(r =>
    `<option value="${esc(r[idKey || 'id'])}" ${String(val) === String(r[idKey || 'id']) ? 'selected' : ''}>${esc(r[lblKey || 'name'])}</option>`).join('');

  /* ---------------- Ekspòtasyon (kliyan uniquement) ---------------- */
  function tableToMatrix(table) {
    return [...table.querySelectorAll('tr')].map(tr =>
      [...tr.querySelectorAll('th,td')].map(td => td.innerText.trim()));
  }
  /* V18 · KOREKSYON #2 — pa janm pase `null` bay tableToMatrix().
     Lè tab la pa egziste (lis vid), nou bay yon mesaj klè an kreyòl. */
  v13.matrixOf = function (src) {
    if (typeof src === 'string') {
      const el = document.querySelector(src);
      if (!el) throw new Error('Aucune donnée à exporter.');
      return tableToMatrix(el);
    }
    if (src instanceof HTMLElement) return tableToMatrix(src);
    if (Array.isArray(src) && src.length) return src;
    throw new Error('Aucune donnée à exporter.');
  };


  v13.exportCSV = function (src, name) {
    const rows = v13.matrixOf(src);
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = (name || 'ekspò') + '.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  v13.exportXLSX = async function (src, name) {
    await v13.sheetjs();
    const ws = window.XLSX.utils.aoa_to_sheet(v13.matrixOf(src));
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Données');
    window.XLSX.writeFile(wb, (name || 'ekspò') + '.xlsx');
  };
  v13.print = function (src, title) {
    const rows = v13.matrixOf(src);
    const w = window.open('', '_blank', 'width=1000,height=700');
    if (!w) return v13.toast('Autorisez les fenêtres pop-up pour pouvoir imprimer.', 'error');
    w.document.write(`<html><head><title>${esc(title || 'JADSTACK LOTTO')}</title>
      <style>body{font-family:Inter,Arial,sans-serif;padding:18px;color:#12202b}
      h1{font-size:1.1rem;margin:0 0 .8rem}
      table{border-collapse:collapse;width:100%;font-size:.8rem}
      th,td{border:1px solid #ccd;padding:5px 7px;text-align:left}
      th{background:#eef3f7}</style></head><body>
      <h1>${esc(title || 'JADSTACK LOTTO')}</h1>
      <table>${rows.map((r, i) => `<tr>${r.map(c => `<${i ? 'td' : 'th'}>${esc(c)}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table>
      </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };
  /* PDF = enprime -> "Enregistrer en PDF" (100% kliyan, san depandans) */
  v13.exportPDF = (src, title) => v13.print(src, title);

  v13.exportBar = (id, name) => `<div class="row jl13-exports" data-exp="${esc(id)}" data-expname="${esc(name || 'ekspò')}">
      <button class="btn btn-sm btn-ghost" data-x="csv"><i class="fa-solid fa-file-csv"></i> CSV</button>
      <button class="btn btn-sm btn-ghost" data-x="xlsx"><i class="fa-solid fa-file-excel"></i> Excel</button>
      <button class="btn btn-sm btn-ghost" data-x="pdf"><i class="fa-solid fa-file-pdf"></i> PDF</button>
      <button class="btn btn-sm btn-ghost" data-x="print"><i class="fa-solid fa-print"></i> Imprimer</button>
    </div>`;
  v13.wireExports = function (host) {
    host.querySelectorAll('.jl13-exports').forEach(bar => {
      /* V18 · KOREKSYON #2 — dezaktive bouton yo lè tab la pa la (lis vid). */
      const target = document.getElementById(bar.dataset.exp);
      const empty = !target || !target.querySelector('tbody tr');
      bar.style.opacity = empty ? '.45' : '';
      bar.querySelectorAll('[data-x]').forEach(b => {
        b.disabled = empty;
        b.title = empty ? 'Aucune donnée à exporter' : '';
        b.onclick = async () => {
          if (b.disabled) return;
          const sel = '#' + bar.dataset.exp, nm = bar.dataset.expname;
          const k = b.dataset.x;
          try {
            if (k === 'csv') v13.exportCSV(sel, nm);
            else if (k === 'xlsx') await v13.exportXLSX(sel, nm);
            else v13.print(sel, nm);
          } catch (e) { v13.toast(e.message || 'Aucune donnée à exporter.', 'error'); }
        };
      });
    });
  };


  /* ---------------- Kat estatistik ---------------- */
  v13.kpis = list => `<div class="jl13-kpis">${list.map(k => `
    <div class="jl13-kpi ${k.tone || ''}"><span class="k">${esc(k.k)}</span>
      <strong class="v">${esc(k.v)}</strong>${k.sub ? `<span class="s">${esc(k.sub)}</span>` : ''}</div>`).join('')}</div>`;

  /* ---------------- Détails du ticket (pataje V15-5 / V15-6 · amelyore V18) ----------------
   * opts.print  → montre footer la (enprime). Nan popup la nou kache l.
   * V18 · KOREKSYON #4 : chak lo gayan parèt an detay (pozisyon, miltiplikatè,
   * montan) apati t.win_detail, epi tout enfòmasyon jeneral fich la parèt.
   * ------------------------------------------------------------------------ */
  const RANK_LBL = { 1: '1ye lo', 2: '2e lot', 3: '3e lot' };

  v13.ticketHtml = function (d, opts) {
    opts = opts || {};
    const t = d.ticket || {}, c = d.company || {}, a = d.agent || {}, dr = d.draw || {}, res = d.result;
    const closed = !!res;
    const hide = opts.hideOpenBalls && !closed && t.status === 'pending';
    const bets = Array.isArray(t.bets) ? t.bets : [];
    const wins = Array.isArray(t.win_detail) ? t.win_detail : [];
    const wonOn = n => wins.filter(w => String(w.n) === String(n));

    const rows = hide
      ? `<tr><td colspan="4" class="muted" style="text-align:center">
           <i class="fa-solid fa-eye-slash"></i> Les boules sont masquées — le tirage n'est pas encore fermé.</td></tr>`
      : (bets.length ? bets.map(b => {
        const n = b.n ?? b.number ?? '';
        const w = wonOn(n);
        return `<tr${w.length ? ' class="jl13-win-row"' : ''}>
            <td class="mono"><b>${esc(n)}</b></td>
            <td>${esc(b.game_code || b.game || 'borlette')}</td>
            <td class="num mono">${v13.money(b.a ?? b.amount)}</td>
            <td class="num mono">${w.length
          ? w.map(x => `<b>${esc(RANK_LBL[x.rank] || ('lo ' + x.rank))} · ${v13.money(x.prize)}</b>`).join('<br>')
          : '—'}</td></tr>`;
      }).join('')
        : `<tr><td colspan="4" class="muted">Aucun pari.</td></tr>`);

    const st = { pending: 'En attente', active: 'Actif', won: 'Gagnant', lost: 'Perdu', cancelled: 'Annuler', paid: 'Payé' }[t.status] || t.status || '—';
    const isWin = Number(t.prize_amount) > 0 || t.status === 'won' || t.status === 'paid';
    const gagnant = isWin ? (t.status === 'paid' ? 'Oui — déjà payé' : 'Oui — pas encore payé') : 'Nom';

    /* Rezime "tirages (boule = prix)" */
    const betsLine = hide ? 'les boules sont masquées' :
      (bets.length ? bets.map(b => `${esc(b.n ?? b.number ?? '')} = ${v13.money(b.a ?? b.amount)}`).join(' · ') : '—');

    const info = [
      ['ID de la fiche', `#${esc(t.ticket_no || '')}`],
      ['Seri', `<span class="mono">${esc(String(t.serial || ''))}</span>`],
      ['Tirages, jeux, boules & prix', `<b>${esc(dr.name || '—')}</b> ( ${betsLine} )`],
      ['Agent', esc(a.name || '—') + (a.public_id ? ` <span class="muted mono">(${esc(a.public_id)})</span>` : '')],
      ['Compagnie', esc(c.name || '—') + (c.public_id ? ` <span class="muted mono">(${esc(c.public_id)})</span>` : '')],
      ['Statut', esc(st)],
      ['Gagnant', gagnant + (isWin ? ` — ${v13.money(t.prize_amount)}` : '')],
      ['Date', v13.dt(t.created_at)],
      ['Date du tirage', dr.date ? v13.date(dr.date) : '—'],
      ['Total joué', v13.money(t.total)],
      ['Regleman', t.settled_at ? v13.dt(t.settled_at) : '—'],
      t.cancel_reason ? ['Rezon anilasyon', esc(t.cancel_reason)] : null
    ].filter(Boolean);

    return `<div class="jl13-fiche" id="jl13-fiche-print">
      <div class="jl13-fiche-hd">
        <strong>${esc(c.name || 'JADSTACK LOTTO')}</strong>
        <span class="muted">${esc(c.address || '')} ${c.phone ? '· ' + esc(c.phone) : ''}</span>
      </div>
      <div class="jl13-fiche-meta">
        <span>Fiche <b class="mono">#${esc(t.ticket_no || '')}</b></span>
        <span>Seri <b class="mono">${esc(String(t.serial || '').slice(0, 8))}</b></span>
        <span>Agent <b>${esc(a.name || '—')}</b></span>
        <span>Tirage <b>${esc(dr.name || '—')}</b></span>
        <span>Date <b>${v13.dt(t.created_at)}</b></span>
        <span>Statut <b>${esc(st)}</b></span>
      </div>

      <div class="table-wrap"><table class="table jl13-fiche-tbl">
        <thead><tr><th>Boule</th><th>Jeu</th><th class="num">Montant</th><th class="num">Genyen</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th colspan="3">TOTAL JWE</th><th class="num mono">${v13.money(t.total)}</th></tr>
        ${Number(t.prize_amount) > 0 ? `<tr><th colspan="3">À PAYER</th><th class="num mono">${v13.money(t.prize_amount)}</th></tr>` : ''}
        </tfoot></table></div>

      ${wins.length ? `<div class="jl13-fiche-wins">
        <h4 style="margin:.7rem 0 .3rem;font-size:.9rem">Détails des lots gagnants</h4>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Position</th><th>Boule</th><th>Jeu</th><th class="num">Jwe</th>
            <th class="num">Miltiplikatè</th><th class="num">Paiement</th></tr></thead>
          <tbody>${wins.map(w => {
        const mult = Number(w.amount) > 0 ? (Number(w.prize) / Number(w.amount)) : 0;
        return `<tr><td>${esc(RANK_LBL[w.rank] || ('lo ' + w.rank))}</td>
              <td class="mono"><b>${esc(w.n)}</b></td>
              <td>${esc(w.game_code || 'borlette')}</td>
              <td class="num mono">${v13.money(w.amount)}</td>
              <td class="num mono">${mult ? mult.toLocaleString('fr-HT', { maximumFractionDigits: 2 }) + 'x' : '—'}</td>
              <td class="num mono"><b>${v13.money(w.prize)}</b></td></tr>`;
      }).join('')}</tbody>
          <tfoot><tr><th colspan="5">TOTAL À PAYER</th>
            <th class="num mono">${v13.money(t.prize_amount)}</th></tr></tfoot>
        </table></div></div>` : ''}

      ${res ? `<div class="jl13-fiche-res">Résultats ${esc(dr.name || '')} :
          ${(L.v12 && L.v12.lots) ? L.v12.lots(res, dr.name) :
        `<b class="mono">${esc(res.lot1)} · ${esc(res.lot2)} · ${esc(res.lot3)}</b>`}</div>` : ''}

      ${opts.noInfo ? '' : `<div class="jl13-fiche-info">
        <h4 style="margin:.7rem 0 .3rem;font-size:.9rem">Enfòmasyon jeneral</h4>
        <div class="table-wrap"><table class="table">
          <tbody>${info.map(r => `<tr><th style="white-space:nowrap">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</tbody>
        </table></div></div>`}

      ${opts.print ? `<div class="jl13-fiche-ft muted">Imprimer ${Number(t.printed_count || 0)} fwa · JADSTACK LOTTO</div>` : ''}
    </div>`;
  };


  v13.ticketDetail = async function (id, opts) {
    try {
      const d = await v13.rpc('jl13_rpc_ticket_detail', { _id: id });
      /* §5.4 (PLAN-PRIME-KONEKTE-JWET) — pati « Payé »: SÈLMAN pou Agent,
         SÈLMAN sou yon fich gayan ki poko peye. */
      const _t = d.ticket || {};
      const _P = window.Lotri.peyeGayan;
      const _canPay = !!(_P && _P.isAgent(d.viewer)
        && _t.status === 'won' && !_t.paid_at
        && (!d.viewer || d.viewer.is_owner_agent !== false));
      const m = v13.modal(`<h3>Détails du ticket</h3>${v13.ticketHtml(d, opts)}
        ${_t.paid_at ? `<div class="muted" style="margin-top:.5rem;font-size:.82rem">
            <i class="fa-solid fa-circle-check"></i> Ce ticket a été payé le ${esc(v13.dt(_t.paid_at))}.</div>` : ''}
        <div class="row" style="justify-content:flex-end;margin-top:.8rem;gap:.4rem">
          ${_canPay ? `<button class="btn btn-primary" id="jl13-peye">
              <i class="fa-solid fa-hand-holding-dollar"></i> Payé</button>` : ''}
          <button class="btn btn-ghost" id="jl13-fp"><i class="fa-solid fa-print"></i> Imprimer</button>
          <button class="btn btn-primary" data-close>Fermer</button></div>`, { wide: true });
      if (_canPay) {
        m.el.querySelector('#jl13-peye').onclick = () => _P.popup({
          id: _t.id, ticket_no: _t.ticket_no,
          prize_amount: _t.prize_amount, win_detail: _t.win_detail
        }, () => { m.close(); });
      }
      m.el.querySelector('#jl13-fp').onclick = () => {
        const w = window.open('', '_blank', 'width=420,height=760');
        if (!w) return v13.toast('Autorisez les fenêtres pop-up pour pouvoir imprimer.', 'error');
        /* Vèsyon enprime: ak footer, san blòk "Enfòmasyon jeneral". */
        const printHtml = v13.ticketHtml(d, Object.assign({}, opts, { print: true, noInfo: true }));
        w.document.write(`<html><head><title>Fiche</title>
          <link rel="stylesheet" href="${location.origin}${location.pathname.replace(/[^/]*$/, '')}assets/css/v13.css">
          <style>body{font-family:Inter,Arial,sans-serif;padding:10px}</style></head>
          <body>${printHtml}</body></html>`);
        w.document.close(); setTimeout(() => w.print(), 400);
      };

      return m;
    } catch (e) { v13.toast(e.message, 'error'); }
  };

  /* ---------------- Barre filtè reyitilizab ---------------- */
  v13.filterRow = html => `<div class="jl13-filters">${html}</div>`;
  v13.field = (label, inner) => `<label class="jl13-f"><span>${esc(label)}</span>${inner}</label>`;
})();
