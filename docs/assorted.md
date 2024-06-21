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

## How to render Flux's `Kustomization`s and `HelmRelease`s to final resources

### Using [flux-build](https://github.com/DoodleScheduling/flux-build) project

keep in mind that `--output` flag for some reason appends to existing file, so
the file should be removed before generating the output

```sh
rm -f __out__.yaml && \
docker run -ti \
  --rm \
  --volume .:/workspace \
  --workdir /workspace \
  --user "$UID" \
  ghcr.io/doodlescheduling/flux-build \
    --output /workspace/__out__.yaml \
    /workspace/kubernetes/flux \
    /workspace/kubernetes/apps/<namespace>/<name>
```

### Manual method

This is a copy of
[the post](https://github.com/fluxcd/flux2/issues/2808#issuecomment-1529946044)
made on flux issue to support this feature natively in flux.

> @MrMarkW If It is not too late, here is the process:
>
> 1. Build Flux Kustomization:
>
>    ```
>    flux build kustomization <kustomization_name> --path dev > out/kustomization_out.yaml
>    ```
>
>    In my case `kustomization_out.yaml` contains 2 YAML manifests
>    `HelmRepository` and `HelmRelease`.
>
> 2. Take Helm repository URL and name from `HelmRelease` and add the Helm repo:
>
>    ```
>    helm repo add <helm_repo_name> <helm_repo_url>
>    ```
>
> 3. Take the `values` section from `HelmRelease` and add it to `values.yaml`
>    file. After that you will be able to render the chart locally:
>
>    ```
>    helm template <name> <helm_repo_name>/<helm_chart_name> -f out/values.yaml > out/helm_out.yaml
>    ```
>
> 4. If you have `postRenderers` section in `HelmRelease`, you can create
>    `kustomization.yaml` file similar to this one:
>
>    ```yaml
>    apiVersion: kustomize.config.k8s.io/v1beta1
>    kind: Kustomization
>    resources:
>      - helm_out.yaml
>    patches:
>      - path: patch_1.yaml
>      - path: patch_2.yaml
>      - patch: |-
>          inline-patch
>    ```
>
> 5. After that move patches from the `postRenderers` section to the patch files
>    and render the final result:
>
>    ```
>    kustomize build out
>    ```
>
> ---
>
> These steps can be scripted. But I don't see why Flux couldn't do the same.
> Because it is what it already does.

## How to debug network requests going through nginx

See [debugging network requests](./debug/debugging-network-requests.md).

## How to debug/query LDAP server

Note, the host, base dn, user, password and query might be different, based on
the setup.

1. Download and start the container:
   ```bash
   kubectl run --rm -ti --image osixia/openldap --restart Never osixia-openldap --command -- bash
   ```
2. Run search queries:
   ```bash
   ldapsearch -x -H ldap://glauth -b dc=home,dc=arpa -D "<user-id>,dc=home,dc=arpa" -w <password> (&(...))
   ```
