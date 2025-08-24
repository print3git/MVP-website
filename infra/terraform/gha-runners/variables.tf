variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_id" {
  type        = string
  description = "VPC where runners will launch"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnets for the Auto Scaling Group"
}

variable "repo_owner" {
  type        = string
  description = "GitHub repository owner"
}

variable "repo_name" {
  type        = string
  description = "GitHub repository name"
}

variable "runner_group" {
  type        = string
  description = "GitHub runner group"
  default     = "Default"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.medium"
}

variable "github_token" {
  type        = string
  description = "GitHub token with admin access to the repository"
  sensitive   = true
}
