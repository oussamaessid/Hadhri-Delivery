# Hadhri Delivery

Plateforme locale multi-restaurants et multi-magasins, avec catalogue de démonstration et commandes persistantes.

## Démarrer sur le Mac

Node.js 24 ou plus récent est requis. Depuis `/Users/apple/Hadhri Delivery` :

```bash
cd "/Users/apple/Hadhri Delivery"
npm install
npm run dev
```

- Client : http://localhost:5173/
- Admin : http://localhost:5173/admin
- Swagger : http://localhost:5173/api-docs
- Santé : http://localhost:5173/api/v1/health

Le premier accès Admin propose de choisir un mot de passe (8 caractères minimum). Il est haché avec scrypt. Les sessions utilisent des cookies HttpOnly et SameSite. Aucun mot de passe de démonstration n’est fourni. Ctrl+C arrête les deux serveurs.

## MySQL et suivi HTTP

Le backend utilise MySQL (pilote mysql2), compatible MariaDB/XAMPP. Les migrations SQL dans `backend/migrations` sont appliquées au démarrage. Les anciens fichiers PostgreSQL sont uniquement historiques.

Démarrer MySQL dans XAMPP, puis renseigner `DATABASE_URL=mysql://UTILISATEUR:MOT_DE_PASSE@127.0.0.1:3306/hadhri` dans `.env`. Encoder les caractères spéciaux du mot de passe dans l’URL. Une ancienne URL PostgreSQL est refusée explicitement ; aucune base PostgreSQL n’est effacée ou convertie automatiquement.

Le web et l’Admin n’utilisent plus WebSocket : synchronisation HTTPS toutes les 5 secondes dans l’Admin et 10 secondes côté client, pause si la page est cachée ou hors ligne, reprise au retour, temporisation en cas d’échec. Les alertes nouvelles commandes sont dédupliquées ; les anciennes commandes servent de référence au premier chargement. Le mobile utilisait déjà HTTP toutes les 15 secondes. Les notifications application fermée demandent un dispositif push distinct.

Voir [MYSQL.md](docs/MYSQL.md) et [OOREDOO-DEPLOYMENT.md](docs/OOREDOO-DEPLOYMENT.md).

## Docker

Renseigner `.env` à partir de `.env.example`, notamment MYSQL_PASSWORD et MYSQL_ROOT_PASSWORD, puis :

```bash
docker compose up -d --build
```

Site local : http://localhost:8080. Le volume `mysql_data` conserve les données. Ne jamais ajouter `-v` lors de l’arrêt. Pour la production avec HTTPS, suivre le guide Ooredoo.

## Parcours et limites

Recherche sur les noms des commerces, catégories et produits ; menu complet ou filtré ; panier avec plusieurs formats, quantités et disponibilité ; commande en espèces et historique de session ; Admin protégé avec gestion des ressources, statuts et livreurs. Les images du catalogue sont des illustrations d’ambiance et peuvent être remplacées depuis l’Admin. Le logo fourni est utilisé sans modification.

Les opérations réellement disponibles sont documentées et exécutables dans Swagger. L’ancien contrat de 109 opérations reste dans `api/planned-openapi.json`, sans prétendre que ces futures API sont implémentées.

Version de test locale : ville fixée à Monastir, adresse modifiable, pas encore de calcul de proximité GPS, de récupération de mot de passe client, paiement en ligne, SMS/push, carte de suivi temps réel ou livraison effective. Les promotions et zones de livraison détaillées restent à développer. Le serveur sérialise les écritures avec un verrou de révision ; pour une charge importante, ajouter pagination côté serveur et verrous par produit. Avant exposition publique : configurer HTTPS, cookies Secure, origine autorisée, sauvegardes, compte Admin et revue de déploiement.

## Vérifier

```bash
npm run lint
npm run typecheck
npm test
npm run docs:validate
npm run build
```

Les tests backend utilisent leur propre base temporaire : contrôle d’accès, confidentialité des commandes, formats/prix, concurrence du stock, idempotence et persistance après redémarrage.

## Comptes clients : Firebase
Le catalogue est public. Les clients se connectent avec Google, Facebook ou email/mot de passe. Firebase envoie un lien de vérification ; le backend exige une adresse confirmée avant de créer le client local et d’ouvrir une session autorisant les commandes. L’administration conserve sa connexion séparée. Les anciens comptes et leur historique sont conservés et associés à l’identité Firebase après confirmation de la même adresse.

**Activation nécessaire :** suivre [le guide Firebase](docs/FIREBASE.md), renseigner les quatre variables Firebase de `.env.example`, activer les fournisseurs dans Firebase Console et redémarrer le serveur. Sans configuration, les connexions sont indisponibles et le catalogue reste public.

Les tests backend simulent les identités Firebase ; un test réel des fournisseurs et de la réception des emails reste nécessaire après configuration.

## Rayons d’accueil avec images

L’accueil propose Restaurants, Boissons, Poissons, Fruits et légumes, Poulet et Fruits secs. Dans Admin > Rayons accueil, modifier un rayon permet de changer son image depuis la galerie ou par URL, son libellé, son ordre et son statut. Restaurants est lui aussi un enregistrement modifiable. Les photos JPEG se trouvent dans `public/images/departments/` et peuvent être remplacées par vos propres photos. Les crédits sont indiqués dans `public/images/departments/CREDITS.md`.

Au premier redémarrage après cette mise à jour, `seedShopping` remplace une seule fois les anciens rayons. Les produits et commandes sont conservés ; les catégories des anciens rayons sont détachées, et les catégories identifiables comme Boissons sont associées au nouveau rayon correspondant. Dans Admin > Catégories, sélectionner un rayon d’accueil pour y afficher ses produits. Aucun produit de poisson, volaille ou autre n’est inventé lors de cette mise à jour. Les changements ultérieurs de l’Admin ne sont pas écrasés au redémarrage.

API publique : `GET /api/v1/departments` et `GET /api/v1/departments/{id}`. Les modifications et images passent par l’API Admin existante et sont persistées dans la table `departments`.
