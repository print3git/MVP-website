variable "instance_type" {
  description = "EC2 instance type for the runner"
  type        = string
  default     = "t3.small"
}

variable "labels" {
  description = "Comma-separated list of labels for the GitHub Actions runner"
  type        = string
  default     = "self-hosted,aws,node20,x64"
}

variable "repo_owner" {
  description = "Owner of the GitHub repository"
  type        = string
}

variable "repo_name" {
  description = "Name of the GitHub repository"
  type        = string
}
