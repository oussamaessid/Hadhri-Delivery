#!/bin/sh
# First install on a fresh Ubuntu VPS. Run as root: sh vps-install.sh
# Asks for the Firebase settings once, then starts the site on its own empty MySQL database (admin account only).
set -eu
REPO=https://github.com/oussamaessid/Hadhri-Delivery.git
DIR=/opt/hadhri-delivery

ask() { printf '%s\n> ' "$1" >/dev/tty; read -r value </dev/tty; printf '%s' "$value"; }

apt-get update
apt-get install -y ca-certificates curl git ufw openssl docker.io docker-compose-v2
systemctl enable --now docker

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# A small swap file keeps the Next.js build from running out of memory on 4 GB.
if [ ! -f /swapfile ]; then
 fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
 echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone "$REPO" "$DIR"; fi
cd "$DIR"

if [ ! -f .env.vps ]; then
 ip=$(curl -4 -s https://api.ipify.org)
 echo
 echo "=== Configuration Hadhri Delivery (IP du serveur : $ip) ==="
 domain=$(ask "Nom de domaine (ex: hadhri-delivery.tn). Laissez vide pour tester sans domaine :")
 [ -n "$domain" ] || domain="$(echo "$ip" | tr . -).sslip.io"
 email=$(ask "E-mail pour le certificat HTTPS :")
 firebase_project=$(ask "FIREBASE_PROJECT_ID :")
 firebase_key=$(ask "FIREBASE_API_KEY :")
 firebase_domain=$(ask "FIREBASE_AUTH_DOMAIN :")
 firebase_app=$(ask "FIREBASE_APP_ID :")
 umask 077
 cat > .env.vps <<ENV
APP_DOMAIN=$domain
ACME_EMAIL=$email
SEED_DEMO_DATA=false
SEED_DEPARTMENTS=false
MYSQL_PASSWORD=$(openssl rand -hex 24)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
BACKUP_ENCRYPTION_KEY=$(openssl rand -hex 32)
FIREBASE_PROJECT_ID=$firebase_project
FIREBASE_API_KEY=$firebase_key
FIREBASE_AUTH_DOMAIN=$firebase_domain
FIREBASE_APP_ID=$firebase_app
ENV
fi
sh deploy/vps-update.sh
domain=$(grep '^APP_DOMAIN=' .env.vps | cut -d= -f2)
echo
echo "Ouvrez https://$domain/ et choisissez le mot de passe administrateur (12 caractères minimum)."
echo "Dernière étape : Firebase Console > Authentication > Settings > Authorized domains > ajouter $domain"
case "$domain" in *.sslip.io) ;; *) echo "DNS : enregistrements A pour $domain et www.$domain vers $(curl -4 -s https://api.ipify.org)";; esac
