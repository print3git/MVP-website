variable "max_desired_capacity" {
  description = "Maximum desired capacity for runner Auto Scaling group"
  type        = number
  default     = 5
}

variable "budget_threshold" {
  description = "Monthly cost forecast threshold for alerts (USD)"
  type        = number
  default     = 100
}

variable "alarm_email" {
  description = "Email address for budget alerts"
  type        = string
  default     = ""
}

variable "scale_down_cron" {
  description = "Cron expression for nightly scale down"
  type        = string
  default     = "0 0 * * *"
}

variable "scale_up_cron" {
  description = "Cron expression for morning scale up"
  type        = string
  default     = "0 8 * * *"
}

variable "scale_timezone" {
  description = "Time zone for scaling actions"
  type        = string
  default     = "UTC"
}

variable "cache_bucket" {
  description = "Optional S3 bucket for runner cache"
  type        = string
  default     = ""
}

variable "strict_egress" {
  description = "Restrict egress traffic to allow list"
  type        = bool
  default     = false
}

resource "aws_autoscaling_schedule" "scale_to_zero" {
  scheduled_action_name  = "scale-down-night"
  autoscaling_group_name = module.github_runners.autoscaling_group_name
  min_size               = 0
  max_size               = var.max_desired_capacity
  desired_capacity       = 0
  recurrence             = var.scale_down_cron
  time_zone              = var.scale_timezone
}

resource "aws_autoscaling_schedule" "scale_up_morning" {
  scheduled_action_name  = "scale-up-day"
  autoscaling_group_name = module.github_runners.autoscaling_group_name
  min_size               = 0
  max_size               = var.max_desired_capacity
  desired_capacity       = var.min_runners
  recurrence             = var.scale_up_cron
  time_zone              = var.scale_timezone
}

resource "aws_sns_topic" "budget" {
  name = "github-runner-budget"
}

resource "aws_sns_topic_subscription" "budget_email" {
  count     = var.alarm_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.budget.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

resource "aws_budgets_budget" "monthly" {
  name         = "github-runner-budget"
  budget_type  = "COST"
  time_unit    = "MONTHLY"
  limit_amount = var.budget_threshold
  limit_unit   = "USD"

  notification {
    comparison_operator        = "GREATER_THAN"
    notification_type          = "FORECASTED"
    threshold                  = var.budget_threshold
    threshold_type             = "ABSOLUTE_VALUE"
    subscriber_sns_topic_arns  = [aws_sns_topic.budget.arn]
  }
}

data "aws_iam_policy_document" "runner" {
  statement {
    actions   = ["actions:GenerateRunnerToken"]
    resources = ["*"]
  }

  statement {
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["*"]
  }

  dynamic "statement" {
    for_each = var.cache_bucket == "" ? [] : [1]
    content {
      actions   = ["s3:GetObject", "s3:ListBucket"]
      resources = [
        "arn:aws:s3:::${var.cache_bucket}",
        "arn:aws:s3:::${var.cache_bucket}/*",
      ]
    }
  }
}

resource "aws_iam_policy" "runner" {
  name   = "github-runner-restricted"
  policy = data.aws_iam_policy_document.runner.json
}

resource "aws_iam_role_policy_attachment" "runner" {
  role       = module.github_runners.runner_role_name
  policy_arn = aws_iam_policy.runner.arn
}

locals {
  allowed_cidrs = [
    "140.82.112.0/20",   # GitHub
    "104.16.0.0/13",     # npm registry / CDN
    "185.199.108.0/22",  # GitHub user content / Playwright CDN
  ]
}

resource "aws_security_group_rule" "egress" {
  type              = "egress"
  security_group_id = module.github_runners.runner_security_group_id
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = var.strict_egress ? local.allowed_cidrs : ["0.0.0.0/0"]
}
