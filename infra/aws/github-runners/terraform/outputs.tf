output "runners" {
  description = "Details about the created runners"
  value       = module.github_runners.runners
}

output "webhook" {
  description = "Webhook configuration for GitHub App"
  value       = module.github_runners.webhook
}
