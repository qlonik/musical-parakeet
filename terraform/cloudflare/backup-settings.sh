#!/usr/bin/env bash

# Run this script in this folder and pass these flags:
#   -a, --account string         Use specific account ID for commands
#   -e, --email string           API Email address associated with your account
#   -k, --key string             API Key generated on the 'My Profile' page. See: https://dash.cloudflare.com/profile
#   -z, --zone string            Limit the export to a single zone ID


original_args="$@"
zone=default

# See https://github.com/cloudflare/cf-terraforming#supported-resources
# for the list of resources
resources=(
    "cloudflare_access_application"
    "cloudflare_access_group"
    "cloudflare_access_identity_provider"
    "cloudflare_access_mutual_tls_certificate"
    "cloudflare_access_policy"
    "cloudflare_access_rule"
    "cloudflare_access_service_token"
    "cloudflare_account_member"
    "cloudflare_api_shield"
    "cloudflare_api_token"
    "cloudflare_argo"
    "cloudflare_argo_tunnel"
    "cloudflare_authenticated_origin_pulls"
    "cloudflare_authenticated_origin_pulls_certificate"
    "cloudflare_byo_ip_prefix"
    "cloudflare_certificate_pack"
    "cloudflare_custom_hostname"
    "cloudflare_custom_hostname_fallback_origin"
    "cloudflare_custom_pages"
    "cloudflare_custom_ssl"
    "cloudflare_filter"
    "cloudflare_firewall_rule"
    "cloudflare_healthcheck"
    "cloudflare_ip_list"
    "cloudflare_load_balancer"
    "cloudflare_load_balancer_monitor"
    "cloudflare_load_balancer_pool"
    "cloudflare_logpull_retention"
    "cloudflare_logpush_job"
    "cloudflare_logpush_ownership_challenge"
    "cloudflare_magic_firewall_ruleset"
    "cloudflare_origin_ca_certificate"
    "cloudflare_page_rule"
    "cloudflare_rate_limit"
    "cloudflare_record"
    "cloudflare_ruleset"
    "cloudflare_spectrum_application"
    "cloudflare_waf_group"
    "cloudflare_waf_override"
    "cloudflare_waf_package"
    "cloudflare_waf_rule"
    "cloudflare_waiting_room"
    "cloudflare_worker_cron_trigger"
    "cloudflare_worker_route"
    "cloudflare_worker_script"
    "cloudflare_workers_kv"
    "cloudflare_workers_kv_namespace"
    "cloudflare_zone"
    "cloudflare_zone_dnssec"
    "cloudflare_zone_lockdown"
    "cloudflare_zone_settings_override"
)

while [[ $# -gt 0 ]]; do
    case $1 in
        -z|--zone) zone="$2"; shift 2 ;;
        *) shift ;;
    esac
done

zone_file="backup/${zone}.tf"
if [[ -f "$zone_file" ]]; then
    echo "File \"$zone_file\" with backup already exists. Remove or rename it"
    exit 1
fi

touch "$zone_file"

for resource in "${resources[@]}"; do
    echo "===+++ Backing up resource \"${resource}\" +++==="
    result=$(cf-terraforming generate $original_args --resource-type "$resource")

    if [[ -z "$result" ]]; then
        continue
    elif [[ "$result" == *"is not yet supported"* || "$result" == *"no resources"* ]]; then
        echo "$result"
    else
        echo "$result" >> "$zone_file"
    fi
done
