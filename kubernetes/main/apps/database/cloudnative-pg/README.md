# Cloudnative-pg

## Backup/restore

The initial cluster was bootstrapped from scratch, using the default
[`initdb`](https://cloudnative-pg.io/documentation/1.18/bootstrap/#bootstrap-an-empty-cluster-initdb)
method. There is now an explicit `bootstrap.initdb` key to indicate that.

The backup (initialized after the bootstrap) is setup to store data in locally
hosted MinIO server within a bucket as setup by
`backup.barmanObjectStore.destinationPath` key. The data within the bucket is
stored into individual folders annotated with the future version of the cluster.
This is indicated by the `backup.barmanObjectStore.serverName` field.

The cluster has enough configuration added for the future recovery step. When
the cluster needs to be rebuilt, it is no longer going to be initialized with
the empty data. Therefore, it is necessary to comment out `bootstrap.initdb`
section and uncomment `bootstrap.recovery`. It is also necessary to bump
versions in both `externalClusters.0.name` and
`backup.barmanObjectStore.serverName`. This way, the cluster will recover from
the version that is next from the current version and will start backing up into
a future version.
