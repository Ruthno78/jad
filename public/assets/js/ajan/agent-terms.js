/* =====================================================================
 * V27 FAZ 4b — « Conditions de l'agent » : paj kondisyon itilizasyon + ti gid,
 * espesifik pou wòl AJAN uniquement (pa menm ak legal.html jeneral sit la,
 * ki pale de tout wòl). Enspire nan estrikti legal.html (Kondisyon /
 * Konfidansyalite / Responsablite) men rekadre sou SA YON AJAN AKSEPTE
 * lè li chwazi travay pou yon konpayi sou platfòm nan.
 * Tout kòd paj ajan an rete nan menm dosye a: assets/js/ajan/.
 * ===================================================================== */
(function () {
  const L = window.Lotri || {};

  LotriShell.register('aterms', {
    render: async (host) => {
      host.innerHTML = `
        <div class="page-hd"><h2>Conditions de l'agent</h2>
          <p class="muted">Ce que vous acceptez en choisissant de travailler comme agent sur la plateforme.</p></div>

        <div class="card jl27-terms">
          <div class="card-hd"><h3><i class="fa-solid fa-file-shield"></i> 1. Conditions d'utilisation</h3></div>
          <ul class="jl27-terms-list">
            <li>Vous acceptez d'utiliser le compte agent <strong>uniquement</strong> pou vann/jere tikè pou konpayi
              ki créer un compte ou a — pa pou lòt biznis oswa pou pataje l ak lòt moun.</li>
            <li>Chak nimewo, montan ak tiraj ou antre sou POS la se ou menm ki responsab li — verifye
              anvan ou peze «&nbsp;Finaliser &amp; Imprimer&nbsp;».</li>
            <li>Yon fich ka anile pou kont ou uniquement nan 10 premye minit apre enprime; apre sa, se yon
              demann Konpayi/Super Admin dwe apwouve.</li>
            <li>Vous dwe respekte lè ouvèti/fèmti chak tiraj; sistèm nan ka refize yon vant si tiraj la
              fermer, e sa pa yon erè sistèm.</li>
            <li>Votre compagnie peut suspendre ou retirer l'accès au compte agent à tout moment si ces règles ne sont pas respectées.</li>
          </ul>

          <div class="card-hd" style="margin-top:1rem"><h3><i class="fa-solid fa-user-shield"></i> 2. Confidentialité &amp; données</h3></div>
          <p class="jl27-terms-note">
            <i class="fa-solid fa-circle-info"></i>
            <strong>Vous êtes responsable de toutes les données que vous saisissez sur le site</strong> — nimewo, montan, mesaj,
            ak enfòmasyon pwofil. Pa pataje modpas kont ou ak pèsonn; Konpayi/Super Admin pa janm ap
            mande l nan yon mesaj oswa apèl.
          </p>

          <div class="card-hd" style="margin-top:1rem"><h3><i class="fa-solid fa-eye"></i> 3. Surveillance des activités</h3></div>
          <p class="jl27-terms-note">
            Pou pwoteje konpayi a ak lajan ki antre/sòti, aktivite ou fè lè ou konekte sou sistèm nan
            (vant, fich, chanjman) ka <strong>swiv ak anrejistre</strong> pou odit — menm si ou pa
            antre chak detay ou ta ka mete. Sa ede detekte erè oswa abi rapid, e pwoteje ou tou si gen
            yon dispit sou yon fich.
          </p>

          <div class="card-hd" style="margin-top:1rem"><h3><i class="fa-solid fa-book-open"></i> 4. Comment l’utiliser</h3></div>
          <ol class="jl27-terms-list jl27-terms-steps">
            <li>Choisir <strong>tirage</strong> la, chwazi <strong>jeu</strong> la, antre <strong>nimewo</strong> a ak <strong>montan</strong> , puis appuyez sur «&nbsp;Ajouter un pari&nbsp;».</li>
            <li>Répétez pour les autres tirages sur <strong>la même fiche</strong> si ou vle.</li>
            <li>Appuyez sur «&nbsp;Finaliser &amp; Imprimer&nbsp;» — vous verrez un <strong>apèsi 5&nbsp;segond</strong> fich la anvan li fini; peze <i class="fa-solid fa-xmark"></i> si ou vle modifye anvan sa.</li>
            <li>Konsilte <strong>Mes tickets</strong> pou istwa, <strong>Rapport du jour</strong> pou total jounen an, ak <strong>Résultats des tirages</strong> / <strong>Fiches gagnantes</strong> après la tenue des tirages.</li>
          </ol>

          <p class="jl27-terms-note muted" style="margin-top:1rem">
            Sa a se kondisyon espesifik wòl <strong>agent</strong>. Pou kondisyon jeneral ak politik
            konfidansyalite konplè platfòm nan, gade
            <a href="legal.html#responsabilite" target="_blank" rel="noopener">la page Légal du site</a>.
          </p>
        </div>`;
    }
  });
})();
