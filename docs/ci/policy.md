# CI runner policy

- Pull requests from forks run on ephemeral one-shot runners.
  - Workflows call `.github/workflows/ephemeral-runner-dispatch.yml` to launch a temporary EC2 or Fargate runner with the `ci-ephemeral` label.
  - Subsequent jobs use `runs-on: [self-hosted, linux, x64, ci-ephemeral]`.
- Branches within the repository use persistent auto-scaling groups (`ci-small`, `ci-medium`, or `ci-large`).
- Repository settings:
  - Remove GitHub-hosted runners from required checks.
  - Require the **Self-hosted enforce** check.
