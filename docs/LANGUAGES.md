# Langues Hadhri Delivery

Arabe (`ar`) par défaut, direction RTL. Anglais (`en`) et français (`fr`) en LTR.

## Utilisation

Le sélecteur Language / اللغة / Langue apparaît en haut du site et du mobile. Le site mémorise le choix dans localStorage, Android dans SharedPreferences et iOS dans NSUserDefaults. Les identifiants, prix, stocks et le panier ne dépendent pas de la langue.

## Catalogue

Admin → Restaurants / Produits / Catégories / Rayons accueil → Modifier → Traductions. Saisir nom, description et détails dans les trois langues. Le nom principal reste la valeur historique, utilisée si une traduction manque. Les traductions explicites sont prioritaires sur le lexique initial et sur l’ancien nameArabic.

Les champs multilingues sont enregistrés dans les données JSON des tables existantes : aucune suppression ou recréation de produits. Au démarrage, le backend ajoute les traductions connues sans remplacer les traductions éditoriales. Les nouveaux textes inconnus doivent être traduits dans l’Admin ; ils ne sont pas envoyés à un service externe et leur valeur d’origine est conservée en attendant.

## API

`GET /api/v1/state?lang=ar`, `?lang=en`, `?lang=fr` et mêmes paramètres sur restaurants, produits, catégories et rayons. Sans langue valide : arabe. L’API Admin renvoie les données originales avec toutes les traductions pour éviter de remplacer les valeurs historiques lors des modifications.

Les noms de personnes, adresses saisies par les clients, identifiants de commande et marques sans traduction restent inchangés.

## Maintenance

`lib/i18n/messages.json` contient les textes d’interface et le lexique initial ; `patterns.json` traite les messages avec quantités. Le mobile possède le dictionnaire Kotlin correspondant dans `i18n/Language.kt`. Garder les deux catalogues synchronisés lors de l’ajout de textes.

Tests : `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`; Android : `./gradlew :app:androidApp:assembleDebug :app:shared:testAndroidHostTest`.
