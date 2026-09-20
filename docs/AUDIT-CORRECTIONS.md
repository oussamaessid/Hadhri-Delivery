# Corrections de l’audit — 19 septembre 2026

Appliqué : Next 16.3.5 et ws 8.21.3, validation stricte du catalogue avec champs existants autorisés, quota global des images base64 de 20 Mo, export CSV neutralisé, comparaison des mots de passe robuste, cookies analysés au premier signe égal, durée Admin de 24 h, limite Admin persistante partagée de 20 tentatives / 10 minutes, taille WebSocket limitée, contrôle MySQL sur /health, polling ralenti et suspendu en arrière-plan, backend Docker non-root et Node 24, copie du dossier lib nécessaire au backend, en-têtes anti-iframe/CSP minimal, CI, bordure Description.

La limitation Admin s’applique au compte unique, indépendamment de l’IP du proxy. Un attaquant peut provoquer un verrouillage temporaire ; une restriction réseau Admin / 2FA reste recommandée avant une exposition large.

## Production

Le lancement local reste inchangé. Pour le serveur public, renseigner APP_DOMAIN (DNS pointant vers le serveur), MYSQL_PASSWORD, les paramètres Firebase existants, FIREBASE_ADMIN_CREDENTIALS_FILE (fichier de compte de service extérieur au dépôt) et BACKUP_ENCRYPTION_KEY (32 octets aléatoires encodés en 64 caractères hexadécimaux, conservés dans un gestionnaire de secrets).

```sh
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

Caddy termine HTTPS et renouvelle les certificats ; ouvrir les ports 80/443. Les cookies deviennent Secure, Swagger est bloqué au proxy public, HSTS est envoyé. La clé Firebase est montée en secret Docker. Ne pas exposer le port interne Admin ni le backend directement.

Documentation : https://caddyserver.com/docs/automatic-https et https://firebase.google.com/docs/auth/admin/verify-id-tokens.

## Sauvegardes

Les nouvelles sauvegardes sont chiffrées AES-256-GCM lorsque la clé est configurée, obligatoirement en production. Les anciens fichiers restent inchangés. Rétention actuelle : 10 sauvegardes horaires. Le volume Docker conserve les fichiers lors du remplacement du conteneur. La commande db:restore accepte les formats ancien et chiffré (même clé requise). Restaurer d’abord dans une base jetable via DATABASE_URL ; ne jamais tester sur la base active.

Attention : les snapshots contiennent le catalogue et les commandes, pas toutes les tables d’authentification. Pour une reprise complète, ajouter une sauvegarde SQL chiffrée avec une copie hors hôte. Aucune destination hors site n’a été configurée dans cette intervention.

## Validation et limites

23 tests indépendants de MySQL réussis, dont chiffrement/déchiffrement et altération des sauvegardes. Typecheck, compilation Vinext et export statique Next.js utilisé par Docker réussis. Lint : 0 erreur, 6 avertissements existants. Configuration Compose vérifiée. Les tests d’intégration échouent actuellement car MySQL local est arrêté (ECONNREFUSED 127.0.0.1:3306). Docker est également arrêté : images, HTTPS et restauration SQL complète non validés. La CI est ajoutée mais non exécutée sur GitHub.

Le catalogue utilise encore des snapshots complets : pagination SQL et cache restent à réaliser. Les listes acceptent désormais limit (1 à 100) et offset, sans modifier la réponse des anciens clients. Le stockage objet, monitoring externe, copie hors site et nettoyage des anciens dossiers restent à réaliser. Aucun dossier historique de données n’a été supprimé. Ne pas considérer ce rapport comme une validation de mise en production.

## Éléments historiques

`api/planned-openapi.json` et `db/` sont des éléments historiques, pas la référence du backend MySQL exécuté. Les fichiers d’internationalisation peuvent encore être importés : leur suppression requiert une migration dédiée. Le saut de numérotation des migrations ne justifie pas de renuméroter celles déjà appliquées. Les anciens dossiers `.data/postgres` sont conservés tant que leur contenu et leur utilité ne sont pas validés.

## Dépendances — résultat final

Après mises à jour compatibles (dont React, Vinext, Vite et Cloudflare) : **0 vulnérabilité élevée, 0 critique ; 6 modérées** signalées par npm audit. Les modérées concernent les chaînes drizzle-kit/esbuild et gaxios/uuid. La rétrogradation majeure proposée pour drizzle-kit n’a pas été appliquée. Le pipeline bloque les nouvelles vulnérabilités élevées/critiques.
