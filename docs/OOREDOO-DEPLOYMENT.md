# Déploiement Ooredoo — MySQL

Pré-requis : Virtual Machine Linux avec accès SSH administrateur, ressources à dimensionner selon la charge, IPv4 publique, domaine et accès DNS. Un hébergement Web partagé MySQL ne suffit pas sans prise en charge explicite de Node et MySQL. Ce guide ne signifie pas qu’un serveur Ooredoo a été provisionné ou déployé.

1. Commander la VM après confirmation du devis, de la maintenance, des sauvegardes et des conditions d’engagement.
2. Installer Docker Engine et Compose via la documentation officielle correspondant à la distribution. Autoriser 80/443, restreindre SSH aux administrateurs, ne pas publier 3306 ni 3001.
3. Cloner le dépôt privé dans un dossier du serveur. Définir un enregistrement DNS A du domaine vers l’IPv4. Ajouter AAAA seulement si IPv6 est configuré.
4. Créer .env (chmod 600) avec MYSQL_USER, MYSQL_DATABASE, MYSQL_ROOT_PASSWORD et MYSQL_PASSWORD (aléatoires, hexadécimal pour éviter les caractères réservés dans l’URL), APP_DOMAIN, BACKUP_ENCRYPTION_KEY (64 caractères hexadécimaux), les identifiants publics Firebase et FIREBASE_ADMIN_CREDENTIALS_FILE (fichier de compte de service extérieur au dépôt, accès restreint). Configurer DATABASE_AUTO_CREATE=false.
5. Construire les images : `docker compose -f docker-compose.yml -f docker-compose.production.yml build`.
6. Démarrer uniquement la base : `docker compose -f docker-compose.yml -f docker-compose.production.yml up -d database`.
7. Restaurer le dump MySQL validé dans la base encore vide AVANT le démarrage du backend. Le dump et les secrets doivent être transférés par SSH, jamais placés dans public/. Vérifier la restauration et les comptes. Pour un nouveau catalogue, l’ajout de démonstration est une action distincte et explicite.
8. Démarrer : `docker compose -f docker-compose.yml -f docker-compose.production.yml up -d`. Caddy fournit HTTPS une fois le DNS et les ports accessibles.
9. Ajouter le domaine dans les domaines autorisés Firebase Authentication ; vérifier Google, email et liens de vérification/réinitialisation. Cette action demande l’accès à la console Firebase.
10. Tester https://DOMAINE/api/v1/health, /admin, catalogue et commande de test. Adapter l’URL API du mobile au domaine HTTPS, puis reconstruire le mobile.
11. Programmer mysqldump quotidien et copie externe, tester la restauration MySQL dans une base séparée. Configurer surveillance et mises à jour. Ne jamais exécuter docker compose down -v sur les données.

Aucun achat, accès serveur, modification DNS ou publication n’est effectué par ces fichiers. Les accès Ooredoo, DNS et Firebase doivent être disponibles pour achever le déploiement réel.

## Offre Advanced

Le remplacement des WebSockets par HTTP est terminé. Cette offre doit encore permettre un processus Node.js 24 persistant et le routage /api/v1 vers ce processus. PHP/MySQL seuls ne suffisent pas. Confirmer Node.js, accès aux variables secrètes, HTTPS et lancement automatique auprès du support avant achat. Aucun hébergement Ooredoo n’a été commandé ou configuré.
