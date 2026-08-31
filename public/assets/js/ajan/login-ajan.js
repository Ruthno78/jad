/* =====================================================================
 * JADSTACK LOTTO — LOGIN ENTEGRE POU PAJ AJAN (V27)
 * Paj `ajan.html` la se aplikasyon an limenm (WebView APK/iOS), kidonk li
 * dwe genyen PWÒP paj login li anndan l — pa gen redireksyon sou
 * `auth.html`. Si pa gen sesyon, yon ekran login plen-ekran parèt sou
 * plas la; apre koneksyon, paj la rechaje kòm app la.
 *
 * Chaje AVAN `auth-guard.js`. Si fichye sa a absan, auth-guard la
 * kontinye fè ansyen redireksyon an (okenn regresyon).
 * ===================================================================== */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let el = null;

  function build() {
    if (el) return el;
    el = document.createElement('div');
    el.className = 'jl27-login';
    el.innerHTML = `
      <form class="jl27-login-card" id="jl27-login-form" autocomplete="on">
        <div class="jl27-login-brand">
          <img src="assets/img/logo.png" alt="JADSTACK LOTTO"
               onerror="this.style.display='none'">
          <h1>Connexion Agent</h1>
          <p>Saisissez vos informations pour ouvrir le POS.</p>
        </div>
        <label class="jl27-fld">
          <span>E-mail</span>
          <input type="email" id="jl27-email" inputmode="email" autocomplete="username"
                 required placeholder="email@exemple.com">
        </label>
        <label class="jl27-fld">
          <span>Mot de passe</span>
          <span class="jl27-pass">
            <input type="password" id="jl27-pass" autocomplete="current-password"
                   required placeholder="••••••••">
            <button type="button" id="jl27-eye" aria-label="Afficher le mot de passe">
              <i class="fa-solid fa-eye"></i>
            </button>
          </span>
        </label>
        <div class="jl27-err" id="jl27-err" hidden></div>
        <button class="jl27-submit" type="submit" id="jl27-submit">
          <i class="fa-solid fa-right-to-bracket"></i> Se connecter
        </button>
        <button class="jl27-link" type="button" id="jl27-reset">Mot de passe oublié ?</button>
      </form>`;
    return el;
  }

  function show() {
    document.querySelectorAll('.app-loading').forEach(n => n.remove());
    document.body.appendChild(build());
    const $ = s => el.querySelector(s);
    const err = $('#jl27-err');
    const showErr = m => { err.textContent = m; err.hidden = false; };

    $('#jl27-eye').onclick = () => {
      const i = $('#jl27-pass');
      i.type = i.type === 'password' ? 'text' : 'password';
      $('#jl27-eye').innerHTML = i.type === 'password'
        ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    };

    $('#jl27-reset').onclick = async () => {
      const email = $('#jl27-email').value.trim().toLowerCase();
      if (!email) return showErr('Saisissez d\'abord votre e-mail.');
      const { error } = await window.Lotri.supabase.auth
        .resetPasswordForEmail(email, { redirectTo: location.origin + '/auth.html' });
      if (error) showErr(error.message);
      else showErr('Nous avons envoyé un e-mail pour changer le mot de passe.');
    };

    $('#jl27-login-form').onsubmit = async (e) => {
      e.preventDefault();
      err.hidden = true;
      const email = $('#jl27-email').value.trim().toLowerCase();
      const password = $('#jl27-pass').value;
      const btn = $('#jl27-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Connexion en cours...';
      try {
        const { error } = await window.Lotri.supabase.auth
          .signInWithPassword({ email, password });
        if (error) throw new Error(error.message === 'Invalid login credentials'
          ? 'L\'e-mail ou le mot de passe est incorrect.' : error.message);
        const prof = await window.Lotri.getProfile(true);
        if (!prof) throw new Error('Votre compte n\'a pas de profil. Contactez l\'administrateur.');
        if (prof.status !== 'active') throw new Error('Votre compte n\'est pas actif.');
        if (prof.role !== 'agent') {
          location.replace(window.Lotri.homeFor(prof.role));
          return;
        }
        location.reload();
      } catch (ex) {
        showErr(esc(ex.message || 'Erreur de connexion.'));
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Se connecter';
      }
    };

    setTimeout(() => { const f = el.querySelector('#jl27-email'); if (f) f.focus(); }, 60);
  }

  window.LotriInlineLogin = { show };
})();
