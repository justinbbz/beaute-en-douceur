/* Réglages du site Beauté en douceur : seul fichier à modifier pour brancher l'agenda et le paiement.
   Voir RESERVATION-AGENDA.md (agenda Google via Make) et worker/README.md (paiement Stripe).
   Les prix, durées, praticiennes et règles viennent de catalogue.js (généré) ; contrôle : node outils/verifier-prix.mjs */
window.BD_CONFIG = {
  /* true = démonstration : créneaux d'exemple, aucun paiement réel, aucune demande envoyée. */
  DEMO_MODE: true,

  /* Agenda (Make → Google Agenda). Contrat décrit dans RESERVATION-AGENDA.md. */
  BOOKING_WEBHOOK: '',      // reçoit le rendez-vous (POST JSON) et crée l'événement dans l'agenda de la praticienne
  AVAILABILITY_URL: '',     // renvoie les créneaux déjà pris (GET ?agenda=marina|eva&from=AAAA-MM-JJ&to=AAAA-MM-JJ)

  /* Paiement de l'acompte (20 %).
     'demo'   : simulation claire, aucune carte demandée (état actuel)
     'stripe' : redirection vers Stripe Checkout via le Worker Cloudflare (worker/checkout.js)
     'none'   : pas de paiement en ligne, la demande est envoyée à l'agenda et l'acompte se règle à l'institut */
  PAYMENT_MODE: 'demo',
  CHECKOUT_ENDPOINT: '',    // ex. https://beaute-en-douceur-paiement.<compte>.workers.dev/checkout

  /* Coordonnées */
  PHONE_DISPLAY: '07 66 35 69 21',
  PHONE_TEL: '+33766356921',
  INSTAGRAM: 'https://www.instagram.com/beaute_en_douceur/',
  INSTAGRAM_HANDLE: '@beaute_en_douceur',
  FACEBOOK: 'https://www.facebook.com/beauteendouceur.estheticienne',
  PLANITY: 'https://www.planity.com/beaute-en-douceur-04700-oraison-34n',
  BRAND: 'Beauté en douceur'
};
