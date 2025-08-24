provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

resource "aws_vpc" "runners" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "gh-runner-vpc" }
}

resource "aws_subnet" "runners" {
  for_each = { for idx, cidr in var.subnet_cidrs : idx => cidr }
  vpc_id            = aws_vpc.runners.id
  cidr_block        = each.value
  map_public_ip_on_launch = true
  tags = { Name = "gh-runner-${each.key}" }
}

resource "aws_security_group" "runners" {
  name        = "gh-runner-sg"
  description = "Egress only; no inbound"
  vpc_id      = aws_vpc.runners.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_cloudwatch_log_group" "runner" {
  name              = "/github/self-hosted-runners"
  retention_in_days = 14
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

resource "aws_iam_role" "instance" {
  name               = "gh-runner-instance"
  assume_role_policy = data.aws_iam_policy_document.instance_assume.json
}

resource "aws_iam_policy" "instance" {
  name   = "gh-runner-instance"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = ["ssm:GetParameter"],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = ["cloudwatch:PutMetricData"],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "instance" {
  role       = aws_iam_role.instance.name
  policy_arn = aws_iam_policy.instance.arn
}

resource "aws_iam_instance_profile" "runner" {
  name = "gh-runner-instance-profile"
  role = aws_iam_role.instance.name
}

data "template_file" "userdata" {
  for_each = var.asg_configs
  template = file("${path.module}/../userdata/runner.sh")
  vars = {
    repo_url = var.repo_url
    labels   = each.value.labels
  }
}

resource "aws_launch_template" "runner" {
  for_each      = var.asg_configs
  name_prefix   = "gh-runner-${each.key}-"
  image_id      = var.ami_id
  instance_type = each.value.instance_type
  user_data     = base64encode(data.template_file.userdata[each.key].rendered)
  iam_instance_profile { name = aws_iam_instance_profile.runner.name }
  vpc_security_group_ids = [aws_security_group.runners.id]
}

resource "aws_autoscaling_group" "runners" {
  for_each            = var.asg_configs
  name                = "gh-runner-${each.key}"
  max_size            = each.value.max_size
  min_size            = each.value.min_size
  desired_capacity    = each.value.desired_size
  vpc_zone_identifier = values(aws_subnet.runners)[*].id
  launch_template {
    id      = aws_launch_template.runner[each.key].id
    version = "$Latest"
  }
  tag {
    key                 = "Name"
    value               = "gh-runner-${each.key}"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_schedule" "off_hours" {
  for_each               = aws_autoscaling_group.runners
  scheduled_action_name  = "scale-to-zero-${each.key}"
  min_size               = 0
  desired_capacity       = 0
  recurrence             = var.off_hours_cron
  autoscaling_group_name = each.value.name
}

resource "aws_autoscaling_policy" "scale_up" {
  for_each               = aws_autoscaling_group.runners
  name                   = "${each.key}-scaleup"
  autoscaling_group_name = each.value.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
}

resource "aws_cloudwatch_metric_alarm" "scale_up" {
  for_each            = aws_autoscaling_group.runners
  alarm_name          = "${each.key}-pending-jobs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "PendingJobs"
  namespace           = "CI/Capacity"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_actions       = [aws_autoscaling_policy.scale_up[each.key].arn]
}

resource "aws_autoscaling_policy" "scale_down" {
  for_each               = aws_autoscaling_group.runners
  name                   = "${each.key}-scaledown"
  autoscaling_group_name = each.value.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
}

resource "aws_cloudwatch_metric_alarm" "scale_down" {
  for_each            = aws_autoscaling_group.runners
  alarm_name          = "${each.key}-idle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "IdleRunners"
  namespace           = "CI/Capacity"
  period              = 300
  statistic           = "Average"
  threshold           = 0
  alarm_actions       = [aws_autoscaling_policy.scale_down[each.key].arn]
}
