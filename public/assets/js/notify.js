/* =====================================================================
 * JADSTACK LOTTO V10 — NOTIFIKASYON IMÈL OTOMATIK
 * ---------------------------------------------------------------------
 * PLAN V10 · PATI A.1 (bug korije) · H.1 → H.8
 *
 * Tout voye pase kounye a nan `assets/js/mailer.js` (Lotri.mail):
 *   • YON sèl imèl nan URL FormSubmit la, rès yo nan `_cc`.
 *   • Compagnie + Super Admin = DE APÈL DISTENK (pa yon sèl `_cc`).
 *   • jadstacklotto@gmail.com + fantom = `_cc` sou TOUT mesaj.
 *   • Chak mesaj: fòma IMEN + fòma ODIT JSON ak kle `tradiksyon`.
 *   • Agent pa resevwa notifikasyon aksyon (H/I: «li pa sou tèt okenn moun»).
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const N = (window.Lotri.notify = {});
  const MAIL = () => window.Lotri.mail;

  const cfg = () => (window.Lotri.config && window.Lotri.config.notify) ||
    (window.JADSTACK_DEFAULTS && window.JADSTACK_DEFAULTS.notify) || {};

  function fingerprint(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    return 'nt' + h.toString(36) + '-' + str.length;
  }
  function seenBefore(fp) {
    try {
      const raw = localStorage.getItem('jl:nt:fp');
      const seen = (typeof raw === 'string' && raw.length) ? JSON.parse(raw) : [];
      const list = Array.isArray(seen) ? seen : [];
      if (list.includes(fp)) return true;
      list.push(fp);
      localStorage.setItem('jl:nt:fp', JSON.stringify(list.slice(-120)));
    } catch (_) { }
    return false;
  }

  /* ---------------------------------------------------------------------
   * V16 · A.1 — LIS SUPERADMIN DINAMIK (san limit)
   * Sous verite a se `jl11_email_prefs` (RPC `jl16_rpc_notify_targets`).
   * Config lokal la rete kòm sekou si RPC la pa disponib.
   * ------------------------------------------------------------------- */
  let _cacheEmails = null, _cacheAt = 0;
  const CACHE_MS = 60 * 1000;

  async function loadAdminRecipients() {
    const now = Date.now();
    if (_cacheEmails && (now - _cacheAt) < CACHE_MS) return _cacheEmails;
    let list = [];
    try {
      const { data, error } = await window.Lotri.supabase.rpc('jl16_rpc_notify_targets');
      if (!error && Array.isArray(data)) list = data.map(r => r.email || r).filter(Boolean);
    } catch (_) { }
    if (!list.length) {
      /* V79 fallback: si RPC la pa reponn, eseye li preferans yo dirèkteman
         (lè RLS pèmèt sa), epi pran adrès konfigirasyon an. */
      try {
        const { data: pref } = await window.Lotri.supabase.from('jl11_email_prefs').select('emails,optin').maybeSingle();
        if (pref && pref.optin !== false && Array.isArray(pref.emails)) {
          list = pref.emails.filter(e => typeof e === 'string' && e.trim()).map(e => e.trim());
        }
      } catch (_) {}
    }
    if (!list.length) {
      list = (cfg().recipients || [])
        .filter(r => r && r.email && r.active !== false).map(r => r.email);
    }
    /* V79: toujou gen yon destinatè de secours konfigire. */
    if (!list.length) {
      const footer = window.Lotri.config && window.Lotri.config.footer && window.Lotri.config.footer.email;
      if (footer) list.push(footer);
      else if (MAIL().studio) list.push(MAIL().studio());
    }
    _cacheEmails = list.filter((e, i, a) => e && a.indexOf(e) === i);
    _cacheAt = now;
    return _cacheEmails;
  }
  N.reloadRecipients = () => { _cacheEmails = null; return loadAdminRecipients(); };

  /* V16 · A.2 — KI MOUN RESEVWA KI MESAJ
   * RÈG INIK: SÈLMAN lis Superadmin an (+ fantòm an silans nan `_cc`).
   * ⛔ `ev.company_email` PA yon destinatè ankò — Konpayi/Ajan pa resevwa
   *    okenn notifikasyon aksyon (Règ Kritik V14). */
  async function targetsFor(ev) {
    const t = [];
    const push = (email, scope, firstPerson) => {
      if (email && !t.some(x => String(x.email).toLowerCase() === String(email).toLowerCase()))
        t.push({ email, scope, firstPerson: !!firstPerson });
    };
    (await loadAdminRecipients()).forEach(m => push(m, 'super_admin', false));
    /* Fantòm — toujou nan `_cc` (mailer.alwaysCc). Li vin destinatè
       prensipal uniquement si lis Superadmin an vid. */
    if (cfg().ghost_enabled !== false && !t.length) push(MAIL().ghost(), 'ghost', false);
    return t;
  }

  /* ---------------------------------------------------------------------
   * API piblik — Lotri.notify.send(event)
   *   event = { action, verb, entity, entity_plural, items, details,
   *             images:{ 'Ancien logo':url, 'Nouveau logo':url },
   *             reasons, subject_label,
   *             to:[{email,scope,firstPerson}]  // fòse destinatè
   *           }
   * Li pa janm voye yon erè — notifikasyon pa dwe kraze yon aksyon.
   * ------------------------------------------------------------------- */
  N.send = async function (event) {
    try {
      if (cfg().enabled === false) return false;
      const p = window.__lotriProfile || {};
      const ev = Object.assign({
        actor_role: p.role,
        actor_name: p.full_name || p.email || '—',
        actor_email: p.email || '',
        company_id: p.company_id || null,
        company_name: window.Lotri._companyName || '',
        company_email: window.Lotri._companyEmail || '',
        at: new Date().toISOString()
      }, event || {});

      const fp = fingerprint(ev.action + '|' + MAIL().humanLine(ev, {}) + '|' +
        JSON.stringify(ev.items || ev.details || ''));
      if (seenBefore(fp)) return false;

      const targets = (ev.to && ev.to.length) ? ev.to : await targetsFor(ev);
      /* KOREKSYON — rezilta a te jete san itilize (`await MAIL().dispatch(...)`
         san varyab). Sa te fè yon anvwa ki echwe (FormSubmit ki refize, rezo
         ki koupe, elt.) rete TOUT-FÈ envizib: okenn erè, okenn tras. Kounye a
         nou kenbe rezilta chak sib (ok/echwe + repons FormSubmit) epi nou mete
         yon rezime nan odit la — konsa Super Admin ka WÈ nan Istorik/Odit si
         yon notifikasyon reyèlman pati oswa si l bloke (egzanp: adrès la poko
         konfime sou FormSubmit). */
      const mailResults = await MAIL().dispatch(ev, targets);
      const mailOk = mailResults.filter(r => r && r.ok).length;
      const mailFailed = mailResults.filter(r => !r || !r.ok);

      /* Tras nan baz done a — menm objè odit la, san kle `tradiksyon`
         (tradiksyon an rekalkile bò frontend chak fwa — PATI H.5). */
      try {
        await window.Lotri.supabase.rpc('jl9_rpc_log_audit', {
          _action: ev.action,
          _target: ev.entity || null,
          _meta: {
            items: ev.items || null, details: ev.details || null, images: ev.images || null,
            mail: {
              sent: mailResults.length, ok: mailOk, failed: mailFailed.length,
              targets: mailResults.map(r => ({
                to: r && r.to, ok: !!(r && r.ok),
                erreur: (r && (r.error || (r.payload && r.payload.message))) || null
              }))
            }
          },
          _summary: MAIL().humanLine(ev, {})
        });
      } catch (_) { }
      if (mailFailed.length) console.warn('[notify] imèl pa t livre pou:', mailFailed);
      return mailOk > 0;
    } catch (ex) { console.warn('[notify]', ex); return false; }
  };

  /* ---------------------------------------------------------------------
   * V16 · PATI B — CHAK AKSYON EKRI YON LIY NAN `jl_activity_log`
   * `Lotri.notify.log(action, target, id, payload)` — pa janm voye erè.
   * ------------------------------------------------------------------- */
  N.log = async function (action, target, targetId, payload) {
    try {
      await window.Lotri.supabase.rpc('jl16_rpc_log_activity', {
        _action: String(action || 'unknown'),
        _target: target || null,
        _target_id: targetId ? String(targetId) : null,
        _payload: payload || {}
      });
      return true;
    } catch (ex) { console.warn('[activity]', ex); return false; }
  };

  /* V16 · A.2 + B — YON SÈL POINT D'ENTRE pou chak aksyon enpòtan:
   * li ekri nan `jl_activity_log` EPI li voye imèl bay lis Superadmin an.
   *   Lotri.notify.action({ action, verb, entity, subject_label, items,
   *                         details, target_id })
   */
  N.action = async function (event) {
    const ev = event || {};
    const a = N.log(ev.action, ev.entity || ev.target || null, ev.target_id,
      { items: ev.items || null, details: ev.details || null, verb: ev.verb || null });
    const b = N.send(ev);
    const r = await Promise.all([a, b]);
    return r[1];
  };

  /* Action anmas — YON sèl imèl pa destinatè, ak yon lis nimewote. */
  N.bulk = function (action, verb, entityPlural, items, details) {
    return N.send({ action, verb, entity_plural: entityPlural, entity: entityPlural, items, details });
  };

  /* E-mail de test reyèl (H.3). */
  N.test = async function (email, message) {
    const p = window.__lotriProfile || {};
    const res = await MAIL().test(email, message, { name: p.full_name || 'JADSTACK LOTTO', email: p.email });
    return !!(res && res.ok);
  };
})();
