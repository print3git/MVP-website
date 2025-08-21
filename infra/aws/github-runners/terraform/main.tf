terraform {
  required_version = ">= 1.3"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

module "github_runners" {
  source  = "philips-labs/github-runner/aws"
  version = "6.1.0"

  aws_region = var.aws_region

  github_app = {
    id         = var.github_app_id
    key_base64 = var.github_app_private_key
  }

  repository_white_list = ["${var.github_owner}/${var.github_repo}"]

  runner_extra_labels = [var.runner_label]
  runners_maximum_count = var.max_runners
  instance_types        = [var.instance_type]
  instance_target_capacity_type = var.spot ? "spot" : "on-demand"

  ami_filter = {
    name  = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
    state = ["available"]
  }
  ami_owners = ["099720109477"]
}
