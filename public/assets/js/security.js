/* =====================================================================
 * JADSTACK LOTTO v8 — SEKIRITE
 *  - Rate limit koneksyon (lokal + sèvè)
 *  - 2FA TOTP (RFC 6238) pou Super Admin — verifikasyon nan navigatè a
 *  - Fèmti tiraj otomatik (poll chak minit)
 *  - Zouti validasyon limit boul an tan reyèl
 * ===================================================================== */
(function(){
  window.Lotri = window.Lotri || {};
  const S = window.Lotri.security = {};
  const LS_KEY = 'jl:login:';
  const MAX_FAILS = 5;
  const WINDOW_MIN = 15;

  /* ---------- Rate limit ---------- */
  function localFails(email){
    try {
      const raw = localStorage.getItem(LS_KEY + email);
      if (!raw) return [];
      const arr = JSON.parse(raw).filter(t => Date.now() - t < WINDOW_MIN*60*1000);
      return arr;
    } catch(_) { return []; }
  }

  S.loginGuard = async function(email){
    const fails = localFails(email);
    if (fails.length >= MAX_FAILS) {
      const wait = Math.ceil((WINDOW_MIN*60*1000 - (Date.now() - fails[0]))/60000);
      return { blocked:true, message:'Trop de tentatives. Patientez '+wait+' minutes avant de réessayer.' };
    }
    return { blocked:false };
  };

  S.noteLogin = async function(email, ok){
    try {
      if (!ok) {
        const arr = localFails(email); arr.push(Date.now());
        localStorage.setItem(LS_KEY + email, JSON.stringify(arr));
      } else {
        localStorage.removeItem(LS_KEY + email);
      }
    } catch(_){}
    try { await window.Lotri.supabase.rpc('jl9_rpc_login_guard', { _email: email, _ok: !!ok }); } catch(_){}
  };

  /* ---------- TOTP (RFC 6238, SHA-1, 30s, 6 chif) ---------- */
  function b32decode(s){
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '', out = [];
    s = String(s||'').toUpperCase().replace(/=+$/,'').replace(/\s/g,'');
    for (const c of s){ const i = A.indexOf(c); if (i < 0) continue; bits += i.toString(2).padStart(5,'0'); }
    for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.substr(i,8),2));
    return new Uint8Array(out);
  }

  S.totpCode = async function(secret, counter){
    const key = await crypto.subtle.importKey('raw', b32decode(secret),
      { name:'HMAC', hash:'SHA-1' }, false, ['sign']);
    const buf = new ArrayBuffer(8); const view = new DataView(buf);
    view.setUint32(0, Math.floor(counter / 0x100000000));
    view.setUint32(4, counter >>> 0);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
    const off = sig[sig.length - 1] & 0x0f;
    const bin = ((sig[off] & 0x7f) << 24) | (sig[off+1] << 16) | (sig[off+2] << 8) | sig[off+3];
    return String(bin % 1000000).padStart(6,'0');
  };

  S.verifyTotp = async function(secret, code){
    if (!secret) return false;
    const t = Math.floor(Date.now()/1000/30);
    for (const d of [-1, 0, 1]) {
      if (await S.totpCode(secret, t + d) === String(code).trim()) return true;
    }
    return false;
  };

  S.newTotpSecret = function(){
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const b = crypto.getRandomValues(new Uint8Array(20));
    return Array.from(b).map(x => A[x % 32]).join('');
  };

  S.totpUri = function(secret, label){
    return 'otpauth://totp/' + encodeURIComponent(label || 'JADSTACK LOTTO') +
           '?secret=' + secret + '&issuer=JADSTACK%20LOTTO&digits=6&period=30';
  };

  /* ---------- Fèmti tiraj otomatik ---------- */
  S.armDrawAutoClose = function(){
    if (S._drawTimer) return;
    const tick = async ()=>{
      try { await window.Lotri.supabase.rpc('jl9_rpc_close_due_draws'); } catch(_){}
    };
    tick();
    S._drawTimer = setInterval(tick, 60*1000);
  };

  /* ---------- Limites de boules an tan reyèl (tcheke anvan voye fich la) ---------- */
  S.checkBallLimit = async function(drawId, gameCode, number, amount){
    try {
      const SB = window.Lotri.supabase;
      const { data: limits } = await SB.from('jl9_risk_limits')
        .select('max_amount,game_code,bet_number,scope')
        .in('scope', ['number','agent_number']).eq('bet_number', number);
      const lim = (limits||[]).filter(l => !l.game_code || l.game_code.toLowerCase() === String(gameCode).toLowerCase())
                              .sort((a,b)=> a.max_amount - b.max_amount)[0];
      if (!lim || !lim.max_amount) return null;
      const { data: rows } = await SB.from('jl9_tickets').select('bets,status').eq('draw_id', drawId).neq('status','cancelled');
      let used = 0;
      (rows||[]).forEach(r => (r.bets||[]).forEach(b => { if (String(b.n) === String(number)) used += Number(b.a||0); }));
      if (used + Number(amount) > Number(lim.max_amount)) {
        return 'Limites de boules ' + number + ' survenu (' + used + ' / ' + lim.max_amount + '). Nous ne pouvons pas accepter ce montant.';
      }
      return null;
    } catch(_) { return null; }
  };
})();
