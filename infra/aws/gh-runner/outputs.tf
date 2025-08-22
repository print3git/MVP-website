output "runner_label" {
  value = var.runner_label
}

output "runner_role_arn" {
  value = aws_iam_role.github_runners.arn
}
