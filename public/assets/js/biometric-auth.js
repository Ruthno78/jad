/* JADSTACK LOTTO — V80 Secure admin biometric gate
 * Uses the operating system's biometric authenticator (Android BiometricPrompt).
 * We deliberately do NOT capture/store face images or biometric templates.
 * The OS performs the biometric match against enrolled device credentials.
 */
(function(){
  const ADMIN_ROLES = new Set(['super_admin','mini_super_admin','employer']);
  const native = () => window.JadStackBiometric && typeof window.JadStackBiometric.authenticate === 'function';

  function isAdminRole(role){ return ADMIN_ROLES.has(String(role || '').toLowerCase()); }

  function ensureUi(){
    let el = document.getElementById('biometric-status');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'biometric-status';
    el.className = 'biometric-status';
    el.hidden = true;
    el.setAttribute('role','status');
    const form = document.getElementById('login-form');
    if (form) form.insertBefore(el, form.querySelector('#err') || form.firstChild);
    return el;
  }

  function setStatus(message, kind){
    const el = ensureUi();
    el.textContent = message || '';
    el.dataset.kind = kind || '';
    el.hidden = !message;
  }

  function nativeAuth(reason){
    return new Promise((resolve) => {
      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true;
        window.__jadstackBiometricResolve = null;
        resolve(result || {ok:false, error:'Biometric verification failed.'});
      };
      window.__jadstackBiometricResolve = finish;
      try {
        window.JadStackBiometric.authenticate(reason || 'Verifye idantite ou pou kontinye.');
      } catch (e) {
        finish({ok:false, error:e && e.message ? e.message : 'Biometric authentication is unavailable.'});
      }
      setTimeout(() => finish({ok:false, error:'Biometric verification timed out.'}), 90000);
    });
  }

  async function requireAdminBiometric(role){
    if (!isAdminRole(role)) return {ok:true, skipped:true, method:'none'};

    // Native Android app: let Android choose Face/Fingerprint/other enrolled biometric.
    // IMPORTANT: an unsupported/un-enrolled device uses the existing login flow;
    // an explicit user cancellation/failure still blocks the admin login.
    if (native()) {
      try {
        if (typeof window.JadStackBiometric.isAvailable === 'function' && !window.JadStackBiometric.isAvailable()) {
          setStatus('Pa gen Face/Fingerprint ki disponib. N ap kontinye ak login nòmal la.', '');
          return {ok:true, skipped:true, method:'fallback'};
        }
      } catch (_) {
        // If the availability probe itself is unavailable, keep the existing
        // fallback behavior instead of falsely blocking a compatible account.
        setStatus('', '');
        return {ok:true, skipped:true, method:'fallback'};
      }

      setStatus('Verifikasyon sekirite obligatwa…', 'pending');
      const result = await nativeAuth('JADSTACK LOTTO — Verifye Super Admin / Mini Super Admin');
      if (result && result.ok) {
        setStatus('Verifikasyon biometrik reyisi.', 'ok');
        return {ok:true, method:result.method || 'device-biometric'};
      }
      setStatus((result && result.error) || 'Verifikasyon biometrik echwe. Aksè bloke.', 'error');
      return {ok:false, error:(result && result.error) || 'Verifikasyon biometrik echwe.'};
    }

    // Browser/PWA fallback: do not pretend a camera selfie is a secure identity match.
    // If no native authenticator bridge is installed, preserve the existing login flow.
    setStatus('', '');
    return {ok:true, skipped:true, method:'fallback'};
  }

  window.Lotri = window.Lotri || {};
  window.Lotri.requireAdminBiometric = requireAdminBiometric;
  window.Lotri.isAdminBiometricRole = isAdminRole;
})();
