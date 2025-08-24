variable "github_org" {
  description = "GitHub organization"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID to launch runners in"
  type        = string
}

variable "subnet_ids" {
  description = "Subnets for runner Auto Scaling group"
  type        = list(string)
}

variable "instance_type" {
  description = "EC2 instance type for runners"
  type        = string
  default     = "t3.large"
}

variable "max_size" {
  description = "Maximum number of runners"
  type        = number
  default     = 5
}

variable "runner_token_ssm_name" {
  description = "SSM parameter containing the runner registration token"
  type        = string
  default     = "/github/runner/token"
}

variable "runner_url_ssm_name" {
  description = "SSM parameter containing the runner URL"
  type        = string
  default     = "/github/runner/url"
}
