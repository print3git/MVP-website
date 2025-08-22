variable "region" {
  description = "AWS region"
  type        = string
}

variable "repo_owner" {
  description = "GitHub repository owner"
  type        = string
}

variable "repo_name" {
  description = "GitHub repository name"
  type        = string
}

variable "ec2_role_name" {
  description = "Name for the EC2 role"
  type        = string
  default     = "ssm-runner-ec2"
}

variable "github_role_name" {
  description = "Name for GitHub Actions role"
  type        = string
  default     = "ssm-runner-gha"
}
