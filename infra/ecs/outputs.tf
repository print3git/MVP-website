output "alb_dns_name" {
  value = aws_lb.api.dns_name
}

output "service_name" {
  value = aws_ecs_service.backend.name
}
