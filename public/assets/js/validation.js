/* Validasyon pwodiksyon — kliyan-side (backend valide ankò nan RPC yo). */
(function(){
  window.Lotri = window.Lotri || {};
  const V = window.Lotri.validate = {};
  const OPS = () => (window.Lotri.config && window.Lotri.config.ops) || window.JADSTACK_DEFAULTS.ops;

  V.amount = function(value, opts){
    const o = Object.assign({ min: OPS().min_bet_amount, max: OPS().max_ticket_amount }, opts||{});
    const n = Number(value);
    if (!isFinite(n)) return 'Le montant n\'est pas un nombre valide.';
    if (n <= 0) return 'Le montant ne peut pas être nul ni négatif.';
    if (n < o.min) return 'Le montant minimum est de ' + o.min + '.';
    if (n > o.max) return 'Le montant dépasse la limite maximale (' + o.max + ').';
    return null;
  };

  V.quantity = function(value){
    const n = Number(value);
    if (!Number.isInteger(n)) return 'La quantité doit être un nombre entier.';
    if (n <= 0) return 'La quantité ne peut pas être nulle ni négative.';
    if (n > 1000) return 'Quantité a twò gwo.';
    return null;
  };

  /* Fòma boul selon jeu la: Borlette 2 chif, Lotto3 3 chif, elt. */
  V.betNumber = function(gameCode, num){
    const f = OPS().bet_formats[String(gameCode||'').toLowerCase()];
    const s = String(num||'').trim();
    if (!/^\d+$/.test(s)) return 'La boule doit contenir uniquement des chiffres.';
    if (f && s.length !== f.digits) return f.label + ' doit contenir exactement ' + f.digits + ' chif.';
    if (!f && (s.length < 2 || s.length > 6)) return 'Le format de la boule est invalide.';
    return null;
  };

  V.email = function(s){
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s||'').trim()) ? null : 'E-mail la pa valab.';
  };
  V.url = function(s){
    if (!s) return null;
    return /^https:\/\/\S+$/i.test(String(s).trim()) ? null : 'Le lien doit commencer par https://';
  };

  /* Valide yon fiche konplè anvan li ale sou sèvè a */
  V.ticket = function(bets, total){
    if (!Array.isArray(bets) || bets.length === 0) return 'Fiche a vid.';
    let sum = 0;
    for (const b of bets){
      const e1 = V.betNumber(b.game_code, b.number); if (e1) return e1;
      const e2 = V.amount(b.amount);                 if (e2) return e2;
      sum += Number(b.amount);
    }
    if (total !== undefined && Math.abs(sum - Number(total)) > 0.001) return 'Le total ne correspond pas à la somme des paris.';
    if (sum > OPS().max_ticket_amount) return 'Le total de la fiche dépasse la limite maximale.';
    return null;
  };
})();
