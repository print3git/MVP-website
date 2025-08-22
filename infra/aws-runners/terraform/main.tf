locals {
  runner_labels       = ["self-hosted", "linux", "x64", "ephemeral", "aws-ec2"]
  runner_label_string = join(",", local.runner_labels)
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github" {
  name = "github-oidc-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" },
        StringLike   = { "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*" }
      }
    }]
  })
}

resource "aws_security_group" "runner" {
  name        = "github-runner-sg"
  description = "Security group for GitHub Actions runners"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "runner" {
  name = "github-runner-instance-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "ec2.amazonaws.com" },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "runner_ssm" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "runner_logs" {
  name = "github-runner-logs"
  role = aws_iam_role.runner.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      Resource = "*"
    }]
  })
}

resource "aws_iam_instance_profile" "runner" {
  name = "github-runner-instance-profile"
  role = aws_iam_role.runner.name
}

resource "aws_cloudwatch_log_group" "runner" {
  name              = "/github/actions-runner"
  retention_in_days = 14
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
  name_prefix            = "github-runner-"
  image_id               = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.runner.id]
  iam_instance_profile { name = aws_iam_instance_profile.runner.name }

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    runner_labels         = local.runner_label_string,
    runner_token_parameter = var.runner_token_ssm_name,
    runner_url_parameter   = var.runner_url_ssm_name,
    log_group             = aws_cloudwatch_log_group.runner.name
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "github-runner"
    }
  }
}

resource "aws_autoscaling_group" "runner" {
  name                = "github-runner-asg"
  min_size            = 0
  desired_capacity    = 0
  max_size            = var.max_size
  vpc_zone_identifier = var.subnet_ids

  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.runner.id
        version            = "$Latest"
      }
    }
    instances_distribution {
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "capacity-optimized"
    }
  }

  tag {
    key                 = "Name"
    value               = "github-runner"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_sns_topic" "lifecycle" {
  name = "github-runner-lifecycle"
}

resource "aws_autoscaling_lifecycle_hook" "terminate" {
  name                   = "github-runner-terminate"
  autoscaling_group_name = aws_autoscaling_group.runner.name
  lifecycle_transition   = "autoscaling:EC2_INSTANCE_TERMINATING"
  default_result         = "CONTINUE"
  heartbeat_timeout      = 300
  notification_target_arn = aws_sns_topic.lifecycle.arn
  notification_metadata   = jsonencode({ action = "deregister" })
}
