# GitHub Actions OIDC setup

This directory contains IAM configuration for a self-hosted GitHub Actions runner that uses AWS role assumption via OpenID Connect (OIDC).

## Steps

1. **Create the OIDC identity provider** (only once per AWS account):

   ```sh
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list <thumbprint>
   ```

   Replace `<thumbprint>` with the current SHA1 thumbprint for `token.actions.githubusercontent.com`.

2. **Create an IAM role** that the runner will assume:

   ```sh
   aws iam create-role \
     --role-name <ROLE_NAME> \
     --assume-role-policy-document file://oidc-trust-policy.json
   ```

3. **Attach the instance policy** granting SSM and CloudWatch Logs permissions:

   ```sh
   aws iam put-role-policy \
     --role-name <ROLE_NAME> \
     --policy-name runner-instance \
     --policy-document file://runner-instance-role-policy.json
   ```

4. **Enable OIDC** in the runner configuration by setting `use_oidc: true`.

After these steps the self-hosted runner can exchange GitHub's OIDC token for temporary AWS credentials without storing long-lived secrets.
