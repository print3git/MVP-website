output "ec2_role_arn" {
  value = aws_iam_role.ec2.arn
}

output "instance_profile_arn" {
  value = aws_iam_instance_profile.ec2.arn
}

output "github_role_arn" {
  value = aws_iam_role.github.arn
}
