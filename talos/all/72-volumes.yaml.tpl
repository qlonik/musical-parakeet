{{- if .Node.Data.useForLonghorn }}
---
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
provisioning:
  maxSize: {{ mulf 0.15 .Node.Data.systemDiskSizeGiB }}GiB # 15%
---
apiVersion: v1alpha1
kind: UserVolumeConfig
name: extra
provisioning:
  diskSelector:
    match: system_disk
  grow: true
  minSize: {{ mulf 0.2 .Node.Data.systemDiskSizeGiB }}GiB # 20%
  maxSize: {{ mulf 0.5 .Node.Data.systemDiskSizeGiB }}GiB # 50%
filesystem:
  type: xfs
---
apiVersion: v1alpha1
kind: KubeNodeConfig
labels:
  node.longhorn.io/create-default-disk: "true"
{{- end }}
