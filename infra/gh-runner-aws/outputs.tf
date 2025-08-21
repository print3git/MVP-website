output "instance_id" {
  description = "ID of the runner instance"
  value       = aws_instance.runner.id
}

output "instance_public_ip" {
  description = "Public IP of the runner"
  value       = aws_instance.runner.public_ip
}
