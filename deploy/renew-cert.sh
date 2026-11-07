#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
docker compose --profile tls run --rm certbot renew --quiet
docker compose exec -T nginx nginx -s reload
