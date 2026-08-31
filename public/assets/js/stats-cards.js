window.LotriStats = {
  async render(host, list){
    // Skeleton pandan chaje
    host.innerHTML = `<div class="grid-stats">${list.map(()=>`<div class="card stat"><div class="skeleton h-6" style="width:60%"></div><div class="skeleton h-10" style="margin-top:.5rem;width:75%"></div></div>`).join('')}</div>`;
    const { data, error } = await window.Lotri.supabase.rpc('jl9_rpc_dashboard_stats');
    if (error) { host.innerHTML = '<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i>Erreur: '+window.Lotri.escapeHtml(error.message)+'</div>'; return; }
    const s = data || {};
    host.innerHTML = `<div class="grid-stats">${list.map(k=>`
      <div class="card stat"><div class="lbl">${window.Lotri.escapeHtml(k.label)}</div>
      <div class="val" data-target="${Number(s[k.key] ?? 0)}">0</div>
      ${k.sub?`<div class="sub">${k.sub}</div>`:''}</div>`).join('')}</div>`;

    // Chiffres ki monte
    host.querySelectorAll('.val[data-target]').forEach(el=>{
      const target = Number(el.dataset.target);
      const dur = 700, start = performance.now();
      const isFloat = !Number.isInteger(target);
      const fmt = (v)=> isFloat ? v.toLocaleString(undefined,{minimumFractionDigits:0, maximumFractionDigits:2}) : Math.round(v).toLocaleString();
      const step = (t)=>{
        const p = Math.min(1, (t - start)/dur);
        const eased = 1 - Math.pow(1-p, 3);
        el.textContent = fmt(target * eased);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmt(target);
      };
      requestAnimationFrame(step);
    });
  }
};
