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
      `firefly-iii-data-importer-ingress` as a dependency.
2. Add corresponding username and pat for new users in
   `data-importer/resources/externalsecret.yaml` and
   `data-importer/substitutions/externalsecret.yaml` files. These files are
   separate since these values go into different namespaces.
   1. Create a Personal Access Token for a new user and add it to
      `users.sops.yaml` in external-secrets namespace. Configure
      `externalsecret.yaml` to generate the secret with this new PAT. You can
      see
      https://docs.firefly-iii.org/how-to/firefly-iii/features/api/#personal-access-tokens
      for details about generating PAT.
   2. In `substitutions/externalsecret.yaml` add a pointer to user name from
      `users.sops.yaml` from external secrets namespace. Note, flux
      substitutions require that the variable name does not have dashes.
3. Add a new mapping from the username to the backing service in the
   `data-importer/ingress/config/data-importer.conf`. This should just be a copy
   of one of the existing lines with bumped user index.
4. Add a new HelmRelease dependency to `dependsOn` list in
   `data-importer/ingress/helmrelease.yaml`.
