variable "aws_region" {
  description = "AWS region to deploy runners in"
  type        = string
  default     = "us-east-1"
}

variable "github_app_id" {
  description = "GitHub App ID"
  type        = string
}

variable "github_app_private_key" {
  description = "Base64-encoded GitHub App private key"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub organization or user name"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "runner_label" {
  description = "Label used to target these runners"
  type        = string
  default     = "aws-spot-x64"
}

variable "min_runners" {
  description = "Minimum number of runners to keep idle"
  type        = number
  default     = 0
}

variable "max_runners" {
  description = "Maximum number of runners"
  type        = number
  default     = 5
}

variable "instance_type" {
  description = "EC2 instance type for runners"
  type        = string
  default     = "t3.large"
}

variable "spot" {
  description = "Use spot instances"
  type        = bool
  default     = true
}

variable "ami" {
  description = "Runner AMI selection"
  type        = string
  default     = "ubuntu-22.04"
}
