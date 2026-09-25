> HISTORIQUE : le backend actif utilise maintenant MySQL. Ne pas appliquer ces anciennes instructions ; consulter MYSQL.md.

# Migration MySQL vers PostgreSQL

La source MySQL est conservée. Le pilote mysql2 ne sert plus qu’au transfert ponctuel ; le backend utilise pg. Firebase conserve les identités et mots de passe Google/email. Les profils locaux, commandes, compte Admin, sessions et catalogue sont transférés dans PostgreSQL.

1. Arrêter les écritures du backend avant le transfert final pour éviter de nouvelles commandes sur MySQL.
2. Démarrer PostgreSQL : `npm run db:local` (Mac, `.env.postgres-local`) ou PostgreSQL 18 via Docker.
3. Définir `DATABASE_URL` pour une base PostgreSQL vide et `MYSQL_SOURCE_URL` pour la source MySQL, dans un fichier privé ou l’environnement. Ne pas copier ces secrets dans Git ou les logs.
4. Lancer `node backend/migrate-mysql.mjs` avec cet environnement. Le script sauvegarde toutes les tables applicatives dans `.data/migration-backups` (permissions 0600), importe en une transaction et compare toutes les lignes. Il refuse toute cible contenant des données.
5. Seulement après succès, configurer `.env` avec PostgreSQL puis lancer `npm run backend`. Conserver la configuration MySQL de secours dans un fichier privé.
6. Lancer `npm run db:seed-catalog` pour compléter le catalogue de démonstration. Les identifiants existants ne sont pas remplacés. Ne pas présenter ces exemples comme des commerces partenaires réels sans validation.
7. Exécuter `npm test`, tester /api/v1/health, connexion Admin, Firebase, catalogue, panier, commandes et WebSocket. Vérifier un redémarrage.

Les anciens snapshots JSON ne contiennent pas les comptes et sessions : ils ne remplacent pas une sauvegarde SQL complète. Utiliser `npm run db:backup` avec pg_dump 18 installé (ou PG_DUMP_BIN), puis stocker une copie chiffrée hors serveur. Pour restaurer, créer une nouvelle base vide et exécuter pg_restore --no-owner --dbname=BASE le-fichier.dump avec les variables PGHOST/PGUSER/PGPASSWORD appropriées, puis vérifier les données avant bascule. Le script dropDatabase refuse les bases autres que les bases de test hadhri_test_.

En cas d’échec avant bascule, continuer à utiliser MySQL sans le modifier. Après de nouvelles commandes dans PostgreSQL, ne pas revenir à MySQL sans réconcilier les données.
