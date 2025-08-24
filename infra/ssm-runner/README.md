# SSM Runner IAM Role

Attach the role defined by `iam-instance-profile.json` to EC2 instances that will host self‑hosted GitHub Actions runners. It grants the managed policy `AmazonSSMManagedInstanceCore` and basic CloudWatch Logs write access so the instance can be managed via AWS Systems Manager without opening SSH.

GitHub workflows in this repository assume AWS IAM roles via OpenID Connect; no long‑lived AWS keys are stored. Provide the role ARN to the workflows through repository secrets or variables, and they will request temporary credentials at runtime.
