# Minimal self-hosted runner on EC2

Launch an Ubuntu 24.04 instance and supply these tags or environment variables:

- `GITHUB_OWNER` – repository owner
- `GITHUB_REPO` – repository name
- `GITHUB_LABELS` – runner labels (default `self-hosted,linux,x64,aws-runner`)
- `RUNNER_NAME` – runner name (defaults to instance ID)
- `RUNNER_VERSION` – GitHub runner release version
- one of `SSM_TOKEN_PATH` (path to registration token in SSM Parameter Store) or `GITHUB_PAT` (personal access token)

If using SSM, attach an IAM role with `ssm:GetParameter` permission for the parameter path.

To bootstrap:

1. Paste [`infra/ec2/user-data.sh`](../infra/ec2/user-data.sh) into the **User data** field when creating the EC2 instance.
2. After launch, copy [`infra/ec2/systemd/github-runner.service`](../infra/ec2/systemd/github-runner.service) to `/etc/systemd/system/` and run:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now github-runner.service
   ```

The script installs the runner at `/opt/actions-runner`, registers it with GitHub using an ephemeral token, creates a `_work` directory, and logs setup to `/var/log/gh-runner/bootstrap.log`.
