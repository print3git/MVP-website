variable "name" {
  description = "Name prefix for created resources"
  type        = string
  default     = "gh-runner"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}
