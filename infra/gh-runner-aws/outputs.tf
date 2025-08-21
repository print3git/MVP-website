output "instance_id" {
  description = "Instance ID of the GitHub runner"
  value       = try(aws_autoscaling_group.runner.instances[0], null)
}

output "asg_name" {
  description = "Name of the Auto Scaling group"
  value       = aws_autoscaling_group.runner.name
}

output "log_group_name" {
  description = "CloudWatch log group for runner logs"
  value       = aws_cloudwatch_log_group.runner.name
}

output "runner_labels" {
  description = "Labels applied to the runner"
  value       = var.runner_labels
}
