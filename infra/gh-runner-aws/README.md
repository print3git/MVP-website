# GitHub Runner on AWS

Provision a minimal GitHub Actions runner on EC2.

This module creates:

- One Amazon Linux 2023 `t3.small` instance with Docker
- IAM role with SSM and CloudWatch policies
- Security group allowing egress only

The instance downloads the GitHub runner and registers itself using
parameters stored in AWS Systems Manager Parameter Store. It is labelled
`self-hosted,linux,aws,mvp-runner`.

## Prerequisites

Store the following parameters in SSM before applying:

```bash
aws ssm put-parameter \
  --name /github/runner/url \
  --type String \
  --value https://github.com/OWNER/REPO

aws ssm put-parameter \
  --name /github/runner/registration-token \
  --type SecureString \
  --value YOUR_TOKEN
```

The registration token is short lived and can be generated with
`gh api --method POST repos/OWNER/REPO/actions/runners/registration-token`.

## Usage

```bash
terraform init
terraform apply
```

No backend configuration is included; state is stored locally.
