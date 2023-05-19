# firefly-iii

Finance management software

## Data Importer

Allows importing transaction data from various banks into a firefly-iii
instance.

### Adding new user

1. In fluxtomization `ks.yaml`:
   1. Duplicate data-importer-template setup for a new user. Bump each instance
      of `user-00` so it doesn't clash with existing instance.
   2. Add the name of newly created fluxtomization to
      `cluster-apps-firefly-iii-data-importer-ingress` as a dependency.
2. Update secrets in `app/data-importer-resources.sops.yaml` and
   `app/data-importer-substitutions.sops.yaml`. These files are separate since
   these values go into different namespaces.
   1. In `resources` file add a Personal Access Token for a new user. You can
      see https://docs.firefly-iii.org/firefly-iii/api/#personal-access-token
      for details about generating PAT.
   2. In `substitutions` file set an authelia username corresponding to the new
      user. Note, flux substitutions require that the variable name does not
      have dashes.
3. Add a new mapping from the username to the backing service in the
   `data-importer-ingress/config/data-importer.conf`. This should just be a copy
   of one of the existing lines with bumped user index.
