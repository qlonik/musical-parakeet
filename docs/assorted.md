# Some small assorted tips

## Generate a new secret value

```shell
LENGTH=128
tr -cd '[:alnum:]' < /dev/urandom \
  | fold -w "${LENGTH}"           \
  | head -n 1                     \
  | tr -d '\n'                    \
  | tee >(xargs echo)             \
  | base64 --wrap 0               \
  ; echo
```

The command prints base64 encoded-value, followed by the actual secret value.

## (Postgresql) List all tables sorted by the number of rows

```postgresql
select
  n.nspname as table_schema,
  c.relname as table_name,
  c.reltuples as rows
from
  pg_class c
  join pg_namespace n on n.oid = c.relnamespace
where
  c.relkind = 'r'
  and n.nspname not in ('information_schema', 'pg_catalog')
order by
  c.reltuples desc;
```
