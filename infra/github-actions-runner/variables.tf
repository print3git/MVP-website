variable "repo_owner" {
  type = string
}

variable "repo_name" {
  type = string
}

variable "runner_labels" {
  type    = list(string)
  default = []
}

variable "ssm_token_parameter" {
  type        = string
  description = "Name of SSM parameter storing GitHub runner registration token"
}

variable "subnet_ids" {
  type = list(string)
}

variable "vpc_id" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "ssh_ingress_cidr" {
  type    = string
  default = "0.0.0.0/0"
}

variable "metric_namespace" {
  type    = string
  default = "GitHubRunners"
}

variable "queue_length_metric_name" {
  type    = string
  default = "QueuedJobs"
}

variable "runner_ami_id" {
  type        = string
  description = "AMI ID for GitHub Actions runner; leave empty to use latest Amazon Linux 2023."
  default     = ""
}
