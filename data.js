/* Textes éditoriaux du site (hors prix : ceux-ci viennent de catalogue.js). Chaque fait avancé ici est tiré de la page Planity,
   de la fiche Google ou de la page Facebook de l'institut (voir README.md, « D'où viennent les informations »). */
window.BD_DATA = {
  /* Univers de la page d'accueil : photo, cadrage et univers de la carte à ouvrir */
  univers: [
    { id: 'spa', num: '01', title: 'Spa & hammam', text: 'Sauna et hammam privatisés, seule ou en duo, avec un gommage, un modelage ou un enveloppement si l’on veut prolonger.', img: 'spa-sauna', pos: '58% 50%', open: 'spa' },
    { id: 'massages', num: '02', title: 'Massages & modelages', text: 'Pierres chaudes, serviettes chaudes, bougie, quatre mains : une heure, ou une heure et demie, rien que pour vous.', img: 'fb-massage-pieds-tablier-lotus', pos: '50% 40%', open: 'massages', fb: true },
    { id: 'visage', num: '03', title: 'Soins du visage', text: 'LPG et rituels My Spa, de l’éclat à la régénération cellulaire, avec compléments à la carte.', img: 'cabine-rose', pos: '30% 50%', open: 'visage' },
    { id: 'corps', num: '04', title: 'Soins du corps', text: 'LPG, gommages, enveloppements et voyages sensoriels : Dubaï santal ambré, hanami japonais.', img: 'bouddha', pos: '42% 50%', open: 'corps' },
    { id: 'ongles', num: '05', title: 'Mains & pieds', text: 'Gel, semi-permanent, manucure et beauté des pieds, avec Éva ou avec Marina.', img: 'fb-onglerie-au-travail', pos: '50% 35%', open: 'ongles', fb: true },
    { id: 'epilation', num: '06', title: 'Épilation & regard', text: 'Épilation femme et homme, lumière pulsée, teinture et rehaussement de cils, browlift.', img: 'fb-cintre-peignoir', pos: '50% 60%', open: 'epilation', fb: true }
  ],

  /* Galerie d'ongles (Facebook de l'institut) */
  ongles: [
    ['fb-ongles-orange', 'Ongles en dégradé orange, décorés d’un papillon et d’étoiles dorées'],
    ['fb-ongles-lait', 'Ongles amande en dégradé blanc laiteux'],
    ['fb-ongles-rouges', 'Ongles amande rouge profond'],
    ['fb-ongles-chocolat', 'Ongles chocolat et beige, touches de feuilles d’or'],
    ['fb-ongles-rose-jean', 'Ongles rose nude brillants'],
    ['fb-onglerie-vernis-rose', 'Application d’un vernis rose au pinceau fin'],
    ['fb-onglerie-chablons', 'Pose de chablons pour un rallongement en gel'],
    ['fb-onglerie-gant-uv', 'Séchage sous lampe UV']
  ],

  /* Questions fréquentes */
  faq: [
    { q: 'Comment réserver ?', a: 'En ligne, ici, à toute heure : choisissez vos soins, un créneau, puis réglez un acompte de 20 %. Votre rendez-vous arrive dans l’agenda de l’institut et un e-mail de confirmation vous est envoyé. Vous préférez la voix d’une personne ? Appelez le <a href="tel:+33766356921">07 66 35 69 21</a>.' },
    { q: 'Pourquoi un acompte ?', a: 'Il confirme votre créneau, qui est réservé rien que pour vous. L’acompte (20 % du total) est déduit du prix de vos soins ; le solde se règle à l’institut.' },
    { q: 'Puis-je annuler ou déplacer mon rendez-vous ?', a: 'Oui, sans frais jusqu’à <b>48 h</b> avant (24 h pour l’onglerie avec Éva). Passé ce délai, l’acompte reste acquis à l’institut.' },
    { q: 'Le sauna et le hammam sont-ils privatisés ?', a: 'Oui : l’accès se réserve pour 30 minutes ou 1 heure, seule ou en duo (« en DUO » dans la carte), et se combine avec un modelage, un gommage ou un enveloppement.' },
    { q: 'Éva ou Marina pour l’onglerie ?', a: 'Les deux posent le gel et le semi-permanent ; les tarifs diffèrent (voir le comparatif plus haut) et se réservent chacun avec la praticienne choisie.' },
    { q: 'Comment offrir un moment ?', a: 'Une carte cadeau d’un montant libre, valable 6 mois, se commande par téléphone : <a href="tel:+33766356921">07 66 35 69 21</a>. À noter : les bons cadeaux ne sont pas valables pour l’onglerie avec Éva (à réserver alors avec Marina).' },
    { q: 'Où se garer ?', a: 'L’institut se trouve en zone artisanale, avenue de Traversetolo, à Oraison. Des clientes mentionnent un grand parking à proximité.' },
    { q: 'Certaines prestations n’ont pas de bouton « + » ?', a: 'Les forfaits (lumière pulsée 5 + 1 offerte, 10 entrées de spa, séances de cure LPG…) se réservent par téléphone : ils figurent « sur appel » dans la carte.' }
  ]
};
