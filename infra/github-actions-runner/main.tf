data "aws_ami" "al2023" {
  owners      = ["amazon"]
  most_recent = true

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_security_group" "runner" {
  name_prefix = "gha-runner-"
  description = "Security group for GitHub Actions runners"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_ingress_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_iam_policy_document" "assume" {
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
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "runner" {
  statement {
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_token_parameter}"]
  }
}

resource "aws_iam_policy" "runner" {
  name_prefix = "gha-runner-"
  policy      = data.aws_iam_policy_document.runner.json
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "custom" {
  role       = aws_iam_role.runner.name
  policy_arn = aws_iam_policy.runner.arn
}

resource "aws_iam_instance_profile" "runner" {
  name_prefix = "gha-runner-"
  role        = aws_iam_role.runner.name
}

resource "aws_launch_template" "runner" {
  name_prefix   = "gha-runner-"
  image_id      = var.runner_ami_id != "" ? var.runner_ami_id : data.aws_ami.al2023.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.runner.name
  }

  instance_market_options {
    market_type = "spot"
    spot_options {
      instance_interruption_behavior = "terminate"
    }
  }

  user_data = base64encode(
    templatefile("${path.module}/userdata.sh", {
      repo_owner          = var.repo_owner,
      repo_name           = var.repo_name,
      labels              = join(",", var.runner_labels),
      ssm_token_parameter = var.ssm_token_parameter
    })
  )
}

resource "aws_autoscaling_group" "runner" {
  name_prefix          = "gha-runner-"
  max_size             = 3
  min_size             = 0
  desired_capacity     = 0
  vpc_zone_identifier  = var.subnet_ids
  health_check_type    = "EC2"
  force_delete         = true
  launch_template {
    id      = aws_launch_template.runner.id
    version = "$Latest"
  }
}

resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${aws_autoscaling_group.runner.name}-scale-up"
  autoscaling_group_name = aws_autoscaling_group.runner.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 60
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${aws_autoscaling_group.runner.name}-scale-down"
  autoscaling_group_name = aws_autoscaling_group.runner.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 300
}

resource "aws_cloudwatch_metric_alarm" "queue_high" {
  alarm_name          = "${aws_autoscaling_group.runner.name}-queue-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = var.queue_length_metric_name
  namespace           = var.metric_namespace
  period              = 60
  statistic           = "Average"
  threshold           = 1
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]
}

resource "aws_cloudwatch_metric_alarm" "queue_low" {
  alarm_name          = "${aws_autoscaling_group.runner.name}-queue-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = var.queue_length_metric_name
  namespace           = var.metric_namespace
  period              = 300
  statistic           = "Average"
  threshold           = 1
  alarm_actions       = [aws_autoscaling_policy.scale_down.arn]
}
