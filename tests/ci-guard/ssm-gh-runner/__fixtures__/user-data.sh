#!/bin/bash
set -e
cat >/etc/systemd/system/gh-runner.service <<'UNIT'
[Unit]
Description=GitHub Actions Runner
[Service]
ExecStart=/opt/runner/run.sh
[Install]
WantedBy=multi-user.target
UNIT
systemctl enable gh-runner.service
