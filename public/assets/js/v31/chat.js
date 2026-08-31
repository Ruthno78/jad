/* =====================================================================
 * JADSTACK LOTTO V31 — CHAT (frontend refèt nèt)
 * ---------------------------------------------------------------------
 * Ranplase: assets/js/v11/chat.js + assets/js/v29/chat-polish.js
 * Sèl fichye estil: assets/css/chat-v31.css (yon sèl sous verite vizyèl).
 * Backend PA CHANJE: jl11_messages, jl11_rpc_send, reply_to, read_by,
 * hidden_for, reyaksyon — menm apèl RPC yo.
 * Nouvo estrikti bul: .msg > .msg-quote (sitasyon anwo) + .msg-body
 * (repons anba) + .msg-meta (lè + ✓✓), stil WhatsApp.
 * ===================================================================== */
(function () {
  const L = window.Lotri, v11 = L.v11, SB = () => L.supabase, esc = L.escapeHtml;
  const SYS_NAME = 'Jadstacklotto';

  /* V25 — 8 reyaksyon emoji (menm lis ak WhatsApp) */
  const REACTIONS = ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}', '\u{1F525}', '\u{1F44E}'];

  const AUDIENCES = {
    super_admin: [
      { key: 'all', label: 'Tous le monde' },
      { key: 'companies', label: 'Toutes les compagnies' },
      { key: 'agents', label: 'Tous les agents' },
      { key: 'supervisors', label: 'Tous les superviseurs' },
      { key: 'employers', label: 'Tous les employeurs' }
    ],
    /* V17 §6 — règ fiks, idantik pou TOUT Employeur, kòde nan aplikasyon
       an (pa yon paramèt editab pa Employeur endividyèl). Super Admin ka
       WÈ lis sa a (nan popup kontak li) men pa ka chanje l. */
    employer: [
      { key: 'all', label: 'Tous le monde' },
      { key: 'companies', label: 'Toutes les compagnies' },
      { key: 'agents', label: 'Tous les agents' },
      { key: 'supervisors', label: 'Tous les superviseurs' }
    ],
    company: [
      { key: 'my_agents', label: 'Mes agents' }
    ],
    /* V78.4 — un Agent ne peut démarrer une conversation qu'avec sa compagnie.
       Le support / employeur / autres agents sont volontairement exclus du frontend. */
    agent: [],
    supervisor: []
  };

  const isSys = t => t.other_role === 'super_admin';
  const isMini = t => t.other_role === 'employer';
  const nameOf = t => (isSys(t) ? SYS_NAME : (t.other_name || t.name || 'Itilizatè'));

  /* V78.4 — Frontend relationship guard.
     On ne se fie pas uniquement aux rôles renvoyés par jl11_rpc_contacts:
     pour Agent/Company, on construit la liste des user_id réellement liés
     à la même compagnie, puis on filtre les threads et contacts existants.
     Aucun backend/API n'est remplacé ici. */
  async function buildAllowedContactIds(me, rows) {
    const contacts = Array.isArray(rows) ? rows : [];
    if (!me || !me.role) return new Set();

    if (me.role === 'agent') {
      /* Prefer relationship data already returned by the contact RPC. */
      const embedded = contacts.filter(c =>
        c.role === 'company' &&
        c.company_id && me.company_id &&
        String(c.company_id) === String(me.company_id)
      );
      if (embedded.length) return new Set(embedded.map(c => String(c.user_id)));

      /* Canonical fallback: company profiles belonging to this Agent's company. */
      try {
        const { data, error } = await SB().from('jl9_profiles')
          .select('id,role,company_id')
          .eq('role', 'company')
          .eq('company_id', me.company_id);
        if (!error && Array.isArray(data)) return new Set(data.map(x => String(x.id)));
      } catch (_) {}
      return new Set();
    }

    if (me.role === 'company') {
      /* If the RPC includes agent_id/company_id, use the direct relationship. */
      const embedded = contacts.filter(c =>
        c.role === 'agent' &&
        (
          (c.company_id && me.company_id && String(c.company_id) === String(me.company_id))
        )
      );
      if (embedded.length) return new Set(embedded.map(c => String(c.user_id)));

      /* Canonical fallback: only Agent profiles assigned to this company. */
      try {
        const { data, error } = await SB().from('jl9_profiles')
          .select('id,role,company_id,agent_id')
          .eq('role', 'agent')
          .eq('company_id', me.company_id);
        if (!error && Array.isArray(data)) return new Set(data.map(x => String(x.id)));
      } catch (_) {}

      /* Last relationship-aware fallback: map company agents to contact agent_id
         without ever opening the list to unrelated users. */
      try {
        const { data: agents, error: ae } = await SB().from('jl9_agents')
          .select('id')
          .eq('company_id', me.company_id);
        if (!ae && Array.isArray(agents)) {
          const ids = new Set(agents.map(a => String(a.id)));
          return new Set(contacts
            .filter(c => c.role === 'agent' && c.agent_id && ids.has(String(c.agent_id)))
            .map(c => String(c.user_id)));
        }
      } catch (_) {}
      return new Set();
    }

    /* Super Admin / Employeur / autres rôles conservent leurs audiences existantes. */
    return null;
  }
  function filterScopedRows(me, rows, allowedIds) {
    const list = Array.isArray(rows) ? rows : [];
    if (allowedIds === null) return list;
    return list.filter(x => allowedIds.has(String(x.other_id || x.user_id)));
  }

  function badge(t) {
    if (isSys(t)) return ' <i class="fa-solid fa-circle-check v11-verified" title="Compte verifye"></i>';
    if (isMini(t)) return ' <i class="fa-solid fa-circle-check v11-verified mini" title="Mini Super-Admin — kont verifye"></i>';
    return '';
  }

  function sortThreads(list) {
    return list.slice().sort((a, b) => {
      if (isSys(a) !== isSys(b)) return isSys(a) ? -1 : 1;      // sistèm toujou anwo
      /* V64 — KOREKSYON: jl11_rpc_threads (verifye sou baz done a)
         retounen `last_message_at`, pa `last_at`. Ansyen kòd la te li
         yon chan ki pa t janm egziste — chak konparezon te bay
         Invalid Date - Invalid Date = NaN, kidonk lòd (e nan kèk
         motè JS, aparans lis la) te kraze san yon erè vizib. */
      return new Date(b.last_message_at) - new Date(a.last_message_at);
    });
  }

  LotriShell.register('messages', {
    render: async (host) => {
      const me = await L.getProfile();
      const myRole = me.role;
      const auds = AUDIENCES[myRole] || [];
      let allowedContactIds = null;

      host.innerHTML = `
        ${v11.crumbs([{ label: 'dashboard', view: 'dashboard' }, { label: 'mesaj' }])}
        <div class="page-hd"><h2>Messages</h2>
          <p class="muted">Chaque conversation est une discussion privée. ${myRole === 'agent'
            ? 'Vous pouvez échanger uniquement avec votre compagnie.'
            : 'Les messages de paiement/facturation restent privés entre l\'administration et la compagnie.'}</p></div>
        <div class="v11-chat" id="chat">
          <aside class="v11-side">
            <div class="top">
              <input class="input" id="q" placeholder="Rechercher non, imèl, ID piblik, mesaj…" aria-label="Rechercher">
              <button class="btn btn-icon" id="contacts" title="Liste de contacts"><i class="fa-solid fa-address-book"></i></button>
              <button class="btn btn-icon" id="fbtn" title="Filtres dat"><i class="fa-solid fa-filter"></i></button>
            </div>
            <!-- V16 · PATI C/D — filtè dat: yon jou presi OSWA yon peryòd -->
            <div class="v16-filters" id="fbar" hidden>
              <select class="select" id="fmode">
                <option value="">Tous dat</option>
                <option value="day">Un jour précis</option>
                <option value="range">Période (soti → jiska)</option>
              </select>
              <input class="input" id="fd1" type="date" hidden>
              <input class="input" id="fd2" type="date" hidden>
              <button class="btn btn-sm" id="fclear">Supprimer</button>
            </div>
            <div class="v11-list" id="list"><div class="spinner"></div></div>
          </aside>
          <section class="v11-main" id="main">
            <div class="empty" style="margin:auto"><i class="fa-solid fa-comments"></i>
              Choisir yon konvèsasyon</div>
          </section>
        </div>`;

      const listEl = host.querySelector('#list');
      const mainEl = host.querySelector('#main');
      const chatEl = host.querySelector('#chat');
      let threads = [], current = null, replyTo = null, reactMap = {};

      /* V16 · PATI C — rechèch (non, imèl, ID piblik, kontni mesaj) + filtè dat.
         Rechèch la fèt bò sèvè (`jl16_rpc_search_threads`) pou li ka jwenn
         mesaj ki pa nan dènye liy lan tou; si RPC la pa disponib, nou tonbe
         sou ansyen `jl11_rpc_threads` ak yon filtè lokal. */
      function dateBounds() {
        const mode = host.querySelector('#fmode').value;
        const d1 = host.querySelector('#fd1').value, d2 = host.querySelector('#fd2').value;
        if (mode === 'day' && d1) return { from: d1 + 'T00:00:00', to: d1 + 'T23:59:59' };
        if (mode === 'range') return { from: d1 ? d1 + 'T00:00:00' : null, to: d2 ? d2 + 'T23:59:59' : null };
        return { from: null, to: null };
      }

      async function loadThreads() {
        const q = (host.querySelector('#q').value || '').trim();
        const b = dateBounds();
        let data = null, error = null;
        if (q || b.from || b.to) {
          const r = await SB().rpc('jl16_rpc_search_threads', { _q: q || null, _from: b.from, _to: b.to });
          data = r.data; error = r.error;
        }
        if (!data) {
          const r = await SB().rpc('jl11_rpc_threads');
          data = r.data; error = error && r.error ? r.error : r.error;
          if (r.error) { listEl.innerHTML = `<div class="empty">${esc(r.error.message)}</div>`; return; }
        }
        let scoped = Array.isArray(data) ? data : [];
        if (myRole === 'agent' || myRole === 'company') {
          /* Rebuild the scope from the canonical profile relationship. */
          const { data: contacts, error: ce } = await SB().rpc('jl11_rpc_contacts');
          if (!ce) {
            allowedContactIds = await buildAllowedContactIds(me, contacts || []);
            scoped = filterScopedRows(me, scoped, allowedContactIds);
          } else {
            scoped = [];
          }
        }
        threads = sortThreads(scoped);
        paintList();
      }

      function paintList() {
        const q = (host.querySelector('#q').value || '').toLowerCase();
        const rows = threads.filter(t => !q ||
          (nameOf(t) + ' ' + (t.other_email || '') + ' ' + (t.other_public_id || '') + ' ' +
           (t.last_body || '')).toLowerCase().includes(q));
        listEl.innerHTML = rows.length ? rows.map(t => `
          <div class="v11-item ${current === t.thread_id ? 'active' : ''}" data-t="${t.thread_id}">
            ${v11.avatar(nameOf(t))}
            <div class="meta">
              <div class="nm">${esc(nameOf(t))}${badge(t)}
                ${t.unread ? `<span class="v11-unread">${t.unread}</span>` : ''}</div>
              <div class="sub">${esc(t.other_public_id || t.other_email || '')}</div>
              <div class="last">${esc((t.last_body || '').slice(0, 60))}</div>
            </div>
          </div>`).join('')
          : `<div class="empty" style="padding:1.2rem;font-size:.8rem">Aucune conversation.
             <br>Klike sou <i class="fa-solid fa-address-book"></i> pou jwenn kontak ou yo.</div>`;
      }

      async function openThread(id) {
        const candidate = threads.find(x => String(x.thread_id) === String(id));
        if (!candidate) return;
        if (allowedContactIds !== null && !allowedContactIds.has(String(candidate.other_id))) {
          L.toast('Contact non autorisé.', 'error');
          return;
        }
        current = id;
        chatEl.dataset.open = '1';
        const t = threads.find(x => x.thread_id === id);
        paintList();
        mainEl.innerHTML = `
          <div class="v11-chat-hd">
            <button class="btn btn-icon btn-ghost" id="back" style="display:none"><i class="fa-solid fa-arrow-left"></i></button>
            ${v11.avatar(nameOf(t))}
            <div><div class="nm">${esc(nameOf(t))}${badge(t)}</div>
              <div class="sub">${esc(t.other_public_id || '')}${t.other_email ? ' · ' + esc(t.other_email) : ''}</div></div>
            <button class="btn btn-icon btn-ghost" id="trash" title="Corbeille des messages" style="margin-left:auto">
              <i class="fa-solid fa-trash-can"></i></button>
          </div>
          <div class="v11-thread" id="th"><div class="spinner"></div></div>
          <div id="replybar"></div>
          <form class="v11-compose" id="send">
            <button type="button" class="ios-chat-plus" id="ios-plus" aria-label="Ajouter"><i class="fa-solid fa-plus"></i></button>
            <div class="ios-compose-field">
              <textarea class="input" id="body" placeholder="Message" required rows="1"></textarea>
              <button type="button" class="ios-emoji" aria-label="Emoji">😊</button>
            </div>
            <button type="submit" class="ios-send" title="Envoyer" aria-label="Envoyer"><i class="fa-solid fa-arrow-up"></i></button>
          </form>`;
        mainEl.querySelector('#back').style.display = window.innerWidth < 820 ? '' : 'none';
        mainEl.querySelector('#back').onclick = () => { chatEl.dataset.open = '0'; };
        mainEl.querySelector('#trash').onclick = () => openTrash();
        mainEl.querySelector('#send').onsubmit = async ev => {
          ev.preventDefault();
          const body = mainEl.querySelector('#body').value.trim();
          if (!body) return;
          const sendBtn = mainEl.querySelector('#send button[type="submit"], #send .btn');
          if (sendBtn) sendBtn.disabled = true;
          mainEl.querySelector('#body').value = '';
          setReply(null);
          /* V64 — KOREKSYON bouton "voye" ki te ka rete bloke pou tout
             tan: si `rpc()` jete yon eksepsyon (pa entènèt, timeout —
             pa yon senp repons { error } Supabase nòmal), `await` a te
             sote liy ki remèt bouton an aktif la san l pa janm egzekite.
             `finally` garanti bouton an toujou reaktive, nenpòt sa ki
             rive. */
          let error;
          try {
            ({ error } = await SB().rpc('jl11_rpc_send', {
              _to: t.other_id, _audience_key: null, _body: body,
              _reply_to: replyTo ? replyTo.id : null,
              _sensitivity: t.sensitivity || 'normal', _kind: 'chat', _payload: {}
            }));
          } catch (e) {
            error = e;
          } finally {
            if (sendBtn) sendBtn.disabled = false;
          }
          if (error) { L.toast(error.message, 'error'); mainEl.querySelector('#body').value = body; return; }
          // Rafrechi imedyatman fil aktyèl la san tann apèl `loadThreads()` la
          // (ki mete plis tan paske li rekalkile TOUT lis kontak la).
          await paintThread();
          loadThreads();
        };
        await paintThread();
        await SB().rpc('jl11_rpc_read_thread', { _thread: id });
        loadThreads();
      }

      function setReply(m) {
        replyTo = m;
        const bar = mainEl.querySelector('#replybar');
        if (!bar) return;
        bar.innerHTML = m ? `<div class="v11-reply-bar">
            <i class="fa-solid fa-reply"></i><span>${esc(m.body.slice(0, 70))}</span>
            <button type="button" id="cancelreply"><i class="fa-solid fa-xmark"></i></button></div>` : '';
        if (m) bar.querySelector('#cancelreply').onclick = () => setReply(null);
      }

      async function loadReactions() {
        reactMap = {};
        const { data, error } = await SB().rpc('jl_rpc_thread_reactions', { _thread: current });
        if (error) return;                       // baz done poko gen V25 — chat rete fonksyonèl
        (data || []).forEach(r => {
          (reactMap[r.message_id] = reactMap[r.message_id] || []).push(r);
        });
      }

      function reactionsHtml(id) {
        const list = reactMap[id] || [];
        if (!list.length) return '';
        return `<div class="msg-reacts">` + list.map(r =>
          `<button class="msg-react ${r.mine ? 'mine' : ''}" data-react="${id}" data-emo="${esc(r.emoji)}"
             title="${r.mine ? 'Retirer reyaksyon w' : 'Menm reyaksyon'}">${esc(r.emoji)}<span>${r.n}</span></button>`
        ).join('') + `</div>`;
      }

      function pickerHtml(id) {
        return `<div class="msg-picker" data-picker="${id}" hidden>` +
          REACTIONS.map(e => `<button class="msg-pick" data-emo="${e}" data-m="${id}">${e}</button>`).join('') +
          `</div>`;
      }

      async function react(id, emo) {
        const { error } = await SB().rpc('jl_rpc_react', { _message: id, _emoji: emo });
        if (error) { L.toast(error.message, 'error'); return; }
        await loadReactions();
        await paintThread({ keepScroll: true });
      }

      async function paintThread(opts) {
        opts = opts || {};
        const box = mainEl.querySelector('#th');
        if (!box) return;
        const prevTop = box.scrollTop;
        const wasBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
        const { data, error } = await SB().from('jl11_messages')
          .select('*').eq('thread_id', current).is('deleted_at', null)
          .order('created_at', { ascending: true }).limit(300);
        if (error) { box.innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
        /* V43 — make mesaj lòt moun nan te voye kòm "resevwa" (delivered)
           kounye a paske m louvri/rafrechi fil la. Pa bloke rann lan. */
        // KOREKSYON: .rpc() retounen yon "thenable" san .catch() — .then(ok, err)
        // evite yon TypeError ki t ap bloke rès afichaj fil mesaj yo.
        SB().rpc('jl43_rpc_mark_delivered', { _thread: current }).then(() => {}, () => {});
        const threadInfo = threads.find(x => x.thread_id === current) || {};
        const otherReadAt = threadInfo.other_last_read_at ? new Date(threadInfo.other_last_read_at) : null;
        if (!opts.keepScroll) await loadReactions();
        /* V17 §1 — mesaj yon moun te "masqué pour lui-même" pa parèt ankò
           pou li menm (lòt moun toujou wè l nòmalman). */
        const rows = (data || []).filter(m => !(m.hidden_for || []).includes(me.id));
        const byId = {}; rows.forEach(m => byId[m.id] = m);
        box.innerHTML = rows.map((m, idx) => {
          const mine = m.sender_id === me.id;
          const q = m.reply_to && byId[m.reply_to];
          /* V30 §2.7 — premye bul yon gwoup (chanjman expedite) resevwa
             yon ti "tail" style WhatsApp; mesaj swivan yo nan menm gwoup
             rete san tail, kole yo. */
          const isFirst = idx === 0 || rows[idx - 1].sender_id !== m.sender_id;
          const ageMs = Date.now() - new Date(m.created_at).getTime();
          const min = ageMs / 60000;
          /* V17 §1 · V25 — 0-5 min: mete nan poubèl · 5-10 min: modifye ·
             10+: kache pou mwen uniquement. Bouton yo VIZIB anba chak mesaj
             (pa kache dèyè yon dosou-menu ni yon doub-klik). */
          /* V27 FAZ 4b — stil WhatsApp: ikon uniquement, san tèks ekri (pa gen
             "Répondre" / "Reyaksyon" alfabetik) — bouton yo pi piti, kat mesaj
             la pa gonfle. `title` gade pou aksesibilite/tooltip uniquement. */
          let acts = `<button class="msg-act" data-act="reply" data-m="${m.id}" title="Répondre" aria-label="Répondre">
                        <i class="fa-solid fa-reply"></i></button>
                      <button class="msg-act" data-act="pick" data-m="${m.id}" title="Reyaksyon" aria-label="Reyaksyon">
                        <i class="fa-regular fa-face-smile"></i><span class="msg-act-plus">+</span></button>`;
          if (mine && min <= 5) {
            acts += `<button class="msg-act danger" data-act="delete" data-m="${m.id}" title="Supprimer" aria-label="Supprimer">
                       <i class="fa-solid fa-trash"></i></button>`;
          } else if (mine && min <= 10) {
            acts += `<button class="msg-act" data-act="edit" data-m="${m.id}" title="Modifier" aria-label="Modifier">
                       <i class="fa-solid fa-pen"></i></button>`;
          } else {
            acts += `<button class="msg-act" data-act="hide" data-m="${m.id}" title="Masquer" aria-label="Masquer">
                       <i class="fa-solid fa-eye-slash"></i></button>`;
          }
          const clock = (mine && min < 10)
            ? `<span class="msg-clock" title="Temps restant avant le changement de zone">◷ ${min <= 5 ? Math.max(0, Math.ceil(5 - min)) : Math.max(0, Math.ceil(10 - min))} min</span>`
            : '';
          /* V43 · Tchèk 3-eta estil WhatsApp (uniquement sou mesaj pa mwen):
             ✓ gri = jis voye · ✓✓ gri = resevwa (delivered_at) ·
             ✓✓ koulè aksan = lòt moun nan li l (other_last_read_at >= mesaj la). */
          let tick = '';
          if (mine) {
            const wasRead = otherReadAt && otherReadAt >= new Date(m.created_at);
            const wasDelivered = !!m.delivered_at;
            const cls = wasRead ? 'jl43-tick-read' : 'jl43-tick-grey';
            tick = wasRead || wasDelivered
              ? `<i class="fa-solid fa-check-double ${cls}"></i>`
              : `<i class="fa-solid fa-check ${cls}"></i>`;
          }
          const who  = q ? (q.sender_id === me.id ? 'Vous' : nameOf(threads.find(t => t.thread_id === current))) : '';
          return `<div class="msg ${mine ? 'out' : 'in'} ${isFirst ? 'first' : ''} ${m.sensitivity === 'sensitive' ? 'sens' : ''}" data-m="${m.id}">
            ${m.audience && mine ? `<span class="msg-aud"><i class="fa-solid fa-users"></i> ${esc(m.audience)}</span>` : ''}
            ${q ? `<div class="msg-quote" data-goto="${q.id}" role="button" tabindex="0">
                     <span class="q-who">${esc(who)}</span>
                     <p class="q-body">${esc(q.body.slice(0, 120))}</p>
                   </div>` : ''}
            <p class="msg-body">${esc(m.body)}</p>
            ${m.kind === 'action' && m.payload && m.payload.link
              ? `<div class="msg-go"><button class="btn btn-sm" data-go="${esc(m.payload.link)}">Voir</button></div>` : ''}
            <span class="msg-meta">
              ${m.edited_at ? `<span class="msg-edited" title="Modifier">modifié</span>` : ''}
              ${clock}
              ${new Date(m.created_at).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' })}
              ${tick}
            </span>
            ${reactionsHtml(m.id)}
            ${pickerHtml(m.id)}
            <div class="msg-acts">${acts}</div>
          </div>`;
        }).join('') || '<div class="empty" style="margin:auto">Aucun message pour le moment.</div>';
        if (opts.keepScroll && !wasBottom) box.scrollTop = prevTop; else box.scrollTop = box.scrollHeight;

        /* V27 FAZ4c — stil WhatsApp: klike sou tèks site a nan yon
           repons pou ale (scroll) dirèkteman sou mesaj orijinal la,
           epi mete yon ti "flash" pou moutre kilès mesaj yo vize a. */
        box.querySelectorAll('[data-goto]').forEach(el => {
          const jump = () => {
            const target = box.querySelector(`[data-m="${el.dataset.goto}"]`);
            if (!target) return;
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('msg-flash');
            setTimeout(() => target.classList.remove('msg-flash'), 900);
          };
          el.onclick = jump;
          el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(); } };
        });

        box.querySelectorAll('[data-go]').forEach(b =>
          b.onclick = () => LotriShell.go(b.dataset.go));

        /* Tap-long (mobil) pou pikè emoji · doub-klik pou reponn (tankou WhatsApp) */
        box.querySelectorAll('.msg').forEach(b => {
          const picker = b.querySelector('.msg-picker');
          let timer = null;
          const openPicker = () => {
            box.querySelectorAll('.msg-picker').forEach(x => { if (x !== picker) x.hidden = true; });
            if (picker) picker.hidden = !picker.hidden;
          };
          b.addEventListener('dblclick', ev => {
            if (ev.target.closest('.msg-acts,.msg-picker,.msg-reacts')) return;
            setReply(byId[b.dataset.m]);
          });
          b.addEventListener('touchstart', ev => {
            if (ev.target.closest('.msg-acts,.msg-picker,.msg-reacts')) return;
            timer = setTimeout(openPicker, 450);
          }, { passive: true });
          ['touchend', 'touchmove', 'touchcancel'].forEach(e =>
            b.addEventListener(e, () => { if (timer) { clearTimeout(timer); timer = null; } }, { passive: true }));
        });

        /* Choisir yon emoji nan pikè a */
        box.querySelectorAll('.msg-pick').forEach(b => b.onclick = async ev => {
          ev.stopPropagation();
          await react(b.dataset.m, b.dataset.emo);
        });
        /* Klike sou yon reyaksyon ki deja la = menm reyaksyon (oswa retire pa w) */
        box.querySelectorAll('.msg-react').forEach(b => b.onclick = async ev => {
          ev.stopPropagation();
          await react(b.dataset.react, b.dataset.emo);
        });

        /* V25 — aksyon vizib: reponn / reyaksyon / efase (poubèl) / modifye / kache */
        box.querySelectorAll('.msg-act').forEach(b => b.onclick = async (ev) => {
          ev.stopPropagation();
          const act = b.dataset.act, id = b.dataset.m, m = byId[id];
          if (!m) return;
          if (act === 'reply') { setReply(m); return; }
          if (act === 'pick') {
            const picker = box.querySelector(`.msg-picker[data-picker="${id}"]`);
            box.querySelectorAll('.msg-picker').forEach(x => { if (x !== picker) x.hidden = true; });
            if (picker) picker.hidden = !picker.hidden;
            return;
          }
          if (act === 'delete' || act === 'hide') {
            const label = act === 'delete' ? 'Déplacer ce message vers la corbeille ?' : 'Masquer ce message uniquement pour vous ?';
            const ok = await L.ui.confirm(label, act === 'delete'
              ? 'Le contenu est CONSERVÉ dans la corbeille — les utilisateurs ne le verront plus dans la discussion.'
              : 'Vous seul ne le verrez plus.');
            if (!ok) return;
            /* V64 — KOREKSYON: "Masquer" te rele MENM RPC ak "Supprimer" pa
               erè (jl17_rpc_delete_message), ki (a) mande se mesaj pa
               w, (b) efase l pou TOUT moun. Maintenant "Masquer" rele yon
               RPC apa ki kache l uniquement pou moun ki klike a. */
            const { error } = act === 'delete'
              ? await SB().rpc('jl17_rpc_delete_message', { _message: id })
              : await SB().rpc('jl17_rpc_hide_message', { _message: id });
            if (error) { L.toast(error.message, 'error'); return; }
            await paintThread(); loadThreads();
          } else if (act === 'edit') {
            const nb = prompt('Modifier le message :', m.body);
            if (nb === null) return;
            const { error } = await SB().rpc('jl17_rpc_edit_message', { _message: id, _body: nb });
            if (error) { L.toast(error.message, 'error'); return; }
            await paintThread(); loadThreads();
          }
        });
      }

      /* ----- V25 — Corbeille des messages: kontni konsève, ou ka remete l ----- */
      async function openTrash() {
        const { data, error } = await SB().rpc('jl17_rpc_trash', { _thread: current });
        if (error) { L.toast(error.message, 'error'); return; }
        const rows = data || [];
        const html = rows.length ? `<div class="v25-trash">${rows.map(r => `
            <div class="v25-trash-row">
              <div>
                <div class="bd">${esc(r.body || '(vid)')}</div>
                <div class="mt">${new Date(r.created_at).toLocaleString('fr-HT')}${r.mine ? ' · ou' : ''}</div>
              </div>
              ${r.mine ? `<button class="btn btn-sm" data-restore="${r.id}">
                 <i class="fa-solid fa-rotate-left"></i> Restaurer</button>` : ''}
            </div>`).join('')}</div>`
          : '<div class="empty">La corbeille est vide.</div>';
        const pop = v11.popup('Corbeille des messages', html,
          { subtitle: 'Les messages supprimés ne sont pas perdus — leur contenu est conservé.' });
        pop.el.querySelectorAll('[data-restore]').forEach(b => b.onclick = async () => {
          const { error: e2 } = await SB().rpc('jl17_rpc_restore_message', { _message: b.dataset.restore });
          if (e2) { L.toast(e2.message, 'error'); return; }
          pop.close(); await paintThread(); loadThreads();
        });
      }

      /* ----- V25 — Liste de contacts: panèl kòt a kòt sou PC, popup sou mobil ----- */
      function openContactsHost(html) {
        if (window.innerWidth < 1024) {
          return v11.popup('Contact', html,
            { subtitle: 'Cliquez sur le nom pour discuter, ou cochez plusieurs personnes' });
        }
        const prev = chatEl.querySelector('.v25-contacts');
        if (prev) prev.remove();
        const aside = document.createElement('aside');
        aside.className = 'v25-contacts';
        aside.innerHTML = `<div class="v25-contacts-hd">
            <strong>Contact</strong>
            <button class="btn btn-icon btn-ghost" data-x title="Fermer"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <p class="v25-contacts-sub">Cliquez sur le nom pour discuter, ou cochez plusieurs personnes</p>
          ${html}`;
        chatEl.appendChild(aside);
        chatEl.dataset.contacts = '1';
        const api = { el: aside, close() { aside.remove(); chatEl.dataset.contacts = '0'; } };
        aside.querySelector('[data-x]').onclick = () => api.close();
        return api;
      }

      /* ----- Liste de contacts (tankou WhatsApp) + V17 §6 seleksyon miltip ----- */
      host.querySelector('#contacts').onclick = async () => {
        const { data, error } = await SB().rpc('jl11_rpc_contacts');
        if (error) { L.toast(error.message, 'error'); return; }
        let rows = (data || []);
        if (myRole === 'agent' || myRole === 'company') {
          allowedContactIds = await buildAllowedContactIds(me, rows);
          rows = filterScopedRows(me, rows, allowedContactIds);
        }
        const picked = {}; // user_id -> name

        /* V17 §6 — filtè anwo lis la, chanje selon wòl moun k ap konekte a.
           Ajan/Sipèvizè: pa gen filtè ditou. Konpayi/Super Admin/Employeur:
           lis odyans predefini AK posiblite chwazi manyèlman anba a. */
        const roleAuds = AUDIENCES[myRole] || [];
        const showFilter = roleAuds.length > 0;
        const filterHtml = showFilter ? `
          <div class="top" style="padding:0 0 .6rem">
            <select class="select" id="cf-filter">
              <option value="">— Choisir manyèlman anba a —</option>
              ${roleAuds.map(a => `<option value="${a.key}">${esc(a.label)}</option>`).join('')}
            </select>
          </div>` : '';

        const html = `
          ${filterHtml}
          <div class="v11-list" id="cf-list" style="max-height:44vh">
          ${rows.length ? rows.map(c => `<div class="v11-item" data-c="${c.user_id}" data-name="${esc(c.role === 'super_admin' ? SYS_NAME : c.name)}">
              <label class="v17-cf-check" style="display:flex;align-items:center;gap:.5rem;width:100%;cursor:pointer">
                <input type="checkbox" class="v17-cf-box" data-cid="${c.user_id}">
                ${v11.avatar(c.role === 'super_admin' ? SYS_NAME : c.name)}
                <div class="meta">
                  <div class="nm">${esc(c.role === 'super_admin' ? SYS_NAME : c.name)}
                    ${c.role === 'super_admin' ? '<i class="fa-solid fa-circle-check v11-verified"></i>'
                      : c.role === 'employer' ? '<i class="fa-solid fa-circle-check v11-verified mini" title="Mini Super-Admin — kont verifye"></i>' : ''}</div>
                  <div class="sub">${esc(c.public_id || '')}${c.email ? ' · ' + esc(c.email) : ''}</div>
                  <div class="last">${c.has_thread ? 'Conversations ouvertes' : 'Aucun échange pour le moment'}</div>
                </div>
              </label>
            </div>`).join('') : '<div class="empty">Aucun contact.</div>'}
          </div>
          <div id="cf-sendbar" style="padding-top:.6rem" hidden>
            <button class="btn btn-primary" id="cf-send" style="width:100%">
              <i class="fa-solid fa-paper-plane"></i> <span id="cf-send-label"></span></button>
          </div>`;
        const pop = openContactsHost(html);

        /* Klike sou non an (pa checkbox la) ouvri chat endividyèl la. */
        pop.el.querySelectorAll('[data-c]').forEach(el => el.onclick = async (ev) => {
          if (ev.target.closest('.v17-cf-box')) return;
          if (allowedContactIds !== null && !allowedContactIds.has(String(el.dataset.c))) {
            L.toast('Ce contact n’est pas autorisé.', 'error');
            return;
          }
          pop.close();
          const { error: e2 } = await SB().rpc('jl11_rpc_send', {
            _to: el.dataset.c, _audience_key: null, _body: '👋', _reply_to: null,
            _sensitivity: 'normal', _kind: 'chat', _payload: {}
          });
          if (e2) { L.toast(e2.message, 'error'); return; }
          await loadThreads();
          const t = threads.find(x => x.other_id === el.dataset.c);
          if (t) openThread(t.thread_id);
        });

        /* V17 §6 — bouton anba a, kache pa defo, parèt lè omwen 1 moun tcheke. */
        function refreshSendBar() {
          const ids = Object.keys(picked);
          const bar = pop.el.querySelector('#cf-sendbar');
          const label = pop.el.querySelector('#cf-send-label');
          if (!ids.length) { bar.hidden = true; return; }
          bar.hidden = false;
          const names = ids.map(id => picked[id]);
          const shown = names.slice(0, 3);
          label.textContent = 'Envoyer un message à ' + shown.join(', ') +
            (names.length > 3 ? `, +${names.length - 3} lòt` : '');
        }
        pop.el.querySelectorAll('.v17-cf-box').forEach(cb => cb.onchange = () => {
          const id = cb.dataset.cid;
          const item = cb.closest('[data-c]');
          if (cb.checked) picked[id] = item.dataset.name; else delete picked[id];
          refreshSendBar();
        });

        const sendBtn = pop.el.querySelector('#cf-send');
        if (sendBtn) sendBtn.onclick = () => {
          const ids = Object.keys(picked);
          if (!ids.length) return;
          const names = ids.map(id => picked[id]);
          const label = names.length > 3
            ? `${names.slice(0, 3).join(', ')}, +${names.length - 3} autres` : names.join(', ');
          const body = `<p class="muted" style="font-size:.8rem">Chak moun nan seleksyon sa a ap resevwa mesaj la
             <strong>apa</strong>, dans sa propre discussion privée.</p>
           <textarea class="input" id="mb" rows="4" placeholder="Ekri mesaj la…"></textarea>`;
          const p2 = v11.popup('Envoyé à ' + label, body,
            { footer: '<button class="btn btn-primary" id="ms"><i class="fa-solid fa-paper-plane"></i> Envoyer</button>' });
          p2.el.querySelector('#ms').onclick = async () => {
            const b = p2.el.querySelector('#mb').value.trim();
            if (!b) return;
            try {
              await SB().rpc('jl17_rpc_send_bulk', {
                _to_ids: ids, _body: b, _sensitivity: 'normal', _kind: 'chat', _payload: {}
              });
              p2.close(); pop.close();
              L.toast('Message envoyé ' + names.length + ' moun', 'success');
              loadThreads();
            } catch (e) { L.toast(e.message, 'error'); }
          };
        };

        /* V17 §6 — filtè odyans predefini (anlè seleksyon manyèl la). */
        const cfFilter = pop.el.querySelector('#cf-filter');
        if (cfFilter) cfFilter.onchange = () => {
          const key = cfFilter.value; if (!key) return;
          pop.close();
          const label = (roleAuds.find(a => a.key === key) || {}).label || key;
          const p2 = v11.popup('Message à : ' + label,
            `<p class="muted" style="font-size:.8rem">Chak moun nan group sa a ap resevwa mesaj la
               <strong>apa</strong>, dans sa propre discussion privée.</p>
             <textarea class="input" id="gb" rows="4" placeholder="Ekri mesaj la…"></textarea>`,
            { footer: '<button class="btn btn-primary" id="gs"><i class="fa-solid fa-paper-plane"></i> Envoyer</button>' });
          p2.el.querySelector('#gs').onclick = async () => {
            const body = p2.el.querySelector('#gb').value.trim();
            if (!body) return;
            const { error: e3 } = await SB().rpc('jl11_rpc_send', {
              _to: null, _audience_key: key, _body: body, _reply_to: null,
              _sensitivity: 'normal', _kind: 'chat', _payload: {}
            });
            if (e3) { L.toast(e3.message, 'error'); return; }
            p2.close(); L.toast('Message envoyé à ' + label, 'success');
            loadThreads();
          };
        };
      };

      /* V16 · PATI D — debounce 300ms, menm modèl ak lòt paj yo. */
      let _t = null;
      host.querySelector('#q').addEventListener('input', () => {
        paintList();
        clearTimeout(_t);
        _t = setTimeout(() => loadThreads().catch(() => { }), 300);
      });
      const fbar = host.querySelector('#fbar');
      host.querySelector('#fbtn').onclick = () => { fbar.hidden = !fbar.hidden; };
      const fmode = host.querySelector('#fmode'), fd1 = host.querySelector('#fd1'), fd2 = host.querySelector('#fd2');
      const syncMode = () => {
        fd1.hidden = !fmode.value;
        fd2.hidden = fmode.value !== 'range';
        fd1.placeholder = fmode.value === 'range' ? 'Soti' : 'Jour';
      };
      fmode.onchange = () => { syncMode(); loadThreads().catch(() => { }); };
      fd1.onchange = fd2.onchange = () => loadThreads().catch(() => { });
      host.querySelector('#fclear').onclick = () => {
        fmode.value = ''; fd1.value = ''; fd2.value = ''; syncMode();
        host.querySelector('#q').value = '';
        loadThreads().catch(() => { });
      };
      syncMode();
      listEl.addEventListener('click', e => {
        const it = e.target.closest('[data-t]');
        if (it) openThread(it.dataset.t);
      });

      await loadThreads();
      if (threads.length) openThread(threads[0].thread_id);
    }
  });

  /* ---------- Toast «X nouvo mesaj» ki mennen nan paj mesaj la ---------- */
  let lastUnread = null;
  async function pollUnread() {
    if (!L.supabase || !window.__lotriProfile) return;
    const { data, error } = await SB().rpc('jl11_rpc_unread');
    if (error) return;
    const n = Number(data || 0);
    if (lastUnread !== null && n > lastUnread) {
      v11.toastLink(`${n - lastUnread} nouveaux messages — cliquez pour les voir`, 'messages', 'info');
    }
    lastUnread = n;
  }
  document.addEventListener('lotri:ready', () => {
    pollUnread();
    setInterval(pollUnread, 20000);
  });
  /* ---------- V31 — finisyon vizyèl (ansyen v29/chat-polish.js) ---------- */
  /* 1) Logo de la compagnie nan avatar yo · 2) « pop » lè yon emoji chwazi. */
  function brandLogo() {
    const b = (L.config && (L.config.brand || {})) || {};
    return b.logo_mark || b.logo_wide || '';
  }
  function logoAvatars(root) {
    const url = brandLogo();
    if (!url) return;
    (root || document).querySelectorAll('.v31-av:not(.v31-done), .v11-av:not(.v31-done)').forEach(av => {
      av.classList.add('v31-done');
      if (av.querySelector('img')) return;
      const name = av.textContent.trim();
      av.classList.add('v31-logo');
      av.innerHTML = '<img src="' + url + '" alt="' + name + '">';
      av.querySelector('img').addEventListener('error', () => {
        av.classList.remove('v31-logo');
        av.textContent = name;
      });
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.msg-pick, .msg-react');
    if (!b) return;
    b.classList.remove('msg-picked');
    void b.offsetWidth;
    b.classList.add('msg-picked');
    setTimeout(() => b.classList.remove('msg-picked'), 400);
  });
  document.addEventListener('DOMContentLoaded', async () => {
    try { if (L.loadConfig) await L.loadConfig(); } catch (_) {}
    logoAvatars();
    if (window.MutationObserver) {
      let t = null;
      new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => logoAvatars(), 150); })
        .observe(document.body, { childList: true, subtree: true });
    }
  });
})();
