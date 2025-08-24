# AWS SSM Managed GitHub Runners

This repository can provision and repair self‑hosted GitHub Actions runners on EC2 without any SSH access.

## Bootstrap
1. Launch an EC2 instance with the IAM instance profile in `infra/ssm-runner/`.
2. Run the **Runner SSM Bootstrap** workflow and provide the instance ID or a tag plus the AWS region. The workflow retrieves a short‑lived registration token, sends the install script via AWS Systems Manager, and registers the runner with the `mvp-gh-runner` label.

## Health
The nightly **Runner SSM Health** workflow checks that the instance is online in SSM and that the runner is online with GitHub. If either check fails it attempts to restart the runner service through SSM and opens or updates an issue when repair does not succeed.

## Using the runner
Jobs may request the runner directly:

```yaml
runs-on: [self-hosted, linux, x64, mvp-gh-runner]
```

Alternatively call the reusable workflow to prefer the self‑hosted runner with a fallback to `ubuntu-latest`:

```yaml
jobs:
  build:
    uses: .github/workflows/selfhosted-prefer.yml
```
