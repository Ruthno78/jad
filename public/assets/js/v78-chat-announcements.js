/* JADSTACK LOTTO V85 — Sistèm Anons dedye
 * Frontend + backend (jl85_announcements / jl85_rpc_announcement_*).
 * - Yon sèl kanal: "JadStack LOTTO".
 * - Sèlman Super Admin + Employeur (Mini Super Admin) ka pibliye.
 * - Konpayi ak Agan: lekti sèlman, wè sèlman mesaj ki PA efase.
 * - Employeur: ka efase SÈLMAN mesaj pa li, nan 15 minit apre li poste.
 *   Efase se yon "soft delete" — mesaj la kache pou Konpayi/Agan, men
 *   Super Admin toujou wè l (byen make kòm "Efase").
 * - Super Admin: wè TOUT mesaj (efase ou pa), ka efase/retabli nenpòt.
 * - Imaj yo ale nan bucket Storage dedye "announcements".
 */
(function(){
  const L = window.Lotri;
  const SB = () => L.supabase;
  const esc = L.escapeHtml;
  const CHANNEL = 'JadStack LOTTO';
  const CAN_POST = new Set(['super_admin','employer']);
  const DELETE_WINDOW_MS = 15 * 60 * 1000;

  function greeting(){
    const h = new Date().getHours();
    return h < 14 ? 'Bonjour' : 'Bonsoir';
  }

  function avatar(){
    return `<div class="v785-channel-avatar" aria-hidden="true"><i class="fa-solid fa-bullhorn"></i></div>`;
  }

  function mediaHtml(m){
    if (!m.image_url) return '';
    if (m.media_type === 'video') {
      return `<div class="v785-image v785-video"><video src="${esc(m.image_url)}" controls preload="metadata" playsinline></video></div>`;
    }
    return `<a class="v785-image" href="${esc(m.image_url)}" target="_blank" rel="noopener noreferrer">
      <img src="${esc(m.image_url)}" alt="Foto anons ${CHANNEL}" loading="lazy">
    </a>`;
  }

  function senderName(m){
    if (m.author_role === 'super_admin') return 'Super Admin';
    if (m.author_role === 'employer') return 'Mini Super Admin';
    return CHANNEL;
  }

  async function uploadMedia(file, me){
    const isImage = /^image\//i.test(file.type);
    const isVideo = /^video\//i.test(file.type);
    if (!isImage && !isVideo) throw new Error('Sèlman imaj oswa videyo aksepte.');
    const maxSize = isVideo ? 60 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxSize) throw new Error(isVideo ? 'Videyo a twò gwo (maksimòm 60 Mo).' : 'Foto a twò gwo (maksimòm 8 Mo).');
    const ext = (file.name.split('.').pop() || (isVideo?'mp4':'jpg')).toLowerCase().replace(/[^a-z0-9]/g,'') || (isVideo?'mp4':'jpg');
    const path = `${me.id}/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
    const { error } = await SB().storage.from('announcements').upload(path, file, { upsert:false, cacheControl:'3600', contentType: file.type || undefined });
    if (error) throw new Error('Nou pa t ka voye fichye a: ' + error.message);
    const { data } = SB().storage.from('announcements').getPublicUrl(path);
    if (!data || !data.publicUrl) throw new Error('URL fichye a pa jwenn.');
    return { url: data.publicUrl, name: file.name || null, mediaType: isVideo ? 'video' : 'image' };
  }

  async function loadMessages(){
    // RLS deja filtre: Super Admin wè tout (efase ou pa), lòt wòl yo wè sèlman
    // mesaj ki PA efase (deleted_at is null) — gade jl85_select nan Supabase.
    const { data, error } = await SB().from('jl85_announcements').select('*')
      .order('created_at', { ascending: true }).limit(500);
    if (error) throw error;
    return data || [];
  }

  function deleteState(m, me){
    if (me.role === 'super_admin') return m.deleted_at ? 'restore' : 'delete';
    if (m.deleted_at) return null;
    if (me.role === 'employer' && String(m.author_id) === String(me.id)) {
      const age = Date.now() - new Date(m.created_at).getTime();
      if (age <= DELETE_WINDOW_MS) return 'delete';
    }
    return null;
  }

  function renderMessage(m, me){
    const mine = String(m.author_id) === String(me.id);
    const isDeleted = !!m.deleted_at;
    const action = deleteState(m, me);
    const body = m.body ? `<div class="v785-body">${esc(m.body)}</div>` : '';
    const photo = mediaHtml(m);
    const time = new Date(m.created_at).toLocaleTimeString('fr-HT',{hour:'2-digit',minute:'2-digit'});
    let actionBtn = '';
    if (action === 'delete') actionBtn = `<button type="button" class="v785-del" data-id="${esc(m.id)}" aria-label="Efase mesaj la"><i class="fa-solid fa-trash"></i></button>`;
    else if (action === 'restore') actionBtn = `<button type="button" class="v785-restore" data-id="${esc(m.id)}" aria-label="Retabli mesaj la"><i class="fa-solid fa-clock-rotate-left"></i> Retabli</button>`;
    const deletedBadge = isDeleted ? `<div class="v785-deleted-tag"><i class="fa-solid fa-trash-can"></i> Efase</div>` : '';
    return `<article class="v785-msg ${mine?'out':'in'} ${isDeleted?'is-deleted':''}">
      <div class="v785-msg-bubble">
        ${!mine ? `<div class="v785-sender">${esc(senderName(m))}</div>` : ''}
        ${deletedBadge}
        ${photo}${body}
        <div class="v785-meta">${actionBtn}<span>${time}${mine?' <span class="v785-check">✓✓</span>':''}</span></div>
      </div>
    </article>`;
  }

  function scrollBottom(box, smooth){
    if (!box) return;
    box.scrollTo({top:box.scrollHeight, behavior:smooth?'smooth':'auto'});
  }

  async function render(host){
    const me = await L.getProfile();
    if (!me) { host.innerHTML='<div class="empty">Profil utilisateur introuvable.</div>'; return; }
    const canPost = CAN_POST.has(String(me.role));
    const isAdmin = me.role === 'super_admin';
    host.innerHTML = `
      <section class="v785-chat" aria-label="${CHANNEL}">
        <header class="v785-header">
          <button type="button" class="v785-back" id="v785-back" aria-label="Retour"><i class="fa-solid fa-chevron-left"></i></button>
          ${avatar()}
          <div class="v785-head-copy">
            <strong>${CHANNEL}</strong>
            <span>${isAdmin ? 'anons — tout mesaj, efase ou pa' : 'annonces officielles'}</span>
          </div>
          <div class="v785-head-spacer"></div>
        </header>
        <div class="v785-thread" id="v785-thread"><div class="v785-day">${greeting()}</div><div class="spinner"></div></div>
        ${canPost ? `
        <form class="v785-compose" id="v785-compose">
          <div class="v785-attach-preview" id="v785-preview" hidden>
            <div class="v785-attach-card">
              <div class="v785-attach-thumb" id="v785-preview-thumb"></div>
              <div class="v785-attach-info">
                <span class="v785-attach-name" id="v785-preview-name"></span>
                <span class="v785-attach-type" id="v785-preview-type"></span>
              </div>
              <button type="button" class="v785-attach-remove" id="v785-preview-remove" aria-label="Retire fichye a"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>
          <div class="v785-compose-row">
            <button type="button" class="v785-add" id="v785-photo" aria-label="Ajouter une photo ou vidéo"><i class="fa-solid fa-paperclip"></i></button>
            <input id="v785-file" type="file" accept="image/*,video/*" hidden>
            <div class="v785-input-wrap"><textarea id="v785-body" rows="1" placeholder="Message" aria-label="Message"></textarea><span>😊</span></div>
            <button type="submit" class="v785-send" aria-label="Envoyer"><i class="fa-solid fa-arrow-up"></i></button>
          </div>
        </form>` : `
        <div class="v785-readonly"><i class="fa-solid fa-bullhorn"></i><span>Seuls Super Admin et Mini Super Admin peuvent publier des annonces.</span></div>`}
      </section>`;

    const thread = host.querySelector('#v785-thread');
    const back = host.querySelector('#v785-back');
    if (back) back.onclick = ()=>history.back();

    const wireActions = ()=>{
      thread.querySelectorAll('.v785-del').forEach(btn=>{
        btn.onclick = async ()=>{
          if (!confirm('Efase mesaj sa a?')) return;
          btn.disabled = true;
          try {
            const { error } = await SB().rpc('jl85_rpc_announcement_delete', { _id: btn.dataset.id });
            if (error) throw error;
            L.toast('Mesaj efase.','success');
            await load(true);
          } catch(e) { L.toast(e.message||'Nou pa t ka efase mesaj la.','error'); btn.disabled=false; }
        };
      });
      thread.querySelectorAll('.v785-restore').forEach(btn=>{
        btn.onclick = async ()=>{
          btn.disabled = true;
          try {
            const { error } = await SB().rpc('jl85_rpc_announcement_restore', { _id: btn.dataset.id });
            if (error) throw error;
            L.toast('Mesaj retabli.','success');
            await load(true);
          } catch(e) { L.toast(e.message||'Nou pa t ka retabli mesaj la.','error'); btn.disabled=false; }
        };
      });
    };

    const load = async (keepBottom=true)=>{
      try {
        const wasNearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80;
        const rows = await loadMessages();
        thread.innerHTML = `<div class="v785-day">${greeting()}</div>` +
          (rows.length ? rows.map(m=>renderMessage(m,me)).join('') : `<div class="v785-empty"><i class="fa-regular fa-bell"></i><strong>Aucune annonce</strong><span>Les annonces officielles de JadStack LOTTO apparaîtront ici.</span></div>`);
        wireActions();
        if (keepBottom || wasNearBottom) requestAnimationFrame(()=>scrollBottom(thread,false));
      } catch(e) {
        thread.innerHTML = `<div class="v785-empty"><i class="fa-solid fa-triangle-exclamation"></i><span>${esc(e.message||e)}</span></div>`;
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
      let previewUrl = null;

      const clearPreview = ()=>{
        if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
        preview.hidden = true;
        previewThumb.innerHTML = '';
        file.value = '';
      };

      host.querySelector('#v785-photo').onclick = ()=>file.click();
      file.onchange = ()=>{
        const f = file.files && file.files[0];
        if (!f) { clearPreview(); return; }
        const isV = /^video\//i.test(f.type);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(f);
        previewThumb.innerHTML = isV
          ? `<video src="${previewUrl}" muted playsinline preload="metadata"></video><i class="fa-solid fa-circle-play v785-attach-playicon" aria-hidden="true"></i>`
          : `<img src="${previewUrl}" alt="">`;
        previewName.textContent = f.name || (isV ? 'Videyo' : 'Foto');
        previewType.textContent = isV ? 'Videyo' : 'Foto';
        preview.hidden = false;
      };
      previewRemove.onclick = ()=> clearPreview();

      body.addEventListener('input',()=>{ body.style.height='auto'; body.style.height=Math.min(body.scrollHeight,120)+'px'; });
      form.onsubmit = async e=>{
        e.preventDefault();
        const text = body.value.trim();
        const mediaFile = file.files && file.files[0];
        if (!text && !mediaFile) return;
        const send = form.querySelector('.v785-send');
        send.disabled = true;
        try {
          let image_url = null, image_name = null, media_type = 'image';
          if (mediaFile) { const up = await uploadMedia(mediaFile, me); image_url = up.url; image_name = up.name; media_type = up.mediaType; }
          const { error } = await SB().rpc('jl85_rpc_announcement_send', {
            _body: text || '', _image_url: image_url, _image_name: image_name, _media_type: media_type
          });
          if (error) throw error;
          body.value=''; body.style.height='auto'; clearPreview();
          L.toast('Annonce publiée dans JadStack LOTTO.','success');
          await load(true);
        } catch(err) { L.toast(err.message||'Impossible de publier l’annonce.','error'); }
        finally { send.disabled=false; }
      };
    }
    await load(true);
    // Actualisation légère pour les nouvelles annonces ak delè 15 minit la.
    const timer = setInterval(()=>load(false).catch(()=>{}), 15000);
    (L.pendingTimers ||= []).push(timer);
  }

  // Remplace volontairement l'ancien écran de conversations privées.
  if (window.LotriShell) window.LotriShell.register('messages',{render});
})();
