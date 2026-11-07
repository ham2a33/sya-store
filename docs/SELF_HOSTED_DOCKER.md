# SYA Store self-hosted Docker deployment

This is infrastructure preparation only. The app still reads and writes JSON. PostgreSQL starts with persistent storage but the app does not connect to it until the separate migration is implemented and verified.

## Server and access

Suggested starting server: supported 64-bit Ubuntu LTS or Debian stable, 2 vCPU, 4 GB RAM, and 30 GB SSD. Connect using an SSH key:

```sh
ssh -i ~/.ssh/your_server_key deploy@PUBLIC_IP
```

Create a non-root deployment account with sudo access, restrict SSH ingress to trusted source IPs, and do not expose Docker's TCP API. Membership in the `docker` group grants root-equivalent host access.

Install Docker Engine and the Compose plugin from Docker's official repository, following the host-specific instructions: [Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [Debian](https://docs.docker.com/engine/install/debian/), [Fedora](https://docs.docker.com/engine/install/fedora/), [other distributions](https://docs.docker.com/engine/install/). Docker-published ports can bypass uncomplicated firewall rules on some systems; verify firewall behavior and add appropriate Docker forwarding rules. Permit inbound SSH, TCP 80, and TCP 443 only. Never publish TCP 3000 or 5432.

## Prepare files and secrets

Copy the reviewed release to `/opt/sya-store` (clone only after resolving the public Git history exposure), then:

```sh
sudo install -d -o deploy -g deploy -m 0750 /opt/sya-store
cd /opt/sya-store
mkdir -p deploy/letsencrypt deploy/acme-webroot
cp .env.example .env
chmod 600 .env
```

Edit `.env` in a secure editor. Set unique values for `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. Use at least 32 random characters for `SESSION_SECRET`. Keep `.env` out of Git and unencrypted backups. Do not place secrets in command arguments or logs. `ADMIN_EMAIL` and `ADMIN_PASSWORD` seed an admin only if the persistent users file is absent or empty; after the first launch remove `ADMIN_PASSWORD` from `.env`. Existing users are not reseeded.

`NEXT_PUBLIC_WHATSAPP_NUMBER` is compiled into the browser bundle, so set it before building; changes require rebuilding the app image.

## Local Docker Compose check

For a local storefront check, use the dedicated HTTP proxy config and loopback-only ports. This avoids the production bootstrap `503` and does not expose local ports to the LAN. It does not change the production TLS configuration.

```sh
cd /path/to/sya-store
cp .env.example .env
chmod 600 .env
```

Fill in `SESSION_SECRET` (at least 32 random characters), `ADMIN_EMAIL`, a strong `ADMIN_PASSWORD` (at least 16 characters), and the three `POSTGRES_*` values in `.env`. Leave the DB ports unpublished. Then, in the same terminal:

```sh
export NGINX_CONF=./deploy/nginx/local.conf
export NGINX_BIND_ADDRESS=127.0.0.1
export NGINX_HTTP_PORT=8080
export NGINX_HTTPS_PORT=8443
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 app nginx db
curl --fail --silent --show-error http://localhost:8080/ >/dev/null
```

Open `http://localhost:8080/`. The local proxy is plain HTTP and must remain loopback-only. For first-run initialization, the JSON volume starts with the bundled catalog/site settings and upload seeds; orders start empty and the admin account is initialized from `.env`. Existing named volumes are reused. Do not use `docker compose down -v`; ordinary `docker compose down` preserves volumes.

## Build, start, and enable HTTPS

The bootstrap Nginx config serves only ACME HTTP challenges and returns 503 for the rest. It intentionally does not serve storefront or login over HTTP because production session cookies are `Secure`.

```sh
cd /opt/sya-store
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 app nginx db
```

If the public IP is reachable over port 80 and the ACME provider supports it, issue an IP certificate:

```sh
export PUBLIC_IP=203.0.113.10
export ACME_EMAIL=admin@example.invalid
docker compose --profile tls run --rm certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  --ip-address "$PUBLIC_IP" --preferred-profile shortlived \
  --email "$ACME_EMAIL" --agree-tos --no-eff-email \
  --cert-name sya-store-ip
```

Let's Encrypt IP certificates currently use a short-lived profile (about six days), which requires automated renewal. A recent Certbot and `shortlived` profile are required; verify current issuer availability before use: [Let's Encrypt IP certificates](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability), [Certbot guidance](https://letsencrypt.org/2026/03/11/shorter-certs-certbot.html).

After issuance, set `NGINX_CONF=./deploy/nginx/default.conf` in `.env` and activate TLS:

```sh
docker compose up -d --force-recreate nginx
docker compose ps
docker compose logs --tail=100 nginx app
```

Verify `https://PUBLIC_IP/`. Plain HTTP remains limited to ACME challenges; it does not proxy login traffic over HTTP.

Schedule renewal on the host every 12 hours. The wrapper runs Certbot in its isolated service and reloads Nginx. For systemd, create `/etc/systemd/system/sya-store-renew.service`:

```sh
sudo tee /etc/systemd/system/sya-store-renew.service >/dev/null <<'EOF'
[Unit]
Description=Renew SYA Store IP TLS certificate

[Service]
Type=oneshot
WorkingDirectory=/opt/sya-store
ExecStart=/bin/sh /opt/sya-store/deploy/renew-cert.sh
EOF
sudo tee /etc/systemd/system/sya-store-renew.timer >/dev/null <<'EOF'
[Unit]
Description=Check SYA Store TLS certificate renewal twice daily

[Timer]
OnBootSec=15min
OnUnitActiveSec=12h
Persistent=true

[Install]
WantedBy=timers.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now sya-store-renew.timer
sudo systemctl list-timers sya-store-renew.timer
```

Alert on failures and monitor expiry. Keep the certificate private key readable only to root and Docker.

## Operations

```sh
cd /opt/sya-store
docker compose logs -f app
docker compose logs -f nginx
docker compose restart app
docker compose restart nginx
docker compose up -d --build app
docker compose ps
```

Use `docker compose down` for a planned stop. Never use `docker compose down -v` for routine operations because it removes persistent volumes.

Named volumes: `sya-store_json_data` holds current JSON stores; `sya-store_uploads` holds uploaded images; `sya-store_postgres_data` holds the future PostgreSQL cluster. The Compose project name is pinned so release checkouts use the same volumes.

On a truly empty JSON volume, startup validates and copies the non-customer catalog/site JSON and bundled upload images from a separate seed directory. It initializes orders empty and seeds one admin only when `users.json` is absent or empty. It never overwrites an existing file or administrator. It validates existing JSON and stops before writes if a store is malformed. A partially populated JSON volume missing any catalog/site JSON also fails closed; restore the original files from backup instead of having defaults mixed into live data. Local `data/orders.json` and `data/users.json` are excluded from the build context.

### Release checklist

1. Confirm the source release is reviewed, secrets are in a permission-restricted `.env`, `APP_IMAGE_TAG` is new and unique, and a recent off-host backup can be read.
2. Back up app data and uploads before the update. For a consistent file snapshot, stop writes first:

```sh
cd /opt/sya-store
mkdir -p backups
chmod 700 backups
umask 077
docker compose stop app
docker run --rm \
  -v sya-store_json_data:/json:ro \
  -v sya-store_uploads:/uploads:ro \
  -v "$PWD/backups:/backup" alpine:3.22.3 \
  sh -ec 'tar -czf /backup/sya-json-$(date +%F-%H%M).tar.gz -C /json . && tar -czf /backup/sya-uploads-$(date +%F-%H%M).tar.gz -C /uploads .'
```

3. Back up PostgreSQL too, even while the app is not using it:

```sh
docker compose exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backups/sya-postgres-$(date +%F-%H%M).sql"
docker compose start app
```

4. Build and start the new immutable image tag, then wait for health checks:

```sh
docker compose build app
docker compose up -d --no-deps app
docker compose ps
docker compose logs --tail=100 app nginx db
curl --fail --silent --show-error https://PUBLIC_IP/ >/dev/null
```

5. Check the admin login, a catalog page, an existing uploaded image, and one read-only order view. Review logs and host/container health. Do not create or submit a test order on production.

For rollback, set `APP_IMAGE_TAG` to the previous retained image tag and run `docker compose up -d --no-build --no-deps app`. This reuses the same named volumes and does not delete them. If the release changed persistent file formats, stop the app and restore the matching backup before restarting. Restore archives into the named volumes using a temporary helper container, then restart the app:

```sh
docker compose stop app
docker run --rm -v sya-store_json_data:/json -v "$PWD/backups:/backup:ro" alpine:3.22.3 \
  sh -ec 'tar -xzf /backup/json-backup.tar.gz -C /json'
docker run --rm -v sya-store_uploads:/uploads -v "$PWD/backups:/backup:ro" alpine:3.22.3 \
  sh -ec 'tar -xzf /backup/uploads-backup.tar.gz -C /uploads'
docker compose start app
```

Restore PostgreSQL only into the intended database after a fresh backup, using the `psql` command below. Never run `docker compose down -v` or `docker volume prune` during rollback.

## PostgreSQL backup and restore

PostgreSQL is not used by the app yet. These commands back up only the provisioned PostgreSQL volume; they do not migrate JSON records. Store backups encrypted off-host and test restores separately.

```sh
cd /opt/sya-store
umask 077
docker compose exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > /secure/backup/sya-store-$(date +%F-%H%M).sql
```

Restore after taking a fresh backup and confirming the target database:

```sh
cat /secure/backup/backup.sql | docker compose exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

These commands use the database container's local authentication and do not pass the password as a command-line argument. Treat backup files as sensitive.

## Security and blockers

- PostgreSQL has no published host port and resides on an internal Docker network. The app has no database driver or connection configuration yet.
- Nginx is the only host-published service. The app runs as UID 1001 with a read-only root filesystem except explicit data/upload volumes and temporary cache space. Containers restart unless stopped.
- Admin login needs HTTPS due to `Secure` production cookies.
- Git history exposure is unresolved: previous phase found credentials and personal records in public remote history. Do not build or deploy from that remote until visibility/history remediation and credential rotation are complete.
- Next.js is pinned to 15.5.29 with React 19.1.1 and sharp 0.35.5. TypeScript and production build checks pass. The compatible `npm audit fix` updated `source-map-js`; `npm audit` still reports two vulnerabilities (one moderate and one high) through Next.js's pinned PostCSS dependency. npm only offers a Next.js 16 major upgrade for those findings; review before public exposure.
- Image build needs outbound network access to install npm packages and download any configured `next/font` assets.
- PostgreSQL remains empty infrastructure; it does not contain JSON data.
