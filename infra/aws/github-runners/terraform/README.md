# AWS GitHub Runners

Terraform configuration for on‑demand ephemeral runners using [philips-labs/terraform-aws-github-runner](https://registry.terraform.io/modules/philips-labs/github-runner/aws/latest).

## Usage

```sh
terraform init
terraform apply \
  -var "github_app_id=0000" \
  -var "github_app_private_key=$(base64 < path/to/private-key.pem)" \
  -var "github_owner=your-org" \
  -var "github_repo=your-repo"
```

## Required GitHub App secrets

Create a GitHub App with access to the repository. Record:

- **App ID**
- **Private key** (base64 encoded)
- **Owner** and **repository** names

Pass these values via `terraform apply` as shown above or via a `terraform.tfvars` file.
