#!/bin/sh
# Pull the latest main and rebuild. Run from the project folder on the VPS: sh deploy/vps-update.sh
set -eu
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d --build
docker image prune -f
domain=$(grep '^APP_DOMAIN=' .env.vps | cut -d= -f2)
echo "En ligne : https://$domain"
