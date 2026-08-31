/* =====================================================================
 * JADSTACK LOTTO V30 §2.9.3 — UI SUPERADMIN "TRADIKSYON" (FR/HT/EN)
 * ---------------------------------------------------------------------
 * Modifier kle nan `jl30_i18n_strings` (RPC `jl30_rpc_save_string`) epi
 * lang ticket DEFO platfòm nan (RPC `jl30_rpc_set_default_ticket_lang`).
 * Sèlman Super Admin ka jwenn paj sa a (proteje pa role check nan RLS
 * ak nan RPC yo — pa gen okenn done sansib ekri san verifikasyon sèvè).
 * ===================================================================== */
(function () {
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml || (s => String(s == null ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const t = (k, f) => (window.Lotri.t ? window.Lotri.t(k, f) : f);

  LotriShell.register('i18n-manage', {
    render: async (host) => {
      host.innerHTML = `<div class="page-hd"><h2>${esc(t('i18n.admin.title', 'Tradiksyon (FR/HT/EN)'))}</h2>
        <p class="muted">${esc(t('i18n.admin.intro', 'Modifiez les textes affichés dans chaque langue. Le français sert de valeur par défaut si une case est vide.'))}</p></div>

      <div class="card" style="margin-bottom:1.1rem">
        <div class="card-hd"><h3>${esc(t('i18n.admin.default_ticket_lang', 'Langue des fiches par défaut (plateforme)'))}</h3></div>
        <div class="form-row" style="max-width:280px">
          <select class="input" id="i18n-default-ticket-lang">
            <option value="fr">Français</option>
            <option value="ht">Créole</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="form-row"><input class="input" id="i18n-search"
          placeholder="${esc(t('i18n.admin.search', 'Rechercher une clé'))}"></div>
        <div style="overflow:auto"><table class="table" id="i18n-table">
          <thead><tr><th>Key</th><th>FR</th><th>HT</th><th>EN</th><th></th></tr></thead>
          <tbody></tbody>
        </table></div>
      </div>`;

      const { data: cfg } = await SB().from('jl9_site_config').select('value').eq('key', 'ticket_lang_default').maybeSingle();
      document.getElementById('i18n-default-ticket-lang').value = (cfg && cfg.value && cfg.value.lang) || 'fr';
      document.getElementById('i18n-default-ticket-lang').onchange = (e) => window.Lotri.ui.busy(e.currentTarget, async () => {
        const { error } = await SB().rpc('jl30_rpc_set_default_ticket_lang', { _lang: e.target.value });
        if (error) return window.Lotri.toast(error.message, 'error');
        window.Lotri.toast('OK', 'success');
      });

      const { data: rows, error } = await SB().rpc('jl30_rpc_list_strings', { _context: null });
      if (error) { host.querySelector('#i18n-table tbody').innerHTML =
        `<tr><td colspan="5">${esc(error.message)}</td></tr>`; return; }

      const tbody = host.querySelector('#i18n-table tbody');
      const renderRows = (list) => {
        tbody.innerHTML = list.map(r => `
          <tr data-key="${esc(r.key)}">
            <td><code>${esc(r.key)}</code>${r.context ? `<br><small class="muted">${esc(r.context)}</small>` : ''}</td>
            <td><textarea class="input i18n-fr" rows="2">${esc(r.fr || '')}</textarea></td>
            <td><textarea class="input i18n-ht" rows="2">${esc(r.ht || '')}</textarea></td>
            <td><textarea class="input i18n-en" rows="2">${esc(r.en || '')}</textarea></td>
            <td><button class="btn btn-sm btn-primary i18n-save">${esc(t('i18n.admin.save', 'Enregistrer'))}</button></td>
          </tr>`).join('') || '<tr><td colspan="5" class="empty">—</td></tr>';

        tbody.querySelectorAll('.i18n-save').forEach(btn => {
          btn.onclick = (e) => window.Lotri.ui.busy(e.currentTarget, async () => {
            const tr = btn.closest('tr');
            const key = tr.dataset.key;
            const fr = tr.querySelector('.i18n-fr').value;
            const ht = tr.querySelector('.i18n-ht').value;
            const en = tr.querySelector('.i18n-en').value;
            const { error: err2 } = await SB().rpc('jl30_rpc_save_string', { _key: key, _fr: fr, _ht: ht, _en: en });
            if (err2) return window.Lotri.toast(err2.message, 'error');
            window.Lotri.toast(t('i18n.admin.saved', 'Traduction enregistrée.'), 'success');
            if (window.Lotri.i18n) window.Lotri.i18n.load(window.Lotri.i18n.current);
          });
        });
      };

      renderRows(rows || []);
      document.getElementById('i18n-search').addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        renderRows((rows || []).filter(r => !q ||
          r.key.toLowerCase().includes(q) || (r.fr || '').toLowerCase().includes(q) ||
          (r.ht || '').toLowerCase().includes(q) || (r.en || '').toLowerCase().includes(q)));
      });
    }
  });
})();
