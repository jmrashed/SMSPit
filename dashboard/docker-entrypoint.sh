#!/bin/sh
# Runs as an nginx docker-entrypoint.d/ hook (executed by the base
# nginx:alpine image's entrypoint before nginx starts) -- generates
# config.js from the container's environment at startup.
set -eu

cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-}",
  VITE_API_KEY: "${VITE_API_KEY:-}",
  VITE_AUTH_SERVICE_URL: "${VITE_AUTH_SERVICE_URL:-}",
  VITE_AI_SERVICE_URL: "${VITE_AI_SERVICE_URL:-}"
};
EOF
