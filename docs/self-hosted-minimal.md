# Self-hosted minimal

Set the repo or environment variable `AWS_ROLE_TO_ASSUME` to your OIDC role ARN.

Optionally override defaults with `ASG_NAME` and `AWS_REGION` variables.

Jobs using the reusable wrapper first try the self-hosted runner and fall back to `ubuntu-latest` if they don't start within the configured queue timeout.
