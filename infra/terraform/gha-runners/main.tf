provider "aws" {
  region = var.region
}

provider "github" {
  token = var.github_token
  owner = var.repo_owner
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_security_group" "runner" {
  name_prefix = "gha-runner-"
  description = "Security group for GitHub Actions runners"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_iam_policy_document" "instance_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "runner" {
  name_prefix        = "gha-runner-"
  assume_role_policy = data.aws_iam_policy_document.instance_assume.json
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "runner" {
  name_prefix = "gha-runner-"
  role        = aws_iam_role.runner.name
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.repo_owner}/${var.repo_name}:*"]
    }
  }
}

resource "aws_iam_role" "github" {
  name               = "gha-runners-terraform"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

resource "aws_iam_role_policy_attachment" "github_admin" {
  role       = aws_iam_role.github.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_sqs_queue" "scale_requests" {
  name = "gha-scale-requests"
}

data "aws_ami" "ubuntu" {
  owners      = ["099720109477"]
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_launch_template" "runner" {
  name_prefix   = "gha-runner-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.runner.name
  }

  user_data = base64encode(
    templatefile("${path.module}/userdata.sh", {
      repo_url     = "https://github.com/${var.repo_owner}/${var.repo_name}"
      runner_group = var.runner_group
      github_token = var.github_token
    })
  )
}

resource "aws_autoscaling_group" "runners" {
  name_prefix         = "gha-runners-"
  min_size            = 3
  max_size            = 20
  desired_capacity    = 3
  vpc_zone_identifier = var.subnet_ids

  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.runner.id
        version            = "$Latest"
      }
    }

    instances_distribution {
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "capacity-optimized"
    }
  }

  tag {
    key                 = "Name"
    value               = "gha-runner"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_policy" "scale_out" {
  name                   = "gha-runners-scale-out"
  autoscaling_group_name = aws_autoscaling_group.runners.name
  policy_type            = "SimpleScaling"
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 60
}

resource "aws_autoscaling_policy" "scale_in" {
  name                   = "gha-runners-scale-in"
  autoscaling_group_name = aws_autoscaling_group.runners.name
  policy_type            = "SimpleScaling"
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 300
}

resource "aws_cloudwatch_metric_alarm" "queue_high" {
  alarm_name          = "${aws_sqs_queue.scale_requests.name}-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  dimensions = {
    QueueName = aws_sqs_queue.scale_requests.name
  }
  alarm_actions = [aws_autoscaling_policy.scale_out.arn]
}

resource "aws_cloudwatch_metric_alarm" "queue_low" {
  alarm_name          = "${aws_sqs_queue.scale_requests.name}-low"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 0
  dimensions = {
    QueueName = aws_sqs_queue.scale_requests.name
  }
  alarm_actions = [aws_autoscaling_policy.scale_in.arn]
}
data "external" "token" {
  program = [
    "bash",
    "-c",
    format(
      "curl -fsSL -X POST -H 'Authorization: Bearer %s' https://api.github.com/repos/%s/%s/actions/runners/registration-token | jq -c '{token: .token}'",
      var.github_token,
      var.repo_owner,
      var.repo_name
    )
  ]
}
