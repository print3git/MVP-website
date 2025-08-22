variable "repo_url" {
  description = "GitHub repository URL"
  type        = string
}

variable "token_path" {
  description = "API endpoint to request a runner registration token"
  type        = string
}

variable "subnet_ids" {
  description = "Subnets where runners should launch"
  type        = list(string)
}

variable "instance_type" {
  description = "Runner EC2 instance type"
  type        = string
  default     = "t3.large"
}

variable "desired_capacity" {
  description = "Desired runner count"
  type        = number
  default     = 0
}
