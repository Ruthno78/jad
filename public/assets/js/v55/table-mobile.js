/* =====================================================================
 * JADSTACK LOTTO V55 — FAZ 5 : TABLO RESPONSIVE (rezize ak dwèt)
 * ---------------------------------------------------------------------
 *  • Chak tablo `.table` resevwa poignée rezize sou chak kolòn.
 *  • Drag ak dwèt (pointer events) — travay sou tach ak sourit.
 *  • Lajè yo sove nan localStorage pa siyati tablo a (tèt kolòn yo).
 *  • Tablo rete tablo: pa gen konvèsyon an kat.
 *  • Zewo backend.
 * ===================================================================== */
(function () {
  'use strict';

  var MIN = 56;
  var store = {
    key: function (t) {
      var hs = [].map.call(t.querySelectorAll('thead th'), function (th) {
        return (th.textContent || '').trim().slice(0, 14);
      }).join('|');
      return 'jl55.cols::' + location.pathname + '::' + hs;
    },
    get: function (t) {
      try { return JSON.parse(localStorage.getItem(store.key(t)) || 'null'); } catch (_) { return null; }
    },
    set: function (t, widths) {
      try { localStorage.setItem(store.key(t), JSON.stringify(widths)); } catch (_) {}
    }
  };

  function headers(t) { return [].slice.call(t.querySelectorAll('thead th')); }

  function applySaved(t) {
    var w = store.get(t);
    if (!w) return;
    headers(t).forEach(function (th, i) { if (w[i]) th.style.width = w[i] + 'px'; });
  }

  function saveAll(t) {
    store.set(t, headers(t).map(function (th) { return Math.round(th.getBoundingClientRect().width); }));
  }

  function attach(t) {
    if (t.dataset.jl55 === '1') return;
    var ths = headers(t);
    if (ths.length < 2) return;
    t.dataset.jl55 = '1';
    t.classList.add('jl55-resizable');
    t.style.tableLayout = 'fixed';
    applySaved(t);

    ths.forEach(function (th, idx) {
      if (idx === ths.length - 1) return;         // dènye kolòn nan pran rès la
      var grip = document.createElement('span');
      grip.className = 'jl55-grip';
      grip.setAttribute('aria-hidden', 'true');
      th.appendChild(grip);

      var startX = 0, startW = 0, id = null;
      grip.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        id = e.pointerId;
        grip.setPointerCapture(id);
        grip.classList.add('is-drag');
        t.classList.add('jl55-resizing');
        startX = e.clientX;
        startW = th.getBoundingClientRect().width;
      });
      grip.addEventListener('pointermove', function (e) {
        if (id === null) return;
        var w = Math.max(MIN, startW + (e.clientX - startX));
        th.style.width = w + 'px';
      });
      function end() {
        if (id === null) return;
        try { grip.releasePointerCapture(id); } catch (_) {}
        id = null;
        grip.classList.remove('is-drag');
        t.classList.remove('jl55-resizing');
        saveAll(t);
      }
      grip.addEventListener('pointerup', end);
      grip.addEventListener('pointercancel', end);
      // Double-tap = remèt lajè otomatik
      grip.addEventListener('dblclick', function () {
        ths.forEach(function (h) { h.style.width = ''; });
        t.style.tableLayout = 'auto';
        setTimeout(function () { t.style.tableLayout = 'fixed'; saveAll(t); }, 0);
      });
    });
  }

  function scan() { document.querySelectorAll('table.table').forEach(attach); }

  var timer = null;
  function schedule() { clearTimeout(timer); timer = setTimeout(scan, 80); }

  function boot() {
    scan();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('lotri:view', schedule);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.JL55 = { scan: scan };
})();
