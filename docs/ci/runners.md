# Self-hosted CI runners

This folder contains the Terraform configuration for managing GitHub Actions
runners on AWS. The infrastructure creates a VPC, subnets and a launch template
that boots an AMI with the runner service, Node 20, pnpm, Chrome/Chromium,
Playwright dependencies and Docker.

## Terraform

```bash
cd infra/selfhosted-runners/terraform
terraform init
terraform apply -var="repo_url=github.com/ORG/REPO" -var="ami_id=ami-123456"
```

The module provisions three Auto Scaling Groups:

| Group  | Default min | Default max | Labels                |
| ------ | ----------- | ----------- | --------------------- |
| small  | 2           | 10          | `ci-small,linux,x64`  |
| medium | 1           | 6           | `ci-medium,linux,x64` |
| large  | 0           | 4           | `ci-large,linux,x64`  |

Each group scales up when the `CI/Capacity` metric `PendingJobs` is greater than
zero and scales down when the custom `IdleRunners` metric reports idle
instances. A scheduled action can set capacity to zero outside business hours by
adjusting the `off_hours_cron` variable.

## AMI

The launch template expects an AMI preloaded with:

- GitHub `actions-runner` service installed as user `runner`
- Node.js 20 and `pnpm`
- Google Chrome/Chromium and Playwright dependencies
- Docker (optional but recommended)
- CloudWatch agent for logs and metrics

An AMI can be produced with a manual EC2 build or a Packer template. After
building an image, update the `ami_id` variable when applying Terraform.

## Cost and scaling

Auto Scaling Groups are configured for on‑demand instances. Review instance
sizes and desired counts to control cost. Off‑hours schedules combined with
automatic scale down on idle runners help keep usage minimal.

## Token rotation

The userdata script obtains an ephemeral registration token for every instance
at boot. Repository registration tokens can be rotated from the GitHub UI or by
regenerating the PAT used by the bootstrapping script.
