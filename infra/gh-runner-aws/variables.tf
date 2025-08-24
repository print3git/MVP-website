variable "project" {
  type        = string
  description = "Project name used for resource naming"
}

variable "owner" {
  type        = string
  description = "GitHub organization or user owning the repository"
}

variable "repo" {
  type        = string
  description = "Repository name"
}

variable "runner_labels" {
  type        = list(string)
  default     = ["self-hosted", "linux", "aws", "mvp-gh-runner"]
  description = "Labels to apply to the GitHub runner"
}

variable "instance_type" {
  type        = string
  default     = "t3.small"
  description = "EC2 instance type for the runner"
}

variable "use_spot" {
  type        = bool
  default     = true
  description = "Launch the runner as a spot instance"
}

variable "create_vpc" {
  type        = bool
  default     = true
  description = "When true, create a new VPC and public subnets"
}

variable "existing_vpc_id" {
  type        = string
  default     = null
  description = "ID of an existing VPC to use when create_vpc is false"
}

variable "subnet_ids" {
  type        = list(string)
  default     = []
  description = "Subnet IDs when using an existing VPC"
}

variable "off_hours" {
  type        = bool
  default     = false
  description = "Scale the ASG to zero overnight"
}

variable "github_token" {
  type        = string
  description = "GitHub token for queue metrics lambda"
}
