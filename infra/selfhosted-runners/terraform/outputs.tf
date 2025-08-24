output "vpc_id" {
  value = aws_vpc.runners.id
}

output "subnet_ids" {
  value = values(aws_subnet.runners)[*].id
}

output "asg_names" {
  value = { for k, asg in aws_autoscaling_group.runners : k => asg.name }
}
