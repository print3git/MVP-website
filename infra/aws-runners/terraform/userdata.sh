#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/github-runner.log) 2>&1

apt-get update
apt-get install -y curl jq git
curl -Lo /tmp/amazon-cloudwatch-agent.deb https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i /tmp/amazon-cloudwatch-agent.deb

useradd -m runner
cd /home/runner
latest=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r '.tag_name')
curl -L -o actions-runner.tar.gz https://github.com/actions/runner/releases/download/${latest}/actions-runner-linux-x64-${latest#v}.tar.gz
tar xzf actions-runner.tar.gz
rm actions-runner.tar.gz
chown -R runner:runner /home/runner

token=$(aws ssm get-parameter --name "${runner_token_parameter}" --with-decryption --query 'Parameter.Value' --output text)
url=$(aws ssm get-parameter --name "${runner_url_parameter}" --query 'Parameter.Value' --output text)

su - runner -c "./config.sh --url $url --token $token --unattended --ephemeral --labels ${runner_labels}"
su - runner -c "nohup ./run.sh &"

cat >/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<CONFIG
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/github-runner.log",
            "log_group_name": "${log_group}",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
CONFIG

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
