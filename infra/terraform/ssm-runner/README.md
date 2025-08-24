# SSM Runner Infrastructure

This module provisions IAM roles for running commands on EC2 instances through AWS Systems Manager (SSM) and for invoking SSM from GitHub Actions.

## Usage

1. Initialize Terraform:

```sh
terraform init
```

2. Review the changes:

```sh
terraform plan \
  -var "region=us-east-1" \
  -var "repo_owner=your-org" \
  -var "repo_name=your-repo"
```

3. Apply the changes:

```sh
terraform apply \
  -var "region=us-east-1" \
  -var "repo_owner=your-org" \
  -var "repo_name=your-repo"
```

The module outputs the ARNs of the created IAM roles and instance profile.
