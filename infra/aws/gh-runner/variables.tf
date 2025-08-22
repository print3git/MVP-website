variable "aws_region" {
  description = "AWS region to deploy runners"
  type        = string
  default     = "us-east-1"
}

variable "github_repository" {
  description = "Owner/repo for runner registration"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ASG"
  type        = list(string)
}

variable "runner_label" {
  description = "Label applied to GitHub runner"
  type        = string
  default     = "aws"
}
