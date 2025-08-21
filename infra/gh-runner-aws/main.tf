terraform {
  required_version = ">= 1.3.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  tags = {
    Project    = var.project
    Repository = "${var.owner}/${var.repo}"
  }
  labels    = join(",", var.runner_labels)
  user_data = <<-EOT
    #!/bin/bash
    set -euo pipefail
    mkdir -p /var/log/github-runner
    exec > >(tee /var/log/github-runner/runner.log) 2>&1

    apt-get update
    apt-get install -y curl jq git unzip awscli
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    corepack enable

    useradd -m actions-runner
    cd /home/actions-runner
    latest=$$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r '.tag_name')
    curl -L -o actions-runner.tar.gz https://github.com/actions/runner/releases/download/$${latest}/actions-runner-linux-x64-$${latest#v}.tar.gz
    tar xzf actions-runner.tar.gz
    rm actions-runner.tar.gz
    chown -R actions-runner:actions-runner /home/actions-runner

    token=$$(aws ssm get-parameter --name /github/runner/registration-token --with-decryption --query 'Parameter.Value' --output text)
    url=$$(aws ssm get-parameter --name /github/runner/url --query 'Parameter.Value' --output text)
    su - actions-runner -c "./config.sh --url $$url --token $$token --labels ${local.labels} --ephemeral --unattended"
    su - actions-runner -c "sudo ./svc.sh install"
    su - actions-runner -c "sudo ./svc.sh start"
    unset token url
  EOT
}

resource "aws_vpc" "this" {
  count                = var.create_vpc ? 1 : 0
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags                 = merge(local.tags, { Name = "${var.project}-runner-vpc" })
}

resource "aws_subnet" "public" {
  count                   = var.create_vpc ? 2 : 0
  vpc_id                  = aws_vpc.this[0].id
  cidr_block              = cidrsubnet(aws_vpc.this[0].cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = merge(local.tags, { Name = "${var.project}-runner-subnet-${count.index}" })
}

resource "aws_internet_gateway" "this" {
  count  = var.create_vpc ? 1 : 0
  vpc_id = aws_vpc.this[0].id
  tags   = merge(local.tags, { Name = "${var.project}-runner-igw" })
}

resource "aws_route_table" "public" {
  count  = var.create_vpc ? 1 : 0
  vpc_id = aws_vpc.this[0].id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this[0].id
  }
  tags = merge(local.tags, { Name = "${var.project}-runner-rt" })
}

resource "aws_route_table_association" "public" {
  count          = var.create_vpc ? 2 : 0
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

locals {
  vpc_id     = var.create_vpc ? aws_vpc.this[0].id : var.existing_vpc_id
  subnet_ids = var.create_vpc ? aws_subnet.public[*].id : var.subnet_ids
}

resource "aws_security_group" "runner" {
  name        = "${var.project}-runner-sg"
  description = "Egress-only security group for GitHub runner"
  vpc_id      = local.vpc_id
  tags        = merge(local.tags, { Name = "${var.project}-runner-sg" })

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "aws_iam_role" "runner" {
  name = "${var.project}-runner-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy" "runner" {
  name = "${var.project}-runner-policy"
  role = aws_iam_role.runner.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["ssm:GetParameter"]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/github/runner/registration-token",
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/github/runner/url"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/github/runner/*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "runner" {
  name = "${var.project}-runner-profile"
  role = aws_iam_role.runner.name
}

resource "aws_cloudwatch_log_group" "runner" {
  name              = "/github/runner/${var.project}"
  retention_in_days = 14
  tags              = local.tags
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_launch_template" "runner" {
  name_prefix            = "${var.project}-runner-"
  image_id               = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.runner.id]
  iam_instance_profile { name = aws_iam_instance_profile.runner.name }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  dynamic "instance_market_options" {
    for_each = var.use_spot ? [1] : []
    content {
      market_type = "spot"
      spot_options {
        instance_interruption_behavior = "terminate"
      }
    }
  }

  user_data = base64encode(local.user_data)
  tag_specifications {
    resource_type = "instance"
    tags          = merge(local.tags, { Name = "${var.project}-runner" })
  }
}

resource "aws_autoscaling_group" "runner" {
  name                = "${var.project}-runner-asg"
  desired_capacity    = 1
  max_size            = 1
  min_size            = 0
  vpc_zone_identifier = local.subnet_ids
  launch_template {
    id      = aws_launch_template.runner.id
    version = "$Latest"
  }
  tag {
    key                 = "Name"
    value               = "${var.project}-runner"
    propagate_at_launch = true
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_schedule" "scale_down" {
  count                  = var.off_hours ? 1 : 0
  scheduled_action_name  = "${var.project}-runner-off"
  min_size               = 0
  max_size               = 0
  desired_capacity       = 0
  recurrence             = "0 22 * * *"
  autoscaling_group_name = aws_autoscaling_group.runner.name
}

resource "aws_autoscaling_schedule" "scale_up" {
  count                  = var.off_hours ? 1 : 0
  scheduled_action_name  = "${var.project}-runner-on"
  min_size               = 0
  max_size               = 1
  desired_capacity       = 1
  recurrence             = "0 6 * * *"
  autoscaling_group_name = aws_autoscaling_group.runner.name
}
