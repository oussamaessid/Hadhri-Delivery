# Images permanentes sur VPS

Le service app utilise `MEDIA_DIR=/app/.data/media`, dans le volume Docker `app_data`.
Ne pas exécuter `docker compose down -v` : cela supprimerait les volumes, y compris MySQL.

Chaque photo envoyée par un administrateur est décodée et convertie en WebP (720 px maximum,
transparence conservée). Les fichiers sont nommés par empreinte SHA-256. Les originaux privés
sont conservés pour récupération. Les seules adresses publiques sont `/api/v1/uploads/<hash>.webp`.
Une modification du texte ou du prix ne renvoie pas le fichier. Les fichiers publics ont un cache
immutable d'un an. La base stocke seulement l'adresse. Le plafond collectif de 20 Mo est supprimé ;
la taille d'une image envoyée reste limitée et la capacité du disque doit être surveillée.

## Migration

Au démarrage, une sauvegarde précède la migration des images intégrées. Chaque fichier est écrit
avant de remplacer la valeur correspondante dans une transaction MySQL. La migration est répétable ;
les données devenues différentes entre-temps ne sont pas écrasées. Les images anciennes invalides
restent inchangées et sont comptées dans `skipped` dans les journaux.

Les fichiers ne sont pas supprimés automatiquement lors de la suppression d'un produit : cela
préserve les sauvegardes et les anciennes adresses mises en cache. Un nettoyage futur devra tenir
compte des sauvegardes à conserver. Surveiller `df -h` et la taille du volume app_data.

## Sauvegardes

Les sauvegardes horaires du catalogue embarquent les WebP référencés dans `__mediaFiles`, avant
chiffrement. `backend/restore-db.mjs` restaure ces fichiers avant les lignes. Définir le même MEDIA_DIR
à la restauration. Le script `scripts/backup-mysql.mjs` inclut également `mediaFiles` dans son export
complet des tables ; ce format complet est distinct du format de restauration du catalogue.
Conserver la clé BACKUP_ENCRYPTION_KEY séparément et copier les sauvegardes hors du VPS.
Une copie sur le même VPS ne protège pas d'une perte du serveur. Les originaux privés peuvent
être sauvegardés avec le volume complet ; ils ne sont pas nécessaires à l'affichage restauré.

## Vérification

`node --test tests/image-store.test.mjs tests/image-upload.test.mjs` vérifie 600 images distinctes,
la déduplication, la transparence, la sauvegarde/restauration et Safari.
`tests/admin-crud-api.test.mjs` nécessite MySQL et utilise une base temporaire dédiée ; il vérifie
600 produits, ajout/modification/suppression, URL compacte, migration et redémarrage idempotent.
Les mesures de cette base isolée ne sont pas une garantie de latence sur un réseau mobile.
