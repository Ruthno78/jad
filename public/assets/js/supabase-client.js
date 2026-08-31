// Kliyan Supabase inik + zouti sesyon — ak pwoteksyon timeout
(function(){
  const URL_ = window.__SUPABASE_URL__;
  const KEY_ = window.__SUPABASE_ANON_KEY__;
  const client = supabase.createClient(URL_, KEY_);
  window.Lotri = window.Lotri || {};
  window.Lotri.supabase = client;

  // Anpeche nenpòt apèl rete "pending" pou tout tan san yon rezon klè.
  // Si pwomès la pa rezoud nan `ms` milisegond, nou rejte l ak yon erè
  // eksplisit olye pou nou kite yon spinner enfini san mesaj.
  function withTimeout(promise, ms, label){
    let t;
    const timeout = new Promise((_, rej)=>{
      t = setTimeout(()=> rej(new Error('Delè ekspire: ' + (label||'operasyon') + ' pran twòp tan pou reponn.')), ms);
    });
    return Promise.race([promise, timeout]).finally(()=> clearTimeout(t));
  }

  // Li sesyon an dirèkteman nan localStorage kòm sekou, si SDK a bloke.
  // supabase-js estoke sesyon an sou kle `sb-<ref>-auth-token`.
  function readSessionFromStorage(){
    try {
      const ref = new URL(URL_).hostname.split('.')[0];
      const raw = window.localStorage.getItem('sb-' + ref + '-auth-token');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Fòma a ka soti kòm { currentSession: {...} } oswa dirèkteman { access_token, user, ... }
      const sess = parsed.currentSession || parsed;
      if (sess && sess.access_token && sess.user) return sess;
      return null;
    } catch(_) { return null; }
  }

  let cache = null;
  window.Lotri.getSession = async function(){
    try {
      const { data } = await withTimeout(client.auth.getSession(), 8000, 'chèche sesyon');
      if (data && data.session) return data.session;
    } catch(err) {
      console.warn('getSession timeout/erè, ap eseye fallback localStorage:', err.message);
    }
    // Fallback: si SDK a bloke men gen yon sesyon valab nan localStorage, itilize li.
    return readSessionFromStorage();
  };

  window.Lotri.getProfile = async function(force){
    if (cache && !force) return cache;
    const sess = await window.Lotri.getSession();
    if (!sess) return null;
    try {
      const { data, error } = await withTimeout(
        client.from('jl9_profiles')
          .select('id, role, company_id, agent_id, full_name, status, username, totp_enabled')
          .eq('id', sess.user.id).maybeSingle(),
        8000, 'chèche pwofil'
      );
      if (error) { console.error(error); return null; }
      cache = data ? { ...data, email: sess.user.email } : null;
      return cache;
    } catch(err) {
      console.error('getProfile echwe:', err.message);
      return null;
    }
  };

  /* V18 · KOREKSYON #3 — anile tout tan-datant an atant anvan dekoneksyon,
     konsa okenn popup (kontwòl fen mwa, fantom, notifikasyon…) pa ka
     deklannche pandan yon lòt moun konekte nan menm tab la. */
  window.Lotri.clearPendingTimers = function () {
    try { (window.Lotri.pendingTimers || []).forEach(t => clearTimeout(t)); } catch (_) {}
    window.Lotri.pendingTimers = [];
    try { window.Lotri.monthlyCheck && window.Lotri.monthlyCheck.cancel && window.Lotri.monthlyCheck.cancel(); } catch (_) {}
    try { window.Lotri.phantom && window.Lotri.phantom.cancel && window.Lotri.phantom.cancel(); } catch (_) {}
  };

  window.Lotri.signOut = async function(){
    window.Lotri.clearPendingTimers();
    window.__lotriProfile = null;
    try { await withTimeout(client.auth.signOut(), 5000, 'dekonekte'); } catch(_){}
    cache = null;
    try { window.localStorage.clear(); } catch(_){}
    /* Rechajman konplè: pa kite okenn kontèks SPA fantom nan memwa. */
    window.location.replace('auth.html');
  };


  window.Lotri.homeFor = function(role){
    return role === 'super_admin' ? 'super-admin.html'
         : role === 'employer' ? 'employeur.html'
         : role === 'company' ? 'konpayi.html'
         : role === 'agent' ? 'ajan.html' : 'auth.html';
  };
  // Isolé pou signUp() (evite vòl sesyon) — rete la pou konpatibilite,
  // men nouvo kreyasyon kont dwe pase pa window.Lotri.createAccount().
  window.Lotri.isolatedClient = function(){
    return supabase.createClient(URL_, KEY_, {
      auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false, storageKey:'lotri-iso-'+Date.now() }
    });
  };

  // Kreye yon kont (Konpayi/Employeur/Ajan/Sipèvizè) — pase pa vrè
  // `auth.signUp()` Supabase (sèl fason ki KREYE yon itilizatè Auth reyèl
  // ak modpas bcrypt kòrèk — pa gen SQL ki ka fè sa an sekirite san yon
  // "service role key", e nou refize mete kle sa a nan navigatè a oswa
  // pase pa yon Edge Function pou rezon senplisite).
  //
  // Itilize `isolatedClient()` (kliyan tanporè, `persistSession:false`)
  // pou `signUp()` PA vòlè/ranplase sesyon operatè k ap kreye kont la
  // (super-admin, konpayi, elt.) — apre siyati a, nou jete kliyan
  // tanporè a san n pa janm rele `.auth.setSession()` sou li.
  //
  // `company_id`/`role`/`agent_id` pase kòm metadata (`options.data`) —
  // trigger `jl9_on_auth_user_created` (baz done) li yo otomatikman
  // pou ranpli `jl9_profiles` lè GoTrue kreye ranje a nan `auth.users`.
  window.Lotri.createAccount = async function(payload){
    const iso = window.Lotri.isolatedClient();
    const meta = { role: payload.role, full_name: payload.full_name || null };
    if (payload.company_id) meta.company_id = payload.company_id;
    if (payload.agent_id) meta.agent_id = payload.agent_id;

    const { data, error } = await withTimeout(
      iso.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: { data: meta }
      }),
      15000, 'kreye kont'
    );
    if (error) throw new Error(error.message || 'Nou pa rive kreye kont lan.');
    if (!data || !data.user) throw new Error('Kreyasyon an echwe san rezon klè.');

    // Deskonekte sesyon kliyan tanporè a touswit (li pa dwe rete "konekte"
    // menm nan memwa, e li pa itilize localStorage pou kòmanse).
    try { await iso.auth.signOut(); } catch (_) {}

    return { ok: true, user_id: data.user.id };
  };
  // Toast helper
  window.Lotri.toast = function(msg, kind){
    let host = document.querySelector('.toast-host');
    if (!host) { host = document.createElement('div'); host.className='toast-host'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' '+kind : '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(()=> el.remove(), 3500);
  };
  window.Lotri.escapeHtml = function(s){
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  };
})();
