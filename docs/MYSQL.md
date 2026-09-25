# Backend MySQL + synchronisation HTTP

## Configuration

MySQL 8.4 ou MariaDB compatible (XAMPP). Copier les noms de `.env.example` et configurer une URL `mysql://`. Les identifiants d’une ancienne base PostgreSQL ne sont pas réutilisables automatiquement. Démarrer MySQL avant `npm run dev`.

Docker : renseigner MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE et MYSQL_ROOT_PASSWORD, puis `docker compose up -d --build`. Le nouveau volume mysql_data est distinct des anciens volumes PostgreSQL, qui restent conservés. Ne jamais lancer `down -v` sur les données.

Base managée ou cPanel : utiliser la base déjà créée et DATABASE_AUTO_CREATE=false. Pour Aiven, DATABASE_SSL=true et DATABASE_SSL_CA contiennent la configuration TLS et le certificat CA. Ne jamais désactiver la vérification TLS.

Les migrations existantes restent compatibles avec l’ancienne base MySQL. Les anciens magasins sont conservés en tant que commerces dans le catalogue unifié. Aucune base réelle n’a été vidée pendant ce changement.

## Données PostgreSQL existantes

Le changement de pilote ne transporte pas les données. Sauvegarder PostgreSQL avant toute bascule. Exporter toutes les tables métier, comptes et sessions depuis PostgreSQL, importer dans une nouvelle base MySQL vide en excluant les colonnes générées des commandes, puis vérifier les relations, quantités, comptes, commandes et dates UTC. Ne changer l’URL de production qu’après cette validation. Les anciens outils PostgreSQL sont archivés et ne doivent pas être exécutés contre le pilote MySQL.

## Sauvegardes

`npm run db:backup` exporte un instantané logique complet chiffré dans `.data/sql-backups` ; BACKUP_ENCRYPTION_KEY est obligatoire. Ce format contient les tables et comptes, et n’est pas le format du restaurateur de catalogue `db:restore`. Pour une restauration serveur standard, prévoir également mysqldump et un test d’import dans une base distincte. Conserver la clé de chiffrement et les sauvegardes hors du serveur.

## Suivi des commandes

Aucune connexion WebSocket n’est nécessaire. Le web utilise les endpoints existants GET /api/v1/admin/state (auth Admin requise) et GET /api/v1/state (commandes limitées au client connecté). Les mises à jour sont visibles au prochain rafraîchissement périodique. Les endpoints d’écriture, cookies de session et contrôles d’accès sont conservés.

## Validation de cette modification

41 tests réussis sur une instance MariaDB temporaire isolée, notamment authentification, isolation entre clients, stock concurrent, idempotence, persistance après redémarrage, suivi HTTP et cycle de vie du polling. TypeScript et compilation statique de production validés ; lint sans erreur (7 avertissements préexistants). La CI est configurée sur MySQL 8.4 ; son exécution distante n’a pas été lancée. L’ancienne configuration locale MySQL a été rétablie depuis `.env.mysql-backup`, sans afficher ses secrets. Aucun déploiement distant ni transfert de données PostgreSQL n’a été effectué.
