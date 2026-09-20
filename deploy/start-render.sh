#!/bin/sh
set -eu
node backend/server.mjs &
backend_pid=$!
nginx -g 'daemon off; pid /tmp/nginx.pid;' &
nginx_pid=$!
trap 'kill "$backend_pid" "$nginx_pid" 2>/dev/null || true' EXIT
trap 'exit 0' TERM INT
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null; do sleep 2; done
exit 1
