#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAILED_SERVICES=()

copy_env() {
  local dir="$1"
  if [[ -f "$dir/.env.example" && ! -f "$dir/.env" ]]; then
    cp "$dir/.env.example" "$dir/.env"
    echo "Created $dir/.env"
  fi
}

install_service() {
  local name="$1"
  local dir="$2"
  shift 2
  echo "-- $name --"
  if ! (cd "$dir" && "$@"); then
    echo "!! $name install failed, continuing with the rest --"
    FAILED_SERVICES+=("$name")
  fi
}

echo "== Copying .env files =="
copy_env "."
for service in gateway auth-service sms-service ai-service worker dashboard; do
  copy_env "$service"
done

echo "== Installing dependencies =="

if [[ -f auth-service/composer.json ]] && command -v composer >/dev/null 2>&1; then
  install_service "auth-service (composer)" auth-service composer install
fi

if [[ -f sms-service/package.json ]] && command -v npm >/dev/null 2>&1; then
  install_service "sms-service (npm)" sms-service npm install
fi

if [[ -f dashboard/package.json ]] && command -v npm >/dev/null 2>&1; then
  install_service "dashboard (npm)" dashboard npm install
fi

if [[ -f ai-service/requirements.txt ]] && command -v pip >/dev/null 2>&1; then
  install_service "ai-service (pip)" ai-service pip install -r requirements.txt
fi

if [[ -f gateway/go.mod ]] && command -v go >/dev/null 2>&1; then
  install_service "gateway (go)" gateway go mod download
fi

if [[ -f worker/go.mod ]] && command -v go >/dev/null 2>&1; then
  install_service "worker (go)" worker go mod download
fi

echo "== Done =="
echo "Review the .env files created above, then see docs/local-dev-setup.md for next steps."

if [[ ${#FAILED_SERVICES[@]} -gt 0 ]]; then
  echo "Some installs failed: ${FAILED_SERVICES[*]}"
  exit 1
fi
