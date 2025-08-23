# EC2 SSM + GitHub Runner Bootstrap

"Managed instances" are EC2 hosts registered with AWS Systems Manager (SSM). They can be patched, accessed with Session Manager, and used to host GitHub self-hosted runners.

## Prepare the instance
1. Attach an IAM instance profile that includes the **AmazonSSMManagedInstanceCore** policy.
2. On the EC2 host, verify SSM connectivity:

```bash
curl -O https://raw.githubusercontent.com/print3git/MVP-website/main/scripts/ssm/verify-ssm.kp4mz8e1s3uf.sh && bash verify-ssm.kp4mz8e1s3uf.sh
```

## Bootstrap a GitHub runner
Provide `GH_REPO` and a GitHub PAT via env vars or SSM Parameter Store.

```bash
GH_REPO=owner/repo GH_PAT=ghp_yourtoken \
  curl -O https://raw.githubusercontent.com/print3git/MVP-website/main/scripts/runner/bootstrap-runner.kp4mz8e1s3uf.sh && bash bootstrap-runner.kp4mz8e1s3uf.sh
```

`RUNNER_LABELS` and `RUNNER_VERSION` may be set before running the script. To fetch the PAT from Parameter Store, set `GH_PAT_SSM_PARAM` instead of `GH_PAT`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Not in **Managed instances** | Check IAM instance profile, `systemctl status amazon-ssm-agent`, and `journalctl -u amazon-ssm-agent`. |
| Runner not appearing in GitHub | Confirm PAT/SSM parameter and inspect `journalctl -u github-runner`. |
| Private subnet | Use SSM Session Manager; SSH access (port 22) is not required. |
