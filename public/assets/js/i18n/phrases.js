/* =====================================================================
 * JADSTACK LOTTO — DIKSYONÈ TRADIKSYON EMBAKE (HT / FR / EN)
 * ---------------------------------------------------------------------
 * Sous verite lokal la. Chak antre : [ht, fr, en]. Kle a jenere
 * otomatikman apati tèks Kreyòl la (slug), konsa MENM kle yo itilize
 * nan tab `jl30_i18n_strings`. Valeur ki soti nan baz done a (Super Admin
 * ka modifye yo) PRAN PRIYORITE sou valè embake yo — gade
 * v33/i18n-runtime.js pou lojik tradiksyon an.
 *
 * (Fizyone soti nan ansyen v33/i18n-dict.js + v34/i18n-extra.js —
 * menm 2 tablo yo, `L.V33_PHRASES` ak `L.V34_PHRASES`, rete separe
 * paske i18n-runtime.js li yo apa; uniquement fichye a fizyone.)
 * ===================================================================== */
(function () {
  const L = (window.Lotri = window.Lotri || {});

  L.slugKey = function (s) {
    return 'ui.' + String(s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&nbsp;/g, ' ')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60);
  };

  /* [Kreyòl, Français, English] */
  L.V33_PHRASES = [
    // --- Navigasyon / kokiy ---
    ['POS', 'POS', 'POS'],
    ['Rapò Journée', 'Rapport du jour', 'Daily report'],
    ['Rapò Jounalye', 'Rapport journalier', 'Daily report'],
    ['Tikè mwen', 'Mes tickets', 'My tickets'],
    ['Tikè mwen yo', 'Mes tickets', 'My tickets'],
    ['Rezilta tiraj', 'Résultats des tirages', 'Draw results'],
    ['Fich Gayan', 'Fiches gagnantes', 'Winning slips'],
    ['Mesaj', 'Messages', 'Messages'],
    ['Bwat mesaj', 'Boîte de messages', 'Message box'],
    ['Pwofil konpayi', 'Profil de la compagnie', 'Company profile'],
    ['Kondisyon Ajan', "Conditions de l'agent", 'Agent terms'],
    ['Maryaj GRATIS', 'Mariage GRATUIT', 'FREE marriage'],
    ['Akèy', 'Accueil', 'Home'],
    ['Meni', 'Menu', 'Menu'],
    ['Chanje tèm', 'Changer de thème', 'Change theme'],
    ['Dekonekte', 'Déconnexion', 'Sign out'],
    ['Chèche nan meni…', 'Rechercher dans le menu…', 'Search the menu…'],
    ['Chèche nan meni', 'Rechercher dans le menu', 'Search the menu'],
    ['Ap chaje...', 'Chargement...', 'Loading...'],
    ['Pa kapab chaje aplikasyon an', "Impossible de charger l'application", 'Unable to load the application'],
    ['Eseye ankò', 'Réessayer', 'Try again'],
    ['Lang', 'Langue', 'Language'],

    // --- Mo jeneral ---
    ['Dat', 'Date', 'Date'],
    ['Estati', 'Statut', 'Status'],
    ['— Choisir —', '— Choisir —', '— Select —'],
    ['Tout', 'Tous', 'All'],
    ['Prim', 'Prime', 'Prize'],
    ['Ajan', 'Agent', 'Agent'],
    ['ajan', 'agent', 'agent'],
    ['Tiraj', 'Tirage', 'Draw'],
    ['tiraj', 'tirage', 'draw'],
    ['Jwèt', 'Jeu', 'Game'],
    ['jwèt', 'jeu', 'game'],
    ['Anile', 'Annuler', 'Cancel'],
    ['Enprime', 'Imprimer', 'Print'],
    ['Total', 'Total', 'Total'],
    ['Total:', 'Total :', 'Total:'],
    ['Efase', 'Supprimer', 'Delete'],
    ['Fèmen', 'Fermer', 'Close'],
    ['Tikè', 'Ticket', 'Ticket'],
    ['Tit', 'Titre', 'Title'],
    ['Kontni', 'Contenu', 'Content'],
    ['Filtè', 'Filtres', 'Filters'],
    ['Aplike', 'Appliquer', 'Apply'],
    ['Aktif', 'Actif', 'Active'],
    ['Gayan', 'Gagnant', 'Winner'],
    ['Peye', 'Payé', 'Paid'],
    ['Pèdi', 'Perdu', 'Lost'],
    ['Vant', 'Ventes', 'Sales'],
    ['Vant (HTG)', 'Ventes (HTG)', 'Sales (HTG)'],
    ['Montan (HTG)', 'Montant (HTG)', 'Amount (HTG)'],
    ['Benefis', 'Bénéfice', 'Profit'],
    ['Aksyon', 'Action', 'Action'],
    ['Sib', 'Cible', 'Target'],
    ['Meta', 'Méta', 'Meta'],
    ['Odyans', 'Audience', 'Audience'],
    ['Nivo', 'Niveau', 'Level'],
    ['Info', 'Info', 'Info'],
    ['Siksè', 'Succès', 'Success'],
    ['Atansyon', 'Attention', 'Warning'],
    ['Erè', 'Erreur', 'Error'],
    ['Voye', 'Envoyer', 'Send'],
    ['Reponn', 'Répondre', 'Reply'],
    ['Modifye', 'Modifier', 'Edit'],
    ['Restore', 'Restaurer', 'Restore'],
    ['Aktyalize', 'Actualiser', 'Refresh'],
    ['Retire', 'Retirer', 'Remove'],
    ['Reyinisyalize', 'Réinitialiser', 'Reset'],
    ['Ekspòte CSV', 'Exporter CSV', 'Export CSV'],
    ['Imèl', 'E-mail', 'Email'],
    ['Modpas', 'Mot de passe', 'Password'],
    ['Super Admin', 'Super Admin', 'Super Admin'],
    ['Konpayi', 'Compagnie', 'Company'],
    ['Sipèvizè', 'Superviseur', 'Supervisor'],
    ['Vid.', 'Vide.', 'Empty.'],
    ['Kont mwen', 'Mon compte', 'My account'],
    ['nouvo', 'nouveau', 'new'],
    ['Aparèy', 'Appareil', 'Device'],
    ['An liy', 'En ligne', 'Online'],

    // --- POS ---
    ['POS — Vann Tikè', 'POS — Vente de tickets', 'POS — Sell tickets'],
    ['Ou ka mete plizyè tiraj sou', 'Vous pouvez mettre plusieurs tirages sur', 'You can put several draws on'],
    ['menm fich la', 'la même fiche', 'the same slip'],
    ['Pa gen tiraj ouvè', 'Aucun tirage ouvert', 'No open draw'],
    ['Ajoute parye pou tiraj sa a', 'Ajouter un pari pour ce tirage', 'Add a bet for this draw'],
    ['Ajoute parye', 'Ajouter un pari', 'Add bet'],
    ['Fich la (tout tiraj)', 'La fiche (tous les tirages)', 'The slip (all draws)'],
    ['Finalize &amp; Enprime', 'Finaliser &amp; Imprimer', 'Finalize &amp; Print'],
    ['Finalize & Enprime', 'Finaliser & Imprimer', 'Finalize & Print'],
    ['Retire tiraj', 'Retirer le tirage', 'Remove draw'],
    ['Retire tout tiraj sa a', 'Retirer tout ce tirage', 'Remove this whole draw'],
    ['Apèsi fich la', 'Aperçu de la fiche', 'Slip preview'],
    ['Fèmen apèsi a', "Fermer l'aperçu", 'Close preview'],
    ['Fich la ap enprime otomatikman nan', "La fiche s'imprime automatiquement dans", 'The slip prints automatically in'],
    ['pou anile epi modifye.', 'pour annuler et modifier.', 'to cancel and edit.'],
    ['Nimewo parye a', 'Numéro du pari', 'Bet number'],
    ['Okenn parye ankò.', 'Aucun pari pour le moment.', 'No bets yet.'],
    ['Pa gen tikè.', 'Aucun ticket.', 'No tickets.'],
    ['Pa gen done.', 'Aucune donnée.', 'No data.'],
    ['Pa gen antre.', 'Aucune entrée.', 'No entries.'],
    ['Pa gen machin.', 'Aucune machine.', 'No machines.'],
    ['Klike pou wè plis detay', 'Cliquez pour voir plus de détails', 'Click to see more details'],
    ['Ou ka efase yon tikè pou kont ou pandan', 'Vous pouvez supprimer un ticket vous-même pendant', 'You can delete a ticket yourself within'],
    ['10 minit', '10 minutes', '10 minutes'],
    ['demann', 'demande', 'request'],
    ['ki ale bay Super Admin / Mini Super Admin.', 'qui est envoyée au Super Admin / Mini Super Admin.', 'that goes to the Super Admin / Mini Super Admin.'],
    ['Mande anilasyon', "Demander l'annulation", 'Request cancellation'],

    // --- Rapò ---
    ['Rapò', 'Rapport', 'Report'],
    ['Balans = Vant − Pou peye. Se pwòp fich ou yo uniquement.', 'Solde = Ventes − À payer. Uniquement vos propres fiches.', 'Balance = Sales − To pay. Only your own slips.'],
    ['Lavant pa lè', 'Ventes par heure', 'Sales per hour'],
    ['Repatisyon pa tiraj', 'Répartition par tirage', 'Breakdown by draw'],
    ['Fich jou a', 'Fiches du jour', "Today's slips"],
    ['Pa gen fich pou jou sa a.', 'Aucune fiche pour cette journée.', 'No slips for this day.'],
    ['Jounal Odit', "Journal d'audit", 'Audit log'],

    // --- Pwofil / kondisyon ---
    ['Pwofil konpayi — lekti uniquement', 'Profil de la compagnie — lecture seule', 'Company profile — read only'],
    ['Ou pa ka modifye', 'Vous ne pouvez pas modifier', 'You cannot edit'],
    ['Enfòmasyon konpayi', 'Informations de la compagnie', 'Company information'],
    ['Sa ou aksepte lè ou chwazi travay kòm ajan sou platfòm nan.',
      "Ce que vous acceptez en choisissant de travailler comme agent sur la plateforme.",
      'What you accept when you choose to work as an agent on the platform.'],
    ['1. Kondisyon itilizasyon', "1. Conditions d'utilisation", '1. Terms of use'],
    ['2. Konfidansyalite &amp; done', '2. Confidentialité &amp; données', '2. Privacy &amp; data'],
    ['3. Siveyans aktivite', '3. Surveillance des activités', '3. Activity monitoring'],
    ['4. Kijan pou itilize l', '4. Comment l’utiliser', '4. How to use it'],
    ['paj Legal sit la', 'la page Légal du site', "the site's Legal page"],

    // --- Login ---
    ['Koneksyon Ajan', 'Connexion Agent', 'Agent sign in'],
    ['Antre enfòmasyon w pou louvri POS la.', 'Entrez vos informations pour ouvrir le POS.', 'Enter your details to open the POS.'],
    ['Bliye modpas ou?', 'Mot de passe oublié ?', 'Forgot your password?'],
    ['Montre modpas', 'Afficher le mot de passe', 'Show password'],
    ['imel@egzanp.com', 'email@exemple.com', 'email@example.com'],

    // --- Mesaj ---
    ['Voye Mesaj', 'Envoyer un message', 'Send message'],
    ['Tout mesaj', 'Tous les messages', 'All messages'],
    ['Sèlman ki poko li', 'Uniquement non lus', 'Unread only'],
    ['Sa m voye', 'Ceux que j’ai envoyés', 'Sent by me'],
    ['Tout voyè', 'Tous les expéditeurs', 'All senders'],
    ['Pa gen mesaj ki matche.', 'Aucun message correspondant.', 'No matching messages.'],
    ['Make kòm li', 'Marquer comme lu', 'Mark as read'],
    ['Fenèt modifikasyon 5 min lan fèmen.', 'La fenêtre de modification de 5 min est fermée.', 'The 5-minute edit window is closed.'],
    ['Modifye mesaj la', 'Modifier le message', 'Edit message'],
    ['Konpayi destinatè', 'Compagnie destinataire', 'Recipient company'],
    ['Ajan destinatè', 'Agent destinataire', 'Recipient agent'],
    ['Chèche tit oswa kontni…', 'Rechercher un titre ou un contenu…', 'Search title or content…'],
    ['Filtre pa dat', 'Filtrer par date', 'Filter by date'],
    ['Gade done brit mesaj la', 'Voir les données brutes du message', 'View raw message data'],
    ['Done brit', 'Données brutes', 'Raw data'],

    // --- Kòbèy / siveyans ---
    ['Kòbèy', 'Corbeille', 'Trash'],
    ['Eleman efase yo rete la pou 30 jou.', 'Les éléments supprimés restent 30 jours.', 'Deleted items stay for 30 days.'],
    ['Siveyans machin', 'Surveillance des machines', 'Device monitoring'],
    ['Machin total', 'Machines au total', 'Total devices'],
    ['Dènye aktivite', 'Dernière activité', 'Last activity'],
  ];

  /* [Kreyòl, Français, English] */
  L.V34_PHRASES = [
    /* --- Navigasyon / kokiy --- */
    ['Tablo debò', 'Tableau de bord', 'Dashboard'],
    ['Paramèt', 'Paramètres', 'Settings'],
    ['Konfigirasyon', 'Configuration', 'Configuration'],
    ['Reglaj', 'Réglages', 'Settings'],
    ['Pwofil', 'Profil', 'Profile'],
    ['Kont mwen', 'Mon compte', 'My account'],
    ['Konekte', 'Se connecter', 'Sign in'],
    ['Dekonekte', 'Déconnexion', 'Sign out'],
    ['Kreye yon kont', 'Créer un compte', 'Create an account'],
    ['Modpas', 'Mot de passe', 'Password'],
    ['Imèl', 'E-mail', 'Email'],
    ['Telefòn', 'Téléphone', 'Phone'],
    ['Adrès', 'Adresse', 'Address'],
    ['Non', 'Nom', 'Name'],
    ['Konpayi', 'Compagnie', 'Company'],
    ['Sipèvizè', 'Superviseur', 'Supervisor'],
    ['Ajan yo', 'Agents', 'Agents'],
    ['Kontak', 'Contact', 'Contact'],
    ['Legal', 'Mentions légales', 'Legal'],
    ['Sipò', 'Support', 'Support'],
    ['Retounen', 'Retour', 'Back'],
    ['Fèmen', 'Fermer', 'Close'],
    ['Anile', 'Annuler', 'Cancel'],
    ['Konfime', 'Confirmer', 'Confirm'],
    ['Anrejistre', 'Enregistrer', 'Save'],
    ['Sove', 'Enregistrer', 'Save'],
    ['Ajoute', 'Ajouter', 'Add'],
    ['Modifye', 'Modifier', 'Edit'],
    ['Efase', 'Supprimer', 'Delete'],
    ['Chèche', 'Rechercher', 'Search'],
    ['Filtre', 'Filtrer', 'Filter'],
    ['Enprime', 'Imprimer', 'Print'],
    ['Telechaje', 'Télécharger', 'Download'],
    ['Voye', 'Envoyer', 'Send'],
    ['Voye mesaj', 'Envoyer un message', 'Send a message'],
    ['Nouvo mesaj', 'Nouveau message', 'New message'],
    ['Reponn', 'Répondre', 'Reply'],
    ['Kache', 'Masquer', 'Hide'],
    ['Remete', 'Restaurer', 'Restore'],
    ['Poubèl', 'Corbeille', 'Trash'],
    ['Poubèl mesaj', 'Corbeille des messages', 'Message trash'],
    ['Lis kontak', 'Liste de contacts', 'Contact list'],
    ['Pa gen konvèsasyon.', 'Aucune conversation.', 'No conversations.'],
    ['Pa gen mesaj ankò.', 'Aucun message pour le moment.', 'No messages yet.'],
    ['Ekri yon mesaj…', 'Écrivez un message…', 'Write a message…'],
    ['Mesaj la vid.', 'Le message est vide.', 'The message is empty.'],
    ['Mesaj voye', 'Message envoyé', 'Message sent'],
    ['Mesaj la pa rive', "Le message n'est pas parti", 'The message was not sent'],
    ['Poubèl la vid.', 'La corbeille est vide.', 'The trash is empty.'],
    ['modifye', 'modifié', 'edited'],
    ['Ou', 'Vous', 'You'],

    /* --- Lotri / jwèt --- */
    ['Fich', 'Fiche', 'Slip'],
    ['Fich la', 'La fiche', 'The slip'],
    ['Tikè', 'Ticket', 'Ticket'],
    ['Nimewo', 'Numéro', 'Number'],
    ['Kantite', 'Quantité', 'Quantity'],
    ['Montan', 'Montant', 'Amount'],
    ['Total', 'Total', 'Total'],
    ['Balans', 'Solde', 'Balance'],
    ['Vant', 'Ventes', 'Sales'],
    ['Gayan', 'Gagnant', 'Winner'],
    ['Gayan yo', 'Gagnants', 'Winners'],
    ['Peye gayan', 'Payer les gagnants', 'Pay winners'],
    ['Rezilta', 'Résultats', 'Results'],
    ['Boul', 'Boule', 'Ball'],
    ['Lotri', 'Loterie', 'Lottery'],
    ['Bòlèt', 'Borlette', 'Borlette'],
    ['Loto 3', 'Loto 3', 'Loto 3'],
    ['Maryaj', 'Mariage', 'Marriage'],
    ['Pozisyon', 'Position', 'Position'],
    ['Limit', 'Limite', 'Limit'],
    ['Peman', 'Paiement', 'Payment'],
    ['Fakti', 'Facture', 'Invoice'],
    ['Plan', 'Forfait', 'Plan'],
    ['Abònman', 'Abonnement', 'Subscription'],
    ['Rapò', 'Rapport', 'Report'],
    ['Rapò jounen', 'Rapport du jour', 'Daily report'],
    ['Sipèvizyon', 'Surveillance', 'Monitoring'],
    ['Istorik', 'Historique', 'History'],
    ['Aktif', 'Actif', 'Active'],
    ['Inaktif', 'Inactif', 'Inactive'],
    ['Bloke', 'Bloqué', 'Blocked'],
    ['An atant', 'En attente', 'Pending'],
    ['Apwouve', 'Approuvé', 'Approved'],
    ['Refize', 'Refusé', 'Rejected'],
    ['Peye', 'Payé', 'Paid'],
    ['Poko peye', 'Non payé', 'Unpaid'],
    ['Jodi a', "Aujourd'hui", 'Today'],
    ['Yè', 'Hier', 'Yesterday'],
    ['Semèn nan', 'Cette semaine', 'This week'],
    ['Mwa a', 'Ce mois', 'This month'],
    ['Depi', 'Du', 'From'],
    ['Jiska', 'Au', 'To'],

    /* --- Lang / reglaj lang --- */
    ['Lang', 'Langue', 'Language'],
    ['Lang mwen', 'Ma langue', 'My language'],
    ['Lang prefere', 'Langue préférée', 'Preferred language'],
    ['Lang sistèm', 'Langue du système', 'System language'],
    ['Lang jeneral', 'Langue générale', 'General language'],
    ['Lang fich', 'Langue de la fiche', 'Slip language'],
    ['Lang fich jeneral', 'Langue générale des fiches', 'General slip language'],
    ['Lang entèfas konpayi', "Langue de l'interface de la compagnie", 'Company interface language'],
    ['— Defo jeneral —', '— Défaut général —', '— General default —'],
    ['Lang chanje', 'Langue modifiée', 'Language changed'],
    ['Lang pa valab', 'Langue invalide', 'Invalid language'],

    /* --- Mesaj sistèm --- */
    ['Ap chaje…', 'Chargement…', 'Loading…'],
    ['Tanpri tann…', 'Veuillez patienter…', 'Please wait…'],
    ['Fini', 'Terminé', 'Done'],
    ['Siksè', 'Succès', 'Success'],
    ['Erè', 'Erreur', 'Error'],
    ['Atansyon', 'Attention', 'Warning'],
    ['Pa gen done', 'Aucune donnée', 'No data'],
    ['Pa gen anyen pou montre', 'Rien à afficher', 'Nothing to show'],
    ['Ou pa gen dwa fè sa', "Vous n'avez pas cette permission", 'You are not allowed to do this'],
    ['Ou pa konekte', 'Vous n’êtes pas connecté', 'You are not signed in'],
    ['Eseye ankò', 'Réessayer', 'Try again'],
    ['Ou sèten?', 'Êtes-vous sûr ?', 'Are you sure?'],
    ['Wi', 'Oui', 'Yes'],
    ['Non, mèsi', 'Non, merci', 'No, thanks'],
  ];

  // key -> { ht, fr, en }
  L.V33_DICT = {};
  // tèks Kreyòl nòmalize -> key
  L.V33_INDEX = {};

  L.normText = function (s) {
    return String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  };

  L.V33_PHRASES.forEach(([ht, fr, en]) => {
    const k = L.slugKey(ht);
    L.V33_DICT[k] = { ht, fr, en };
    L.V33_INDEX[L.normText(ht)] = k;
  });
})();
