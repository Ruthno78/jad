/* Fiche (tikè) — fòma final v6
 * Ordre: Compagnie -> detay tiraj/pari -> Total -> liy pwenntiye -> JADSTACK LOTTO -> legal
 */
(function(){
  window.Lotri = window.Lotri || {};
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  window.Lotri.renderFiche = function(t){
    const cfg = (window.Lotri.config && window.Lotri.config.ticket) || window.JADSTACK_DEFAULTS.ticket;
    const co = t.company || {};
    /* V42 · Seri kout — sèvi ak premye 8 karaktè seri a (avan premye "-" nan
       yon UUID) pou fiche a pa gen yon seri twò long. Seri konplè a rete
       toujou disponib nan t.serial pou nenpòt lòt verifikasyon/rechèch —
       epi kounye a rechèch nan "Fiche" la (V43) aksepte ni seri kout la ni
       seri konplè a, non pou non pou li mache vrèman. */
    const shortSerial = String(t.serial || '').split('-')[0].toUpperCase();
    /* V23 · C2-b — Fiche milti-tiraj: si `t.draws` prezan
       ([{draw_name, bets:[...]}, ...]) nou fè yon seksyon pa tiraj.
       Otreman (ansyen apèl) nou tonbe tounen sou t.draw_name + t.bets. */
    const drawSections = Array.isArray(t.draws) && t.draws.length
      ? t.draws
      : [{ draw_name: t.draw_name || '', bets: t.bets || [] }];
    return `
<div class="fiche">
  ${co.logo_url ? `<div class="fiche-logo"><img src="${esc(co.logo_url)}" alt="${esc(co.name || '')}"></div>` : ''}
  <div class="co${co.logo_url ? ' has-logo' : ''}">${esc(co.name || '')}</div>
  <div class="meta">${esc(co.address||'')}</div>
  <div class="meta">Ref: ${esc(t.ref||'')} &nbsp; Tel: ${esc(co.phone||'')}</div>
  <div class="meta">Seri: ${esc(shortSerial)}</div>
  <div class="meta">Date: ${esc(t.date||'')} &nbsp; Lè: ${esc(t.time||'')}</div>
  <hr>
  <div class="row"><span>T. No.${esc(t.number||'')}</span></div>
  ${drawSections.map(sec => `
  <hr>
  <div class="row"><strong>${esc(sec.draw_name||'')}</strong></div>
  ${(sec.bets||[]).map(b=>`<div class="row"><span>${esc(b.game_label||b.game_code||'')} ${esc(b.number||'')}</span><span>${Number(b.amount||0).toFixed(2)} ${esc(t.currency||'HTG')}</span></div>`).join('')}
  `).join('')}
  <hr>
  <div class="row"><strong>TOTAL</strong><strong>${esc(t.currency||'HTG')} ${Number(t.total||0).toFixed(2)}</strong></div>
  <div class="dotted">${esc(cfg.dotted)}</div>
  <div class="sys">${esc(cfg.system_name)}</div>
  <div class="legal">${esc(cfg.legal)}</div>
</div>`;
  };

  window.Lotri.printFiche = function(t){
    const w = window.open('', '_blank', 'width=380,height=640');
    if (!w) return;
    w.document.write(`<html><head><title>Fiche</title>
      <link rel="stylesheet" href="assets/css/tokens.css"><link rel="stylesheet" href="assets/css/components.css">
      </head><body>${window.Lotri.renderFiche(t)}<script>window.print()<\/script></body></html>`);
    w.document.close();
  };
})();
