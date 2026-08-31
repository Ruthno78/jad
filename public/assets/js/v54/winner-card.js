/* =====================================================================
 * JADSTACK LOTTO V54 — FAZ 4 : WINNER CARD + REZILTA TIRAJ
 * ---------------------------------------------------------------------
 *  • Chanje badge « Won / Gayan » an « Winner 🏆 ».
 *  • Make fich/ranje gayan yo (bòdi dore + glow) — sèlman yo.
 *  • Konfeti yon sèl fwa pa sesyon (sessionStorage).
 *  • Zewo backend, zewo SQL — prezantasyon sèlman.
 *
 * KOREKSYON BUG (Out 2026) — WIN_RE te sèlman gade PREMYE mo tèks
 * badge la (^gayan\b), kidonk yon badge ki di « Gayan : Non » te MATCH
 * paske li KOMANSE ak « Gayan », menm si valè a se Non. Sa te fè fich
 * ki poko gen rezilta parèt kòm « Winner 🏆 » ak konfeti fo. Kounye a
 * nou egzije badge la deja gen classe .badge-success — sinyal reyèl
 * app la sèvi PATOUT (ticket-detail, rapò, lis fich, elatriye) sèlman
 * lè fich la VREMAN genyen — anvan nou konsidere l kòm yon viktwa.
 * ===================================================================== */
(function () {
  'use strict';

  var WIN_RE = /^(won|gayan|winner|genyen)\b/i;
  var SS_KEY = 'jl54.confetti';

  function isWinText(t) { return WIN_RE.test(String(t || '').trim()); }

  function upgradeBadges(root) {
    var nodes = (root || document).querySelectorAll('.badge:not([data-jl54])');
    for (var i = 0; i < nodes.length; i++) {
      var b = nodes[i];
      if (!isWinText(b.textContent)) continue;
      /* Sèl sinyal fyab: badge-success pa janm mete sof si fich la
         VREMAN gayan (gade jl9_is_super()/ticket-detail-v22.js,
         rapo-jounen.js, konpayi/views.js, super-admin/views.js —
         yo TOUT itilize menm règ la). Sa elimine fo-pozitif yo. */
      if (!b.classList.contains('badge-success')) continue;
      b.setAttribute('data-jl54', '1');
      b.classList.add('jl54-winner');
      b.textContent = 'Winner 🏆';
      markContainer(b);
    }
  }

  function markContainer(badge) {
    var row = badge.closest('tr');
    if (row) { row.classList.add('jl54-win-row'); return; }
    var card = badge.closest('.card, .jl-card, .ticket-card, .stat-card');
    if (card) card.classList.add('jl54-win-card');
  }

  /* ---------- Konfeti (yon sèl fwa pa sesyon) ---------- */
  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try { if (sessionStorage.getItem(SS_KEY) === '1') return; sessionStorage.setItem(SS_KEY, '1'); }
    catch (_) { /* sessionStorage bloke: nou kontinye yon sèl fwa */ }

    var wrap = document.createElement('div');
    wrap.className = 'jl54-confetti';
    var colors = ['#d4a017', '#f6cf5e', '#2e8b57', '#3b82f6', '#e05d5d', '#ffffff'];
    for (var i = 0; i < 60; i++) {
      var p = document.createElement('i');
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 160 - 80).toFixed(0) + 'px');
      p.style.animationDuration = (1.8 + Math.random() * 1.6).toFixed(2) + 's';
      p.style.animationDelay = (Math.random() * .5).toFixed(2) + 's';
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 4200);
  }

  function scan() {
    upgradeBadges(document);
    if (document.querySelector('.jl54-winner')) confetti();
  }

  var t = null;
  function schedule() { clearTimeout(t); t = setTimeout(scan, 60); }

  function boot() {
    scan();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('lotri:view', schedule);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.JL54 = { scan: scan, confetti: confetti };
})();
