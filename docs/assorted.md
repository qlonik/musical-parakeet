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

## Extend LVM on qcow2 images

See https://linuxconfig.org/how-to-resize-a-qcow2-disk-image-on-linux

- Shut-off the VM, run the following outside of VM
- `qemu-img resize image.qcow2 +10G`
- `modprobe nbd max_part=10`
- `qemu-nbd -c /dev/nbd0 image.qcow2`
- `parted -a opt /dev/nbd0`
  - If it suggests to fix gpt table, enter `Fix`
  - Enter `print free` to find partition to resize and if the space is available
  - Enter `resizepart <PARTITION_NUMBER> 100%`
  - Enter `quit`
- `qemu-nbd -d /dev/nbd0`
- Boot the VM, run the following inside the VM
- `pvs`/`pvdisplay` to show PVs
- `pvresize /dev/vda#`
- `lvs`/`lvdisplay` to show LVs
- `lvresize -l +100%FREE --resizefs VolGroup/logical-volume`
