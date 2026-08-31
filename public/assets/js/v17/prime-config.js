/* =====================================================================
 * v17/prime-config.js — Configuration Prime: 5 opsyon fòkis
 *   §10.3 — Prime Generale / Prime Agent / Prime Tirage / Prime Succursale
 *   §10.4 — Mariage Gratuite (Min/Max/Kantite), Generale + pa Sikisal
 *
 * Depann de: assets/js/shell.js (LotriShell), window.Lotri.supabase,
 * window.Lotri.escapeHtml, window.Lotri.toast.
 * Bezwen: SQL 08-V17-PRIME-CONFIG.sql (jl17_rpc_save_prime_bulk,
 * jl17_rpc_get_prime_bulk, jl17_rpc_save_free_marriage,
 * jl17_free_marriage_rules).
 * ===================================================================== */
(function(){
  const SB = () => window.Lotri.supabase;
  const esc = window.Lotri.escapeHtml;

  // NOTA: lis sa a swiv NON REYÈL yo ki nan tab jl12_game_prizes (baz
  // done) — "Mariage op1/op2/op3", PA "Mariage BP"/"Mariage" jan kèk nan
  // imaj mgnlotto.com yo montre. Si etikèt "Mariage BP" dwe rete separe
  // de "Mariage op1/op2/op3", jl12_game_prizes limenm dwe modifye anvan
  // (chan sa a pa envante, li mape sou sa ki egziste jodi a).
  /* [V30 §1.2] Chan prim yo PA fiks ankò: backend la (jl9_games + kòd
   * _r1/_r2/_r3 kreye pa patch V29 / jl13__game_for_rank) bay 3 chan pou
   * CHAK jeu — 1ye lo / 2e lot / 3yèm lo. Konsa Konpayi/Superadmin ka
   * mete yon valè diferan pou chak pozisyon sou tout jeu (pa uniquement
   * Tirage 1/2/3). Si yon chan rete vid, prim jeneral la aplike (kaskad
   * jl9_prime_rules ki deja egziste). */
  const FALLBACK_FIELDS = [
    { code:'tirage1', label:'Tirage 1' }, { code:'tirage2', label:'Tirage 2' },
    { code:'tirage3', label:'Tirage 3' }
  ];
  let PRIME_FIELDS = null;   // [{ code, label }]

  async function primeFields(){
    if (PRIME_FIELDS) return PRIME_FIELDS;
    try {
      const { data, error } = await SB().rpc('jl30_rpc_prime_fields');
      if (error || !data || !data.length) throw error || new Error('vid');
      PRIME_FIELDS = data.map(r => ({ code: r.code, label: r.label }));
    } catch (_) {
      PRIME_FIELDS = FALLBACK_FIELDS;
    }
    return PRIME_FIELDS;
  }

  /* ---------------------------------------------------------------
   * Kòmpozan reyitilizab: fòm 13-chan + selektè opsyonèl anlè.
   *   scope: 'general' | 'agent' | 'branch' | 'draw'
   *   selectorConfig: null (pou 'general') oswa
   *     { table, labelCol, label, paramName }
   * --------------------------------------------------------------- */
  /* §5 — Ki konpayi fòm "Prime Generale" la vize?
     - super_admin / employer (mini super admin) : yo ka chwazi nenpòt
       konpayi, oswa "Toutes les compagnies" (règ default, company_id = null).
     - company : otomatikman pwòp konpayi li — pa gen selektè, e li pa
       janm ka touche règ global la ni yon lòt konpayi.
     Backend la deja aksepte _company (jl17_rpc_save_prime_bulk /
     jl17_rpc_get_prime_bulk) — se uniquement UI a ki te manke. */
  const profile = () => window.__lotriProfile || {};
  const myRole = () => profile().role || '';
  const isAdminRole = () => ['super_admin', 'employer'].includes(myRole());

  async function renderGeneralForm(host){
    if (myRole() === 'company') {
      const cid = profile().company_id;
      if (!cid) {
        host.innerHTML = '<div class="card"><div class="empty">Votre compagnie n\'est pas identifiée.</div></div>';
        return;
      }
      return renderPrimeForm(host, 'general', null, { companyMode: 'own', companyId: cid });
    }
    if (isAdminRole()) {
      return renderPrimeForm(host, 'general', null, { companyMode: 'select' });
    }
    host.innerHTML = '<div class="card"><div class="empty">Vous n\'avez pas accès à cette page.</div></div>';
  }

  async function renderPrimeForm(host, scope, selectorConfig, companyCfg){
    host.innerHTML = `<div class="card">
      <div class="card-hd"><h3>Chajman…</h3></div>
      <div class="spinner"></div>
    </div>`;

    companyCfg = companyCfg || { companyMode: 'none' };
    let companies = [];
    if (companyCfg.companyMode === 'select') {
      const { data } = await SB().from('jl9_companies').select('id,name').order('name');
      companies = data || [];
    }

    const fields = await primeFields();

    let options = [];
    if (selectorConfig) {
      const { data } = await SB().from(selectorConfig.table)
        .select(`id,${selectorConfig.labelCol}`).order(selectorConfig.labelCol);
      options = data || [];
    }

    const titleMap = {
      general: 'Prime Generale',
      agent:   'Prime Agent',
      branch:  'Prime Succursale',
      draw:    'Prime Tirage'
    };

    host.innerHTML = `<div class="card">
      <div class="card-hd"><h3>${esc(titleMap[scope]||'Prime')}</h3></div>
      ${companyCfg.companyMode === 'select' ? `
        <div class="form-grid" style="margin-bottom:1rem">
          <div>
            <label class="label">Compagnie</label>
            <select class="select" id="pf-company">
              <option value="">Toutes les compagnies (règ default)</option>
              ${companies.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}
            </select>
          </div>
        </div>` : ''}
      ${selectorConfig ? `
        <div class="form-grid" style="margin-bottom:1rem">
          <div>
            <label class="label">${esc(selectorConfig.label)}</label>
            <select class="select" id="pf-target">
              <option value="">— choisir —</option>
              ${options.map(o=>`<option value="${o.id}">${esc(o[selectorConfig.labelCol])}</option>`).join('')}
            </select>
          </div>
        </div>` : ''}
      <form id="pf-form">
        <div class="form-grid" id="pf-fields">
          ${fields.map(f => `
            <div>
              <label class="label">${esc(f.label)}</label>
              <input class="input" name="${esc(f.code)}" type="number" step="0.01" min="0"
                     data-field placeholder="—">
            </div>`).join('')}
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:1rem">
          <button type="submit" class="btn btn-primary" ${selectorConfig ? 'disabled' : ''} id="pf-save">
            <i class="fa-solid fa-floppy-disk"></i> Sauvegarder Les Modifications
          </button>
        </div>
      </form>
    </div>`;

    const form = host.querySelector('#pf-form');
    const saveBtn = host.querySelector('#pf-save');
    const targetSel = host.querySelector('#pf-target');
    const companySel = host.querySelector('#pf-company');
    const currentCompany = () =>
      companyCfg.companyMode === 'own' ? companyCfg.companyId
      : companySel ? (companySel.value || null)
      : null;

    async function loadValuesFor(targetId){
      const params = { _scope: scope, _company: currentCompany() };
      if (scope === 'agent')  params._agent  = targetId || null;
      if (scope === 'branch') params._branch = targetId || null;
      if (scope === 'draw')   params._draw   = targetId || null;

      const { data, error } = await SB().rpc('jl30_rpc_get_prime_by_code', params);
      if (error) { window.Lotri.toast(error.message, 'error'); return; }

      form.querySelectorAll('[data-field]').forEach(inp=>{
        const val = data ? data[inp.name] : null;
        inp.value = (val === null || val === undefined) ? '' : val;
      });
    }

    if (companySel) {
      companySel.addEventListener('change', () => {
        if (selectorConfig) { if (targetSel.value) loadValuesFor(targetSel.value); }
        else loadValuesFor(null);
      });
    }

    if (selectorConfig) {
      targetSel.addEventListener('change', async ()=>{
        const has = !!targetSel.value;
        saveBtn.disabled = !has;
        if (has) await loadValuesFor(targetSel.value);
        else form.querySelectorAll('[data-field]').forEach(inp => inp.value = '');
      });
    } else {
      await loadValuesFor(null);
    }

    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const values = {};
      form.querySelectorAll('[data-field]').forEach(inp=>{
        if (inp.value !== '') values[inp.name] = Number(inp.value);
      });
      if (!Object.keys(values).length) {
        window.Lotri.toast('Saisissez au moins une valeur.', 'error');
        return;
      }
      const params = { _scope: scope, _values: values, _company: currentCompany() };
      if (scope === 'agent')  params._agent  = targetSel ? targetSel.value : null;
      if (scope === 'branch') params._branch = targetSel ? targetSel.value : null;
      if (scope === 'draw')   params._draw   = targetSel ? targetSel.value : null;

      saveBtn.disabled = true;
      /* V64 — menm koreksyon "bouton bloqué en permanence" ak chat.js:
         si rpc() jete yon eksepsyon (pa yon senp { error }), `finally`
         garanti bouton an toujou reaktive. */
      let error;
      try {
        ({ error } = await SB().rpc('jl17_rpc_save_prime_bulk', params));
      } catch (e) {
        error = e;
      } finally {
        saveBtn.disabled = false;
      }
      if (error) window.Lotri.toast(error.message, 'error');
      else window.Lotri.toast('Configuration des primes enregistrée.', 'success');
    });
  }

  // ============ OPSYON 1 — PRIME GENERALE ============
  LotriShell.register('prime-generale', {
    render: (host) => renderGeneralForm(host)
  });

  // ============ OPSYON 2 — PRIME AGENT ============
  LotriShell.register('prime-agent', {
    render: (host) => renderPrimeForm(host, 'agent', {
      table: 'jl9_agents', labelCol: 'full_name', label: 'Agent'
    })
  });

  // ============ OPSYON 3 — PRIME TIRAGE ============
  LotriShell.register('prime-tirage', {
    render: (host) => renderPrimeForm(host, 'draw', {
      // V41: vrè tiraj yo soti nan jl41_draws_v (senkronize ak jl11_draw_media).
      // Avant, 'jl9_draws' te prèske toujou vid → selektè "Tirage" pa t gen anyen.
      table: 'jl41_draws_v', labelCol: 'name', label: 'Tirage'
    })
  });

  // ============ OPSYON 4 — PRIME SUCCURSALE ============
  LotriShell.register('prime-succursale', {
    render: (host) => renderPrimeForm(host, 'branch', {
      table: 'jl9_branches', labelCol: 'name', label: 'Succursale'
    })
  });

  /* ---------------------------------------------------------------
   * §10.4 — MARIAGE GRATUITE (Min/Max/Kantite)
   *   kind='general' → "Mariage Gratuite Generale"
   *   kind='branch'  → "Mariage gratuit succursale" (selektè Sikisal)
   *   kind='agent'   → "Mariage gratuit agent"       (selektè Agent)
   * Priyorite rezolisyon bò SQL: Agent > Sikisal > Compagnie > Jeneral.
   * Rôle 'company' toujou limite sou pwòp konpayi li (backend fòse sa).
   * --------------------------------------------------------------- */
  async function renderFreeMarriageForm(host, kind){
    host.innerHTML = `<div class="card"><div class="card-hd"><h3>Chajman…</h3></div><div class="spinner"></div></div>`;

    const SEL = {
      branch: { table: 'jl9_branches', labelCol: 'name',      label: 'Succursale' },
      agent:  { table: 'jl9_agents',   labelCol: 'full_name', label: 'Agent' }
    }[kind] || null;

    let options = [];
    if (SEL) {
      const { data, error } = await SB().from(SEL.table)
        .select(`id,${SEL.labelCol}`).order(SEL.labelCol);
      if (error) window.Lotri.toast(error.message, 'error');
      options = data || [];
    }

    const titleMap = {
      general: 'Mariage gratuite',
      branch:  'Mariage gratuit succursale',
      agent:   'Mariage gratuit agent'
    };

    host.innerHTML = `<div class="card">
      <div class="card-hd"><h3>${esc(titleMap[kind] || 'Mariage gratuite')}</h3></div>
      ${SEL ? `
        <div class="form-grid" style="margin-bottom:1rem">
          <div>
            <label class="label">${esc(SEL.label)}</label>
            <select class="select" id="fm-target">
              <option value="">— choisir —</option>
              ${options.map(o=>`<option value="${o.id}">${esc(o[SEL.labelCol])}</option>`).join('')}
            </select>
          </div>
        </div>` : ''}
      <form id="fm-form">
        <div class="form-grid">
          <div>
            <label class="label">Minimun</label>
            <input class="input" name="min" type="number" step="0.01" min="0" required>
          </div>
          <div>
            <label class="label">Maximum</label>
            <input class="input" name="max" type="number" step="0.01" min="0" placeholder="Entrer le montant maximum">
          </div>
          <div>
            <label class="label">Quantité</label>
            <input class="input" name="qty" type="number" step="1" min="0">
          </div>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:1rem">
          <button type="submit" class="btn btn-primary" ${SEL ? 'disabled' : ''} id="fm-save">Créer</button>
        </div>
      </form>
    </div>`;

    const form = host.querySelector('#fm-form');
    const saveBtn = host.querySelector('#fm-save');
    const targetSel = host.querySelector('#fm-target');

    async function loadFor(targetId){
      let q = SB().from('jl17_free_marriage_rules')
        .select('min_amount,max_amount,quantity');
      q = kind === 'agent'  ? q.eq('agent_id', targetId)  : q.is('agent_id', null);
      q = kind === 'branch' ? q.eq('branch_id', targetId) : q.is('branch_id', null);
      /* Rôle 'company' wè uniquement règ pwòp konpayi li (RLS aplike tou). */
      if (myRole() === 'company' && profile().company_id) q = q.eq('company_id', profile().company_id);
      const { data, error } = await q.maybeSingle();
      if (error) { window.Lotri.toast(error.message, 'error'); return; }
      form.min.value = data ? data.min_amount : '';
      form.max.value = data && data.max_amount != null ? data.max_amount : '';
      form.qty.value = data && data.quantity != null ? data.quantity : '';
    }

    if (SEL) {
      targetSel.addEventListener('change', async ()=>{
        const has = !!targetSel.value;
        saveBtn.disabled = !has;
        if (has) await loadFor(targetSel.value);
        else form.reset();
      });
    } else {
      await loadFor(null);
    }

    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const min = form.min.value === '' ? null : Number(form.min.value);
      const max = form.max.value === '' ? null : Number(form.max.value);
      const qty = form.qty.value === '' ? null : Number(form.qty.value);
      const targetId = SEL ? (targetSel.value || null) : null;

      saveBtn.disabled = true;
      let error;
      try {
        ({ error } = await SB().rpc('jl17_rpc_save_free_marriage', {
          _branch: kind === 'branch' ? targetId : null,
          _agent:  kind === 'agent'  ? targetId : null,
          _min: min, _max: max, _qty: qty
        }));
      } catch (e) {
        error = e;
      } finally {
        saveBtn.disabled = false;
      }
      if (error) window.Lotri.toast(error.message, 'error');
      else window.Lotri.toast('Mariage gratuit enregistré.', 'success');
    });
  }

  LotriShell.register('mariage-gratuite-generale', {
    render: (host) => renderFreeMarriageForm(host, 'general')
  });
  LotriShell.register('mariage-gratuite-surcursale', {
    render: (host) => renderFreeMarriageForm(host, 'branch')
  });
  LotriShell.register('mariage-gratuite-ajan', {
    render: (host) => renderFreeMarriageForm(host, 'agent')
  });
})();

