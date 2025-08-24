#!/usr/bin/env bash
set -euo pipefail

# Verify EC2 instance registration with AWS Systems Manager

# Acquire IMDSv2 token
TOKEN=$(curl -sS --retry 3 -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" http://169.254.169.254/latest/api/token || true)
imdsv2() {
  curl -sS -H "X-aws-ec2-metadata-token: $TOKEN" "$1" 2>/dev/null || true
}

REGION=$(imdsv2 http://169.254.169.254/latest/meta-data/placement/region)
INSTANCE_ID=$(imdsv2 http://169.254.169.254/latest/meta-data/instance-id)
IAM_ROLE=$(imdsv2 http://169.254.169.254/latest/meta-data/iam/security-credentials/)

echo "Region: ${REGION:-unknown}"
echo "Instance ID: ${INSTANCE_ID:-unknown}"
echo "IAM role: ${IAM_ROLE:-none}"

# Ensure SSM agent is installed and running
if ! rpm -q amazon-ssm-agent >/dev/null 2>&1; then
  sudo dnf install -y amazon-ssm-agent
fi
sudo systemctl enable --now amazon-ssm-agent

# Check agent status and logs
sudo systemctl status amazon-ssm-agent --no-pager || true
journalctl -u amazon-ssm-agent -n 50 --no-pager || true

# IAM diagnostics
if [[ -z "$IAM_ROLE" ]]; then
  echo "No IAM instance profile attached."
  echo "---"
  echo "Remediation: Attach an IAM instance profile with policy AmazonSSMManagedInstanceCore."
  echo "---"
fi

# Network diagnostics
SGS=$(imdsv2 http://169.254.169.254/latest/meta-data/security-groups)
echo "Security groups: ${SGS:-unknown}"
if awk '$1 == "Iface" {next} $1=="00000000" {found=1} END{exit !found}' /proc/net/route; then
  echo "Default route present"
else
  echo "No default route found"
fi

# Optional AWS CLI check
if command -v aws >/dev/null 2>&1 && [[ -n "$REGION" && -n "$INSTANCE_ID" ]]; then
  aws ssm describe-instance-information --max-results 5 --region "$REGION" | grep "$INSTANCE_ID" || true
fi

AGENT_ACTIVE=$(systemctl is-active amazon-ssm-agent || true)
if [[ "$AGENT_ACTIVE" == "active" && -n "$IAM_ROLE" ]]; then
  echo "PASS: SSM agent active and instance profile detected."
  exit 0
else
  echo "FAIL: SSM agent state=$AGENT_ACTIVE, IAM role=${IAM_ROLE:-none}"
  echo "Next steps: ensure amazon-ssm-agent is running and an instance profile with AmazonSSMManagedInstanceCore is attached."
  exit 1
fi
