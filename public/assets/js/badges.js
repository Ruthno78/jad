/* =====================================================================
 * JADSTACK LOTTO v9.4 — BADGE / NOTIFIKASYON VIZYÈL (Faz 3)
 * ---------------------------------------------------------------------
 * Yon sèl sous verite: RPC `jl9_rpc_badge_counts()` ki konte an tan reyèl
 * nan Supabase (mesaj poko li, pèman an atant, chanjman an atant, fakti).
 *
 * De kalite endikatè, jan demann orijinal la mande l:
 *   • PWEN (badge-dot)   — «gen yon bagay nouvo», lè kantite a pa enpòtan.
 *   • NIMEWO (badge-count) — lè moun nan bezwen kantite egzat la.
 *
 * Li rafrechi: apre chak vi ki chaje, epi chak 60 segond pandan sesyon an.
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const B = (window.Lotri.badges = {});

  /* Ki konte ki ale sou ki antre meni, pa wòl.
     kind: 'count' = nimewo egzat · 'dot' = senp ti pwen */
  const MAP = {
    super_admin: {
      messages:     { key: 'messages', kind: 'count' },
      cchanges:     { key: 'changes',  kind: 'count' },
      'pay-review': { key: 'payments', kind: 'count' },
      invoices:     { key: 'overdue',  kind: 'count' },
      'billing-check': { key: 'overdue', kind: 'dot' }
    },
    company: {
      messages: { key: 'messages', kind: 'count' },
      invoices: { key: 'invoices', kind: 'count' },
      payments: { key: 'payments', kind: 'dot' }
    },
    agent:      { messages: { key: 'messages', kind: 'count' } },
    supervisor: { messages: { key: 'messages', kind: 'count' } }
  };

  let timer = null;
  let last = {};

  B.counts = () => last;

  function paintOne(link, n, kind) {
    link.querySelectorAll('.badge-dot, .badge-count').forEach(e => e.remove());
    if (!n || n < 1) { link.removeAttribute('data-has-badge'); return; }
    const el = document.createElement('span');
    if (kind === 'dot') {
      el.className = 'badge-dot';
      el.setAttribute('aria-label', 'Nouveaux éléments disponibles');
    } else {
      el.className = 'badge-count';
      el.textContent = n > 99 ? '99+' : String(n);
      el.setAttribute('aria-label', n + ' eleman nouvo');
    }
    el.setAttribute('role', 'status');
    link.appendChild(el);
    link.setAttribute('data-has-badge', '1');
  }

  function paint(counts) {
    const role = (window.__lotriProfile || {}).role || 'agent';
    const map = MAP[role] || MAP.agent;

    document.querySelectorAll('.side-link[data-view]').forEach(link => {
      const cfg = map[link.dataset.view];
      paintOne(link, cfg ? Number(counts[cfg.key] || 0) : 0, cfg && cfg.kind);
    });

    /* Menu paran (dropdown ki fermer) resevwa yon ti pwen si youn nan
       pitit li yo gen yon bagay nouvo — konsa ou wè l menm san ouvri l. */
    document.querySelectorAll('.side-link[data-toggle]').forEach(btn => {
      const sub = document.getElementById(btn.dataset.toggle);
      const total = sub
        ? Array.from(sub.querySelectorAll('[data-has-badge]')).length
        : 0;
      btn.querySelectorAll('.badge-dot').forEach(e => e.remove());
      if (total > 0) {
        const d = document.createElement('span');
        d.className = 'badge-dot';
        d.setAttribute('aria-label', 'Nouveaux éléments dans ce menu');
        btn.appendChild(d);
      }
    });

    document.dispatchEvent(new CustomEvent('lotri:badges', { detail: counts }));
  }

  B.refresh = async function () {
    try {
      const { data, error } = await window.Lotri.supabase.rpc('jl9_rpc_badge_counts');
      if (error || !data) return last;
      last = data;
      paint(last);
      return last;
    } catch (_) { return last; }
  };

  /* Rele une seule fois apre mount(); li menm ki mete polling nan. */
  B.arm = function () {
    if (timer) return;
    B.refresh();
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') B.refresh();
    }, 60000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') B.refresh();
    });
  };

  B.disarm = function () { if (timer) { clearInterval(timer); timer = null; } };
})();
