# Self-hosted GitHub Runner

This directory contains Terraform configuration to provision an EC2 instance that registers itself as a GitHub Actions runner.

## Authentication

You can authenticate to AWS in two ways:

1. **GitHub → AWS OIDC (recommended)** – configure a role that trusts `token.actions.githubusercontent.com` and grant the repo permission to assume it.
2. **Temporary AWS keys in repo secrets** – store short-lived IAM user keys in repository secrets.

When using keys, set the following secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

Regardless of auth method, a registration token is required for the runner to register with your repository. Set `GH_RUNNER_REG_TOKEN` in the repository secrets. Use a fine-grained personal access token or a short-lived token fetched from the GitHub UI.

## Bootstrap steps

1. Choose an authentication method and configure the required secrets.
2. From the Actions tab, run the provided workflow to **plan** the Terraform changes.
3. After reviewing the plan, run the **apply** workflow to create the resources.
4. To tear down the runner, run the **destroy** workflow.

These CI workflows will be added in later prompts.

## Costs

The default instance type is `t3.small`, which costs roughly USD $15–18 per month. To reduce cost, change the instance type to `t3.micro` in the Terraform variables before applying.

## Security notes

- Grant the IAM role/user only the permissions required for the runner (least privilege).
- Rotate `GH_RUNNER_REG_TOKEN` regularly.
- Prefer AWS Systems Manager Session Manager for access; avoid opening SSH ports.
- If using static credentials, rotate them frequently and scope them narrowly.
