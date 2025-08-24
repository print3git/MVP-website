# GitHub Actions Runner on AWS

This module provisions an ephemeral self-hosted GitHub Actions runner on a single EC2 instance. It can create its own VPC or attach to an existing one and registers itself using tokens stored in SSM Parameter Store.

## Setup

1. **Create SSM parameters**
   ```bash
   aws ssm put-parameter --name /github/runner/url --type String --value https://github.com/print3git/MVP-website
   aws ssm put-parameter --name /github/runner/registration-token --type String --value <TOKEN> --overwrite
   ```
   Retrieve a registration token from the repository's **Settings → Actions → Runners** page.
2. **Deploy with Terraform**
   ```bash
   cd infra/gh-runner-aws
   terraform init && terraform apply
   # or
   make apply
   ```
3. **Verify the runner** – it should appear under your repository's self-hosted runners with the labels configured in `runner_labels`.
4. **Use the labels in workflows**
   ```yaml
   runs-on: [self-hosted, linux, aws, mvp-gh-runner]
   ```
5. **Costs & teardown** – the default `t3.small` incurs hourly charges. Enable `use_spot` or `off_hours` to reduce cost. Destroy the runner when finished:
   ```bash
   make destroy
   ```

## Metrics and scaling

- A Lambda function (`queue-metric`) polls the repository every minute and pushes a CloudWatch metric `QueuedJobs`.
- The autoscaling group applies a target tracking policy on this metric: it scales out when queued jobs are present and scales in after 10 minutes of zero queued jobs.
- Instances are tagged with `runner=gha` for safe identification.

## Variables

See [`variables.tf`](variables.tf) for customization options including VPC creation, instance type, labels and scheduling.
