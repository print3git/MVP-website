output "autoscaling_group_name" {
  value = aws_autoscaling_group.runner.name
}

output "iam_role_name" {
  value = aws_iam_role.runner.name
}

output "security_group_id" {
  value = aws_security_group.runner.id
}
