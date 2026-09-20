# Oracle Cloud — préparation

Déploiement prévu : VM Ubuntu ARM Ampere A1, Docker Compose, Caddy HTTPS, API Node.js et MySQL/MariaDB. Aucun serveur Oracle n’a encore été connecté ni déployé depuis cette session.

Utiliser uniquement les ressources marquées Always Free et vérifier les quotas affichés dans le compte avant création. Le domaine doit pointer vers la VM. Les clés SSH privées et Firebase restent dans des fichiers privés, jamais dans le dépôt ni dans la conversation.

Le fichier docker-compose.production.yml définit SEED_DEMO_DATA=false : une nouvelle base démarre sans restaurants, produits, rayons, clients ou commandes de démonstration. Les données d’une base existante ne sont pas supprimées par ce réglage. La ligne technique app_state/settings est nécessaire au fonctionnement ; les migrations et sessions peuvent également créer des lignes techniques.

Avant toute réinitialisation d’une base existante : identifier l’hôte et le nom de base, sauvegarder, puis arrêter le backend. La base locale n’est pas implicitement la cible du déploiement Oracle. Supprimer des utilisateurs MySQL ne supprime pas leurs identités dans Firebase Authentication.

Préparation restante : compte Oracle connecté, VM et accès SSH, domaine DNS, secrets de production, construction et validation ARM, vérification HTTPS et parcours connexion/commande. La configuration existante est décrite dans AUDIT-CORRECTIONS.md.
