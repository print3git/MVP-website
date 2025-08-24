terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type        = string
  description = "AWS region for secrets"
  default     = "us-east-1"
}

locals {
  expected = jsondecode(file("${path.module}/expected.json"))
}

resource "aws_ssm_parameter" "shared" {
  for_each = toset([for name in local.expected.ssm : name if startswith(name, "shared/")])
  name  = "/mvp/${each.value}"
  type  = "SecureString"
  value = "placeholder"
}

resource "aws_ssm_parameter" "frontend" {
  for_each = toset([for name in local.expected.ssm : name if startswith(name, "frontend/")])
  name  = "/mvp/${each.value}"
  type  = "SecureString"
  value = "placeholder"
}

resource "aws_ssm_parameter" "backend" {
  for_each = toset([for name in local.expected.ssm : name if startswith(name, "backend/")])
  name  = "/mvp/${each.value}"
  type  = "SecureString"
  value = "placeholder"
}

resource "aws_secretsmanager_secret" "high" {
  for_each = toset(local.expected.secretsmanager)
  name = "/mvp/${each.value}"
}

output "ssm_parameters" {
  value = [aws_ssm_parameter.shared, aws_ssm_parameter.frontend, aws_ssm_parameter.backend]
}

output "secretsmanager_secrets" {
  value = aws_secretsmanager_secret.high
}
