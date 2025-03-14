#!/usr/bin/env bash

# qBittorrent settings > 'Run external program on torrent finished'
# /config/scripts/xseed.sh "%F"

XSEED_HOST=${XSEED_HOST:-crossseed}
XSEED_PORT=${XSEED_PORT:-8080}
XSEED_API_KEY=${XSEED_API_KEY:-unset}
XSEED_SLEEP_INTERVAL=${CROSS_SEED_SLEEP_INTERVAL:-30}

SEARCH_PATH=$1

response=$(curl \
  --silent \
  --output /dev/null \
  --write-out "%{http_code}" \
  --request POST \
  --data-urlencode "path=${SEARCH_PATH}" \
  --header "X-Api-Key: ${XSEED_API_KEY}" \
  "http://${XSEED_HOST}:${XSEED_PORT}/api/webhook"
)

if [[ "${response}" != "204" ]]; then
  printf "Failed to search cross-seed for '%s'\n" "${SEARCH_PATH}"
  exit 1
fi

printf "Successfully searched cross-seed for '%s'\n" "${SEARCH_PATH}"

sleep "${XSEED_SLEEP_INTERVAL}"
