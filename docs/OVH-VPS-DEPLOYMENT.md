# Déploiement sur un VPS OVH (VPS-1)

Même application que sur Render (`deploy/Dockerfile.render`), derrière Caddy qui gère le HTTPS automatiquement.
Le serveur ne s'endort jamais : plus d'écran d'attente.

## 1. Commander le VPS
- Offre **VPS-1** (2 vCores, 4 Go, 40 Go NVMe), durée **Sans engagement** pour un mois de test.
- Système : **Ubuntu 24.04**.
- Localisation : France (Gravelines ou Strasbourg), la plus proche de la Tunisie.
- OVH envoie par e-mail l'**adresse IP** et le mot de passe de l'utilisateur `ubuntu`.

## 2. Installer (une seule fois)
Depuis le Mac :
```sh
ssh ubuntu@IP_DU_VPS
sudo -i
curl -fsSL https://raw.githubusercontent.com/oussamaessid/Hadhri-Delivery/main/deploy/vps-install.sh -o vps-install.sh
sh vps-install.sh
```
Le script installe Docker, ouvre les ports 22/80/443, clone le projet dans `/opt/hadhri-delivery`
et crée `/opt/hadhri-delivery/.env.vps`.

## 3. Renseigner les variables
```sh
nano /opt/hadhri-delivery/.env.vps
```
Copier les **mêmes valeurs que sur Render** (Render > hadhri-delivery > Environment) :
`DATABASE_URL`, `DATABASE_SSL_CA`, `BACKUP_ENCRYPTION_KEY`, `FIREBASE_*`.

`APP_DOMAIN` est prérempli avec `IP-DU-VPS.sslip.io` : une adresse gratuite qui pointe vers le VPS
et reçoit un vrai certificat HTTPS. Remplacez-la par votre domaine plus tard.

## 4. Démarrer
```sh
cd /opt/hadhri-delivery && sh deploy/vps-update.sh
```
Le premier build prend quelques minutes. Le script affiche l'adresse du site.

## 5. Firebase
Firebase Console > Authentication > Settings > **Authorized domains** : ajouter la valeur de `APP_DOMAIN`,
sinon la connexion client ne fonctionne pas sur le VPS.

## Mettre à jour après un push sur `main`
```sh
ssh ubuntu@IP_DU_VPS
sudo sh /opt/hadhri-delivery/deploy/vps-update.sh
```

## Utile
- Logs : `cd /opt/hadhri-delivery && docker compose -f docker-compose.vps.yml logs -f app`
- Santé : `https://APP_DOMAIN/api/v1/health` doit répondre `{"status":"ok",...}`
- Passer à un vrai domaine : créer un enregistrement DNS `A` vers l'IP, changer `APP_DOMAIN`, relancer `vps-update.sh`,
  et ajouter le domaine dans Firebase.
