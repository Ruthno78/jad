(function(){
  /* PATI A.2 — pa janm bay JSON.parse yon valè ki pa yon String. */
  function safeBets(v){
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim().length){
      try { const o = JSON.parse(v); return Array.isArray(o) ? o : []; } catch(_){ return []; }
    }
    return [];
  }
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  /* ------- V13 §A11 — Règ chif pa jeu : SÈL SOUS = BAZ DONE -------
     Ansyen V12 te gen yon tab `RULES` an dur; se poutèt sa yon ajan te ka
     antre 6 chif sou yon jeu 3 chif. Maintenant nou li jl13_rpc_game_rules()
     (ki soti nan jl9_games.digits_json), epi sèvè a re-valide ak yon
     trigger — kidonk pa gen mwayen kontounen l. */
  const GAME_RULES = new Map();
  const KEY = c => String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');

  async function loadGameRules(){
    GAME_RULES.clear();
    const { data, error } = await SB().rpc('jl13_rpc_game_rules');
    if (error || !Array.isArray(data)) return GAME_RULES;
    data.forEach(g => {
      const len = (Array.isArray(g.lengths) && g.lengths.length ? g.lengths : [2])
        .map(Number).filter(n => n > 0).sort((a,b)=>a-b);
      GAME_RULES.set(KEY(g.code), {
        code: g.code, name: g.name, len,
        sep: g.separator || '',
        min: Number(g.min_amount || 1),
        max: g.max_amount == null ? null : Number(g.max_amount),
        hint: len.join(' oswa ') + ' chif'
             + (g.separator ? ` (egz. ${'9'.repeat(len[0]/2)}${g.separator}${'9'.repeat(len[0]/2)})` : '')
      });
    });
    return GAME_RULES;
  }
  function ruleFor(code){
    return GAME_RULES.get(KEY(code))
        || { len:[2], min:1, max:null, sep:'', hint:'2 chif' };
  }
  window.Lotri.gameRules = { load: loadGameRules, get: ruleFor, all: GAME_RULES };


  LotriShell.register('pos', {
    render: async (host)=>{
      const prof = window.__lotriProfile || {};
      await loadGameRules();                       /* V13 §A11 */
      /* Fallback si pg_cron pa aktive sou pwojè a: konfime tiraj jodi a
         senkronize (kreye/ouvri) ak fermer anvan nou li lis 'open' yo,
         menm jan jl12_rpc_tick() sèvi kòm fallback pou lòt sistèm nan. */
      try { await SB().rpc('jl9_rpc_tick_draws'); } catch(_){ /* silans — pa bloke vant */ }
      const [{data:draws},{data:games},{data:company}] = await Promise.all([
        /* V24 — nou li VI a `jl24_draws_today` (sous verite a) : li deja
           kalkile `sales_open` apati open_time/close_time Super-Admin an
           (lè Ayiti). Konsa un tirage re-ouvri otomatikman chak jou. */
        SB().from('jl24_draws_today').select('id,name,status,game_code,closes_at,sales_open,sort_order')
            .eq('sales_open', true).order('sort_order').order('name'),
        SB().from('jl9_games').select('code,name').eq('active',true).order('code'),
        /* v9.4 — antèt konpayi a pou resi ofisyèl la (Faz 4). */
        prof.company_id
          ? SB().from('jl9_companies').select('name,address,phone').eq('id', prof.company_id).maybeSingle()
          : Promise.resolve({ data: null })
      ]);
      window.__lotriCompany = company || window.__lotriCompany || null;

      host.innerHTML = `
      <div class="pos-wrap">
        <div class="card">
          <div class="card-hd"><h3>POS — Vente de tickets</h3>
            <span class="muted" style="font-size:.78rem">Vous pouvez mettre plusieurs tirages sur <b>la même fiche</b>.</span></div>

          <div class="form-row">
            <label class="label" for="draw">Tirage</label>
            <select class="select" id="draw">
              ${(draws||[]).map(d=>`<option value="${d.id}" data-gc="${esc(d.game_code||'')}">${esc(d.name)}</option>`).join('') || '<option value="">Aucun tirage ouvert</option>'}
            </select>
          </div>

          <div class="form-row">
            <label class="label">Jeu</label>
            <div class="game-tabs" id="game-tabs">
              ${(games||[]).map((g,i)=>`<button type="button" class="game-tab" data-code="${esc(g.code)}" aria-pressed="${i===0?'true':'false'}">${esc(g.name||g.code)}</button>`).join('')}
            </div>
          </div>

          <!-- PATI K.3 — PA GEN klavye vityèl entegre: se klavye natif
               aparèy la (inputmode=numeric) ki sèvi, sou mobil kou sou PC. -->
          <input class="input pos-num mono" id="number" type="text" inputmode="numeric"
                 pattern="[0-9]*" autocomplete="off" enterkeyhint="done" placeholder="––"
                 aria-label="Numéro du pari">
          <div class="keypad-hint" id="hint"></div>

          <div class="form-row" style="margin-top:.9rem">
            <label class="label" for="amount">Montant (HTG)</label>
            <input class="input mono" id="amount" type="number" inputmode="decimal" step="0.01" min="1" placeholder="0.00">
          </div>

          <button class="btn btn-primary" id="add-bet" style="width:100%"><i class="fa-solid fa-plus"></i> Ajouter un pari pour ce tirage</button>
        </div>

        <div class="card">
          <div class="card-hd"><h3>La fiche (tous les tirages)</h3></div>
          <div id="lines"><div class="empty"><i class="fa-regular fa-circle"></i>Aucun pari pour le moment.</div></div>
          <div class="pos-total" aria-label="Total et finalisation de la fiche">
            <button class="btn btn-primary pos-finalize-btn" id="save"><i class="fa-solid fa-print"></i> Finaliser &amp; Imprimer</button>
            <strong class="pos-total-value">Total : <span id="total" class="mono">0.00</span> HTG</strong>
          </div>
        </div>
      </div>
      <!-- V27 FAZ 3 §3.2 — bouton diskrè « Rapport journalier » anba paj POS la -->
      <div class="jl27-pos-foot">
        <button type="button" class="jl27-quiet" id="jl27-pos-report">
          <i class="fa-solid fa-chart-line"></i> Rapport journalier</button>
      </div>
      <div id="printed"></div>`;

      const posReport = host.querySelector('#jl27-pos-report');
      if (posReport) posReport.onclick = ()=> LotriShell.go('arapo');

      /* Q2i Bluetooth (add-on POS Agent) — panèl printer la, opsyonèl. */
      try { window.JadStackQ2iPOS && window.JadStackQ2iPOS.mountPOS(host); } catch(_) {}


      const sel = document.getElementById('draw');
      const tabs = document.getElementById('game-tabs');
      const numInput = document.getElementById('number');
      const hint = document.getElementById('hint');
      let game = (games||[])[0]?.code || '';

      function setGame(code){
        game = code;
        tabs.querySelectorAll('.game-tab').forEach(b=> b.setAttribute('aria-pressed', b.dataset.code===code ? 'true':'false'));
        const r = ruleFor(code);
        hint.textContent = r.hint;
        numInput.value = '';
        numInput.maxLength = Math.max.apply(null, r.len);
      }
      tabs.addEventListener('click', e=>{
        const b = e.target.closest('.game-tab'); if (!b) return;
        setGame(b.dataset.code);
      });
      sel.addEventListener('change', ()=>{
        const gc = sel.selectedOptions[0]?.dataset.gc;
        if (gc && tabs.querySelector(`[data-code="${gc}"]`)) setGame(gc);
      });
      setGame(game);
      if (sel.value) sel.dispatchEvent(new Event('change'));

      /* ---- PATI K.3 — klavye natif uniquement: nou jis netwaye antre a ---- */
      numInput.addEventListener('input', ()=>{
        const max = Math.max.apply(null, ruleFor(game).len);
        const only = numInput.value.replace(/\D+/g,'').slice(0, max);
        if (only !== numInput.value) numInput.value = only;
      });

      /* V23 · C2-b — FICHE MILTI-TIRAJ
         `lines` = [{ draw_id, draw_name, bets: [{n,a,game_code}, ...] }, ...]
         Yon liy pa tiraj chwazi; chak liy gen pwòp lis pari. */
      const lines = [];
      const findLine = (drawId) => lines.find(l => l.draw_id === drawId);

      const refresh = ()=>{
        document.getElementById('lines').innerHTML = lines.length
          ? lines.map((l,li)=>`
              <div class="pos-draw-block" style="margin-bottom:.6rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)">
                <div class="row" style="justify-content:space-between;align-items:center">
                  <strong>${esc(l.draw_name)}</strong>
                  <button class="btn btn-sm btn-ghost" data-rm-line="${li}" aria-label="Retirer tout ce tirage"><i class="fa-solid fa-xmark"></i> Retirer le tirage</button>
                </div>
                ${l.bets.map((b,bi)=>`<div class="bet-line">
                    <span class="n">${esc(b.n)}</span>
                    <span class="muted">${esc(b.game_code)}</span>
                    <span class="mono">${Number(b.a).toFixed(2)} HTG</span>
                    <button class="btn btn-sm btn-icon btn-danger" data-rm-bet="${li}:${bi}" aria-label="Retirer"><i class="fa-solid fa-xmark"></i></button>
                  </div>`).join('')}
              </div>`).join('')
          : '<div class="empty"><i class="fa-regular fa-circle"></i>Aucun pari pour le moment.</div>';
        const grand = lines.reduce((s,l)=> s + l.bets.reduce((a,b)=>a+Number(b.a),0), 0);
        document.getElementById('total').textContent = grand.toFixed(2);
      };

      document.getElementById('add-bet').onclick = async ()=>{
        const n = numInput.value.trim();
        const a = Number(document.getElementById('amount').value);
        const r = ruleFor(game);
        if (!sel.value) { window.Lotri.toast('Sélectionnez un tirage','error'); return; }
        if (!/^[0-9]+$/.test(n)) { window.Lotri.toast('Uniquement des chiffres dans la boule.', 'error'); return; }
        if (!r.len.includes(n.length)) {
          window.Lotri.toast(`Le jeu ${KEY(game)} demande ${r.hint} — vous avez saisi ${n.length}.`, 'error'); return; }
        if (!a || a <= 0) { window.Lotri.toast('Saisissez un montant valide','error'); return; }
        if (a < r.min) { window.Lotri.toast(`Le montant minimum pour ${KEY(game)} est de ${r.min} HTG.`,'error'); return; }
        if (r.max != null && a > r.max) { window.Lotri.toast(`Montant maksimòm pou ${KEY(game)} se ${r.max} HTG.`,'error'); return; }
        // Limites de boules an tan reyèl
        const blocked = await window.Lotri.security.checkBallLimit(sel.value, game, n, a);
        if (blocked) { window.Lotri.toast(blocked, 'error'); return; }
        let l = findLine(sel.value);
        if (!l) {
          l = { draw_id: sel.value, draw_name: sel.selectedOptions[0].textContent.trim(), bets: [] };
          lines.push(l);
        }
        l.bets.push({ n, a, game_code: game });
        numInput.value = ''; document.getElementById('amount').value = '';
        refresh();
      };

      document.getElementById('lines').addEventListener('click', e=>{
        const rmLine = e.target.closest('[data-rm-line]');
        if (rmLine) { lines.splice(Number(rmLine.dataset.rmLine),1); refresh(); return; }
        const rmBet = e.target.closest('[data-rm-bet]');
        if (rmBet) {
          const [li, bi] = rmBet.dataset.rmBet.split(':').map(Number);
          lines[li].bets.splice(bi, 1);
          if (!lines[li].bets.length) lines.splice(li, 1);
          refresh();
        }
      });

      document.getElementById('save').onclick = async ()=>{
        if (!lines.length) { window.Lotri.toast('Aucun pari','error'); return; }
        openFichePreview();
      };

      /* V27 FAZ 4b — olye finalize/enprime yon sèl kou, nou montre yon
         APÈSI (previzyon) fich la pandan 5s ak yon bouton X sou tèt li.
         · Kontdaoun fini san koupe → nou finalize VRÈMAN (kreye tikè +
           mak enprime + louvri enprimant otomatikman).
         · X klike anvan 5s → anile: `lines` pa touche, ajan ka modifye
           epi peze "Finaliser & Imprimer" ankò pou relanse yon nouvo apèsi. */
      function openFichePreview(){
        const snapshot = lines.map(l => ({ draw_id: l.draw_id, draw_name: l.draw_name, bets: l.bets.slice() }));
        const total = Number(snapshot.reduce((s,l)=> s + l.bets.reduce((a,b)=>a+Number(b.a),0), 0).toFixed(2));
        const draft = ficheData(
          { ticket_no: '', serial: '', total, created_at: Date.now() },
          snapshot.map(l => ({ draw_name: l.draw_name, bets: l.bets }))
        );
        draft.ref = 'APÈSI'; draft.serial = '—'; draft.number = '—';

        const back = document.createElement('div');
        back.className = 'modal-backdrop v9-modal jl-fiche-preview';
        back.innerHTML = `
          <div class="modal jl-fiche-preview-modal" role="dialog" aria-modal="true">
            <button type="button" class="btn btn-icon btn-ghost jl-fiche-x" aria-label="Fermer l\'aperçu" title="Fermer">
              <i class="fa-solid fa-xmark"></i></button>
            <div class="jl-fiche-preview-hd">
              <strong>Aperçu de la fiche</strong>
              <span class="jl-fiche-cd" id="jl-fiche-cd">5s</span>
            </div>
            <div class="fiche-wrap" style="max-width:320px;margin:.5rem auto 0">${window.Lotri.renderFiche(draft)}</div>
            <p class="muted jl-fiche-preview-note">La fiche s\'imprime automatiquement dans <span id="jl-fiche-cd2">5</span>s —
              peze <i class="fa-solid fa-xmark"></i> pour annuler et modifier.</p>
          </div>`;
        document.body.appendChild(back);

        let remaining = 5, cancelled = false, timerId = null;
        const cdEl = back.querySelector('#jl-fiche-cd'), cdEl2 = back.querySelector('#jl-fiche-cd2');

        const cleanup = () => { clearInterval(timerId); back.remove(); };
        const cancel = () => { if (cancelled) return; cancelled = true; cleanup(); };
        const finish = async () => {
          if (cancelled) return;
          cleanup();
          await commitTicket(snapshot, total);
        };

        back.querySelector('.jl-fiche-x').onclick = cancel;
        back.addEventListener('click', e => { if (e.target === back) cancel(); });
        const escKey = e => { if (e.key === 'Escape') cancel(); };
        document.addEventListener('keydown', escKey, { once: true });

        timerId = setInterval(() => {
          remaining -= 1;
          if (cdEl) cdEl.textContent = remaining + 's';
          if (cdEl2) cdEl2.textContent = remaining;
          if (remaining <= 0) finish();
        }, 1000);
      }

      async function commitTicket(snapshot, total){
        const payload = snapshot.map(l => ({ draw_id: l.draw_id, bets: l.bets }));
        const { data, error } = await SB().rpc('jl9_rpc_create_ticket', { _lines: payload, _total: total });
        if (error) { window.Lotri.toast(error.message,'error'); return; }
        window.Lotri.toast('Ticket créé : '+data.ticket_no,'success');
        const receiptLines = snapshot.map(l => ({ draw_name: l.draw_name, bets: l.bets.slice() }));
        lines.length = 0; refresh();
        renderReceipt(data, receiptLines);
        const realFiche = ficheData(data, receiptLines);
        try { await SB().rpc('jl17_rpc_mark_printed', { _ticket: data.id }); } catch(_) {}
        /* Q2i Bluetooth (add-on): pase done tikè a bay printer la si li disponib. */
        try { window.JadStackQ2iPOS && window.JadStackQ2iPOS.onTicket(realFiche, data); } catch(_) {}
        window.Lotri.printFiche(realFiche);
      }


      /* v9.4 §Faz4 — resi ofisyèl la: menm fòma sou tout ekran an ak sou papye.
         Nou sèvi ak window.Lotri.renderFiche/printFiche pou pa gen de modèl.
         V23 · C2-b — `receiptLines` se [{draw_name, bets:[{n,a,game_code}]}, ...]
         (yon seksyon pa tiraj sou la même fiche). */
      function ficheData(t, receiptLines){
        const co = (window.__lotriCompany || {});
        const d = new Date(t.created_at || Date.now());
        return {
          company: { name: co.name || (window.Lotri.config.brand||{}).name || 'JADSTACK LOTTO',
                     address: co.address || '', phone: co.phone || '' },
          ref: t.ticket_no, serial: t.serial || t.id || t.ticket_no,
          number: t.ticket_no,
          date: d.toLocaleDateString('fr-HT'), time: d.toLocaleTimeString('fr-HT'),
          currency: 'HTG', total: t.total,
          draws: (receiptLines||[]).map(l => ({
            draw_name: l.draw_name,
            bets: (l.bets||[]).map(b => ({ game_code: b.game_code, game_label: b.game_code,
                                           number: b.n, amount: b.a }))
          }))
        };
      }

      function renderReceipt(t, receiptLines){
        const f = ficheData(t, receiptLines);
        document.getElementById('printed').innerHTML = `
          <div class="fiche-wrap" style="max-width:340px;margin-top:1rem">
            ${window.Lotri.renderFiche(f)}
            <button class="btn btn-primary btn-sm" style="margin-top:.75rem;width:100%" id="pf">
              <i class="fa-solid fa-print"></i> Imprimer Ticket</button>
          </div>`;
        document.getElementById('pf').onclick = async () => {
          /* V17 §2 — kontdaoun 10 min pou efase san apwobasyon kòmanse
             lè yo peze "Imprimer" pou premye fwa (idempotan: coalesce
             nan SQL a fè li pa ka reyekri yon 2yèm fwa). */
          if (t && t.id) {
            try { await SB().rpc('jl17_rpc_mark_printed', { _ticket: t.id }); }
            catch(_) {} /* si sa echwe, printFiche kontinye kanmenm */
          }
          window.Lotri.printFiche(f);
        };
      }
    }
  });

  LotriShell.register('tickets', {
    render: async (host)=>{
      host.innerHTML = `<div class="card"><div class="card-hd"><h3>Mes tickets</h3>
        <span class="muted" style="font-size:.8rem">Vous pouvez supprimer un ticket vous-même pendant <b>10 minutes</b> apre ou enprime l
          (epi toujou anvan tiraj la fermer). Après sa, se yon <b>demande</b> qui est envoyée au Super Admin / Mini Super Admin.</span></div>
        <div id="list"></div></div>`;

      const money = n => Number(n||0).toLocaleString('fr-HT',{minimumFractionDigits:2,maximumFractionDigits:2})+' HTG';
      const MIN10 = 10*60*1000;
      const selfWindow = t => {
        const base = t.printed_at ? new Date(t.printed_at).getTime() : null;
        return base ? (Date.now() - base) <= MIN10 : true; /* pa ankò enprime → toujou posib */
      };

      const load = async()=>{
        const { data } = await SB().from('jl9_tickets').select('*').is('deleted_at', null)
          .order('created_at',{ascending:false}).limit(200);
        const list = document.getElementById('list');
        if (!list) return; /* vi a chanje pandan chajman an */
        list.innerHTML = (data||[]).length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th class="num">Total</th><th class="num">Prime</th><th>Statut</th><th>Imprimer</th><th>Date</th><th></th></tr></thead>
             <tbody>${data.map(t=>`<tr data-ticket="${t.id}"><td class="mono" data-copy-value="${esc(t.ticket_no)}">${esc(t.ticket_no)}</td>
               <td class="num mono" data-copy-value="${Number(t.total||0)}">${money(t.total)}</td>
               <td class="num mono" data-copy-value="${Number(t.prize_amount||0)}">${money(t.prize_amount)}</td>
               <td><span class="badge ${t.status==='won'?'badge-success':t.status==='cancelled'?'badge-danger':''}">${esc(t.status)}</span></td>
               <td class="muted">${t.printed_at? new Date(t.printed_at).toLocaleString('fr-HT') : '—'}</td>
               <td class="muted">${new Date(t.created_at).toLocaleString('fr-HT')}</td>
               <td>${t.status==='active'
                    ? (selfWindow(t)
                        ? `<button class="btn btn-sm btn-danger" data-del="${t.id}"><i class="fa-solid fa-trash"></i> Supprimer</button>`
                        : `<button class="btn btn-sm btn-ghost" data-req="${t.id}"><i class="fa-solid fa-paper-plane"></i> Demander l\'annulation</button>`)
                    : ''}</td></tr>`).join('')}</tbody></table></div>`
          : '<div class="empty"><i class="fa-solid fa-ticket"></i>Aucun ticket.</div>';
      };

      host.addEventListener('click', async(e)=>{
        const del = e.target.closest('[data-del]');
        const req = e.target.closest('[data-req]');
        if (del){
          const ok = await window.Lotri.ui.confirm('Supprimer ce ticket ?', 'Il sera déplacé vers la corbeille.');
          if (!ok) return;
          const { error } = await SB().rpc('jl9_rpc_delete_ticket', { _ticket: del.dataset.del });
          if (error) window.Lotri.toast(error.message,'error'); else window.Lotri.toast('Ticket supprimé','success');
          load(); return;
        }
        if (req){
          const reason = prompt('Pourquoi voulez-vous annuler ce ticket ? (L\'administration en prendra connaissance)');
          if (reason === null) return;
          const { error } = await SB().rpc('jl17_rpc_request_delete_ticket',
            { _ticket: req.dataset.req, _reason: reason || null });
          if (error) window.Lotri.toast(error.message,'error');
          else window.Lotri.toast('Demande envoyée — en attente d\'approbation.','success');
          load();
        }
      });

      await load();

      /* ---- V17-BUG-1: non channel INIK + bon non tab + dekoneksyon pwòp ----
         Avant: SB().channel('t') sou tab 'tickets' — menm non channel te
         reyitilize chak fwa vi a montre, sa ki lakòz konfli abònman
         (CHANNEL_ERROR / mize a jou ki rete kanpe). Maintenant chak montaj gen
         pwòp channel li, epi nou retire l lè vi a demonte. */
      const chName = 'jl17-tickets-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
      const ch = SB().channel(chName)
        .on('postgres_changes', { event:'*', schema:'public', table:'jl9_tickets' }, load)
        .subscribe();
      const stop = () => { try { SB().removeChannel(ch); } catch(_){} };
      document.addEventListener('lotri:view', stop, { once:true });
      window.addEventListener('beforeunload', stop, { once:true });
      return stop; /* si chasi a sipòte yon fonksyon netwayaj */
    }
  });

  LotriShell.register('messages', { render: async(h)=> window._sharedMessages(h) });
})();
