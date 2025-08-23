# EC2 self-hosted runner via SSM

This repository includes a workflow **Runner SSM Bootstrap** that bootstraps an existing EC2 instance into a GitHub Actions self-hosted runner using AWS Systems Manager Run Command.

## Prerequisites

- EC2 instance is running and has the SSM Agent installed (Amazon Linux 2/2023 includes it).
- The instance profile allows `AmazonSSMManagedInstanceCore`.
- The instance can reach SSM (VPC endpoints or internet/NAT).
- Repository secrets provide AWS credentials:
  - Preferred: `AWS_ROLE_TO_ASSUME` for OIDC plus `AWS_REGION`.
  - Or: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`.

## Bootstrap

1. Go to **Actions → Runner SSM Bootstrap**.
2. Enter:
   - `instance_id` – EC2 instance ID.
   - `region` – AWS region (default `us-east-1`).
   - `labels` – comma separated runner labels.
   - `runner_user` – Linux user for the runner.
   - `runner_version` – runner version (default latest).

The workflow fetches a short‑lived registration token, sends an SSM command that installs and configures the runner idempotently, and starts a systemd service. Logs are stored on the instance at `/var/log/actions-runner-bootstrap.log`.

## Verification

After the workflow completes:

- Visit **Settings → Actions → Runners** and confirm a runner with the specified labels.
- Run **Actions → Self-hosted runner probe** to execute a job on the runner.

## Using the runner

Reference the runner in other workflows with:

```yaml
runs-on: [self-hosted, linux, x64, mvp-gh-runner]
```

## Rollback

```bash
sudo systemctl disable --now actions-runner
sudo rm -rf /opt/actions-runner
```

## Security

- The registration token is short‑lived and passed via SSM parameters.
- Prefer OIDC with `AWS_ROLE_TO_ASSUME` instead of long‑lived access keys.
