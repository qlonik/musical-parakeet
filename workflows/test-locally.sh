#!/usr/bin/env bash

set -euo pipefail

git_dir=$(git rev-parse --show-toplevel)
script_dir="$(realpath "$0" | xargs dirname)"

INCLUDE=""

__JSON_GITHUB='{
   "event_name": "schedule",
   "event": {
       "repository": {},
       "schedule": "0 * * * *",
       "workflow": ".github/workflows/actionsflow.yaml"
   }
}'

__JSON_SECRETS='{
   "PROCESS_FIREFLY_TRANSACTIONS": '$(sops -d "$git_dir/workflows/process-firefly-transactions/secret.sops.yaml" | yq -M '.data' | jq -cM | jq -cMR)',
   "LINKDING_TO_MEALIE_RECIPES": '$(sops -d "$git_dir/workflows/linkding-to-mealie-recipes/secret.sops.yaml" | yq -M '.data' | jq -cM | jq -cMR)'
}'

cd "$git_dir" \
&& pnpm dlx actionsflow \
   build \
   $([[ -n "$INCLUDE" ]] && printf -- '-i %s' "$INCLUDE" || printf "") \
   --json-github "'" "$(echo "$__JSON_GITHUB" | jq -cM)" "'" \
   --json-secrets "'" "$(echo "$__JSON_SECRETS" | jq -cM)" "'" \
   --dest dist \
   --cwd "$git_dir" \
&& act \
   --eventpath ./dist/event.json \
   --workflows ./dist/workflows \
   --secret-file ./dist/.secrets \
   --env-file ./dist/.env \
   --bind \
   --rm \
&& rm -rf "$git_dir/.actionsflow" "$git_dir/dist"
