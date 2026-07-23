#!/usr/bin/env bash
# Runs gateway, auth-service, sms-service, and dashboard together for local
# development without Docker. Assumes Postgres is already running and each
# service's .env already exists (run scripts/setup.sh first if not).
#
# Usage: ./scripts/dev-up.sh
# Override ports:  AUTH_SERVICE_PORT=8001 SMS_SERVICE_PORT=3001 ./scripts/dev-up.sh
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.dev-logs"
mkdir -p "$LOG_DIR"

AUTH_SERVICE_PORT="${AUTH_SERVICE_PORT:-8000}"
SMS_SERVICE_PORT="${SMS_SERVICE_PORT:-3001}"
GATEWAY_PORT="${GATEWAY_PORT:-8080}"
DASHBOARD_PORT="${DASHBOARD_PORT:-5173}"

AUTH_URL="http://127.0.0.1:$AUTH_SERVICE_PORT"
SMS_URL="http://127.0.0.1:$SMS_SERVICE_PORT"
GATEWAY_URL="http://127.0.0.1:$GATEWAY_PORT"
DASHBOARD_URL="http://127.0.0.1:$DASHBOARD_PORT"

PIDS=()

# npm/nest/go run all spawn child processes -- killing just the PID we
# captured leaves orphans holding the port. setsid puts each service in
# its own process group so `kill -- -PID` can take the whole tree down.
spawn() {
  setsid "$@" &
  PIDS+=($!)
}

cleanup() {
  echo ""
  echo "Stopping all services..."
  for pid in "${PIDS[@]:-}"; do
    kill -- "-$pid" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT INT TERM

port_in_use() {
  (echo >"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
}

require_free_port() {
  local port="$1" name="$2" override_var="$3"
  if port_in_use "$port"; then
    echo "!! Port $port is already in use ($name) -- set $override_var to use a different port." >&2
    exit 1
  fi
}

wait_for() {
  local url="$1" name="$2"
  for _ in $(seq 1 30); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "   $name is up"
      return 0
    fi
    sleep 1
  done
  echo "!! $name did not become healthy in time -- see $LOG_DIR/$(echo "$name" | tr ' ' '-').log" >&2
  return 1
}

require_free_port "$AUTH_SERVICE_PORT" "auth-service" AUTH_SERVICE_PORT
require_free_port "$SMS_SERVICE_PORT" "sms-service" SMS_SERVICE_PORT
require_free_port "$GATEWAY_PORT" "gateway" GATEWAY_PORT
require_free_port "$DASHBOARD_PORT" "dashboard" DASHBOARD_PORT

echo "== Starting auth-service on :$AUTH_SERVICE_PORT =="
# PHP's built-in dev server handles one request at a time by default --
# under any real concurrency (dashboard + gateway + sms-service's own
# defense-in-depth check all hitting /api-keys/validate) that serializes
# every request in the whole stack behind it (see docs/load-testing.md
# for how Day 88's load test found this). PHP_CLI_SERVER_WORKERS spawns
# multiple workers, but Artisan's ServeCommand only honors it alongside
# --no-reload (otherwise it warns and silently falls back to one worker).
spawn bash -c "cd '$ROOT_DIR/auth-service' && PHP_CLI_SERVER_WORKERS='${AUTH_SERVICE_WORKERS:-8}' exec php artisan serve --no-reload --port='$AUTH_SERVICE_PORT'" >"$LOG_DIR/auth-service.log" 2>&1

echo "== Starting sms-service on :$SMS_SERVICE_PORT =="
spawn bash -c "cd '$ROOT_DIR/sms-service' && PORT='$SMS_SERVICE_PORT' AUTH_SERVICE_URL='$AUTH_URL' exec npm run start:dev" >"$LOG_DIR/sms-service.log" 2>&1

echo "== Starting gateway on :$GATEWAY_PORT =="
spawn bash -c "cd '$ROOT_DIR/gateway' && GATEWAY_PORT='$GATEWAY_PORT' SMS_SERVICE_URL='$SMS_URL' AUTH_SERVICE_URL='$AUTH_URL' exec go run ./cmd/gateway" >"$LOG_DIR/gateway.log" 2>&1

echo ""
echo "== Waiting for services to come up (this can take ~10-20s for sms-service's first watch build) =="
wait_for "$AUTH_URL/api/health" "auth-service" || exit 1
wait_for "$SMS_URL/api/v1" "sms-service" || exit 1
wait_for "$GATEWAY_URL/healthz" "gateway" || exit 1

echo ""
echo "== Bootstrapping a dev API key (reused across runs) =="
KEY_FILE="$LOG_DIR/dev-api-key.txt"
if [[ -s "$KEY_FILE" ]]; then
  DEV_API_KEY="$(cat "$KEY_FILE")"
  echo "   Reusing existing dev key from $KEY_FILE"
else
  OWNER_ID="$(cd "$ROOT_DIR/auth-service" && php artisan tinker --execute="echo App\\Models\\User::firstOrCreate(['email' => 'dev@smspit.local'], ['name' => 'dev', 'password' => bcrypt('dev')])->id;" 2>>"$LOG_DIR/auth-service.log")"
  CREATE_RESPONSE="$(curl -s -X POST "$AUTH_URL/api/api-keys" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"dev-up\",\"owner_id\":$OWNER_ID}")"
  DEV_API_KEY="$(echo "$CREATE_RESPONSE" | jq -r '.key')"
  if [[ -z "$DEV_API_KEY" || "$DEV_API_KEY" == "null" ]]; then
    echo "!! Failed to create a dev API key. Response: $CREATE_RESPONSE" >&2
    exit 1
  fi
  echo "$DEV_API_KEY" >"$KEY_FILE"
  echo "   Created a new dev key and saved it to $KEY_FILE"
fi

echo "== Starting dashboard on :$DASHBOARD_PORT =="
cat >"$ROOT_DIR/dashboard/.env.local" <<EOF
VITE_API_BASE_URL=$GATEWAY_URL
VITE_AUTH_SERVICE_URL=$AUTH_URL
VITE_API_KEY=$DEV_API_KEY
EOF
spawn bash -c "cd '$ROOT_DIR/dashboard' && exec npm run dev -- --port '$DASHBOARD_PORT'" >"$LOG_DIR/dashboard.log" 2>&1
wait_for "$DASHBOARD_URL" "dashboard" || exit 1

cat <<EOF

============================================================
  SMSPit is running:

    Dashboard:      $DASHBOARD_URL
    Gateway (API):  $GATEWAY_URL
    sms-service:    $SMS_URL   (direct, bypassing gateway)
    auth-service:   $AUTH_URL  (direct, bypassing gateway)

    Dev API key (also saved to $KEY_FILE):
    $DEV_API_KEY

    Try it:
    curl -X POST $GATEWAY_URL/api/v1/messages \\
      -H "Authorization: Bearer $DEV_API_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{"to":"+8801700000000","from":"SMSPit","message":"hello"}'

    Logs: $LOG_DIR/*.log
    Press Ctrl+C to stop all services.
============================================================
EOF

wait
