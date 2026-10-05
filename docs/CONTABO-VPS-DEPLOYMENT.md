# Déploiement sur un VPS Contabo

Même installation que pour OVH (`docker-compose.vps.yml` + `deploy/vps-install.sh`) : l'application, sa propre base
MySQL vide (seul le compte Admin est créé à la première visite) et Caddy pour le HTTPS automatique.

## 1. Commander
- https://contabo.com > **Cloud VPS** : la plus petite offre suffit (≥ 4 Go de RAM).
- **Region** : European Union (Allemagne), la plus proche de la Tunisie.
- **Image** : **Ubuntu 24.04**.
- **Password** : choisir un mot de passe `root` solide (ou ajouter votre clé SSH).
- Contabo envoie ensuite par e-mail l'**adresse IP** du VPS (délai de quelques minutes à quelques heures).

Domaine (facultatif pour tester) : chez le registrar, créer deux enregistrements `A`
`hadhri-delivery.tn` et `www.hadhri-delivery.tn` → IP du VPS.

## 2. Préparer les valeurs
Le script demande le domaine, un e-mail pour le certificat HTTPS et les 4 valeurs Firebase (Firebase Console > Project settings) :
`FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_APP_ID`.
Les mots de passe MySQL et la clé de sauvegarde sont générés automatiquement dans `/opt/hadhri-delivery/.env.vps`.

## 3. Installer (une seule fois, ~10 minutes)
Depuis le Terminal du Mac (sur Contabo on se connecte directement en `root`) :
```sh
ssh root@IP_DU_VPS
curl -fsSL https://raw.githubusercontent.com/oussamaessid/Hadhri-Delivery/main/deploy/vps-install.sh -o vps-install.sh
sh vps-install.sh
```
Domaine vide = adresse de test `IP.sslip.io` (HTTPS inclus). À la fin, ouvrir l'adresse affichée et choisir le mot de
passe Admin (12 caractères minimum).

## 4. Firebase
Firebase Console > Authentication > Settings > **Authorized domains** : ajouter le domaine affiché par le script.

## Mettre à jour après un push sur `main`
```sh
ssh root@IP_DU_VPS
sh /opt/hadhri-delivery/deploy/vps-update.sh
```

## Passer du domaine de test au vrai domaine
```sh
nano /opt/hadhri-delivery/.env.vps   # APP_DOMAIN=hadhri-delivery.tn
sh /opt/hadhri-delivery/deploy/vps-update.sh
```
Puis ajouter le domaine dans Firebase.

## Utile
- Logs : `cd /opt/hadhri-delivery && docker compose -f docker-compose.vps.yml --env-file .env.vps logs -f`
- Santé : `https://DOMAINE/api/v1/health` répond `{"status":"ok",...}`
- Le pare-feu `ufw` (ports 22, 80, 443) est activé par le script ; rien à configurer dans le panneau Contabo.
- Le réseau Contabo bloque une partie des vérifications de Let's Encrypt : Caddy obtient alors le certificat chez
  ZeroSSL grâce à `ACME_EMAIL` (une minute environ après le démarrage).
- Garder une copie de `.env.vps` hors du serveur : `BACKUP_ENCRYPTION_KEY` est nécessaire pour relire les sauvegardes.
