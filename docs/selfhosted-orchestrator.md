# Self-hosted capacity orchestrator

> **AWS setup is manual.** All infrastructure (IAM role, Auto Scaling Group, SSM parameters) must be provisioned outside this repository.

This repository ships a set of GitHub Actions workflows to scale EC2 runners on demand using OIDC.

## Configuration

Set the following repository or environment variables (no secrets required):

- `AWS_ROLE_TO_ASSUME` – IAM role assumed via GitHub OIDC. The role must trust GitHub and allow the permissions below.
- `ASG_NAME` – Name of the Auto Scaling Group containing the EC2 runner instances (e.g. `MVP-GH-Runners`).
- `AWS_REGION` – AWS region where the Auto Scaling Group lives (default `us-east-1`).

You can override these at runtime via workflow `env` or `vars` if needed.

### Minimal IAM permissions

The IAM role requires only read and scale permissions:

- `ec2:Describe*`
- `autoscaling:Describe*`
- `autoscaling:SetDesiredCapacity`

## Workflows

- `scale-out-on-queue.yml` – bumps the ASG to ensure at least one runner is ready when a job with the `self-hosted, linux, x64, mvp-gh-runner` label is queued.
- `scale-in-idle.yml` – periodically scales the ASG back to zero when the repository has been idle.
- `_ci-shared.yml` – reusable workflow that prefers self-hosted runners but cleanly falls back to `ubuntu-latest` after a configurable queue time.
- `selfhosted-probe.yml` – manually trigger to print runner context and verify wiring.
- `selfhosted-guard.yml` – lints workflows to ensure Full CI/Lane jobs use the shared workflow or include the self-hosted label set.

These workflows are idempotent and contain no secrets. All AWS-side resources must be created separately.
