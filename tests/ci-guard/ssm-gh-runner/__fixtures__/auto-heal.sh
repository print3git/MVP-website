#!/bin/bash
aws ssm send-command --document-name AWS-RunShellScript --parameters commands='sudo systemctl restart gh-runner' --instance-ids "$1"
