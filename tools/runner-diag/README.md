# Runner diagnostics

Self-hosted runners that execute CI jobs must register with the label `mvp-gh-runner` in addition to the standard `self-hosted`, `linux`, and `x64` labels.

If a workflow fails to locate a runner with these labels, jobs automatically fall back to `ubuntu-latest` hosted runners.

To rebuild or re-bootstrap an EC2 runner, trigger the existing **runner-ssm-bootstrap** workflow. It connects via AWS Systems Manager (SSM) to install the runner service and re-register it with the required labels.

Use the accompanying `selfhosted-runner-status` workflow to check which runners GitHub currently sees and confirm their labels and runner groups.
