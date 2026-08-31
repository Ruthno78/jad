/* =====================================================================
 * JADSTACK LOTTO V56 — FAZ 6 : EKSPERYANS APK NATIF
 * ---------------------------------------------------------------------
 *  1) Toast olye `alert()` / `confirm()` mesaj enfòmatif.
 *  2) Vibrasyon lejè (Android) sou aksyon bouton.
 *  3) Deteksyon klavye telefòn (bottom-nav kache pandan w ap tape).
 *  4) Bouton enstalasyon PWA (beforeinstallprompt).
 *  Zewo backend, zewo SQL.
 * ===================================================================== */
(function () {
  'use strict';

  /* ---------- 1) TOAST ---------- */
  function host() {
    var h = document.querySelector('.jl56-toasts');
    if (!h) {
      h = document.createElement('div');
      h.className = 'jl56-toasts';
      h.setAttribute('role', 'status');
      h.setAttribute('aria-live', 'polite');
      document.body.appendChild(h);
    }
    return h;
  }

  function toast(msg, kind, ms) {
    if (msg === undefined || msg === null || msg === '') return;
    var el = document.createElement('div');
    el.className = 'jl56-toast';
    el.dataset.kind = kind || 'info';
    el.textContent = String(msg);
    host().appendChild(el);
    var life = ms || Math.min(6000, 2400 + String(msg).length * 35);
    var t = setTimeout(close, life);
    function close() {
      clearTimeout(t);
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 200);
    }
    el.addEventListener('click', close);
    return close;
  }

  // Ranplase alert() — menm API, san blokaj natif la
  if (!window.__jl56Alert) {
    window.__jl56Alert = window.alert.bind(window);
    window.alert = function (m) { toast(m, 'info'); };
  }

  /* ---------- 2) VIBRASYON LEJÈ ---------- */
  function haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (_) {}
  }
  document.addEventListener('pointerdown', function (e) {
    var t = e.target.closest && e.target.closest('.btn, .jl-bottom-nav button, .side-link, .jl-sheet-item, .jl-fab');
    if (t) haptic(8);
  }, { passive: true });

  /* ---------- 3) KLAVYE TELEFÒN ---------- */
  (function keyboard() {
    var vv = window.visualViewport;
    if (!vv) {
      document.addEventListener('focusin', function (e) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) document.body.classList.add('jl56-keyboard');
      });
      document.addEventListener('focusout', function () {
        setTimeout(function () {
          var a = document.activeElement;
          if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) document.body.classList.remove('jl56-keyboard');
        }, 80);
      });
      return;
    }
    var base = vv.height;
    vv.addEventListener('resize', function () {
      var open = (base - vv.height) > 140;
      document.body.classList.toggle('jl56-keyboard', open);
      if (!open) base = Math.max(base, vv.height);
    });
  })();

  /* Fè chan an vizib lè klavye a ouvè */
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    setTimeout(function () {
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
    }, 260);
  });

  /* ---------- 4) ENSTALASYON PWA ---------- */
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    try { if (sessionStorage.getItem('jl56.install.hide') === '1') return; } catch (_) {}
    if (document.querySelector('.jl56-install')) return;
    var b = document.createElement('button');
    b.className = 'jl56-install';
    b.type = 'button';
    b.innerHTML = '<i class="fa-solid fa-mobile-screen-button"></i> Enstale aplikasyon an';
    b.addEventListener('click', function () {
      b.remove();
      try { sessionStorage.setItem('jl56.install.hide', '1'); } catch (_) {}
      if (deferred) { deferred.prompt(); deferred = null; }
    });
    document.body.appendChild(b);
    setTimeout(function () { if (b.isConnected) b.remove(); }, 15000);
  });
  window.addEventListener('appinstalled', function () { toast('Application installée ✔', 'success'); });

  window.JL56 = { toast: toast, haptic: haptic };
  window.Lotri = window.Lotri || {};
  window.Lotri.toast = toast;
})();
