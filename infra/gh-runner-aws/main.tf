# GitHub Actions runner on AWS EC2

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*"]
  }
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "runner" {
  name_prefix        = "${var.name}-role-"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "runner" {
  name = "${var.name}-profile"
  role = aws_iam_role.runner.name
}

resource "aws_security_group" "runner" {
  name_prefix = "${var.name}-sg-"
  description = "Security group for GitHub runner"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

locals {
  user_data = <<-EOT
    #!/bin/bash
    set -e

    dnf update -y
    dnf install -y docker
    systemctl enable --now docker

    useradd -m actions
    cd /home/actions
    RUNNER_VERSION="2.311.0"
    curl -L -o actions-runner.tar.gz https://github.com/actions/runner/releases/download/v$${RUNNER_VERSION}/actions-runner-linux-x64-$${RUNNER_VERSION}.tar.gz
    tar xzf actions-runner.tar.gz
    chown -R actions:actions /home/actions

    RUNNER_URL=$(aws ssm get-parameter --name /github/runner/url --with-decryption --query Parameter.Value --output text)
    TOKEN=$(aws ssm get-parameter --name /github/runner/registration-token --with-decryption --query Parameter.Value --output text)

    sudo -u actions ./config.sh --url "$RUNNER_URL" --token "$TOKEN" --labels "self-hosted,linux,aws,mvp-runner" --unattended
    sudo -u actions nohup ./run.sh >/var/log/actions-runner.log 2>&1 &
  EOT
}

resource "aws_instance" "runner" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.runner.id]
  iam_instance_profile   = aws_iam_instance_profile.runner.name
  user_data              = local.user_data

  tags = {
    Name = var.name
  }
}
