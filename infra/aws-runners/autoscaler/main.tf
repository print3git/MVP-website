terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

locals {
  lambda_zip = data.archive_file.lambda.output_path
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}"
  excludes    = ["main.tf", "variables.tf", "README.md", "outputs.tf"]
  output_path = "${path.module}/lambda.zip"
}

resource "aws_iam_role" "autoscaler" {
  name               = "runner-autoscaler-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "autoscaler" {
  name = "runner-autoscaler-policy"
  role = aws_iam_role.autoscaler.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["autoscaling:UpdateAutoScalingGroup", "autoscaling:DescribeAutoScalingGroups"],
      Resource = "*"
    }]
  })
}

resource "aws_lambda_function" "autoscaler" {
  function_name = "runner-autoscaler"
  role          = aws_iam_role.autoscaler.arn
  handler       = "lambda.handler"
  runtime       = "python3.11"
  filename      = local.lambda_zip

  environment {
    variables = {
      GITHUB_OWNER     = var.github_owner
      GITHUB_REPO      = var.github_repo
      GITHUB_TOKEN     = var.github_token
      ASG_NAME         = var.asg_name
      MAX_RUNNERS      = tostring(var.max_runners)
      BURST_MULTIPLIER = tostring(var.burst_multiplier)
      LABEL_QUOTAS     = jsonencode(var.label_quotas)
    }
  }
}

resource "aws_cloudwatch_event_rule" "autoscaler" {
  name                = "runner-autoscaler-schedule"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "autoscaler" {
  rule      = aws_cloudwatch_event_rule.autoscaler.name
  target_id = "runner-autoscaler"
  arn       = aws_lambda_function.autoscaler.arn
}

resource "aws_lambda_permission" "events" {
  statement_id  = "AllowExecutionFromEvents"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.autoscaler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.autoscaler.arn
}
