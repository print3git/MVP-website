terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "github_repository" {
  type        = string
  description = "GitHub repository in owner/name format"
}

variable "s3_bucket" {
  type        = string
  description = "S3 bucket for read/write access"
}

variable "ssm_parameter_paths" {
  type        = list(string)
  description = "SSM parameter path prefixes"
  default     = []
}

data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:*"]
    }
  }
}

resource "aws_iam_role" "gh_actions_oidc_role" {
  name               = "gh_actions_oidc_role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "inline" {
  statement {
    actions   = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = ["*"]
  }

  statement {
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["arn:aws:s3:::${var.s3_bucket}/*"]
  }

  statement {
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["*"]
  }

  statement {
    actions   = ["ecs:Describe*"]
    resources = ["*"]
  }

  dynamic "statement" {
    for_each = var.ssm_parameter_paths
    content {
      actions   = ["ssm:GetParameters", "ssm:GetParameter", "ssm:GetParametersByPath"]
      resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${statement.value}*"]
    }
  }
}

resource "aws_iam_role_policy" "inline" {
  name   = "gh_actions_oidc_policy"
  role   = aws_iam_role.gh_actions_oidc_role.id
  policy = data.aws_iam_policy_document.inline.json
}

output "gh_actions_oidc_role_arn" {
  value = aws_iam_role.gh_actions_oidc_role.arn
}
