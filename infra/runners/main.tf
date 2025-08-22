provider "aws" {}

data "aws_ami" "al2023" {
  owners      = ["137112412989"]
  most_recent = true

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

resource "aws_cloudwatch_log_group" "runner" {
  name              = "/github/runner"
  retention_in_days = 14
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
  name_prefix        = "aws-ephemeral-runner-"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "runner" {
  statement {
    actions   = ["ssm:GetParameter"]
    resources = ["*"]
  }

  statement {
    actions = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = [
      aws_cloudwatch_log_group.runner.arn,
      "${aws_cloudwatch_log_group.runner.arn}:*"
    ]
  }
}

resource "aws_iam_policy" "runner" {
  name   = "aws-ephemeral-runner"
  policy = data.aws_iam_policy_document.runner.json
}

resource "aws_iam_role_policy_attachment" "runner" {
  role       = aws_iam_role.runner.name
  policy_arn = aws_iam_policy.runner.arn
}

resource "aws_iam_instance_profile" "runner" {
  name_prefix = "aws-ephemeral-runner-"
  role        = aws_iam_role.runner.name
}

resource "aws_ssm_parameter" "config" {
  name  = "/github/runner/config"
  type  = "String"
  value = jsonencode({
    repo_url   = var.repo_url
    token_path = var.token_path
  })
}

resource "aws_launch_template" "runner" {
  name_prefix   = "aws-ephemeral-runner-"
  image_id      = data.aws_ami.al2023.id
  instance_type = var.instance_type
  user_data     = base64encode(templatefile("${path.module}/user-data.sh", { ssm_param = aws_ssm_parameter.config.name }))
  iam_instance_profile { name = aws_iam_instance_profile.runner.name }
  instance_market_options {
    market_type = "spot"
  }
}

resource "aws_autoscaling_group" "runner" {
  name                      = "aws-ephemeral-runner"
  min_size                  = 0
  max_size                  = 5
  desired_capacity          = var.desired_capacity
  vpc_zone_identifier       = var.subnet_ids
  launch_template {
    id      = aws_launch_template.runner.id
    version = "$Latest"
  }
  new_instances_protected_from_scale_in = false
}
