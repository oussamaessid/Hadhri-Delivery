# Déploiement sur un VPS OVH (VPS-1)

Même application que sur Render (`deploy/Dockerfile.render`), derrière Caddy qui gère le HTTPS automatiquement
(`domaine` et `www.domaine`). Le serveur ne s'endort jamais : plus d'écran d'attente.

## 1. Payer
- **VPS OVH** : offre **VPS-1**, durée **Sans engagement**, système **Ubuntu 24.04**, datacenter en France.
  OVH envoie par e-mail l'**adresse IP** et le mot de passe de l'utilisateur `ubuntu`.
- **Domaine** (facultatif pour tester) : `hadhri-delivery.tn` chez un registrar agréé ATI (https://www.registre.tn).
  Dans sa zone DNS, créer deux enregistrements `A` : `hadhri-delivery.tn` et `www.hadhri-delivery.tn` → IP du VPS.

## 2. Préparer les valeurs
Ouvrir Render > hadhri-delivery > **Environment** et garder la page ouverte : le script demande
`DATABASE_URL`, `BACKUP_ENCRYPTION_KEY`, les 4 `FIREBASE_*` et `DATABASE_SSL_CA` (s'il existe).
Si la base MySQL filtre les adresses IP, autoriser l'IP du VPS chez l'hébergeur de la base.

## 3. Installer (une seule fois, ~10 minutes)
Depuis le Terminal du Mac :
```sh
ssh ubuntu@IP_DU_VPS
sudo -i
curl -fsSL https://raw.githubusercontent.com/oussamaessid/Hadhri-Delivery/main/deploy/vps-install.sh -o vps-install.sh
sh vps-install.sh
```
Répondre aux questions en collant les valeurs. Domaine vide = adresse de test `IP.sslip.io` (HTTPS inclus).
À la fin, le script affiche l'adresse du site.

## 4. Firebase
Firebase Console > Authentication > Settings > **Authorized domains** : ajouter le domaine affiché par le script.

## Mettre à jour après un push sur `main`
```sh
ssh ubuntu@IP_DU_VPS
sudo sh /opt/hadhri-delivery/deploy/vps-update.sh
```

## Passer du domaine de test au vrai domaine
```sh
sudo nano /opt/hadhri-delivery/.env.vps   # APP_DOMAIN=hadhri-delivery.tn
sudo sh /opt/hadhri-delivery/deploy/vps-update.sh
```
Puis ajouter le domaine dans Firebase.

## Utile
- Logs : `cd /opt/hadhri-delivery && docker compose -f docker-compose.vps.yml --env-file .env.vps logs -f`
- Santé : `https://DOMAINE/api/v1/health` répond `{"status":"ok",...}`
