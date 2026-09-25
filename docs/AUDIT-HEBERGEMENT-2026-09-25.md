# Vérification du 25 septembre 2026

## Résultats et limites

- TypeScript : validé.
- Compilation de production Next.js avec export statique : réussie.
- ESLint : aucune erreur, 7 avertissements.
- Tests : 35 réussis sur 39. Les 4 tests d’intégration échouent faute de PostgreSQL sur 127.0.0.1:5433. Le démarrage de PostgreSQL embarqué est bloqué par les permissions de mémoire partagée de l’environnement de vérification. Cela ne valide ni n’invalide les scénarios métier concernés.
- De nombreuses modifications préexistantes sont non commitées ; elles n’ont pas été publiées pendant cet audit.
- Ce contrôle ne constitue pas une validation exhaustive Android/iOS, paiement, authentification réelle ou production.

## Bloquants de déploiement

1. Le backend local exige désormais PostgreSQL. Le déploiement Render précédemment configuré utilise MySQL Aiven. Ne pas publier cette migration avant sauvegarde, restauration/migration testée et configuration PostgreSQL de destination.
2. L’offre Ooredoo Advanced annonce PHP/cPanel/MySQL, mais sa page publique ne confirme pas Node.js et PostgreSQL : https://host.ooredoo.tn/hebergement . Faire confirmer ces deux capacités ou choisir une VM Ooredoo. Le remplacement des WebSockets ne change pas ces besoins.
3. Le mobile utilise encore http://127.0.0.1:3001/api/v1 et http://127.0.0.1:5173 pour les images. Une version distribuée doit utiliser l’URL HTTPS finale. Valider Android et iOS sur un réseau extérieur.

## Alternative aux WebSockets

Option proposée : requêtes HTTPS périodiques (polling) pour le web et l’Admin. Le mobile interroge déjà les commandes toutes les 15 secondes.

- Admin : consulter les commandes toutes les 5 à 10 secondes lorsque l’écran est visible.
- Client : consulter ses commandes toutes les 10 à 15 secondes ; autorisation côté serveur conservée.
- Pas de requêtes simultanées ; annuler à la fermeture de l’écran ; suspendre en arrière-plan ; reprise immédiate au retour et après reconnexion.
- Dédupliquer les alertes par identifiant ; ne pas sonner pour toutes les commandes anciennes au premier chargement ; comparer les statuts pour signaler les changements.
- Réduire la fréquence en cas d’erreur. Ne pas relancer automatiquement une création de commande sans sa clé d’idempotence.
- Les notifications quand l’application est fermée nécessitent un dispositif push distinct ; le polling ne les remplace pas.

Cette option n’a pas été implémentée pendant l’audit. Elle évite le besoin de connexions WebSocket permanentes, au prix d’un délai de quelques secondes et de requêtes supplémentaires.

## Validation avant mise en ligne

Exécuter les 39 tests avec PostgreSQL disponible, compiler le web, tester la restauration d’une sauvegarde, puis vérifier création de compte Firebase, accès Admin, catalogue, commande, stock concurrent, suivi et isolation des comptes. Tester ensuite les builds Android/iOS avec la destination HTTPS. Aucun achat ou déploiement Ooredoo n’a été effectué.
