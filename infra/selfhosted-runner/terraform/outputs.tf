output "instance_id" {
  description = "ID of the runner instance"
  value       = aws_instance.runner.id
}

output "public_ip" {
  description = "Public IP address of the runner"
  value       = aws_instance.runner.public_ip
}
