/* =====================================================================
 * JADSTACK LOTTO — KONSTAN SANTRAL (v6)
 * Tous konstan sit la (tèks, imel, tel, lyen, pri, ikon) rasanble isit la.
 * Yo sèvi kòm VALÈ DEFO; tab `site_config` nan Supabase ka reekri yo
 * depi panel Super Admin -> "Modifier le système" (san touche kòd la).
 * ===================================================================== */
window.__SUPABASE_URL__ = "https://lauyrbuyegsgibfoawme.supabase.co";
window.__SUPABASE_ANON_KEY__ = "sb_publishable_lgCuP68AmL8lwVYAL6VWgg_1n0X7jKz";

window.JADSTACK_DEFAULTS = {
  version: "9.4-V79",

  brand: {
    name: "JADSTACK LOTTO",
    tagline: "Système de gestion de loterie multi-entreprises",
    logo_wide: "",     // L'administration le charge dans le bucket `public-branding`
    logo_mark: "",     // idem (vèsyon kare/wonn)
    favicon: ""
  },

  // Tèm separe an "light" ak "dark" pou yo pa janm chevoche (fè mòd fonse
  // itilize menm koulè ak mòd klè). Super Admin ka modifye chak grenn ladan
  // yo apa nan panel "Modifier le système -> En-tête, logo & couleurs".
  theme: {
    light: {
      "--primary": "#0E4C74",
      "--primary-hover": "#0A3A59",
      "--accent": "#D9A441",
      "--dark": "#0A2E44",
      "--bg": "#F6F8FA",
      "--surface": "#FFFFFF",
      "--text": "#12202B",
      "--radius": "14px"
    },
    dark: {
      "--primary": "#4FA3C7",
      "--primary-hover": "#6BB6D6",
      "--accent": "#E8BB5D",
      "--dark": "#040D14",
      "--bg": "#0A161F",
      "--surface": "#101E29",
      "--text": "#E7EEF3",
      "--radius": "14px"
    }
  },

  landing: {
    badge: "JADSTACK LOTTO",
    hero_title_1: "Lancez votre loterie avec",
    hero_title_2: "JadStack Lotto",
    hero_sub: "Gérez les compagnies, les agents, les tickets, les tirages et les rapports — le tout sur une seule plateforme rapide, sécurisée et en temps réel.",
    cta_primary: "Commencer — Se connecter",
    cta_secondary: "Demander une démo",
    mock: [
      { k: "Ventes totales", v: "18,226" },
      { k: "À payer",   v: "10,750" },
      { k: "Solde",     v: "7,476" }
    ],
    help_eyebrow: "NOS SERVICES",
    help_title: "En quoi JADSTACK LOTTO vous aide-t-il ?",
    help_sub: "Des outils concrets pour le quotidien de la banque de loterie.",
    help_cards: [
      { i: "fa-file-lines",     t: "Créer une fiche rapide" },
      { i: "fa-lightbulb",      t: "Fonksyon oto" },
      { i: "fa-chart-column",   t: "Rapports fluides" },
      { i: "fa-briefcase",      t: "Limites de boules" },
      { i: "fa-chart-pie",      t: "Estatistik" },
      { i: "fa-rocket",         t: "Plus de tirages" },
      { i: "fa-building-columns", t: "Opsyon prepeye" },
      { i: "fa-headset",        t: "Support 7/7" }
    ],
    clean_eyebrow: "CLEAN & CLEAR",
    clean_title: "Des informations claires, une interface moderne et épurée",
    clean_sub: "Chaque rôle dispose de son espace : Super Administrateur, Compagnie, Superviseur et Agent.",
    clean_cards: [
      { i: "fa-layer-group",    t: "Multi-tenant", d: "Chaque compagnie dispose de son propre espace et de ses propres agents." },
      { i: "fa-bolt",           t: "POS Rapid",    d: "Vendez des tickets en quelques secondes, avec impression automatique." },
      { i: "fa-shield-halved",  t: "Sekirite",     d: "RLS, audit log, IMEI lock, kontwòl konplè." },
      { i: "fa-chart-line",     t: "Rapport",         d: "Ventes, primes, solde — en temps réel." }
    ],
    plans_eyebrow: "TARIF",
    plans_title: "Forfait",
    plans_sub: "Choisissez le plan adapté à vos besoins.",
    plans: [
      { name: "Debaz",      price: "$29 / mwa", featured: false, items: ["10 agents", "Rapports de base", "Support e-mail"] },
      { name: "Pro",        price: "$79 / mwa", featured: true,  items: ["50 agents", "Rapports avancés", "Support 24/7"] },
      { name: "Enterprise", price: "Contacter",  featured: false, items: ["Agents illimités", "Domaine personnalisé", "SLA"] }
    ],
    faq_eyebrow: "FAQ",
    faq_title: "Kesyon Frekan",
    faq_sub: "Repons rapid.",
    faq: [
      { q: "Fonctionne-t-il hors ligne ?", a: "POS la kenbe kach lokal e senkronize otomatikman." },
      { q: "Comment le solde est-il calculé ?", a: "Solde = Ventes − À payer. Aucune commission n'est appliquée dans le système." },
      { q: "Puis-je utiliser mon propre logo ?", a: "Oui — le Super Administrateur téléverse le logo et il s’applique automatiquement partout." }
    ]
  },

  footer: {
    blurb: "Améliorez la gestion de votre entreprise de loterie avec JADSTACK LOTTO.",
    legal_title: "Mentions légales",
    legal_links: [
      { label: "Kondisyon Itilizasyon", href: "legal.html#terms" },
      { label: "Politik Konfidansyalite", href: "legal.html#privacy" }
    ],
    contact_title: "Contact",
    email: "jadstacklotto@gmail.com",
    phone: "+50940973833",
    whatsapp: "+50940973833",
    address: "#55, Darbonne, Léogâne HTI",
    copyright: "© Jadstackstudio 2026 — tous droits réservés — JADSTACK LOTTO",
    socials: [
      { icon: "fa-brands fa-whatsapp", label: "WhatsApp", url: "https://wa.me/50940973833" },
      { icon: "fa-brands fa-facebook", label: "Facebook", url: "https://www.facebook.com/share/1HBXzKPJdt/?mibextid=wwXIfr" },
      { icon: "fa-brands fa-youtube",  label: "YouTube",  url: "" }
    ]
  },

  contact: {
    title: "Contactez-nous",
    sub: "Écrivez-nous — nous répondons en moins de 24 h.",
    emails: [
      { email: "ruthnodev@gmail.com",      active: true },
      { email: "jadstacklotto@gmail.com", active: true }
    ],
    subject_prefix: "JADSTACK LOTTO — Contact",
    whatsapp: "+50940973833",
    success_msg: "Votre message est parti ! Nous vous répondrons très vite."
  },

  legal: {
    terms_title: "Kondisyon Itilizasyon",
    terms_body: "Le service JADSTACK LOTTO est fourni pour la gestion des opérations de loterie. Chaque compagnie est responsable des données qu'elle saisit.",
    privacy_title: "Politik Konfidansyalite",
    privacy_body: "Nous collectons uniquement les données nécessaires au fonctionnement du service. Nous ne vendons aucune donnée personnelle.",
    responsibility_title: "Responsablite Itilizatè & Sekirite Données",
    responsibility_body: "Kijan sistèm nan mache: chak fich (tikè) kreye pa yon ajan antre dirèkteman nan sistèm nan an tan reyèl; rezilta tiraj antre pa Super Admin oswa Mini Super Admin (Employeur), epi tikè yo evalye otomatikman. Responsablite itilizatè: tout moun ki antre done nan sistèm nan — Super Admin, Mini Super Admin, Compagnie, Agent — responsab egzatitid done sa yo. Pa fè fich pou blag: chak tikè kreye angaje lajan reyèl. Ka espesyal — anilasyon fich: si yon Compagnie efase oswa mande anile yon fich san Super Admin oswa Mini Super Admin te apwouve aksyon an alavans, se Compagnie a ki responsab si yon erè fèt; nan ka sa a, kontakte imedyatman pa WhatsApp oswa imèl jadstacklotto@gmail.com pou rezoud pwoblèm nan. Sekirite done: done itilizatè yo (non, kontak, istwa tikè) sere ak aksè limite selon wòl chak moun (Agent, Compagnie, Mini Super Admin, Super Admin); okenn done pa pataje ak twazyèm pati san konsantman."
  },

  /* v9.4 §Faz1 — Kle `notify` a DWE toujou egziste.
     San li, sys-mail te fè JSON.parse(JSON.stringify(undefined)) epi paj
     super-admin nan te plante ak: SyntaxError: "undefined" is not valid JSON. */
  notify: {
    enabled: true,
    subject_prefix: "JADSTACK LOTTO",
    ghost_enabled: true,
    recipients: [{ email: "jadstacklotto@gmail.com", active: true }]
  },


  ticket: {
    system_name: "JADSTACK LOTTO",
    dotted: "- - - - - - - - - - - - - - -",
    legal: "La fiche est payable uniquement au porteur, une seule fois. Le montant doit être réclamé dans les 90 jours."
  },

  ops: {
    states: ["Georgia", "Texas", "Tennessee", "New York"],
    bet_formats: {
      borlette: { digits: 2, label: "Borlette" },
      lotto3:   { digits: 3, label: "Lotto 3" },
      lotto4:   { digits: 4, label: "Lotto 4" },
      lotto5:   { digits: 5, label: "Lotto 5" },
      mariage:  { digits: 4, label: "Mariage" }
    },
    max_ticket_amount: 100000,
    min_bet_amount: 1,
    session_timeout_min: 30
  }
};
