variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type for the runner"
  type        = string
  default     = "t3.small"
}

variable "name" {
  description = "Name prefix for runner resources"
  type        = string
  default     = "mvp-runner"
}
