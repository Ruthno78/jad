/* =====================================================================
 * JADSTACK LOTTO — native-feel.js (V49)
 * ---------------------------------------------------------------------
 * ZEWO chanjman sou lojik: li jis ajoute yon klas CSS tanporè sou
 * #view chak fwa yon vi fini chaje (evènman `lotri:view` ki deja
 * egziste nan shell.js), pou bay yon ti antre dous olye yon "kout"
 * brital. Activer uniquement sou mobil.
 * ===================================================================== */
(function () {
  const isMobile = () => window.matchMedia('(max-width: 899px)').matches;

  function playEnter() {
    if (!isMobile()) return;
    const host = document.getElementById('view');
    if (!host) return;
    host.classList.remove('jl-view-enter');
    // force reflow pou animasyon an rejwe chak fwa
    void host.offsetWidth;
    host.classList.add('jl-view-enter');
  }

  document.addEventListener('lotri:view', playEnter);
})();
