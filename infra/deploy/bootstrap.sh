#!/usr/bin/env bash
# ============================================================
# bootstrap.sh — one-shot deploy on a fresh Ubuntu 22.04+ VPS.
#
# Usage (run on the VPS as root or with sudo):
#
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/infra/deploy/bootstrap.sh | bash
#
# OR, if you've already SCP'd or cloned the repo:
#
#   cd ~/joinevents && sudo bash infra/deploy/bootstrap.sh
#
# Idempotent: re-running upgrades the stack without losing data.
# ============================================================

set -euo pipefail

REPO_DIR="${REPO_DIR:-$(pwd)}"
ENV_FILE="${REPO_DIR}/.env.production"

log()  { printf '\033[1;34m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---- 0. Pre-flight ----
[[ "$EUID" -eq 0 ]] || die "Run as root (or with sudo)."
[[ -f "${REPO_DIR}/docker-compose.deploy.yml" ]] \
  || die "Run this from the repo root (where docker-compose.deploy.yml lives)."

# ---- 1. Install Docker if missing ----
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker Engine + Compose plugin"
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  ok "Docker installed"
else
  ok "Docker already present"
fi

# ---- 2. Firewall (UFW) ----
if command -v ufw >/dev/null 2>&1; then
  log "Opening ports 22, 80, 443"
  ufw allow 22/tcp  >/dev/null 2>&1 || true
  ufw allow 80/tcp  >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ok "Firewall rules applied"
fi

# ---- 3. Validate .env.production ----
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "${REPO_DIR}/.env.production.example" ]]; then
    cp "${REPO_DIR}/.env.production.example" "$ENV_FILE"
    warn "Created .env.production from .env.production.example — fill it in NOW:"
    warn "  nano $ENV_FILE"
    die  "Re-run this script after you've set DOMAIN, POSTGRES_PASSWORD, JWT_SECRET, etc."
  else
    die ".env.production missing and no template found."
  fi
fi

# Check the four critical values aren't still placeholders.
grep -q '^DOMAIN=CHANGE_ME'              "$ENV_FILE" && die "DOMAIN in .env.production is still the placeholder — set it to your real domain."
grep -q '^POSTGRES_PASSWORD=CHANGE_ME'   "$ENV_FILE" && die "POSTGRES_PASSWORD in .env.production is still the placeholder."
grep -q '^JWT_SECRET=CHANGE_ME'          "$ENV_FILE" && die "JWT_SECRET in .env.production is still the placeholder. Generate with: openssl rand -base64 48"

# ---- 4. DNS sanity check ----
DOMAIN=$(grep '^DOMAIN=' "$ENV_FILE" | cut -d= -f2-)
SERVER_IP=$(curl -fsS https://api.ipify.org || echo "?")
DOMAIN_IP=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -n1 || true)
log "Domain  : $DOMAIN"
log "Server  : $SERVER_IP"
log "DNS A   : ${DOMAIN_IP:-not resolving}"
if [[ -n "$DOMAIN_IP" && "$DOMAIN_IP" != "$SERVER_IP" ]]; then
  warn "DNS for $DOMAIN points at $DOMAIN_IP, not this server ($SERVER_IP)."
  warn "Caddy won't be able to issue an HTTPS certificate until DNS resolves to this box."
  warn "Continuing anyway — fix the A record and re-run if HTTPS fails."
fi

# ---- 5. Build & start ----
log "Building images (first run takes ~3-5 min)"
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml build

log "Starting database + redis"
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml up -d postgres redis

log "Waiting for Postgres to be healthy"
for i in {1..30}; do
  if docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml exec -T postgres pg_isready -U "$(grep ^POSTGRES_USER "$ENV_FILE" | cut -d= -f2)" >/dev/null 2>&1; then
    ok "Postgres ready"; break
  fi
  sleep 1
  [[ $i -eq 30 ]] && die "Postgres didn't come up. Check: docker logs joinevents-postgres"
done

# ---- 6. Migrate + seed ----
log "Running Prisma migrations"
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml run --rm api \
  node node_modules/prisma/build/index.js migrate deploy

# Seed only if the events table is empty (idempotent on re-runs).
EVENT_COUNT=$(docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml exec -T postgres \
  psql -U "$(grep ^POSTGRES_USER "$ENV_FILE" | cut -d= -f2)" \
       -d "$(grep ^POSTGRES_DB   "$ENV_FILE" | cut -d= -f2)" \
       -tAc "SELECT COUNT(*) FROM events;" 2>/dev/null || echo 0)
if [[ "$EVENT_COUNT" -eq 0 ]]; then
  log "Seeding demo data (4 societies, 4 users, 10 events)"
  docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml run --rm api \
    node prisma/seed.js || warn "Seed step failed — non-fatal. Inspect manually if needed."
else
  ok "Events table has $EVENT_COUNT rows; skipping seed."
fi

# ---- 7. Bring up the rest ----
log "Starting api, web, queue worker, caddy"
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml up -d --build

# ---- 8. Health checks ----
sleep 5
log "Health probe"
if docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml exec -T api \
   wget -qO- http://localhost:4000/api/v1/health/live >/dev/null 2>&1; then
  ok "API healthy"
else
  warn "API health probe failed. Check: docker logs joinevents-api"
fi

echo
ok "Deploy complete."
echo
echo "    URL    : https://$DOMAIN"
echo "    Logs   : docker compose -f docker-compose.deploy.yml logs -f api"
echo "    Status : docker compose -f docker-compose.deploy.yml ps"
echo "    Stop   : docker compose -f docker-compose.deploy.yml down"
echo
echo "Caddy issues a Let's Encrypt cert the first time it serves $DOMAIN over HTTPS."
echo "If the cert is still pending in 60s, check: docker logs joinevents-caddy"
