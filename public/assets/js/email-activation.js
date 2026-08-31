/* =====================================================================
 * JADSTACK LOTTO V10 — «AKTIVE NOTIFIKASYON IMÈL» (PLAN V10 · H.3)
 * ---------------------------------------------------------------------
 * Vi `mail-optin` — disponib pou Compagnie, Agent ak Super Admin, nan paj
 * Messages yo. Twa etap klè, jan kliyan an mande yo:
 *   1. Switch «Activer les notifications e-mail» → montre ti fòm tès la.
 *   2. Itilizatè a voye yon imèl tès bay tèt li → eksplikasyon klè ke
 *      imèl la soti au nom de FormSubmit epi li dwe klike lyen aktivasyon an.
 *   3. Bouton «Activer le formulaire» → depi lè sa a li kòmanse resevwa vre e-mails.
 *
 * Èd (?) sou chak paramèt difisil — sitou «kiyès ki ka wè done pa imèl».
 * ===================================================================== */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAIL = () => window.Lotri.mail;

  const HELP = {
    optin: `Notifications yo pase pa FormSubmit (yon sèvis relè imèl). Nou pa gen backend:
      chak aksyon sou sit la rele FormSubmit dirèkteman epi FormSubmit voye imèl la nan bwat
      resepsyon w lan. Se pou sa premye fwa a mande yon konfimasyon manyèl.`,
    privacy: `Ki done ki pase nan imèl la? Sèlman done aksyon an: kiyès ki fè l, nan ki konpayi,
      ki eleman li touche, dat/lè, ak yon blòk ODIT JSON. Yon konpayi pa janm resevwa done yon
      lòt konpayi. Agent pa resevwa notifikasyon aksyon — li pa sou tèt pèsonn. Compte sipò
      platfòm nan resevwa yon kopi (CC) pou sipò ak odit.`,
    test: `E-mail de test la ale sou adrès ou antre a. Objè a ap kòmanse ak non platfòm nan.
      Si w pa wè l nan 2 minit, gade nan Spam / Promotions.`
  };

  const helpBtn = (k, label) => `<button type="button" class="help-dot" data-help="${esc(k)}"
      aria-label="Èd — ${esc(label)}" title="Comment ça fonctionne ?">?</button>`;

  function view(host) {
    const p = window.__lotriProfile || {};
    const mine = p.email || '';
    const st = MAIL().optin.get(mine);

    host.innerHTML = `
    <div class="page-hd">
      <h2>Notifications par e-mail</h2>
      <p class="muted">Recevez les actions directement par e-mail — sans devoir visiter le site chaque jour.</p>
    </div>

    <div class="card">
      <div class="card-hd">
        <h3>Activer les notifications e-mail ${helpBtn('optin', 'Activer les notifications e-mail')}</h3>
        <span class="badge ${st.on && st.confirmed ? 'badge-success' : st.on ? 'badge-warning' : ''}">
          ${st.on && st.confirmed ? 'Actif' : st.on ? 'En attente de confirmation' : 'Fermer'}</span>
      </div>
      <label class="switch" style="justify-content:space-between">
        <span>Recevoir les notifications d\'actions sur mon e-mail (<strong class="mono">${esc(mine || '—')}</strong>)</span>
        <input type="checkbox" id="oi-switch" ${st.on ? 'checked' : ''}><span class="track"></span>
      </label>

      <div id="oi-steps" ${st.on ? '' : 'hidden'} class="optin-steps">
        <ol class="optin-ol">
          <li><strong>Étape 1 — Envoyez-vous un e-mail de test.</strong>
            <div class="form-grid" style="margin-top:.6rem">
              <div><label class="label" for="oi-mail">Votre e-mail ${helpBtn('test', 'E-mail de test')}</label>
                <input class="input" id="oi-mail" type="email" value="${esc(mine)}"></div>
              <div><label class="label" for="oi-msg">Messages tès</label>
                <textarea class="textarea" id="oi-msg" rows="2" maxlength="400">Tès notifikasyon JADSTACK LOTTO.</textarea></div>
            </div>
            <button class="btn btn-primary" id="oi-send" style="margin-top:.6rem">
              <i class="fa-solid fa-paper-plane"></i> Envoyer l\'e-mail de test</button>
            <div class="alert" id="oi-res" hidden></div>
          </li>

          <li><strong>Étape 2 — Confirmez l\'adresse dans votre boîte de réception.</strong>
            <p class="muted">Vous allez recevoir un e-mail <strong>provenant du nom FormSubmit</strong>
              (objè a: «Confirm your email»). Vous dwe antre nan bwat resepsyon w lan
              (gade nan <em>Spam</em> tou) epi <strong>klike sou lyen aktivasyon an</strong>.
              Avant ou fè sa, okenn vre notifikasyon pa ka rive.</p>
          </li>

          <li><strong>Etap 3 — Peze «Activer le formulaire».</strong>
            <p class="muted">Du lè sa a, chak fwa yon moun ekri w oswa yon aksyon ki konsène w
              fèt, ou resevwa yon vre imèl sou kont Gmail ou.</p>
            <button class="btn ${st.confirmed ? 'btn-ghost' : 'btn-primary'}" id="oi-confirm">
              <i class="fa-solid fa-circle-check"></i> ${st.confirmed ? 'Form deja aktive' : 'Activer le formulaire'}</button>
          </li>
        </ol>
      </div>
    </div>

    <div class="card" style="margin-top:1.25rem">
      <div class="card-hd"><h3>Qui peut voir les données par e-mail ${helpBtn('privacy', 'Confidentialité des e-mails')}</h3></div>
      <ul class="muted rule-list">
        <li>La compagnie reçoit <strong>uniquement</strong> aksyon pa li ak aksyon ajan li yo.</li>
        <li>L\'administration reçoit l\'audit des compagnies et des agents — mais <strong>pa</strong> mesaj prive ant yon ajan ak konpayi li.</li>
        <li>Agent <strong>pa</strong> reçoit les notifications d\'actions (il ne surveille personne) ; il ne reçoit que les messages qui lui sont adressés.</li>
        <li>Le compte support de la plateforme reste en <strong>CC</strong> sur tous les messages, pour le support et l\'audit.</li>
      </ul>
    </div>

    <div class="help-pop" id="help-pop" hidden><div class="help-in"><p id="help-txt"></p>
      <button class="btn btn-sm btn-ghost" id="help-x">Fermer</button></div></div>`;

    /* --- Switch --- */
    const sw = host.querySelector('#oi-switch');
    sw.addEventListener('change', () => {
      MAIL().optin.set(mine, { on: sw.checked });
      host.querySelector('#oi-steps').hidden = !sw.checked;
      window.Lotri.toast(sw.checked
        ? 'Notifications activées — effectuez l\'étape de test maintenant.'
        : 'Notifications désactivées.', sw.checked ? 'success' : 'info');
    });

    /* --- Etap 1: imèl tès --- */
    host.querySelector('#oi-send').addEventListener('click', async () => {
      const to = host.querySelector('#oi-mail').value.trim();
      const msg = host.querySelector('#oi-msg').value.trim();
      const box = host.querySelector('#oi-res');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        box.className = 'alert alert-error'; box.hidden = false;
        box.textContent = 'Saisissez une adresse e-mail valide.'; return;
      }
      await window.Lotri.ui.busy(host.querySelector('#oi-send'), async () => {
        const res = await MAIL().test(to, msg, { name: p.full_name || '', email: p.email });
        box.hidden = false;
        if (res && res.ok) {
          box.className = 'alert alert-success';
          box.innerHTML = `E-mail la pati sou <strong>${esc(to)}</strong>.
            Ouvrir bwat resepsyon w lan: si se premye fwa, ou pral wè yon imèl
            <strong>au nom de FormSubmit</strong> — klike lyen aktivasyon an, apre sa retounen
            peze <strong>« Activer le formulaire »</strong>.`;
          MAIL().optin.set(to, { on: true });
        } else {
          box.className = 'alert alert-error';
          box.textContent = 'Impossible de l\'envoyer : ' +
            ((res && res.payload && res.payload.message) || 'le service ne répond pas') +
            '. Vérifiez l\'adresse et réessayez.';
        }
      });
    });

    /* --- Etap 3: Activer le formulaire --- */
    host.querySelector('#oi-confirm').addEventListener('click', async () => {
      const to = host.querySelector('#oi-mail').value.trim() || mine;
      const ok = await window.Lotri.modal.confirm('Avez-vous cliqué sur le lien FormSubmit ?',
        'Cliquez sur « Oui, activer » uniquement après avoir cliqué sur le lien de confirmation dans votre boîte de réception.',
        { okText: 'Oui, activer', cancelText: 'Pas encore' });
      if (!ok) return;
      MAIL().optin.set(to, { on: true, confirmed: true });
      window.Lotri.toast('Formulaire activé — vous allez commencer à recevoir de vrais e-mails.', 'success');
      LotriShell.render();
    });

    /* --- Èd (?) --- */
    const pop = host.querySelector('#help-pop');
    host.querySelectorAll('[data-help]').forEach(b => b.addEventListener('click', () => {
      host.querySelector('#help-txt').textContent = HELP[b.dataset.help] || '';
      pop.hidden = false;
    }));
    host.querySelector('#help-x').addEventListener('click', () => { pop.hidden = true; });
  }

  /* V14 RÈG KRITIK #1 — uniquement Super Admin gen notifikasyon pa e-mails. */
  function jl14OnlySuper(host){
    const p = window.__lotriProfile || {};
    if (p.role === 'super_admin') return false;
    host.innerHTML = '<div class="empty"><i class="fa-solid fa-lock"></i>Les notifications par e-mail sont réservées à l\'administration.</div>';
    return true;
  }
  LotriShell.register('mail-optin', { render: async host => { if (jl14OnlySuper(host)) return; return view(host); } });
})();
