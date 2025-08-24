variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "ami_id" {
  description = "AMI with preinstalled runner stack"
  type        = string
}

variable "repo_url" {
  description = "GitHub repository URL"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.50.0.0/16"
}

variable "subnet_cidrs" {
  description = "List of CIDR blocks for runner subnets"
  type        = list(string)
  default     = ["10.50.0.0/24", "10.50.1.0/24"]
}

variable "asg_configs" {
  description = "Map of autoscaling group settings keyed by size"
  type = map(object({
    instance_type = string
    min_size      = number
    max_size      = number
    desired_size  = number
    labels        = string
  }))
  default = {
    small = {
      instance_type = "t3.small"
      min_size      = 2
      max_size      = 10
      desired_size  = 2
      labels        = "ci-small,linux,x64"
    }
    medium = {
      instance_type = "t3.medium"
      min_size      = 1
      max_size      = 6
      desired_size  = 1
      labels        = "ci-medium,linux,x64"
    }
    large = {
      instance_type = "t3.large"
      min_size      = 0
      max_size      = 4
      desired_size  = 0
      labels        = "ci-large,linux,x64"
    }
  }
}

variable "off_hours_cron" {
  description = "Cron expression for off hours scale down"
  type        = string
  default     = "0 0 * * *"
}
