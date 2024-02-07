#!/usr/bin/env bash

set -euo pipefail

# These env are for the psql CLI
export PGHOST="$INIT_POSTGRES_HOST"
export PGUSER="$INIT_POSTGRES_SUPER_USER"
export PGPASSWORD="$INIT_POSTGRES_SUPER_PASS"

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# based on
# https://github.com/bitnami/containers/blob/8911b730fb848664971ca6fe171233403262cdbd/bitnami/postgresql/14/debian-11/rootfs/opt/bitnami/scripts/libpostgresql.sh#L719
find "$SCRIPT_DIR/" -type f -regex ".*\.\(sql\|sql.gz\)" | sort | while read -r f; do
    case "$f" in
    *.sql)
        echo "Executing $f"
        psql -d "$INIT_POSTGRES_DBNAME" <"$f"
        ;;
    *.sql.gz)
        echo "Executing $f"
        gunzip -c "$f" | psql -d "$INIT_POSTGRES_DBNAME"
        ;;
    *) echo "Ignoring $f" ;;
    esac
done

