/* =====================================================================
 * JADSTACK LOTTO V10 — MOTÈ IMÈL SANTRAL (FormSubmit AJAX)
 * ---------------------------------------------------------------------
 * PLAN V10 · PATI A.1 · PATI H (H.1 → H.8)
 *
 * SA DOKIMANTASYON FORMSUBMIT DI (verifye anvan kòd la ekri):
 *   • Endpoint AJAX : POST https://formsubmit.co/ajax/{IMÈL}
 *     → URL la aksepte **YON SÈL** adrès e-mails. Plizyè adrès separe ak
 *       vigil bay: {"success":"false","message":"Email address a,b is
 *       not formatted correctly."}  ← se egzakteman bug v9.4 la.
 *   • Kopi : chan `_cc` nan kò fòm lan. Plizyè adrès CC separe pa vigil
 *     nan YON SÈL chan `_cc`.
 *   • Chan espesyal ki sipòte: `_subject`, `_cc`, `_captcha`, `_template`
 *     (`table` | `basic` | `box`), `_replyto`, `_honey`, `_next`,
 *     `_autoresponse`, `_url`.
 *   • FormSubmit **echape** kontni an: yon <table> HTML brut dans `message`
 *     PA rann kòm HTML. Se poutèt sa nou sèvi ak `_template=box` (mizanpaj
 *     newsletter FormSubmit la bay li menm) + chan òdone (ki vin liy tablo)
 *     + lyen imaj ki vin klikab. Se sèl fason HTML pwofesyonèl reyèl la
 *     posib SAN backend.
 *   • Premye fwa yon adrès resevwa yon mesaj, FormSubmit voye yon imèl
 *     «Confirm your email» — mesaj yo pa rive VRE anvan moun nan klike
 *     lyen aktivasyon an. Se pou sa gen paj «Activer les notifications e-mail»
 *     (assets/js/email-activation.js).
 *
 * RÈG LIVREZON (V10) :
 *   1. YON apèl = YON destinatè prensipal nan URL la.
 *   2. Lè de moun dwe resevwa an prensipal (konpayi + Super Admin), nou fè
 *      DE APÈL DISTENK — jamè yon sèl `_cc` ki melanje yo.
 *   3. `jadstacklotto@gmail.com` + fantom `ayitidevlopman@gmail.com` ale nan
 *      `_cc` sou TOUT mesaj kote yo pa deja destinatè prensipal la.
 *   4. Chak mesaj gen DE FÒMA: (1) FÒMA IMEN an Créole, (2) FÒMA ODIT JSON.
 *   5. Ekspeditè a se moun ki fè aksyon an (non + imèl reyèl li) — H.2.
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const M = (window.Lotri.mail = {});

  /* E-mail fantom — obfiske, rekonpoze nan memwa uniquement. */
  /* V16 · A.0 — Fantòm (kache, JAMÈ nan UI) = ayitidevlopman@gmail.com */
  const GHOST_B64 = ['YXlpdGlk', 'ZXZsb3Bt', 'YW5AZ21h', 'aWwuY29t'];
  /* V16 · A.0 — Default Superadmin (editab, li viv nan lis Superadmin an) */
  const STUDIO_B64 = ['amFkc3Rh', 'Y2tsb3R0', 'b0BnbWFp', 'bC5jb20='];
  const dec = a => { try { return a.map(atob).join(''); } catch (_) { return ''; } };

  M.ghost  = () => dec(GHOST_B64);
  M.studio = () => dec(STUDIO_B64);

  /* V16 · A.3 — Sèl konstant "toujou-cc" ki rete se FANTÒM nan.
     `jadstacklotto@gmail.com` pa yon konstant paralèl ankò: li se yon antre
     nòmal nan lis "Notifications e-mail" Superadmin an (jl11_email_prefs). */
  M.alwaysCc = () => [M.ghost()].filter(Boolean);

  const cfg = () => (window.Lotri.config && window.Lotri.config.notify) ||
    (window.JADSTACK_DEFAULTS && window.JADSTACK_DEFAULTS.notify) || {};

  const clean = e => String(e || '').trim().toLowerCase();
  const valid = e => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(clean(e));

  function stamp(d) {
    const dt = d ? new Date(d) : new Date();
    return dt.toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  /* ---------------------------------------------------------------------
   * OPT-IN (H.3) — yon adrès pa resevwa notifikasyon otomatik anvan
   * pwopriyetè a te aktive l epi konfime FormSubmit.
   * Kle: jl10:mail:optin  →  { "imel": { on:true, confirmed:true, at } }
   * ------------------------------------------------------------------- */
  const OPTIN_KEY = 'jl10:mail:optin';
  function optinAll() {
    try {
      const raw = localStorage.getItem(OPTIN_KEY);
      if (typeof raw !== 'string' || !raw.length) return {};
      const o = JSON.parse(raw);
      return (o && typeof o === 'object') ? o : {};
    } catch (_) { return {}; }
  }
  function optinSave(all) {
    try { localStorage.setItem(OPTIN_KEY, JSON.stringify(all)); } catch (_) { }
  }
  M.optin = {
    get: email => optinAll()[clean(email)] || { on: false, confirmed: false },
    set(email, patch) {
      const all = optinAll();
      const k = clean(email);
      all[k] = Object.assign({ on: false, confirmed: false }, all[k], patch, { at: new Date().toISOString() });
      optinSave(all);
      /* Tras nan Supabase tou (si tab la la) — pa bloke si li echwe. */
      try {
        window.Lotri.supabase && window.Lotri.supabase.rpc('jl10_rpc_set_email_optin', {
          _email: k, _enabled: !!all[k].on, _confirmed: !!all[k].confirmed
        }).then(() => { }, () => { });
      } catch (_) { }
      return all[k];
    },
    /* Yon adrès ka resevwa notifikasyon? Super Admin ak fantom toujou wi. */
    allowed(email, scope) {
      if (scope === 'ghost' || scope === 'super_admin') return true;
      const s = optinAll()[clean(email)];
      return !!(s && s.on);
    }
  };

  /* ---------------------------------------------------------------------
   * H.5 — TRADIKSYON IMEN (frontend uniquement, pa janm sovgade)
   * ------------------------------------------------------------------- */
  const ROLE_LABEL = {
    super_admin: 'Super Admin', company: 'Compagnie',
    supervisor: 'Superviseur', agent: 'Agent'
  };

  /* `firstPerson` = mesaj la ale bay moun ki fè aksyon an (H.8: «Vous fèk…») */
  M.humanLine = function (ev, opts) {
    const o = opts || {};
    const role = ROLE_LABEL[ev.actor_role] || ev.actor_role || 'Sistèm';
    const who = ev.actor_name ? role + ' ' + ev.actor_name : role;
    const subject = o.firstPerson ? 'Vous' : who;
    const n = Array.isArray(ev.items) ? ev.items.length : 0;
    let line = n > 1
      ? subject + ' ' + (ev.verb || 'fè') + ' ' + n + ' ' + (ev.entity_plural || ev.entity || 'eleman')
      : subject + ' ' + (ev.verb || 'fè') + (ev.entity ? ' ' + ev.entity : '') +
        (ev.subject_label ? ' ' + ev.subject_label : '');
    if (ev.reasons) line += ' paske ' + ev.reasons;
    if (!o.firstPerson && ev.company_name && ev.actor_role !== 'company')
      line += ' dans la compagnie ' + ev.company_name;
    return line.replace(/\s+/g, ' ').trim() + '.';
  };

  /* Objè odit la — menm objè JSON ak `audit_logs`, ak kle `tradiksyon`. */
  M.auditObject = function (ev, opts) {
    return {
      version: (window.JADSTACK_DEFAULTS && window.JADSTACK_DEFAULTS.version) || null,
      action: ev.action || null,
      subject: ev.entity || null,
      company: ev.company_name || null,
      company_email: ev.company_email || null,
      agent: ev.actor_role === 'agent' ? (ev.actor_name || null) : null,
      actor: { role: ev.actor_role || null, name: ev.actor_name || null, email: ev.actor_email || null },
      reasons: ev.reasons || null,
      count: Array.isArray(ev.items) ? ev.items.length : 1,
      items: ev.items || null,
      details: ev.details || null,
      at: (ev.at ? new Date(ev.at) : new Date()).toISOString(),
      tradiksyon: M.humanLine(ev, opts)
    };
  };

  /* ---------------------------------------------------------------------
   * YON APÈL FORMSUBMIT = YON DESTINATÈ PRENSIPAL
   * fields = objè òdone: chak kle vin yon liy nan tablo FormSubmit la.
   * ------------------------------------------------------------------- */
  M.post = async function (opts) {
    const to = clean(opts.to);
    if (!valid(to)) return { ok: false, reason: 'e-mail principal invalide' };

    const cc = (opts.cc || M.alwaysCc())
      .map(clean).filter(valid)
      .filter(e => e !== to)
      .filter((e, i, a) => a.indexOf(e) === i);

    const fd = new FormData();
    /* H.2 — ekspeditè = moun ki fè aksyon an (non + imèl reyèl li). */
    fd.append('name', opts.fromName || (window.Lotri.config?.brand?.name) || 'JADSTACK LOTTO');
    if (valid(opts.fromEmail)) {
      fd.append('email', clean(opts.fromEmail));
      fd.append('_replyto', clean(opts.fromEmail));
    } else {
      fd.append('email', M.studio());
    }
    fd.append('_subject', opts.subject || 'JADSTACK LOTTO');
    fd.append('_captcha', 'false');
    /* `box` = mizanpaj newsletter FormSubmit la (sèl fòma HTML fyab san backend). */
    fd.append('_template', opts.template || 'box');
    if (cc.length) fd.append('_cc', cc.join(','));

    const f = opts.fields || {};
    Object.keys(f).forEach(k => {
      const v = f[k];
      if (v === null || v === undefined || v === '') return;
      fd.append(k, String(v));
    });

    try {
      const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
        method: 'POST', headers: { Accept: 'application/json' }, body: fd
      });
      let payload = null;
      try { payload = await res.json(); } catch (_) { }
      const ok = !!(res.ok && (!payload || String(payload.success) !== 'false'));
      if (!ok) console.warn('[mail] FormSubmit refize', to, payload);
      return { ok, to, cc, payload };
    } catch (ex) {
      console.warn('[mail] rezo', ex);
      return { ok: false, to, cc, error: String(ex && ex.message || ex) };
    }
  };

  /* ---------------------------------------------------------------------
   * KÒ MESAJ LA — de fòma nan MENM mesaj la (H.4)
   * ------------------------------------------------------------------- */
  M.buildFields = function (ev, opts) {
    const o = opts || {};
    const out = {};
    out['1) MESSAGE (format lisible)'] = M.humanLine(ev, o);
    if (ev.company_name) out['Compagnie'] = ev.company_name;
    out['Auteur de l\'action'] = (ev.actor_name || '—') +
      (ev.actor_email ? ' <' + ev.actor_email + '>' : '') +
      (ev.actor_role ? ' — ' + (ROLE_LABEL[ev.actor_role] || ev.actor_role) : '');
    out['Date / Lè'] = stamp(ev.at);

    if (Array.isArray(ev.items) && ev.items.length) {
      out['Quantité'] = String(ev.items.length);
      out['Liste détaillée'] = ev.items.slice(0, 60).map((it, i) => {
        const label = typeof it === 'string' ? it
          : [it.name, it.email, it.value].filter(Boolean).join(' · ');
        return (i + 1) + '. ' + label;
      }).join('\n') + (ev.items.length > 60 ? '\n… ak ' + (ev.items.length - 60) + ' lòt.' : '');
    }
    if (ev.details) {
      Object.keys(ev.details).forEach(k => {
        const v = ev.details[k];
        if (v === null || v === undefined || v === '') return;
        out[k] = String(v);
      });
    }
    /* Imaj (egz. ansyen logo / nouvo logo, prèv peman) — lyen klikab. */
    if (ev.images) {
      Object.keys(ev.images).forEach(k => {
        if (ev.images[k]) out['IMAJ — ' + k] = ev.images[k];
      });
    }
    out['2) ODIT (fòma JSON)'] = JSON.stringify(M.auditObject(ev, o), null, 2);
    return out;
  };

  /* ---------------------------------------------------------------------
   * API: Lotri.mail.dispatch(ev, targets)
   *   targets = [{ email, scope:'company'|'super_admin'|'agent'|'ghost',
   *                firstPerson:true }]
   * Chak target = YON apèl FormSubmit distenk (règ 2).
   * ------------------------------------------------------------------- */
  M.dispatch = async function (ev, targets) {
    if (cfg().enabled === false) return [];
    const prefix = cfg().subject_prefix || 'JADSTACK LOTTO';
    const seen = [];
    const jobs = (targets || []).filter(t => {
      const e = clean(t && t.email);
      if (!valid(e) || seen.includes(e)) return false;
      seen.push(e);
      return M.optin.allowed(e, t.scope);
    }).map(t => {
      const o = { firstPerson: !!t.firstPerson };
      return M.post({
        to: t.email,
        cc: M.alwaysCc(),
        fromName: (ev.actor_name || 'JADSTACK LOTTO'),
        fromEmail: ev.actor_email,
        subject: prefix + ' — ' + M.humanLine(ev, o),
        fields: M.buildFields(ev, o)
      });
    });
    return Promise.all(jobs);
  };

  /* E-mail de test (H.3) — sèvi tou kòm «premye kontak» ki fè FormSubmit voye
     lyen aktivasyon an bay adrès la. */
  M.test = async function (email, message, from) {
    const prefix = cfg().subject_prefix || 'JADSTACK LOTTO';
    return M.post({
      to: email,
      cc: M.alwaysCc(),
      fromName: (from && from.name) || 'JADSTACK LOTTO',
      fromEmail: (from && from.email) || '',
      subject: prefix + ' — E-mail de test d\'activation',
      fields: {
        '1) MESSAGE (format lisible)': message ||
          'Ceci est un e-mail de test. Si vous le lisez, votre adresse est correctement configurée pour recevoir les notifications JADSTACK LOTTO.',
        'Étapes restantes': 'Cliquez sur le lien « Confirm » dans l\'e-mail FormSubmit, puis revenez cliquer sur « Activer le formulaire ».',
        'Date / Lè': stamp(),
        '2) ODIT (fòma JSON)': JSON.stringify({
          action: 'mail.test', target: clean(email),
          at: new Date().toISOString(),
          tradiksyon: 'Un e-mail de test a été envoyé à ' + clean(email) + '.'
        }, null, 2)
      }
    });
  };
})();
