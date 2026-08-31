/* =====================================================================
 * SUPER ADMIN — "Modifier le système"
 * Tous tèks, koulè, logo, imel, tel, pri, tiraj ak machin yo modifyab
 * san touche kòd la. Tous bagay ale nan tab `site_config` (jsonb).
 * Yon aperçu (PC + Téléphone) montre rezilta a lapoula.
 * ===================================================================== */
(function () {
  const SB  = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;
  const D   = window.JADSTACK_DEFAULTS;
  const busy = (b, f) => window.Lotri.ui.busy(b, f);
  const LF  = () => window.Lotri.lockfield;   /* §1.3 — chan long/JSON bloke-editab */

  async function loadKey(key){
    const { data, error } = await SB().from('jl9_site_config').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    /* PATI A.2 — clone san JSON.parse sou yon valè posib `undefined`. */
    const base = (D && D[key] && typeof D[key] === 'object') ? D[key] : {};
    const saved = (data && data.value && typeof data.value === 'object') ? data.value : {};
    return Object.assign({}, structuredClone ? structuredClone(base) : base, saved);
  }
  /* saveKey — TOUJOU relve erè a bò itilizatè a. Avant, `busy()` te re-voye
     erè a men okenn moun pa t trape l: yon echèk (RLS, réseau, trigger)
     te pase an silans e moun nan te kwè chanjman an te sove. */
  async function saveKey(key, value){
    try {
      const { data, error } = await SB().from('jl9_site_config')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        .select('key,value')
        .maybeSingle();
      if (error) throw error;
      /* Dyagnostik: konfime sa baz done a reyèlman kenbe. */
      console.info('[system] site_config enregistré', key, data && data.value);
      try { localStorage.removeItem('jl:config:v6'); } catch(_){}
      await window.Lotri.loadConfig();
      window.Lotri.paintBrand();
      window.Lotri.toast('Les modifications sont enregistrées.', 'success');
      document.querySelectorAll('iframe[data-preview]').forEach(f=> {
        try { f.contentWindow.location.reload(); } catch(_){}
      });
    } catch (ex) {
      console.error('[system] echèk sovgad', key, ex);
      window.Lotri.toast('Sovgad echwe: ' + (ex && ex.message ? ex.message : ex), 'error');
    }
  }

  /* Kase cache navigatè a: bucket la sèvi ak cacheControl 3600, donk yon
     nouvo logo sou menm URL ta ka rete ansyen imaj la nan header la. */
  function bust(url){
    if (!url) return url;
    return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
  }

  async function uploadImage(file, slot){
    if (!file) throw new Error('Aucun fichier sélectionné.');
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) throw new Error('Format d\'image non pris en charge (PNG, JPG, WEBP, SVG).');
    if (file.size > 2 * 1024 * 1024) throw new Error('Imaj la twò gwo (max 2 Mo).');
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `platform/${slot}-${Date.now()}.${ext}`;
    const { data: upData, error } = await SB().storage.from('branding')
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (error) throw new Error('Le téléversement dans le bucket « branding » a échoué : ' + error.message);
    if (!upData || !upData.path) throw new Error('Le téléversement n\'a renvoyé aucun chemin — l\'API de stockage a retourné une réponse invalide.');
    /* Confirmer objè a REYÈLMAN egziste nan bucket la (pa uniquement fetch HTTP,
       ki ka bay 200 fo-pozitif sou cache/edge). list() konfime prezans
       objè a bò Storage API a dirèkteman. */
    const folder = path.split('/').slice(0, -1).join('/');
    const filename = path.split('/').pop();
    const { data: listData, error: listErr } = await SB().storage.from('branding').list(folder || undefined);
    if (listErr) throw new Error('Impossible de confirmer le téléversement (échec du listing) : ' + listErr.message);
    const found = (listData || []).some(f => f.name === filename);
    if (!found) throw new Error('Le téléversement a « réussi » mais le fichier n\'est PAS dans le bucket « branding » — vérifiez les règles RLS storage.objects de ce bucket.');
    const url = SB().storage.from('branding').getPublicUrl(path).data.publicUrl;
    /* Dezyèm konfimasyon: URL piblik la reyèlman sèvi kontni imaj (Content-Type). */
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.startsWith('image/')) throw new Error('HTTP ' + res.status + ' / content-type: ' + ct);
    } catch (ex) {
      throw new Error('Le fichier est dans le bucket mais l\'URL publique ne renvoie pas une image (' + ex.message +
        '). Tcheke si bucket "branding" make kòm Public.');
    }
    console.info('[system] imaj chaje e konfime', slot, url);
    return bust(url);
  }


  /* --- ti konstriktè fòm --- */
  const F = {
    text: (id, label, val, hint) => `<div class="form-row"><label class="label" for="${id}">${esc(label)}</label>
        <input class="input" id="${id}" value="${esc(val ?? '')}">${hint?`<small class="muted">${esc(hint)}</small>`:''}</div>`,
    /* Chan long ak JSON pase pa field-lock.js: bloke pa defo, ✏️/double-klik
       pou edite, validasyon JSON an tan reyèl, «Enregistrer» bloke si JSON kase. */
    area: (id, label, val, rows, hint) => LF().html(id, label, val, 'text', hint),
    json: (id, label, val, hint) => LF().html(id, label, val, 'json', hint),
    color: (id, label, val) => `<div class="color-row"><label class="label" for="${id}">${esc(label)}</label>
        <input type="color" id="${id}" value="${esc(val || '#000000')}"><code>${esc(val || '')}</code></div>`,
    card: (title, inner, saveId) => `<div class="card"><div class="card-hd"><h3>${esc(title)}</h3>
        <button class="btn btn-primary" id="${saveId}" data-save><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button></div>${inner}</div>`
  };
  const v  = id => document.getElementById(id).value;
  const jv = (id) => LF().value(id);

  /* ---------------- Header / Logo / Tèm ---------------- */
  LotriShell.register('sys-header', {
    render: async (host) => {
      const b = await loadKey('brand'), t = await loadKey('theme');
      host.innerHTML = `
      ${F.card('Header, Logo & Idantite', `
        <p class="muted">Le logo principal (rectangulaire) est placé automatiquement dans le coin gauche de l\'en-tête — sa hauteur = hauteur de l\'en-tête moins 2px, la largeur s\'ajuste automatiquement. Le logo carré/rond sert d\'icône dans le menu latéral et favicon.</p>
        ${F.text('b-name','Nom de la marque', b.name)}
        ${F.text('b-tagline','Slogan', b.tagline)}
        <div class="form-row"><label class="label">Logo prensipal (rektangilè)</label>
          <div class="logo-preview" id="pv-wide">${b.logo_wide?`<img src="${esc(b.logo_wide)}" alt="">`:'<span class="ph">Aucun logo — le nom de la marque sera affiché.</span>'}</div>
          <input class="input" type="file" id="f-wide" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>
        <div class="form-row"><label class="label">Logo segondè (kare / wonn)</label>
          <div class="logo-preview" id="pv-mark">${b.logo_mark?`<img src="${esc(b.logo_mark)}" alt="">`:'<span class="ph">Aucune icône — les initiales seront affichées.</span>'}</div>
          <input class="input" type="file" id="f-mark" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>`, 'save-brand')}
      ${F.card('Couleurs & Thème', `
        <p class="muted">Les couleurs sont séparées en "mòd klè" ak "mòd fonse" pou yo pa janm chevoche/kase youn lòt.
        Chak paj aplike pakèt ki koresponn ak mòd itilizatè a chwazi (bouton lalin/solèy).</p>
        <h4 style="margin-top:1rem">☀️ Mòd Klè</h4>
        <div class="color-grid">
          ${F.color('t-l-primary','Couleur principale', t.light['--primary'])}
          ${F.color('t-l-hover','Prensipal (hover)', t.light['--primary-hover'])}
          ${F.color('t-l-accent','Couleur d\'accentuation', t.light['--accent'])}
          ${F.color('t-l-dark','Fon fonse (kontras)', t.light['--dark'])}
          ${F.color('t-l-bg','Fond de page', t.light['--bg'])}
          ${F.color('t-l-surface','Sifas kat', t.light['--surface'])}
          ${F.color('t-l-text','Texte', t.light['--text'])}
        </div>
        <h4 style="margin-top:1.2rem">🌙 Mòd Fonse</h4>
        <div class="color-grid">
          ${F.color('t-d-primary','Couleur principale', t.dark['--primary'])}
          ${F.color('t-d-hover','Prensipal (hover)', t.dark['--primary-hover'])}
          ${F.color('t-d-accent','Couleur d\'accentuation', t.dark['--accent'])}
          ${F.color('t-d-dark','Fon fonse (kontras)', t.dark['--dark'])}
          ${F.color('t-d-bg','Fond de page', t.dark['--bg'])}
          ${F.color('t-d-surface','Sifas kat', t.dark['--surface'])}
          ${F.color('t-d-text','Texte', t.dark['--text'])}
        </div>
        ${F.text('t-radius','Radiyis kwen (ex: 14px)', t.light['--radius'] || t.dark['--radius'])}`, 'save-theme')}`;

      const st = { logo_wide: b.logo_wide || '', logo_mark: b.logo_mark || '' };
      const wire = (inp, slot, pv) => document.getElementById(inp).onchange = async e => {
        const f = e.target.files[0];
        try { const url = await uploadImage(f, slot); st[slot === 'wide' ? 'logo_wide' : 'logo_mark'] = url;
              document.getElementById(pv).innerHTML = `<img src="${esc(url)}" alt="">`; window.Lotri.toast('Imaj chaje.','success'); }
        catch(ex){ window.Lotri.toast(ex.message,'error'); }
      };
      wire('f-wide','wide','pv-wide'); wire('f-mark','mark','pv-mark');

      /* Konsève ansyen URL la si moun nan pa chaje yon nouvo imaj — konsa yon
         dezyèm sovgad (ex: chanje slogan uniquement) pa efase logo a. */
      document.getElementById('save-brand').onclick = e => busy(e.currentTarget, ()=> saveKey('brand', {
        name: v('b-name'), tagline: v('b-tagline'),
        logo_wide: st.logo_wide || b.logo_wide || '',
        logo_mark: st.logo_mark || b.logo_mark || ''
      }));

      document.getElementById('save-theme').onclick = e => busy(e.currentTarget, ()=> saveKey('theme', {
        light: {
          '--primary': v('t-l-primary'), '--primary-hover': v('t-l-hover'), '--accent': v('t-l-accent'),
          '--dark': v('t-l-dark'), '--bg': v('t-l-bg'), '--surface': v('t-l-surface'),
          '--text': v('t-l-text'), '--radius': v('t-radius')
        },
        dark: {
          '--primary': v('t-d-primary'), '--primary-hover': v('t-d-hover'), '--accent': v('t-d-accent'),
          '--dark': v('t-d-dark'), '--bg': v('t-d-bg'), '--surface': v('t-d-surface'),
          '--text': v('t-d-text'), '--radius': v('t-radius')
        }
      }));
    }
  });

  /* ---------------- Page d\'accueil ---------------- */
  LotriShell.register('sys-landing', {
    render: async (host) => {
      const l = await loadKey('landing');
      host.innerHTML = F.card('Page d\'accueil — tous les textes', `
        <p class="muted">Modifiez le titre, le sous-titre et les cartes. Les blocs JSON permettent d\'ajouter/retirer des éléments.</p>
        ${F.text('l-badge','Badj anlè', l.badge)}
        ${F.text('l-h1','Titre liy 1', l.hero_title_1)}
        ${F.text('l-h2','Titre liy 2 (aksantye)', l.hero_title_2)}
        ${F.area('l-sub','Soutit', l.hero_sub, 3)}
        ${F.text('l-cta1','Bouton principal', l.cta_primary)}
        ${F.text('l-cta2','Bouton secondaire', l.cta_secondary)}
        ${F.json('l-mock','Chiffresfres du visuel (JSON)', l.mock, 'Fòma: [{"k":"Ventes totales","v":"18,226"}]')}
        ${F.text('l-he','Surtitre de la section « nous vous aidons »', l.help_eyebrow)}
        ${F.text('l-ht','Titre de la section « nous vous aidons »', l.help_title)}
        ${F.text('l-hs','Sous-titre de la section « nous vous aidons »', l.help_sub)}
        ${F.json('l-hc','Cartes « nous vous aidons » (JSON)', l.help_cards, 'Fòma: [{"i":"fa-file-lines","t":"Créer une fiche rapide"}]')}
        ${F.text('l-ce','Eyebrow Clean & Clear', l.clean_eyebrow)}
        ${F.text('l-ct','Titre Clean & Clear', l.clean_title)}
        ${F.text('l-cs','Soutit Clean & Clear', l.clean_sub)}
        ${F.json('l-cc','Kat Clean & Clear (JSON)', l.clean_cards)}
        ${F.text('l-pe','Eyebrow Forfait', l.plans_eyebrow)}
        ${F.text('l-pt','Titre Forfait', l.plans_title)}
        ${F.text('l-ps','Soutit Forfait', l.plans_sub)}
        ${F.json('l-pl','Plans & Tarifs (JSON)', l.plans, 'Fòma: [{"name":"Pro","price":"$79 / mwa","featured":true,"items":["..."]}]')}
        ${F.text('l-fe','Eyebrow FAQ', l.faq_eyebrow)}
        ${F.text('l-ft','Titre FAQ', l.faq_title)}
        ${F.json('l-fq','FAQ (JSON)', l.faq, 'Fòma: [{"q":"Kesyon?","a":"Repons."}]')}`, 'save-landing');

      document.getElementById('save-landing').onclick = e => busy(e.currentTarget, ()=> saveKey('landing', {
        badge:v('l-badge'), hero_title_1:v('l-h1'), hero_title_2:v('l-h2'), hero_sub:v('l-sub'),
        cta_primary:v('l-cta1'), cta_secondary:v('l-cta2'), mock:jv('l-mock'),
        help_eyebrow:v('l-he'), help_title:v('l-ht'), help_sub:v('l-hs'), help_cards:jv('l-hc'),
        clean_eyebrow:v('l-ce'), clean_title:v('l-ct'), clean_sub:v('l-cs'), clean_cards:jv('l-cc'),
        plans_eyebrow:v('l-pe'), plans_title:v('l-pt'), plans_sub:v('l-ps'), plans:jv('l-pl'),
        faq_eyebrow:v('l-fe'), faq_title:v('l-ft'), faq:jv('l-fq')
      }));
    }
  });

  /* ---------------- Footer ---------------- */
  LotriShell.register('sys-footer', {
    render: async (host) => {
      const f = await loadKey('footer');
      host.innerHTML = F.card('Footer', `
        ${F.area('f-blurb','Texte de présentation', f.blurb, 3)}
        ${F.text('f-lt','Titre kolòn Mentions légales', f.legal_title)}
        ${F.json('f-ll','Liens légaux (JSON)', f.legal_links, 'Fòma: [{"label":"Kondisyon","href":"legal.html#terms"}]')}
        ${F.text('f-ct','Titre kolòn Contact', f.contact_title)}
        ${F.text('f-email','E-mail', f.email)}
        ${F.text('f-phone','Téléphone', f.phone)}
        ${F.text('f-wa','WhatsApp', f.whatsapp)}
        ${F.text('f-addr','Adresse', f.address)}
        ${F.text('f-copy','Copyright', f.copyright)}
        ${F.json('f-soc','Rezo sosyal (JSON)', f.socials, 'Fòma: [{"icon":"fa-brands fa-whatsapp","label":"WhatsApp","url":"https://wa.me/…"}]')}`, 'save-footer');
      document.getElementById('save-footer').onclick = e => busy(e.currentTarget, ()=> saveKey('footer', {
        blurb:v('f-blurb'), legal_title:v('f-lt'), legal_links:jv('f-ll'), contact_title:v('f-ct'),
        email:v('f-email'), phone:v('f-phone'), whatsapp:v('f-wa'), address:v('f-addr'),
        copyright:v('f-copy'), socials:jv('f-soc')
      }));
    }
  });

  /* ---------------- Contact & Mentions légales ---------------- */
  LotriShell.register('sys-contact', {
    render: async (host) => {
      const c = await loadKey('contact'), lg = await loadKey('legal');
      host.innerHTML = `
      ${F.card('Page Contact', `
        <p class="muted">Chak imel ki aktive (✓) la resevwa VRE mesaj yo (FormSubmit voye bay yo tout an menm tan).
        Vous ka ajoute otan imel ou vle.</p>
        <div class="notice notice-warning" style="margin-bottom:1rem">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <strong>Enpòtan — FormSubmit.co:</strong> premye fwa yon <u>nouveau</u> imel ajoute epi yon mesaj eseye rive
          la, FormSubmit voye yon imel konfimasyon bay adrès sa a. Moun ki gen bwat resepsyon an dwe klike sou
          lyen konfimasyon an (verifye Spam tou) — apre sa, tout mesaj kap vini yo ap rive vre otomatikman.
        </div>
        ${F.text('c-title','Titre', c.title)}
        ${F.text('c-sub','Soutit', c.sub)}
        ${F.text('c-prefix','Préfixe de l\'objet des e-mails', c.subject_prefix)}
        ${F.text('c-wa','Numéro WhatsApp', c.whatsapp)}
        ${F.text('c-ok','Message de succès', c.success_msg)}
        <div class="form-row">
          <label class="label">E-mail destinasyon</label>
          <div id="c-email-rows"></div>
          <button type="button" class="btn btn-sm" id="c-email-add"><i class="fa-solid fa-plus"></i> Ajouter un e-mail</button>
        </div>`, 'save-contact')}
      ${F.card('Page Mentions légales', `
        ${F.text('g-tt','Titre Kondisyon', lg.terms_title)}
        ${F.area('g-tb','Texte des conditions d\'utilisation', lg.terms_body, 8)}
        ${F.text('g-pt','Titre Konfidansyalite', lg.privacy_title)}
        ${F.area('g-pb','Texte de confidentialité', lg.privacy_body, 8)}`, 'save-legal')}`;
      const emailRows = document.getElementById('c-email-rows');
      const drawEmailRows = (list) => {
        emailRows.innerHTML = (list.length ? list : [{email:'',active:true}]).map((e,i)=>`
          <div class="row" data-email-row="${i}" style="align-items:center;gap:.5rem;margin-bottom:.5rem">
            <input class="input" type="email" placeholder="email@exemple.com" value="${esc(e.email||'')}" data-email-input style="flex:1">
            <label class="switch" title="Actif (reçoit les messages)"><input type="checkbox" data-email-active ${e.active!==false?'checked':''}><span class="track"></span></label>
            <button type="button" class="btn btn-sm btn-icon btn-danger" data-email-rm title="Retirer"><i class="fa-solid fa-xmark"></i></button>
          </div>`).join('');
      };
      drawEmailRows(Array.isArray(c.emails) ? c.emails : []);
      document.getElementById('c-email-add').onclick = () => {
        const rows = Array.from(emailRows.querySelectorAll('[data-email-row]')).map(r => ({
          email: r.querySelector('[data-email-input]').value.trim(),
          active: r.querySelector('[data-email-active]').checked
        }));
        rows.push({ email:'', active:true });
        drawEmailRows(rows);
      };
      emailRows.addEventListener('click', e => {
        const rm = e.target.closest('[data-email-rm]'); if (!rm) return;
        rm.closest('[data-email-row]').remove();
      });
      const readEmails = () => Array.from(emailRows.querySelectorAll('[data-email-row]'))
        .map(r => ({ email: r.querySelector('[data-email-input]').value.trim(), active: r.querySelector('[data-email-active]').checked }))
        .filter(e => e.email);

      document.getElementById('save-contact').onclick = e => busy(e.currentTarget, ()=> saveKey('contact', {
        title:v('c-title'), sub:v('c-sub'), subject_prefix:v('c-prefix'), whatsapp:v('c-wa'),
        success_msg:v('c-ok'), emails: readEmails()
      }));
      document.getElementById('save-legal').onclick = e => busy(e.currentTarget, ()=> saveKey('legal', {
        terms_title:v('g-tt'), terms_body:v('g-tb'), privacy_title:v('g-pt'), privacy_body:v('g-pb')
      }));
    }
  });

  /* ---------------- Fiche & Règles de fonctionnement ---------------- */
  LotriShell.register('sys-ops', {
    render: async (host) => {
      const t = await loadKey('ticket'), o = await loadKey('ops');
      host.innerHTML = `
      ${F.card('Fiche (ticket imprimé)', `
        <p class="muted">Le nom de la compagnie est toujours en haut du ticket ; le nom du système toujours en bas, après la ligne pointillée.</p>
        ${F.text('k-sys','Nom du système (bas de la fiche)', t.system_name)}
        ${F.text('k-dot','Ligne pointillée', t.dotted)}
        ${F.area('k-legal','Mentions légales', t.legal, 3)}
        <div class="fiche-preview" id="fiche-pv"></div>`, 'save-ticket')}
      ${F.card('Règles de fonctionnement', `
        ${F.json('o-states','Eta / Machine (JSON)', o.states, 'Ex: ["Georgia","Texas"]')}
        ${F.json('o-fmt','Format des boules par jeu (JSON)', o.bet_formats)}
        ${F.text('o-max','Montant maximum d\'une fiche', o.max_ticket_amount)}
        ${F.text('o-min','Montant minimum d\'un pari', o.min_bet_amount)}
        ${F.text('o-to','Timeout sesyon (minit)', o.session_timeout_min)}`, 'save-ops')}`;

      document.getElementById('fiche-pv').innerHTML = window.Lotri.renderFiche({
        company:{ name:'CHEZ JOJO LOTTO', address:'Delmas 33', phone:'+509 0000 0000' },
        ref:'A-1042', serial:'000129', date:'29/07/2026', time:'13:45',
        draw_name:'FLORIDA MIDI', number:'128', currency:'HTG', total:75,
        bets:[{game_label:'Borlette',number:'42',amount:25},{game_label:'Lotto 3',number:'314',amount:50}]
      });

      document.getElementById('save-ticket').onclick = e => busy(e.currentTarget, ()=> saveKey('ticket', {
        system_name:v('k-sys'), dotted:v('k-dot'), legal:v('k-legal')
      }));
      document.getElementById('save-ops').onclick = e => busy(e.currentTarget, ()=> saveKey('ops', {
        states:jv('o-states'), bet_formats:jv('o-fmt'),
        max_ticket_amount:Number(v('o-max')), min_bet_amount:Number(v('o-min')),
        session_timeout_min:Number(v('o-to'))
      }));
    }
  });

  /* ---------------- Aperçu PC / Téléphone ---------------- */
  LotriShell.register('sys-preview', {
    render: async (host) => {
      host.innerHTML = `
      <div class="card">
        <div class="card-hd"><h3>Aperçu — PC &amp; Téléphone</h3>
          <div style="display:flex;gap:.5rem;align-items:center">
            <select class="input" id="pv-page" style="width:auto">
              <option value="auth.html">Koneksyon</option>
              <option value="ajan.html">Agent</option>
              <option value="legal.html">Mentions légales</option>
            </select>
            <button class="btn btn-ghost" id="pv-reload"><i class="fa-solid fa-rotate"></i> Rafrechi</button>
          </div></div>
        <p class="muted">Les modifications enregistrées apparaissent ici sans quitter le panneau.</p>
        <div class="preview-grid">
          <div><div class="device device-pc"><iframe data-preview id="pv-desktop" title="Aperçu PC"></iframe></div>
            <p class="muted center">Òdinatè — 1280px</p></div>
          <div><div class="device device-phone"><iframe data-preview id="pv-mobile" title="Aperçu Téléphone"></iframe></div>
            <p class="muted center">Téléphone — 390px</p></div>
        </div>
      </div>`;
      const set = ()=>{ const p = document.getElementById('pv-page').value + '?preview=1';
        document.getElementById('pv-desktop').src = p; document.getElementById('pv-mobile').src = p; };
      document.getElementById('pv-page').onchange = set;
      document.getElementById('pv-reload').onclick = set;
      set();
    }
  });
})();
