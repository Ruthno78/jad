/* =====================================================================
 * JADSTACK LOTTO V16 — PATI D
 * KONPOZAN KOMEN: BAR RECHÈCH + FILTÈ (dat / estati / wòl / elt.)
 * ---------------------------------------------------------------------
 * Yon sèl zouti pou TOUT lis/tablo sit la (Agent, Compagnie, Ticket, Rapport,
 * Estatistik, Siveyans, Verifikasyon Paiement, Opérateur Paiement, Jwèt/Tiraj,
 * Kontak/Mesaj). Menm sistèm vizyèl toupatou — style nan assets/css/v16.css.
 *
 * ITILIZASYON
 * -----------
 *   const sf = Lotri.searchFilter.mount(host.querySelector('#bar'), {
 *     placeholder: 'Rechercher un agent…',
 *     date: true,                    // filtè dat: jou presi OSWA peryòd
 *     dateLabel: 'Date de création',
 *     filters: [
 *       { key:'status', label:'Statut', options:[
 *           {value:'active', label:'Actif'}, {value:'blocked', label:'Bloqué'} ] }
 *     ],
 *     onChange: (state) => redraw(state)   // debounce 300ms sou tèks la
 *   });
 *
 *   // Filtraj bò kliyan (opsyonèl):
 *   const rows = Lotri.searchFilter.apply(all, sf.state, {
 *     text: ['full_name','public_id','phone'],   // chan pou rechèch tèks
 *     date: 'created_at',                        // chan dat
 *     map:  { status: 'status' }                 // filtè → chan
 *   });
 * ===================================================================== */
(function () {
  window.Lotri = window.Lotri || {};
  const SF = (window.Lotri.searchFilter = {});
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let _seq = 0;

  SF.mount = function (host, opts) {
    if (!host) return null;
    const o = opts || {};
    const id = 'sf' + (++_seq);
    const filters = Array.isArray(o.filters) ? o.filters : [];

    host.classList.add('v16-sf');
    host.innerHTML = `
      <div class="v16-sf-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input class="v16-sf-input" id="${id}-q" type="search"
               placeholder="${esc(o.placeholder || 'Rechercher…')}" aria-label="Rechercher">
        <button class="v16-sf-x" id="${id}-x" title="Supprimer" aria-label="Supprimer">
          <i class="fa-solid fa-xmark"></i></button>
      </div>
      ${filters.map(f => `
        <select class="v16-sf-sel" data-f="${esc(f.key)}" aria-label="${esc(f.label || f.key)}">
          <option value="">${esc(f.label || f.key)} — tous</option>
          ${(f.options || []).map(x => `<option value="${esc(x.value)}">${esc(x.label)}</option>`).join('')}
        </select>`).join('')}
      ${o.date === false ? '' : `
        <select class="v16-sf-sel" id="${id}-dm" aria-label="Filtres dat">
          <option value="">${esc(o.dateLabel || 'Date')} — tous</option>
          <option value="today">Aujourd'hui</option>
          <option value="7">7 dènye jou</option>
          <option value="30">30 dènye jou</option>
          <option value="day">Un jour précis</option>
          <option value="range">Période (soti → jiska)</option>
        </select>
        <input class="v16-sf-date" id="${id}-d1" type="date" hidden aria-label="Soti">
        <span class="v16-sf-arrow" id="${id}-ar" hidden>→</span>
        <input class="v16-sf-date" id="${id}-d2" type="date" hidden aria-label="Au">`}
      <button class="v16-sf-reset" id="${id}-r" title="Tous réinitialiser"><i class="fa-solid fa-rotate-left"></i></button>`;

    const $ = s => host.querySelector(s);
    const qEl = $('#' + id + '-q');
    const dm = $('#' + id + '-dm'), d1 = $('#' + id + '-d1'),
      d2 = $('#' + id + '-d2'), ar = $('#' + id + '-ar');

    const api = {
      state: { q: '', from: null, to: null, dateMode: '', filters: {} },
      host, read, reset
    };

    function iso(d, end) {
      if (!d) return null;
      return d + (end ? 'T23:59:59.999' : 'T00:00:00.000');
    }
    function daysAgo(n) {
      const t = new Date(); t.setDate(t.getDate() - n);
      return t.toISOString().slice(0, 10);
    }

    function read() {
      const st = api.state;
      st.q = (qEl.value || '').trim();
      st.filters = {};
      host.querySelectorAll('[data-f]').forEach(sel => {
        if (sel.value) st.filters[sel.dataset.f] = sel.value;
      });
      st.from = st.to = null;
      st.dateMode = dm ? dm.value : '';
      if (dm) {
        const m = dm.value;
        if (m === 'today') { const t = new Date().toISOString().slice(0, 10); st.from = iso(t); st.to = iso(t, true); }
        else if (m === '7') { st.from = iso(daysAgo(7)); }
        else if (m === '30') { st.from = iso(daysAgo(30)); }
        else if (m === 'day' && d1.value) { st.from = iso(d1.value); st.to = iso(d1.value, true); }
        else if (m === 'range') { st.from = iso(d1.value); st.to = iso(d2.value, true); }
      }
      return st;
    }

    function syncDate() {
      if (!dm) return;
      const m = dm.value;
      d1.hidden = !(m === 'day' || m === 'range');
      d2.hidden = m !== 'range';
      ar.hidden = m !== 'range';
    }

    function fire() { read(); if (typeof o.onChange === 'function') o.onChange(api.state, api); }

    let t = null;
    qEl.addEventListener('input', () => { clearTimeout(t); t = setTimeout(fire, o.debounce || 300); });
    qEl.addEventListener('search', fire);
    $('#' + id + '-x').onclick = () => { qEl.value = ''; fire(); qEl.focus(); };
    host.querySelectorAll('[data-f]').forEach(sel => sel.onchange = fire);
    if (dm) { dm.onchange = () => { syncDate(); fire(); }; d1.onchange = fire; d2.onchange = fire; }

    function reset() {
      qEl.value = '';
      host.querySelectorAll('[data-f]').forEach(s => s.value = '');
      if (dm) { dm.value = ''; d1.value = ''; d2.value = ''; syncDate(); }
      fire();
    }
    $('#' + id + '-r').onclick = reset;

    syncDate(); read();
    return api;
  };

  /* Filtraj bò kliyan — itil pou tout lis ki deja chaje an memwa. */
  SF.apply = function (rows, state, map) {
    if (!Array.isArray(rows)) return [];
    const st = state || {}, m = map || {};
    const q = (st.q || '').toLowerCase();
    const textFields = m.text || [];
    const dateField = m.date || 'created_at';
    const fmap = m.map || {};
    const from = st.from ? new Date(st.from) : null;
    const to = st.to ? new Date(st.to) : null;

    return rows.filter(r => {
      if (q) {
        const hay = (textFields.length ? textFields.map(f => r[f]) : Object.values(r))
          .filter(v => v != null && typeof v !== 'object').join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      for (const k in st.filters || {}) {
        const field = fmap[k] || k;
        if (String(r[field] == null ? '' : r[field]) !== String(st.filters[k])) return false;
      }
      if (from || to) {
        const v = r[dateField];
        if (!v) return false;
        const d = new Date(v);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  };


  /* ---------------------------------------------------------------------
   * V16 · PATI D — OTO-APLIKASYON SOU TOUT LIS/TABLO SIT LA
   * Olye pou n modifye 15 fichye youn pa youn, nou obsève DOM nan: chak
   * tablo (`table`) oswa gri (`.v11-pay-grid`, `.v11-list`) ki anndan yon
   * `.card` san bar rechèch resevwa MENM konpozan an otomatikman.
   * Pou dezaktive sou yon kat: mete `data-nosf` sou kat la.
   * ------------------------------------------------------------------- */
  function rowsOf(container) {
    const tb = container.matches('table') ? container.querySelector('tbody') : null;
    if (tb) return Array.from(tb.rows);
    return Array.from(container.children).filter(el => el.nodeType === 1 && !el.classList.contains('empty'));
  }

  function autoAttach(container) {
    const card = container.closest('.card') || container.parentElement;
    if (!card || card.dataset.nosf !== undefined || card.dataset.sfDone) return;
    if (rowsOf(container).length < 3) return;          // pa itil sou yon ti lis
    card.dataset.sfDone = '1';

    const bar = document.createElement('div');
    const anchor = card.querySelector('.card-hd');
    if (anchor && anchor.nextSibling) card.insertBefore(bar, anchor.nextSibling);
    else card.insertBefore(bar, card.firstChild);

    // Dènye eta filtè a (ranpli pa onChange, itilize ankò pa
    // re-aplikasyon otomatik lè liy tablo a chanje pi ba a).
    let lastState = null;

    function runFilter(st) {
      const q = (st.q || '').toLowerCase();
      const from = st.from ? new Date(st.from) : null;
      const to = st.to ? new Date(st.to) : null;
      let shown = 0;
      rowsOf(container).forEach(row => {
        let ok = true;
        if (q) ok = (row.textContent || '').toLowerCase().includes(q);
        if (ok && (from || to)) {
          const raw = row.dataset.date || (row.textContent.match(/\d{4}-\d{2}-\d{2}/) || [])[0];
          if (!raw) ok = false;
          else {
            const d = new Date(raw);
            if (from && d < from) ok = false;
            if (to && d > to) ok = false;
          }
        }
        row.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      let none = card.querySelector('.v16-sf-none');
      if (!shown && (q || from || to)) {
        if (!none) {
          none = document.createElement('div');
          none.className = 'empty v16-sf-none';
          none.textContent = 'Aucun résultat pour cette recherche/ce filtre.';
          container.parentElement.appendChild(none);
        }
      } else if (none) none.remove();
    }

    SF.mount(bar, {
      placeholder: 'Rechercher dans la liste…',
      date: true,
      onChange: (st) => { lastState = st; runFilter(st); }
    });

    // Bug konfime: lè lis la rechaje (egz. apre kreye/efase yon ranje),
    // tablo a ranplase (`innerHTML =`), men filtè a pa t janm re-aplike
    // sou nouvo liy yo — yo tout te parèt san filtraj menm si moun nan
    // te gen yon rechèch aktif. Obsève KONTNAN container a espesifikman
    // pou re-aplike dènye filtè a chak fwa liy yo chanje.
    if (window.MutationObserver) {
      let rt = null;
      new MutationObserver(() => {
        if (!lastState || (!lastState.q && !lastState.from && !lastState.to)) return;
        clearTimeout(rt);
        rt = setTimeout(() => runFilter(lastState), 40);
      }).observe(container, { childList: true, subtree: true });
    }
  }

  SF.scan = function (root) {
    (root || document).querySelectorAll('.card table, .card .v11-pay-grid, .card .v11-list')
      .forEach(autoAttach);
  };

  SF.auto = function () {
    if (SF._auto) return;
    SF._auto = true;
    let t = null;
    const kick = () => { clearTimeout(t); t = setTimeout(() => SF.scan(document), 250); };
    document.addEventListener('lotri:ready', kick);
    document.addEventListener('lotri:view', kick);
    new MutationObserver(kick).observe(document.body, { childList: true, subtree: true });
    kick();
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => SF.auto());
  else SF.auto();

  /* Rakoursi: kreye yon bar epi tache l anwo yon kat. */
  SF.attach = function (cardEl, opts) {
    if (!cardEl) return null;
    const bar = document.createElement('div');
    cardEl.insertBefore(bar, cardEl.firstChild);
    return SF.mount(bar, opts);
  };
})();
