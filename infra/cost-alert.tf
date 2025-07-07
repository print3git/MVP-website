variable "cost_alert_email" {
  type        = string
  default     = ""
  description = "Email address for budget notifications"
}

resource "aws_budgets_budget" "monthly" {
  name         = "monthly-budget"
  budget_type  = "COST"
  limit_amount = "20"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 100
    threshold_type      = "PERCENTAGE"
    notification_type   = "ACTUAL"

    subscriber {
      subscription_type = "EMAIL"
      address           = var.cost_alert_email != "" ? var.cost_alert_email : env("COST_ALERT_EMAIL")
    }
  }
}
