output "runner_registration_token" {
  value     = data.external.token.result.token
  sensitive = true
}

output "runner_group_url" {
  value = "https://github.com/${var.repo_owner}/${var.repo_name}/settings/actions/runners"
}

output "sqs_queue_url" {
  value = aws_sqs_queue.scale_requests.url
}
