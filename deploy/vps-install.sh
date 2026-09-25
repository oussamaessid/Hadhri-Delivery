#!/bin/sh
# First install on a fresh Ubuntu VPS. Run as root: sh vps-install.sh
# Asks for the settings once (copy them from Render > hadhri-delivery > Environment), then starts the site.
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
 database_url=$(ask "DATABASE_URL (copié depuis Render) :")
 backup_key=$(ask "BACKUP_ENCRYPTION_KEY (copié depuis Render, vide = nouvelle clé) :")
 [ -n "$backup_key" ] || backup_key=$(openssl rand -hex 32)
 firebase_project=$(ask "FIREBASE_PROJECT_ID :")
 firebase_key=$(ask "FIREBASE_API_KEY :")
 firebase_domain=$(ask "FIREBASE_AUTH_DOMAIN :")
 firebase_app=$(ask "FIREBASE_APP_ID :")
 echo "DATABASE_SSL_CA : collez le certificat (-----BEGIN ... END-----) puis Entrée et Ctrl+D. S'il n'y en a pas sur Render, faites juste Ctrl+D :" >/dev/tty
 cat </dev/tty > db-ca.pem
 chmod 600 db-ca.pem
 umask 077
 cat > .env.vps <<ENV
APP_DOMAIN=$domain
SEED_DEMO_DATA=false
DATABASE_AUTO_CREATE=false
DATABASE_SSL=true
DATABASE_URL=$database_url
BACKUP_ENCRYPTION_KEY=$backup_key
FIREBASE_PROJECT_ID=$firebase_project
FIREBASE_API_KEY=$firebase_key
FIREBASE_AUTH_DOMAIN=$firebase_domain
FIREBASE_APP_ID=$firebase_app
ENV
fi
[ -f db-ca.pem ] || : > db-ca.pem

sh deploy/vps-update.sh
domain=$(grep '^APP_DOMAIN=' .env.vps | cut -d= -f2)
echo
echo "Dernière étape : Firebase Console > Authentication > Settings > Authorized domains > ajouter $domain"
case "$domain" in *.sslip.io) ;; *) echo "DNS : enregistrements A pour $domain et www.$domain vers $(curl -4 -s https://api.ipify.org)";; esac
