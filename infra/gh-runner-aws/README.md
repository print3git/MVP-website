# GitHub Actions Runner on AWS

This Terraform module provisions a single Amazon Linux 2023 EC2 instance
preconfigured as a GitHub Actions runner. The instance installs Docker and the
GitHub Actions runner software, then registers itself using parameters stored in
AWS Systems Manager Parameter Store.

The runner is created with the labels:
`self-hosted,linux,aws,mvp-runner`.

## Prerequisites

1. Configure AWS credentials and choose your region.
2. Store the following parameters in SSM Parameter Store:

```bash
aws ssm put-parameter --name /github/runner/url --type String \
  --value "https://github.com/OWNER/REPO"
aws ssm put-parameter --name /github/runner/registration-token \
  --type SecureString --value "TOKEN"
```

The `registration-token` value is obtained from the repository or organization
settings when adding a new self-hosted runner.

## Usage

```bash
cd infra/gh-runner-aws
terraform init
terraform apply
```

The module uses local state; no backend is configured.
