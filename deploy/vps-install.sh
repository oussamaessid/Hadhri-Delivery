#!/bin/sh
# First install on a fresh Ubuntu VPS. Run as root: sh vps-install.sh
set -eu
REPO=https://github.com/oussamaessid/Hadhri-Delivery.git
DIR=/opt/hadhri-delivery

apt-get update
apt-get install -y ca-certificates curl git ufw docker.io docker-compose-v2
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
 cat > .env.vps <<ENV
# Without a domain yet, sslip.io maps this name to the VPS IP and still gets a real HTTPS certificate.
APP_DOMAIN=$(echo "$ip" | tr . -).sslip.io
SEED_DEMO_DATA=false
DATABASE_AUTO_CREATE=false
DATABASE_SSL=true
DATABASE_URL=
DATABASE_SSL_CA=
BACKUP_ENCRYPTION_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_APP_ID=
ENV
 chmod 600 .env.vps
 echo
 echo "Fill in $DIR/.env.vps (same values as on Render), then run: sh deploy/vps-update.sh"
 exit 0
fi

sh deploy/vps-update.sh
