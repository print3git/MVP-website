output "runner_labels" {
  description = "Labels applied to the EC2 runners"
  value       = local.runner_labels
}

output "github_role_arn" {
  description = "IAM role ARN for GitHub Actions"
  value       = aws_iam_role.github.arn
}
