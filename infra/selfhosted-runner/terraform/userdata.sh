#!/bin/bash
set -euo pipefail

dnf update -y
dnf install -y git curl tar amazon-cloudwatch-agent

curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

mkdir -p /actions-runner
cd /actions-runner

RUNNER_VERSION=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | grep tag_name | cut -d '"' -f4)
ARCH="linux-x64"
curl -fsSL -o actions-runner.tar.gz https://github.com/actions/runner/releases/download/${RUNNER_VERSION}/actions-runner-${ARCH}-${RUNNER_VERSION#v}.tar.gz
tar xzf actions-runner.tar.gz
./bin/installdependencies.sh

./config.sh --url https://github.com/${repo_owner}/${repo_name} --token ${GH_RUNNER_REG_TOKEN} --labels ${labels} --unattended

./svc.sh install
./svc.sh start

cat <<EOF >/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/actions-runner/_diag/*.log",
            "log_group_name": "${log_group}",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "metrics_collected": {
      "mem": {
        "measurement": [
          { "name": "mem_used_percent", "unit": "Percent" }
        ]
      }
    }
  }
}
EOF

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
