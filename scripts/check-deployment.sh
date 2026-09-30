#!/usr/bin/env bash
set -euo pipefail
app_url="${1:?Usage: bash scripts/check-deployment.sh https://your-stoqo-web.onrender.com}"
case "$app_url" in https://*) ;; *) echo "Use the public HTTPS frontend URL" >&2; exit 1;; esac
app_url="${app_url%/}"
curl --fail --silent --show-error --max-time 30 "$app_url/login" -o /dev/null
curl --fail --silent --show-error --max-time 30 "$app_url/api/health"
printf '\nFrontend, API, database and queue connectivity checks passed.\n'
