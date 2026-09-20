# Activer Firebase Authentication pour Hadhri Delivery

Le code est intégré. Les connexions et les emails réels nécessitent un projet Firebase configuré. Le catalogue et les commandes restent dans la base actuelle ; Firebase gère uniquement l’identité et les mots de passe des clients.

## 1. Créer le projet et l’application Web

1. Ouvrir https://console.firebase.google.com/ et créer un projet sur l’offre Spark.
2. Ajouter une application Web avec le bouton `</>` et le nom « Hadhri Delivery ».
3. Dans les paramètres du projet, copier `projectId`, `apiKey`, `authDomain` et `appId` de la configuration Web.
4. À la racine du projet local, copier `.env.example` vers `.env` s’il n’existe pas, puis remplir :

```dotenv
FIREBASE_PROJECT_ID=identifiant-du-projet
FIREBASE_API_KEY=cle-web-firebase
FIREBASE_AUTH_DOMAIN=identifiant-du-projet.firebaseapp.com
FIREBASE_APP_ID=identifiant-application-web
```

Ces quatre valeurs identifient l’application Web et sont publiques. Aucun JSON de compte de service ni aucune clé privée n’est nécessaire pour la validation des jetons utilisée ici. Ne placez jamais un secret Facebook dans ces variables publiques.

## 2. Activer les fournisseurs

Dans Authentication > Sign-in method :

- Activer Email/Password. La connexion par lien sans mot de passe n’est pas nécessaire.
- Activer Google et sélectionner un email d’assistance.
- Pour Facebook, créer une application sur https://developers.facebook.com/, configurer Facebook Login, puis renseigner son App ID et son App Secret **dans Firebase Console uniquement**. Copier l’URL de redirection OAuth indiquée par Firebase dans la configuration Facebook. L’application Facebook doit être accessible au public pour permettre la connexion de clients autres que ses administrateurs/testeurs ; compléter les exigences Meta indiquées dans sa console.

Dans Authentication > Settings > Authorized domains, ajouter `localhost` et le domaine du site publié. Les nouveaux projets n’autorisent pas forcément localhost par défaut. Utiliser http://localhost:5173 pour le test local.

Configurer la politique de mot de passe Firebase avec une longueur minimale de 8 caractères. Le formulaire exige déjà ce minimum, mais la politique Firebase protège aussi les inscriptions effectuées directement auprès du service.

Dans Authentication > Templates, personnaliser le nom d’expéditeur et le modèle de vérification d’adresse. Conserver le gestionnaire de liens fourni par Firebase pour commencer. Firebase envoie lui-même ces emails : aucun SMTP n’est requis dans ce projet.

## 3. Redémarrer et tester réellement

Arrêter le serveur dans son terminal avec Ctrl+C, puis :

```bash
cd "/Users/apple/Hadhri Delivery"
npm run dev
```

Ouvrir http://localhost:5173 et sélectionner « Connexion / Inscription ».

1. Créer un compte avec une adresse que vous pouvez consulter.
2. Vérifier que le site affiche l’attente de confirmation. Le compte Firebase existe déjà mais aucun compte client local ni accès aux commandes n’est créé avant la validation de l’adresse.
3. Ouvrir le lien reçu dans la boîte mail, puis cliquer sur « J’ai confirmé mon email » dans le site.
4. Vérifier que la connexion fonctionne et passer une commande.
5. Tester le renvoi du lien et « Mot de passe oublié ».
6. Tester Google et Facebook avec vos propres comptes, puis la déconnexion et le retour après rechargement.

Un fournisseur non activé, une adresse locale non autorisée, une fenêtre popup bloquée ou un dépassement de quota produit un message d’erreur. L’application n’affiche « lien envoyé » que lorsque Firebase accepte l’envoi ; la réception dans la boîte doit être vérifiée séparément.

## Comptes existants et sessions

Les anciens comptes ne sont pas supprimés. Les anciens mots de passe locaux ne permettent plus de se connecter : le client s’inscrit auprès de Firebase avec la même adresse, puis la confirme. Son identité Firebase est alors associée au compte existant et à son historique. Deux identités Firebase différentes ne peuvent pas revendiquer le même compte. L’administration conserve sa connexion séparée.

Le backend valide la signature, le projet et l’expiration du jeton Firebase, exige une adresse confirmée et accepte uniquement email/mot de passe, Google ou Facebook. Les cookies de session sont HttpOnly et expirent au plus tard avec le jeton Firebase (une heure maximum). Le SDK renouvelle la session lors du renouvellement de son jeton. Les comptes suspendus dans l’administration ne peuvent pas commander.

Cette intégration vérifie les jetons sans interrogation de révocation auprès de Firebase. Une session déjà ouverte peut donc rester valide jusqu’à son expiration après une désactivation dans Firebase ; pour un blocage immédiat des commandes, suspendre aussi le client dans l’administration. Une vérification de révocation supplémentaire nécessiterait des identifiants serveur Firebase Admin.

## Spark : gratuit avec quotas

Google, Facebook et email/mot de passe font partie des méthodes disponibles sur Spark. Au 13 septembre 2026, Firebase annonce notamment 1 000 emails de vérification et 150 emails de réinitialisation de mot de passe par jour sur Spark. Les limites peuvent évoluer. La vérification d’adresse par lien et la connexion sans mot de passe par lien sont deux fonctions différentes avec des quotas distincts.

- Tarifs : https://firebase.google.com/pricing
- Limites : https://firebase.google.com/docs/auth/limits
- Google : https://firebase.google.com/docs/auth/web/google-signin
- Facebook : https://firebase.google.com/docs/auth/web/facebook-login
- Vérification email : https://firebase.google.com/docs/auth/web/manage-users

Les tests automatisés du backend utilisent des identités simulées dans une base temporaire. Ils n’envoient pas d’emails et ne remplacent pas le test Google/Facebook et boîte mail ci-dessus.
