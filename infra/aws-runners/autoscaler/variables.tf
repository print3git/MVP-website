variable "github_owner" {
  type = string
}

variable "github_repo" {
  type = string
}

variable "github_token" {
  type      = string
  sensitive = true
}

variable "asg_name" {
  type = string
}

variable "max_runners" {
  type    = number
  default = 1
}

variable "burst_multiplier" {
  type    = number
  default = 1
}

variable "label_quotas" {
  type    = map(number)
  default = {}
}
