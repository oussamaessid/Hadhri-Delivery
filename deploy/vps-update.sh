#!/bin/sh
# Pull the latest main and rebuild. Run on the VPS: sudo sh /opt/hadhri-delivery/deploy/vps-update.sh
set -eu
cd "$(dirname "$0")/.."
git pull --ff-only
[ -f db-ca.pem ] || : > db-ca.pem
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d --build
docker image prune -f
echo "Démarrage de l'application…"
for _ in $(seq 1 60); do
 if docker compose -f docker-compose.vps.yml --env-file .env.vps exec -T app wget -qO- http://127.0.0.1:10000/api/v1/health 2>/dev/null | grep -q '"ok"'; then
  echo "En ligne : https://$(grep '^APP_DOMAIN=' .env.vps | cut -d= -f2)"
  exit 0
 fi
 sleep 5
done
echo "L'application ne répond pas. Logs :"
docker compose -f docker-compose.vps.yml --env-file .env.vps logs --tail 50 app
exit 1
