# Render + Aiven — préparation pour les tests

Les fichiers render.yaml et deploy/Dockerfile.render préparent un seul service gratuit : nginx sert le site compilé et transmet /api vers Node.js. WebSocket utilise le même domaine. Aucune donnée de démonstration n’est ajoutée à une nouvelle base.

Le compte GitHub doit être connecté pour créer le dépôt privé. Aucun dépôt distant, service Render ou service Aiven n’a été créé par cette préparation. Ne pas inclure .env, .data, fichiers de compte de service Firebase ou clés privées dans le dépôt.

Dans Aiven, choisir MySQL Free (pas un essai payant), puis utiliser la base fournie. DATABASE_AUTO_CREATE=false évite de demander les droits CREATE DATABASE. DATABASE_SSL=true et DATABASE_SSL_CA (contenu PEM du certificat Aiven) activent la vérification TLS. Renseigner DATABASE_URL uniquement dans Render.

Renseigner aussi APP_ORIGIN avec l’URL HTTPS Render, les quatre paramètres publics Firebase et BACKUP_ENCRYPTION_KEY avec une clé aléatoire de 32 octets encodée en hexadécimal. Ajouter le domaine Render aux domaines autorisés Firebase. Si des credentials Firebase Admin sont nécessaires, utiliser un fichier secret Render avec GOOGLE_APPLICATION_CREDENTIALS, jamais le dépôt.

Les fichiers locaux Render sont éphémères : les sauvegardes locales du conteneur ne constituent PAS une sauvegarde durable. La base Aiven est séparée ; prévoir des sauvegardes externes. Le plan gratuit peut mettre le backend en veille.

Vérifié : syntaxe du module database.mjs et du script de démarrage. Construction Docker et connexion TLS Aiven non vérifiées tant que les comptes et le moteur Docker ne sont pas disponibles. La compatibilité de toutes les migrations avec le MySQL Aiven devra être testée avant import. Aucun nettoyage de base n’est exécuté par ces fichiers.
