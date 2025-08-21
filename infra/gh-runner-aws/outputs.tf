output "instance_id" {
  description = "ID of the runner EC2 instance"
  value       = aws_instance.runner.id
}

output "iam_role_name" {
  description = "Name of IAM role attached to the runner"
  value       = aws_iam_role.runner.name
}
