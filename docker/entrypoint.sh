#!/bin/sh
set -eu
umask 077

if [ -z "${SESSION_SECRET:-}" ] || [ "${SESSION_SECRET}" = "change-me-to-a-long-random-string" ]; then
  echo "SESSION_SECRET must be set to a unique random value." >&2
  exit 1
fi
if [ "${#SESSION_SECRET}" -lt 32 ]; then
  echo "SESSION_SECRET must contain at least 32 characters." >&2
  exit 1
fi

node /app/docker/init-data.mjs

# Keep the bootstrap password out of the application process environment.
unset ADMIN_PASSWORD
unset ADMIN_EMAIL
exec node /app/server.js
