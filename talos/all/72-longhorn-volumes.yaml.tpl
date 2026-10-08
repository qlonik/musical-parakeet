{{- if .Node.Data.longhorn.useNode }}
---
apiVersion: v1alpha1
kind: KubeNodeConfig
labels:
  node.longhorn.io/create-default-disk: "true"
{{- end }}

{{- if .Node.Data.longhorn.useSystemDisk }}
---
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
provisioning:
  maxSize: {{ mulf 0.15 .Node.Data.longhorn.systemDiskSizeGiB }}GiB # 15%
---
apiVersion: v1alpha1
kind: UserVolumeConfig
name: extra
provisioning:
  diskSelector:
    match: system_disk
  grow: true
  minSize: {{ mulf 0.2 .Node.Data.longhorn.systemDiskSizeGiB }}GiB # 20%
  maxSize: {{ mulf 0.5 .Node.Data.longhorn.systemDiskSizeGiB }}GiB # 50%
filesystem:
  type: xfs
{{- end }}

{{- range .Node.Data.longhorn.extraVolumes }}
---
apiVersion: v1alpha1
kind: UserVolumeConfig
name: extra
provisioning:
  diskSelector:
    match: disk.dev_path == "{{ .path }}" || "{{ .path }}" in disk.symlinks
  grow: true
  minSize: 200GiB
filesystem:
  type: xfs
{{- end }}
