# Actionsflow webhook

This service forwards requests to actionsflow defined in [workflows/] via
[actionsflow trigger workflow].

To trigger a workflow, send a request to
`http://actionsflow-webhook.actions-runner-system.svc.cluster.local/<workflow-file-name>/webhook</extra/optional/path>`
endpoint from within the cluster. In the URL above `<workflow-file-name>` should
be one of the files in the [workflows/] directory, `/webhook` part is required,
and everything after `/webhook` is an optional path passed and used within a
workflow file.

[workflows/]: ../../../../workflows/
[actionsflow trigger workflow]: ../../../../.github/workflows/actionsflow.yaml

See more details about webhook based workflows in the official documentation:

- https://actionsflow.github.io/docs/triggers/webhook/
- https://actionsflow.github.io/docs/webhook/

## Detailed example

Given file `workflows/hello.yaml` with the following content:

```yaml
on:
  webhook:

jobs:
  print:
    name: Print
    runs-on: ubuntu-latest
    steps:
      - name: Print Outputs
        env:
          method: ${{ on.webhook.outputs.method }}
          body: ${{ toJson(on.webhook.outputs.body) }}
          headers: ${{ toJson(on.webhook.outputs.headers) }}
        run: |
          echo method: $method
          echo headers $headers
          echo body: $body
```

This workflow can be triggerred with the following command:

```sh
curl -v \
  --json '{ "hello": "world" }' \
  http://actionsflow-webhook.actions-runner-system.svc.cluster.local/hello/webhook
```
