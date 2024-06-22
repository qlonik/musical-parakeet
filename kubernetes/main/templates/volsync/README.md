# Volsync

Comes with PVC, which it backs up.

## Usage

1. In kustomization.yaml import with:

   ```yaml
   components:
     - ../../../path/to/templates/volsync
   ```

2. In fluxtomization `ks.yaml` add this:

   ```yaml
   spec:
     postBuild:
       substitute:
         APP: *app
         PVC_CAPACITY: 1Gi
   ```

3. In HelmRelease, use the created pvc. In particular, for `app-template@3`:

   ```yaml
   spec:
     values:
       persistence:
         config:
           type: persistentVolumeClaim
           existingClaim: app # replace with generated name
           # this
           globalMounts:
             - path: /config
           # or
           advancedMounts:
             controller:
               container:
                 - path: /config
   ```

4. Inside the `substitute` object these variables are supported:

   | Variable                    | Required | Default value        |
   | --------------------------- | -------- | -------------------- |
   | APP                         | ✅       |                      |
   | PVC_NAME_PREFIX             | ❌       | `""`                 |
   | PVC_NAME_SUFFIX             | ❌       | `""`                 |
   | PVC_CAPACITY                | ✅       |                      |
   | PVC_STORAGECLASS            | ❌       | `"truenas-nfs-main"` |
   | PVC_ACCESSMODE              | ❌       | `"ReadWriteOnce"`    |
   | VOLSYNC_COPYMETHOD          | ❌       | `"Snapshot"`         |
   | VOLSYNC_SNAPSHOTCLASS       | ❌       | `"truenas-nfs-main"` |
   | VOLSYNC_CACHE_SNAPSHOTCLASS | ❌       | `"openebs-hostpath"` |
   | VOLSYNC_CACHE_ACCESSMODE    | ❌       | `"ReadWriteOnce"`    |
   | VOLSYNC_CACHE_CAPACITY      | ❌       | `"4Gi"`              |
   | VOLSYNC_REPO_EXTRA_SUBPATH  | ❌       | `""`                 |

   Note, `VOLSYNC_REPO_EXTRA_SUBPATH` should not start with `/`. It adds an
   extra subpath to backup location in minio, which allows to have multiple
   volsync backups going into the same bucket.
