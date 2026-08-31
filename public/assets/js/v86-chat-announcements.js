/* JADSTACK LOTTO V86 — Mesajri ak Audience + Vwa + Kamera + Aksize lekti
 * ---------------------------------------------------------------------
 * Ranplase v78-chat-announcements.js (menm kle vi 'messages').
 * - Chak audience diferan parèt tankou yon konvèzasyon apa (lis konvèzasyon).
 * - Sèlman Super Admin + Employeur (Mini Super Admin) ka pibliye/chwazi audience.
 * - Audience posib: Sistèm (tout moun, dèfo) · Konpayi (yon sèl/lis/tout,
 *   "tout moun" oswa "admin sèlman") · Ajan (yon sèl/lis, pa konpayi).
 * - Nòt vokal (anrejistreman), Kamera an tan reyèl (foto/videyo), pyès jwenn
 *   ki tache parèt an aperçu anvan voye — tout sa ale nan menm bucket
 *   Storage "announcements" ak ansyen sistèm nan (san touche l).
 * - Vizyalizè medya style WhatsApp (media-viewer.js) pou zoom foto/videyo.
 * - Detay "Audience" (kiyes ki gen dwa li) + aksize lekti (kiyes ki li)
 *   disponib pou moun ki pibliye a + Super Admin/Employeur.
 */
(function () {
  const L = window.Lotri;
  const SB = () => L.supabase;
  const esc = L.escapeHtml;
  const DELETE_WINDOW_MS = 15 * 60 * 1000;

  let me = null;
  let host = null;
  let screen = 'list';           // 'list' | 'thread'
  let currentConv = null;        // { conversation_key, audience_type, audience_scope, audience_company_ids, audience_agent_ids }
  let audOptions = null;         // { companies:[], agents:[] } — sèlman pou super_admin/employer
  let pollTimer = null;

  /* ---------------------------------------------------------------------
   * Zouti
   * ------------------------------------------------------------------- */
  function greeting() {
    const h = new Date().getHours();
    return h < 14 ? 'Bonjou' : 'Bonswa';
  }

  async function loadAudienceOptions() {
    if (audOptions) return audOptions;
    const { data, error } = await SB().rpc('jl86_rpc_audience_options');
    if (error) throw error;
    audOptions = data || { companies: [], agents: [] };
    return audOptions;
  }

  function companyName(id) {
    if (!audOptions) return null;
    const c = (audOptions.companies || []).find(c => String(c.id) === String(id));
    return c ? c.name : null;
  }

  /* Etikèt lizib pou yon konvèzasyon (odyans) — itilize sa moun nan gen dwa wè. */
  function convLabel(c) {
    const t = c.audience_type, sc = c.audience_scope;
    const compIds = c.audience_company_ids || [];
    const agIds = c.audience_agent_ids || [];
    if (t === 'system') return { title: 'JadStack LOTTO', sub: 'Tout Sistèm nan', tag: 'Sistèm', icon: 'fa-bullhorn' };
    if (t === 'company') {
      if (sc === 'admin_only' && !compIds.length) return { title: 'Administrasyon — Tout Konpayi', sub: 'Sèlman admin konpayi yo (ajan pa jwenn)', tag: 'Admin', icon: 'fa-user-tie' };
      if (sc === 'admin_only') {
        const names = compIds.map(companyName).filter(Boolean);
        return { title: names.length ? 'Admin — ' + names.join(', ') : 'Admin Konpayi', sub: 'Sèlman admin konpayi a', tag: 'Admin', icon: 'fa-user-tie' };
      }
      if (!compIds.length) return { title: 'Tout Konpayi yo', sub: 'Admin + Ajan, tout konpayi', tag: 'Konpayi', icon: 'fa-building' };
      const names = compIds.map(companyName).filter(Boolean);
      return { title: names.length ? names.join(', ') : (compIds.length > 1 ? 'Lis Konpayi' : 'Konpayi'), sub: 'Admin + Ajan konpayi a', tag: 'Konpayi', icon: 'fa-building' };
    }
    if (t === 'agent') {
      return { title: agIds.length > 1 ? `Lis Ajan (${agIds.length})` : 'Ajan', sub: 'Mesaj vize sèlman', tag: 'Ajan', icon: 'fa-user' };
    }
    return { title: 'Mesaj', sub: '', tag: '', icon: 'fa-comment' };
  }

  /* ---------------------------------------------------------------------
   * Meday medya (foto/videyo/vwa) — tache nan yon mesaj
   * ------------------------------------------------------------------- */
  async function uploadMedia(fileOrBlob, name, me, kind) {
    const isAudio = kind === 'audio';
    const isVideo = kind === 'video';
    const maxSize = isVideo ? 60 * 1024 * 1024 : (isAudio ? 15 * 1024 * 1024 : 8 * 1024 * 1024);
    if (fileOrBlob.size > maxSize) throw new Error('Fichye a twò gwo pou voye.');
    const ext = isAudio ? 'webm' : (name && name.includes('.') ? name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') : (isVideo ? 'mp4' : 'jpg'));
    const path = `${me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext || 'bin'}`;
    const contentType = fileOrBlob.type || (isAudio ? 'audio/webm' : undefined);
    const { error } = await SB().storage.from('announcements').upload(path, fileOrBlob, { upsert: false, cacheControl: '3600', contentType });
    if (error) throw new Error('Nou pa t ka voye fichye a: ' + error.message);
    const { data } = SB().storage.from('announcements').getPublicUrl(path);
    if (!data || !data.publicUrl) throw new Error('URL fichye a pa jwenn.');
    return { url: data.publicUrl, name: name || null };
  }

  function fmtDuration(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function mediaHtml(m) {
    if (!m.image_url) return '';
    if (m.media_type === 'audio') {
      return `<div class="v86-voice-msg" data-play="${esc(m.image_url)}">
        <button type="button" class="v86-voice-play" aria-label="Jwe nòt vokal"><i class="fa-solid fa-play"></i></button>
        <div class="v86-voice-wave"></div>
        <span class="v86-voice-time">${fmtDuration(m.duration_seconds)}</span>
      </div>`;
    }
    if (m.media_type === 'video') {
      return `<div class="v785-image v785-video" data-view-media="${esc(m.image_url)}" data-view-type="video"><video src="${esc(m.image_url)}" preload="metadata" playsinline muted></video></div>`;
    }
    return `<div class="v785-image" data-view-media="${esc(m.image_url)}" data-view-type="image">
      <img src="${esc(m.image_url)}" alt="Foto anons" loading="lazy">
    </div>`;
  }

  function senderName(m) {
    if (m.author_role === 'super_admin') return 'Super Admin';
    if (m.author_role === 'employer') return 'Mini Super Admin';
    return 'JadStack LOTTO';
  }

  function deleteState(m) {
    if (me.role === 'super_admin') return m.deleted_at ? 'restore' : 'delete';
    if (m.deleted_at) return null;
    if (me.role === 'employer' && String(m.author_id) === String(me.id)) {
      const age = Date.now() - new Date(m.created_at).getTime();
      if (age <= DELETE_WINDOW_MS) return 'delete';
    }
    return null;
  }

  function renderMessage(m) {
    const mine = String(m.author_id) === String(me.id);
    const isDeleted = !!m.deleted_at;
    const action = deleteState(m);
    const body = m.body ? `<div class="v785-body">${esc(m.body)}</div>` : '';
    const media = mediaHtml(m);
    const time = new Date(m.created_at).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' });
    let actionBtn = '';
    if (action === 'delete') actionBtn = `<button type="button" class="v785-del" data-id="${esc(m.id)}" aria-label="Efase mesaj la"><i class="fa-solid fa-trash"></i></button>`;
    else if (action === 'restore') actionBtn = `<button type="button" class="v785-restore" data-id="${esc(m.id)}" aria-label="Retabli mesaj la"><i class="fa-solid fa-clock-rotate-left"></i> Retabli</button>`;
    const deletedBadge = isDeleted ? `<div class="v785-deleted-tag"><i class="fa-solid fa-trash-can"></i> Efase</div>` : '';
    const canSeeReceipts = (me.role === 'super_admin' || me.role === 'employer') && !isDeleted;
    const receiptsBtn = canSeeReceipts ? `<button type="button" class="v785-del" data-receipts="${esc(m.id)}" aria-label="Wè detay"><i class="fa-solid fa-circle-info"></i> Detay</button>` : '';
    return `<article class="v785-msg ${mine ? 'out' : 'in'} ${isDeleted ? 'is-deleted' : ''}">
      <div class="v785-msg-bubble">
        ${!mine ? `<div class="v785-sender">${esc(senderName(m))}</div>` : ''}
        ${deletedBadge}
        ${media}${body}
        <div class="v785-meta">${receiptsBtn}${actionBtn}<span>${time}${mine ? ' <span class="v785-check">✓✓</span>' : ''}</span></div>
      </div>
    </article>`;
  }

  function scrollBottom(box, smooth) {
    if (!box) return;
    box.scrollTo({ top: box.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }

  /* ---------------------------------------------------------------------
   * Panel jenerik (bay anba ekran an, style WhatsApp bottom-sheet)
   * ------------------------------------------------------------------- */
  function openPanel(title, bodyHtml) {
    const ov = document.createElement('div');
    ov.className = 'v86-panel-overlay';
    ov.innerHTML = `<div class="v86-panel">
      <div class="v86-panel-head"><strong>${esc(title)}</strong><button type="button" class="v86-panel-close" aria-label="Fèmen"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="v86-panel-content">${bodyHtml}</div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.querySelector('.v86-panel-close').onclick = () => ov.remove();
    return ov;
  }

  async function showReceipts(id) {
    const ov = openPanel('Detay mesaj la', '<div class="spinner"></div>');
    try {
      const { data, error } = await SB().rpc('jl86_rpc_announcement_recipients', { _id: id });
      if (error) throw error;
      const rows = data || [];
      const readCount = rows.filter(r => r.read_at).length;
      const html = `<div class="v86-panel-help"><i class="fa-solid fa-users"></i> ${rows.length} moun gen dwa li mesaj sa a — ${readCount} deja li li.</div>` +
        (rows.length ? rows.map(r => `
          <div class="v86-recipient-row">
            <div class="v86-recipient-name">${esc(r.full_name)}<div class="v86-recipient-sub">${esc(r.role === 'company' ? 'Admin Konpayi' : r.role === 'agent' ? 'Ajan' : r.role)}${r.company_name ? ' · ' + esc(r.company_name) : ''}</div></div>
            ${r.read_at ? `<span class="v86-recipient-read"><i class="fa-solid fa-check-double"></i> Li</span>` : `<span class="v86-recipient-unread">Poko li</span>`}
          </div>`).join('') : '<div class="empty">Pesonn poko idantifye kòm destinatè.</div>');
      ov.querySelector('.v86-panel-content').innerHTML = html;
    } catch (e) {
      ov.querySelector('.v86-panel-content').innerHTML = `<div class="empty">${esc(e.message || e)}</div>`;
    }
  }

  /* ---------------------------------------------------------------------
   * Chwazi Audience (nouvo mesaj) — Sistèm / Konpayi / Ajan
   * ------------------------------------------------------------------- */
  async function openAudiencePicker() {
    let opts;
    try { opts = await loadAudienceOptions(); } catch (e) { L.toast(e.message || 'Nou pa t ka chaje lis konpayi/ajan yo.', 'error'); return; }

    let tab = 'system';
    let scope = 'all';
    const selCompanies = new Set();
    const selAgents = new Set();

    const ov = document.createElement('div');
    ov.className = 'v86-panel-overlay';
    ov.innerHTML = `<div class="v86-panel">
      <div class="v86-panel-head"><strong>Chwazi Audience</strong><button type="button" class="v86-panel-close" aria-label="Fèmen"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="v86-aud-tabs">
        <button type="button" class="v86-aud-tab active" data-tab="system">Tout Sistèm nan</button>
        <button type="button" class="v86-aud-tab" data-tab="company">Konpayi</button>
        <button type="button" class="v86-aud-tab" data-tab="agent">Ajan</button>
      </div>
      <div class="v86-aud-body"></div>
      <button type="button" class="v86-aud-preview-btn" id="v86-aud-preview"><i class="fa-solid fa-eye"></i> Wè kiyès k ap resevwa mesaj la</button>
      <button type="button" class="v86-aud-confirm" id="v86-aud-confirm">Kontinye — Ekri Mesaj</button>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.querySelector('.v86-panel-close').onclick = () => ov.remove();

    const bodyEl = ov.querySelector('.v86-aud-body');

    function renderTabBody() {
      if (tab === 'system') {
        bodyEl.innerHTML = `<div class="v86-aud-help">Mesaj sa a ap ale bay <strong>TOUT moun</strong> nan sistèm nan (tout konpayi, tout ajan, Administrasyon). Se chwa dèfo a.</div>`;
        return;
      }
      if (tab === 'company') {
        bodyEl.innerHTML = `
          <div class="v86-aud-help">Chwazi yon sèl konpayi, plizyè, oswa kite tout dekoche pou vize <strong>TOUT konpayi</strong>. Chwazi si se sèlman Admin Konpayi a k ap resevwa, oswa tout moun (Admin + Ajan).</div>
          <div class="v86-aud-scope">
            <label><input type="radio" name="v86-scope" value="all" checked> Tout moun nan konpayi a (Admin + Ajan)</label>
            <label><input type="radio" name="v86-scope" value="admin_only"> Sèlman Admin Konpayi a (ajan pa jwenn)</label>
          </div>
          <div class="v86-aud-list" id="v86-comp-list">
            <div class="v86-aud-item" data-all="1"><input type="checkbox" id="v86-comp-all"><span><strong>Tout Konpayi yo</strong></span></div>
            ${(opts.companies || []).map(c => `<div class="v86-aud-item"><input type="checkbox" value="${esc(c.id)}" class="v86-comp-chk"><span>${esc(c.name)}</span></div>`).join('') || '<div class="empty">Pa gen konpayi.</div>'}
          </div>`;
        const allChk = bodyEl.querySelector('#v86-comp-all');
        const chks = () => Array.from(bodyEl.querySelectorAll('.v86-comp-chk'));
        allChk.onchange = () => {
          if (allChk.checked) { selCompanies.clear(); chks().forEach(c => c.checked = false); }
        };
        chks().forEach(chk => chk.onchange = () => {
          if (chk.checked) { allChk.checked = false; selCompanies.add(chk.value); }
          else selCompanies.delete(chk.value);
        });
        bodyEl.querySelectorAll('input[name="v86-scope"]').forEach(r => r.onchange = () => { if (r.checked) scope = r.value; });
        return;
      }
      if (tab === 'agent') {
        const byCompany = {};
        (opts.agents || []).forEach(a => { (byCompany[a.company_id || 'none'] ||= []).push(a); });
        const companiesWithAgents = (opts.companies || []).filter(c => byCompany[c.id] && byCompany[c.id].length);
        bodyEl.innerHTML = `
          <div class="v86-aud-help">Konpayi yo parèt anwo, lis ajan yo anba chak konpayi. Chwazi youn oswa plizyè ajan.</div>
          <div class="v86-aud-list" id="v86-agent-list">
            ${companiesWithAgents.map(c => `
              <div class="v86-aud-company-head">${esc(c.name)}</div>
              ${byCompany[c.id].map(a => `<div class="v86-aud-item"><input type="checkbox" value="${esc(a.id)}" class="v86-agent-chk"><span>${esc(a.full_name)}</span></div>`).join('')}
            `).join('') || '<div class="empty">Pa gen ajan pou kounye a.</div>'}
          </div>`;
        bodyEl.querySelectorAll('.v86-agent-chk').forEach(chk => chk.onchange = () => {
          if (chk.checked) selAgents.add(chk.value); else selAgents.delete(chk.value);
        });
      }
    }
    renderTabBody();

    ov.querySelectorAll('.v86-aud-tab').forEach(btn => btn.onclick = () => {
      ov.querySelectorAll('.v86-aud-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tab = btn.dataset.tab;
      renderTabBody();
    });

    function currentSelection() {
      return {
        type: tab, scope,
        company_ids: tab === 'company' ? Array.from(selCompanies) : null,
        agent_ids: tab === 'agent' ? Array.from(selAgents) : null
      };
    }

    ov.querySelector('#v86-aud-preview').onclick = async () => {
      const s = currentSelection();
      if (s.type === 'agent' && !s.agent_ids.length) { L.toast('Chwazi omwen yon ajan.', 'error'); return; }
      try {
        const { data, error } = await SB().rpc('jl86_rpc_resolve_audience_preview', {
          _type: s.type, _scope: s.scope, _company_ids: s.company_ids && s.company_ids.length ? s.company_ids : null, _agent_ids: s.agent_ids
        });
        if (error) throw error;
        const rows = data || [];
        openPanel('Moun k ap resevwa mesaj la', `<div class="v86-panel-help"><i class="fa-solid fa-users"></i> ${rows.length} moun ap resevwa mesaj sa a.</div>` +
          (rows.length ? rows.map(r => `<div class="v86-recipient-row"><div class="v86-recipient-name">${esc(r.full_name)}<div class="v86-recipient-sub">${esc(r.role === 'company' ? 'Admin Konpayi' : 'Ajan')}${r.company_name ? ' · ' + esc(r.company_name) : ''}</div></div></div>`).join('') : '<div class="empty">Pesonn pa koresponn ak chwa sa a.</div>'));
      } catch (e) { L.toast(e.message || 'Nou pa t ka chaje lis la.', 'error'); }
    };

    ov.querySelector('#v86-aud-confirm').onclick = () => {
      const s = currentSelection();
      if (s.type === 'agent' && !s.agent_ids.length) { L.toast('Chwazi omwen yon ajan.', 'error'); return; }
      ov.remove();
      currentConv = {
        conversation_key: null, // ap kalkile lè l voye premye mesaj la
        audience_type: s.type, audience_scope: s.scope,
        audience_company_ids: s.company_ids && s.company_ids.length ? s.company_ids : null,
        audience_agent_ids: s.agent_ids
      };
      screen = 'thread';
      renderScreen();
    };
  }

  /* ---------------------------------------------------------------------
   * Anrejistreman vwa (MediaRecorder)
   * ------------------------------------------------------------------- */
  function wireVoiceRecorder(host, onReady) {
    const btn = host.querySelector('#v86-voice-btn');
    const composeRow = host.querySelector('.v785-compose-row');
    if (!btn) return;
    let mediaRecorder = null, chunks = [], startedAt = 0, timerId = null, stream = null;

    btn.onclick = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) { L.toast('Nou pa ka jwenn aksè mikwo a.', 'error'); return; }
      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      mediaRecorder.start();
      startedAt = Date.now();

      const liveBar = document.createElement('div');
      liveBar.className = 'v86-rec-live';
      liveBar.innerHTML = `<span class="v86-rec-dot"></span><span id="v86-rec-time">0:00</span><span style="flex:1"></span>
        <button type="button" class="v86-rec-cancel" id="v86-rec-cancel"><i class="fa-solid fa-trash"></i> Anile</button>
        <button type="button" class="v785-send" id="v86-rec-send" aria-label="Voye nòt vokal"><i class="fa-solid fa-paper-plane"></i></button>`;
      composeRow.style.display = 'none';
      composeRow.insertAdjacentElement('afterend', liveBar);

      timerId = setInterval(() => {
        const el = liveBar.querySelector('#v86-rec-time');
        if (el) el.textContent = fmtDuration((Date.now() - startedAt) / 1000);
      }, 250);

      function stop(send) {
        clearInterval(timerId);
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        stream.getTracks().forEach(t => t.stop());
        liveBar.remove();
        composeRow.style.display = '';
        if (!send) return;
        mediaRecorder.onstop = () => {
          const durSec = (Date.now() - startedAt) / 1000;
          if (durSec < 1) { L.toast('Nòt vokal la twò kout.', 'error'); return; }
          const blob = new Blob(chunks, { type: 'audio/webm' });
          onReady(blob, durSec);
        };
      }
      liveBar.querySelector('#v86-rec-cancel').onclick = () => stop(false);
      liveBar.querySelector('#v86-rec-send').onclick = () => stop(true);
    };
  }

  /* ---------------------------------------------------------------------
   * Kamera an tan reyèl (foto/videyo)
   * ------------------------------------------------------------------- */
  async function openCamera(onCapture) {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
    } catch (e) { L.toast('Nou pa ka jwenn aksè kamera a.', 'error'); return; }

    const ov = document.createElement('div');
    ov.className = 'v86-cam-overlay';
    ov.innerHTML = `
      <div class="v86-cam-mode">
        <button type="button" class="active" data-mode="photo">Foto</button>
        <button type="button" data-mode="video">Videyo</button>
      </div>
      <span class="v86-cam-timer" id="v86-cam-timer">0:00</span>
      <video class="v86-cam-video" autoplay playsinline muted></video>
      <div class="v86-cam-bar">
        <button type="button" class="v86-cam-close" aria-label="Fèmen"><i class="fa-solid fa-xmark"></i></button>
        <button type="button" class="v86-cam-shoot" aria-label="Pran"></button>
        <button type="button" class="v86-cam-flip" aria-label="Chanje kamera"><i class="fa-solid fa-camera-rotate"></i></button>
      </div>`;
    document.body.appendChild(ov);
    const videoEl = ov.querySelector('video');
    videoEl.srcObject = stream;

    let mode = 'photo', recorder = null, chunks = [], recStart = 0, recTimer = null, facing = 'environment';

    function close() {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      stream.getTracks().forEach(t => t.stop());
      clearInterval(recTimer);
      ov.remove();
    }
    ov.querySelector('.v86-cam-close').onclick = close;

    ov.querySelectorAll('.v86-cam-mode button').forEach(b => b.onclick = () => {
      ov.querySelectorAll('.v86-cam-mode button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      mode = b.dataset.mode;
    });

    ov.querySelector('.v86-cam-flip').onclick = async () => {
      facing = facing === 'environment' ? 'user' : 'environment';
      stream.getTracks().forEach(t => t.stop());
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true });
        videoEl.srcObject = stream;
      } catch (_) {}
    };

    const shootBtn = ov.querySelector('.v86-cam-shoot');
    const timerEl = ov.querySelector('#v86-cam-timer');

    shootBtn.onclick = () => {
      if (mode === 'photo') {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth; canvas.height = videoEl.videoHeight;
        canvas.getContext('2d').drawImage(videoEl, 0, 0);
        canvas.toBlob(blob => { onCapture(blob, 'image'); close(); }, 'image/jpeg', 0.9);
        return;
      }
      // videyo: tap pou kòmanse, tap ankò pou sispann
      if (!recorder || recorder.state === 'inactive') {
        chunks = [];
        recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm' });
        recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
          onCapture(blob, 'video');
          close();
        };
        recorder.start();
        recStart = Date.now();
        shootBtn.classList.add('recording');
        timerEl.classList.add('on');
        recTimer = setInterval(() => { timerEl.textContent = fmtDuration((Date.now() - recStart) / 1000); }, 250);
      } else {
        recorder.stop();
        clearInterval(recTimer);
        shootBtn.classList.remove('recording');
      }
    };
  }

  /* ---------------------------------------------------------------------
   * Ekran: Lis konvèzasyon
   * ------------------------------------------------------------------- */
  async function renderList() {
    const canPost = me.role === 'super_admin' || me.role === 'employer';
    if (canPost) { try { await loadAudienceOptions(); } catch (_) {} }

    host.innerHTML = `
      <section class="v86-convlist" aria-label="Mesaj">
        <div class="v86-convlist-head">
          <strong><i class="fa-solid fa-comments"></i> Mesaj</strong>
          ${canPost ? `<button type="button" class="v86-new-btn" id="v86-new"><i class="fa-solid fa-pen"></i> Nouvo Anons</button>` : ''}
        </div>
        <div id="v86-conv-rows"><div class="spinner"></div></div>
      </section>`;

    const rowsHost = host.querySelector('#v86-conv-rows');
    if (canPost) host.querySelector('#v86-new').onclick = openAudiencePicker;

    try {
      const { data, error } = await SB().rpc('jl86_rpc_conversations_list');
      if (error) throw error;
      const list = data || [];
      if (!list.length) {
        rowsHost.innerHTML = `<div class="v785-empty" style="padding:2rem"><i class="fa-regular fa-comment-dots"></i><strong>Okenn konvèzasyon</strong><span>${canPost ? 'Klike "Nouvo Anons" pou kòmanse.' : 'Anons ki vize w yo ap parèt isit.'}</span></div>`;
        return;
      }
      rowsHost.innerHTML = list.map(c => {
        const lbl = convLabel(c);
        const time = new Date(c.last_at).toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit' });
        const preview = c.last_body ? c.last_body : (c.last_media_type === 'audio' ? '🎤 Nòt vokal' : c.last_media_type === 'video' ? '🎥 Videyo' : c.last_media_type === 'image' ? '📷 Foto' : '');
        return `<div class="v86-conv-row" data-conv='${esc(JSON.stringify(c))}'>
          <div class="v86-conv-avatar"><i class="fa-solid ${lbl.icon}"></i></div>
          <div class="v86-conv-body">
            <div class="v86-conv-title">${esc(lbl.title)} ${lbl.tag ? `<span class="v86-conv-tag">${esc(lbl.tag)}</span>` : ''}</div>
            <div class="v86-conv-sub">${esc(preview || lbl.sub)}</div>
          </div>
          <div class="v86-conv-meta">
            <span class="v86-conv-time">${time}</span>
            ${c.unread_count ? `<span class="v86-conv-unread">${c.unread_count > 99 ? '99+' : c.unread_count}</span>` : ''}
          </div>
        </div>`;
      }).join('');
      rowsHost.querySelectorAll('.v86-conv-row').forEach(row => row.onclick = () => {
        currentConv = JSON.parse(row.dataset.conv);
        screen = 'thread';
        renderScreen();
      });
    } catch (e) {
      rowsHost.innerHTML = `<div class="v785-empty" style="padding:2rem"><i class="fa-solid fa-triangle-exclamation"></i><span>${esc(e.message || e)}</span></div>`;
    }
  }

  /* ---------------------------------------------------------------------
   * Ekran: Konvèzasyon (tred mesaj)
   * ------------------------------------------------------------------- */
  async function renderThread() {
    const canPost = me.role === 'super_admin' || me.role === 'employer';
    const lbl = convLabel(currentConv);
    const isNew = !currentConv.conversation_key;

    host.innerHTML = `
      <section class="v785-chat" aria-label="${esc(lbl.title)}">
        <header class="v785-header">
          <button type="button" class="v785-back" id="v785-back" aria-label="Retou"><i class="fa-solid fa-chevron-left"></i></button>
          <div class="v785-channel-avatar" aria-hidden="true"><i class="fa-solid ${lbl.icon}"></i></div>
          <div class="v785-head-copy"><strong>${esc(lbl.title)}</strong><span>${esc(lbl.sub)}</span></div>
          <div class="v785-head-spacer"></div>
          ${canPost ? `<button type="button" class="v86-audience-btn" id="v86-thread-audience"><i class="fa-solid fa-users"></i> Audience</button>` : ''}
        </header>
        <div class="v785-thread" id="v785-thread">${isNew ? `<div class="v785-empty"><i class="fa-regular fa-paper-plane"></i><strong>Nouvo konvèzasyon</strong><span>Ekri premye mesaj ou pou audience sa a.</span></div>` : `<div class="v785-day">${greeting()}</div><div class="spinner"></div>`}</div>
        ${canPost ? `
        <form class="v785-compose" id="v785-compose">
          <div class="v785-attach-preview" id="v785-preview" hidden>
            <div class="v785-attach-card">
              <div class="v785-attach-thumb" id="v785-preview-thumb"></div>
              <div class="v785-attach-info"><span class="v785-attach-name" id="v785-preview-name"></span><span class="v785-attach-type" id="v785-preview-type"></span></div>
              <button type="button" class="v785-attach-remove" id="v785-preview-remove" aria-label="Retire fichye a"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>
          <div class="v785-compose-row">
            <button type="button" class="v785-add" id="v785-photo" aria-label="Ajoute yon foto oswa videyo"><i class="fa-solid fa-paperclip"></i></button>
            <button type="button" class="v785-add" id="v86-camera-btn" aria-label="Kamera"><i class="fa-solid fa-camera"></i></button>
            <input id="v785-file" type="file" accept="image/*,video/*" hidden>
            <div class="v785-input-wrap"><textarea id="v785-body" rows="1" placeholder="Mesaj" aria-label="Mesaj"></textarea></div>
            <button type="button" class="v86-rec-btn" id="v86-voice-btn" aria-label="Anrejistre nòt vokal"><i class="fa-solid fa-microphone"></i></button>
            <button type="submit" class="v785-send" aria-label="Voye"><i class="fa-solid fa-arrow-up"></i></button>
          </div>
        </form>` : `
        <div class="v785-readonly"><i class="fa-solid fa-bullhorn"></i><span>Sèlman Super Admin ak Mini Super Admin ka pibliye anons.</span></div>`}
      </section>`;

    const thread = host.querySelector('#v785-thread');
    host.querySelector('#v785-back').onclick = () => { screen = 'list'; currentConv = null; renderScreen(); };
    const audBtn = host.querySelector('#v86-thread-audience');
    if (audBtn) audBtn.onclick = async () => {
      try {
        const { data, error } = await SB().rpc('jl86_rpc_resolve_audience_preview', {
          _type: currentConv.audience_type, _scope: currentConv.audience_scope,
          _company_ids: currentConv.audience_company_ids, _agent_ids: currentConv.audience_agent_ids
        });
        if (error) throw error;
        const rows = data || [];
        openPanel('Audience — Moun ki gen dwa li', `<div class="v86-panel-help"><i class="fa-solid fa-users"></i> ${rows.length} moun gen dwa wè konvèzasyon sa a.</div>` +
          (rows.length ? rows.map(r => `<div class="v86-recipient-row"><div class="v86-recipient-name">${esc(r.full_name)}<div class="v86-recipient-sub">${esc(r.role === 'company' ? 'Admin Konpayi' : r.role === 'agent' ? 'Ajan' : r.role)}${r.company_name ? ' · ' + esc(r.company_name) : ''}</div></div></div>`).join('') : '<div class="empty">Okenn moun.</div>'));
      } catch (e) { L.toast(e.message || 'Nou pa t ka chaje audience a.', 'error'); }
    };

    function wireMessageActions() {
      thread.querySelectorAll('.v785-del[data-id]').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Efase mesaj sa a?')) return;
          btn.disabled = true;
          try {
            const { error } = await SB().rpc('jl85_rpc_announcement_delete', { _id: btn.dataset.id });
            if (error) throw error;
            L.toast('Mesaj efase.', 'success');
            await load(true);
          } catch (e) { L.toast(e.message || 'Nou pa t ka efase mesaj la.', 'error'); btn.disabled = false; }
        };
      });
      thread.querySelectorAll('.v785-restore').forEach(btn => {
        btn.onclick = async () => {
          btn.disabled = true;
          try {
            const { error } = await SB().rpc('jl85_rpc_announcement_restore', { _id: btn.dataset.id });
            if (error) throw error;
            L.toast('Mesaj retabli.', 'success');
            await load(true);
          } catch (e) { L.toast(e.message || 'Nou pa t ka retabli mesaj la.', 'error'); btn.disabled = false; }
        };
      });
      thread.querySelectorAll('[data-receipts]').forEach(btn => {
        btn.onclick = () => showReceipts(btn.dataset.receipts);
      });
      thread.querySelectorAll('[data-view-media]').forEach(el => {
        el.onclick = () => window.Lotri.openMediaViewer({ url: el.dataset.viewMedia, type: el.dataset.viewType });
      });
      thread.querySelectorAll('.v86-voice-msg').forEach(el => {
        const btn = el.querySelector('.v86-voice-play');
        let audio = null;
        btn.onclick = () => {
          if (!audio) { audio = new Audio(el.dataset.play); audio.onended = () => { btn.innerHTML = '<i class="fa-solid fa-play"></i>'; }; }
          if (audio.paused) { audio.play(); btn.innerHTML = '<i class="fa-solid fa-pause"></i>'; }
          else { audio.pause(); btn.innerHTML = '<i class="fa-solid fa-play"></i>'; }
        };
      });
    }

    const load = async (keepBottom = true) => {
      if (isNew) return;
      try {
        const wasNearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80;
        const { data, error } = await SB().from('jl85_announcements').select('*')
          .eq('conversation_key', currentConv.conversation_key).order('created_at', { ascending: true }).limit(500);
        if (error) throw error;
        const rows = data || [];
        thread.innerHTML = `<div class="v785-day">${greeting()}</div>` +
          (rows.length ? rows.map(m => renderMessage(m)).join('') : `<div class="v785-empty"><i class="fa-regular fa-bell"></i><strong>Okenn mesaj</strong></div>`);
        wireMessageActions();
        if (keepBottom || wasNearBottom) requestAnimationFrame(() => scrollBottom(thread, false));
        const unreadIds = rows.filter(m => String(m.author_id) !== String(me.id)).map(m => m.id);
        // KOREKSYON: builder Supabase la se yon "thenable" (li gen .then() sèlman,
        // li PA gen .catch()). Rele .catch() dirèkteman sou li te jete yon
        // TypeError anndan menm try/catch ki ranpli mesaj yo — sa te fè tout
        // mesaj ki te fèk afiche yo ranplase pa yon ekran erè. .then(ok, err)
        // fè menm travay la san risk sa a, e li mache kit rekèt la reyisi kit li echwe.
        if (unreadIds.length) {
          SB().rpc('jl86_rpc_announcement_mark_read', { _ids: unreadIds }).then(() => {}, () => {});
        }
      } catch (e) {
        thread.innerHTML = `<div class="v785-empty"><i class="fa-solid fa-triangle-exclamation"></i><span>${esc(e.message || e)}</span></div>`;
      }
    };

    if (canPost) {
      const form = host.querySelector('#v785-compose');
      const body = host.querySelector('#v785-body');
      const file = host.querySelector('#v785-file');
      const preview = host.querySelector('#v785-preview');
      const previewThumb = host.querySelector('#v785-preview-thumb');
      const previewName = host.querySelector('#v785-preview-name');
      const previewType = host.querySelector('#v785-preview-type');
      const previewRemove = host.querySelector('#v785-preview-remove');
      let previewUrl = null, pendingBlob = null, pendingKind = null, pendingName = null;

      const clearPreview = () => {
        if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
        preview.hidden = true; previewThumb.innerHTML = ''; file.value = '';
        pendingBlob = null; pendingKind = null; pendingName = null;
      };

      function setPreview(blobOrFile, kind, name) {
        pendingBlob = blobOrFile; pendingKind = kind; pendingName = name || (kind === 'video' ? 'Videyo.mp4' : 'Foto.jpg');
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(blobOrFile);
        previewThumb.innerHTML = kind === 'video'
          ? `<video src="${previewUrl}" muted playsinline preload="metadata"></video><i class="fa-solid fa-circle-play v785-attach-playicon" aria-hidden="true"></i>`
          : `<img src="${previewUrl}" alt="">`;
        previewName.textContent = pendingName;
        previewType.textContent = kind === 'video' ? 'Videyo' : 'Foto';
        preview.hidden = false;
      }

      host.querySelector('#v785-photo').onclick = () => file.click();
      file.onchange = () => {
        const f = file.files && file.files[0];
        if (!f) { clearPreview(); return; }
        setPreview(f, /^video\//i.test(f.type) ? 'video' : 'image', f.name);
      };
      previewRemove.onclick = () => clearPreview();

      host.querySelector('#v86-camera-btn').onclick = () => {
        openCamera((blob, kind) => setPreview(blob, kind, kind === 'video' ? 'Videyo-kamera.mp4' : 'Foto-kamera.jpg'));
      };

      body.addEventListener('input', () => { body.style.height = 'auto'; body.style.height = Math.min(body.scrollHeight, 120) + 'px'; });

      async function sendMessage({ text, mediaBlob, mediaKind, mediaName, audioDuration }) {
        const send = form.querySelector('.v785-send');
        send.disabled = true;
        try {
          let image_url = null, image_name = null, media_type = 'image', duration = null;
          if (mediaBlob) {
            const up = await uploadMedia(mediaBlob, mediaName, me, mediaKind);
            image_url = up.url; image_name = up.name; media_type = mediaKind;
            if (mediaKind === 'audio') duration = audioDuration;
          }
          const { data, error } = await SB().rpc('jl86_rpc_announcement_send', {
            _body: text || '', _image_url: image_url, _image_name: image_name, _media_type: media_type,
            _duration_seconds: duration,
            _audience_type: currentConv.audience_type, _audience_scope: currentConv.audience_scope,
            _company_ids: currentConv.audience_company_ids, _agent_ids: currentConv.audience_agent_ids
          });
          if (error) throw error;
          if (data && data.conversation_key) currentConv.conversation_key = data.conversation_key;
          body.value = ''; body.style.height = 'auto'; clearPreview();
          L.toast('Mesaj pibliye' + (data && data.recipient_count ? ` — ${data.recipient_count} moun ap resevwa l.` : '.'), 'success');
          if (isNewFlag()) { renderThread(); return; }
          await load(true);
        } catch (err) { L.toast(err.message || 'Nou pa t ka voye mesaj la.', 'error'); }
        finally { send.disabled = false; }
      }
      function isNewFlag() { return !thread.querySelector('.v785-msg') && !!currentConv.conversation_key; }

      form.onsubmit = async e => {
        e.preventDefault();
        const text = body.value.trim();
        if (!text && !pendingBlob) return;
        await sendMessage({ text, mediaBlob: pendingBlob, mediaKind: pendingKind, mediaName: pendingName });
      };

      wireVoiceRecorder(host, async (blob, durSec) => {
        await sendMessage({ text: '', mediaBlob: blob, mediaKind: 'audio', mediaName: 'nòt-vokal.webm', audioDuration: durSec });
      });
    }

    await load(true);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => { if (screen === 'thread' && !isNew) load(false).catch(() => {}); }, 15000);
    (L.pendingTimers ||= []).push(pollTimer);
  }

  /* ---------------------------------------------------------------------
   * Wout prensipal
   * ------------------------------------------------------------------- */
  async function renderScreen() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (screen === 'thread' && currentConv) await renderThread();
    else await renderList();
  }

  async function render(h) {
    host = h;
    me = await L.getProfile();
    if (!me) { host.innerHTML = '<div class="empty">Profil utilisateur introuvable.</div>'; return; }
    screen = 'list'; currentConv = null;
    await renderScreen();
  }

  if (window.LotriShell) window.LotriShell.register('messages', { render });
})();
